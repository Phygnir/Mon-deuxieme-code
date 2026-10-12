const { Chess, makeEngine } = require("./load.js");
const E = makeEngine();
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log("ÉCHEC", msg); } else console.log("ok  ", msg); };
// Position : le cavalier b4 menace Cxc2+ si la dame quitte d1.
const fen = "r1bqkb1r/pppp1ppp/5n2/4p3/1n2P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 1";
const r = E.handle({ type: "analyse", fen, moves: [], time: 2500 }).res;
const sc = u => r.moves.find(x => x.u === u);
console.log("meilleur", r.best, r.bestScore, "prof", r.depth);
for (const u of ["d1h5", "d1g4", "d1f3", "d1e2", "a2a3", "g1f3"]) { const x = sc(u); console.log("  ", u, x.score, "perte", r.bestScore - x.score, x.bound ? "(borne)" : ""); }
ok(r.bestScore - sc("d1h5").score >= 200, "Dh5 est une gaffe (Cxc2+ fourchette)");
ok(r.bestScore - sc("d1f3").score >= 200, "Df3 est une gaffe");
ok(r.bestScore - sc("a2a3").score < 120, "a3 (chasse le cavalier) est correct");
// Menace vue avant le coup : position où c2 n'est plus défendu (dame blanche en h5), noirs au trait sans menace immédiate pour eux
const fen2 = "r1bqkb1r/pppp1ppp/5n2/4p2Q/1n2P3/2N5/PPPP1PPP/R1B1KBNR w KQkq - 0 1";
const t = E.handle({ type: "threat", fen: fen2, moves: [], time: 800 }).res;
console.log("menace", t && t.pv, t && t.score);
ok(t && /^(b4c2|h5|f6h5)/.test(t.pv[0]) , "menace détectée : " + (t && t.pv[0]));
// Après la gaffe, la meilleure réponse adverse est la fourchette
const s = E.handle({ type: "search", fen, moves: ["d1g4"], time: 1500 }).res;
console.log("après Dg4 :", s.pv.join(" "), s.score);
ok(s.pv[0] === "b4c2" || s.pv[0] === "f6g4", "réfutation trouvée : " + s.pv[0]);
process.exitCode = fails ? 1 : 0;
