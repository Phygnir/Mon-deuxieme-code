// ---------- Sauvegarde ----------
const STORE_KEY = "ecole-echecs-v1";
let save = { lessons: {}, puzzles: {}, coordBest: 0, record: { w: 0, d: 0, l: 0 }, play: null, mode: "lecons", path: null };
try { const raw = localStorage.getItem(STORE_KEY); if (raw) save = Object.assign(save, JSON.parse(raw)); } catch (e) {}
const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(save)); } catch (e) {} };

// ---------- Échiquier interactif ----------
const $ = s => document.querySelector(s);
const boardEl = $("#board"), wrapEl = $("#board-wrap"), arrowLayer = $("#arrow-layer"), promoEl = $("#promo"), panel = $("#panel");
const B = {
  game: new Chess(START), flip: false, sel: null, last: null, stars: new Set(), arrows: [], marks: new Set(),
  coords: true, dots: true, locked: true, canMove: () => false, onMove: null, onSquare: null, flash: null, dragFrom: null
};
function render() {
  const g = B.game, html = [];
  const targets = new Map();
  if (B.sel != null && B.dots) for (const m of g.moves(B.sel)) targets.set(m.to, m);
  const chk = g.inCheck() ? g.king(g.turn) : -1;
  for (let vi = 0; vi < 64; vi++) {
    const sq = B.flip ? 63 - vi : vi, r = sq >> 3, f = sq & 7;
    const cls = ["sq", (r + f) % 2 ? "d" : "l"];
    if (B.last && (B.last[0] === sq || B.last[1] === sq)) cls.push("hl");
    if (B.marks.has(sq)) cls.push("mark");
    if (B.sel === sq) cls.push("sel");
    if (sq === chk) cls.push("check");
    if (B.flash && B.flash.sq === sq) cls.push(B.flash.cls);
    let inner = "";
    const p = g.b[sq];
    if (p) inner += pieceEl(p, B.dragFrom === sq ? "ghosted" : "");
    if (B.stars.has(sq)) inner += `<span class="star">★</span>`;
    if (B.badge && B.badge.sq === sq) inner += `<span class="sq-badge">${B.badge.html}</span>`;
    if (targets.has(sq)) { const q = B.quality ? B.quality(targets.get(sq)) : ""; inner += p || targets.get(sq).flags === "e" ? `<span class="ring ${q}"></span>` : `<span class="dot ${q}"></span>`; }
    if (B.coords) {
      if (vi >= 56) inner += `<span class="co f">${FILES[f]}</span>`;
      if (vi % 8 === 0) inner += `<span class="co r">${8 - r}</span>`;
    }
    html.push(`<div class="${cls.join(" ")}" data-sq="${sq}" role="gridcell" aria-label="${sqName(sq)}${p ? " " + NAME[p.toLowerCase()] + (colorOf(p) === "w" ? " blanc" : " noir") : ""}"></div>`.replace("></div>", `>${inner}</div>`));
  }
  boardEl.innerHTML = html.join("");
  if (B.anim) { animateMove(B.anim); B.anim = null; }
  drawArrows();
  renderCaptured();
}
// Glissement de la pièce jouée (et de la tour au roque)
function animateMove(a) {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const slide = (from, to) => {
    const el = boardEl.querySelector(`[data-sq="${to}"] .pc`);
    if (!el) return;
    const [x1, y1] = center(from), [x2, y2] = center(to);
    el.classList.add("moving");
    el.style.transition = "none";
    el.style.transform = `translate(${(x1 - x2) * 100 / 0.92}%, ${(y1 - y2) * 100 / 0.92}%)`;
    el.getBoundingClientRect();
    el.style.transition = "transform 190ms cubic-bezier(.2,.8,.2,1)";
    el.style.transform = "";
    setTimeout(() => el.classList.remove("moving"), 200);
  };
  slide(a.from, a.to);
  if (a.flags === "k" || a.flags === "q") {
    const w = a.to > 55, rf = a.flags === "k" ? (w ? 63 : 7) : (w ? 56 : 0), rt = a.flags === "k" ? (w ? 61 : 5) : (w ? 59 : 3);
    slide(rf, rt);
  }
}
function center(sq) { const v = B.flip ? 63 - sq : sq; return [(v & 7) + 0.5, (v >> 3) + 0.5]; }
function drawArrows() {
  arrowLayer.innerHTML = B.arrows.map(([a, b, col]) => {
    const color = col === "red" ? "#d23c30" : col === "blue" ? "#2f6fd0" : "#1d8a52", mk = col === "red" ? "ahr" : col === "blue" ? "ahb" : "ah";
    const [x1, y1] = center(a), [x2, y2] = center(b);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    const ex = x2 - (dx / len) * 0.38, ey = y2 - (dy / len) * 0.38;
    return `<line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-opacity="0.88" stroke-width="0.17" stroke-linecap="round" marker-end="url(#${mk})"></line>`;
  }).join("");
}
function renderCaptured() {
  const top = $("#under-top"), bot = $("#under-bottom");
  if (!B.showCaptured) { top.innerHTML = ""; bot.innerHTML = ""; return; }
  const init = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const cnt = { w: {}, b: {} };
  for (const p of B.game.b) if (p) { const c = colorOf(p), t = p.toLowerCase(); cnt[c][t] = (cnt[c][t] || 0) + 1; }
  const lost = c => "qrbnp".split("").map(t => pieceEl(c === "w" ? t.toUpperCase() : t, "mini").repeat(Math.max(0, init[t] - (cnt[c][t] || 0)))).join("");
  const mat = c => Object.entries(cnt[c]).reduce((s, [t, n]) => s + ({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }[t]) * n, 0);
  const diff = mat("w") - mat("b");
  const line = (me) => {
    const opp = me === "w" ? "b" : "w";
    const d = me === "w" ? diff : -diff;
    return `<span class="captured">${lost(opp)}${d > 0 ? `<b>+${d}</b>` : ""}</span>`;
  };
  const bottomSide = B.flip ? "b" : "w";
  const label = c => `<span class="who"><i style="background:${c === "w" ? "#f3f0e4" : "#22282a"}"></i>${B.names ? B.names[c] : c === "w" ? "Blancs" : "Noirs"}</span>`;
  top.innerHTML = `${label(bottomSide === "w" ? "b" : "w")}${line(bottomSide === "w" ? "b" : "w")}`;
  bot.innerHTML = `${label(bottomSide)}${line(bottomSide)}`;
}
function sqFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el && el.closest && el.closest(".sq");
  return cell ? +cell.dataset.sq : null;
}
function isLegal(from, to) { return B.game.moves(from).some(m => m.to === to); }
function askPromo(color) {
  return new Promise(res => {
    promoEl.innerHTML = `<div class="promo-box">${"qrbn".split("").map(t => `<button data-p="${t}" aria-label="${NAME[t]}">${pieceEl(color === "w" ? t.toUpperCase() : t)}</button>`).join("")}</div>`;
    promoEl.hidden = false;
    promoEl.onclick = e => { const btn = e.target.closest("button"); if (!btn) return; promoEl.hidden = true; res(btn.dataset.p); };
  });
}
async function tryMove(from, to) {
  const cands = B.game.moves(from).filter(m => m.to === to);
  if (!cands.length) return false;
  let m = cands[0];
  if (cands.length > 1) {
    B.locked = true;
    const p = await askPromo(B.game.turn);
    B.locked = false;
    m = cands.find(x => x.promo.toLowerCase() === p);
  }
  commit(m);
  return true;
}
function commit(m, silent) {
  const san = B.game.san(m);
  B.game.make(m);
  B.sel = null; B.last = [m.from, m.to]; B.arrows = []; B.marks.clear();
  if (!B.noAnim) B.anim = m;
  B.noAnim = false;
  render();
  sound(B.game.inCheck() ? "check" : m.captured ? "capture" : "move");
  if (B.onMove && !silent) B.onMove(m, san);
}
// Glisser-déposer et clic
let drag = null;
wrapEl.addEventListener("pointerdown", e => {
  if (e.button !== 0) return;
  const sq = sqFromPoint(e.clientX, e.clientY);
  if (sq == null) return;
  if (B.onSquare) { B.onSquare(sq); return; }
  if (B.locked) return;
  if (B.sel != null && B.sel !== sq && isLegal(B.sel, sq)) { tryMove(B.sel, sq); return; }
  const p = B.game.b[sq];
  if (p && colorOf(p) === B.game.turn && B.canMove(sq)) {
    const wasSel = B.sel === sq;
    B.sel = sq;
    const size = boardEl.getBoundingClientRect().width / 8;
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.innerHTML = pieceEl(p);
    ghost.style.width = ghost.style.height = size * 1.08 + "px";
    ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px";
    ghost.hidden = true;
    document.body.appendChild(ghost);
    drag = { from: sq, wasSel, ghost, x: e.clientX, y: e.clientY, moved: false };
    try { wrapEl.setPointerCapture(e.pointerId); } catch (err) {}
    render();
  } else { B.sel = null; render(); }
});
wrapEl.addEventListener("pointermove", e => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
    drag.moved = true; drag.ghost.hidden = false; B.dragFrom = drag.from; render();
  }
  drag.ghost.style.left = e.clientX + "px"; drag.ghost.style.top = e.clientY + "px";
});
const endDrag = e => {
  if (!drag) return;
  const d = drag; drag = null;
  d.ghost.remove();
  B.dragFrom = null;
  const to = e.type === "pointerup" ? sqFromPoint(e.clientX, e.clientY) : null;
  if (d.moved && to != null && to !== d.from && isLegal(d.from, to)) { B.noAnim = true; tryMove(d.from, to); return; }
  if (!d.moved && to === d.from && d.wasSel) B.sel = null;
  render();
};
wrapEl.addEventListener("pointerup", endDrag);
wrapEl.addEventListener("pointercancel", endDrag);

function resetBoard(fen, opts = {}) {
  B.game = new Chess(fen || START);
  B.flip = !!opts.flip; B.sel = null; B.last = null; B.stars = new Set(); B.arrows = []; B.marks = new Set(); B.badge = null;
  B.coords = opts.coords !== false; B.dots = true; B.locked = !!opts.locked; B.canMove = opts.canMove || (() => true);
  document.body.classList.toggle("lists", !!opts.list);
  B.onMove = opts.onMove || null; B.onSquare = opts.onSquare || null; B.showCaptured = !!opts.captured; B.flash = null; B.names = opts.names || null;
  promoEl.hidden = true;
  render();
}
function flashSq(sq, cls) { B.flash = { sq, cls }; render(); setTimeout(() => { if (B.flash && B.flash.sq === sq) { B.flash = null; render(); } }, 450); }

