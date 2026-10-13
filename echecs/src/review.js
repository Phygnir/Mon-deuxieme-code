// ---------- Révision espacée ----------
// Ce que tu as raté revient : le lendemain, puis après 3, 7, 14 et 30 jours si tu le réussis.
// Une erreur renvoie l'élément au début. Sources : problèmes ratés, exercices ratés, moments clés
// de tes parties et ouvertures apprises.
if (!save.rev) save.rev = {};
const REV_DAYS = [1, 3, 7, 14, 30];
const revToday = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
const REV_KIND = { pz: "Problème raté", ex: "Exercice raté", moment: "Moment de ta partie", ouv: "Ouverture" };
const REV_COUNT = { pz: ["problème raté", "problèmes ratés"], ex: ["exercice raté", "exercices ratés"], moment: ["moment de partie", "moments de partie"], ouv: ["ouverture", "ouvertures"] };
// keep : ne pas remettre à zéro un élément déjà suivi (ex. une leçon refaite)
function revAdd(key, item, keep) {
  const cur = save.rev[key];
  if (cur && keep) return;
  if (cur) { cur.box = 0; cur.due = revToday() + 1; delete cur.done; }
  else save.rev[key] = Object.assign({ box: 0, due: revToday() + 1, n: 0, ok: 0 }, item);
  persist();
}
function revResult(key, ok) {
  const it = save.rev[key];
  if (!it) return;
  it.n++;
  if (ok) {
    it.ok++; it.box++;
    if (it.box >= REV_DAYS.length) it.done = revToday();
    else it.due = revToday() + REV_DAYS[it.box];
  } else { it.box = 0; it.due = revToday() + 1; }
  dayInc("rev");
  persist(); updateXp();
}
const revActive = () => Object.entries(save.rev).filter(([, it]) => !it.done);
const revDue = () => revActive().filter(([, it]) => it.due <= revToday()).sort((a, b) => a[1].due - b[1].due || a[1].box - b[1].box);
// Carte affichée en tête des leçons et des exercices
function revCard(dueOnly) {
  const due = revDue(), act = revActive();
  if (!act.length || (dueOnly && !due.length)) return "";
  const done = Object.values(save.rev).filter(it => it.done).length;
  if (!due.length) {
    const next = Math.min(...act.map(([, it]) => it.due)), d = next - revToday(), n = act.filter(([, it]) => it.due === next).length;
    return `<div class="rev-card calm-card"><span class="rev-ico">${ICON.clock}</span><div><b>Révision à jour</b><span>Prochaine révision ${d <= 1 ? "demain" : `dans ${d} jours`} : ${n} élément${n > 1 ? "s" : ""}.${done ? ` ${done} acquis pour de bon.` : ""}</span></div></div>`;
  }
  const kinds = {};
  for (const [, it] of due) kinds[it.k] = (kinds[it.k] || 0) + 1;
  return `<div class="rev-card"><span class="rev-ico">${ICON.retry}</span><div><b>À réviser aujourd'hui : ${due.length}</b><span>${Object.entries(kinds).map(([k, n]) => `${n} ${REV_COUNT[k][n > 1 ? 1 : 0]}`).join(" · ")}</span></div><button class="btn primary" id="rev-go">${ICON.arrow}Réviser</button></div>`;
}
function revBindCard() { const b = $("#rev-go"); if (b) b.onclick = revStart; }
// --- Séance de révision ---
const RS = { queue: [], i: 0, ok: 0, cur: null, single: null };
function revStart() {
  RS.queue = revDue().slice(0, 12).map(([key]) => key);
  RS.i = 0; RS.ok = 0; RS.single = null; RS.back = modeNow;
  revNext();
}
// Rejouer un seul élément (depuis l'analyse), sans toucher au calendrier
function revRunSingle(item, back) { RS.single = { item, back }; RS.queue = []; RS.i = 0; revLoad(null, item); }
function revNext() {
  while (RS.i < RS.queue.length) {
    const key = RS.queue[RS.i], it = save.rev[key], task = it && revTask(it);
    if (task) return revLoad(key, it, task);
    delete save.rev[key]; persist(); RS.queue.splice(RS.i, 1);
  }
  revEnd();
}
// Transforme un élément en tâche jouable : position de départ, coups attendus, camp du joueur
function revTask(it) {
  if (it.k === "pz") { const p = PZ_BY_ID.get(it.id); return p && { before: p.before, last: p.last, fen: p.fen, line: p.line, side: p.side, title: p.lichess ? `Problème Lichess · ${p.r}` : `Problème · ${p.r}` }; }
  if (it.k === "ex") {
    const p = ALL_PUZZLES.find(x => x.id === it.id);
    if (!p || p.goal === "convert") return null;
    return { before: p.before, last: p.last, fen: p.fen, line: p.line, mate: p.goal === "mate" ? p.n : 0, side: p.fen.split(" ")[1], title: p.t };
  }
  if (it.k === "ouv") { const l = L_OUV.find(x => x.id === it.id); return l && { fen: START, line: l.steps[1].moves, side: l.side, opening: true, title: l.t }; }
  if (it.k === "moment") return { fen: it.fen, best: it.best, played: it.played, ev: it.ev, side: it.side, moment: true, title: `Coup ${it.move} · partie du ${new Date(it.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` };
  return null;
}
function revLoad(key, it, task) {
  task = task || revTask(it);
  clearTimers(); PL.gen++; AN.g = null;
  $("#evalbar").hidden = true; $("#board-col").classList.remove("with-eval");
  task.ply = 0;
  Object.assign(RS, { key, it, t: task, failed: false, done: false, fb: null });
  panelEnter();
  const opts = { flip: task.side === "b", locked: true, canMove: sq => colorOf(B.game.b[sq]) === task.side, onMove: revMove };
  if (task.before && task.last) {
    resetBoard(task.before, opts);
    later(() => { const m = B.game.find(task.last); if (m) commit(m, true); B.locked = false; revPanel(); }, 600);
  } else {
    resetBoard(task.fen, opts);
    if (task.opening && task.side === "b") later(revAuto, 500); else B.locked = false;
  }
  revPanel();
}
// L'ordinateur joue le coup suivant de la ligne (ou sa meilleure défense dans un problème de mat)
function revAuto() {
  const t = RS.t, g = B.game;
  let m = t.line && t.ply < t.line.length ? g.find(t.line[t.ply]) : null;
  if (!m && t.mate) { const r = think(g, { depth: 3, time: 500 }); m = r && r.move; }
  if (!m) return revFinish(true);
  commit(m, true); t.ply++;
  if (t.opening && t.ply >= t.line.length) return revFinish(!RS.failed);
  B.locked = false; revPanel();
}
function revMove(m) {
  const t = RS.t, g = B.game, u = uci(m);
  if (t.moment) return revMomentMove(m, u);
  let ok;
  if (t.mate) ok = g.status() === "mate" || forcedMate(g, t.mate - Math.ceil((t.ply + 1) / 2));
  else { const exp = t.line[t.ply]; ok = u === exp || (exp.length === 4 && u.startsWith(exp)) || (!t.opening && g.status() === "mate"); }
  if (!ok) {
    flashSq(m.to, "flash-bad"); sound("error");
    RS.failed = true; B.locked = true;
    const exp = t.line && t.line[t.ply];
    RS.fb = { c: "bad", t: `${ICON.flag} ${t.opening ? "Ce n'est pas le coup de la ligne." : "Ce n'est pas le bon coup."}`, s: (whyWrong(g, m) || "") + (exp ? " La flèche montre le bon coup : joue-le pour continuer." : " Essaie encore.") };
    revPanel();
    later(() => {
      g.undo(); B.last = null;
      if (exp) { const em = g.find(exp); if (em) B.arrows = [[em.from, em.to]]; }
      B.locked = false; render();
    }, 800);
    return;
  }
  flashSq(m.to, "flash-ok"); B.arrows = [];
  t.ply++;
  if (g.status() === "mate" || (!t.mate && t.ply >= t.line.length)) return revFinish(!RS.failed);
  RS.fb = { c: "ok", t: `${ICON.check} ${t.opening ? "C'est ça." : "Bien vu ! Continue..."}` };
  B.locked = true; revPanel();
  later(revAuto, 450);
}
// Moment de partie : tout coup presque aussi bon que celui du moteur est accepté
function revMomentMove(m, u) {
  const t = RS.t, g = B.game;
  B.locked = true;
  const judge = ok => {
    if (ok) { flashSq(m.to, "flash-ok"); return revFinish(!RS.failed, u === t.best ? "C'est le coup du moteur." : "Aussi bon que le coup du moteur."); }
    flashSq(m.to, "flash-bad"); sound("error");
    RS.failed = true;
    const w = whyWrong(g, m);
    RS.fb = { c: "bad", t: `${ICON.flag} ${u === t.played ? "C'est le coup joué dans la partie, et il coûtait cher." : "Ce coup ne suffit pas."}`, s: (w || "") + " Cherche encore, ou regarde la solution." };
    revPanel();
    later(() => { g.undo(); B.last = null; B.locked = false; render(); }, 900);
  };
  if (u === t.best || g.status() === "mate") return judge(true);
  RS.fb = { c: "info", t: `<i class="spin"></i> Le coach vérifie ton coup...` }; revPanel();
  const gen = RS.gen = (RS.gen || 0) + 1;
  Engine.run({ type: "search", fen: g.fen(), time: 700 }).then(r => {
    if (gen !== RS.gen || RS.t !== t) return;
    const after = r && r.move ? -r.score : g.status() === "mate" ? Engine_MATE : 0;
    const best = Math.max(t.ev * (t.side === "w" ? 1 : -1), after);
    judge(winPct(best) - winPct(after) < 6);
  });
}
function revShow() {
  const t = RS.t, g = B.game;
  RS.failed = true;
  const u = t.moment ? t.best : t.line ? t.line[t.ply] : null;
  let m = u ? g.find(u) : null;
  if (!m && t.mate) m = mateIn(g, t.mate - Math.floor(t.ply / 2));
  if (m) B.arrows = [[m.from, m.to]];
  RS.fb = { c: "info", t: `${ICON.bulb} La flèche montre le coup. Joue-le pour continuer.` };
  render(); revPanel();
}
function revFinish(ok, extra) {
  RS.done = true; B.locked = true;
  if (RS.key) { revResult(RS.key, ok); if (ok) RS.ok++; }
  sound(ok ? "ok" : "end");
  const it = RS.key && save.rev[RS.key];
  const when = !it ? "" : it.done ? " Acquis pour de bon : il ne reviendra plus." : ` Prochaine révision ${REV_DAYS[it.box] === 1 ? "demain" : `dans ${REV_DAYS[it.box]} jours`}.`;
  RS.fb = ok ? { c: "ok", t: `${ICON.check} Réussi !${extra ? " " + extra : ""}`, s: when.trim() } : { c: "warn", t: "Terminé, avec une erreur.", s: (RS.key ? "Il reviendra demain." : "") };
  revPanel();
}
function revPanel() {
  const t = RS.t, it = RS.it;
  if (!t) return;
  const total = RS.single ? 1 : RS.queue.length, idx = RS.single ? 1 : RS.i + 1;
  const myTurn = !RS.done && B.game.turn === t.side;
  const goal = t.opening ? `Rejoue de mémoire la ligne avec les ${t.side === "w" ? "Blancs" : "Noirs"}.` : t.moment ? `Tu jouais les ${t.side === "w" ? "Blancs" : "Noirs"}. Trouve mieux que dans la partie.` : t.mate ? `Les ${t.side === "w" ? "Blancs" : "Noirs"} jouent et font mat en ${t.mate}.` : `Trouve le meilleur coup pour les ${t.side === "w" ? "Blancs" : "Noirs"}.`;
  const box = it && it.box != null && RS.key ? `<span class="lvl" aria-label="Étape ${it.box + 1} sur ${REV_DAYS.length}">${REV_DAYS.map((_, k) => `<i class="${k < it.box ? "on" : ""}"></i>`).join("")}</span>` : "";
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><button class="btn" id="rev-stop">${ICON.back}${RS.single ? "Retour à l'analyse" : "Arrêter"}</button><span class="pill">${RS.single ? "Rejouer" : `Révision · ${idx}/${total}`}</span></div>
    <p class="eyebrow">${REV_KIND[it ? it.k : "moment"]}${box}</p>
    <h2>${t.title}</h2>
    <div class="pz-head"><span class="pz-side ${t.side}">${pieceEl(t.side === "w" ? "K" : "k")}</span><div><b>${RS.done ? "Terminé" : myTurn ? "À toi de jouer !" : "Le coup adverse..."}</b><span>${goal}</span></div></div>
    ${RS.fb ? `<div class="fb ${RS.fb.c}">${RS.fb.t}${RS.fb.s ? `<small>${RS.fb.s}</small>` : ""}</div>` : ""}
    <div class="row">${RS.done
      ? (RS.single ? `<button class="btn primary big" id="rev-back">${ICON.back}Retour à l'analyse</button><button class="btn" id="rev-again">${ICON.retry}Recommencer</button>` : `<button class="btn primary big" id="rev-next">${RS.i + 1 < RS.queue.length ? "Suivant" : "Terminer"}${ICON.arrow}</button>`)
      : `<button class="btn" id="rev-sol">${ICON.bulb}Voir la solution</button>`}</div>
    ${RS.single ? "" : `<div class="timer rev-bar"><i style="width:${Math.round(((RS.i + (RS.done ? 1 : 0)) / Math.max(1, total)) * 100)}%"></i></div>`}`;
  $("#rev-stop").onclick = () => (RS.single ? RS.single.back() : revEnd(true));
  const nx = $("#rev-next"); if (nx) { nx.onclick = () => { RS.i++; revNext(); }; nx.focus({ preventScroll: true }); }
  const bk = $("#rev-back"); if (bk) { bk.onclick = RS.single.back; bk.focus({ preventScroll: true }); }
  const ag = $("#rev-again"); if (ag) ag.onclick = () => revRunSingle(RS.single.item, RS.single.back);
  const so = $("#rev-sol"); if (so) so.onclick = revShow;
}
function revEnd(stopped) {
  clearTimers();
  const n = RS.single ? 0 : Math.min(RS.queue.length, RS.i + (RS.done ? 1 : 0));
  RS.t = null;
  resetBoard(START, { locked: true, list: true });
  panelEnter();
  const left = revDue().length, all = n && RS.ok === n;
  panel.innerHTML = `
    <p class="eyebrow">Révision</p>
    <div class="pz-head ${all ? "win" : ""}"><span class="pz-ico">${all ? ICON.trophy : ICON.check}</span><div><b>${stopped && !n ? "Révision interrompue" : "Révision terminée"}</b><span>${n ? `${RS.ok} réussi${RS.ok > 1 ? "s" : ""} sur ${n}.` : "Reviens quand tu veux."}</span></div></div>
    ${revCard()}
    <p class="lead">Chaque élément réussi revient de plus en plus tard : demain, puis dans 3, 7, 14 et 30 jours. Au bout de cinq réussites, il est acquis.</p>
    <div class="row"><button class="btn primary" id="rev-home">${ICON.arrow}Continuer</button></div>`;
  if (all && n >= 3) celebrate();
  revBindCard();
  $("#rev-home").onclick = () => setMode(RS.back || "lecons");
  if (!left && n) sound("win");
}
