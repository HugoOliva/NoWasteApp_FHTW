/**
 * No Waste - Matching-Algorithmus
 *
 * Der Nutzer gibt nur 1 bis 3 "Reste" ein. Ablauf:
 *
 * 1. Profilfilter: Rezepte mit Allergenen des Nutzers oder unpassender
 *    Ernährungsweise fallen heraus (vegan passt auch zu "vegetarisch" usw.).
 * 2. Vorratsschrank: Zutaten aus BASICS (Öl, Mehl, Zucker, Gewürze ...) gelten
 *    als vorhanden, damit der Nutzer sie nicht eingeben muss.
 * 3. Optional ("nur komplett kochbar"): Hauptzutaten ("essenziell") müssen
 *    vorhanden sein oder einen verfügbaren Ersatz haben.
 * 4. Für jedes Rezept wird bestimmt, welche der eingegebenen Reste es nutzt
 *    (direkt oder über die Substitutionstabelle). Rezepte ohne einen einzigen
 *    Rest werden verworfen.
 * 5. Gewichteter Score: vorhandene Zutat = volles Gewicht, Ersatz = 80 %,
 *    fehlend = 0. Score / Gesamtgewicht ergibt 1 bis 5 Sterne.
 * 6. Gruppierung nach genutzter Rest-Kombination: zuerst Rezepte, die alle
 *    Reste nutzen, dann jede Teilkombination, am Ende Rezepte für einen
 *    einzelnen Rest. Innerhalb einer Gruppe wird nach Score sortiert.
 */

const ERNAEHRUNGS_RANG = { vegan: 0, vegetarisch: 1, pescetarisch: 2, omnivor: 3 };

function filtereNachProfil(rezepte, profil) {
  const gewuenschterRang = ERNAEHRUNGS_RANG[profil.ernaehrungspraeferenz];
  return rezepte.filter((rezept) => {
    const hatAllergen = rezept.allergene.some((a) => profil.allergene.includes(a));
    // Eine strengere Ernährungsweise passt immer auch zu einer lockereren:
    // wer vegetarisch isst, darf auch vegane Rezepte sehen.
    const passtErnaehrung =
      gewuenschterRang === undefined || ERNAEHRUNGS_RANG[rezept.ernaehrungskategorie] <= gewuenschterRang;
    return !hatAllergen && passtErnaehrung;
  });
}

// Alles, was der Nutzer zuhause hat: seine Reste plus der Vorratsschrank
function verfuegbareZutaten(reste) {
  return [...new Set([...reste, ...BASICS])];
}

function findeErsatz(zutatName, verfuegbar) {
  const moegliche = SUBSTITUTIONEN[zutatName] || [];
  return moegliche.find((ersatz) => verfuegbar.includes(ersatz)) || null;
}

// Harter Filter: ALLE Hauptzutaten müssen vorhanden oder ersetzbar sein.
function istKomplettKochbar(rezept, verfuegbar) {
  return rezept.zutaten
    .filter((z) => z.essenziell)
    .every((z) => verfuegbar.includes(z.name) || findeErsatz(z.name, verfuegbar));
}

// Welche der eingegebenen Reste verwendet dieses Rezept? (direkt oder als Ersatz)
function genutzteReste(rezept, reste) {
  return reste.filter((rest) =>
    rezept.zutaten.some((z) => z.name === rest || (SUBSTITUTIONEN[z.name] || []).includes(rest))
  );
}

function berechneRezeptErgebnis(rezept, verfuegbar) {
  let erreichtesGewicht = 0;
  let gesamtGewicht = 0;
  const fehlendeZutaten = [];
  const substituierteZutaten = [];

  rezept.zutaten.forEach((zutat) => {
    gesamtGewicht += zutat.gewicht;
    const istVorhanden = verfuegbar.includes(zutat.name);
    const ersatz = !istVorhanden ? findeErsatz(zutat.name, verfuegbar) : null;

    if (istVorhanden) {
      erreichtesGewicht += zutat.gewicht;
    } else if (ersatz) {
      erreichtesGewicht += zutat.gewicht * 0.8;
      substituierteZutaten.push({ original: zutat.name, ersatz, essenziell: zutat.essenziell });
    } else {
      fehlendeZutaten.push({ name: zutat.name, essenziell: zutat.essenziell });
    }
  });

  const score = gesamtGewicht === 0 ? 0 : erreichtesGewicht / gesamtGewicht;
  return { score, fehlendeZutaten, substituierteZutaten };
}

function berechneSterne(score) {
  return Math.max(1, Math.round(score * 5));
}

// Hauptfunktion: liefert Gruppen [{ reste: [...], rezepte: [...] }],
// sortiert von "alle Reste" bis "nur ein Rest".
function matchKombinationen(profil, resteEingabe, kategorieFilter, nurKomplett = false) {
  const reste = [...new Set(resteEingabe)];
  if (reste.length === 0) return [];

  const verfuegbar = verfuegbareZutaten(reste);

  let rezepte = filtereNachProfil(REZEPTE, profil);
  if (kategorieFilter && kategorieFilter !== "Alle") {
    rezepte = rezepte.filter((r) => r.kategorie === kategorieFilter);
  }
  if (nurKomplett) {
    rezepte = rezepte.filter((r) => istKomplettKochbar(r, verfuegbar));
  }

  const gruppen = new Map();

  rezepte.forEach((rezept) => {
    const genutzt = genutzteReste(rezept, reste);
    if (genutzt.length === 0) return;

    const { score, fehlendeZutaten, substituierteZutaten } = berechneRezeptErgebnis(rezept, verfuegbar);
    const sterne = berechneSterne(score);
    const hatPotenzial = sterne === 4 && fehlendeZutaten.length === 0 && substituierteZutaten.length > 0;
    const eintrag = { ...rezept, genutzteReste: genutzt, score, sterne, fehlendeZutaten, substituierteZutaten, hatPotenzial };

    // Schlüssel = Positionen der genutzten Reste in der Eingabe, z. B. "0-2"
    const positionen = genutzt.map((r) => reste.indexOf(r));
    const schluessel = positionen.join("-");
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, { reste: genutzt, positionen, rezepte: [] });
    gruppen.get(schluessel).rezepte.push(eintrag);
  });

  const ergebnis = [...gruppen.values()];

  ergebnis.forEach((gruppe) => {
    gruppe.rezepte.sort(
      (a, b) =>
        b.score - a.score ||
        a.fehlendeZutaten.length - b.fehlendeZutaten.length ||
        a.name.localeCompare(b.name, "de")
    );
  });

  // Größte Kombination zuerst, bei gleicher Größe in der Reihenfolge der Eingabe
  ergebnis.sort((a, b) => {
    if (a.positionen.length !== b.positionen.length) return b.positionen.length - a.positionen.length;
    for (let i = 0; i < a.positionen.length; i++) {
      if (a.positionen[i] !== b.positionen[i]) return a.positionen[i] - b.positionen[i];
    }
    return 0;
  });

  return ergebnis;
}
