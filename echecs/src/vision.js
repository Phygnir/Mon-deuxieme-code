// ---------- Vision : voir l'échiquier sans le regarder ----------
// Trois entraînements chronométrés : coordonnées (dans app.js), couleur des cases, cases attaquées.
if (!save.visBest) save.visBest = { color: 0, attack: 0 };
const VIS_MODES = [["coord", "Coordonnées"], ["color", "Couleur des cases"], ["attack", "Cases attaquées"]];
const VS = { running: false, score: 0, miss: 0, end: 0, iv: null, target: null, piece: null, sq: -1, sel: new Set(), dur: 30000, lock: false };
const visSeg = () => `<div class="seg vis-modes" role="group" aria-label="Entraînement">${VIS_MODES.map(([k, t]) => `<button data-vm="${k}" aria-pressed="${(C.vm || "coord") === k}">${t}</button>`).join("")}</div>`;
function visBindSeg() {
  panel.querySelectorAll("[data-vm]").forEach(b => b.onclick = () => { visStop(); C.vm = b.dataset.vm; coordView(); });
}
function visStop() { VS.running = false; if (VS.iv) { clearInterval(VS.iv); VS.iv = null; } $("#board-wrap").classList.remove("veil"); }
function visionView() {
  visStop();
  const m = C.vm;
  resetBoard(EMPTY, { flip: C.side === "b", coords: m === "attack", onSquare: m === "attack" ? visAttackClick : null, locked: m !== "attack" });
  // Couleur des cases : l'échiquier est voilé, il faut le voir de tête
  if (m === "color") $("#board-wrap").classList.add("veil");
  panelEnter();
  visPanel();
}
const sqColor = s => ((s >> 3) + (s & 7)) % 2 === 0 ? "light" : "dark";
function visPanel(done) {
  const m = C.vm, best = save.visBest[m];
  const intro = m === "color"
    ? `<h2>Claire ou foncée ?</h2><p class="lead">Une case s'affiche : dis de quelle couleur elle est, sans regarder l'échiquier. Repère utile : a1 est foncée, et les cases d'une même diagonale ont toutes la même couleur.</p>`
    : `<h2>Quelles cases attaque-t-elle ?</h2><p class="lead">Une pièce apparaît : clique toutes les cases qu'elle attaque, puis valide. C'est la base du calcul : voir d'un coup d'œil la portée de chaque pièce.</p>`;
  panel.innerHTML = `
    ${visSeg()}
    <p class="eyebrow">Vision · ${m === "color" ? "30" : "60"} secondes</p>
    ${intro}
    ${VS.running && m === "color" ? `<div class="target" id="vtarget">${VS.target}</div><div class="timer"><i id="vtimer" style="width:100%"></i></div>
      <div class="row vis-answer"><button class="btn big vis-light" data-ans="light">Claire</button><button class="btn big vis-dark" data-ans="dark">Foncée</button></div><p class="calm">Raccourcis : flèche gauche pour claire, flèche droite pour foncée.</p>` : ""}
    ${VS.running && m === "attack" ? `<div class="timer"><i id="vtimer" style="width:100%"></i></div>
      <p class="lead">${Ton(VS.piece.toLowerCase())} en <b>${sqName(VS.sq)}</b> : <span id="vcount">${VS.sel.size}</span> case${VS.sel.size > 1 ? "s" : ""} choisie${VS.sel.size > 1 ? "s" : ""}.</p>
      <div class="row"><button class="btn primary" id="vcheck">${ICON.check}Valider</button><button class="btn" id="vclear">Effacer</button></div>` : ""}
    <div class="scorebox"><div><b id="vscore">${VS.score}</b><span>Score</span></div><div><b id="vmiss">${VS.miss}</b><span>Erreurs</span></div><div><b>${best}</b><span>Record</span></div></div>
    ${done ? `<div class="fb ${done.c}"><span>${done.t}</span></div>` : ""}
    ${VS.running ? "" : `<div class="settings"><div class="field"><span>Vu depuis</span><div class="seg" role="group"><button aria-pressed="${C.side === "w"}" data-side="w">Les Blancs</button><button aria-pressed="${C.side === "b"}" data-side="b">Les Noirs</button></div></div></div>
      <div class="row"><button class="btn primary" id="vstart">${done ? "Rejouer" : "Démarrer"}</button></div>`}`;
  visBindSeg();
  panel.querySelectorAll("[data-side]").forEach(b => b.onclick = () => { C.side = b.dataset.side; B.flip = C.side === "b"; render(); visPanel(); });
  panel.querySelectorAll("[data-ans]").forEach(b => b.onclick = () => visAnswer(b.dataset.ans));
  const st = $("#vstart"); if (st) st.onclick = visStart;
  const ck = $("#vcheck"); if (ck) ck.onclick = visAttackCheck;
  const cl = $("#vclear"); if (cl) cl.onclick = () => { VS.sel.clear(); B.marks = new Set(); render(); visPanel(); };
}
function visStart() {
  const m = C.vm;
  Object.assign(VS, { running: true, score: 0, miss: 0, dur: m === "color" ? 30000 : 60000, lock: false });
  VS.end = Date.now() + VS.dur;
  if (m === "color") visNewColor(); else visNewAttack();
  visPanel();
  VS.iv = setInterval(() => {
    const left = VS.end - Date.now(), bar = $("#vtimer");
    if (bar) bar.style.width = Math.max(0, (left / VS.dur) * 100) + "%";
    if (left <= 0) visEnd();
  }, 100);
}
function visEnd() {
  const m = C.vm;
  visStop();
  if (m === "color") $("#board-wrap").classList.add("veil");
  B.marks = new Set(); B.game = new Chess(EMPTY); render();
  const rec = VS.score > save.visBest[m];
  if (rec) { save.visBest[m] = VS.score; persist(); if (VS.score > 2) celebrate(); }
  visPanel({ c: rec ? "ok" : "info", t: rec ? `Nouveau record : ${VS.score} !` : `Score : ${VS.score}. Ton record : ${save.visBest[m]}.` });
}
// --- Couleur des cases ---
function visNewColor() { let t; do { t = sqName((Math.random() * 64) | 0); } while (t === VS.target); VS.target = t; }
function visAnswer(a) {
  if (!VS.running || C.vm !== "color") return;
  const ok = sqColor(sqIdx(VS.target)) === a;
  if (ok) { VS.score++; sound("move"); } else { VS.miss++; VS.end -= 3000; sound("error"); }
  const t = $("#vtarget");
  if (t) { t.classList.remove("ok", "bad"); void t.offsetWidth; t.classList.add(ok ? "ok" : "bad"); }
  visNewColor();
  if (t) setTimeout(() => { if ($("#vtarget")) $("#vtarget").textContent = VS.target; }, 120);
  $("#vscore").textContent = VS.score; $("#vmiss").textContent = VS.miss;
}
document.addEventListener("keydown", e => {
  if (modeNow !== "coord" || C.vm !== "color" || !VS.running) return;
  if (e.key === "ArrowLeft") { e.preventDefault(); visAnswer("light"); }
  if (e.key === "ArrowRight") { e.preventDefault(); visAnswer("dark"); }
});
// --- Cases attaquées (échiquier vide : la portée pure de la pièce) ---
function visAttacks(p, sq) {
  const r = sq >> 3, c = sq & 7, out = [], t = p.toLowerCase();
  const add = (rr, cc) => { if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) out.push(rr * 8 + cc); };
  if (t === "n") for (const [a, b] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) add(r + a, c + b);
  if (t === "k") for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (a || b) add(r + a, c + b);
  const dirs = t === "b" ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : t === "r" ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : t === "q" ? [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]] : [];
  for (const [a, b] of dirs) for (let k = 1; k < 8; k++) { const rr = r + a * k, cc = c + b * k; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) break; out.push(rr * 8 + cc); }
  return new Set(out);
}
function visNewAttack() {
  // Plus le score monte, plus les pièces sont à longue portée
  const pool = VS.score < 3 ? ["N", "K", "R"] : VS.score < 7 ? ["N", "B", "R", "K"] : ["N", "B", "R", "Q"];
  VS.piece = pool[(Math.random() * pool.length) | 0];
  let s; do { s = (Math.random() * 64) | 0; } while (s === VS.sq);
  VS.sq = s; VS.sel = new Set();
  B.game = new Chess(EMPTY); B.game.b[s] = VS.piece; B.marks = new Set(); B.last = null; render();
}
function visAttackClick(sq) {
  if (!VS.running || VS.lock || sq === VS.sq) return;
  if (VS.sel.has(sq)) VS.sel.delete(sq); else VS.sel.add(sq);
  B.marks = new Set(VS.sel); render();
  const c = $("#vcount"); if (c) c.textContent = VS.sel.size;
}
function visAttackCheck() {
  if (!VS.running || VS.lock) return;
  const want = visAttacks(VS.piece, VS.sq), ok = want.size === VS.sel.size && [...want].every(s => VS.sel.has(s));
  if (ok) { VS.score++; sound("ok"); flashSq(VS.sq, "flash-ok"); visNewAttack(); visPanel(); return; }
  VS.miss++; sound("error");
  const vm = $("#vmiss"); if (vm) vm.textContent = VS.miss;
  const missing = [...want].filter(s => !VS.sel.has(s)).length, extra = [...VS.sel].filter(s => !want.has(s)).length;
  VS.lock = true; B.marks = want; render();
  const fbx = panel.querySelector(".scorebox");
  fbx.insertAdjacentHTML("afterend", `<div class="fb bad" id="vfb"><span>${missing ? `${missing} case${missing > 1 ? "s" : ""} oubliée${missing > 1 ? "s" : ""}` : ""}${missing && extra ? ", " : ""}${extra ? `${extra} case${extra > 1 ? "s" : ""} en trop` : ""}. Les bonnes cases sont en bleu.</span></div>`);
  setTimeout(() => { VS.lock = false; if (VS.running && C.vm === "attack") { visNewAttack(); visPanel(); } }, 1400);
}
