// ---------- Mon répertoire d'ouvertures ----------
// Tu choisis tes ouvertures avec les Blancs et avec les Noirs. L'entraîneur joue l'autre camp et tu dois
// répondre de mémoire. Parfois, l'adversaire sort de la théorie (un coup plausible choisi par le moteur) :
// il faut alors trouver soi-même un coup sain.
if (!save.rep) save.rep = { w: [], b: [], st: {}, dev: true };
const RP = { cur: null };
const repLine = l => l.steps[1].moves;
const repStat = id => save.rep.st[id] || (save.rep.st[id] = { runs: 0, streak: 0, last: 0 });
// Maîtrise : 3 lignes sans faute d'affilée
const repMastery = id => Math.min(3, repStat(id).streak);
function repHome() {
  clearTimers(); PL.gen++;
  RP.cur = null;
  resetBoard(START, { locked: true, list: true });
  panelEnter();
  const R = save.rep, sideList = c => L_OUV.filter(l => l.side === c);
  const item = l => {
    const on = R[l.side].includes(l.id), m = repMastery(l.id), st = repStat(l.id);
    return `<label class="rep-item${on ? " on" : ""}"><input type="checkbox" data-rep="${l.id}" ${on ? "checked" : ""}>
      <span><b>${l.t}</b><small>${l.d}${st.runs ? ` · ${st.runs} entraînement${st.runs > 1 ? "s" : ""}` : ""}</small></span>
      <span class="rep-m" title="${m === 3 ? "Maîtrisée" : `${m}/3 lignes sans faute d'affilée`}">${[0, 1, 2].map(k => `<i class="${k < m ? "on" : ""}"></i>`).join("")}</span></label>`;
  };
  const n = R.w.length + R.b.length;
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><button class="btn" id="back">${ICON.back}Exercices</button><span class="pill">${n} ouverture${n > 1 ? "s" : ""} choisie${n > 1 ? "s" : ""}</span></div>
    <p class="eyebrow">Ouvertures</p><h2>Mon répertoire</h2>
    <p class="lead">Coche les ouvertures que tu veux jouer. L'entraîneur joue l'autre camp, et tu réponds de mémoire. Trois lignes sans faute d'affilée, et l'ouverture est maîtrisée.</p>
    <div class="row">
      <button class="btn primary" data-go="w" ${R.w.length ? "" : "disabled"}>${pieceEl("K")}Avec les Blancs</button>
      <button class="btn primary" data-go="b" ${R.b.length ? "" : "disabled"}>${pieceEl("k")}Avec les Noirs</button>
      <button class="btn" data-go="all" ${n ? "" : "disabled"}>Tout mélanger</button>
    </div>
    <label class="switch"><input type="checkbox" id="rep-dev" ${R.dev ? "checked" : ""}> L'adversaire sort parfois de la théorie</label>
    <p class="group-title">Avec les Blancs</p><div class="rep-list">${sideList("w").map(item).join("")}</div>
    <p class="group-title">Avec les Noirs</p><div class="rep-list">${sideList("b").map(item).join("")}</div>`;
  $("#back").onclick = puzzleList;
  panel.querySelectorAll("[data-rep]").forEach(c => c.onchange = () => {
    const l = L_OUV.find(x => x.id === c.dataset.rep), arr = R[l.side];
    if (c.checked && !arr.includes(l.id)) arr.push(l.id);
    if (!c.checked) R[l.side] = arr.filter(x => x !== l.id);
    persist(); repHome();
  });
  $("#rep-dev").onchange = e => { R.dev = e.target.checked; persist(); };
  panel.querySelectorAll("[data-go]").forEach(b => b.onclick = () => repNext(b.dataset.go));
}
// Choix de la ligne : d'abord les moins maîtrisées, puis les moins récemment travaillées
function repPick(which) {
  const R = save.rep, ids = which === "all" ? R.w.concat(R.b) : R[which];
  if (!ids.length) return null;
  const scored = ids.map(id => ({ id, k: repMastery(id) * 10 + Math.random() * 6 - (Date.now() - repStat(id).last) / 864e5 })).sort((a, b) => a.k - b.k);
  const pick = RP.lastId && scored.length > 1 && scored[0].id === RP.lastId ? scored[1] : scored[0];
  return L_OUV.find(l => l.id === pick.id);
}
function repNext(which) {
  const l = repPick(which);
  if (!l) return repHome();
  RP.which = which; RP.lastId = l.id;
  clearTimers(); PL.gen++;
  const line = repLine(l);
  // Sortie de théorie : une fois par ligne, à un coup adverse tiré au hasard (pas le premier)
  const oppPlies = line.map((_, i) => i).filter(i => (i % 2 === 0 ? "w" : "b") !== l.side && i >= 1);
  const devAt = save.rep.dev && Math.random() < 0.4 && oppPlies.length > 1 ? oppPlies[1 + ((Math.random() * (oppPlies.length - 1)) | 0)] : -1;
  RP.cur = { l, line, ply: 0, errors: 0, log: [], devAt, dev: null, ana: null, done: false, fb: null, gen: 0 };
  panelEnter();
  resetBoard(START, { flip: l.side === "b", locked: true, canMove: sq => colorOf(B.game.b[sq]) === l.side, onMove: repMove, captured: true });
  repPanel();
  if (l.side === "b") later(repAuto, 500); else B.locked = false;
}
function repPush(m) { RP.cur.log.push({ u: uci(m), san: B.game.san(m) }); }
// Coup de l'entraîneur : la théorie, ou un écart plausible
function repAuto() {
  const r = RP.cur, g = B.game;
  if (!r || r.done) return;
  if (r.ply === r.devAt) {
    B.locked = true; r.fb = { c: "info", t: `<i class="spin"></i> L'adversaire réfléchit...` }; repPanel();
    const gen = ++r.gen;
    Engine.run({ type: "analyse", moves: r.log.map(e => e.u), time: 700 }).then(a => {
      if (RP.cur !== r || gen !== r.gen) return;
      const book = r.line[r.ply];
      const alts = a ? a.moves.filter(x => x.u !== book && x.bound >= 0 && x.score >= a.bestScore - 60).sort((x, y) => y.score - x.score).slice(0, 3) : [];
      if (!alts.length) { r.devAt = -1; return repAuto(); }
      const u = alts[(Math.random() * alts.length) | 0].u, m = g.find(u);
      const bm = g.find(book);
      r.dev = { u, book: bm ? frSan(g.san(bm)) : book };
      repPush(m); commit(m, true); r.ply++;
      r.fb = { c: "warn", t: `Hors théorie ! Il joue <b>${frSan(r.log[r.log.length - 1].san)}</b> au lieu de ${r.dev.book}.`, s: "Pas de ligne à réciter ici : trouve un coup sain, en appliquant les idées de l'ouverture." };
      repAnalyseMine();
    });
    return;
  }
  const m = g.find(r.line[r.ply]);
  if (!m) return repFinish();
  repPush(m); commit(m, true); r.ply++;
  if (r.ply >= r.line.length) return repFinish();
  B.locked = false; repPanel();
}
// Après un écart : on analyse la position pour juger le coup du joueur
function repAnalyseMine() {
  const r = RP.cur, gen = ++r.gen;
  B.locked = true; repPanel();
  Engine.run({ type: "analyse", moves: r.log.map(e => e.u), time: 1200 }).then(a => {
    if (RP.cur !== r || gen !== r.gen) return;
    r.ana = a; B.locked = false; repPanel();
  });
}
function repMove(m) {
  const r = RP.cur, g = B.game, u = uci(m);
  g.undo();
  const raw = g.san(m), san = frSan(raw);
  g.make(m);
  const bad = (fb, arrowU, wait) => {
    flashSq(m.to, "flash-bad"); sound("error");
    r.errors++; B.locked = true; r.fb = fb; repPanel();
    later(() => { g.undo(); B.last = null; const x = arrowU && g.find(arrowU); if (x) B.arrows = [[x.from, x.to]]; B.locked = false; render(); }, wait || 900);
  };
  if (r.dev) {
    // Après une erreur hors théorie : il faut jouer le coup montré
    if (r.dev.forced) {
      if (u !== r.dev.forced) return bad({ c: "bad", t: `${ICON.flag} Joue le coup de la flèche pour terminer.` }, r.dev.forced, 600);
      r.log.push({ u, san: raw }); flashSq(m.to, "flash-ok");
      r.fb = { c: "warn", t: `C'est ça : <b>${san}</b>.`, s: "Retiens l'idée pour la prochaine fois." };
      return repFinish();
    }
    const a = r.ana, x = a && a.moves.find(y => y.u === u), loss = !x || x.bound < 0 ? 999 : a.bestScore - x.score;
    g.undo();
    const best = a && g.find(a.best), bestSan = best ? frSan(g.san(best)) : "";
    g.make(m);
    if (loss <= 70) {
      r.log.push({ u, san: raw }); flashSq(m.to, "flash-ok");
      r.fb = { c: "ok", t: `${ICON.check} Bien réagi : <b>${san}</b> est un coup sain.`, s: u === a.best ? "C'est aussi le choix du moteur." : `Le moteur préférait ${bestSan}, mais ton coup tient la route.` };
      return repFinish();
    }
    r.dev.forced = a.best;
    return bad({ c: "bad", t: `${ICON.flag} ${san} n'est pas bon ici.`, s: `${whyWrong(g, m) || ""}Mieux : <b>${bestSan}</b>. Joue-le pour terminer.` }, a.best);
  }
  const exp = r.line[r.ply];
  if (u !== exp && !(exp.length === 4 && u.startsWith(exp))) {
    g.undo(); const x = g.find(exp), em = x ? frSan(g.san(x)) : exp; g.make(m);
    return bad({ c: "bad", t: `${ICON.flag} Ce n'est pas la ligne.`, s: `Dans ton répertoire, on joue ici <b>${em}</b>. La flèche le montre : joue-le pour continuer.` }, exp);
  }
  flashSq(m.to, "flash-ok"); B.arrows = [];
  r.log.push({ u, san: raw });
  r.ply++;
  const note = r.l.steps[1].notes && r.l.steps[1].notes[r.ply - 1];
  r.fb = { c: "ok", t: `${ICON.check} ${san}`, s: note || "" };
  if (r.ply >= r.line.length) return repFinish();
  B.locked = true; repPanel();
  later(repAuto, 450);
}
function repFinish() {
  const r = RP.cur, st = repStat(r.l.id);
  r.done = true; B.locked = true;
  st.runs++; st.last = Date.now(); st.streak = r.errors ? 0 : st.streak + 1;
  if (r.errors) revAdd("ouv:" + r.l.id, { k: "ouv", id: r.l.id });
  dayInc("les");
  persist(); updateXp();
  sound(r.errors ? "ok" : "win");
  if (!r.errors && st.streak === 3) celebrate();
  repPanel();
}
function repPanel() {
  const r = RP.cur;
  if (!r) return;
  const l = r.l, st = repStat(l.id), myTurn = !r.done && B.game.turn === l.side;
  const head = r.done
    ? `<div class="pz-head ${r.errors ? "fail" : "win"}"><span class="pz-ico">${r.errors ? ICON.retry : ICON.check}</span><div><b>${r.errors ? `Ligne terminée, ${r.errors} erreur${r.errors > 1 ? "s" : ""}` : st.streak >= 3 ? "Ouverture maîtrisée !" : "Ligne sans faute !"}</b><span>${r.errors ? "Elle reviendra dans ta révision. Recommence pour la fixer." : `${Math.min(3, st.streak)}/3 lignes sans faute d'affilée.`}</span></div></div>`
    : `<div class="pz-head"><span class="pz-side ${l.side}">${pieceEl(l.side === "w" ? "K" : "k")}</span><div><b>${myTurn ? "À toi de jouer" : "L'adversaire joue..."}</b><span>${r.dev ? "Hors théorie : trouve un coup sain." : `Joue ta ligne de mémoire, avec les ${l.side === "w" ? "Blancs" : "Noirs"}.`}</span></div></div>`;
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><button class="btn" id="rep-back">${ICON.back}Mon répertoire</button><span class="pill">${RP.which === "all" ? "Mélange" : RP.which === "w" ? "Avec les Blancs" : "Avec les Noirs"}</span></div>
    <p class="eyebrow">Répertoire</p><h2>${l.t}</h2>
    ${head}
    ${r.fb ? `<div class="fb ${r.fb.c}"><span>${r.fb.t}${r.fb.s ? `<small>${r.fb.s}</small>` : ""}</span></div>` : ""}
    ${r.done ? `<div class="row"><button class="btn primary big" id="rep-next">Ligne suivante${ICON.arrow}</button><button class="btn" id="rep-play">${ICON.board}Continuer la partie</button></div>
      <p class="calm">« Continuer la partie » te laisse jouer la suite contre l'ordinateur, avec le coach.</p>`
      : `<div class="row"><button class="btn" id="rep-hint" ${myTurn ? "" : "disabled"}>${ICON.bulb}Montrer le coup</button></div>`}
    <div class="moves">${moveRows(null, r.log.length, j => `<span${j === r.log.length - 1 ? ' class="cur"' : ""}>${frSan(r.log[j].san)}</span>`).join("")}</div>`;
  $("#rep-back").onclick = repHome;
  const nx = $("#rep-next"); if (nx) { nx.onclick = () => repNext(RP.which); nx.focus({ preventScroll: true }); }
  const pl = $("#rep-play"); if (pl) pl.onclick = () => playFrom(START, l.side, r.log.map(e => ({ u: e.u, san: e.san })));
  const h = $("#rep-hint"); if (h) h.onclick = () => {
    const u = r.dev ? (r.dev.forced || (r.ana && r.ana.best)) : r.line[r.ply], m = u && B.game.find(u);
    if (!m) return;
    r.errors++; B.arrows = [[m.from, m.to]]; render();
    r.fb = { c: "info", t: `${ICON.bulb} La flèche montre le coup.`, s: "Compté comme une erreur : la ligne reviendra en révision." }; repPanel();
  };
}