// ---------- Icônes, sons, célébrations, points ----------
const svgI = d => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  book: svgI('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'),
  puzzle: svgI('<path d="M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3h7z"/>'),
  board: svgI('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
  target: svgI('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
  bulb: svgI('<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>'),
  undo: svgI('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  flip: svgI('<path d="M7 3v18M7 3 3 7M7 3l4 4M17 21V3M17 21l-4-4M17 21l4-4"/>'),
  flag: svgI('<path d="M4 22V4M4 4h12l-2 4 2 4H4"/>'),
  star: svgI('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill="currentColor" stroke="none"/>'),
  check: svgI('<path d="M20 6 9 17l-5-5"/>'),
  arrow: svgI('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  back: svgI('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
  sound: svgI('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
  mute: svgI('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>'),
  clock: svgI('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  retry: svgI('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  sun: svgI('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svgI('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  bolt: svgI('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  chart: svgI('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>'),
  trophy: svgI('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>')
};
// Sons synthétisés (aucun fichier) : bois pour un coup, plus sec pour une prise
const SND = { ctx: null };
function sound(kind) {
  if (save.sound === false) return;
  try {
    const ctx = SND.ctx || (SND.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const t = ctx.currentTime;
    const knock = (freq, gain, dur, delay = 0) => {
      const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 3; g.gain.value = gain;
      src.connect(bp).connect(g).connect(ctx.destination); src.start(t + delay);
    };
    const tone = (freq, dur, delay = 0, type = "sine", vol = 0.12) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(vol, t + delay + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g).connect(ctx.destination); o.start(t + delay); o.stop(t + delay + dur + 0.02);
    };
    if (kind === "move") knock(1500, 1.6, 0.06);
    else if (kind === "capture") { knock(1100, 2.2, 0.07); knock(1800, 1.2, 0.05, 0.035); }
    else if (kind === "check") { knock(1500, 1.6, 0.06); tone(880, 0.18, 0.03, "triangle", 0.08); }
    else if (kind === "ok") { tone(660, 0.14); tone(990, 0.22, 0.09); }
    else if (kind === "error") { tone(220, 0.22, 0, "triangle", 0.12); tone(180, 0.25, 0.1, "triangle", 0.1); }
    else if (kind === "win") [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, i * 0.1, "triangle", 0.1));
    else if (kind === "end") [392, 330, 262].forEach((f, i) => tone(f, 0.3, i * 0.12, "triangle", 0.08));
  } catch (e) {}
}
// Thème : clair par défaut, sombre seulement sur demande
function applyTheme() {
  const dark = save.theme === "dark";
  document.documentElement.classList.toggle("theme-dark", dark);
  const b = $("#theme-btn");
  b.innerHTML = dark ? ICON.sun : ICON.moon;
  b.setAttribute("aria-pressed", dark ? "true" : "false");
  b.title = dark ? "Passer en mode clair" : "Passer en mode sombre";
}
$("#theme-btn").onclick = () => { save.theme = save.theme === "dark" ? "light" : "dark"; persist(); applyTheme(); };
applyTheme();
function updateSoundBtn() { const b = $("#sound-btn"); b.innerHTML = save.sound === false ? ICON.mute : ICON.sound; b.setAttribute("aria-pressed", save.sound === false ? "false" : "true"); }
$("#sound-btn").onclick = () => { save.sound = save.sound === false; persist(); updateSoundBtn(); sound("move"); };
// Confettis pour les réussites
function celebrate() {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = $("#confetti"); cv.hidden = false;
  const ctx = cv.getContext("2d"), W = cv.width = innerWidth, H = cv.height = innerHeight;
  const cols = ["#1d6b45", "#2f8a5c", "#e0a100", "#ece7d2", "#6f915e", "#d23c30"];
  const parts = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
  const t0 = performance.now();
  (function frame(now) {
    const k = (now - t0) / 1800;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (k < 1) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); cv.hidden = true; }
  })(t0);
}
// Points : 10 par leçon, 5 par exercice, 2 par problème réussi, 15 par victoire
const xpTotal = () => Object.keys(save.lessons).length * 10 + Object.keys(save.puzzles).length * 5 + (save.record.w || 0) * 15 + ((save.pz && save.pz.ok) || 0) * 2;
function updateXp() { $("#xp").innerHTML = `${ICON.star}${xpTotal()} pts`; }
// Étiquettes des onglets
[["lecons", "book", "Leçons"], ["exercices", "puzzle", "Exercices"], ["problemes", "bolt", "Problèmes"], ["jouer", "board", "Jouer"], ["analyse", "chart", "Analyse"], ["coord", "target", "Vision"]].forEach(([id, ic, t]) => { $("#tab-" + id).innerHTML = ICON[ic] + `<span>${t}</span>`; });
updateSoundBtn(); updateXp();

// ---------- Navigation ----------
let timers = [];
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
function clearTimers() { timers.forEach(clearTimeout); timers = []; if (C.iv) { clearInterval(C.iv); C.iv = null; } }
let modeNow = null;
function setMode(mode) {
  clearTimers();
  if (typeof PL !== "undefined") PL.gen++;
  if (typeof Q !== "undefined" && Q.storm && Q.storm.iv) { clearInterval(Q.storm.iv); Q.storm.running = false; }
  if (mode !== "analyse") { AN.run++; AN.g = null; }
  anBoardNav(false);
  visStop();
  modeNow = mode;
  $("#evalbar").hidden = mode !== "jouer";
  $("#board-col").classList.toggle("with-eval", mode === "jouer");
  save.mode = mode; persist();
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.mode === mode ? "true" : "false"));
  const at = $("#tab-" + mode), bar = $(".tabs");
  if (at && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = at.offsetLeft - (bar.clientWidth - at.offsetWidth) / 2;
  if (mode === "lecons") { if (save.path) lessonList(save.path); else pathList(); }
  else if (mode === "exercices") puzzleList();
  else if (mode === "jouer") playView();
  else if (mode === "problemes") problemsView();
  else if (mode === "analyse") analyseHome();
  else coordView();
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => setMode(t.dataset.mode)));

// ---------- Finale roi + pion : base exacte calculée par analyse rétrograde ----------
// Pion blanc uniquement. Valeur : 1 = gain blanc, 2 = nulle. Calculée à la première utilisation (~0,5 s).
const KPK = (() => {
  let res = null;
  const dist = (a, b) => Math.max(Math.abs((a >> 3) - (b >> 3)), Math.abs((a & 7) - (b & 7)));
  const id = (stm, wk, bk, p) => ((stm * 64 + wk) * 64 + bk) * 64 + p;
  const pawnHits = (p, s) => (s >> 3) === (p >> 3) - 1 && Math.abs((s & 7) - (p & 7)) === 1;
  const around = k => { const o = []; for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) { if (!dr && !df) continue; const r = (k >> 3) + dr, f = (k & 7) + df; if (r >= 0 && r < 8 && f >= 0 && f < 8) o.push(r * 8 + f); } return o; };
  function init(stm, wk, bk, p) {
    const pr = p >> 3;
    if (pr === 0 || pr === 7 || wk === bk || wk === p || bk === p || dist(wk, bk) <= 1) return 3;
    if (stm === 0 && pawnHits(p, bk)) return 3;
    if (stm === 0 && pr === 1) { const q = p - 8; if (q !== wk && q !== bk && (dist(bk, q) > 1 || dist(wk, q) === 1)) return 1; }
    if (stm === 1) {
      let moves = 0;
      for (const s of around(bk)) {
        if (dist(s, wk) <= 1 || (s !== p && pawnHits(p, s))) continue;
        moves++;
        if (s === p) return 2;
      }
      if (!moves) return 2;
    }
    return 0;
  }
  function classify(stm, wk, bk, p) {
    let any = false;
    if (stm === 0) {
      for (const s of around(wk)) { if (s === p || dist(s, bk) <= 1) continue; const v = res[id(1, s, bk, p)]; if (v === 1) return 1; if (!v) any = true; }
      const pr = p >> 3, q = p - 8;
      if (pr > 1 && q !== wk && q !== bk) {
        let v = res[id(1, wk, bk, q)]; if (v === 1) return 1; if (!v) any = true;
        const q2 = p - 16;
        if (pr === 6 && q2 !== wk && q2 !== bk) { v = res[id(1, wk, bk, q2)]; if (v === 1) return 1; if (!v) any = true; }
      }
      return any ? 0 : 2;
    }
    for (const s of around(bk)) { if (dist(s, wk) <= 1 || s === p || pawnHits(p, s)) continue; const v = res[id(0, wk, s, p)]; if (v === 2) return 2; if (!v) any = true; }
    return any ? 0 : 1;
  }
  function build() {
    res = new Uint8Array(2 * 64 * 64 * 64);
    for (let stm = 0; stm < 2; stm++) for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (let p = 0; p < 64; p++) res[id(stm, wk, bk, p)] = init(stm, wk, bk, p);
    let changed = true;
    while (changed) {
      changed = false;
      for (let stm = 0; stm < 2; stm++) for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (let p = 8; p < 56; p++) {
        const i = id(stm, wk, bk, p);
        if (res[i]) continue;
        const v = classify(stm, wk, bk, p);
        if (v) { res[i] = v; changed = true; }
      }
    }
  }
  // Gagné pour les Blancs ? (position avec un seul pion blanc)
  return { win(g) { if (!res) build(); const p = g.b.indexOf("P"); if (p < 0) return false; return res[id(g.turn === "w" ? 0 : 1, g.king("w"), g.king("b"), p)] === 1; } };
})();

// ---------- Leçons et parcours ----------
const L = { path: null, lesson: null, i: 0, moves: 0, done: false };
const pathOf = les => PATHS.find(p => p.lessons.includes(les));
const pathDone = p => p.lessons.filter(l => save.lessons[l.id]).length;
const LEVEL_DOTS = { debutant: 1, intermediaire: 2, avance: 3, expert: 4 };
const PATH_EMBLEM = { debutant: "wP", intermediaire: "wN", avance: "wR", expert: "wQ", ouvertures: "wB" };
const STEP_LABEL = { info: "Explication", stars: "Défi étoiles", move: "À toi de jouer", square: "Repérage", pick: "Observation", line: "Ligne à jouer", mate: "Mat à trouver", kpk: "Finale", sheet: "Fiche", quiz: "Quiz", endgame: "Finale à jouer" };
const minutes = l => Math.max(2, Math.round(l.steps.length * 0.9));
function lessonIcon(l) { return pieceEl(l.side === "b" ? l.g : l.g.toUpperCase(), "mini"); }
let enterT = 0;
function panelEnter() { panel.classList.remove("enter"); void panel.offsetWidth; panel.classList.add("enter"); clearTimeout(enterT); enterT = setTimeout(() => panel.classList.remove("enter"), 500); }
const parseArrow = a => { const [u, col] = a.split(":"); return [sqIdx(u.slice(0, 2)), sqIdx(u.slice(2, 4)), col]; };
function pathList() {
  L.lesson = null; L.path = null;
  resetBoard(START, { locked: true, list: true });
  const total = LESSONS.length, done = LESSONS.filter(l => save.lessons[l.id]).length;
  const next = PATHS.flatMap(p => p.lessons).find(l => !save.lessons[l.id]);
  panelEnter();
  panel.innerHTML = `
    <p class="eyebrow">Ton école</p>
    <h2>Choisis ton parcours</h2>
    <p class="lead">Commence là où tu en es. Chaque parcours se suit dans l'ordre, et tu peux passer de l'un à l'autre quand tu veux.</p>
    <div class="stats-strip">
      <div class="stat"><b>${done}<small style="font-size:.55em;color:var(--muted)">/${total}</small></b><span>Leçons</span></div>
      <div class="stat"><b>${Object.keys(save.puzzles).length}<small style="font-size:.55em;color:var(--muted)">/${PUZZLES.length}</small></b><span>Exercices</span></div>
      <div class="stat"><b>${save.record.w || 0}</b><span>Victoires</span></div>
      <div class="stat"><b>${xpTotal()}</b><span>Points</span></div>
    </div>
    ${planCard()}
    ${next && done ? `<div class="row"><button class="btn primary big" id="resume">${ICON.arrow}Reprendre : ${next.t}</button></div>` : ""}
    <div class="paths">${PATHS.map(p => {
      const d = pathDone(p), n = p.lessons.length, lvl = LEVEL_DOTS[p.id];
      return `<button class="path${d === n ? " done" : ""}${lvl ? "" : " wide"}" data-path="${p.id}">
        <span class="path-head"><span class="path-title"><span class="path-ico" aria-hidden="true"><span class="pc ${PATH_EMBLEM[p.id]}"></span></span><span class="path-name">${p.t}</span></span>${lvl ? `<span class="lvl" aria-label="Difficulté ${lvl} sur 4">${[1, 2, 3, 4].map(k => `<i class="${k <= lvl ? "on" : ""}"></i>`).join("")}</span>` : `<span class="pill gold">Répertoire</span>`}</span>
        <span class="path-desc">${p.d}</span>
        <span class="path-foot"><span class="meter"><i style="width:${Math.round(d / n * 100)}%"></i></span><span class="path-count">${d}/${n}</span></span>
      </button>`;
    }).join("")}</div>
    ${backupCard()}`;
  panel.querySelectorAll("[data-path]").forEach(b => b.addEventListener("click", () => lessonList(b.dataset.path)));
  const rs = $("#resume"); if (rs) rs.onclick = () => startLesson(next.id);
  bindPlan(); bindBackup();
}
function lessonList(pathId) {
  const path = PATHS.find(p => p.id === pathId);
  if (!path) return pathList();
  L.path = path; L.lesson = null;
  save.path = path.id; persist();
  resetBoard(START, { locked: true, list: true });
  const d = pathDone(path), next = path.lessons.find(l => !save.lessons[l.id]);
  panelEnter();
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <button class="btn" id="back">${ICON.back}Parcours</button>
      <span class="pill${d === path.lessons.length ? " done" : ""}">${d}/${path.lessons.length} terminées</span>
    </div>
    <div class="cover">
      <div class="cover-art"><span class="pc ${PATH_EMBLEM[path.id]}"></span></div>
      <div><p class="eyebrow">Parcours ${path.t}</p><h2>${path.d}</h2></div>
    </div>
    ${planCard()}
    ${path.id === "ouvertures" ? `<button class="rep-card" id="rep-open"><span class="rep-ico">${pieceEl("N")}</span><span><b>Mon répertoire d'ouvertures</b><small>Rejoue tes ouvertures de mémoire, contre un adversaire qui sort parfois de la théorie</small></span>${ICON.arrow}</button>` : ""}
    ${path.intro ? `<p class="lead">${path.intro}</p>` : ""}
    <div class="progress">${path.lessons.map(l => `<span class="${save.lessons[l.id] ? "on" : ""}"></span>`).join("")}</div>
    ${next ? `<div class="row"><button class="btn primary big" data-start="${next.id}">${ICON.arrow}${d ? "Continuer" : "Commencer"} : ${next.t}</button></div>` : `<div class="fb ok">${ICON.trophy} Parcours terminé, bravo ! Tu peux refaire n'importe quelle leçon ou choisir un autre parcours.</div>`}
    <div class="list">${path.lessons.map((l, i) => `
      <button class="item${save.lessons[l.id] ? " done" : ""}${l === next ? " next" : ""}" data-start="${l.id}">
        <span class="num">${save.lessons[l.id] ? ICON.check : i + 1}</span>
        <span><span class="ti">${l.t}</span><span class="de">${l.d} · ${minutes(l)} min</span></span>
        <span class="glyph" aria-hidden="true">${lessonIcon(l)}</span>
      </button>`).join("")}</div>`;
  $("#back").onclick = () => { save.path = null; persist(); pathList(); };
  panel.querySelectorAll("[data-start]").forEach(b => b.addEventListener("click", () => startLesson(b.dataset.start)));
  bindPlan();
  const ro = $("#rep-open"); if (ro) ro.onclick = () => { setMode("exercices"); repHome(); };
}
function startLesson(id, i) {
  L.lesson = LESSONS.find(l => l.id === id); L.path = pathOf(L.lesson);
  if (i == null) return lessonCover();
  L.i = i;
  loadStep();
}
// Page de couverture : objectifs et déroulé
function lessonCover() {
  clearTimers();
  const les = L.lesson, path = L.path, idx = path.lessons.indexOf(les);
  const first = les.steps[0];
  resetBoard(first.fen || START, { locked: true, flip: les.side === "b" });
  if (first.arrows) B.arrows = first.arrows.map(parseArrow);
  render();
  const kinds = [...new Set(les.steps.map(s => STEP_LABEL[s.k]))];
  panelEnter();
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <button class="btn" id="back">${ICON.back}${path.t}</button>
      ${save.lessons[les.id] ? `<span class="pill done">${ICON.check}Terminée</span>` : `<span class="pill">Leçon ${idx + 1}/${path.lessons.length}</span>`}
    </div>
    <div class="cover">
      <div class="cover-art">${pieceEl(les.side === "b" ? les.g : les.g.toUpperCase())}</div>
      <div><p class="eyebrow">${path.t} · leçon ${idx + 1}</p><h2>${les.t}</h2></div>
    </div>
    <p class="lead">${les.intro || les.d}</p>
    <div class="meta"><span class="pill">${ICON.clock}${minutes(les)} min</span><span class="pill">${les.steps.length} étapes</span>${kinds.slice(0, 4).map(k => `<span class="pill">${k}</span>`).join("")}</div>
    ${les.goals ? `<p class="goals-title">Tu vas apprendre</p><ul class="goals">${les.goals.map(g => `<li>${g}</li>`).join("")}</ul>` : ""}
    <div class="row"><button class="btn primary big" id="go">${ICON.arrow}${save.lessons[les.id] ? "Refaire la leçon" : "Commencer"}</button></div>`;
  $("#back").onclick = () => lessonList(path.id);
  $("#go").onclick = () => { L.i = 0; loadStep(); };
  $("#go").focus({ preventScroll: true });
}
function loadStep() {
  clearTimers();
  const st = L.lesson.steps[L.i];
  Object.assign(L, { moves: 0, done: st.k === "info" || st.k === "sheet", targets: null, ply: 0, errors: 0, userMoves: 0, note: null, sans: [], found: new Set(), fb: null, wrong: new Set() });
  const own = sq => colorOf(B.game.b[sq]) === B.game.turn;
  const opts = { canMove: own, onMove: lessonMove, flip: L.lesson.side === "b" };
  if (st.k === "info" || st.k === "quiz") opts.locked = true;
  if (st.k === "sheet") { opts.locked = true; opts.flip = st.side === "b"; }
  if ((st.k === "move" || st.k === "mate" || st.k === "endgame") && (st.fen || START).split(" ")[1] === "b") opts.flip = true;
  if (st.flip != null) opts.flip = st.flip;
  if (st.k === "stars") opts.canMove = sq => colorOf(B.game.b[sq]) === "w";
  if (st.k === "square") { opts.onSquare = lessonSquare; opts.coords = false; L.targets = st.targets.slice(); L.found = 0; }
  if (st.k === "pick") opts.onSquare = lessonPick;
  if (st.k === "line") { opts.flip = st.side === "b"; opts.canMove = sq => colorOf(B.game.b[sq]) === st.side; }
  if (st.k === "kpk") opts.canMove = sq => colorOf(B.game.b[sq]) === "w";
  if (st.k === "endgame") { const side = (st.fen || START).split(" ")[1]; opts.canMove = sq => colorOf(B.game.b[sq]) === side; L.side = side; }
  resetBoard(st.fen || START, opts);
  if (st.k === "stars") st.stars.forEach(s => B.stars.add(sqIdx(s)));
  if (st.show) B.sel = sqIdx(st.show);
  if (st.arrows) B.arrows = st.arrows.map(parseArrow);
  if (st.marks) B.marks = new Set(st.marks.map(sqIdx));
  render();
  panelEnter();
  lessonPanel();
  if (st.k === "line") lineAdvance();
}
function lessonPanel() {
  const les = L.lesson, st = les.steps[L.i], last = L.i === les.steps.length - 1, path = L.path;
  let extra = "";
  if (st.k === "stars") extra = `<p class="lead">Coups joués : <b>${L.moves}</b> · objectif : ${st.par} coup${st.par > 1 ? "s" : ""}</p>`;
  if (st.k === "square" && !L.done) extra = `<div class="target" aria-live="assertive">${L.targets[0]}</div><p class="lead">Trouvées : ${L.found}/${st.targets.length}. Les coordonnées sont cachées : retrouve-les de tête.</p>`;
  if (st.k === "pick" && st.all && !L.done) extra = `<p class="lead">Trouvées : ${L.found.size}/${st.answers.length}</p>`;
  if (st.k === "endgame") extra = `<p class="lead">Coups joués : <b>${L.userMoves}</b>${st.max ? ` · objectif : mater en ${st.max} coups maximum` : ""}</p>`;
  if (st.k === "quiz") extra = `<p class="text"><b>${st.q}</b></p><div class="quiz">${st.options.map((o, i) => `<button data-opt="${i}" class="${L.done && i === st.answer ? "right" : L.wrong.has(i) ? "wrong" : ""}" ${L.done || L.wrong.has(i) ? "disabled" : ""}><span class="letter">${"ABCD"[i]}</span><span>${o}</span></button>`).join("")}</div>`;
  if (st.k === "line" && L.sans.length) {
    const f = (st.fen || START).split(" "), startBlack = f[1] === "b", first = (+f[5] || 1) - 1;
    const parts = [];
    L.sans.forEach((s, i) => {
      const ply = i + (startBlack ? 1 : 0);
      if (ply % 2 === 0) parts.push(`<span class="n">${first + ply / 2 + 1}.</span>`);
      else if (i === 0) parts.push(`<span class="n">${first + (ply + 1) / 2}...</span>`);
      parts.push(`<span class="${i === L.sans.length - 1 ? "cur" : ""}">${frSan(s)}</span>`);
    });
    extra = `<div class="line-moves">${parts.join(" ")}</div>`;
  }
  if (st.k === "sheet") {
    const s = st.sheet;
    extra = `<div class="sheet">
      <div class="plans"><div><h3>Plans des Blancs</h3><ul>${s.plans.w.map(x => `<li>${x}</li>`).join("")}</ul></div>
      <div><h3>Plans des Noirs</h3><ul>${s.plans.b.map(x => `<li>${x}</li>`).join("")}</ul></div></div>
      <div><h3>Coups typiques</h3><div class="typ">${s.typical.map((x, i) => `<button data-typ="${i}" aria-pressed="false"><b>${sanFor(st.fen, x.u)}</b><span>${x.t}</span></button>`).join("")}</div></div>
      <div><h3>Situations courantes</h3><div class="situ">${s.situations.map(x => `<div><b>${x.t}</b>${x.x}</div>`).join("")}</div></div>
    </div>`;
  }
  const canHint = !L.done && ["line", "mate", "kpk", "move", "endgame"].includes(st.k) && !(st.k === "line" && st.guide) && !(st.k === "move" && !st.accept);
  const text = st.x && !/^<p>/.test(st.x) ? `<p>${st.x}</p>` : st.x || "";
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <button class="btn" id="back">${ICON.back}${les.t}</button>
      <span class="pill">Étape ${L.i + 1}/${les.steps.length}</span>
    </div>
    <div class="progress">${les.steps.map((s, i) => `<span class="${i < L.i || (i === L.i && L.done) ? "on" : i === L.i ? "now" : ""}"></span>`).join("")}</div>
    <p class="eyebrow">${STEP_LABEL[st.k] || ""}${st.title ? " · " + st.title : ""}</p>
    ${text ? `<div class="text">${text}</div>` : ""}
    ${extra}
    ${st.key && (st.k === "info" || L.done) ? `<div class="key"><b>À retenir</b>${st.key}</div>` : ""}
    ${L.note ? `<div class="fb info">${L.note}</div>` : ""}
    ${L.fb ? `<div class="fb ${L.fb.c}">${L.fb.t}</div>` : ""}
    <div class="row">
      ${L.done ? `<button class="btn primary" id="next">${last ? ICON.trophy + "Terminer la leçon" : "Continuer" + ICON.arrow}</button>` : ""}
      ${canHint ? `<button class="btn" id="lhint">${ICON.bulb}Indice</button>` : ""}
      ${st.k !== "info" && st.k !== "sheet" ? `<button class="btn" id="retry">${ICON.retry}Recommencer</button>` : ""}
      ${L.i > 0 ? `<button class="btn" id="prev">${ICON.back}Étape précédente</button>` : ""}
    </div>`;
  $("#back").onclick = () => lessonCover();
  const nx = $("#next"); if (nx) { nx.onclick = nextStep; nx.focus({ preventScroll: true }); }
  const rt = $("#retry"); if (rt) rt.onclick = loadStep;
  const pv = $("#prev"); if (pv) pv.onclick = () => { L.i--; loadStep(); };
  const lh = $("#lhint"); if (lh) lh.onclick = lessonHint;
  panel.querySelectorAll("[data-typ]").forEach(b => b.onclick = () => {
    const x = st.sheet.typical[+b.dataset.typ], f = sqIdx(x.u.slice(0, 2)), t = sqIdx(x.u.slice(2, 4));
    panel.querySelectorAll("[data-typ]").forEach(o => o.setAttribute("aria-pressed", o === b ? "true" : "false"));
    B.arrows = [[f, t]]; B.marks = new Set([f]); render();
  });
  panel.querySelectorAll("[data-opt]").forEach(b => b.onclick = () => {
    const i = +b.dataset.opt;
    if (i === st.answer) { L.done = true; sound("ok"); if (st.arrowsAfter) { B.arrows = st.arrowsAfter.map(parseArrow); render(); } setFb("ok", st.explain || "Exact !"); }
    else { L.wrong.add(i); sound("error"); setFb("bad", (st.wrongs && st.wrongs[i]) || "Non. Réfléchis encore et choisis une autre réponse."); }
  });
}
// Notation d'un coup typique, même s'il appartient au camp qui n'a pas le trait
function sanFor(fen, u) {
  let g = new Chess(fen), m = g.find(u);
  if (!m) { g = withTurn(g, g.turn === "w" ? "b" : "w"); m = g.find(u); }
  if (!m) return u;
  const s = frSan(g.san(m));
  return colorOf(m.piece) === "b" ? "..." + s : s;
}
function setFb(c, t) { L.fb = c ? { c, t } : null; lessonPanel(); }
function nextStep() {
  const les = L.lesson;
  if (L.i < les.steps.length - 1) { L.i++; loadStep(); return; }
  const first = !save.lessons[les.id];
  save.lessons[les.id] = true; persist(); updateXp();
  dayInc("les");
  if (L_OUV.includes(les)) revAdd("ouv:" + les.id, { k: "ouv", id: les.id }, true);
  lessonRecap(first);
}
// Bilan de fin de leçon
function lessonRecap(first) {
  const les = L.lesson, path = L.path, idx = path.lessons.indexOf(les), nxt = path.lessons[idx + 1];
  const pi = PATHS.indexOf(path), nextPath = PATHS[pi + 1];
  B.locked = true; B.arrows = [];
  render();
  panelEnter();
  panel.innerHTML = `
    <p class="eyebrow">Leçon terminée · ${path.t}</p>
    <h2>Bravo, « ${les.t} » est acquis !</h2>
    ${first ? `<div class="reward">${ICON.star}<div><b>+10 points</b><div class="lead">${xpTotal()} points au total · ${pathDone(path)}/${path.lessons.length} leçons du parcours</div></div></div>` : ""}
    ${les.recap ? `<p class="goals-title">L'essentiel</p><ul class="recap">${les.recap.map(r => `<li><i>${ICON.check}</i><span>${r}</span></li>`).join("")}</ul>` : ""}
    <div class="row">
      ${nxt ? `<button class="btn primary big" id="nl">${ICON.arrow}Leçon suivante : ${nxt.t}</button>` : nextPath ? `<button class="btn primary big" id="np">${ICON.arrow}Parcours suivant : ${nextPath.t}</button>` : `<button class="btn primary big" id="ex">${ICON.arrow}Passer aux exercices</button>`}
      <button class="btn" id="bl">Retour au parcours</button>
    </div>`;
  if (nxt) $("#nl").onclick = () => startLesson(nxt.id);
  else if (nextPath) $("#np").onclick = () => lessonList(nextPath.id);
  else $("#ex").onclick = () => setMode("exercices");
  $("#bl").onclick = () => lessonList(path.id);
  if (first) { celebrate(); sound("win"); } else sound("ok");
}
function stepDone(text) { L.done = true; B.locked = true; B.arrows = []; render(); sound("ok"); setFb("ok", text); }
function rejectMove(text, delay = 1100) {
  B.locked = true; L.errors++;
  sound("error");
  setFb("bad", text);
  later(() => { B.game.undo(); B.last = null; B.locked = false; render(); }, delay);
}
// Joue automatiquement les coups de l'autre camp dans une ligne
function lineAdvance() {
  const st = L.lesson.steps[L.i], g = B.game;
  if (L.ply >= st.moves.length) { stepDone(st.done || (st.guide ? "Ligne jouée ! Passe à l'étape suivante pour la rejouer de mémoire." : st.fen === START || !st.fen ? "Parfait, tu connais cette ligne par cœur." : "Combinaison réussie !")); return; }
  if (g.turn === st.side) {
    B.locked = false;
    if (st.guide || L.errors >= 2) { const m = g.find(st.moves[L.ply]); if (m) B.arrows = [[m.from, m.to]]; }
    render();
    return;
  }
  B.locked = true;
  later(() => {
    const m = g.find(st.moves[L.ply]);
    L.sans.push(g.san(m));
    commit(m, true);
    if (st.notes && st.notes[L.ply]) L.note = st.notes[L.ply];
    L.ply++;
    lessonPanel();
    lineAdvance();
  }, 560);
}
function lessonHint() {
  const st = L.lesson.steps[L.i], g = B.game;
  if (B.locked) return;
  let m = null;
  if (st.k === "line") m = g.find(st.moves[L.ply]);
  if (st.k === "move" && st.accept) m = g.find(st.accept[0]);
  if (st.k === "mate") m = mateIn(g, st.n - L.userMoves);
  if (st.k === "endgame") { const r = think(g, { depth: 4, time: 700 }); m = r && r.best; }
  if (st.k === "kpk") {
    const wins = g.moves().filter(x => { if (x.promo) return x.promo === "Q"; g.make(x, true); const w = KPK.win(g); g.undo(); return w; });
    m = wins.find(x => x.piece === "P") || wins[0];
  }
  if (!m) return;
  L.errors = Math.max(L.errors, 2);
  B.arrows = [[m.from, m.to]]; render();
}
function lessonMove(m, san) {
  const st = L.lesson.steps[L.i], g = B.game, u = uci(m);
  B.arrows = [];
  if (st.k === "stars") {
    g.turn = "w"; g.ep = -1;
    L.moves++;
    B.stars.delete(m.to);
    render();
    if (!B.stars.size) {
      L.done = true; B.locked = true;
      const rating = L.moves <= st.par ? 3 : L.moves === st.par + 1 ? 2 : 1;
      sound(rating === 3 ? "win" : "ok");
      setFb(rating === 3 ? "ok" : "warn", `${"★".repeat(rating)}${"☆".repeat(3 - rating)} &nbsp;${rating === 3 ? "Parcours parfait !" : `Réussi en ${L.moves} coups. Possible en ${st.par} : réessaie si tu veux.`}`);
    } else lessonPanel();
    return;
  }
  if (st.k === "move") {
    const status = g.status();
    let ok = false;
    if (st.accept && st.accept.length) ok = st.accept.some(a => u === a || (a.length === 4 && u.startsWith(a)));
    if (st.goal === "check") ok = g.inCheck();
    if (st.goal === "mate") ok = status === "mate";
    if (ok) {
      if (st.after) { B.arrows = st.after.map(parseArrow); render(); }
      return stepDone(st.ok || "Bravo !");
    }
    let msg = (st.wrong && st.wrong[u]) || st.no || "Ce n'est pas le coup attendu. Relis la consigne et réessaie.";
    if (status === "stalemate") msg = "Pat ! Le roi adverse n'est pas en échec mais ne peut plus bouger : c'est nul. Essaie un autre coup.";
    return rejectMove(msg, 1500);
  }
  if (st.k === "line") {
    const exp = st.moves[L.ply];
    if (u === exp || (exp.length === 4 && u.startsWith(exp))) {
      L.sans.push(san);
      L.note = st.notes && st.notes[L.ply] ? st.notes[L.ply] : null;
      L.ply++;
      setFb(null);
      lineAdvance();
    } else {
      const want = (() => { g.undo(); const mm = g.find(exp); const s = mm ? frSan(g.san(mm)) : exp; g.make(m); return s; })();
      rejectMove(st.guide ? `Suis la flèche : ici on joue ${want}.` : L.errors >= 1 ? `Ici, on joue ${want}. La flèche te le montre.` : "Ce n'est pas le bon coup. Réessaie.", 1000);
      if (!st.guide && L.errors >= 2) later(() => { const mm = g.find(exp); if (mm) { B.arrows = [[mm.from, mm.to]]; render(); } }, 1050);
    }
    return;
  }
  if (st.k === "mate") {
    if (g.status() === "mate") { L.userMoves++; return stepDone(st.ok || (L.errors ? "Mat ! Bien joué." : "Mat, trouvé du premier coup !")); }
    if (!forcedMate(g, st.n - L.userMoves - 1)) return rejectMove("Ce coup laisse le roi s'échapper. Cherche les échecs et les sacrifices.");
    L.userMoves++;
    B.locked = true;
    setFb("ok", "Bon coup ! Le roi adverse se défend...");
    later(() => {
      const r = think(g, { depth: 3, time: 700 });
      commit(r.move, true);
      B.locked = false;
      setFb("info", "À toi, termine le travail.");
    }, 550);
    return;
  }
  if (st.k === "endgame") {
    L.userMoves++;
    const s1 = g.status();
    if (s1 === "mate") return stepDone(st.ok || `Mat en ${L.userMoves} coups. Technique maîtrisée !`);
    if (s1 === "stalemate") return rejectMove("Pat ! Le roi adverse n'a plus de coup mais n'est pas en échec : c'est nul. Laisse-lui toujours une case.", 1500);
    if (s1 || g.b.filter(p => p && p.toLowerCase() !== "k").length < (st.pieces || 1)) return rejectMove("Ta pièce a été perdue ou la partie est nulle. Recommence.", 1500);
    if (st.max && L.userMoves >= st.max) { B.locked = true; setFb("warn", `Le mat n'est pas venu en ${st.max} coups. Recommence en appliquant la méthode : réduire la boîte, puis mater.`); return; }
    B.locked = true; L.fb = null; lessonPanel();
    later(() => {
      const r = think(g, { depth: 3, time: 500 });
      commit(r.move, true);
      const s2 = g.status();
      if (s2 || g.b.filter(p => p && p.toLowerCase() !== "k").length < (st.pieces || 1)) { B.locked = true; setFb("bad", "Le roi adverse a pris ta pièce : c'est nul. Garde tes pièces protégées et recommence."); return; }
      B.locked = false;
      lessonPanel();
    }, 380);
    return;
  }
  if (st.k === "kpk") {
    if (m.promo) {
      if (m.promo === "Q" || m.promo === "R") return stepDone("Le pion devient dame : la finale est gagnée !");
      return rejectMove("Un fou ou un cavalier seul ne peut pas mater. Promeus en dame.");
    }
    if (!KPK.win(g)) {
      const st2 = g.status();
      return rejectMove(st2 === "stalemate" ? "Pat ! Le roi noir n'a plus de coup : partie nulle. Laisse-lui une case." : "Ce coup laisse filer le gain : la position devient nulle. Pense à l'opposition et garde ton roi devant le pion.", 1300);
    }
    B.locked = true;
    setFb(null);
    later(() => {
      // Le roi noir cherche la meilleure défense : rester près du pion et de sa case de promotion
      const p = g.b.indexOf("P"), qsq = p & 7;
      let best = null, bestS = -Infinity;
      for (const r of g.moves()) {
        const d = Math.max(Math.abs((r.to >> 3) - (p >> 3)), Math.abs((r.to & 7) - (p & 7))) + Math.max(r.to >> 3, Math.abs((r.to & 7) - qsq));
        const s = -d + Math.random() * 0.5;
        if (s > bestS) { bestS = s; best = r; }
      }
      commit(best, true);
      B.locked = false;
      L.errors = 0;
    }, 420);
  }
}
function lessonSquare(sq) {
  const st = L.lesson.steps[L.i];
  if (L.done) return;
  if (sqName(sq) === L.targets[0]) {
    flashSq(sq, "flash-ok"); sound("move");
    L.targets.shift(); L.found++;
    if (!L.targets.length) { L.done = true; B.coords = true; render(); sound("ok"); setFb("ok", "Tu sais lire l'échiquier. Pour t'entraîner encore, va dans l'onglet Coordonnées."); }
    else setFb(null);
  } else {
    flashSq(sq, "flash-bad"); sound("error");
    setFb("bad", `Ça, c'est ${sqName(sq)}. Cherche ${st.targets[L.found]}.`);
  }
}
function lessonPick(sq) {
  const st = L.lesson.steps[L.i], name = sqName(sq);
  if (L.done) return;
  if (st.answers.includes(name)) {
    flashSq(sq, "flash-ok");
    L.found.add(name); B.marks.add(sq);
    if (!st.all || L.found.size === st.answers.length) { L.done = true; render(); sound("ok"); setFb("ok", st.ok || "Exact !"); }
    else { sound("move"); setFb("ok", "Oui ! Il en reste."); }
  } else {
    flashSq(sq, "flash-bad"); sound("error");
    setFb("bad", st.no || "Non, regarde mieux.");
  }
}

