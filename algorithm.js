/**
 * No Waste - Matching-Algorithmus
 *
 * Ablauf:
 * 1. Rezepte nach Allergenen/Unverträglichkeiten und Ernährungspräferenz filtern
 * 2. NEU: Rezepte aussortieren, bei denen eine Hauptzutat ("essenziell") fehlt
 *    und auch keinen verfügbaren Ersatz hat - so wird z.B. ein Hühnercurry
 *    nicht angezeigt, wenn gar kein Hühnerfleisch (und kein Ersatz) ausgewählt ist.
 * 3. Für jedes verbleibende Rezept einen gewichteten Matchingscore berechnen
 *    (Hauptzutaten zählen stärker als Nebenzutaten)
 * 4. Fehlende Zutaten zuerst gegen die Substitutionstabelle prüfen
 * 5. Score normalisieren (relativ zur Gesamtgewichtung des Rezepts)
 * 6. Rezepte absteigend nach Score sortieren
 */

function filtereNachProfil(rezepte, profil) {
  return rezepte.filter((rezept) => {
    const hatAllergen = rezept.allergene.some((a) => profil.allergene.includes(a));
    const passtErnaehrung =
      !profil.ernaehrungspraeferenz || rezept.ernaehrungskategorie === profil.ernaehrungspraeferenz;
    return !hatAllergen && passtErnaehrung;
  });
}

function findeErsatz(zutatName, ausgewaehlteZutaten) {
  const moegliche = SUBSTITUTIONEN[zutatName] || [];
  return moegliche.find((ersatz) => ausgewaehlteZutaten.includes(ersatz)) || null;
}

// Harter Filter: Ein Rezept wird nur angezeigt, wenn ALLE als "essenziell"
// markierten Hauptzutaten entweder vorhanden sind oder einen verfügbaren
// Ersatz haben. Fehlt eine Hauptzutat, wird das Rezept komplett ausgeblendet,
// statt wie zuvor nur schlechter bewertet.
function filtereNachVerfuegbarkeit(rezepte, ausgewaehlteZutaten) {
  return rezepte.filter((rezept) => {
    const hauptzutaten = rezept.zutaten.filter((z) => z.essenziell);
    return hauptzutaten.every(
      (z) => ausgewaehlteZutaten.includes(z.name) || findeErsatz(z.name, ausgewaehlteZutaten)
    );
  });
}

function berechneRezeptErgebnis(rezept, ausgewaehlteZutaten) {
  let erreichtesGewicht = 0;
  let gesamtGewicht = 0;
  const fehlendeZutaten = [];
  const substituierteZutaten = [];

  rezept.zutaten.forEach((zutat) => {
    gesamtGewicht += zutat.gewicht;
    const istVorhanden = ausgewaehlteZutaten.includes(zutat.name);
    const ersatz = !istVorhanden ? findeErsatz(zutat.name, ausgewaehlteZutaten) : null;

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

function matchRezepte(profil, ausgewaehlteZutaten, kategorieFilter) {
  let rezepte = filtereNachProfil(REZEPTE, profil);
  rezepte = filtereNachVerfuegbarkeit(rezepte, ausgewaehlteZutaten);

  if (kategorieFilter && kategorieFilter !== "Alle") {
    rezepte = rezepte.filter((r) => r.kategorie === kategorieFilter);
  }

  const ergebnisse = rezepte.map((rezept) => {
    const { score, fehlendeZutaten, substituierteZutaten } = berechneRezeptErgebnis(rezept, ausgewaehlteZutaten);
    const sterne = berechneSterne(score);
    const hatPotenzial = sterne === 4 && fehlendeZutaten.length === 0 && substituierteZutaten.length > 0;
    return { ...rezept, score, sterne, fehlendeZutaten, substituierteZutaten, hatPotenzial };
  });

  return ergebnisse.sort((a, b) => b.score - a.score);
}
