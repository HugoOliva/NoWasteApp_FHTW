/**
 * No Waste - Logik der Rezept-Detailseite
 * Liest die Rezept-ID aus der URL (?id=...) und gleicht das Rezept mit den
 * zuletzt eingegebenen Resten ab (aus dem localStorage).
 */

function holeRezeptIdAusUrl() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("id"), 10);
}

function zutatZeile(zutat, reste, substituierte) {
  const istRest = reste.includes(zutat.name);
  const istVorrat = !istRest && BASICS.includes(zutat.name);
  const ersatz = substituierte.find((s) => s.original === zutat.name);

  let icon = "🛒";
  let text = "brauchst du noch";
  if (istRest) { icon = "✅"; text = "dein Rest"; }
  else if (istVorrat) { icon = "🧂"; text = "aus dem Vorrat"; }
  else if (ersatz) { icon = "🔄"; text = `ersetzt durch ${ersatz.ersatz}`; }

  return el(
    "li",
    {},
    el("span", { class: "status", "aria-hidden": "true" }, icon),
    el("span", {}, zutat.name),
    zutat.essenziell ? el("span", { class: "essenziell-badge" }, "Hauptzutat") : null,
    el("span", { class: "status-text" }, `(${text})`)
  );
}

function renderDetail() {
  const container = document.getElementById("detail-container");
  const rezept = REZEPTE.find((r) => r.id === holeRezeptIdAusUrl());

  if (!rezept) {
    container.replaceChildren(
      el("p", { class: "leer" }, "Rezept nicht gefunden. ", el("a", { href: "suche.html" }, "Zurück zur Suche"))
    );
    return;
  }

  document.title = `No Waste – ${rezept.name}`;

  const suche = ladeGespeichert(STORAGE_SUCHE, {});
  const reste = (suche.reste || []).filter((r) => ALLE_ZUTATEN.includes(r));
  const { score, substituierteZutaten } = berechneRezeptErgebnis(rezept, verfuegbareZutaten(reste));
  const sterne = berechneSterne(score);

  const sterneBlock =
    reste.length > 0
      ? el("span", { class: "sterne big", role: "img", "aria-label": `${sterne} von 5 Sternen` }, zeigeSterne(sterne))
      : el("p", { class: "rezept-meta" }, "Gib in der Rezeptsuche deine Reste ein, dann siehst du hier, wie gut das Rezept passt.");

  const allergene = rezept.allergene.length
    ? rezept.allergene.map((a) => el("span", { class: "tag" }, a))
    : [el("span", { class: "tag tag-neutral" }, "Keine bekannten Allergene")];

  const naehrwerte = rezept.naehrwerte;

  container.replaceChildren(
    el(
      "div",
      { class: "detail-hero" },
      el("div", { class: `icon-circle big ${kategorieFarbKlasse(rezept.kategorie)}`, "aria-hidden": "true" }, rezept.icon),
      el(
        "div",
        {},
        el("h1", {}, rezept.name),
        el("p", { class: "rezept-meta" }, `${rezept.kategorie} · ${rezept.zubereitungszeit_min} Min · ${rezept.ernaehrungskategorie}`),
        sterneBlock
      )
    ),
    el(
      "section",
      { class: "card" },
      el("h2", {}, "Zutaten"),
      el("ul", { class: "zutaten-liste" }, rezept.zutaten.map((z) => zutatZeile(z, reste, substituierteZutaten)))
    ),
    el(
      "section",
      { class: "card" },
      el("h2", {}, "Nährwerte ", el("span", { class: "meta-small" }, "(pro Portion, ca.)")),
      el(
        "div",
        { class: "naehrwerte-grid" },
        el("div", {}, el("strong", {}, naehrwerte.kcal), el("span", {}, "kcal")),
        el("div", {}, el("strong", {}, `${naehrwerte.eiweiss_g} g`), el("span", {}, "Eiweiß")),
        el("div", {}, el("strong", {}, `${naehrwerte.fett_g} g`), el("span", {}, "Fett")),
        el("div", {}, el("strong", {}, `${naehrwerte.kohlenhydrate_g} g`), el("span", {}, "Kohlenhydrate"))
      )
    ),
    el("section", { class: "card" }, el("h2", {}, "Allergene"), el("div", { class: "tag-container" }, allergene)),
    el(
      "section",
      { class: "card" },
      el("h2", {}, "Zubereitung"),
      el("ol", { class: "zubereitung-liste" }, rezept.zubereitung.map((schritt) => el("li", {}, schritt)))
    )
  );
}

renderDetail();