// ---------- Exercices ----------
// Deux sources : les classiques (PUZZLES) et les problèmes tirés de parties (MINED, générés par tools/mine.js
// puis vérifiés par tools/verify-puzzles.js : solution unique à chaque coup).
const THEMES = [
  { id: "capture", t: "Pièces en prise", d: "Repérer et prendre ce qui n'est pas défendu", g: "p" },
  { id: "fork", t: "Fourchettes", d: "Une pièce, deux cibles", g: "n" },
  { id: "pin", t: "Clouages et enfilades", d: "Exploiter les pièces alignées", g: "b" },
  { id: "discovered", t: "Attaques à la découverte", d: "Une pièce bouge, une autre frappe", g: "r" },
  { id: "sacrifice", t: "Sacrifices", d: "Donner pour mieux reprendre", g: "q" },
  { id: "mate", t: "Mats", d: "Finir la partie", g: "k" },
  { id: "promotion", t: "Promotion", d: "Le pion qui devient dame", g: "p" }
];
function themeOf(tags) {
  if (tags.includes("mate")) return "mate";
  if (tags.includes("promotion")) return "promotion";
  if (tags.includes("fork")) return "fork";
  if (tags.includes("pin") || tags.includes("skewer")) return "pin";
  if (tags.includes("discovered")) return "discovered";
  if (tags.includes("sacrifice")) return "sacrifice";
  return "capture";
}
const MINED_P = (typeof MINED !== "undefined" ? MINED : []).filter((m, i, all) => themeOf(m.tags) !== "capture" || all.slice(0, i).filter(x => themeOf(x.tags) === "capture").length < 70).map((m, i) => {
  const th = themeOf(m.tags);
  const userMoves = Math.ceil(m.line.length / 2);
  const diff = Math.min(3, (userMoves > 1 ? 2 : 1) + (m.tags.includes("sacrifice") || m.tags.includes("discovered") ? 1 : 0));
  return { id: "m" + (i + 1), t: THEMES.find(x => x.id === th).t, th: "Tirés de parties", theme: th, fen: m.fen, before: m.before, last: m.last, goal: "line", line: m.line, n: userMoves, diff, tags: m.tags };
}).sort((a, b) => a.diff - b.diff || a.n - b.n);
const ALL_PUZZLES = PUZZLES.concat(MINED_P);
const P = { cur: null, i: 0, userMoves: 0, errors: 0, hint: 0, solved: false, mode: null, list: null };
const solvedCount = list => list.filter(p => save.puzzles[p.id]).length;
const stars = d => "★".repeat(d) + "☆".repeat(3 - d);
function puzzleList() {
  P.cur = null; P.mode = null;
  resetBoard(START, { locked: true, list: true });
  panelEnter();
  const nDone = solvedCount(ALL_PUZZLES), nextSeries = MINED_P.find(p => !save.puzzles[p.id]);
  panel.innerHTML = `
    <p class="eyebrow">Tactique · ${nDone}/${ALL_PUZZLES.length} résolus</p>
    <h2>Entraîne ton œil tactique</h2>
    <p class="lead">${MINED_P.length} positions tirées de parties, chacune avec une solution unique vérifiée par le moteur, et ${PUZZLES.length} classiques à connaître.</p>
    <div class="stats-strip">
      <div class="stat"><b>${nDone}</b><span>Résolus</span></div>
      <div class="stat"><b>${solvedCount(MINED_P)}<small style="font-size:.55em;color:var(--muted)">/${MINED_P.length}</small></b><span>De parties</span></div>
      <div class="stat"><b>${solvedCount(PUZZLES)}<small style="font-size:.55em;color:var(--muted)">/${PUZZLES.length}</small></b><span>Classiques</span></div>
      <div class="stat"><b>${save.streak || 0}</b><span>Série</span></div>
    </div>
    ${revCard()}
    <button class="rep-card" id="rep-open"><span class="rep-ico">${pieceEl("N")}</span><span><b>Mon répertoire d'ouvertures</b><small>${save.rep.w.length + save.rep.b.length ? `${save.rep.w.length + save.rep.b.length} ouverture(s) choisie(s) · entraîne-toi à les jouer de mémoire` : "Choisis tes ouvertures et entraîne-toi à les jouer de mémoire"}</small></span>${ICON.arrow}</button>
    ${nextSeries ? `<div class="row"><button class="btn primary big" id="series">${ICON.puzzle}Série tactique : problème suivant</button></div>` : MINED_P.length ? `<div class="fb ok">Tous les problèmes tirés de parties sont résolus !</div>` : ""}
    <p class="group-title">Par thème</p>
    <div class="paths compact">${THEMES.map(t => { const l = MINED_P.filter(p => p.theme === t.id); if (!l.length) return ""; const d = solvedCount(l); return `
      <button class="path" data-theme="${t.id}">
        <span class="path-head"><span class="path-title"><span class="path-ico" aria-hidden="true">${pieceEl(t.g.toUpperCase())}</span><span class="path-name">${t.t}</span></span></span>
        <span class="path-desc">${t.d}</span>
        <span class="path-foot"><span class="meter"><i style="width:${Math.round(d / l.length * 100)}%"></i></span><span class="path-count">${d}/${l.length}</span></span>
      </button>`; }).join("")}</div>
    <p class="group-title">Les classiques</p>
    <div class="list">${PUZZLES.map((p, i) => `
      <button class="item${save.puzzles[p.id] ? " done" : ""}" data-p="${p.id}">
        <span class="num">${save.puzzles[p.id] ? ICON.check : i + 1}</span>
        <span><span class="ti">${p.t}</span><span class="de">${p.th} · ${goalText(p)}</span></span>
        <span class="pill${save.puzzles[p.id] ? " done" : ""}">${save.puzzles[p.id] ? "Résolu" : "À faire"}</span>
      </button>`).join("")}</div>`;
  panel.querySelectorAll("[data-p]").forEach(b => b.addEventListener("click", () => { P.mode = "classic"; P.list = PUZZLES; startPuzzle(b.dataset.p); }));
  panel.querySelectorAll("[data-theme]").forEach(b => b.addEventListener("click", () => themeList(b.dataset.theme)));
  const s = $("#series"); if (s) s.onclick = () => { P.mode = "series"; P.list = MINED_P; startPuzzle(nextSeries.id); };
  revBindCard();
  $("#rep-open").onclick = repHome;
}
function themeList(th) {
  const t = THEMES.find(x => x.id === th), list = MINED_P.filter(p => p.theme === th);
  resetBoard(START, { locked: true, list: true });
  panelEnter();
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><button class="btn" id="back">${ICON.back}Exercices</button><span class="pill">${solvedCount(list)}/${list.length} résolus</span></div>
    <div class="cover"><div class="cover-art">${pieceEl(t.g.toUpperCase())}</div><div><p class="eyebrow">Thème</p><h2>${t.t}</h2></div></div>
    <p class="lead">${t.d}. Les problèmes sont classés du plus simple au plus difficile.</p>
    <div class="list">${list.map((p, i) => `
      <button class="item${save.puzzles[p.id] ? " done" : ""}" data-p="${p.id}">
        <span class="num">${save.puzzles[p.id] ? ICON.check : i + 1}</span>
        <span><span class="ti">Problème ${i + 1}</span><span class="de">${p.fen.split(" ")[1] === "w" ? "Les Blancs" : "Les Noirs"} jouent · ${p.n} coup${p.n > 1 ? "s" : ""} à trouver</span></span>
        <span class="pill gold">${stars(p.diff)}</span>
      </button>`).join("")}</div>`;
  $("#back").onclick = puzzleList;
  panel.querySelectorAll("[data-p]").forEach(b => b.addEventListener("click", () => { P.mode = "theme"; P.list = list; startPuzzle(b.dataset.p); }));
}
function goalText(p) {
  const side = p.fen.split(" ")[1] === "w" ? "Les Blancs" : "Les Noirs";
  if (p.goal === "mate") return `${side} jouent et font mat en ${p.n}.`;
  if (p.goal === "gain") return `${side} jouent et gagnent du matériel.`;
  if (p.goal === "line") return p.theme === "mate" ? `${side} jouent et font mat en ${p.n}.` : `${side} jouent et gagnent.`;
  return `${side} jouent et matent le roi seul.`;
}
function startPuzzle(id) {
  clearTimers();
  P.cur = ALL_PUZZLES.find(p => p.id === id); P.i = 0; P.userMoves = 0; P.errors = 0; P.hint = 0; P.solved = false; P.fb = null;
  if (!P.list) P.list = P.cur.goal === "line" ? MINED_P : PUZZLES;
  const color = P.cur.fen.split(" ")[1];
  panelEnter();
  const opts = { flip: color === "b", canMove: sq => colorOf(B.game.b[sq]) === color, onMove: puzzleMove, captured: P.cur.goal !== "mate" };
  if (P.cur.before && P.cur.last) {
    // On rejoue d'abord le dernier coup adverse, comme dans une vraie partie
    resetBoard(P.cur.before, Object.assign({}, opts, { locked: true }));
    later(() => { const m = B.game.find(P.cur.last); if (m) commit(m, true); B.locked = false; }, 650);
  } else resetBoard(P.cur.fen, opts);
  puzzlePanel();
}
function puzzlePanel() {
  const p = P.cur, list = P.list || ALL_PUZZLES, idx = list.indexOf(p);
  const nxt = P.mode === "series" ? MINED_P.find(x => !save.puzzles[x.id] && x !== p) : list[idx + 1];
  const fb = P.fb, mined = p.goal === "line";
  const showTheme = !mined || P.solved || P.mode === "theme";
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <button class="btn" id="back">${ICON.back}Exercices</button>
      <span class="pill${mined ? " gold" : ""}">${mined ? stars(p.diff) : p.th}</span>
    </div>
    <p class="eyebrow">${P.mode === "series" ? "Série tactique" : mined ? "Tiré d'une partie" : "Classique"} · ${idx + 1}/${list.length}</p>
    <h2>${showTheme ? p.t : "Trouve le meilleur coup"}</h2>
    <p class="text"><strong>${goalText(p)}</strong>${p.x ? " " + p.x : mined && !P.solved ? (p.before ? " Le dernier coup adverse vient d'être joué : qu'a-t-il oublié ?" : "") : ""}</p>
    ${p.goal === "convert" ? `<p class="lead">Coups joués : <b>${P.userMoves}</b></p>` : ""}
    ${mined && p.n > 1 && !P.solved ? `<p class="lead">Coups trouvés : <b>${P.userMoves}</b>/${p.n}</p>` : ""}
    ${fb ? `<div class="fb ${fb.c}">${fb.t}</div>` : ""}
    <div class="row">
      ${P.solved ? (nxt ? `<button class="btn primary" id="next">${P.mode === "series" ? "Problème suivant" : "Exercice suivant"}${ICON.arrow}</button>` : `<button class="btn primary" id="list">Retour à la liste</button>`) : `<button class="btn" id="hint">${ICON.bulb}${P.hint ? "Montrer le coup" : "Indice"}</button>`}
      <button class="btn" id="retry">${ICON.retry}Recommencer</button>
      ${!P.solved && mined ? `<button class="btn" id="skip">Passer</button>` : ""}
    </div>`;
  $("#back").onclick = puzzleList;
  $("#retry").onclick = () => startPuzzle(p.id);
  const h = $("#hint"); if (h) h.onclick = puzzleHint;
  const n = $("#next"); if (n) { n.onclick = () => startPuzzle(nxt.id); n.focus({ preventScroll: true }); }
  const l = $("#list"); if (l) l.onclick = puzzleList;
  const sk = $("#skip"); if (sk) sk.onclick = () => { save.streak = 0; persist(); const x = list[idx + 1] || list[0]; startPuzzle(x.id); };
}
function puzzleBestMove() {
  const p = P.cur, g = B.game;
  if (p.goal === "mate") return mateIn(g, p.n - P.userMoves);
  if (p.goal === "gain" || p.goal === "line") return g.find(p.line[P.i]);
  const r = think(g, { depth: 4, time: 700 });
  return r && r.move;
}
function puzzleHint() {
  if (B.locked) return;
  const m = puzzleBestMove();
  if (!m) return;
  P.hint++;
  if (P.hint === 1) { B.marks = new Set([m.from]); P.fb = { c: "info", t: `Indice : la pièce à jouer est ${POSS[m.piece.toLowerCase()]} ${NAME[m.piece.toLowerCase()]} en ${sqName(m.from)}.${P.cur.goal === "line" ? ` Thème : ${P.cur.t.toLowerCase()}.` : ""}` }; }
  else { if (P.cur.goal !== "convert") revAdd("ex:" + P.cur.id, { k: "ex", id: P.cur.id }); B.marks = new Set(); B.arrows = [[m.from, m.to]]; P.fb = { c: "info", t: "Voici le coup. Joue-le pour continuer." }; }
  render(); puzzlePanel();
}
function puzzleSolved() {
  P.solved = true; B.locked = true;
  const firstSolve = !save.puzzles[P.cur.id];
  save.puzzles[P.cur.id] = true;
  const clean = !P.errors && !P.hint;
  save.streak = clean ? (save.streak || 0) + 1 : 0;
  persist(); updateXp();
  sound(firstSolve ? "win" : "ok"); if (firstSolve && clean) celebrate();
  let why = "";
  if (P.cur.goal === "line") {
    const tags = P.cur.tags.filter(t => t !== "check").map(t => ({ fork: "fourchette", pin: "clouage", skewer: "enfilade", discovered: "attaque à la découverte", sacrifice: "sacrifice", capture: "pièce en prise", mate: "mat", promotion: "promotion" }[t])).filter(Boolean);
    if (tags.length) why = ` Motif : ${[...new Set(tags)].join(", ")}.`;
  }
  P.fb = { c: "ok", t: (clean ? `Résolu du premier coup !${save.streak > 1 ? ` Série de ${save.streak}.` : ""}` : "Résolu ! Tu retiendras le motif.") + why };
  puzzlePanel();
}
// Pourquoi un coup proposé ne marche pas : on regarde ce qu'il laisse en prise
function whyWrong(g, m) {
  try {
    g.undo();
    const facts = moveFacts(g, m);
    g.make(m);
    const bad = pickFacts(facts, ["hang", "ignore", "capBad"], "me", 1);
    return bad.length ? bad[0] + " " : "";
  } catch (e) { return ""; }
}
function puzzleMove(m) {
  const p = P.cur, g = B.game, u = uci(m);
  if (p.goal === "convert") return convertMove();
  let ok;
  if (p.goal === "mate") ok = g.status() === "mate" || forcedMate(g, p.n - P.userMoves - 1);
  else ok = u === p.line[P.i] || (p.line[P.i].length === 4 && u.startsWith(p.line[P.i])) || (p.goal === "line" && g.status() === "mate");
  if (!ok) {
    P.errors++; B.locked = true;
    if (P.errors === 1 && p.goal !== "convert") revAdd("ex:" + p.id, { k: "ex", id: p.id });
    const w = whyWrong(g, m);
    P.fb = { c: "bad", t: `${w}Ce n'est pas le bon coup. Cherche d'abord les échecs, les prises et les menaces.` };
    sound("error");
    puzzlePanel();
    later(() => { g.undo(); B.last = null; B.locked = false; render(); }, 1300);
    return;
  }
  P.userMoves++; P.i++;
  if (g.status() === "mate" || ((p.goal === "gain" || p.goal === "line") && P.i >= p.line.length)) return puzzleSolved();
  B.locked = true;
  P.fb = { c: "ok", t: "Bon coup ! Attends la réponse..." };
  puzzlePanel();
  later(() => {
    let r = p.goal === "gain" || p.goal === "line" ? g.find(p.line[P.i]) : null;
    if (!r) { const t = think(g, { depth: 3, time: 600 }); r = t && t.move; }
    P.i++;
    commit(r, true);
    B.locked = false;
    P.fb = { c: "info", t: "À toi. Continue !" };
    puzzlePanel();
  }, 600);
}
function convertMove() {
  const g = B.game;
  P.userMoves++;
  const st = g.status();
  if (st === "mate") { P.fb = null; puzzleSolved(); P.fb = { c: "ok", t: `Mat en ${P.userMoves} coups. Technique maîtrisée !` }; puzzlePanel(); return; }
  if (st) {
    B.locked = true;
    P.fb = { c: "bad", t: st === "stalemate" ? "Pat ! Le roi noir n'a plus de coup mais n'est pas en échec : nulle. Laisse-lui toujours une case." : "La pièce a été perdue, c'est nul. Recommence." };
    puzzlePanel(); return;
  }
  B.locked = true; P.fb = null; puzzlePanel();
  later(() => {
    const t = think(g, { depth: 3, time: 500 });
    commit(t.move, true);
    const s2 = g.status();
    if (s2) { P.fb = { c: "bad", t: "Le roi noir a pris ta pièce : nulle. Garde ta pièce protégée et recommence." }; B.locked = true; puzzlePanel(); return; }
    B.locked = false;
  }, 380);
}

