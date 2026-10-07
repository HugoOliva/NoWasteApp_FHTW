/**
 * No Waste - App-Logik (Übersichtsseite)
 */

let ausgewaehlteAllergene = [];
let ausgewaehlteZutaten = [];

// ---------- Profil-Bereich ----------

function baueAllergeneAuswahl() {
  const container = document.getElementById("allergene-auswahl");
  container.innerHTML = "";
  ALLE_ALLERGENE.forEach((allergen) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = allergen;
    chip.addEventListener("click", () => {
      chip.classList.toggle("selected");
      if (ausgewaehlteAllergene.includes(allergen)) {
        ausgewaehlteAllergene = ausgewaehlteAllergene.filter((a) => a !== allergen);
      } else {
        ausgewaehlteAllergene.push(allergen);
      }
    });
    container.appendChild(chip);
  });
}

function baueErnaehrungSelect() {
  const select = document.getElementById("ernaehrung-select");
  select.innerHTML = "";
  ERNAEHRUNGSOPTIONEN.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option === "" ? "Keine Einschränkung" : option;
    select.appendChild(opt);
  });
}

function speicherProfil() {
  const profil = {
    allergene: ausgewaehlteAllergene,
    ernaehrungspraeferenz: document.getElementById("ernaehrung-select").value,
  };
  localStorage.setItem("noWasteProfil", JSON.stringify(profil));
  document.getElementById("profil-status").textContent = "Profil gespeichert ✓";
  setTimeout(() => (document.getElementById("profil-status").textContent = ""), 2000);
  if (ausgewaehlteZutaten.length > 0) zeigeErgebnisse();
}

function ladeGespeichertesProfil() {
  const gespeichert = localStorage.getItem("noWasteProfil");
  if (!gespeichert) return;

  const profil = JSON.parse(gespeichert);
  ausgewaehlteAllergene = profil.allergene || [];
  document.getElementById("ernaehrung-select").value = profil.ernaehrungspraeferenz || "";

  document.querySelectorAll("#allergene-auswahl .chip").forEach((chip) => {
    if (ausgewaehlteAllergene.includes(chip.textContent)) {
      chip.classList.add("selected");
    }
  });
}

function holeProfil() {
  return {
    allergene: ausgewaehlteAllergene,
    ernaehrungspraeferenz: document.getElementById("ernaehrung-select").value,
  };
}

// ---------- Zutaten-Bereich (gruppiert nach Kategorie) ----------

function speicherZutatenAuswahl() {
  localStorage.setItem("noWasteZutaten", JSON.stringify(ausgewaehlteZutaten));
}

function ladeGespeicherteZutaten() {
  const gespeichert = localStorage.getItem("noWasteZutaten");
  if (gespeichert) ausgewaehlteZutaten = JSON.parse(gespeichert);
}

function baueZutatenAuswahl(filterText = "") {
  const container = document.getElementById("zutaten-auswahl");
  container.innerHTML = "";

  Object.entries(ZUTATEN_KATEGORIEN).forEach(([gruppenName, zutatenListe]) => {
    const gefiltert = zutatenListe.filter((z) => z.toLowerCase().includes(filterText.toLowerCase()));
    if (gefiltert.length === 0) return;

    const label = document.createElement("div");
    label.className = "chip-group-label";
    label.textContent = gruppenName;
    container.appendChild(label);

    const gruppe = document.createElement("div");
    gruppe.className = "chip-container";

    gefiltert.forEach((zutat) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = zutat;
      if (ausgewaehlteZutaten.includes(zutat)) chip.classList.add("selected");

      chip.addEventListener("click", () => {
        chip.classList.toggle("selected");
        if (ausgewaehlteZutaten.includes(zutat)) {
          ausgewaehlteZutaten = ausgewaehlteZutaten.filter((z) => z !== zutat);
        } else {
          ausgewaehlteZutaten.push(zutat);
        }
        speicherZutatenAuswahl();
        zeigeErgebnisse();
      });

      gruppe.appendChild(chip);
    });

    container.appendChild(gruppe);
  });
}

