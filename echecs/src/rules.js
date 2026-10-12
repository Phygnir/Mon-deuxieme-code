const FILES = "abcdefgh";
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const EMPTY = "8/8/8/8/8/8/8/8 w - - 0 1";
const sqName = i => FILES[i & 7] + (8 - (i >> 3));
const sqIdx = s => (8 - parseInt(s[1], 10)) * 8 + FILES.indexOf(s[0]);
const colorOf = p => (p ? (p === p.toUpperCase() ? "w" : "b") : null);
const KN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KG = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const DG = [[-1,-1],[-1,1],[1,-1],[1,1]];
const OR = [[-1,0],[1,0],[0,-1],[0,1]];
const uci = m => sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : "");

class Chess {
  constructor(fen) { this.load(fen || START); }
  load(fen) {
    const [pos, turn, cas, ep, half, full] = fen.trim().split(/\s+/);
    this.b = new Array(64).fill(null);
    let i = 0;
    for (const ch of pos) {
      if (ch === "/") continue;
      if (/\d/.test(ch)) i += +ch; else this.b[i++] = ch;
    }
    this.turn = turn || "w";
    this.castle = cas && cas !== "-" ? cas : "";
    this.ep = ep && ep !== "-" ? sqIdx(ep) : -1;
    this.half = +half || 0;
    this.full = +full || 1;
    this.hist = [];
    this.keys = [this.key()];
  }
  key() { let s = ""; for (const p of this.b) s += p || "."; return s + this.turn + this.castle + this.ep; }
  fen() {
    let s = "";
    for (let r = 0; r < 8; r++) {
      let e = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.b[r * 8 + f];
        if (!p) e++; else { if (e) { s += e; e = 0; } s += p; }
      }
      if (e) s += e;
      if (r < 7) s += "/";
    }
    return `${s} ${this.turn} ${this.castle || "-"} ${this.ep >= 0 ? sqName(this.ep) : "-"} ${this.half} ${this.full}`;
  }
  king(c) { return this.b.indexOf(c === "w" ? "K" : "k"); }
  attacked(sq, by) {
    const b = this.b, r = sq >> 3, f = sq & 7, w = by === "w";
    const P = w ? "P" : "p", N = w ? "N" : "n", B = w ? "B" : "b", R = w ? "R" : "r", Q = w ? "Q" : "q", K = w ? "K" : "k";
    const pr = w ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8) {
      if (f > 0 && b[pr * 8 + f - 1] === P) return true;
      if (f < 7 && b[pr * 8 + f + 1] === P) return true;
    }
    for (const [dr, df] of KN) { const rr = r + dr, ff = f + df; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === N) return true; }
    for (const [dr, df] of KG) { const rr = r + dr, ff = f + df; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === K) return true; }
    for (const [dr, df] of DG) {
      let rr = r + dr, ff = f + df;
      while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { const p = b[rr * 8 + ff]; if (p) { if (p === B || p === Q) return true; break; } rr += dr; ff += df; }
    }
    for (const [dr, df] of OR) {
      let rr = r + dr, ff = f + df;
      while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { const p = b[rr * 8 + ff]; if (p) { if (p === R || p === Q) return true; break; } rr += dr; ff += df; }
    }
    return false;
  }
  inCheck(c = this.turn) { const k = this.king(c); return k >= 0 && this.attacked(k, c === "w" ? "b" : "w"); }
  pseudo(c = this.turn) {
    const out = [], b = this.b, opp = c === "w" ? "b" : "w";
    for (let s = 0; s < 64; s++) {
      const p = b[s];
      if (!p || colorOf(p) !== c) continue;
      const t = p.toLowerCase(), r = s >> 3, f = s & 7;
      const add = (to, flags, promo) => out.push({ from: s, to, piece: p, captured: flags === "e" ? (c === "w" ? "p" : "P") : b[to], promo, flags });
      if (t === "p") {
        const dir = c === "w" ? -1 : 1, start = c === "w" ? 6 : 1, last = c === "w" ? 0 : 7;
        const addP = (to, fl) => { if ((to >> 3) === last) { for (const pr of "qrnb") add(to, fl, c === "w" ? pr.toUpperCase() : pr); } else add(to, fl); };
        const nr = r + dir;
        if (nr < 0 || nr > 7) continue;
        const one = nr * 8 + f;
        if (!b[one]) {
          addP(one, "n");
          const two = (r + 2 * dir) * 8 + f;
          if (r === start && !b[two]) add(two, "b");
        }
        for (const df of [-1, 1]) {
          const ff = f + df;
          if (ff < 0 || ff > 7) continue;
          const to = nr * 8 + ff;
          if (b[to] && colorOf(b[to]) === opp) addP(to, "c");
          else if (to === this.ep && !b[to]) add(to, "e");
        }
      } else if (t === "n" || t === "k") {
        for (const [dr, df] of (t === "n" ? KN : KG)) {
          const rr = r + dr, ff = f + df;
          if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
          const to = rr * 8 + ff, q = b[to];
          if (!q) add(to, "n"); else if (colorOf(q) === opp) add(to, "c");
        }
      } else {
        const dirs = t === "b" ? DG : t === "r" ? OR : DG.concat(OR);
        for (const [dr, df] of dirs) {
          let rr = r + dr, ff = f + df;
          while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
            const to = rr * 8 + ff, q = b[to];
            if (!q) add(to, "n");
            else { if (colorOf(q) === opp) add(to, "c"); break; }
            rr += dr; ff += df;
          }
        }
      }
    }
    // Roque
    if (c === "w" && b[60] === "K") {
      if (this.castle.includes("K") && b[63] === "R" && !b[61] && !b[62] && !this.attacked(60, "b") && !this.attacked(61, "b") && !this.attacked(62, "b"))
        out.push({ from: 60, to: 62, piece: "K", captured: null, flags: "k" });
      if (this.castle.includes("Q") && b[56] === "R" && !b[59] && !b[58] && !b[57] && !this.attacked(60, "b") && !this.attacked(59, "b") && !this.attacked(58, "b"))
        out.push({ from: 60, to: 58, piece: "K", captured: null, flags: "q" });
    }
    if (c === "b" && b[4] === "k") {
      if (this.castle.includes("k") && b[7] === "r" && !b[5] && !b[6] && !this.attacked(4, "w") && !this.attacked(5, "w") && !this.attacked(6, "w"))
        out.push({ from: 4, to: 6, piece: "k", captured: null, flags: "k" });
      if (this.castle.includes("q") && b[0] === "r" && !b[3] && !b[2] && !b[1] && !this.attacked(4, "w") && !this.attacked(3, "w") && !this.attacked(2, "w"))
        out.push({ from: 4, to: 2, piece: "k", captured: null, flags: "q" });
    }
    return out;
  }
  moves(from) {
    const c = this.turn, res = [];
    for (const m of this.pseudo(c)) {
      if (from != null && m.from !== from) continue;
      this.make(m, true);
      if (!this.inCheck(c)) res.push(m);
      this.undo();
    }
    return res;
  }
  make(m, fast) {
    const b = this.b, c = colorOf(m.piece);
    this.hist.push({ m, castle: this.castle, ep: this.ep, half: this.half, full: this.full, k: !fast });
    b[m.to] = m.promo || m.piece;
    b[m.from] = null;
    if (m.flags === "e") b[m.to + (c === "w" ? 8 : -8)] = null;
    if (m.flags === "k") { const rf = c === "w" ? 63 : 7, rt = c === "w" ? 61 : 5; b[rt] = b[rf]; b[rf] = null; }
    if (m.flags === "q") { const rf = c === "w" ? 56 : 0, rt = c === "w" ? 59 : 3; b[rt] = b[rf]; b[rf] = null; }
    let cs = this.castle;
    if (cs) {
      if (m.piece === "K") cs = cs.replace(/[KQ]/g, "");
      if (m.piece === "k") cs = cs.replace(/[kq]/g, "");
      for (const s of [m.from, m.to]) {
        if (s === 63) cs = cs.replace("K", "");
        if (s === 56) cs = cs.replace("Q", "");
        if (s === 7) cs = cs.replace("k", "");
        if (s === 0) cs = cs.replace("q", "");
      }
      this.castle = cs;
    }
    this.ep = m.flags === "b" ? (m.from + m.to) / 2 : -1;
    this.half = (m.piece === "P" || m.piece === "p" || m.captured) ? 0 : this.half + 1;
    if (c === "b") this.full++;
    this.turn = c === "w" ? "b" : "w";
    if (!fast) this.keys.push(this.key());
  }
  undo() {
    const h = this.hist.pop();
    if (!h) return null;
    const m = h.m, b = this.b, c = colorOf(m.piece);
    if (h.k) this.keys.pop();
    b[m.from] = m.piece;
    b[m.to] = null;
    if (m.flags === "e") b[m.to + (c === "w" ? 8 : -8)] = m.captured;
    else if (m.captured) b[m.to] = m.captured;
    if (m.flags === "k") { const rf = c === "w" ? 63 : 7, rt = c === "w" ? 61 : 5; b[rf] = b[rt]; b[rt] = null; }
    if (m.flags === "q") { const rf = c === "w" ? 56 : 0, rt = c === "w" ? 59 : 3; b[rf] = b[rt]; b[rt] = null; }
    this.turn = c; this.castle = h.castle; this.ep = h.ep; this.half = h.half; this.full = h.full;
    return m;
  }
  san(m) {
    let s;
    if (m.flags === "k") s = "O-O";
    else if (m.flags === "q") s = "O-O-O";
    else {
      const t = m.piece.toUpperCase();
      if (t === "P") s = (m.captured ? FILES[m.from & 7] + "x" : "") + sqName(m.to) + (m.promo ? "=" + m.promo.toUpperCase() : "");
      else {
        const others = this.moves().filter(o => o.piece === m.piece && o.to === m.to && o.from !== m.from);
        let d = "";
        if (others.length) {
          const sameFile = others.some(o => (o.from & 7) === (m.from & 7));
          const sameRank = others.some(o => (o.from >> 3) === (m.from >> 3));
          d = !sameFile ? FILES[m.from & 7] : !sameRank ? String(8 - (m.from >> 3)) : sqName(m.from);
        }
        s = t + d + (m.captured ? "x" : "") + sqName(m.to);
      }
    }
    this.make(m, true);
    if (this.inCheck()) s += this.moves().length ? "+" : "#";
    this.undo();
    return s;
  }
  insufficient() {
    const rest = this.b.filter(p => p && p !== "K" && p !== "k");
    if (!rest.length) return true;
    return rest.length === 1 && /[nbNB]/.test(rest[0]);
  }
  status() {
    if (!this.moves().length) return this.inCheck() ? "mate" : "stalemate";
    if (this.half >= 100) return "fifty";
    if (this.insufficient()) return "insufficient";
    const k = this.keys[this.keys.length - 1];
    if (this.keys.filter(x => x === k).length >= 3) return "repetition";
    return null;
  }
  find(u) { return this.moves().find(m => uci(m) === u || (u.length === 4 && uci(m) === u + "q")) || null; }
}

