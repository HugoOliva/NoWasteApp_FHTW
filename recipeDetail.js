/**
 * No Waste - Logik für die Rezept-Detailseite
 * Liest die Rezept-ID aus der URL (?id=...) und zeigt alle Details an,
 * inkl. Abgleich mit den zuletzt ausgewählten Zutaten (aus localStorage).
 */

function holeRezeptIdAusUrl() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("id"), 10);
}

function ladeAusgewaehlteZutaten() {
  const gespeichert = localStorage.getItem("noWasteZutaten");
  return gespeichert ? JSON.parse(gespeichert) : [];
}

function renderDetail() {
  const id = holeRezeptIdAusUrl();
  const rezept = REZEPTE.find((r) => r.id === id);
  const container = document.getElementById("detail-container");

  if (!rezept) {
    container.innerHTML =
      '<p class="empty-state">Rezept nicht gefunden. <a href="index.html">Zurück zur Übersicht</a></p>';
    return;
  }

  const ausgewaehlteZutaten = ladeAusgewaehlteZutaten();
  const { score, fehlendeZutaten, substituierteZutaten } = berechneRezeptErgebnis(rezept, ausgewaehlteZutaten);
  const sterne = berechneSterne(score);

  const zutatenListeHtml = rezept.zutaten
    .map((z) => {
      const vorhanden = ausgewaehlteZutaten.includes(z.name);
      const substitution = substituierteZutaten.find((s) => s.original === z.name);
      const statusIcon = vorhanden ? "✅" : substitution ? "🔄" : "❌";
      const statusText = vorhanden ? "" : substitution ? ` (ersetzt durch ${substitution.ersatz})` : " (fehlt)";
      const badge = z.essenziell ? '<span class="essenziell-badge">Hauptzutat</span>' : "";
      return `<li>${statusIcon} ${z.name}${badge}${statusText}</li>`;
    })
    .join("");

  const allergeneHtml = rezept.allergene.length
    ? rezept.allergene.map((a) => `<span class="tag">${a}</span>`).join("")
    : '<span class="tag tag-neutral">Keine bekannten Allergene</span>';

  const zubereitungHtml = rezept.zubereitung.map((schritt) => `<li>${schritt}</li>`).join("");

  container.innerHTML = `
    <div class="detail-hero">
      <div class="icon-circle big ${kategorieFarbKlasse(rezept.kategorie)}">${rezept.icon}</div>
      <div>
        <h1>${rezept.name}</h1>
        <p class="rezept-meta">${rezept.kategorie} · ${rezept.zubereitungszeit_min} Min · ${rezept.ernaehrungskategorie}</p>
        <span class="sterne big">${zeigeSterne(sterne)}</span>
      </div>
    </div>

    <section class="card">
      <h2>Zutaten</h2>
      <ul class="zutaten-liste">${zutatenListeHtml}</ul>
    </section>

    <section class="card">
      <h2>Nährwerte <span class="meta-small">(pro Portion, ca.)</span></h2>
      <div class="naehrwerte-grid">
        <div><strong>${rezept.naehrwerte.kcal}</strong><span>kcal</span></div>
        <div><strong>${rezept.naehrwerte.eiweiss_g} g</strong><span>Eiweiß</span></div>
        <div><strong>${rezept.naehrwerte.fett_g} g</strong><span>Fett</span></div>
        <div><strong>${rezept.naehrwerte.kohlenhydrate_g} g</strong><span>Kohlenhydrate</span></div>
      </div>
    </section>

    <section class="card">
      <h2>Allergene</h2>
      <div class="tag-container">${allergeneHtml}</div>
    </section>

    <section class="card">
      <h2>Zubereitung</h2>
      <ol class="zubereitung-liste">${zubereitungHtml}</ol>
    </section>
  `;
}

document.addEventListener("DOMContentLoaded", renderDetail);