// ---------- Kategorie-Filter ----------

function baueKategorieSelect() {
  const select = document.getElementById("kategorie-select");
  select.innerHTML = "";
  KATEGORIEN.forEach((kategorie) => {
    const opt = document.createElement("option");
    opt.value = kategorie;
    opt.textContent = kategorie;
    select.appendChild(opt);
  });
}

// ---------- Ergebnisse anzeigen ----------

function zeigeErgebnisse() {
  const profil = holeProfil();
  const kategorie = document.getElementById("kategorie-select").value;
  const ergebnisse = matchRezepte(profil, ausgewaehlteZutaten, kategorie);

  const container = document.getElementById("ergebnis-container");
  container.innerHTML = "";

  if (ausgewaehlteZutaten.length === 0) {
    container.innerHTML = '<p class="empty-state">Wähle zuerst ein paar Zutaten aus.</p>';
    return;
  }

  if (ergebnisse.length === 0) {
    container.innerHTML =
      '<p class="empty-state">Mit deiner aktuellen Auswahl lässt sich noch kein Rezept zubereiten, weil mindestens eine Hauptzutat fehlt. Wähle weitere Zutaten aus oder überprüfe dein Profil.</p>';
    return;
  }

  ergebnisse.forEach((rezept, index) => {
    const card = document.createElement("div");
    card.className = "rezept-card" + (rezept.hatPotenzial ? " potenzial" : "");
    card.style.animationDelay = `${index * 0.04}s`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Rezept ansehen: ${rezept.name}`);

    const gehtZurDetailseite = () => {
      window.location.href = `recipe.html?id=${rezept.id}`;
    };
    card.addEventListener("click", gehtZurDetailseite);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        gehtZurDetailseite();
      }
    });

    let fehlendHtml = "";
    if (rezept.fehlendeZutaten.length > 0) {
      const namen = rezept.fehlendeZutaten.map((f) => f.name).join(", ");
      fehlendHtml = `<p class="fehlend">Fehlt noch: ${namen}</p>`;
    }

    let substHtml = "";
    if (rezept.substituierteZutaten.length > 0) {
      const liste = rezept.substituierteZutaten.map((s) => `${s.original} → ${s.ersatz}`).join(", ");
      substHtml = `<p class="substitution">Ersetzt: ${liste}</p>`;
    }

    card.innerHTML = `
      <div class="rezept-header">
        <div class="rezept-header-left">
          <div class="icon-circle ${kategorieFarbKlasse(rezept.kategorie)}">${rezept.icon}</div>
          <div>
            <h3>${rezept.name}${rezept.hatPotenzial ? '<span class="potenzial-badge">Potenzial auf 5★</span>' : ""}</h3>
            <p class="rezept-meta">${rezept.kategorie} · ${rezept.zubereitungszeit_min} Min · ${rezept.ernaehrungskategorie}</p>
          </div>
        </div>
        <span class="sterne">${zeigeSterne(rezept.sterne)}</span>
      </div>
      ${fehlendHtml}
      ${substHtml}
    `;

    container.appendChild(card);
  });
}

// ---------- Initialisierung ----------

document.addEventListener("DOMContentLoaded", () => {
  ladeGespeicherteZutaten();
  baueAllergeneAuswahl();
  baueErnaehrungSelect();
  baueZutatenAuswahl();
  baueKategorieSelect();
  ladeGespeichertesProfil();

  document.getElementById("profil-speichern-btn").addEventListener("click", speicherProfil);
  document.getElementById("suchen-btn").addEventListener("click", zeigeErgebnisse);
  document.getElementById("kategorie-select").addEventListener("change", zeigeErgebnisse);
  document.getElementById("zutaten-suche").addEventListener("input", (e) => {
    baueZutatenAuswahl(e.target.value);
  });

  if (ausgewaehlteZutaten.length > 0) zeigeErgebnisse();
});
