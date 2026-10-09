/**
 * Kleine Hilfsfunktionen, die von der Suchseite (suche.js) und der
 * Detailseite (recipeDetail.js) gemeinsam genutzt werden.
 */

const STORAGE_PROFIL = "noWasteProfil";
const STORAGE_SUCHE = "noWasteSuche";

function zeigeSterne(anzahl) {
  return "★".repeat(anzahl) + "☆".repeat(5 - anzahl);
}

function kategorieFarbKlasse(kategorie) {
  if (kategorie === "Frühstück") return "icon-fruehstueck";
  if (kategorie === "Süßspeise") return "icon-suess";
  return "icon-mittag";
}

// localStorage kann blockiert sein (z. B. privater Modus), deshalb abgesichert.
function ladeGespeichert(schluessel, standard) {
  try {
    const roh = localStorage.getItem(schluessel);
    return roh ? JSON.parse(roh) : standard;
  } catch (e) {
    return standard;
  }
}

function speichere(schluessel, wert) {
  try {
    localStorage.setItem(schluessel, JSON.stringify(wert));
  } catch (e) {
    /* nicht schlimm, die App funktioniert auch ohne Speichern */
  }
}

// Kürzere Schreibweise zum Erzeugen von DOM-Elementen:
// el("div", { class: "x", onclick: fn }, "Text oder weitere Elemente")
function el(tag, attribute = {}, ...kinder) {
  const element = document.createElement(tag);
  Object.entries(attribute).forEach(([name, wert]) => {
    if (wert === false || wert === null || wert === undefined) return;
    if (name.startsWith("on") && typeof wert === "function") {
      element.addEventListener(name.slice(2), wert);
    } else if (name === "class") {
      element.className = wert;
    } else {
      element.setAttribute(name, wert === true ? "" : wert);
    }
  });
  kinder.flat().forEach((kind) => {
    if (kind === null || kind === undefined || kind === false) return;
    element.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  });
  return element;
}

function kategorieVonZutat(name) {
  const treffer = Object.entries(ZUTATEN_KATEGORIEN).find(([, liste]) => liste.includes(name));
  return treffer ? treffer[0] : "";
}
