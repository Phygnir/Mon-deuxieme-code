// Recherche de positions tactiques par parties autojouées avec erreurs volontaires.
// Usage : node tools/mine.js <minutes> <sortie.jsonl>
const { Chess, makeEngine, START } = require("../tests/load.js");
const fs = require("fs");
const E = makeEngine();
const minutes = +process.argv[2] || 10, out = process.argv[3] || "cands.jsonl";
const end = Date.now() + minutes * 60000;
let games = 0, cands = 0;
while (Date.now() < end) {
  games++;
  const moves = [];
  for (let ply = 0; ply < 140 && Date.now() < end; ply++) {
    const a = E.handle({ type: "analyse", fen: START, moves, time: +process.env.MT || 220 }).res;
    if (!a || !a.moves.length) break;
    if (Math.abs(a.bestScore) > 700) break;
    // Choix bruité : de temps en temps une vraie erreur
    const noise = ply < 8 ? 60 : Math.random() < 0.25 ? 400 : 50;
    let pick = null, bestN = -Infinity;
    for (const x of a.moves) { const n = x.score + (Math.random() * 2 - 1) * noise; if (n > bestN) { bestN = n; pick = x; } }
    const loss = a.bestScore - pick.score;
    moves.push(pick.u);
    if (loss >= 200 && a.bestScore > -150 && a.bestScore < 300 && ply >= 8) {
      fs.appendFileSync(out, JSON.stringify({ moves: moves.slice() }) + "\n");
      cands++;
    }
    const g = new Chess(); for (const u of moves) g.make(g.find(u));
    if (g.status()) break;
  }
}
console.log("parties", games, "candidats", cands);