// ---------- Jouer contre l'ordinateur, avec un coach ----------
// ---------- Moteur en arrière-plan (Web Worker, avec repli sur le fil principal) ----------
const Engine = (() => {
  let worker = null, seq = 0, local = null;
  const pending = new Map();
  try {
    const src = makeEngine.toString() + "\nconst E = makeEngine();\nonmessage = e => postMessage(E.handle(e.data));";
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    worker.onmessage = e => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data.res); } };
    worker.onerror = () => { worker = null; for (const [, p] of pending) p(null); pending.clear(); };
  } catch (e) { worker = null; }
  function run(job) {
    job.id = ++seq;
    job.fen = job.fen || START;
    return new Promise(res => {
      if (worker) { pending.set(job.id, res); worker.postMessage(job); return; }
      if (!local) local = makeEngine();
      // Sans Worker, on raccourcit les calculs pour ne pas figer la page
      if (job.time) job.time = Math.min(job.time, 600);
      setTimeout(() => { let r = null; try { r = local.handle(job).res; } catch (e) {} res(r); }, 15);
    });
  }
  return { run };
})();

// ---------- Jouer contre l'ordinateur, avec un coach ----------
const LEVELS = [
  { name: "Débutant", job: { time: 300, depth: 2, noise: 260, random: 0.15 } },
  { name: "Facile", job: { time: 500, depth: 3, noise: 100 } },
  { name: "Moyen", job: { time: 700, depth: 5, noise: 30 } },
  { name: "Fort", job: { time: 1200 } },
  { name: "Maître", job: { time: 2600 } }
];
const PL = Object.assign({ color: "w", level: 1, coach: true, live: true, stop: true, log: [], over: null, bal: 0 }, save.play || {});
Object.assign(PL, { gen: 0, ana: null, anaP: null, threat: null, review: null, brief: null, paused: false, thinking: false, hint: null });
function savePlay() { save.play = { color: PL.color, level: PL.level, coach: PL.coach, live: PL.live, stop: PL.stop, log: PL.log, over: PL.over, bal: PL.bal, gid: PL.gid, fen: PL.fen }; persist(); }
const ucis = () => PL.log.map(e => e.u);
// Partie depuis une position quelconque (problème, analyse, répertoire) : PL.fen
const plFen = () => PL.fen || START;
// Numéro du coup k (0 = premier coup joué) quand la partie part de fen : « 12. » ou « 12... »
function plyNum(fen, k) {
  const f = (fen || START).split(" "), idx = k + (f[1] === "b" ? 1 : 0);
  return `${(+f[5] || 1) + Math.floor(idx / 2)}${idx % 2 ? "..." : "."}`;
}
// Liste des coups en lignes de deux, en tenant compte d'un départ avec les Noirs
function moveRows(fen, n, cell) {
  const f = (fen || START).split(" "), off = f[1] === "b" ? 1 : 0, first = +f[5] || 1, rows = [];
  for (let i = -off; i < n; i += 2) rows.push(`<span class="n">${first + (i + off) / 2}.</span>${i < 0 ? "<span>…</span>" : cell(i)}${i + 1 < n ? cell(i + 1) : "<span></span>"}`);
  return rows;
}
const plTurnAt = n => ((plFen().split(" ")[1] === "w") === (n % 2 === 0) ? "w" : "b");
function playFrom(fen, color, log) {
  PL.fen = fen && fen !== START ? fen : null; PL.color = color;
  PL.log = log || []; PL.over = null; PL.bal = 0; PL.brief = null; PL.gid = Date.now().toString(36);
  savePlay();
  setMode("jouer");
}

