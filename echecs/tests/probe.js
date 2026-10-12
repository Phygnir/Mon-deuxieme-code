// Analyse rapide de positions candidates : node tests/probe.js "fen" ...
const { Chess, makeEngine, uci } = require("./load.js");
const E = makeEngine();
const fr = (fen, pv) => { const g = new Chess(fen), out = []; for (const u of pv.slice(0, 8)) { const m = g.find(u); if (!m) break; out.push(g.san(m)); g.make(m); } return out.join(" "); };
for (const fen of process.argv.slice(2)) {
  try { new Chess(fen); } catch (e) { console.log("FEN invalide", fen); continue; }
  const g = new Chess(fen);
  if (g.inCheck(g.turn === "w" ? "b" : "w")) { console.log("ILLÉGAL (camp sans le trait en échec)", fen); continue; }
  const r = E.handle({ type: "analyse", fen, moves: [], time: +process.env.T || 3000 }).res;
  const top = r.moves.slice().sort((a, b) => b.score - a.score).slice(0, 4).map(x => `${g.san(g.find(x.u))}:${x.score}`).join("  ");
  console.log(fen, "\n   best", g.san(g.find(r.best)), r.bestScore, "prof", r.depth, "|", top, "\n   pv", fr(fen, r.pv));
}