// ---------- Évaluation et recherche ----------
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const PST = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  ke: [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50]
};
function evaluate(g) {
  let s = 0, nw = 0, nb = 0, wk = -1, bk = -1;
  const b = g.b;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p) continue;
    const t = p.toLowerCase(), w = p !== t;
    if (t === "k") { if (w) wk = i; else bk = i; continue; }
    if (t !== "p") { if (w) nw += VAL[t]; else nb += VAL[t]; }
    const v = VAL[t] + PST[t][w ? i : i ^ 56];
    s += w ? v : -v;
  }
  const end = nw <= 1300 && nb <= 1300;
  const kt = end ? PST.ke : PST.k;
  if (wk >= 0) s += kt[wk];
  if (bk >= 0) s -= kt[bk ^ 56];
  // Finale gagnée : pousser le roi adverse vers le bord et rapprocher son propre roi
  if (end && wk >= 0 && bk >= 0 && Math.abs(s) > 400) {
    const strongW = s > 0, ek = strongW ? bk : wk, ok = strongW ? wk : bk;
    const er = ek >> 3, ef = ek & 7;
    const cd = Math.max(3 - er, er - 4) + Math.max(3 - ef, ef - 4);
    const kd = Math.abs(er - (ok >> 3)) + Math.abs(ef - (ok & 7));
    const bonus = cd * 12 + (14 - kd) * 5;
    s += strongW ? bonus : -bonus;
  }
  return s;
}
const MATE = 100000;
const TIMEOUT = { timeout: true };
const moveOrder = m => (m.captured ? 10 * VAL[m.captured.toLowerCase()] - VAL[m.piece.toLowerCase()] / 10 + 1000 : 0) + (m.promo ? 800 : 0);