// --- Outils d'analyse pour le coach ---
const FEM = { q: true, r: true };
const le = t => (FEM[t] ? "la " : "le ") + NAME[t];
const un = t => (FEM[t] ? "une " : "un ") + NAME[t];
const ton = t => (FEM[t] ? "ta " : "ton ") + NAME[t];
const Ton = t => (FEM[t] ? "Ta " : "Ton ") + NAME[t];
const pris = t => "pris" + (FEM[t] ? "e" : "");
function withTurn(g, turn) { const f = g.fen().split(" "); f[1] = turn; f[3] = "-"; return new Chess(f.join(" ")); }
// Pièces du camp c attaquées et insuffisamment défendues (comme si l'adversaire avait le trait)
function hangingOf(g, c) {
  const opp = c === "w" ? "b" : "w", h = withTurn(g, opp), out = new Map();
  for (const m of h.moves()) {
    if (!m.captured || colorOf(m.captured) !== c || m.flags === "e") continue;
    const t = m.captured.toLowerCase(), av = VAL[m.piece.toLowerCase()], tv = VAL[t];
    if (t === "k") continue;
    const defended = h.attacked(m.to, c);
    if (defended && av >= tv) continue;
    const prev = out.get(m.to);
    if (!prev || av < prev.av) out.set(m.to, { sq: m.to, t, tv, av, by: m.piece.toLowerCase(), defended, move: m });
  }
  return [...out.values()].sort((a, b) => b.tv - a.tv);
}
const minorsDeveloped = (g, c) => {
  const home = c === "w" ? { 57: "N", 62: "N", 58: "B", 61: "B" } : { 1: "n", 6: "n", 2: "b", 5: "b" };
  return Object.entries(home).filter(([sq, p]) => g.b[sq] !== p).length;
};
// Ce que fait un coup : liste de faits typés, calculés sur la position avant le coup
function moveFacts(g, m) {
  const c = colorOf(m.piece), opp = c === "w" ? "b" : "w", t = m.piece.toLowerCase(), F = [];
  const early = g.full <= 12;
  const hangBefore = hangingOf(g, c);
  const myKing = g.king(c);
  const prevOwn = g.hist.length >= 2 ? g.hist[g.hist.length - 2].m : null;
  const castleRights = c === "w" ? /[KQ]/.test(g.castle) : /[kq]/.test(g.castle);
  g.make(m, true);
  const replies = g.moves();
  if (!replies.length && g.inCheck()) F.push({ k: "mate" });
  else if (g.inCheck()) F.push({ k: "check" });
  if (m.captured) {
    const cap = m.captured.toLowerCase(), defended = g.attacked(m.to, opp);
    if (!defended) F.push({ k: "capFree", cap });
    else if (VAL[cap] > VAL[t] + 50) F.push({ k: "capWin", cap, by: t });
    else if (Math.abs(VAL[cap] - VAL[t]) <= 50) F.push({ k: "capEven", cap });
    else F.push({ k: "capBad", cap, by: t });
  }
  if (m.flags === "k" || m.flags === "q") F.push({ k: "castle" });
  if (early && (t === "n" || t === "b") && (m.from >> 3) === (c === "w" ? 7 : 0)) F.push({ k: "develop", p: t });
  if (early && t === "p" && ["d4", "e4", "d5", "e5"].includes(sqName(m.to)) && !m.captured) F.push({ k: "center" });
  if (t === "q" && g.full <= 7 && minorsDeveloped(g, c) < 2 && !m.captured) F.push({ k: "earlyQueen" });
  if (t === "k" && m.flags !== "k" && m.flags !== "q" && castleRights && g.full <= 20) F.push({ k: "kingWalk" });
  if (t === "p" && !m.captured && [5, 6, 7].includes(m.from & 7) && [62, 63, 6, 7].includes(myKing) && ((myKing >> 3) === (c === "w" ? 7 : 0))) F.push({ k: "shield" });
  if (early && prevOwn && t !== "p" && t !== "k" && prevOwn.to === m.from && !m.captured && !F.some(f => f.k === "check")) F.push({ k: "twice" });
  // Menaces créées par la pièce jouée
  const att = withTurn(g, c).pseudo(c).filter(x => x.from === m.to && x.captured && colorOf(x.captured) === opp);
  const targets = att.map(x => x.captured.toLowerCase()).filter((ct, i) => ct !== "k" && (!g.attacked(att[i].to, opp) || VAL[ct] > VAL[t]));
  const gives = F.some(f => f.k === "check" || f.k === "mate");
  if (targets.length + (gives ? 1 : 0) >= 2) F.push({ k: "fork", targets: (gives ? ["k"] : []).concat(targets) });
  else if (targets.length) F.push({ k: "threat", p: targets[0], sq: att.find(x => x.captured.toLowerCase() === targets[0]).to });
  // Pièces en prise après le coup
  const hangAfter = hangingOf(g, c);
  for (const h of hangBefore) {
    if (h.sq === m.from) { if (!hangAfter.some(a => a.sq === m.to)) F.push({ k: "saved", p: h.t }); continue; }
    if (hangAfter.some(a => a.sq === h.sq)) F.push({ k: "ignore", p: h.t, sq: h.sq });
    else F.push({ k: "defend", p: h.t, sq: h.sq });
  }
  for (const h of hangAfter) if (!hangBefore.some(b => b.sq === h.sq) || h.sq === m.to) {
    if (!F.some(f => f.k === "ignore" && f.sq === h.sq)) F.push({ k: "hang", p: h.t, sq: h.sq, by: h.by, defended: h.defended });
  }
  g.undo();
  // Pas de doublon : si la pièce qui prend reste en prise, « en prise » suffit
  if (F.some(f => f.k === "hang" && f.sq === m.to)) return F.filter(f => f.k !== "capBad");
  return F;
}
// Phrases : who = "me" (ton coup) ou "opp" (le coup de l'ordinateur)
function factText(f, who) {
  const me = who === "me";
  switch (f.k) {
    case "mate": return me ? "Échec et mat !" : "Échec et mat.";
    case "check": return me ? "Tu donnes échec : il doit d'abord sauver son roi." : "Il te donne échec : tu dois parer.";
    case "capFree": return me ? `Tu gagnes ${un(f.cap)} gratuitement.` : `Il prend ${ton(f.cap)} sans contrepartie.`;
    case "capWin": return me ? `Tu prends ${un(f.cap)} avec ${ton(f.by)} : échange gagnant.` : `Il prend ${ton(f.cap)} avec ${un(f.by)}.`;
    case "capEven": return me ? "Échange de pièces de même valeur." : `Il prend ${ton(f.cap)} : reprends pour rétablir l'équilibre.`;
    case "capBad": return me ? `Tu donnes ${ton(f.by)} contre ${un(f.cap)} : il peut reprendre.` : `Il donne ${un(f.by)} contre ${ton(f.cap)}.`;
    case "castle": return me ? "Tu roques : ton roi est à l'abri et ta tour entre en jeu." : "Il roque pour mettre son roi à l'abri.";
    case "develop": return me ? `Tu développes ${ton(f.p)} : une pièce de plus en jeu.` : `Il développe ${un(f.p)}.`;
    case "center": return me ? "Tu prends le centre avec un pion." : "Il prend sa part du centre.";
    case "earlyQueen": return me ? "Tu sors ta dame tôt : elle risque d'être chassée avec gain de temps." : "Il sort sa dame tôt : attaque-la en développant tes pièces.";
    case "kingWalk": return me ? "Ton roi bouge sans roquer : tu perds le droit de roquer." : "Son roi bouge : il ne pourra plus roquer.";
    case "shield": return me ? "Tu avances un pion devant ton roi roqué : son abri s'affaiblit." : "Il affaiblit l'abri de son roi.";
    case "twice": return me ? "Tu rejoues la même pièce : dans l'ouverture, développe plutôt les autres." : null;
    case "fork": return me ? `Fourchette ! Tu attaques ${f.targets.map(le).join(" et ")} en même temps.` : `Fourchette : il attaque ${f.targets.map(ton).join(" et ")} en même temps.`;
    case "threat": return me ? `Tu menaces ${le(f.p)} en ${sqName(f.sq)}.` : `Il menace ${ton(f.p)} en ${sqName(f.sq)}.`;
    case "saved": return me ? `Tu mets ${ton(f.p)} à l'abri.` : null;
    case "defend": return me ? `Tu protèges ${ton(f.p)} en ${sqName(f.sq)}.` : null;
    case "ignore": return me ? `Tu laisses ${ton(f.p)} en ${sqName(f.sq)} sous la menace.` : null;
    case "hang": return me ? `${Ton(f.p)} en ${sqName(f.sq)} peut être ${pris(f.p)}${f.by === "p" ? " par un pion" : f.defended ? ` par ${un(f.by)}` : " gratuitement"}.` : `Il laisse ${un(f.p)} en ${sqName(f.sq)} mal défendu : regarde si tu peux le prendre.`;
  }
  return null;
}
const GOOD = ["mate", "check", "capFree", "capWin", "fork", "threat", "castle", "saved", "defend", "develop", "center", "capEven"];
const BAD = ["hang", "ignore", "capBad", "earlyQueen", "kingWalk", "shield", "twice"];
const pickFacts = (F, keys, who, n) => keys.flatMap(k => F.filter(f => f.k === k)).map(f => factText(f, who)).filter(Boolean).slice(0, n);
// Qualité d'un coup selon la perte (en centipions) par rapport au meilleur coup
function quality(loss, best) {
  if (best || loss <= 20) return { cls: "q-best", c: "ok", word: "excellent" };
  if (loss <= 60) return { cls: "q-ok", c: "ok", word: "bon coup" };
  if (loss <= 140) return { cls: "q-dub", c: "warn", word: "imprécision" };
  if (loss <= 300) return { cls: "q-err", c: "bad", word: "erreur" };
  return { cls: "q-bad", c: "bad", word: "gaffe" };
}
function lossWords(loss) {
  if (loss >= 750) return "l'équivalent d'une dame";
  if (loss >= 420) return "l'équivalent d'une tour";
  if (loss >= 250) return "l'équivalent d'une pièce";
  if (loss >= 90) return "environ un pion";
  return "un peu de terrain";
}
// Lignes d'ouverture compatibles avec la partie. Le nom n'est donné que s'il n'y a pas d'ambiguïté.
function bookInfo(log) {
  if (PL.fen) return null;
  const us = log.map(e => e.u);
  const lines = L_OUV.filter(l => { const line = l.steps[1].moves; return us.length <= line.length && us.every((u, i) => line[i] === u); });
  if (!lines.length) return null;
  const names = [...new Set(lines.map(l => l.t))];
  const next = [...new Set(lines.map(l => l.steps[1].moves[us.length]).filter(Boolean))];
  return { name: names.length === 1 ? names[0] : null, next, line: lines[0].steps[1].moves };
}
const lc = s => s.charAt(0).toLowerCase() + s.slice(1);
// Rejoue une variante (liste UCI) sur une copie et renvoie les coups en notation française
function lineSans(g, pv, n) {
  const c = new Chess(g.fen()), out = [];
  for (const u of pv.slice(0, n)) { const m = c.find(u); if (!m) break; out.push(frSan(c.san(m))); c.make(m, true); }
  return out;
}
B.quality = m => {
  if (!PL.live || !PL.ana || B.game.turn !== PL.color || modeNow !== "jouer" || PL.paused) return "";
  const u = uci(m), x = PL.ana.map.get(u) || PL.ana.map.get(u.slice(0, 4) + "q");
  if (!x) return "";
  return quality(x.bound < 0 ? 999 : PL.ana.bestScore - x.score, u === PL.ana.best).cls;
};
function rebuildGame() {
  const g = new Chess(plFen());
  for (const e of PL.log) { const m = g.find(e.u); if (!m) break; g.make(m); }
  B.game = g;
  const lm = g.hist[g.hist.length - 1];
  B.last = lm ? [lm.m.from, lm.m.to] : null;
}
const sgn = () => (PL.color === "w" ? 1 : -1);
// --- Le tour du joueur : menace adverse puis analyse de tous les coups ---
function startTurn() {
  const gen = PL.gen, moves = ucis();
  PL.ana = null; PL.threat = null; PL.anaP = null;
  if (PL.over || B.game.turn !== PL.color || (!PL.coach && !PL.live)) return;
  Engine.run({ type: "threat", fen: plFen(), moves, time: 600 }).then(r => {
    if (gen !== PL.gen || PL.log.length !== moves.length) return;
    PL.threat = explainThreat(r);
    if (PL.live && PL.threat && PL.threat.arrow && !B.arrows.length) B.arrows = [PL.threat.arrow];
    render(); if (modeNow === "jouer") playPanel();
  });
  PL.anaP = Engine.run({ type: "analyse", fen: plFen(), moves, time: 1500 }).then(r => {
    if (!r) return null;
    const ana = { best: r.best, bestScore: r.bestScore, depth: r.depth, pv: r.pv, map: new Map(r.moves.map(x => [x.u, x])) };
    if (gen === PL.gen && PL.log.length === moves.length) {
      PL.ana = ana; PL.bal = sgn() * ana.bestScore;
      render(); if (modeNow === "jouer") playPanel();
    }
    return ana;
  });
}
function explainThreat(r) {
  if (!r || !r.pv || !r.pv.length) return null;
  const g = B.game, me = PL.color, opp = me === "w" ? "b" : "w";
  const gain = r.score + (r.base || 0);
  const h = withTurn(g, opp), m = h.find(r.pv[0]);
  if (!m) return null;
  const san = frSan(h.san(m));
  if (r.score >= Engine_MATE - 200) {
    const n = Math.ceil((Engine_MATE - r.score) / 2);
    return { text: `Il menace mat${n <= 1 ? " en un coup" : ` en ${n} coups`}, en commençant par <b>${san}</b>.`, arrow: [m.from, m.to, "red"], strong: true };
  }
  if (gain < 140) return null;
  const why = pickFacts(moveFacts(h, m), ["fork", "capFree", "capWin", "check", "threat", "capEven"], "opp", 1);
  return { text: `Menace : <b>${san}</b>${why.length ? " — " + lc(why[0]) : ""} Si tu ne fais rien, tu perds ${lossWords(gain)}.`, arrow: [m.from, m.to, "red"], strong: gain >= 250 };
}
const Engine_MATE = 30000;
// --- Briefing après le coup de l'ordinateur ---
function makeBrief(oppSan, oppFacts) {
  const items = [];
  if (oppSan) {
    const txt = pickFacts(oppFacts, ["mate", "check", "capFree", "capWin", "capEven", "capBad", "fork", "threat", "castle", "develop", "center", "earlyQueen", "kingWalk", "hang"], "opp", 2);
    const bk = bookInfo(PL.log);
    items.push(`Il a joué <b>${frSan(oppSan)}</b>. ${txt.length ? txt.join(" ") : bk ? `Coup de théorie${bk.name ? ` (${bk.name})` : ""}.` : "Pas de menace directe : demande-toi ce qu'il prépare."}`);
  }
  return { items, book: bookInfo(PL.log) };
}
function playView() {
  if (AN.g) { AN.run++; AN.g = null; }
  resetBoard(plFen(), { flip: PL.color === "b", canMove: sq => colorOf(B.game.b[sq]) === PL.color, onMove: playMove, captured: true, names: PL.color === "w" ? { w: "Toi", b: "Ordinateur" } : { w: "Ordinateur", b: "Toi" } });
  PL.gen++;
  rebuildGame();
  B.locked = !!PL.over;
  Object.assign(PL, { review: null, paused: false, ana: null, threat: null, thinking: false, hint: null });
  if (!PL.brief) PL.brief = makeBrief(null, []);
  render(); panelEnter(); playPanel();
  if (!PL.over) { if (B.game.turn === PL.color) startTurn(); else aiMove(); }
}
function newGame(color) {
  PL.color = color === "r" ? (Math.random() < 0.5 ? "w" : "b") : color;
  PL.log = []; PL.over = null; PL.bal = 0; PL.brief = null; PL.gid = Date.now().toString(36); PL.fen = null;
  savePlay();
  playView();
}
function coachHTML() {
  if (!PL.coach) return "";
  const parts = [];
  const r = PL.review;
  if (r && r.pending) parts.push(`<div class="coach-card info"><div class="coach-title"><span class="verdict info"><i class="spin"></i>analyse</span><b>${r.san}</b></div><p class="calm">Le coach calcule les réponses possibles...</p></div>`);
  else if (r) parts.push(`<div class="coach-card ${r.c}">
      <div class="coach-title"><span class="verdict ${r.c}">${r.word}</span><b>${r.san}</b>${r.score != null ? `<span class="coach-score">${fmtScore(r.score)}</span>` : ""}</div>
      ${r.reasons.length ? `<ul>${r.reasons.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}
      ${r.better ? `<p class="coach-better">${r.better}</p>` : ""}
      ${PL.paused ? `<div class="row"><button class="btn primary" id="takeback">Reprendre ce coup</button><button class="btn" id="goon">Continuer quand même</button></div>` : ""}
    </div>`);
  const br = PL.brief;
  if (!PL.paused && !PL.over && B.game.turn === PL.color && !PL.thinking) {
    const body = [];
    if (br) for (const it of br.items) body.push(`<p>${it}</p>`);
    if (PL.threat) body.push(`<p class="threat${PL.threat.strong ? " strong" : ""}">${PL.threat.text}</p>`);
    const hang = hangingOf(B.game, PL.color).slice(0, 2);
    for (const h of hang) if (!PL.threat || !PL.threat.text.includes(sqName(h.sq))) body.push(`<p class="threat">${Ton(h.t)} en ${sqName(h.sq)} est attaqué${FEM[h.t] ? "e" : ""} par ${un(h.by)} et n'est pas assez défendu${FEM[h.t] ? "e" : ""}.</p>`);
    if (!PL.threat && !hang.length && PL.log.length && PL.ana) body.push(`<p class="calm">Rien n'est menacé. Améliore ta pièce la moins active ou crée une menace.</p>`);
    if (br && br.book && br.book.next.length) {
      const sans = br.book.next.map(u => { const m = B.game.find(u); return m ? `<b>${frSan(B.game.san(m))}</b>` : null; }).filter(Boolean);
      const list = sans.length > 1 ? sans.slice(0, -1).join(", ") + " ou " + sans[sans.length - 1] : sans[0];
      body.push(`<p class="book">Théorie${br.book.name ? ` (${br.book.name})` : ""} : on joue ici ${list}.</p>`);
    }
    if (!PL.ana) body.push(`<p class="calm"><i class="spin"></i> Le coach analyse la position...</p>`);
    if (PL.hint) body.push(`<p class="hint-line">${PL.hint}</p>`);
    parts.push(`<div class="coach-card brief"><div class="coach-title"><span class="verdict info">à toi</span><b>Ce qu'il faut voir</b></div>${body.join("")}</div>`);
  }
  return parts.length ? `<div class="coach">${parts.join("")}</div>` : "";
}
function fmtScore(v) {
  // Score affiché du point de vue des Blancs, en pions
  const w = sgn() * v;
  if (Math.abs(w) > Engine_MATE - 200) return (w > 0 ? "+" : "−") + "M" + Math.ceil((Engine_MATE - Math.abs(w)) / 2);
  return (w >= 0 ? "+" : "−") + (Math.abs(w) / 100).toFixed(1).replace(".", ",");
}
function playPanel() {
  const g = B.game, lvl = LEVELS[PL.level] || LEVELS[1];
  let status;
  if (PL.over) status = { c: PL.over.c, t: PL.over.t };
  else if (PL.paused) status = { c: "warn", t: "Le coach a mis la partie en pause : regarde les flèches. Rouge = sa réponse, vert = le bon coup." };
  else if (PL.thinking) status = { c: "info", t: `<i class="spin"></i> L'ordinateur (${lvl.name}) réfléchit...` };
  else status = { c: "info", t: g.turn === PL.color ? (g.inCheck() ? "<b>Échec !</b> Protège ton roi." : "À toi de jouer.") : "Au tour de l'ordinateur." };
  const cur = j => (j === PL.log.length - 1 ? ' class="cur"' : "");
  const q = j => PL.log[j] && PL.log[j].q ? ` data-q="${PL.log[j].q}"` : "";
  const rows = moveRows(PL.fen, PL.log.length, j => `<span${cur(j)}${q(j)}>${frSan(PL.log[j].san)}</span>`);
  const rec = save.record, book = bookInfo(PL.log);
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><p class="eyebrow">Partie avec coach</p>${book && book.name && PL.log.length ? `<span class="pill">${book.name}</span>` : ""}</div>
    <div class="fb ${status.c}">${status.t}</div>
    ${PL.over && save.games[0] && save.games[0].id === PL.gid ? `<div class="row"><button class="btn primary big" id="analyse">${ICON.chart}Analyser la partie</button></div>` : ""}
    ${coachHTML()}
    <div class="row">
      <button class="btn" id="hint" ${PL.over || PL.thinking || PL.paused || g.turn !== PL.color ? "disabled" : ""}>${ICON.bulb}Indice</button>
      <button class="btn" id="undo" ${PL.thinking || !PL.log.length ? "disabled" : ""}>${ICON.undo}Reprendre</button>
      <button class="btn" id="flip">${ICON.flip}Retourner</button>
      ${PL.over ? "" : `<button class="btn" id="resign" ${!PL.log.length ? "disabled" : ""}>${ICON.flag}Abandonner</button>`}
    </div>
    <div class="toggles">
      <label class="switch"><input type="checkbox" id="coach" ${PL.coach ? "checked" : ""}> Coach : explique chaque coup</label>
      <label class="switch"><input type="checkbox" id="live" ${PL.live ? "checked" : ""}> Aide en direct : cases colorées et menaces</label>
      <label class="switch"><input type="checkbox" id="stop" ${PL.stop ? "checked" : ""}> Pause sur mes erreurs</label>
    </div>
    ${PL.live ? `<p class="legend"><i class="q-best"></i>excellent <i class="q-ok"></i>bon <i class="q-dub"></i>imprécis <i class="q-bad"></i>erreur <span>· prends une pièce pour voir ses coups</span></p>` : ""}
    <div class="settings">
      <div class="field"><span>Niveau de l'ordinateur</span><div class="seg" role="group" aria-label="Niveau">${LEVELS.map((l, i) => `<button aria-pressed="${i === PL.level}" data-lvl="${i}">${l.name}</button>`).join("")}</div></div>
      <div class="field"><span>Nouvelle partie avec</span><div class="row">
        <button class="btn" data-new="w">Les Blancs</button><button class="btn" data-new="b">Les Noirs</button><button class="btn" data-new="r">Au hasard</button>
      </div></div>
    </div>
    <div class="moves" id="moves">${rows.join("")}</div>
    <div class="row" style="justify-content:space-between;align-items:center"><div class="stats"><span>Victoires <b>${rec.w}</b></span><span>Nulles <b>${rec.d}</b></span><span>Défaites <b>${rec.l}</b></span></div><button class="btn" id="games">${ICON.chart}Mes parties</button></div>`;
  const mv = $("#moves"); mv.scrollTop = mv.scrollHeight;
  panel.querySelectorAll("[data-lvl]").forEach(b => b.onclick = () => { PL.level = +b.dataset.lvl; savePlay(); playPanel(); });
  panel.querySelectorAll("[data-new]").forEach(b => b.onclick = () => newGame(b.dataset.new));
  $("#hint").onclick = playHint;
  $("#undo").onclick = playUndo;
  const an = $("#analyse"); if (an) { an.onclick = () => openAnalysis(PL.gid); an.focus({ preventScroll: true }); }
  const gl = $("#games"); if (gl) gl.onclick = () => setMode("analyse");
  $("#flip").onclick = () => { B.flip = !B.flip; render(); };
  const rs = $("#resign"); if (rs) rs.onclick = () => endGame("l", "Tu as abandonné. La prochaine sera la bonne !");
  $("#coach").onchange = e => { PL.coach = e.target.checked; savePlay(); playPanel(); if (!PL.anaP && !PL.over && B.game.turn === PL.color) startTurn(); };
  $("#live").onchange = e => { PL.live = e.target.checked; if (PL.live && !PL.anaP && !PL.over && B.game.turn === PL.color) startTurn(); if (!PL.live) B.arrows = B.arrows.filter(a => a !== (PL.threat && PL.threat.arrow)); savePlay(); render(); playPanel(); };
  $("#stop").onchange = e => { PL.stop = e.target.checked; savePlay(); };
  const tb = $("#takeback"); if (tb) tb.onclick = () => { PL.paused = false; playUndo(); };
  const go = $("#goon"); if (go) go.onclick = () => { PL.paused = false; B.arrows = []; render(); aiMove(); };
  updateEvalBar();
}
function updateEvalBar() {
  const bar = $("#evalbar");
  if (!bar) return;
  bar.hidden = !(modeNow === "jouer" || (modeNow === "analyse" && AN.g));
  $("#board-col").classList.toggle("with-eval", !bar.hidden);
  const v = PL.bal, pct = Math.abs(v) > Engine_MATE - 200 ? (v > 0 ? 100 : 0) : Math.max(3, Math.min(97, 50 + 50 * Math.tanh(v / 500)));
  bar.style.setProperty("--w", pct + "%");
  bar.classList.toggle("flipped", B.flip);
  const lab = $("#evalbar-label");
  if (lab) lab.textContent = Math.abs(v) > Engine_MATE - 200 ? "M" + Math.ceil((Engine_MATE - Math.abs(v)) / 2) : (Math.abs(v) / 100).toFixed(1).replace(".", ",");
}
function playHint() {
  if (PL.thinking || PL.over || PL.paused) return;
  const gen = PL.gen, n = PL.log.length;
  PL.hint = `<i class="spin"></i> Le coach cherche le meilleur coup...`; playPanel();
  Engine.run({ type: "search", fen: plFen(), moves: ucis(), time: 1200 }).then(r => {
    if (gen !== PL.gen || n !== PL.log.length || !r || !r.move) return;
    const g = B.game, m = g.find(r.move);
    if (!m) return;
    B.arrows = [[m.from, m.to]];
    const why = pickFacts(moveFacts(g, m), GOOD, "me", 2);
    const cont = lineSans(g, r.pv, 4);
    PL.hint = `Indice : <b>${frSan(g.san(m))}</b>. ${why.length ? why.join(" ") : "C'est le coup qui garde le mieux l'équilibre."}${cont.length > 1 ? ` Suite probable : ${cont.join(" ")}.` : ""}`;
    render(); playPanel();
  });
}
function playUndo() {
  if (!PL.log.length) return;
  PL.gen++;
  PL.log.pop();
  while (PL.log.length && plTurnAt(PL.log.length) !== PL.color) PL.log.pop();
  Object.assign(PL, { over: null, review: null, paused: false, thinking: false, hint: null, brief: makeBrief(null, []) });
  savePlay();
  rebuildGame(); B.locked = false; B.sel = null; B.arrows = [];
  render(); playPanel();
  if (B.game.turn === PL.color) startTurn(); else aiMove();
}
function endGame(res, text) {
  PL.gen++;
  PL.over = { r: res, c: res === "w" ? "ok" : res === "d" ? "warn" : "bad", t: text };
  save.record[res]++; updateXp();
  archiveGame(res);
  dayInc("les");
  B.locked = true; PL.thinking = false;
  savePlay(); playPanel();
  if (res === "w") celebrate();
  sound(res === "w" ? "win" : "end");
}
function checkOver() {
  const g = B.game, st = g.status();
  if (!st) return false;
  if (st === "mate") {
    const userWon = g.turn !== PL.color;
    endGame(userWon ? "w" : "l", userWon ? "Échec et mat ! Tu as gagné." : "Échec et mat. L'ordinateur gagne cette fois-ci.");
  } else {
    const why = { stalemate: "Pat", fifty: "Règle des 50 coups", insufficient: "Matériel insuffisant pour mater", repetition: "Triple répétition" }[st];
    endGame("d", `Partie nulle : ${why}.`);
  }
  return true;
}
// Revue du coup du joueur : ana = analyse de la position d'avant, s = recherche après le coup (point de vue adverse)
function buildReview(m, san, ana, s) {
  const g = B.game, entry = PL.log[PL.log.length - 1];
  const userScore = s && s.move ? -s.score : (g.inCheck() ? Engine_MATE : 0);
  const isBest = !!ana && uci(m) === ana.best;
  const bestScore = ana ? Math.max(ana.bestScore, userScore) : userScore;
  const loss = isBest ? 0 : Math.max(0, bestScore - userScore);
  PL.bal = sgn() * userScore;
  g.undo();
  const facts = moveFacts(g, m);
  const bestM = ana && ana.best ? g.find(ana.best) : null;
  const bestSan = bestM ? frSan(g.san(bestM)) : null, bestFacts = bestM ? moveFacts(g, bestM) : [];
  g.make(m);
  const q = quality(loss, isBest);
  const res = { c: q.c, word: q.word, san: frSan(san), reasons: [], better: null, arrows: [], score: userScore, loss };
  entry.q = q.cls;
  const book = bookInfo(PL.log);
  if (book && loss < 90) { res.c = "ok"; res.word = "théorie"; res.reasons.push(book.name ? `Coup de théorie : ${lc(book.name)}.` : "Coup d'ouverture classique, joué par les champions."); entry.q = "q-best"; }
  if (ana && ana.bestScore >= Engine_MATE - 200 && userScore < Engine_MATE - 200) {
    res.c = "bad"; res.word = "mat manqué"; entry.q = "q-bad";
    res.reasons.push(`Tu avais un mat forcé en ${Math.ceil((Engine_MATE - ana.bestScore) / 2)} coup(s) !`);
    res.better = `Il fallait jouer <b>${bestSan}</b>.`;
    if (bestM) res.arrows = [[bestM.from, bestM.to]];
    return res;
  }
  if (userScore >= Engine_MATE - 200) { res.reasons.push(`Mat forcé en ${Math.ceil((Engine_MATE - userScore) / 2)} coup(s) : continue comme ça !`); return res; }
  if (q.c === "ok") {
    res.reasons.push(...pickFacts(facts, GOOD, "me", 3));
    if (PL.lastThreat && loss < 60) res.reasons.unshift(`Tu pares la menace ${PL.lastThreat}.`);
    if (!res.reasons.length) res.reasons.push("Coup solide : tu ne laisses rien et tu gardes l'équilibre.");
    const bad = pickFacts(facts, ["shield", "earlyQueen", "twice"], "me", 1);
    if (bad.length && res.word !== "théorie") res.reasons.push("À surveiller : " + lc(bad[0]));
    if (!isBest && q.cls === "q-ok" && bestSan) res.better = `${bestSan} était encore un peu plus précis.`;
    return res;
  }
  // Coup faible : pourquoi ?
  res.reasons.push(...pickFacts(facts, BAD, "me", 2));
  if (s && s.pv && s.pv.length) {
    const rm = g.find(s.pv[0]);
    if (rm) {
      const rf = pickFacts(moveFacts(g, rm), ["mate", "fork", "capFree", "capWin", "check", "threat", "capEven"], "opp", 1);
      const seq = lineSans(g, s.pv, 4);
      res.reasons.push(`Sa meilleure réponse : <b>${seq[0]}</b>${rf.length ? " — " + lc(rf[0]) : "."}${seq.length > 1 ? ` Suite probable : ${seq.join(" ")}.` : ""}`);
      res.arrows.push([rm.from, rm.to, "red"]);
    }
  }
  if (userScore <= -Engine_MATE + 200) res.reasons.push("Il a maintenant un mat forcé.");
  else res.reasons.push(`Bilan : tu perds ${lossWords(loss)}.`);
  if (bestSan) {
    const bw = pickFacts(bestFacts, GOOD, "me", 2);
    res.better = `Mieux : <b>${bestSan}</b>${bw.length ? " — " + lc(bw.join(" ")) : "."}`;
    res.arrows.push([bestM.from, bestM.to]);
  }
  return res;
}
function playMove(m, san) {
  PL.lastThreat = PL.threat && PL.threat.text ? (PL.threat.text.match(/<b>([^<]+)<\/b>/) || [])[1] : null;
  PL.log.push({ u: uci(m), san });
  Object.assign(PL, { review: PL.coach ? { pending: true, san: frSan(san) } : null, brief: null, threat: null, hint: null });
  B.arrows = [];
  savePlay();
  if (checkOver()) { PL.review = null; playPanel(); return; }
  if (!PL.coach) { aiMove(); return; }
  B.locked = true;
  playPanel();
  const gen = PL.gen, anaP = PL.anaP || Promise.resolve(null);
  Promise.all([anaP, Engine.run({ type: "search", fen: plFen(), moves: ucis(), time: 1100 })]).then(([ana, s]) => {
    if (gen !== PL.gen) return;
    try { PL.review = buildReview(m, san, ana, s); } catch (e) { PL.review = null; }
    savePlay();
    const r = PL.review;
    if (r && PL.stop && r.c === "bad") {
      PL.paused = true; B.locked = true; B.arrows = r.arrows;
      render(); playPanel();
      sound("error");
      return;
    }
    B.arrows = [];
    aiMove();
  });
}
function aiMove() {
  const gen = PL.gen;
  PL.thinking = true; B.locked = true; render(); playPanel();
  const g = B.game, n = PL.log.length;
  // L'ordinateur suit souvent la théorie des ouvertures étudiées
  const book = n < 16 && !PL.fen ? L_OUV.map(l => l.steps[1].moves).filter(line => n < line.length && PL.log.every((e, i) => line[i] === e.u)) : [];
  const fromBook = book.length && Math.random() < 0.85 ? book[(Math.random() * book.length) | 0][n] : null;
  const t0 = Date.now();
  const p = fromBook ? Promise.resolve({ move: fromBook }) : Engine.run(Object.assign({ type: "play", fen: plFen(), moves: ucis() }, (LEVELS[PL.level] || LEVELS[1]).job));
  p.then(r => {
    later(() => {
      if (gen !== PL.gen) return;
      PL.thinking = false;
      const mv = r && r.move ? g.find(r.move) : null;
      if (!mv) { if (!checkOver()) playPanel(); return; }
      const san = g.san(mv), facts = moveFacts(g, mv);
      PL.log.push({ u: uci(mv), san });
      commit(mv, true);
      B.locked = false;
      savePlay();
      if (checkOver()) { render(); return; }
      PL.brief = makeBrief(san, facts);
      render(); playPanel();
      startTurn();
    }, Math.max(0, 450 - (Date.now() - t0)));
  });
}

// ---------- Problèmes : entraînement classé, série et tempête, comme sur Lichess ----------
// Source : la base de Lichess (LICHESS, classements réels issus de millions de parties) si elle est présente,
// sinon les problèmes tirés de parties du moteur (MINED, classements estimés).
const PZ_THEMES = {
  capture: "Pièce en prise", discovered: "Découverte", check: "Échec",
  fork: "Fourchette", pin: "Clouage", skewer: "Enfilade", discoveredAttack: "Attaque à la découverte", doubleCheck: "Échec double",
  deflection: "Déviation", attraction: "Attraction", clearance: "Dégagement", interference: "Interférence", intermezzo: "Coup intermédiaire",
  xRayAttack: "Attaque en rayons X", sacrifice: "Sacrifice", trappedPiece: "Pièce piégée", capturingDefender: "Capture du défenseur",
  hangingPiece: "Pièce en prise", quietMove: "Coup calme", defensiveMove: "Coup défensif", zugzwang: "Zugzwang",
  advancedPawn: "Pion avancé", promotion: "Promotion", underPromotion: "Sous-promotion", enPassant: "Prise en passant", castling: "Roque",
  exposedKing: "Roi exposé", kingsideAttack: "Attaque à l'aile roi", queensideAttack: "Attaque à l'aile dame", attackingF2F7: "Attaque sur f2 ou f7",
  mate: "Mat", mateIn1: "Mat en 1", mateIn2: "Mat en 2", mateIn3: "Mat en 3", mateIn4: "Mat en 4", mateIn5: "Mat en 5 ou plus",
  backRankMate: "Mat du couloir", smotheredMate: "Mat étouffé", anastasiaMate: "Mat d'Anastasie", arabianMate: "Mat arabe",
  bodenMate: "Mat de Boden", doubleBishopMate: "Mat des deux fous", dovetailMate: "Mat en queue d'aronde", hookMate: "Mat de l'hameçon",
  killBoxMate: "Mat de la boîte", vukovicMate: "Mat de Vukovic", cornerMate: "Mat du coin", operaMate: "Mat de l'Opéra",
  morphysMate: "Mat de Morphy", pillsburysMate: "Mat de Pillsbury", balestraMate: "Mat de la baliste", blindSwineMate: "Mat des cochons aveugles",
  triangleMate: "Mat du triangle", epauletteMate: "Mat des épaulettes", swallowstailMate: "Mat en queue d'hirondelle",
  opening: "Ouverture", middlegame: "Milieu de partie", endgame: "Finale", pawnEndgame: "Finale de pions", rookEndgame: "Finale de tours",
  bishopEndgame: "Finale de fous", knightEndgame: "Finale de cavaliers", queenEndgame: "Finale de dames", queenRookEndgame: "Finale dame et tour",
  oneMove: "En un coup", short: "Court (2 coups)", long: "Long (3 coups)", veryLong: "Très long (4 coups ou plus)",
  advantage: "Avantage", crushing: "Écrasant", equality: "Égalité", master: "Parties de maîtres", masterVsMaster: "Maître contre maître", superGM: "Parties de super GM"
};
// Thèmes proposés dans le filtre, par famille (seuls ceux qui ont assez de problèmes s'affichent)
const PZ_GROUPS = [
  ["Motifs", ["fork", "pin", "skewer", "discoveredAttack", "doubleCheck", "deflection", "attraction", "clearance", "interference", "intermezzo", "xRayAttack", "sacrifice", "trappedPiece", "capturingDefender", "hangingPiece", "quietMove", "defensiveMove", "zugzwang", "exposedKing", "kingsideAttack", "queensideAttack", "attackingF2F7", "advancedPawn", "promotion", "underPromotion", "enPassant", "capture", "discovered"]],
  ["Mats", ["mate", "mateIn1", "mateIn2", "mateIn3", "mateIn4", "mateIn5", "backRankMate", "smotheredMate", "anastasiaMate", "arabianMate", "bodenMate", "doubleBishopMate", "dovetailMate", "hookMate", "killBoxMate", "vukovicMate", "cornerMate", "operaMate", "morphysMate", "pillsburysMate", "balestraMate", "blindSwineMate", "triangleMate", "epauletteMate", "swallowstailMate"]],
  ["Phase de jeu", ["opening", "middlegame", "endgame", "pawnEndgame", "rookEndgame", "bishopEndgame", "knightEndgame", "queenEndgame", "queenRookEndgame"]],
  ["Longueur", ["oneMove", "short", "long", "veryLong"]],
  ["Origine", ["master", "masterVsMaster", "superGM"]]
];
// Thèmes trop généraux pour le bilan par thème du tableau de bord
const PZ_MINOR = new Set(["check", "oneMove", "short", "long", "veryLong", "advantage", "crushing", "equality", "master", "masterVsMaster", "superGM", "mateIn1", "mateIn2", "mateIn3", "mateIn4", "mateIn5"]);
function pzHash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); }
const PZ_LICHESS = typeof LICHESS !== "undefined" && LICHESS.length > 0;
const PZ = (PZ_LICHESS
  ? LICHESS.map(s => {
    const [id, before, mv, r, rd, th] = s.split(","), moves = mv.split(" ");
    return { id, before, last: moves[0], line: moves.slice(1), r: +r, rd: +rd, tags: th.split(".").map(i => LICHESS_THEMES[parseInt(i, 36)]), side: before.split(" ")[1] === "w" ? "b" : "w", n: moves.length >> 1, lichess: true };
  })
  : (typeof MINED !== "undefined" ? MINED : []).filter(m => m.r).map(m => ({
    id: pzHash(m.fen), fen: m.fen, before: m.before, last: m.last, line: m.line, r: m.r, rd: 150, tags: m.tags,
    side: m.fen.split(" ")[1], n: Math.ceil(m.line.length / 2)
  }))).sort((a, b) => a.r - b.r);
const PZ_BY_ID = new Map(PZ.map(p => [p.id, p]));
const PZ_COUNT = {};
for (const p of PZ) for (const t of p.tags) PZ_COUNT[t] = (PZ_COUNT[t] || 0) + 1;
// Position où le joueur doit trouver le coup (après le coup adverse)
function pzFen(p) {
  if (!p.fen) { const g = new Chess(p.before), m = g.find(p.last); if (m) g.make(m); p.fen = g.fen(); }
  return p.fen;
}
if (!save.pz) save.pz = {};
const PS = Object.assign({ r: 1500, n: 0, ok: 0, hist: [], seen: {}, th: {}, streakBest: 0, stormBest: 0, diff: 0, theme: "all", auto: false, rs: [] }, save.pz);
save.pz = PS;
// Passage au classement Glicko-2 : on garde l'ancien classement comme point de départ, avec une forte incertitude
if (PS.rd == null) {
  if (PS.n >= 10) { PS.rf = PS.r; PS.rd = 250; } else { PS.rf = PS.r = 1500; PS.rd = 500; PS.rs = []; }
  PS.vol = 0.09;
  PS.diff = PS.diff < 0 ? -300 : PS.diff > 0 ? 300 : 0;
  if (PS.theme !== "all" && !PZ_COUNT[PS.theme]) PS.theme = "all";
}
PS.hist = PS.hist.filter(h => PZ_BY_ID.has(h.id));
if (!PS.rs.length) PS.rs = [PS.r];
const Q = { mode: "train", cur: null, i: 0, failed: false, done: false, rated: true, delta: null, solution: false, streak: 0, storm: null, review: false };
const pzSide = p => (p.side === "w" ? "Blancs" : "Noirs");
// Classement Glicko-2, comme sur Lichess : chaque problème est un adversaire dont on connaît le classement
// et l'incertitude. Un joueur nouveau (grande incertitude) bouge vite, puis se stabilise.
const G2 = { scale: 173.7178, tau: 0.75, minRd: 45, maxRd: 500, maxVol: 0.1 };
function glicko2(r, rd, vol, or, ord, score) {
  const S = G2.scale, mu = (r - 1500) / S, phi = rd / S, muj = (or - 1500) / S, phij = ord / S;
  const g = 1 / Math.sqrt(1 + (3 * phij * phij) / (Math.PI * Math.PI));
  const E = 1 / (1 + Math.exp(-g * (mu - muj)));
  const v = 1 / (g * g * E * (1 - E));
  const delta = v * g * (score - E);
  // Nouvelle volatilité (algorithme d'Illinois, étape 5 de Glickman)
  const a = Math.log(vol * vol), t2 = G2.tau * G2.tau;
  const f = x => { const ex = Math.exp(x), d = phi * phi + v + ex; return (ex * (delta * delta - phi * phi - v - ex)) / (2 * d * d) - (x - a) / t2; };
  let A = a, Bv;
  if (delta * delta > phi * phi + v) Bv = Math.log(delta * delta - phi * phi - v);
  else { let k = 1; while (f(a - k * G2.tau) < 0 && k < 50) k++; Bv = a - k * G2.tau; }
  let fA = f(A), fB = f(Bv);
  for (let i = 0; i < 60 && Math.abs(Bv - A) > 1e-6; i++) {
    const C = A + ((A - Bv) * fA) / (fB - fA), fC = f(C);
    if (fC * fB <= 0) { A = Bv; fA = fB; } else fA /= 2;
    Bv = C; fB = fC;
  }
  const vol2 = Math.min(G2.maxVol, Math.exp(A / 2));
  const phiStar = Math.sqrt(phi * phi + vol2 * vol2);
  const phi2 = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  return { r: 1500 + S * (mu + phi2 * phi2 * g * (score - E)), rd: Math.max(G2.minRd, Math.min(G2.maxRd, S * phi2)), vol: vol2 };
}
// L'incertitude remonte un peu pendant les jours sans jouer
function pzDecay() {
  const today = Math.floor(Date.now() / 864e5), days = PS.day ? today - PS.day : 0;
  if (days > 0) { const phi = PS.rd / G2.scale; PS.rd = Math.min(G2.maxRd, G2.scale * Math.sqrt(phi * phi + days * PS.vol * PS.vol)); }
  PS.day = today;
}
const pzProvisional = () => PS.rd > 110;
const pzRatingText = () => PS.r + (pzProvisional() ? "?" : "");
function pzUpdate(p, win) {
  pzDecay();
  const n = glicko2(PS.rf, PS.rd, PS.vol, p.r, p.rd || 80, win ? 1 : 0);
  const before = PS.r;
  PS.rf = Math.max(400, n.r); PS.rd = n.rd; PS.vol = n.vol;
  PS.r = Math.round(PS.rf);
  const d = PS.r - before;
  PS.n++; if (win) PS.ok++;
  PS.seen[p.id] = win ? 1 : 0;
  dayInc("pz");
  if (!win) revAdd("pz:" + p.id, { k: "pz", id: p.id });
  for (const t of new Set(p.tags)) { if (PZ_MINOR.has(t)) continue; const x = PS.th[t] || [0, 0]; x[1]++; if (win) x[0]++; PS.th[t] = x; }
  PS.hist.unshift({ id: p.id, ok: win, d }); PS.hist = PS.hist.slice(0, 40);
  PS.rs.push(PS.r); PS.rs = PS.rs.slice(-80);
  persist(); updateXp();
  return d;
}
// Comme Lichess : un problème jamais vu, le plus proche possible du niveau visé
function pzPick(target, pool, avoid) {
  const fresh = pool.filter(p => PS.seen[p.id] === undefined && p !== avoid);
  const list = fresh.length ? fresh : pool.filter(p => p !== avoid);
  if (!list.length) return null;
  const near = list.slice().sort((a, b) => Math.abs(a.r - target) - Math.abs(b.r - target)).slice(0, 6);
  return near[(Math.random() * near.length) | 0];
}
const PZ_DIFF = [[-600, "Le plus facile"], [-300, "Plus facile"], [0, "Normal"], [300, "Plus difficile"], [600, "Le plus difficile"]];
const pzPool = () => (PS.theme === "all" ? PZ : PZ.filter(p => p.tags.includes(PS.theme)));
function pzThemeOptions() {
  const opt = t => `<option value="${t}" ${PS.theme === t ? "selected" : ""}>${PZ_THEMES[t]} (${PZ_COUNT[t]})</option>`;
  return `<option value="all">Tous les thèmes (${PZ.length})</option>` +
    PZ_GROUPS.map(([g, ts]) => { const ok = ts.filter(t => PZ_COUNT[t] >= 8 && PZ_THEMES[t]); return ok.length ? `<optgroup label="${g}">${ok.map(opt).join("")}</optgroup>` : ""; }).join("");
}
function problemsView() {
  if (Q.mode === "storm" && Q.storm && Q.storm.running) return;
  if (Q.mode === "streak") return streakStart();
  if (Q.mode === "storm") return stormHome();
  pzNext();
}
function pzNext() {
  Q.mode = "train";
  const p = pzPick(PS.r + PS.diff, pzPool(), Q.cur);
  if (!p) { panel.innerHTML = `<p class="lead">Aucun problème disponible pour ce thème.</p>`; return; }
  pzLoad(p, true);
}
// Charge un problème : position d'avant, puis le dernier coup adverse est rejoué
function pzLoad(p, rated, fast) {
  clearTimers();
  Object.assign(Q, { cur: p, i: 0, failed: false, done: false, rated, delta: null, solution: false, review: !rated });
  panelEnter();
  resetBoard(p.before || p.fen, { flip: p.side === "b", locked: true, canMove: sq => colorOf(B.game.b[sq]) === p.side, onMove: pzMove });
  if (p.before && p.last) later(() => { const m = B.game.find(p.last); if (m) commit(m, true); B.locked = false; pzPanel(); }, fast ? 180 : 600);
  else B.locked = false;
  pzPanel();
}
function pzMove(m) {
  const p = Q.cur, g = B.game, u = uci(m), exp = p.line[Q.i];
  const ok = u === exp || (exp.length === 4 && u.startsWith(exp)) || g.status() === "mate";
  if (Q.mode === "storm") return stormMove(ok);
  if (!ok) {
    flashSq(m.to, "flash-bad");
    const w = whyWrong(g, m);
    if (!Q.failed) {
      Q.failed = true;
      if (Q.rated && Q.mode === "train") Q.delta = pzUpdate(p, false);
    }
    Q.fb = { c: "bad", t: `${ICON.flag} Ce n'est pas le bon coup.`, s: w || "Essaie autre chose, ou regarde la solution." };
    pzRefute(g.fen(), Q.fb);
    sound("error");
    B.locked = true;
    if (Q.mode === "streak") { pzPanel(); later(() => { g.undo(); B.last = null; render(); streakEnd(); }, 900); return; }
    pzPanel();
    later(() => { g.undo(); B.last = null; B.locked = false; render(); }, 900);
    return;
  }
  flashSq(m.to, "flash-ok");
  Q.i++;
  if (Q.i >= p.line.length || g.status() === "mate") return pzSolved();
  Q.fb = { c: "ok", t: `${ICON.check} Meilleur coup ! Continue...` };
  B.locked = true; pzPanel();
  later(() => {
    const r = g.find(p.line[Q.i]);
    Q.i++;
    commit(r, true);
    B.locked = false;
    pzPanel();
  }, 500);
}
// La réfutation d'un mauvais coup : la meilleure réponse adverse, trouvée par le moteur
function pzRefute(fen, fb) {
  if (g0Status(fen)) return;
  Engine.run({ type: "search", fen, time: 500 }).then(r => {
    if (!r || !r.move || Q.fb !== fb) return;
    const g = new Chess(fen), m = g.find(r.move);
    if (!m) return;
    const san = frSan(g.san(m)), why = pickFacts(moveFacts(g, m), ["mate", "fork", "capFree", "capWin", "check", "threat", "capEven"], "opp", 1)[0];
    const mate = r.score >= Engine_MATE - 200 ? ` Il a même un mat en ${Math.ceil((Engine_MATE - r.score) / 2)}.` : "";
    fb.s = `${fb.s && !/^Essaie/.test(fb.s) ? fb.s + " " : ""}Sa réponse : <b>${san}</b>${why ? " — " + lc(why) : "."}${mate}`;
    if (modeNow === "problemes" && Q.mode !== "storm") pzPanel();
  });
}
const g0Status = fen => new Chess(fen).status();
function pzSolved() {
  const p = Q.cur;
  Q.done = true; B.locked = true;
  if (Q.mode === "streak") { Q.streak++; if (Q.streak > PS.streakBest) PS.streakBest = Q.streak; persist(); sound("ok"); Q.fb = { c: "ok", t: `${ICON.check} Réussi ! Série : ${Q.streak}` }; pzPanel(); later(streakNext, 700); return; }
  if (!Q.failed && Q.rated) Q.delta = pzUpdate(p, true);
  sound(Q.failed ? "ok" : "win");
  Q.fb = Q.failed ? { c: "warn", t: "Problème terminé, avec une erreur." } : { c: "ok", t: `${ICON.check} Succès !` };
  pzPanel();
  if (PS.auto && !Q.failed) later(pzNext, 900);
}
// Montre la solution coup par coup (compte comme un échec)
function pzSolution() {
  const p = Q.cur;
  if (Q.done) return;
  if (!Q.failed) { Q.failed = true; if (Q.rated && Q.mode === "train") Q.delta = pzUpdate(p, false); }
  Q.solution = true; B.locked = true;
  const step = () => {
    if (Q.i >= p.line.length) { Q.done = true; Q.fb = { c: "info", t: "Voici la solution complète." }; pzPanel(); return; }
    const m = B.game.find(p.line[Q.i]);
    if (!m) return;
    commit(m, true);
    if (Q.i % 2 === 0) B.arrows = [[m.from, m.to]], render();
    Q.i++;
    pzPanel();
    later(step, 900);
  };
  step();
}
// Pourquoi la solution marche : chaque coup de la ligne, avec ce qu'il fait, puis le bilan matériel
const pzMat = (g, c) => g.b.reduce((a, x) => a + (x && colorOf(x) === c ? VAL[x.toLowerCase()] : 0), 0);
function pzExplain(p) {
  const g = new Chess(pzFen(p)), me = p.side, opp = me === "w" ? "b" : "w", out = [];
  const bal0 = pzMat(g, me) - pzMat(g, opp);
  let quiet = 0;
  for (let i = 0; i < p.line.length; i++) {
    const m = g.find(p.line[i]);
    if (!m) break;
    const mine = i % 2 === 0, num = `${g.full}${g.turn === "w" ? "." : "..."}`, san = frSan(g.san(m));
    const F = moveFacts(g, m), has = k => F.find(f => f.k === k), t = m.piece.toLowerCase();
    let why;
    if (mine) {
      const sac = F.some(f => (f.k === "hang" && f.sq === m.to) || f.k === "capBad");
      if (has("mate")) why = "Échec et mat !";
      else if (sac) why = `Sacrifice${has("check") ? " avec échec" : ""} : ${ton(t)} est offert${FEM[t] ? "e" : ""}, la suite montre pourquoi.`;
      else if (has("fork") || has("capFree") || has("capWin")) why = factText(has("fork") || has("capFree") || has("capWin"), "me");
      else if (has("check")) why = "Échec : le roi adverse n'a pas le choix.";
      else if (m.promo) why = "Promotion !";
      else if (has("threat")) why = factText(has("threat"), "me");
      else if (m.captured) why = "Tu reprends.";
      else if (t === "p") why = "Le pion avance vers la promotion.";
      else why = (quiet++ ? "Encore un coup calme." : "Un coup calme, le plus dur à voir : il prépare la suite.");
    } else {
      const prevCheck = g.inCheck();
      why = has("mate") ? "Échec et mat." : m.captured ? `Il prend ${ton(m.captured.toLowerCase())}${has("check") ? " avec échec" : ""}.` : has("check") ? "Il te donne échec." : prevCheck ? "Il pare l'échec." : "Sa meilleure défense.";
    }
    out.push({ mine, txt: `<b>${num} ${san}</b> ${why}` });
    g.make(m);
  }
  const st = g.status(), d = pzMat(g, me) - pzMat(g, opp) - bal0;
  const end = st === "mate" ? "Bilan : échec et mat." : d >= 750 ? "Bilan : tu gagnes l'équivalent d'une dame." : d >= 420 ? "Bilan : tu gagnes l'équivalent d'une tour." : d >= 250 ? "Bilan : tu gagnes une pièce." : d >= 90 ? "Bilan : tu gagnes du matériel." : "Bilan : une position nettement meilleure.";
  return { lines: out, end };
}
function pzWhyHTML(p) {
  const x = pzExplain(p);
  return `<details class="coach-card info pz-why" open><summary class="coach-title"><span class="verdict info">coach</span><b>Pourquoi ça marche</b></summary>
    <ol class="why-line">${x.lines.map(l => `<li class="${l.mine ? "mine" : "opp"}">${l.txt}</li>`).join("")}</ol><p class="coach-better">${x.end}</p></details>`;
}
function pzPanel() {
  const p = Q.cur;
  if (!p) return;
  if (Q.mode === "storm") return stormPanel();
  const myTurn = !Q.done && B.game.turn === p.side;
  const head = Q.done
    ? `<div class="pz-head ${Q.failed ? "fail" : "win"}"><span class="pz-ico">${Q.failed ? ICON.flag : ICON.check}</span><div><b>${Q.solution ? "Solution" : Q.failed ? "Problème raté" : "Problème réussi"}</b><span>${Q.failed ? "Tu feras mieux au prochain !" : "Bravo, tu as trouvé toute la combinaison."}</span></div></div>`
    : `<div class="pz-head"><span class="pz-side ${p.side}">${pieceEl(p.side === "w" ? "K" : "k")}</span><div><b>${myTurn ? "À toi de jouer !" : "Le coup adverse..."}</b><span>Trouve le meilleur coup pour les ${pzSide(p)}.</span></div></div>`;
  const delta = Q.delta != null ? `<span class="delta ${Q.delta >= 0 ? "up" : "down"}">${Q.delta >= 0 ? "+" : "−"}${Math.abs(Q.delta)}</span>` : "";
  const themes = [...new Set(p.tags.filter(t => t !== "check" && PZ_THEMES[t]).map(t => PZ_THEMES[t]))];
  const info = Q.done ? `<div class="pz-info"><span>Problème ${p.lichess ? `<a href="https://lichess.org/training/${p.id}" target="_blank" rel="noopener">#${p.id}</a>` : `<b>#${p.id}</b>`}</span><span>Classement <b>${p.r}</b></span>${themes.length ? `<span>Thèmes : <b>${themes.join(", ")}</b></span>` : ""}</div>` : "";
  const modeBar = `<div class="seg pz-modes" role="group" aria-label="Mode">${[["train", "Entraînement"], ["streak", "Série"], ["storm", "Tempête"]].map(([k, t]) => `<button data-mode-pz="${k}" aria-pressed="${Q.mode === k}">${t}</button>`).join("")}</div>`;
  if (Q.mode === "streak") {
    panel.innerHTML = `${modeBar}
      <div class="pz-rating"><div><span>Série en cours</span><b>${Q.streak}</b></div><div><span>Record</span><b>${PS.streakBest}</b></div></div>
      ${head}
      ${Q.fb ? `<div class="fb ${Q.fb.c}">${Q.fb.t}${Q.fb.s ? `<small>${Q.fb.s}</small>` : ""}</div>` : ""}
      <p class="lead">Des problèmes de plus en plus difficiles. La série s'arrête à la première erreur.</p>`;
    pzBindModes(); return;
  }
  panel.innerHTML = `${modeBar}
    ${head}
    ${Q.fb ? `<div class="fb ${Q.fb.c}">${Q.fb.t}${Q.fb.s ? `<small>${Q.fb.s}</small>` : ""}</div>` : ""}
    ${info}
    ${Q.done ? pzWhyHTML(p) : ""}
    <div class="row">
      ${Q.done ? `<button class="btn primary big" id="pz-next">${Q.review ? "Retour à l'entraînement" : "Continuer l'entraînement"}${ICON.arrow}</button><button class="btn" id="pz-retry">${ICON.retry}Rejouer</button><button class="btn" id="pz-play" title="Continuer la partie contre l'ordinateur depuis la position du problème">${ICON.board}Jouer la position</button>`
        : `<button class="btn" id="pz-sol">${ICON.bulb}Voir la solution</button>`}
    </div>
    <div class="pz-rating">
      <div><span>Ton classement</span><b title="${pzProvisional() ? "Classement provisoire : il se stabilise après quelques problèmes" : `Incertitude : ± ${Math.round(PS.rd * 2)}`}">${pzRatingText()}</b>${delta}</div>
      ${sparkline(PS.rs)}
    </div>
    <div class="settings">
      <div class="field"><span>Difficulté</span><select id="pz-diff" class="select">${PZ_DIFF.map(([v, t]) => `<option value="${v}" ${PS.diff === v ? "selected" : ""}>${t}${v ? ` (${v > 0 ? "+" : "−"}${Math.abs(v)})` : ""}</option>`).join("")}</select></div>
      <div class="field"><span>Thème</span><select id="pz-theme" class="select">${pzThemeOptions()}</select></div>
    </div>
    <label class="switch"><input type="checkbox" id="pz-auto" ${PS.auto ? "checked" : ""}> Passer au suivant automatiquement après une réussite</label>
    ${PS.hist.length ? `<p class="group-title">Derniers problèmes</p><div class="pz-hist">${PS.hist.slice(0, 20).map(h => `<button class="${h.ok ? "ok" : "ko"}" data-replay="${h.id}" title="${h.ok ? "Réussi" : "Raté"} · ${h.d >= 0 ? "+" : ""}${h.d}">${h.ok ? ICON.check : "✕"}<i>${h.d >= 0 ? "+" : "−"}${Math.abs(h.d)}</i></button>`).join("")}</div>` : ""}
    <div class="row"><button class="btn" id="pz-dash">${ICON.trophy}Tableau de bord</button></div>
    ${PZ_LICHESS ? `<p class="calm credit">Problèmes issus de la base de <a href="https://database.lichess.org/#puzzles" target="_blank" rel="noopener">Lichess</a> (domaine public).</p>` : ""}`;
  pzBindModes();
  const nx = $("#pz-next"); if (nx) { nx.onclick = pzNext; nx.focus({ preventScroll: true }); }
  const rt = $("#pz-retry"); if (rt) rt.onclick = () => pzLoad(p, false);
  const pp = $("#pz-play"); if (pp) pp.onclick = () => playFrom(pzFen(p), p.side);
  const so = $("#pz-sol"); if (so) so.onclick = pzSolution;
  $("#pz-diff").onchange = e => { PS.diff = +e.target.value; persist(); if (!Q.done && !Q.failed && Q.i === 0) pzNext(); else pzPanel(); };
  $("#pz-theme").onchange = e => { PS.theme = e.target.value; persist(); if (!Q.done && !Q.failed && Q.i === 0) pzNext(); else pzPanel(); };
  $("#pz-auto").onchange = e => { PS.auto = e.target.checked; persist(); };
  $("#pz-dash").onclick = pzDashboard;
  panel.querySelectorAll("[data-replay]").forEach(b => b.onclick = () => { const x = PZ_BY_ID.get(b.dataset.replay); if (x) pzLoad(x, false); });
}
function pzBindModes() {
  panel.querySelectorAll("[data-mode-pz]").forEach(b => b.onclick = () => {
    const k = b.dataset.modePz;
    if (Q.storm && Q.storm.iv) { clearInterval(Q.storm.iv); Q.storm.running = false; }
    Q.mode = k;
    if (k === "train") pzNext(); else if (k === "streak") streakStart(); else stormHome();
  });
}
// Courbe d'évolution du classement (une seule série, point final mis en valeur)
function sparkline(vals) {
  if (vals.length < 2) return `<p class="calm" style="margin:0">Ta courbe de progression apparaîtra ici.</p>`;
  const W = 220, H = 48, P = 5, mn = Math.min(...vals), mx = Math.max(...vals), span = Math.max(20, mx - mn);
  const pts = vals.map((v, i) => [P + (i * (W - 2 * P)) / (vals.length - 1), H - P - ((v - mn) / span) * (H - 2 * P)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution du classement, de ${vals[0]} à ${vals[vals.length - 1]}">
    <path d="${d} L ${last[0].toFixed(1)} ${H} L ${P} ${H} Z" class="spark-area"></path>
    <path d="${d}" class="spark-line"></path>
    ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="7" class="spark-hit"><title>${vals[i]}</title></circle>`).join("")}
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" class="spark-end"></circle>
  </svg>`;
}
function pzDashboard() {
  clearTimers();
  resetBoard(START, { locked: true, list: true });
  panelEnter();
  const pct = PS.n ? Math.round((PS.ok / PS.n) * 100) : 0;
  const rows = Object.entries(PS.th).filter(([t]) => PZ_THEMES[t] && !PZ_MINOR.has(t)).sort((a, b) => b[1][1] - a[1][1]).slice(0, 14);
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><button class="btn" id="back">${ICON.back}Problèmes</button><span class="pill">${PZ.length} problèmes</span></div>
    <p class="eyebrow">Tableau de bord</p><h2>Ta progression</h2>
    <div class="stats-strip">
      <div class="stat"><b>${pzRatingText()}</b><span>Classement</span></div>
      <div class="stat"><b>${PS.n}</b><span>Joués</span></div>
      <div class="stat"><b>${pct}%</b><span>Réussite</span></div>
      <div class="stat"><b>${PS.streakBest}</b><span>Record série</span></div>
    </div>
    <div class="pz-rating"><div><span>Évolution du classement</span><b>${pzRatingText()}</b></div>${sparkline(PS.rs)}</div>
    <p class="calm">Ton classement suit la méthode Glicko-2, comme sur Lichess : chaque problème a son propre classement, calculé à partir des joueurs qui l'ont tenté. ${pzProvisional() ? "Le « ? » indique un classement encore provisoire, qui bouge vite au début." : `Incertitude actuelle : ± ${Math.round(PS.rd * 2)} points.`}</p>
    <div class="pz-rating"><div><span>Record tempête</span><b>${PS.stormBest}</b></div><p class="calm" style="margin:0">Problèmes résolus en 3 minutes.</p></div>
    <p class="group-title">Réussite par thème</p>
    ${rows.length ? `<div class="bars">${rows.map(([t, [ok, n]]) => { const v = Math.round((ok / n) * 100); return `<div class="bar-row" title="${PZ_THEMES[t]} : ${ok} réussis sur ${n}"><span>${PZ_THEMES[t]}</span><div class="bar"><i style="width:${Math.max(2, v)}%"></i></div><b>${v}%</b><small>${ok}/${n}</small></div>`; }).join("")}</div>
      <p class="calm">Ton thème le plus faible${(() => { const w = rows.filter(([, [, n]]) => n >= 5).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1])[0]; return w ? ` (${PZ_THEMES[w[0]].toLowerCase()})` : ""; })()} est un bon point de départ : choisis-le dans le filtre « Thème ».</p>` : `<p class="calm">Joue quelques problèmes pour voir tes points forts et tes points faibles.</p>`}`;
  $("#back").onclick = pzNext;
}
// --- Série : de plus en plus difficile, jusqu'à la première erreur ---
function streakStart() {
  Q.mode = "streak"; Q.streak = 0; Q.streakLevel = PZ_LICHESS ? 700 : 500; Q.used = new Set();
  streakNext();
}
function streakNext() {
  const pool = PZ.filter(p => !Q.used.has(p.id));
  const target = Q.streakLevel + Q.streak * (PZ_LICHESS ? 60 : 45);
  const p = pool.slice().sort((a, b) => Math.abs(a.r - target) - Math.abs(b.r - target)).slice(0, 4)[(Math.random() * 4) | 0] || pool[0];
  if (!p) return streakEnd(true);
  Q.used.add(p.id);
  Q.fb = null;
  pzLoad(p, false);
  Q.mode = "streak"; Q.review = false;
  pzPanel();
}
function streakEnd(all) {
  const best = Q.streak >= PS.streakBest && Q.streak > 0;
  if (Q.streak > PS.streakBest) PS.streakBest = Q.streak;
  persist();
  B.locked = true;
  panelEnter();
  panel.innerHTML = `
    <div class="seg pz-modes" role="group">${[["train", "Entraînement"], ["streak", "Série"], ["storm", "Tempête"]].map(([k, t]) => `<button data-mode-pz="${k}" aria-pressed="${k === "streak"}">${t}</button>`).join("")}</div>
    <div class="pz-head ${Q.streak ? "win" : "fail"}"><span class="pz-ico">${ICON.trophy}</span><div><b>${all ? "Tous les problèmes résolus !" : "Série terminée"}</b><span>${Q.streak} problème${Q.streak > 1 ? "s" : ""} d'affilée${best ? " : nouveau record !" : ""}</span></div></div>
    <div class="pz-rating"><div><span>Score</span><b>${Q.streak}</b></div><div><span>Record</span><b>${PS.streakBest}</b></div></div>
    ${Q.cur ? `<p class="lead">La solution du dernier problème commençait par <b>${sanFor(pzFen(Q.cur), Q.cur.line[0]).replace("...", "")}</b>.</p>` : ""}
    <div class="row"><button class="btn primary big" id="again">${ICON.retry}Nouvelle série</button></div>`;
  if (best && Q.streak > 2) celebrate();
  pzBindModes();
  $("#again").onclick = streakStart;
}
// --- Tempête : 3 minutes, un maximum de problèmes ---
function stormHome() {
  Q.mode = "storm";
  clearTimers();
  resetBoard(START, { locked: true });
  panelEnter();
  const last = Q.storm && Q.storm.result;
  panel.innerHTML = `
    <div class="seg pz-modes" role="group">${[["train", "Entraînement"], ["streak", "Série"], ["storm", "Tempête"]].map(([k, t]) => `<button data-mode-pz="${k}" aria-pressed="${k === "storm"}">${t}</button>`).join("")}</div>
    <div class="pz-head"><span class="pz-ico">${ICON.clock}</span><div><b>Tempête de problèmes</b><span>3 minutes pour en résoudre un maximum.</span></div></div>
    <ul class="goals"><li>Chaque bon coup rapporte du temps quand tu enchaînes (combo).</li><li>Une erreur coûte 10 secondes et passe au problème suivant.</li><li>Les problèmes deviennent de plus en plus difficiles.</li></ul>
    ${last ? `<div class="pz-rating"><div><span>Dernier score</span><b>${last.score}</b></div><div><span>Meilleur combo</span><b>${last.combo}</b></div><div><span>Erreurs</span><b>${last.errors}</b></div></div>` : ""}
    <div class="pz-rating"><div><span>Record</span><b>${PS.stormBest}</b></div></div>
    <div class="row"><button class="btn primary big" id="go-storm">${ICON.clock}Lancer la tempête</button></div>`;
  pzBindModes();
  $("#go-storm").onclick = stormStart;
}
function stormStart() {
  Q.mode = "storm";
  Q.storm = { running: true, end: Date.now() + 180000, score: 0, combo: 0, best: 0, errors: 0, idx: 0, used: new Set(), iv: null };
  Q.storm.iv = setInterval(stormTick, 200);
  stormNext();
}
function stormNext() {
  const S = Q.storm, target = PZ_LICHESS ? 800 + S.idx * 40 : 550 + S.idx * 30;
  S.idx++;
  const pool = PZ.filter(p => !S.used.has(p.id) && p.line.length <= 5);
  const p = pool.slice().sort((a, b) => Math.abs(a.r - target) - Math.abs(b.r - target)).slice(0, 5)[(Math.random() * 5) | 0] || pool[0];
  if (!p) return stormEnd();
  S.used.add(p.id);
  pzLoad(p, false, true);
  Q.mode = "storm";
  stormPanel();
}
const COMBO_BONUS = [[5, 3], [12, 5], [20, 7], [30, 10]];
function stormMove(ok) {
  const S = Q.storm, g = B.game, p = Q.cur;
  if (!ok) {
    S.errors++; S.combo = 0; S.end -= 10000;
    sound("error"); flashSq(B.last ? B.last[1] : 0, "flash-bad");
    B.locked = true;
    later(stormNext, 500);
    stormPanel(); return;
  }
  S.combo++; S.best = Math.max(S.best, S.combo);
  for (const [n, s] of COMBO_BONUS) if (S.combo === n) S.end += s * 1000;
  if (S.combo > 30 && S.combo % 10 === 0) S.end += 10000;
  Q.i++;
  if (Q.i >= p.line.length || g.status() === "mate") { S.score++; sound("ok"); B.locked = true; later(stormNext, 250); stormPanel(); return; }
  B.locked = true;
  later(() => { const r = g.find(p.line[Q.i]); Q.i++; commit(r, true); B.locked = false; }, 200);
  stormPanel();
}
function stormTick() {
  const S = Q.storm;
  if (!S || !S.running) return;
  const left = S.end - Date.now();
  if (left <= 0) return stormEnd();
  const t = $("#storm-time"); if (t) { t.textContent = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`; t.classList.toggle("low", left < 20000); }
}
function stormPanel() {
  const S = Q.storm, p = Q.cur;
  if (!S || !p) return;
  panel.innerHTML = `
    <div class="storm-top"><div class="storm-time" id="storm-time">3:00</div><div class="storm-score"><b>${S.score}</b><span>résolus</span></div></div>
    <div class="pz-head"><span class="pz-side ${p.side}">${pieceEl(p.side === "w" ? "K" : "k")}</span><div><b>Trouve le meilleur coup</b><span>pour les ${pzSide(p)}</span></div></div>
    <div class="combo"><span>Combo</span><b>${S.combo}</b><div class="combo-bar"><i style="width:${Math.min(100, (S.combo / (COMBO_BONUS.find(([n]) => n > S.combo) || [S.combo + 10])[0]) * 100)}%"></i></div></div>
    <div class="row"><button class="btn" id="storm-stop">Arrêter</button></div>`;
  stormTick();
  $("#storm-stop").onclick = stormEnd;
}
function stormEnd() {
  const S = Q.storm;
  if (!S || !S.running) return;
  S.running = false; clearInterval(S.iv);
  const record = S.score > PS.stormBest;
  if (record) PS.stormBest = S.score;
  persist();
  S.result = { score: S.score, combo: S.best, errors: S.errors };
  B.locked = true;
  if (record && S.score > 0) { celebrate(); sound("win"); } else sound("end");
  stormHome();
  if (record && S.score > 0) panel.insertAdjacentHTML("afterbegin", `<div class="fb ok">${ICON.trophy} Nouveau record : ${S.score} problèmes !</div>`);
}

// ---------- Coordonnées ----------
const C = { running: false, score: 0, miss: 0, target: null, end: 0, iv: null, side: "w", coords: false, vm: "coord" };
const DURATION = 30000;
function coordView() {
  visStop();
  if (C.vm !== "coord") return visionView();
  C.running = false;
  resetBoard(EMPTY, { flip: C.side === "b", coords: C.coords, onSquare: coordClick });
  panelEnter();
  coordPanel();
}
function newTarget() { let t; do { t = (Math.random() * 64) | 0; } while (sqName(t) === C.target); C.target = sqName(t); }
function coordPanel(done) {
  $("#under-top").innerHTML = C.running ? `<span>Clique sur</span><span class="target-mini" id="ctarget-mini">${C.target}</span>` : "";
  panel.innerHTML = `
    ${C.running ? "" : visSeg()}
    <p class="eyebrow">Vision · 30 secondes</p>
    <h2>Lis l'échiquier sans réfléchir</h2>
    <p class="lead">Une case s'affiche, clique-la le plus vite possible. Connaître les coordonnées par cœur aide à lire les livres, les vidéos et à noter tes parties.</p>
    ${C.running ? `<div class="target" id="ctarget">${C.target}</div><div class="timer"><i id="ctimer" style="width:100%"></i></div>` : ""}
    <div class="scorebox"><div><b id="cscore">${C.score}</b><span>Score</span></div><div><b>${C.miss}</b><span>Erreurs</span></div><div><b>${save.coordBest}</b><span>Record</span></div></div>
    ${done ? `<div class="fb ${done.c}">${done.t}</div>` : ""}
    ${C.running ? "" : `
      <div class="settings">
        <div class="field"><span>Vu depuis</span><div class="seg" role="group"><button aria-pressed="${C.side === "w"}" data-side="w">Les Blancs</button><button aria-pressed="${C.side === "b"}" data-side="b">Les Noirs</button></div></div>
        <div class="field"><span>Aide</span><label class="switch"><input type="checkbox" id="ccoords" ${C.coords ? "checked" : ""}> Afficher les coordonnées</label></div>
      </div>
      <div class="row"><button class="btn primary" id="cstart">${done ? "Rejouer" : "Démarrer"}</button></div>`}`;
  visBindSeg();
  panel.querySelectorAll("[data-side]").forEach(b => b.onclick = () => { C.side = b.dataset.side; B.flip = C.side === "b"; render(); coordPanel(); });
  const cc = $("#ccoords"); if (cc) cc.onchange = e => { C.coords = e.target.checked; B.coords = C.coords; render(); };
  const cs = $("#cstart"); if (cs) cs.onclick = coordStart;
}
function coordStart() {
  C.running = true; C.score = 0; C.miss = 0; C.target = null; newTarget();
  C.end = Date.now() + DURATION;
  coordPanel();
  C.iv = setInterval(() => {
    const left = C.end - Date.now();
    const bar = $("#ctimer"); if (bar) bar.style.width = Math.max(0, left / DURATION * 100) + "%";
    if (left <= 0) {
      clearInterval(C.iv); C.iv = null; C.running = false;
      const rec = C.score > save.coordBest;
      if (rec) { save.coordBest = C.score; persist(); }
      coordPanel({ c: rec ? "ok" : "info", t: rec ? `Nouveau record : ${C.score} cases !` : `${C.score} cases trouvées. Ton record : ${save.coordBest}.` });
    }
  }, 100);
}
function coordClick(sq) {
  if (!C.running) return;
  if (sqName(sq) === C.target) { C.score++; flashSq(sq, "flash-ok"); newTarget(); }
  else { C.miss++; flashSq(sq, "flash-bad"); }
  const t = $("#ctarget"); if (t) t.textContent = C.target;
  const tm = $("#ctarget-mini"); if (tm) tm.textContent = C.target;
  const s = $("#cscore"); if (s) s.textContent = C.score;
  const misses = panel.querySelectorAll(".scorebox b")[1]; if (misses) misses.textContent = C.miss;
}

