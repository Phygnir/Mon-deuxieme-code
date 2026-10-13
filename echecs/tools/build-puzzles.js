// Construit src/puzzles-data.js à partir des problèmes vérifiés (fichiers .jsonl).
// Usage : node tools/build-puzzles.js fichier1.jsonl [fichier2.jsonl ...]
const fs = require("fs"), path = require("path");
// Les simples « pièces en prise » sont très nombreuses : elles sont placées après les autres thèmes
// (l'onglet Exercices n'en garde que 70 ; l'onglet Problèmes utilise tout, classé par difficulté)
const MAX_CAPTURE = Infinity;
const isPlainCapture = t => !["mate", "promotion", "fork", "pin", "skewer", "discovered", "sacrifice"].some(x => t.includes(x));
const seen = new Set(), out = [];
for (const f of process.argv.slice(2)) for (const l of fs.readFileSync(f, "utf8").split("\n")) {
  if (!l.trim()) continue;
  const p = JSON.parse(l), key = p.fen.split(" ").slice(0, 2).join(" ");
  if (seen.has(key)) continue;
  seen.add(key);
  out.push({ fen: p.fen, line: p.line, tags: p.tags, before: p.before, last: p.last, r: p.r });
}
// Classement final : l'ordre de difficulté vient de tools/rate-puzzles.js (champ r brut),
// puis les notes sont réparties par rang entre 600 et 2100 pour que l'entraînement adaptatif ait de la marge.
const ranked = out.slice().sort((a, b) => (a.r || 0) - (b.r || 0) || a.line.length - b.line.length || (a.fen < b.fen ? -1 : 1));
ranked.forEach((p, i) => { const pct = ranked.length > 1 ? i / (ranked.length - 1) : 0.5; p.r = Math.round((600 + 1500 * Math.pow(pct, 1.15)) / 10) * 10; });
let caps = out.filter(p => isPlainCapture(p.tags));
const others = out.filter(p => !isPlainCapture(p.tags));
// Ordre déterministe : les solutions longues d'abord, puis par position
caps.sort((a, b) => b.line.length - a.line.length || (a.fen < b.fen ? -1 : 1));
caps = caps.slice(0, MAX_CAPTURE);
out.length = 0; out.push(...others, ...caps);
const js = "// Problèmes tirés de parties autojouées, vérifiés par tools/verify-puzzles.js (solution unique à chaque coup).\n// Fichier généré par tools/build-puzzles.js : ne pas modifier à la main.\nconst MINED = [\n" +
  out.map(p => "  " + JSON.stringify(p)).join(",\n") + "\n];\n";
fs.writeFileSync(path.join(__dirname, "..", "src", "puzzles-data.js"), js);
console.log(out.length, "problèmes");
