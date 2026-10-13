// ---------- Analyse de partie : courbe, précision, moments clés ----------
// Les parties terminées sont gardées (save.games, les 12 dernières). Le moteur évalue chaque position,
// puis on classe les coups selon la perte de chances de gain, comme Lichess.
if (!save.games) save.games = [];
const AN = { g: null, i: 0, run: 0, busy: false, sel: null };
Object.assign(ICON, {
  first: svgI('<path d="M18 6 12 12l6 6M7 6v12"/>'),
  prev: svgI('<path d="M15 6l-6 6 6 6"/>'),
  next: svgI('<path d="M9 6l6 6-6 6"/>'),
  last: svgI('<path d="M6 6l6 6-6 6M17 6v12"/>'),
  chart: svgI('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>')
});
// Probabilité de gain (0-100) d'après l'évaluation en centipions, formule de Lichess
const winPct = cp => (Math.abs(cp) > Engine_MATE - 200 ? (cp > 0 ? 100 : 0) : 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1000, Math.min(1000, cp)))) - 1));
const anWp = (game, k, side) => Math.round(winPct((side === "w" ? 1 : -1) * game.an.ev[k]));
const moveAcc = drop => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
const AN_Q = [[30, "q-bad", "gaffe"], [20, "q-err", "erreur"], [10, "q-dub", "imprécision"]];
function archiveGame(res) {
  if (PL.log.length < 6) return;
  const g = { id: PL.gid || Date.now().toString(36), date: Date.now(), color: PL.color, level: PL.level, res, log: PL.log.map(e => ({ u: e.u, san: e.san })), an: null };
  save.games = [g].concat(save.games.filter(x => x.id !== g.id)).slice(0, 12);
  persist();
}
// Ligne d'ouverture connue jusqu'au coup k inclus ?
const anBook = (log, k) => k < 20 && L_OUV.some(l => { const line = l.steps[1].moves; return k < line.length && log.slice(0, k + 1).every((e, i) => line[i] === e.u); });
// Classement de chaque coup à partir des évaluations (point de vue des Blancs)
function anMoves(game) {
  const an = game.an, out = [];
  if (!an) return out;
  for (let k = 0; k < game.log.length; k++) {
    if (an.ev[k] == null || an.ev[k + 1] == null) break;
    const side = k % 2 ? "b" : "w", s = side === "w" ? 1 : -1;
    const before = winPct(s * an.ev[k]), after = winPct(s * an.ev[k + 1]);
    // Un coup de théorie qui perd beaucoup (piège d'ouverture) reste une erreur
    const drop = Math.max(0, before - after), book = drop < 10 && anBook(game.log, k);
    const best = an.best[k] === game.log[k].u;
    const q = book || best ? null : AN_Q.find(([d]) => drop >= d);
    out.push({ k, side, drop: book ? 0 : drop, acc: book || best ? 100 : moveAcc(drop), q: q ? q[1] : best ? "q-best" : null, word: q ? q[2] : book ? "théorie" : best ? "meilleur coup" : "bon coup", book, best });
  }
  return out;
}
function anSummary(game, moves) {
  const res = {};
  for (const c of ["w", "b"]) {
    const ms = moves.filter(m => m.side === c);
    res[c] = { acc: ms.length ? Math.round(ms.reduce((a, m) => a + m.acc, 0) / ms.length) : null, dub: ms.filter(m => m.q === "q-dub").length, err: ms.filter(m => m.q === "q-err").length, bad: ms.filter(m => m.q === "q-bad").length };
  }
  return res;
}
// Les moments clés : tes coups qui ont le plus coûté
const anMoments = (game, moves) => moves.filter(m => m.side === game.color && m.drop >= 10).sort((a, b) => b.drop - a.drop).slice(0, 4).sort((a, b) => a.k - b.k);
function gameAt(game, n) {
  const g = new Chess(START);
  for (const e of game.log.slice(0, n)) { const m = g.find(e.u); if (!m) break; g.make(m); }
  return g;
}
// Évalue les positions une par une ; l'affichage se met à jour au fur et à mesure
async function analyseGame(game) {
  const run = ++AN.run, N = game.log.length;
  if (!game.an || game.an.n !== N) game.an = { n: N, ev: [], best: [], pv: [] };
  const an = game.an;
  AN.busy = true;
  for (let k = 0; k <= N; k++) {
    if (an.ev[k] != null) continue;
    const g = gameAt(game, k), st = g.status();
    if (st) { an.ev[k] = st === "mate" ? (g.turn === "w" ? -Engine_MATE : Engine_MATE) : 0; an.best[k] = null; an.pv[k] = []; }
    else {
      const r = await Engine.run({ type: "search", moves: game.log.slice(0, k).map(e => e.u), time: 450 });
      if (run !== AN.run) return;
      const sc = r && r.move ? r.score : 0;
      an.ev[k] = g.turn === "w" ? sc : -sc; an.best[k] = r && r.move; an.pv[k] = (r && r.pv || []).slice(0, 6);
    }
    if (run !== AN.run) return;
    if (k % 8 === 0) persist();
    if (AN.g === game && modeNow === "jouer") anPanel(true);
  }
  AN.busy = false;
  an.done = true;
  persist();
  // Les erreurs de la partie partent en révision
  if (typeof revAdd === "function") for (const m of anMoments(game, anMoves(game)).filter(m => m.drop >= 15).slice(0, 3)) revAdd(`mo:${game.id}:${m.k}`, anMomentItem(game, m));
  if (AN.g === game && modeNow === "jouer") anPanel(true);
}
function anMomentItem(game, m) {
  const g = gameAt(game, m.k);
  return { k: "moment", fen: g.fen(), best: game.an.best[m.k], played: game.log[m.k].u, ev: game.an.ev[m.k], side: m.side, date: game.date, move: Math.floor(m.k / 2) + 1 };
}
function analysisView(id) {
  const game = save.games.find(x => x.id === id);
  if (!game) return playView();
  clearTimers(); PL.gen++;
  AN.g = game; AN.i = game.log.length; AN.sel = null;
  resetBoard(START, { flip: game.color === "b", locked: true, captured: true, names: game.color === "w" ? { w: "Toi", b: "Ordinateur" } : { w: "Ordinateur", b: "Toi" } });
  $("#evalbar").hidden = false; $("#board-col").classList.add("with-eval");
  panelEnter();
  anGo(AN.i);
  if (!game.an || !game.an.done) analyseGame(game);
}
function anGo(i) {
  const game = AN.g;
  AN.i = Math.max(0, Math.min(game.log.length, i));
  B.game = gameAt(game, AN.i);
  const lm = B.game.hist[B.game.hist.length - 1];
  B.last = lm ? [lm.m.from, lm.m.to] : null;
  B.arrows = [];
  // Après une erreur, la flèche verte montre ce qu'il fallait jouer (comme sur Lichess)
  const mv = anMoves(game).find(m => m.k === AN.i - 1), an = game.an;
  if (mv && mv.q && mv.q !== "q-best" && an.best[mv.k]) {
    const g0 = gameAt(game, mv.k), bm = g0.find(an.best[mv.k]);
    if (bm) B.arrows = [[bm.from, bm.to]];
  }
  const ev = an && an.ev[AN.i];
  if (ev != null) PL.bal = ev;
  render(); anPanel();
}
function anGraph(game, moves) {
  const an = game.an, N = game.log.length, W = 300, H = 84;
  const x = k => (N ? (k / N) * W : 0), y = k => H * (1 - winPct(an.ev[k]) / 100);
  const known = []; for (let k = 0; k <= N && an && an.ev[k] != null; k++) known.push(k);
  const line = known.map((k, j) => `${j ? "L" : "M"}${x(k).toFixed(1)} ${y(k).toFixed(1)}`).join(" ");
  const area = known.length > 1 ? `${line} L${x(known[known.length - 1]).toFixed(1)} ${H} L0 ${H} Z` : "";
  const dots = moves.filter(m => m.q && m.q !== "q-best").map(m => `<circle cx="${x(m.k + 1).toFixed(1)}" cy="${y(m.k + 1).toFixed(1)}" r="3.2" class="an-dot ${m.q}"></circle>`).join("");
  const hits = Array.from({ length: N + 1 }, (_, k) => `<rect x="${(x(k) - W / N / 2).toFixed(1)}" y="0" width="${(W / Math.max(1, N)).toFixed(1)}" height="${H}" data-go="${k}"><title>${k ? `${Math.ceil(k / 2)}${k % 2 ? "." : "..."} ${frSan(game.log[k - 1].san)}` : "Position de départ"}</title></rect>`).join("");
  return `<svg class="an-graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Courbe d'évaluation de la partie">
    <rect width="${W}" height="${H}" class="an-bg"></rect>
    ${area ? `<path d="${area}" class="an-area"></path>` : ""}
    <line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="an-mid"></line>
    <line x1="${x(AN.i).toFixed(1)}" x2="${x(AN.i).toFixed(1)}" y1="0" y2="${H}" class="an-cur"></line>
    ${dots}<g class="an-hits">${hits}</g></svg>`;
}
// Commentaire du coup affiché : pourquoi il est faible, et ce qu'il fallait jouer
function anComment(game, m) {
  const an = game.an, g = gameAt(game, m.k), played = g.find(game.log[m.k].u);
  const me = m.side === game.color, who = me ? "me" : "opp";
  const san = frSan(game.log[m.k].san), num = `${Math.floor(m.k / 2) + 1}${m.side === "w" ? "." : "..."}`;
  const out = { title: `${num} ${san}`, word: m.word, c: !m.q || m.q === "q-best" ? "ok" : m.q === "q-dub" ? "warn" : "bad", lines: [] };
  if (m.book) { out.lines.push("Coup de théorie : il fait partie d'une ouverture étudiée dans les leçons."); return out; }
  if (!m.q || m.q === "q-best") {
    const f = played ? pickFacts(moveFacts(g, played), GOOD, who, 2) : [];
    out.lines.push(f.length ? f.join(" ") : m.best ? "C'est le coup que le moteur choisit aussi." : "Un coup correct, qui garde l'équilibre.");
    return out;
  }
  if (played) out.lines.push(...pickFacts(moveFacts(g, played), BAD, who, 1));
  // La réfutation : la meilleure réponse dans la position d'après
  const after = gameAt(game, m.k + 1), pv = an.pv[m.k + 1] || [];
  if (pv.length) {
    const rm = after.find(pv[0]);
    if (rm) {
      const rf = pickFacts(moveFacts(after, rm), ["mate", "fork", "capFree", "capWin", "check", "threat", "capEven"], me ? "opp" : "me", 1);
      const seq = lineSans(after, pv, 4);
      out.lines.push(`${me ? "Sa meilleure réponse" : "Ta meilleure réponse était"} : <b>${seq[0]}</b>${rf.length ? " — " + lc(rf[0]) : "."}${seq.length > 1 ? ` Suite : ${seq.join(" ")}.` : ""}`);
    }
  }
  out.lines.push(`${me ? "Tes" : "Ses"} chances de gain passent de ${anWp(game, m.k, m.side)} % à ${anWp(game, m.k + 1, m.side)} %.`);
  const bm = an.best[m.k] && g.find(an.best[m.k]);
  if (bm) {
    const bf = pickFacts(moveFacts(g, bm), GOOD, who, 1), seq = lineSans(g, an.pv[m.k] || [an.best[m.k]], 3);
    out.better = `Mieux : <b>${seq[0]}</b>${bf.length ? " — " + lc(bf[0]) : "."}${seq.length > 1 ? ` Par exemple ${seq.join(" ")}.` : ""}`;
  }
  // L'adversaire venait de se tromper ?
  const prev = anMoves(game).find(x => x.k === m.k - 1);
  if (me && prev && (prev.q === "q-err" || prev.q === "q-bad")) out.lines.unshift("L'ordinateur venait de faire une erreur : il y avait une occasion à saisir.");
  return out;
}
function anPanel(progressOnly) {
  const game = AN.g;
  if (!game || modeNow !== "jouer") return;
  const an = game.an, N = game.log.length, done = an && an.done;
  const moves = anMoves(game), sum = anSummary(game, moves), moments = done ? anMoments(game, moves) : [];
  if (progressOnly && $("#an-progress")) {
    // Mise à jour légère pendant le calcul
    const n = an ? an.ev.filter(v => v != null).length : 0;
    $("#an-progress").style.width = `${Math.round((n / (N + 1)) * 100)}%`;
    $("#an-count").textContent = `${n}/${N + 1}`;
    $("#an-graph").innerHTML = anGraph(game, moves); anBindGraph();
    if (!done) return;
  }
  const me = game.color, opp = me === "w" ? "b" : "w", resTxt = { w: "Victoire", d: "Nulle", l: "Défaite" }[game.res] || "Partie";
  const cur = moves.find(m => m.k === AN.i - 1), com = cur ? anComment(game, cur) : null;
  const rows = [];
  for (let i = 0; i < N; i += 2) {
    const cell = j => { if (!game.log[j]) return "<span></span>"; const m = moves.find(x => x.k === j); return `<span data-go="${j + 1}"${j === AN.i - 1 ? ' class="cur"' : ""}${m && m.q && m.q !== "q-best" ? ` data-q="${m.q}"` : ""}>${frSan(game.log[j].san)}</span>`; };
    rows.push(`<span class="n">${i / 2 + 1}.</span>${cell(i)}${cell(i + 1)}`);
  }
  const col = (c, name) => `<div class="an-side"><span class="an-who">${pieceEl(c === "w" ? "K" : "k")}${name}</span><b>${sum[c].acc != null && done ? sum[c].acc + " %" : "…"}</b><span>précision</span>
    <ul><li><i class="q-dub"></i>${sum[c].dub} imprécision${sum[c].dub > 1 ? "s" : ""}</li><li><i class="q-err"></i>${sum[c].err} erreur${sum[c].err > 1 ? "s" : ""}</li><li><i class="q-bad"></i>${sum[c].bad} gaffe${sum[c].bad > 1 ? "s" : ""}</li></ul></div>`;
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><button class="btn" id="an-back">${ICON.back}Retour</button><span class="pill">${resTxt} · ${LEVELS[game.level] ? LEVELS[game.level].name : ""} · ${Math.ceil(N / 2)} coups</span></div>
    <p class="eyebrow">Analyse de la partie</p>
    <h2>${done ? (moments.length ? "Les moments qui ont compté" : "Une partie bien tenue") : "Le moteur revoit ta partie"}</h2>
    ${done ? "" : `<div class="an-load"><div class="timer"><i id="an-progress" style="width:${Math.round(((an ? an.ev.filter(v => v != null).length : 0) / (N + 1)) * 100)}%"></i></div><span class="calm"><i class="spin"></i> Positions analysées : <b id="an-count">0/${N + 1}</b></span></div>`}
    <div id="an-graph">${anGraph(game, moves)}</div>
    <div class="an-nav" role="group" aria-label="Navigation dans la partie">
      <button class="btn" data-nav="first" aria-label="Début">${ICON.first}</button><button class="btn" data-nav="prev" aria-label="Coup précédent">${ICON.prev}</button>
      <span class="an-ply">${AN.i ? `${Math.ceil(AN.i / 2)}${AN.i % 2 ? "." : "..."} ${frSan(game.log[AN.i - 1].san)}` : "Départ"}</span>
      <button class="btn" data-nav="next" aria-label="Coup suivant">${ICON.next}</button><button class="btn" data-nav="last" aria-label="Fin">${ICON.last}</button>
    </div>
    ${com ? `<div class="coach-card ${com.c}"><div class="coach-title"><span class="verdict ${com.c}">${com.word}</span><b>${com.title}</b>${an.ev[AN.i] != null ? `<span class="coach-score">${anScore(an.ev[AN.i])}</span>` : ""}</div>
      ${com.lines.length ? `<ul>${com.lines.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}${com.better ? `<p class="coach-better">${com.better}</p>` : ""}</div>` : ""}
    ${done ? `<div class="an-sum">${col(me, "Toi")}${col(opp, "Ordinateur")}</div>` : ""}
    ${moments.length ? `<p class="group-title">Tes moments clés</p><div class="list">${moments.map(m => `
      <div class="item an-moment${AN.i === m.k + 1 ? " next" : ""}">
        <span class="num" data-q-dot="${m.q}">${Math.floor(m.k / 2) + 1}</span>
        <span><span class="ti">${Math.floor(m.k / 2) + 1}${m.side === "w" ? "." : "..."} ${frSan(game.log[m.k].san)} · ${m.word}</span><span class="de">Tes chances de gain passent de ${anWp(game, m.k, m.side)} % à ${anWp(game, m.k + 1, m.side)} %.</span></span>
        <span class="an-acts"><button class="btn" data-go="${m.k + 1}">Voir</button><button class="btn primary" data-retry="${m.k}">${ICON.retry}Rejouer</button></span>
      </div>`).join("")}</div><p class="calm">Ces positions reviendront dans ta révision : demain, puis à intervalles de plus en plus longs.</p>` : done ? `<div class="fb ok">${ICON.check} Aucune erreur sérieuse de ta part dans cette partie. Bravo !</div>` : ""}
    <div class="moves" id="an-moves">${rows.join("")}</div>`;
  anBindGraph();
  panel.querySelectorAll("#an-moves [data-go], .an-moment [data-go]").forEach(b => b.onclick = () => anGo(+b.dataset.go));
  panel.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => anNav(b.dataset.nav));
  panel.querySelectorAll("[data-retry]").forEach(b => b.onclick = () => { const m = moves.find(x => x.k === +b.dataset.retry); if (m) revRunSingle(anMomentItem(game, m), () => analysisView(game.id)); });
  $("#an-back").onclick = () => { AN.run++; AN.g = null; playView(); };
  const c = $("#an-moves .cur"); if (c) c.scrollIntoView({ block: "nearest" });
  updateEvalBar();
}
function anBindGraph() { panel.querySelectorAll(".an-hits [data-go]").forEach(r => r.onclick = () => anGo(+r.dataset.go)); }
function anNav(d) {
  if (!AN.g) return;
  anGo(d === "first" ? 0 : d === "last" ? AN.g.log.length : AN.i + (d === "next" ? 1 : -1));
}
const anScore = v => (Math.abs(v) >= Engine_MATE ? "#" : Math.abs(v) > Engine_MATE - 200 ? (v > 0 ? "+" : "−") + "M" + Math.ceil((Engine_MATE - Math.abs(v)) / 2) : (v >= 0 ? "+" : "−") + (Math.abs(v) / 100).toFixed(1).replace(".", ","));
document.addEventListener("keydown", e => {
  if (!AN.g || modeNow !== "jouer" || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k = { ArrowLeft: "prev", ArrowRight: "next", Home: "first", End: "last" }[e.key];
  if (k) { e.preventDefault(); anNav(k); }
});
// Liste des parties récentes
function gamesList() {
  clearTimers(); PL.gen++; AN.run++; AN.g = null;
  resetBoard(START, { locked: true, list: true });
  panelEnter();
  const fmt = t => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><button class="btn" id="back">${ICON.back}Jouer</button><span class="pill">${save.games.length} partie${save.games.length > 1 ? "s" : ""}</span></div>
    <p class="eyebrow">Tes parties</p><h2>Revois tes dernières parties</h2>
    <p class="lead">Le moteur repère tes erreurs, montre ce qu'il fallait jouer et calcule ta précision. Les 12 dernières parties sont gardées.</p>
    ${save.games.length ? `<div class="list">${save.games.map(g => {
      const s = g.an && g.an.done ? anSummary(g, anMoves(g))[g.color] : null;
      return `<button class="item" data-game="${g.id}">
        <span class="num">${g.res === "w" ? ICON.trophy : g.res === "d" ? "½" : ICON.flag}</span>
        <span><span class="ti">${{ w: "Victoire", d: "Nulle", l: "Défaite" }[g.res]} avec les ${g.color === "w" ? "Blancs" : "Noirs"}</span><span class="de">${fmt(g.date)} · ${LEVELS[g.level] ? LEVELS[g.level].name : ""} · ${Math.ceil(g.log.length / 2)} coups</span></span>
        <span class="pill${s ? " done" : ""}">${s ? `Précision ${s.acc} %` : "À analyser"}</span>
      </button>`; }).join("")}</div>` : `<p class="calm">Termine une partie pour la retrouver ici.</p>`}`;
  $("#back").onclick = playView;
  panel.querySelectorAll("[data-game]").forEach(b => b.onclick = () => analysisView(b.dataset.game));
}
