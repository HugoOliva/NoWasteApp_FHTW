/**
 * No Waste - Logik der Suchseite (suche.html)
 * Der Nutzer gibt bis zu 3 Reste ein, daraus werden mit matchKombinationen()
 * (algorithm.js) die Ergebnisgruppen berechnet und angezeigt.
 */

const MAX_RESTE = 3;
const VORSCHAU_ANZAHL = 3; // so viele Rezepte pro Gruppe sind zuerst sichtbar

// ---------- Zustand (wird im Browser gespeichert) ----------

let profil = Object.assign({ allergene: [], ernaehrungspraeferenz: "" }, ladeGespeichert(STORAGE_PROFIL, {}));
let zustand = Object.assign({ reste: [], kategorie: "Alle", nurKomplett: false, gesucht: false }, ladeGespeichert(STORAGE_SUCHE, {}));

// Gespeicherte Daten prüfen, falls sich die Datenbasis geändert hat
zustand.reste = (zustand.reste || []).filter((r) => ALLE_ZUTATEN.includes(r)).slice(0, MAX_RESTE);
if (!KATEGORIEN.includes(zustand.kategorie)) zustand.kategorie = "Alle";
if (!Array.isArray(profil.allergene)) profil.allergene = [];

let vorschlaege = [];
let aktiverVorschlag = -1;

const $ = (id) => document.getElementById(id);

function speichereZustand() {
  speichere(STORAGE_SUCHE, zustand);
}

// ---------- Profil (Ernährungsweise + Allergene) ----------

function aktualisiereProfilZeile() {
  $("profil-ernaehrung").textContent = profil.ernaehrungspraeferenz || "keine Einschränkung";
  const hatAllergene = profil.allergene.length > 0;
  $("profil-allergene-zeile").hidden = !hatAllergene;
  $("profil-allergene").textContent = profil.allergene.join(", ");
}

function profilGeaendert() {
  speichere(STORAGE_PROFIL, profil);
  aktualisiereProfilZeile();
  $("profil-status").textContent = "Gespeichert ✓";
  setTimeout(() => ($("profil-status").textContent = ""), 1800);
  if (zustand.gesucht) zeigeErgebnisse(false);
}

function baueProfilBereich() {
  const select = $("ernaehrung-select");
  ERNAEHRUNGSOPTIONEN.forEach((option) => {
    select.append(el("option", { value: option }, option === "" ? "Keine Einschränkung" : option));
  });
  select.value = profil.ernaehrungspraeferenz || "";
  select.addEventListener("change", () => {
    profil.ernaehrungspraeferenz = select.value;
    profilGeaendert();
  });

  const container = $("allergene-auswahl");
  ALLE_ALLERGENE.forEach((allergen) => {
    const chip = el(
      "button",
      { type: "button", class: "chip", "aria-pressed": profil.allergene.includes(allergen) ? "true" : "false" },
      allergen
    );
    chip.addEventListener("click", () => {
      const aktiv = !profil.allergene.includes(allergen);
      profil.allergene = aktiv ? [...profil.allergene, allergen] : profil.allergene.filter((a) => a !== allergen);
      chip.setAttribute("aria-pressed", aktiv ? "true" : "false");
      profilGeaendert();
    });
    container.append(chip);
  });

  $("profil-toggle").addEventListener("click", () => {
    const panel = $("profil-panel");
    panel.hidden = !panel.hidden;
    $("profil-toggle").setAttribute("aria-expanded", String(!panel.hidden));
    $("profil-toggle").textContent = panel.hidden ? "Ändern" : "Schließen";
  });

  aktualisiereProfilZeile();
}

// ---------- Zutaten-Eingabe mit Vorschlägen ----------

