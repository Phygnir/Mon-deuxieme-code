// Charge le moteur de règles (Chess) et le moteur de recherche depuis les sources, pour les tests Node.
const fs = require("fs"), path = require("path");
const src = n => fs.readFileSync(path.join(__dirname, "..", "src", n), "utf8");
const code = src("rules.js").replace("/*RULES-END*/", "") + "\n" + src("search.js") +
  "\nmodule.exports = { Chess, makeEngine, uci, START, sqIdx, sqName, mateIn, forcedMate };";
const m = { exports: {} };
new Function("module", "require", code)(m, require);
module.exports = m.exports;
