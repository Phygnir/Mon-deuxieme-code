// Construit src/puzzles-data.js à partir des problèmes vérifiés (fichiers .jsonl).
// Usage : node tools/build-puzzles.js fichier1.jsonl [fichier2.jsonl ...]
const fs = require("fs"), path = require("path");
const seen = new Set(), out = [];
for (const f of process.argv.slice(2)) for (const l of fs.readFileSync(f, "utf8").split("\n")) {
  if (!l.trim()) continue;
  const p = JSON.parse(l), key = p.fen.split(" ").slice(0, 2).join(" ");
  if (seen.has(key)) continue;
  seen.add(key);
  out.push({ fen: p.fen, line: p.line, tags: p.tags, before: p.before, last: p.last });
}
const js = "// Problèmes tirés de parties autojouées, vérifiés par tools/verify-puzzles.js (solution unique à chaque coup).\n// Fichier généré par tools/build-puzzles.js : ne pas modifier à la main.\nconst MINED = [\n" +
  out.map(p => "  " + JSON.stringify(p)).join(",\n") + "\n];\n";
fs.writeFileSync(path.join(__dirname, "..", "src", "puzzles-data.js"), js);
console.log(out.length, "problèmes");
