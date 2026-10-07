/**
 * Kleine Darstellungs-Hilfsfunktionen, die sowohl von der Übersichtsseite
 * (app.js) als auch der Detailseite (recipeDetail.js) genutzt werden.
 */

function zeigeSterne(anzahl) {
  return "★".repeat(anzahl) + "☆".repeat(5 - anzahl);
}

function kategorieFarbKlasse(kategorie) {
  if (kategorie === "Frühstück") return "icon-fruehstueck";
  if (kategorie === "Süßspeise") return "icon-suess";
  return "icon-mittag";
}
