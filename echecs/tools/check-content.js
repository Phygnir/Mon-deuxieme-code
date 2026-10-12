// Vérifie tout le contenu pédagogique : node tools/check-content.js [--fast]
const fs = require("fs"), path = require("path");
const src = n => fs.readFileSync(path.join(__dirname, "..", "src", n), "utf8");
const code = src("rules.js").replace("/*RULES-END*/", "") + src("search.js") + src("content.js") + src("puzzles-data.js") + src("lessons-extra.js") +
  "\nmodule.exports = { Chess, makeEngine, uci, START, sqIdx, mateIn, PATHS, PUZZLES, SHEETS, L_OUV };";
const M = { exports: {} }; new Function("module", "require", code)(M, require);
const { Chess, makeEngine, uci, START, sqIdx, mateIn, PATHS, PUZZLES, L_OUV } = M.exports;
const { probe } = require("./kpk.js");
const E = makeEngine(), FAST = process.argv.includes("--fast");
let problems = 0, warns = 0;
const P = (...a) => { problems++; console.log("PROBLÈME", ...a); };
const W = (...a) => { warns++; console.log("attention", ...a); };
const legalFen = f => { try { const g = new Chess(f); const k = g.b.filter(p => p === "K").length + g.b.filter(p => p === "k").length; if (k === 2 && g.inCheck(g.turn === "w" ? "b" : "w")) return "camp sans le trait en échec"; return null; } catch (e) { return "FEN invalide"; } };
const sqOk = s => /^[a-h][1-8]$/.test(s);
function engineLosses(fen, us) {
  const r = E.handle({ type: "analyse", fen, moves: [], time: FAST ? 600 : 1500 }).res;
  const map = new Map(r.moves.map(x => [x.u, x]));
  return { best: r.best, bestScore: r.bestScore, loss: u => { const x = map.get(u) || map.get(u + "q"); return x ? (x.bound < 0 ? 999 : r.bestScore - x.score) : 999; } };
}
const ids = new Set();
let nLessons = 0, nSteps = 0;
for (const p of PATHS) for (const l of p.lessons) {
  nLessons++;
  if (ids.has(l.id)) P("identifiant en double", l.id); ids.add(l.id);
  if (!l.goals || !l.recap) W(l.id, "sans objectifs ou bilan");
  l.steps.forEach((st, i) => {
    nSteps++;
    const tag = `${p.id}/${l.id}#${i} ${st.k}`, fen = st.fen || START;
    const e = legalFen(fen); if (e) return P(tag, e, fen);
    const g = new Chess(fen);
    for (const a of st.arrows || []) { const u = a.split(":")[0]; if (!sqOk(u.slice(0, 2)) || !sqOk(u.slice(2, 4))) P(tag, "flèche invalide", a); }
    for (const s of st.marks || []) if (!sqOk(s)) P(tag, "case invalide", s);
    if (st.k === "quiz" && !(st.answer >= 0 && st.answer < st.options.length)) P(tag, "réponse hors limites");
    if (st.k === "move") {
      for (const a of st.accept || []) if (!g.find(a)) P(tag, "coup accepté illégal", a);
      if (st.goal === "mate" && !mateIn(g, 1)) P(tag, "pas de mat en 1");
      if (st.accept && st.accept.length && !FAST) {
        const an = engineLosses(fen);
        const losses = st.accept.map(a => an.loss(a));
        const bestAcc = Math.min(...losses);
        if (bestAcc > 90) W(tag, `aucun coup accepté n'est proche du meilleur (${g.san(g.find(an.best))}, perte ${bestAcc})`);
        st.accept.forEach((a, k) => { if (losses[k] > 150) W(tag, `coup accepté faible ${a} (perte ${losses[k]})`); });
      }
    }
    if (st.k === "line") {
      const h = new Chess(fen);
      for (let k = 0; k < st.moves.length; k++) {
        const m = h.find(st.moves[k]);
        if (!m) { P(tag, "coup illégal dans la ligne", st.moves[k], "au demi-coup", k); break; }
        h.make(m);
      }
      if (h.turn === st.side && st.moves.length) P(tag, "la ligne finit par un coup adverse");
    }
    if (st.k === "mate") {
      for (let k = 1; k < st.n; k++) if (mateIn(g, k)) P(tag, "mat plus court en", k);
      if (!mateIn(g, st.n)) P(tag, "pas de mat en", st.n);
    }
    if (st.k === "kpk") { const pw = g.b.indexOf("P"); if (probe(g.turn === "w" ? 0 : 1, g.king("w"), g.king("b"), pw) !== 1) P(tag, "finale roi-pion non gagnante"); }
    if (st.k === "pick") for (const s of st.answers) if (!sqOk(s)) P(tag, "case invalide", s);
    if (st.k === "sheet") for (const x of st.sheet.typical) {
      let h = new Chess(fen), m = h.find(x.u);
      if (!m) { const f = fen.split(" "); f[1] = f[1] === "w" ? "b" : "w"; f[3] = "-"; h = new Chess(f.join(" ")); m = h.find(x.u); }
      if (!m) P(tag, "coup typique illégal", x.u);
    }
  });
}
// Vérifications ponctuelles
const st = new Chess("k7/2Q5/1K6/8/8/8/8/8 b - - 0 1").status(); if (st !== "stalemate") P("quiz du pat : statut", st);
for (const pz of PUZZLES) { const e = legalFen(pz.fen); if (e) P("exercice", pz.id, e); }
console.log(`${nLessons} leçons, ${nSteps} étapes, ${PUZZLES.length} exercices · ${problems} problème(s), ${warns} avertissement(s)`);
process.exitCode = problems ? 1 : 0;