function think(g, opts = {}) {
  const depth = opts.depth || 3, time = opts.time || 1500, noise = opts.noise || 0;
  const t0 = Date.now();
  let nodes = 0;
  const h0 = g.hist.length;
  const root = g.moves();
  if (!root.length) return null;
  if (opts.random && Math.random() < opts.random) return { move: root[(Math.random() * root.length) | 0], score: 0 };
  const sort = ms => ms.sort((a, b) => moveOrder(b) - moveOrder(a));
  function qs(alpha, beta, d) {
    if ((++nodes & 1023) === 0 && Date.now() - t0 > time) throw TIMEOUT;
    const stand = (g.turn === "w" ? 1 : -1) * evaluate(g);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (d >= 6) return alpha;
    const c = g.turn;
    const ms = sort(g.pseudo(c).filter(m => m.captured || m.promo));
    for (const m of ms) {
      g.make(m, true);
      if (g.inCheck(c)) { g.undo(); continue; }
      const v = -qs(-beta, -alpha, d + 1);
      g.undo();
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function ab(d, alpha, beta, ply) {
    if ((++nodes & 1023) === 0 && Date.now() - t0 > time) throw TIMEOUT;
    const chk = g.inCheck();
    if (d <= 0 && (!chk || d < -2)) return qs(alpha, beta, 0);
    const ms = g.moves();
    if (!ms.length) return chk ? -MATE + ply : 0;
    if (g.half >= 100) return 0;
    sort(ms);
    for (const m of ms) {
      g.make(m, true);
      const v = -ab(d - 1, -beta, -alpha, ply + 1);
      g.undo();
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  let order = sort(root.slice()), result = null;
  for (let d = 1; d <= depth; d++) {
    try {
      let alpha = -Infinity;
      const scored = [];
      for (const m of order) {
        g.make(m, true);
        const v = noise > 0 ? -ab(d - 1, -Infinity, Infinity, 1) : -ab(d - 1, -Infinity, -alpha, 1);
        g.undo();
        scored.push({ m, v });
        if (v > alpha) alpha = v;
      }
      scored.sort((a, b) => b.v - a.v);
      order = scored.map(x => x.m);
      let pick = scored[0];
      if (noise > 0 && pick.v < MATE - 1000) {
        let bestN = -Infinity;
        for (const x of scored) { const n = x.v + (Math.random() * 2 - 1) * noise; if (n > bestN) { bestN = n; pick = x; } }
      }
      result = { move: pick.m, score: pick.v, best: scored[0].m, bestScore: scored[0].v, depth: d, all: scored };
      if (scored[0].v > MATE - 1000) break;
    } catch (e) {
      if (e !== TIMEOUT) throw e;
      while (g.hist.length > h0) g.undo();
      break;
    }
    if (Date.now() - t0 > time * 0.45) break;
  }
  return result;
}
// Le camp au trait peut-il mater en n coups au plus ?
function mateIn(g, n) {
  for (const m of g.moves()) {
    g.make(m, true);
    const ok = forcedMate(g, n - 1);
    g.undo();
    if (ok) return m;
  }
  return null;
}
// Après le coup de l'attaquant : est-ce mat, ou mat forcé en k coups quoi que réponde le défenseur ?
function forcedMate(g, k) {
  const rep = g.moves();
  if (!rep.length) return g.inCheck();
  if (k <= 0) return false;
  for (const r of rep) {
    g.make(r, true);
    const ok = !!mateIn(g, k);
    g.undo();
    if (!ok) return false;
  }
  return true;
}
/*RULES-END*/
