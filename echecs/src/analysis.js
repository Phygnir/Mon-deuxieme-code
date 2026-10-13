// ---------- Analyse de partie : courbe, précision, moments clés ----------
// Les parties terminées sont gardées (save.games, les 12 dernières). Le moteur évalue chaque position,
// puis on classe les coups selon la perte de chances de gain, comme Lichess.
if (!save.games) save.games = [];
const AN = { g: null, i: 0, run: 0, busy: false, sel: null };
Object.assign(ICON, {
  first: svgI('<path d="M18 6 12 12l6 6M7 6v12"/>'),
  prev: svgI('<path d="M15 6l-6 6 6 6"/>'),
  next: svgI('<path d="M9 6l6 6-6 6"/>'),
  last: svgI('<path d="M6 6l6 6-6 6M17 6v12"/>')
});
// Probabilité de gain (0-100) d'après l'évaluation en centipions, formule de Lichess
const winPct = cp => (Math.abs(cp) > Engine_MATE - 200 ? (cp > 0 ? 100 : 0) : 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1000, Math.min(1000, cp)))) - 1));
const anWp = (game, k, side) => Math.round(winPct((side === "w" ? 1 : -1) * game.an.ev[k]));
const moveAcc = drop => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
const gameRes = g => ({ w: "Victoire", d: "Nulle", l: "Défaite" }[g.res] || "Partie");
const gameOpp = g => (g.src === "pgn" ? (g.color === "w" ? g.black : g.white) || "Adversaire" : "Ordinateur");
const gameSub = g => (g.src === "pgn" ? `contre ${gameOpp(g)}` : LEVELS[g.level] ? LEVELS[g.level].name : "");
const AN_Q = [[30, "q-bad", "gaffe"], [20, "q-err", "erreur"], [10, "q-dub", "imprécision"]];
function archiveGame(res) {
  if (PL.log.length < 6) return;
  const g = { id: PL.gid || Date.now().toString(36), date: Date.now(), color: PL.color, level: PL.level, res, log: PL.log.map(e => ({ u: e.u, san: e.san })), an: null };
  save.games = [g].concat(save.games.filter(x => x.id !== g.id)).slice(0, 20);
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
    const side = (k % 2 === 1) === (!game.fen || game.fen.split(" ")[1] === "w") ? "b" : "w", s = side === "w" ? 1 : -1;
    const before = winPct(s * an.ev[k]), after = winPct(s * an.ev[k + 1]);
    // Un coup de théorie qui perd beaucoup (piège d'ouverture) reste une erreur
    const drop = Math.max(0, before - after), book = drop < 10 && !game.fen && anBook(game.log, k);
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
  const g = new Chess(game.fen || START);
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
      const r = await Engine.run({ type: "search", fen: game.fen || START, moves: game.log.slice(0, k).map(e => e.u), time: 450 });
      if (run !== AN.run) return;
      const sc = r && r.move ? r.score : 0;
      an.ev[k] = g.turn === "w" ? sc : -sc; an.best[k] = r && r.move; an.pv[k] = (r && r.pv || []).slice(0, 6);
    }
    if (run !== AN.run) return;
    if (k % 8 === 0) persist();
    if (AN.g === game && modeNow === "analyse") anPanel(true);
  }
  AN.busy = false;
  an.done = true;
  persist();
  // Les erreurs de la partie partent en révision
  if (typeof revAdd === "function") for (const m of anMoments(game, anMoves(game)).filter(m => m.drop >= 15).slice(0, 3)) revAdd(`mo:${game.id}:${m.k}`, anMomentItem(game, m));
  if (AN.g === game && modeNow === "analyse") anPanel(true);
}
function anMomentItem(game, m) {
  const g = gameAt(game, m.k);
  return { k: "moment", fen: g.fen(), best: game.an.best[m.k], played: game.log[m.k].u, ev: game.an.ev[m.k], side: m.side, date: game.date, move: Math.floor(m.k / 2) + 1 };
}
function analysisView(id) {
  const game = save.games.find(x => x.id === id);
  if (!game) return analyseHome();
  clearTimers(); PL.gen++;
  AN.g = game; AN.i = game.log.length; AN.sel = null;
  resetBoard(game.fen || START, { flip: game.color === "b", locked: true, captured: true, names: game.color === "w" ? { w: "Toi", b: gameOpp(game) } : { w: gameOpp(game), b: "Toi" } });
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
  if (me && prev && (prev.q === "q-err" || prev.q === "q-bad")) out.lines.unshift(`${game.src === "pgn" ? "Ton adversaire" : "L'ordinateur"} venait de faire une erreur : il y avait une occasion à saisir.`);
  return out;
}
function anPanel(progressOnly) {
  const game = AN.g;
  if (!game || modeNow !== "analyse") return;
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
  const me = game.color, opp = me === "w" ? "b" : "w", resTxt = gameRes(game);
  const cur = moves.find(m => m.k === AN.i - 1), com = cur ? anComment(game, cur) : null;
  const rows = [];
  for (let i = 0; i < N; i += 2) {
    const cell = j => { if (!game.log[j]) return "<span></span>"; const m = moves.find(x => x.k === j); return `<span data-go="${j + 1}"${j === AN.i - 1 ? ' class="cur"' : ""}${m && m.q && m.q !== "q-best" ? ` data-q="${m.q}"` : ""}>${frSan(game.log[j].san)}</span>`; };
    rows.push(`<span class="n">${i / 2 + 1}.</span>${cell(i)}${cell(i + 1)}`);
  }
  const col = (c, name) => `<div class="an-side"><span class="an-who">${pieceEl(c === "w" ? "K" : "k")}${name}</span><b>${sum[c].acc != null && done ? sum[c].acc + " %" : "…"}</b><span>précision</span>
    <ul><li><i class="q-dub"></i>${sum[c].dub} imprécision${sum[c].dub > 1 ? "s" : ""}</li><li><i class="q-err"></i>${sum[c].err} erreur${sum[c].err > 1 ? "s" : ""}</li><li><i class="q-bad"></i>${sum[c].bad} gaffe${sum[c].bad > 1 ? "s" : ""}</li></ul></div>`;
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><button class="btn" id="an-back">${ICON.back}Mes parties</button><span class="pill">${resTxt} · ${gameSub(game)} · ${Math.ceil(N / 2)} coups</span></div>
    <p class="eyebrow">Analyse de la partie${game.url ? ` · <a href="${game.url}" target="_blank" rel="noopener">voir sur ${SITES[game.site] ? SITES[game.site].name : "le site"}</a>` : ""}</p>
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
    ${done ? `<div class="an-sum">${col(me, "Toi")}${col(opp, gameOpp(game))}</div>` : ""}
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
  $("#an-back").onclick = analyseHome;
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
  if (!AN.g || modeNow !== "analyse" || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k = { ArrowLeft: "prev", ArrowRight: "next", Home: "first", End: "last" }[e.key];
  if (k) { e.preventDefault(); anNav(k); }
});
// ---------- Onglet Analyse : tes parties, import par pseudo, bilan ----------
Object.assign(ICON, { upload: svgI('<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'), search: svgI('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'), link: svgI('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>') });
const fmtDay = t => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const SITES = { lichess: { name: "Lichess", home: n => `https://lichess.org/@/${encodeURIComponent(n)}/all` }, chesscom: { name: "Chess.com", home: n => `https://www.chess.com/games/archive/${encodeURIComponent(n)}` } };
if (!save.acct) save.acct = { site: "lichess", name: "" };
const FETCH = { list: null, err: null, busy: false, key: "" };
const gamesList = () => setMode("analyse");
function openAnalysis(id) { if (modeNow !== "analyse") setMode("analyse"); analysisView(id); }
// Bilan sur les parties analysées : précision moyenne et erreurs par phase de jeu
function anStats() {
  const gs = save.games.filter(g => g.an && g.an.done).slice().reverse();
  if (!gs.length) return null;
  const ph = { o: [0, 0], m: [0, 0], f: [0, 0] }, accs = [];
  for (const g of gs) {
    const ms = anMoves(g).filter(m => m.side === g.color);
    if (ms.length) accs.push(Math.round(ms.reduce((a, m) => a + m.acc, 0) / ms.length));
    for (const m of ms) {
      const pos = gameAt(g, m.k); let mat = 0;
      for (const p of pos.b) if (p) mat += { n: 3, b: 3, r: 5, q: 9 }[p.toLowerCase()] || 0;
      const k = m.k < 24 && mat > 40 ? "o" : mat <= 26 ? "f" : "m";
      ph[k][0]++; if (m.q === "q-err" || m.q === "q-bad") ph[k][1]++;
    }
  }
  return { n: gs.length, acc: Math.round(accs.reduce((a, b) => a + b, 0) / Math.max(1, accs.length)), accs, ph };
}
function analyseHome() {
  clearTimers(); PL.gen++; AN.run++; AN.g = null;
  resetBoard(START, { locked: true, list: true });
  $("#evalbar").hidden = true; $("#board-col").classList.remove("with-eval");
  panelEnter();
  const st = anStats(), a = save.acct;
  const phase = st && [["o", "Ouverture"], ["m", "Milieu de partie"], ["f", "Finale"]].map(([k, t]) => { const [n, e] = st.ph[k]; return n ? { t, v: Math.round((e / n) * 100), e, n } : null; }).filter(Boolean);
  const worst = phase && phase.filter(x => x.v > 0).sort((x, y) => y.v - x.v)[0];
  panel.innerHTML = `
    <p class="eyebrow">Analyse</p><h2>Revois tes parties</h2>
    <p class="lead">Le moteur repère tes erreurs, montre ce qu'il fallait jouer et calcule ta précision. Tes erreurs reviennent ensuite dans ta révision.</p>
    <div class="imp-card">
      <div class="seg" role="group" aria-label="Site">${Object.entries(SITES).map(([k, x]) => `<button data-site="${k}" aria-pressed="${a.site === k}">${x.name}</button>`).join("")}</div>
      <form class="imp-row" id="acct-form"><input type="text" id="acct-name" class="select" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="Ton pseudo ${SITES[a.site].name}" value="${a.name.replace(/"/g, "&quot;")}" aria-label="Pseudo"><button class="btn primary" type="submit" id="acct-go">${ICON.search}Mes parties</button></form>
      <div id="acct-res">${fetchHTML()}</div>
      <button class="btn ghost-link" id="paste">${ICON.upload}Ou colle un PGN, ou choisis un fichier</button>
    </div>
    ${st ? `<p class="group-title">Ton bilan</p>
    <div class="stats-strip">
      <div class="stat"><b>${st.acc} %</b><span>Précision moyenne</span></div>
      <div class="stat"><b>${st.n}</b><span>Partie${st.n > 1 ? "s" : ""} analysée${st.n > 1 ? "s" : ""}</span></div>
      ${worst ? `<div class="stat"><b class="word">${worst.t}</b><span>Phase à travailler</span></div>` : ""}
    </div>
    ${st.accs.length > 1 ? `<div class="pz-rating"><div><span>Précision, partie après partie</span><b>${st.accs[st.accs.length - 1]} %</b></div>${sparkline(st.accs)}</div>` : ""}
    ${phase.length ? `<div class="bars">${phase.map(x => `<div class="bar-row" title="${x.e} erreurs ou gaffes sur ${x.n} coups"><span>${x.t}</span><div class="bar bad"><i style="width:${Math.max(2, Math.min(100, x.v * 4))}%"></i></div><b>${x.v} %</b><small>${x.e}/${x.n}</small></div>`).join("")}</div>
    <p class="calm">Part de tes coups qui sont des erreurs ou des gaffes, selon la phase de jeu.${worst && worst.v ? ` C'est en ${worst.t.toLowerCase()} que tu en fais le plus.` : ""}</p>` : ""}` : ""}
    <p class="group-title">Mes parties</p>
    ${save.games.length ? `<div class="list">${save.games.map(g => {
      const s = g.an && g.an.done ? anSummary(g, anMoves(g))[g.color] : null;
      return `<button class="item" data-game="${g.id}">
        <span class="num">${g.res === "w" ? ICON.trophy : g.res === "d" ? "½" : g.res === "l" ? ICON.flag : "?"}</span>
        <span><span class="ti">${gameRes(g)} avec les ${g.color === "w" ? "Blancs" : "Noirs"}</span><span class="de">${fmtDay(g.date)} · ${gameSub(g)}${g.site ? ` · ${SITES[g.site].name}` : ""} · ${Math.ceil(g.log.length / 2)} coups</span></span>
        <span class="pill${s ? " done" : ""}">${s ? `Précision ${s.acc} %` : "À analyser"}</span>
      </button>`; }).join("")}</div>` : `<p class="calm">Joue une partie dans l'onglet Jouer, ou importe une partie ci-dessus.</p>`}`;
  panel.querySelectorAll("[data-site]").forEach(b => b.onclick = () => { a.site = b.dataset.site; FETCH.list = null; FETCH.err = null; persist(); analyseHome(); });
  $("#acct-form").onsubmit = e => { e.preventDefault(); fetchGames(); };
  $("#paste").onclick = () => importView();
  bindFetch();
  panel.querySelectorAll("[data-game]").forEach(b => b.onclick = () => analysisView(b.dataset.game));
}
// --- Dernières parties d'un joueur, via les API publiques de Lichess et Chess.com ---
function fetchHTML() {
  if (FETCH.busy) return `<p class="calm"><i class="spin"></i> Recherche de tes parties...</p>`;
  if (FETCH.err && FETCH.err.steps) return stepsHTML(FETCH.err.site, FETCH.err.name);
  if (FETCH.err) return `<div class="fb ${FETCH.err.c || "bad"}"><span>${FETCH.err.t}${FETCH.err.s ? `<small>${FETCH.err.s}</small>` : ""}</span></div>`;
  if (!FETCH.list) return "";
  const note = FETCH.note ? `<p class="calm imp-note">${FETCH.note}</p>` : "";
  if (!FETCH.list.length) return `<p class="calm">Aucune partie classique trouvée récemment pour ce pseudo.</p>`;
  return `${note}<div class="list imp-list">${FETCH.list.map((x, i) => `
    <button class="item" data-fetch="${i}">
      <span class="num">${x.res === "w" ? ICON.trophy : x.res === "d" ? "½" : x.res === "l" ? ICON.flag : "?"}</span>
      <span><span class="ti">${gameRes(x)} contre ${x.opp}${x.oppElo ? ` (${x.oppElo})` : ""}</span><span class="de">${[fmtDay(x.date), x.speed, `avec les ${x.color === "w" ? "Blancs" : "Noirs"}`, x.opening].filter(Boolean).join(" · ")}</span></span>
      <span class="pill${save.games.some(g => g.id === x.id) ? " done" : ""}">${save.games.some(g => g.id === x.id) ? "Importée" : "Analyser"}</span>
    </button>`).join("")}</div>`;
}
function bindFetch() {
  panel.querySelectorAll("[data-fetch]").forEach(b => b.onclick = () => { const x = FETCH.list[+b.dataset.fetch]; if (x) importFetched(x); });
  const pl = $("#acct-paste"); if (pl) pl.onclick = () => importView();
  const af = $("#acct-file");
  if (af) af.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    f.text().then(t => { pgnToList(t, save.acct.name, "auto"); const r = $("#acct-res"); if (r) { r.innerHTML = fetchHTML(); bindFetch(); } });
  };
}
// La page publiée ne peut pas toujours appeler Lichess ou Chess.com : on fait télécharger le fichier PGN,
// que l'on relit ensuite ici
function dlLinks(site, name) {
  if (site === "lichess") return [[`https://lichess.org/api/games/user/${encodeURIComponent(name)}?max=30&clocks=false&evals=false&opening=true`, "Télécharger mes 30 dernières parties"]];
  const ln = encodeURIComponent(name.toLowerCase()), d = new Date(), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, p = m === 1 ? [y - 1, 12] : [y, m - 1];
  const u = (yy, mm) => `https://api.chess.com/pub/player/${ln}/games/${yy}/${String(mm).padStart(2, "0")}/pgn`;
  return [[u(y, m), "Parties de ce mois-ci"], [u(p[0], p[1]), "Parties du mois dernier"]];
}
function stepsHTML(site, name) {
  const S = SITES[site].name;
  return `<div class="dl-steps">
    <p class="dl-lead">Cette page ne peut pas se connecter directement à ${S}. Il suffit de deux étapes :</p>
    <ol>
      <li><span>Télécharge le fichier de tes parties, fourni par ${S}.</span><span class="row">${dlLinks(site, name).map(([href, t], i) => `<a class="btn${i ? "" : " primary"}" href="${href}" target="_blank" rel="noopener">${ICON.upload.replace("M12 15V3M7 8l5-5 5 5", "M12 3v12M7 10l5 5 5-5")}${t}</a>`).join("")}</span></li>
      <li><span>Choisis le fichier téléchargé (.pgn), puis la partie à analyser.</span><label class="btn primary file-btn">${ICON.upload}Choisir le fichier<input type="file" id="acct-file" accept=".pgn,.txt,application/x-chess-pgn,application/vnd.chess-pgn"></label></li>
    </ol>
    <p class="calm">Le fichier arrive dans tes téléchargements, aussi sur téléphone. Tu peux aussi <button class="linkish" id="acct-paste">coller le texte d'une partie</button>.</p>
  </div>`;
}
// Cadence d'après l'en-tête TimeControl (« 180+2 ») : même découpage que Lichess
function tcSpeed(tc) {
  if (!tc || tc === "?") return "";
  if (tc === "-" || tc.includes("/")) return "Par correspondance";
  const [b, i] = tc.split("+").map(Number), e = (b || 0) + 40 * (i || 0);
  return e < 30 ? "Ultrabullet" : e < 180 ? "Bullet" : e < 480 ? "Blitz" : e < 1500 ? "Rapide" : "Classique";
}
function pgnEntry(pg, name, side) {
  const t = pg.tags, ln = (name || "").toLowerCase();
  const color = side === "w" || side === "b" ? side : ln && (t.Black || "").toLowerCase() === ln ? "b" : "w";
  const r = pg.result, res = r === "1/2-1/2" ? "d" : r === "1-0" ? (color === "w" ? "w" : "l") : r === "0-1" ? (color === "b" ? "w" : "l") : "?";
  const d = (t.UTCDate || t.Date || "").match(/^(\d{4})\.(\d{2})\.(\d{2})$/), tm = (t.UTCTime || t.EndTime || t.StartTime || "").match(/^(\d{1,2}):(\d{2})/);
  const date = d ? Date.UTC(+d[1], +d[2] - 1, +d[3], tm ? +tm[1] : 12, tm ? +tm[2] : 0) : Date.now();
  const known = v => (v && v !== "?" ? v : null);
  const eco = (t.ECOUrl || "").match(/openings\/([^"?]+)/);
  const opening = t.Opening && t.Opening !== "?" ? t.Opening.split(":")[0] : eco ? decodeURIComponent(eco[1]).split("-").slice(0, 3).join(" ") : "";
  const link = [t.Link, t.Site].find(v => /^https?:\/\//.test(v || "")) || null;
  const site = /lichess\.org/.test(link || "") ? "lichess" : /chess\.com/.test(link || "") ? "chesscom" : null;
  return { site, url: link, parsed: pg, id: "p" + pzHash((pg.fen || "") + pg.moves.map(m => m.u).join("")), color, date, res, speed: tcSpeed(t.TimeControl),
    opening, opp: known(color === "w" ? t.Black : t.White) || "Adversaire", oppElo: known(color === "w" ? t.BlackElo : t.WhiteElo) };
}
// Toutes les parties d'un fichier, de la plus récente à la plus ancienne
function pgnToList(text, name, side) {
  let games;
  try { games = parsePgn(text); } catch (e) { FETCH.err = { t: `${ICON.flag} Ce fichier n'a pas pu être lu.`, s: e.message }; FETCH.list = null; return false; }
  const list = games.map(g => pgnEntry(g, name, side)).sort((a, b) => b.date - a.date).slice(0, 60);
  FETCH.err = null; FETCH.list = list;
  FETCH.note = `${games.length} partie${games.length > 1 ? "s" : ""} trouvée${games.length > 1 ? "s" : ""}${games.length > 60 ? " (les 60 plus récentes sont affichées)" : ""}. Choisis celle à analyser.`;
  return true;
}
const SPEED = { ultraBullet: "Ultrabullet", bullet: "Bullet", blitz: "Blitz", rapid: "Rapide", classical: "Classique", correspondence: "Par correspondance", daily: "Par correspondance" };
async function fetchGames() {
  const a = save.acct, name = $("#acct-name").value.trim();
  if (!name) { $("#acct-name").focus(); return; }
  a.name = name; persist();
  FETCH.busy = true; FETCH.err = null; FETCH.list = null; FETCH.note = null;
  const res = $("#acct-res"); res.innerHTML = fetchHTML();
  const run = FETCH.key = a.site + ":" + name + ":" + Date.now();
  let list = null, err = null;
  try { list = a.site === "lichess" ? await fetchLichess(name) : await fetchChesscom(name); }
  catch (e) {
    const site = SITES[a.site].name;
    err = e && e.code === 404 ? { t: `${ICON.flag} Aucun joueur « ${name} » sur ${site}.`, s: "Vérifie l'orthographe du pseudo." }
      : e && e.code === 429 ? { c: "warn", t: `${site} demande de patienter un peu.`, s: "Réessaie dans une minute." }
      : { steps: true, site: a.site, name };
  }
  if (FETCH.key !== run) return;
  FETCH.busy = false; FETCH.list = list; FETCH.err = err;
  const r2 = $("#acct-res"); if (r2 && modeNow === "analyse") { r2.innerHTML = fetchHTML(); bindFetch(); }
}
async function getJSON(url, accept) {
  const r = await fetch(url, { headers: { Accept: accept || "application/json" } });
  if (!r.ok) { const e = new Error("http " + r.status); e.code = r.status; throw e; }
  return accept === "application/x-ndjson" ? (await r.text()).split("\n").filter(l => l.trim()).map(l => JSON.parse(l)) : r.json();
}
async function fetchLichess(name) {
  const rows = await getJSON(`https://lichess.org/api/games/user/${encodeURIComponent(name)}?max=30&pgnInJson=true&opening=true&clocks=false&evals=false&literate=false`, "application/x-ndjson");
  const ln = name.toLowerCase();
  return rows.filter(g => g.variant === "standard" && g.pgn && g.moves).slice(0, 20).map(g => {
    const w = g.players.white, b = g.players.black, color = ((b.user && b.user.name) || "").toLowerCase() === ln ? "b" : "w";
    const opp = color === "w" ? b : w;
    return { site: "lichess", pgn: g.pgn, color, date: g.createdAt, speed: SPEED[g.speed] || g.speed, opening: g.opening && g.opening.name ? g.opening.name.split(":")[0] : "",
      opp: opp.user ? opp.user.name : opp.aiLevel ? `Stockfish niveau ${opp.aiLevel}` : "Anonyme", oppElo: opp.rating || null,
      res: !g.winner ? "d" : g.winner === (color === "w" ? "white" : "black") ? "w" : "l", url: `https://lichess.org/${g.id}`, id: null };
  }).map(withId);
}
async function fetchChesscom(name) {
  const ln = name.toLowerCase();
  const arch = await getJSON(`https://api.chess.com/pub/player/${encodeURIComponent(ln)}/games/archives`);
  const urls = (arch.archives || []).slice(-3).reverse(), games = [];
  for (const u of urls) {
    const m = await getJSON(u);
    games.push(...(m.games || []));
    if (games.length >= 20) break;
  }
  const DRAW = ["agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient"];
  return games.filter(g => g.rules === "chess" && g.pgn).sort((x, y) => y.end_time - x.end_time).slice(0, 20).map(g => {
    const color = (g.black.username || "").toLowerCase() === ln ? "b" : "w", me = color === "w" ? g.white : g.black, opp = color === "w" ? g.black : g.white;
    const op = (g.pgn.match(/\[ECOUrl "[^"]*\/openings\/([^"]+)"\]/) || [])[1];
    return { site: "chesscom", pgn: g.pgn, color, date: g.end_time * 1000, speed: SPEED[g.time_class] || g.time_class, opening: op ? decodeURIComponent(op).split("-").slice(0, 3).join(" ") : "",
      opp: opp.username, oppElo: opp.rating || null, res: me.result === "win" ? "w" : DRAW.includes(me.result) ? "d" : "l", url: g.url, id: null };
  }).map(withId);
}
// L'identifiant dépend des coups : une partie importée deux fois n'est gardée qu'une fois
function withId(x) {
  try { const pg = parsePgn(x.pgn)[0]; x.parsed = pg; x.id = "p" + pzHash((pg.fen || "") + pg.moves.map(m => m.u).join("")); } catch (e) { x.parsed = null; }
  return x;
}
function storeGames(added) {
  const keep = new Map(save.games.map(g => [g.id, g]));
  for (const g of added) if (keep.has(g.id)) g.an = keep.get(g.id).an;
  save.games = added.concat(save.games.filter(g => !added.some(a => a.id === g.id))).slice(0, 20);
  persist();
}
function importFetched(x) {
  if (!x.parsed) { FETCH.err = { t: `${ICON.flag} Cette partie n'a pas pu être lue.` }; $("#acct-res").innerHTML = fetchHTML(); return; }
  const t = x.parsed.tags;
  storeGames([{ id: x.id, date: x.date, color: x.color, level: null, res: x.res, src: "pgn", site: x.site, url: x.url, white: t.White && t.White !== "?" ? t.White : null, black: t.Black && t.Black !== "?" ? t.Black : null, fen: x.parsed.fen, log: x.parsed.moves, an: null }]);
  analysisView(x.id);
}
// --- Import par copier-coller (PGN) ---
const IMP = { text: "", side: "auto" };
function importView(err) {
  clearTimers(); PL.gen++; AN.run++; AN.g = null;
  resetBoard(START, { locked: true, list: true });
  $("#evalbar").hidden = true; $("#board-col").classList.remove("with-eval");
  panelEnter();
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><button class="btn" id="back">${ICON.back}Analyse</button><span class="pill">Format PGN</span></div>
    <p class="eyebrow">Tes parties</p><h2>Importe une partie</h2>
    <p class="lead">Analyse une partie jouée en ligne ou sur un vrai échiquier. Tes erreurs deviendront des exercices dans ta révision.</p>
    <ul class="goals">
      <li><b>Lichess</b> : sur la page de la partie, onglet «&nbsp;Partager et exporter&nbsp;», puis copie le PGN.</li>
      <li><b>Chess.com</b> : bouton «&nbsp;Partager&nbsp;», onglet «&nbsp;PGN&nbsp;», puis «&nbsp;Copier le PGN&nbsp;».</li>
      <li>Un fichier .pgn marche aussi, et la notation française (C, F, T, D, R) est acceptée.</li>
    </ul>
    ${err ? `<div class="fb bad">${ICON.flag} ${err}</div>` : ""}
    <label class="field"><span>Texte PGN</span><textarea id="pgn-text" class="textarea" rows="8" spellcheck="false" placeholder='[White "toi"]&#10;[Black "adversaire"]&#10;&#10;1. e4 e5 2. Nf3 Nc6 3. Bc4 ...'></textarea></label>
    <div class="settings">
      <div class="field"><span>Ou un fichier</span><input type="file" id="pgn-file" accept=".pgn,.txt,application/x-chess-pgn" class="file"></div>
      <div class="field"><span>Ton pseudo (facultatif)</span><input type="text" id="pgn-name" class="select" autocomplete="username" value="${(save.pgnName || save.acct.name || "").replace(/"/g, "&quot;")}" placeholder="Pour savoir quel camp tu jouais"></div>
    </div>
    <div class="field"><span>Tu jouais</span><div class="seg" role="group">${[["auto", "Selon le pseudo"], ["w", "Les Blancs"], ["b", "Les Noirs"]].map(([v, t]) => `<button data-side="${v}" aria-pressed="${IMP.side === v}">${t}</button>`).join("")}</div></div>
    <div class="row"><button class="btn primary big" id="pgn-go">${ICON.chart}Analyser</button></div>`;
  const ta = $("#pgn-text");
  ta.value = IMP.text;
  ta.oninput = () => { IMP.text = ta.value; };
  $("#pgn-file").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { IMP.text = ta.value = t; }); };
  panel.querySelectorAll("[data-side]").forEach(b => b.onclick = () => { IMP.side = b.dataset.side; panel.querySelectorAll("[data-side]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
  $("#back").onclick = analyseHome;
  $("#pgn-go").onclick = importGo;
}
function importGo() {
  const name = $("#pgn-name").value.trim();
  save.pgnName = name;
  if (name && !save.acct.name) save.acct.name = name;
  persist();
  let games;
  try { games = parsePgn(IMP.text); } catch (e) { return importView(e.message); }
  IMP.text = "";
  if (games.length > 1) {
    const list = games.map(g => pgnEntry(g, name, IMP.side)).sort((x, y) => y.date - x.date).slice(0, 60);
    Object.assign(FETCH, { err: null, list, note: `${games.length} parties trouvées. Choisis celle à analyser.` });
    return setMode("analyse");
  }
  importFetched(pgnEntry(games[0], name, IMP.side));
}
