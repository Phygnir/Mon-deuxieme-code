// Vérifie les problèmes Lichess retenus par tools/import-lichess.py et génère src/puzzles-lichess.js.
// Chaque coup doit être légal, et un problème « mate » doit finir sur un mat.
// Usage : node tools/build-lichess.js selection.csv
const { Chess } = require("../tests/load.js");
const fs = require("fs"), path = require("path");
const [inp] = process.argv.slice(2);
const lines = fs.readFileSync(inp, "utf8").trim().split(/\r?\n/).slice(1);
const themes = new Map(), out = [];
let bad = 0;
for (const l of lines) {
  const [id, fen, moves, rating, rd, th] = l.split(",");
  const mv = moves.split(" "), tags = th.split(" ");
  const g = new Chess(fen);
  let ok = mv.length >= 2 && mv.length % 2 === 0;
  for (const u of mv) {
    const m = ok && g.find(u);
    if (!m) { ok = false; break; }
    g.make(m);
  }
  if (ok && tags.includes("mate") && g.status() !== "mate") ok = false;
  if (!ok) { bad++; continue; }
  const idx = tags.map(t => { if (!themes.has(t)) themes.set(t, themes.size); return themes.get(t).toString(36); });
  out.push([id, fen, moves, rating, rd, idx.join(".")].join(","));
}
const js = `// Fichier généré par tools/build-lichess.js : ne pas modifier à la main.
// Problèmes de la base Lichess (https://database.lichess.org, domaine public CC0).
// Format : identifiant,FEN avant le coup adverse,coups (le premier est celui de l'adversaire),classement,écart,thèmes
const LICHESS_THEMES = ${JSON.stringify([...themes.keys()])};
const LICHESS = [
${out.map(s => JSON.stringify(s)).join(",\n")}
];
`;
fs.writeFileSync(path.join(__dirname, "..", "src", "puzzles-lichess.js"), js);
console.log(`${out.length} problèmes écrits, ${bad} rejetés, ${(js.length / 1024).toFixed(0)} Ko`);