function normalisiere(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function sucheVorschlaege(text) {
  const q = normalisiere(text);
  if (!q) return [];

  const treffer = [];
  ALLE_ZUTATEN.forEach((name) => {
    if (zustand.reste.includes(name)) return;
    const n = normalisiere(name);
    let rang = n.startsWith(q) ? 0 : n.includes(q) ? 2 : null;
    let aliasTreffer = null;

    (ALIASE[name] || []).forEach((alias) => {
      const na = normalisiere(alias);
      const r = na.startsWith(q) ? 1 : na.includes(q) ? 3 : null;
      if (r !== null && (rang === null || r < rang)) {
        rang = r;
        aliasTreffer = alias;
      }
    });

    if (rang !== null) treffer.push({ name, alias: aliasTreffer, rang });
  });

  treffer.sort((a, b) => a.rang - b.rang || a.name.localeCompare(b.name, "de"));
  return treffer.slice(0, 8);
}

function zeigeVorschlaege() {
  const liste = $("vorschlaege");
  const input = $("zutat-input");
  liste.replaceChildren();
  aktiverVorschlag = -1;

  if (!input.value.trim() || input.disabled) {
    liste.hidden = true;
    input.setAttribute("aria-expanded", "false");
    return;
  }

  vorschlaege = sucheVorschlaege(input.value);

  if (vorschlaege.length === 0) {
    liste.append(el("li", { class: "vorschlag-leer" }, "Keine passende Zutat gefunden."));
  } else {
    vorschlaege.forEach((v, i) => {
      const eintrag = el(
        "li",
        { class: "vorschlag", role: "option", id: `vorschlag-${i}`, "aria-selected": "false" },
        el("span", {}, v.name, v.alias ? el("span", { class: "alias" }, ` (auch: ${v.alias})`) : null),
        el("span", { class: "kat" }, kategorieVonZutat(v.name))
      );
      // mousedown statt click, damit das Eingabefeld seinen Fokus nicht verliert
      eintrag.addEventListener("mousedown", (e) => {
        e.preventDefault();
        waehleRest(v.name);
      });
      liste.append(eintrag);
    });
  }

  liste.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

function schliesseVorschlaege() {
  $("vorschlaege").hidden = true;
  $("zutat-input").setAttribute("aria-expanded", "false");
  $("zutat-input").removeAttribute("aria-activedescendant");
  aktiverVorschlag = -1;
}

function markiereVorschlag(neuerIndex) {
  const eintraege = $("vorschlaege").querySelectorAll(".vorschlag");
  if (eintraege.length === 0) return;
  aktiverVorschlag = (neuerIndex + eintraege.length) % eintraege.length;
  eintraege.forEach((e, i) => e.setAttribute("aria-selected", i === aktiverVorschlag ? "true" : "false"));
  $("zutat-input").setAttribute("aria-activedescendant", `vorschlag-${aktiverVorschlag}`);
  eintraege[aktiverVorschlag].scrollIntoView({ block: "nearest" });
}

function behandleTaste(e) {
  const input = $("zutat-input");
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if ($("vorschlaege").hidden) zeigeVorschlaege();
    markiereVorschlag(aktiverVorschlag + 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    markiereVorschlag(aktiverVorschlag - 1);
  } else if (e.key === "Enter") {
    if (!$("vorschlaege").hidden && vorschlaege.length > 0) {
      e.preventDefault();
      waehleRest(vorschlaege[aktiverVorschlag >= 0 ? aktiverVorschlag : 0].name);
    } else if (!input.value.trim() && zustand.reste.length > 0) {
      e.preventDefault();
      sucheStarten();
    }
  } else if (e.key === "Escape") {
    schliesseVorschlaege();
  } else if (e.key === "Backspace" && input.value === "" && zustand.reste.length > 0) {
    entferneRest(zustand.reste[zustand.reste.length - 1]);
  }
}

// ---------- Reste verwalten ----------

function waehleRest(name) {
  if (zustand.reste.length >= MAX_RESTE || zustand.reste.includes(name)) return;
  zustand.reste.push(name);
  $("zutat-input").value = "";
  schliesseVorschlaege();
  restGeaendert();
  if (zustand.reste.length < MAX_RESTE) $("zutat-input").focus();
}

function entferneRest(name) {
  zustand.reste = zustand.reste.filter((r) => r !== name);
  if (zustand.reste.length === 0) zustand.gesucht = false;
  restGeaendert();
  $("zutat-input").focus();
}

function restGeaendert() {
  speichereZustand();
  zeichneReste();
  if (zustand.gesucht) zeigeErgebnisse(false);
}

function zeichneReste() {
  const anzahl = zustand.reste.length;
  const container = $("reste-chips");
  container.replaceChildren();

  zustand.reste.forEach((name) => {
    container.append(
      el(
        "span",
        { class: "rest-chip" },
        name,
        el("button", { type: "button", "aria-label": `${name} entfernen`, onclick: () => entferneRest(name) }, "×")
      )
    );
  });

  $("reste-zaehler").textContent = `${anzahl} von ${MAX_RESTE} Resten`;

  const input = $("zutat-input");
  const voll = anzahl >= MAX_RESTE;
  input.disabled = voll;
  input.placeholder = voll ? "Maximum erreicht – entferne einen Rest" : "z. B. Reis, Geflügel, Sahne";

  $("finden-btn").disabled = anzahl === 0;

  let hinweis = "Bitte gib mindestens eine Zutat ein. Du kannst bis zu drei Lebensmittel auswählen.";
  if (anzahl === 3) hinweis = "Das Maximum von drei Resten ist erreicht.";
  else if (anzahl > 0) hinweis = `Du kannst noch ${MAX_RESTE - anzahl} weitere Zutat${MAX_RESTE - anzahl > 1 ? "en" : ""} hinzufügen – oder gleich suchen.`;
  $("hinweis").textContent = hinweis;
}

// ---------- Ergebnisse ----------

function sucheStarten() {
  if (zustand.reste.length === 0) return;
  zustand.gesucht = true;
  speichereZustand();
  zeigeErgebnisse(true);
}

function gruppenTitel(gruppe, anzahlReste) {
  const text = gruppe.reste.join(" + ");
  if (anzahlReste > 1 && gruppe.reste.length === anzahlReste) return `Alle deine Reste: ${text}`;
  return `Mit ${text}`;
}

function baueKarte(rezept, index) {
  const sterneText = `${rezept.sterne} von 5 Sternen`;

  let fehltZeile;
  if (rezept.fehlendeZutaten.length === 0) {
    fehltZeile = el("p", { class: "karte-info info-fertig" }, "Alles da, kann losgehen ✓");
  } else {
    const teile = [];
    rezept.fehlendeZutaten.forEach((f, i) => {
      if (i > 0) teile.push(", ");
      teile.push(f.essenziell ? el("strong", {}, f.name) : f.name);
    });
    fehltZeile = el("p", { class: "karte-info info-fehlt" }, "Du brauchst noch: ", ...teile);
  }

  const ersatzZeile = rezept.substituierteZutaten.length
    ? el(
        "p",
        { class: "karte-info info-ersatz" },
        "Ersetzt: " + rezept.substituierteZutaten.map((s) => `${s.original} → ${s.ersatz}`).join(", ")
      )
    : null;

  const karte = el(
    "a",
    {
      class: "rezept-card" + (rezept.hatPotenzial ? " potenzial" : ""),
      href: `recipe.html?id=${rezept.id}`,
      style: `animation-delay:${Math.min(index, 6) * 0.05}s`,
    },
    el(
      "div",
      { class: "rezept-header" },
      el(
        "div",
        { class: "rezept-header-left" },
        el("div", { class: `icon-circle ${kategorieFarbKlasse(rezept.kategorie)}`, "aria-hidden": "true" }, rezept.icon),
        el(
          "div",
          {},
          el("h4", {}, rezept.name, rezept.hatPotenzial ? el("span", { class: "potenzial-badge" }, "Potenzial auf 5★") : null),
          el("p", { class: "rezept-meta" }, `${rezept.kategorie} · ${rezept.zubereitungszeit_min} Min · ${rezept.ernaehrungskategorie}`)
        )
      ),
      el("span", { class: "sterne", role: "img", "aria-label": sterneText }, zeigeSterne(rezept.sterne))
    ),
    el("p", { class: "karte-info info-genutzt" }, "Nutzt: " + rezept.genutzteReste.join(", ")),
    fehltZeile,
    ersatzZeile
  );
  return karte;
}

function baueGruppe(gruppe, anzahlReste) {
  const sichtbar = gruppe.rezepte.slice(0, VORSCHAU_ANZAHL);
  const rest = gruppe.rezepte.slice(VORSCHAU_ANZAHL);
  const karten = el("div", {});
  sichtbar.forEach((r, i) => karten.append(baueKarte(r, i)));

  const kopf = el(
    "div",
    { class: "gruppe-kopf" },
    el("h3", {}, gruppenTitel(gruppe, anzahlReste)),
    anzahlReste > 1 && gruppe.reste.length === anzahlReste ? el("span", { class: "badge-alle" }, "Beste Treffer") : null,
    el("span", { class: "anzahl" }, `${gruppe.rezepte.length} Rezept${gruppe.rezepte.length > 1 ? "e" : ""}`)
  );

  const abschnitt = el("section", { class: "gruppe" }, kopf, karten);

  if (rest.length > 0) {
    const knopf = el(
      "button",
      { type: "button", class: "btn btn-ghost btn-small mehr-btn" },
      `Weitere ${rest.length} Rezept${rest.length > 1 ? "e" : ""} anzeigen`
    );
    knopf.addEventListener("click", () => {
      rest.forEach((r, i) => karten.append(baueKarte(r, i)));
      knopf.remove();
    });
    abschnitt.append(knopf);
  }
  return abschnitt;
}

function zeigeErgebnisse(scrollen) {
  const bereich = $("ergebnisse");
  if (zustand.reste.length === 0 || !zustand.gesucht) {
    bereich.hidden = true;
    return;
  }

  const gruppen = matchKombinationen(profil, zustand.reste, zustand.kategorie, zustand.nurKomplett);
  const gesamt = gruppen.reduce((summe, g) => summe + g.rezepte.length, 0);
  const container = $("ergebnis-container");
  container.replaceChildren();

  if (gesamt === 0) {
    $("ergebnis-text").textContent = "Leider nichts gefunden.";
    const hinweis = zustand.nurKomplett
      ? "Mit diesen Resten lässt sich kein Rezept komplett kochen. Schalte „Nur Rezepte, die ich komplett kochen kann“ aus, um auch Rezepte mit fehlenden Zutaten zu sehen."
      : "Zu dieser Kombination haben wir kein passendes Rezept. Prüfe auch, ob dein Profil oder die Mahlzeit-Auswahl zu viele Rezepte ausblendet.";
    container.append(el("p", { class: "leer" }, hinweis));
  } else {
    $("ergebnis-text").textContent = `${gesamt} Rezept${gesamt > 1 ? "e" : ""} für ${zustand.reste.join(", ")}. Sterne zeigen, wie vollständig die Zutaten sind.`;
    gruppen.forEach((g) => container.append(baueGruppe(g, zustand.reste.length)));
  }

  bereich.hidden = false;

  if (scrollen) {
    const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bereich.scrollIntoView({ behavior: reduziert ? "auto" : "smooth", block: "start" });
    bereich.focus({ preventScroll: true });
  }
}

// ---------- Initialisierung ----------

function init() {
  baueProfilBereich();

  const kategorieSelect = $("kategorie-select");
  KATEGORIEN.forEach((k) => kategorieSelect.append(el("option", { value: k }, k === "Alle" ? "Alle Mahlzeiten" : k)));
  kategorieSelect.value = zustand.kategorie;
  kategorieSelect.addEventListener("change", () => {
    zustand.kategorie = kategorieSelect.value;
    speichereZustand();
    if (zustand.gesucht) zeigeErgebnisse(false);
  });

  const schalter = $("komplett-schalter");
  schalter.checked = zustand.nurKomplett;
  schalter.addEventListener("change", () => {
    zustand.nurKomplett = schalter.checked;
    speichereZustand();
    if (zustand.gesucht) zeigeErgebnisse(false);
  });

  $("basics-liste").textContent = BASICS.join(", ").replace(/, ([^,]*)$/, " und $1");

  const input = $("zutat-input");
  input.addEventListener("input", zeigeVorschlaege);
  input.addEventListener("keydown", behandleTaste);
  input.addEventListener("blur", schliesseVorschlaege);
  input.addEventListener("focus", () => {
    if (input.value.trim()) zeigeVorschlaege();
  });

  $("finden-btn").addEventListener("click", sucheStarten);

  zeichneReste();
  if (zustand.gesucht) zeigeErgebnisse(false);
}

init();
