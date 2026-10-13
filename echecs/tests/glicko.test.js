// Vérifie le classement Glicko-2 des problèmes (fonction glicko2 de src/app.js).
const fs = require("fs"), path = require("path"), assert = require("assert");
const src = fs.readFileSync(path.join(__dirname, "..", "src", "app.js"), "utf8");
const code = src.slice(src.indexOf("const G2 = "), src.indexOf("// L'incertitude remonte"));
const { glicko2, G2 } = new Function(code + "; return { glicko2, G2 };")();
// Exemple de Glickman (tau = 0,5) réduit à une partie : 1500 ± 200 bat 1400 ± 30
G2.tau = 0.5;
let r = glicko2(1500, 200, 0.06, 1400, 30, 1);
assert(Math.abs(r.r - 1563.6) < 0.5, r.r);   // 1500 + 173.7178² × φ'² × g × (1 − E), calculé à la main
assert(r.rd < 200 && r.rd > 170, r.rd);
G2.tau = 0.75;
// Un débutant (± 500) bouge beaucoup, un joueur établi (± 60) peu
const big = glicko2(1500, 500, 0.09, 1500, 80, 1).r - 1500, small = glicko2(1500, 60, 0.06, 1500, 80, 1).r - 1500;
assert(big > 150 && small < 15 && small > 0, [big, small]);
// Échec contre un problème facile : grosse perte ; contre un problème très dur : petite perte
const easy = 1500 - glicko2(1500, 80, 0.06, 1100, 80, 0).r, hard = 1500 - glicko2(1500, 80, 0.06, 2200, 80, 0).r;
assert(easy > hard * 5, [easy, hard]);
// Stabilité numérique sur une longue suite
let p = { r: 1500, rd: 500, vol: 0.09 };
for (let i = 0; i < 500; i++) { const pr = 1200 + (i % 7) * 100; p = glicko2(p.r, p.rd, p.vol, pr, 75, pr < 1600 ? 1 : 0); }
assert(Number.isFinite(p.r) && p.rd >= 45 && p.vol <= 0.1 && Math.abs(p.r - 1600) < 120, p);
console.log("glicko2 ok", Math.round(p.r), Math.round(p.rd), p.vol.toFixed(4));
