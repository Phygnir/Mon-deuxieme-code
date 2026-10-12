// Vérifie les candidats et construit des problèmes à solution unique.
// Usage : node tools/verify-puzzles.js entrée.jsonl sortie.jsonl [début] [pas]
const { Chess, makeEngine, START, uci } = require("../tests/load.js");
const fs = require("fs");
const E = makeEngine();
const [inp, outp, start = 0, step = 1] = process.argv.slice(2);
const MATE = 30000, V = { p: 100, n: 300, b: 310, r: 500, q: 900, k: 0 };
const lines = fs.readFileSync(inp, "utf8").trim().split("\n").filter(Boolean);
const mat = (g, c) => g.b.reduce((s, p) => s + (p && (p === p.toUpperCase() ? "w" : "b") === c ? V[p.toLowerCase()] : 0), 0);
const diff = (g, c) => mat(g, c) - mat(g, c === "w" ? "b" : "w");
function analyse(moves, time) { return E.handle({ type: "analyse", fen: START, moves, time }).res; }
function search(moves, time) { return E.handle({ type: "search", fen: START, moves, time }).res; }
function margin(a) {
  const s = a.moves.slice().sort((x, y) => y.score - x.score);
  return { best: s[0], second: s[1] || { score: -MATE, bound: -1 } };
}
function withTurn(g, t) { const f = g.fen().split(" "); f[1] = t; f[3] = "-"; return new Chess(f.join(" ")); }
function attacksOf(g, sq) { const p = g.b[sq]; if (!p) return []; const c = p === p.toUpperCase() ? "w" : "b"; return withTurn(g, c).pseudo(c).filter(m => m.from === sq && m.captured); }
function classify(fen, line) {
  const g = new Chess(fen), S = g.turn, O = S === "w" ? "b" : "w", tags = new Set();
  const m = g.find(line[0]); const t = m.piece.toLowerCase();
  const before = new Map();
  for (let s = 0; s < 64; s++) { const p = g.b[s]; if (p && (p === p.toUpperCase() ? "w" : "b") === S && s !== m.from) before.set(s, new Set(attacksOf(g, s).map(x => x.to))); }
  g.make(m);
  if (g.inCheck()) tags.add("check");
  if (m.captured && (!g.attacked(m.to, O) || V[m.captured.toLowerCase()] > V[t])) tags.add("capture");
  const att = attacksOf(g, m.to).filter(x => x.captured);
  const targets = att.filter(x => { const ct = x.captured.toLowerCase(); return ct === "k" || ((V[ct] > V[t] || !g.attacked(x.to, O)) && V[ct] >= 300); });
  if (targets.length >= 2) tags.add("fork");
  for (const [s, set] of before) {
    const now = attacksOf(g, s);
    if (now.some(x => !set.has(x.to) && "kqr".includes(x.captured.toLowerCase()) && V[x.captured.toLowerCase()] >= V[g.b[s].toLowerCase()])) tags.add("discovered");
  }
  if ("brq".includes(t)) {
    const dirs = t === "b" ? [[1,1],[1,-1],[-1,1],[-1,-1]] : t === "r" ? [[1,0],[-1,0],[0,1],[0,-1]] : [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dr, df] of dirs) {
      let r = (m.to >> 3) + dr, f = (m.to & 7) + df, first = null;
      while (r >= 0 && r < 8 && f >= 0 && f < 8) {
        const p = g.b[r * 8 + f];
        if (p) {
          if ((p === p.toUpperCase() ? "w" : "b") !== O) break;
          if (!first) first = p.toLowerCase();
          else { const sec = p.toLowerCase(); if (first !== "k" && (sec === "k" || V[sec] > V[first])) tags.add("pin"); if ((first === "k" || V[first] > V[sec]) && V[sec] >= 300) tags.add("skewer"); break; }
        }
        r += dr; f += df;
      }
    }
  }
  if (!m.captured && g.attacked(m.to, O) && !g.attacked(m.to, S) && V[t] >= 300) tags.add("sacrifice");
  const h = new Chess(fen); for (const u of line) { const mm = h.find(u); if (mm.promo && (mm.piece === mm.piece.toUpperCase() ? "w" : "b") === S) tags.add("promotion"); h.make(mm); }
  if (h.status() === "mate") tags.add("mate");
  return [...tags];
}
let kept = 0;
for (let i = +start; i < lines.length; i += +step) {
  const cand = JSON.parse(lines[i]);
  const base = cand.moves;
  const g0 = new Chess(); for (const u of base) g0.make(g0.find(u));
  if (g0.status()) continue;
  const S = g0.turn, fen = g0.fen(), d0 = diff(g0, S);
  let a = analyse(base, 2600);
  let { best, second } = margin(a);
  const isMate = best.score > MATE - 200;
  if (!isMate && best.score < 250) continue;
  if (isMate ? second.score > MATE - 200 : best.score - second.score < 220) continue;
  const line = [], moves = base.slice();
  let ok = false, g = new Chess(fen);
  for (let k = 0; k < 4; k++) {
    if (k > 0) {
      a = analyse(moves, 2000); ({ best, second } = margin(a));
      const mateNow = best.score > MATE - 200;
      if (mateNow ? second.score > MATE - 200 : best.score - second.score < 160) break;
    }
    const um = g.find(best.u);
    line.push(best.u); moves.push(best.u); g.make(um);
    if (g.status() === "mate") { ok = true; break; }
    if (g.status()) break;
    const r = search(moves, 1500);
    if (!r || !r.move) break;
    const gainNow = diff(g, S) - d0;
    const rm = g.find(r.move);
    const recapture = rm.captured && rm.to === um.to;
    if (!isMate && gainNow >= 250 && !recapture && !rm.captured) { ok = true; break; }
    line.push(r.move); moves.push(r.move); g.make(rm);
    if (!isMate && diff(g, S) - d0 >= 250 && !g.inCheck()) {
      // gain acquis après la réponse : on termine sur le coup du joueur précédent
      line.pop(); moves.pop(); g.undo(); ok = true; break;
    }
  }
  if (!ok || line.length > 7) continue;
  const tags = classify(fen, line);
  const rec = { fen, line, tags, score: best.score, before: base.length ? (() => { const gb = new Chess(); for (const u of base.slice(0, -1)) gb.make(gb.find(u)); return gb.fen(); })() : null, last: base[base.length - 1] };
  fs.appendFileSync(outp, JSON.stringify(rec) + "\n");
  kept++;
  console.log(kept, fen, line.join(" "), tags.join(","));
}
console.log("gardés", kept);
