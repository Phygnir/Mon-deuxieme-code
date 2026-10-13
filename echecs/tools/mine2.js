// Recherche rapide de positions tactiques : le moteur joue bien, et injecte de temps en temps une erreur plausible.
// Usage : node tools/mine2.js <minutes> <sortie.jsonl>
const { Chess, makeEngine, START } = require("../tests/load.js");
const fs = require("fs");
const E = makeEngine();
const minutes = +process.argv[2] || 10, out = process.argv[3] || "cands.jsonl";
const end = Date.now() + minutes * 60000;
let games = 0, cands = 0;
while (Date.now() < end) {
  games++;
  const moves = [], g = new Chess();
  for (let ply = 0; ply < 120 && Date.now() < end; ply++) {
    let u;
    if (ply >= 10 && Math.random() < 0.28) {
      const a = E.handle({ type: "analyse", fen: START, moves, time: 260 }).res;
      if (!a || !a.moves.length) break;
      if (Math.abs(a.bestScore) > 400) break;
      // Erreurs plausibles : perte de 2 à 9 pions, ou coup qui permet un mat
      const MATE = 30000;
      const blunders = a.moves.filter(x => (a.bestScore - x.score >= 200 && a.bestScore - x.score <= 900 && x.bound === 0) || (x.score < -MATE + 200 && a.bestScore > -300));
      if (blunders.length) {
        u = blunders[(Math.random() * blunders.length) | 0].u;
        fs.appendFileSync(out, JSON.stringify({ moves: moves.concat(u) }) + "\n");
        cands++;
        break; // une seule erreur par partie : la position suivante est celle du problème
      }
      u = a.best;
    } else {
      const r = E.handle({ type: "play", fen: START, moves, time: 70, depth: 5, noise: ply < 10 ? 70 : 20 }).res;
      if (!r || !r.move) break;
      u = r.move;
    }
    const m = g.find(u);
    if (!m) break;
    g.make(m); moves.push(u);
    if (g.status()) break;
  }
}
console.log("parties", games, "candidats", cands);
