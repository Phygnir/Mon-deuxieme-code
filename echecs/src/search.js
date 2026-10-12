// ---------- Moteur de recherche (tourne dans un Web Worker) ----------
// Représentation 0x88, tables de transposition Zobrist, PVS, coup nul, réductions des coups tardifs,
// extension d'échec et quiescence avec parades aux échecs. Les cases sont numérotées ligne 0 = 8e rangée.
function makeEngine() {
  "use strict";
  const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
  const INF = 32000, MATE = 30000, MAXPLY = 96;
  const FILES = "abcdefgh";
  const board = new Int8Array(128);
  const kingSq = new Int32Array(2);
  let side = 0, castle = 0, ep = -1, half = 0, hashLo = 0, hashHi = 0;

  // --- Zobrist ---
  let seed = 0x2545f491;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
  const zPL = new Int32Array(16 * 128), zPH = new Int32Array(16 * 128);
  for (let i = 0; i < zPL.length; i++) { zPL[i] = rnd(); zPH[i] = rnd(); }
  const zCL = new Int32Array(16), zCH = new Int32Array(16), zEL = new Int32Array(8), zEH = new Int32Array(8);
  for (let i = 0; i < 16; i++) { zCL[i] = rnd(); zCH[i] = rnd(); }
  for (let i = 0; i < 8; i++) { zEL[i] = rnd(); zEH[i] = rnd(); }
  const zSL = rnd(), zSH = rnd();

  // Droits de roque : 1 = K, 2 = Q, 4 = k, 8 = q
  const castleMask = new Int32Array(128).fill(15);
  castleMask[0x74] = 15 & ~3; castleMask[0x77] = 15 & ~1; castleMask[0x70] = 15 & ~2;
  castleMask[0x04] = 15 & ~12; castleMask[0x07] = 15 & ~4; castleMask[0x00] = 15 & ~8;

  const N_OFF = [-33, -31, -18, -14, 14, 18, 31, 33];
  const K_OFF = [-17, -16, -15, -1, 1, 15, 16, 17];
  const B_DIR = [-17, -15, 15, 17], R_DIR = [-16, -1, 1, 16];

  const sqName = s => FILES[s & 7] + (8 - (s >> 4));
  const parseSq = n => (8 - +n[1]) * 16 + FILES.indexOf(n[0]);
  const PCH = ".PNBRQK..pnbrqk";

  function hashFull() {
    let lo = 0, hi = 0;
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = board[s]; if (p) { lo ^= zPL[p * 128 + s]; hi ^= zPH[p * 128 + s]; } }
    lo ^= zCL[castle]; hi ^= zCH[castle];
    if (ep >= 0) { lo ^= zEL[ep & 7]; hi ^= zEH[ep & 7]; }
    if (side) { lo ^= zSL; hi ^= zSH; }
    hashLo = lo; hashHi = hi;
  }
  // --- Historique pour la répétition ---
  const histLo = new Int32Array(1024), histHi = new Int32Array(1024);
  let histLen = 0;

  function setFen(fen) {
    board.fill(0);
    const [pos, turn, cas, eps, hm] = fen.trim().split(/\s+/);
    let r = 0, f = 0;
    for (const ch of pos) {
      if (ch === "/") { r++; f = 0; continue; }
      if (ch >= "1" && ch <= "8") { f += +ch; continue; }
      const idx = PCH.indexOf(ch);
      const s = r * 16 + f;
      board[s] = idx;
      if (idx === KING) kingSq[0] = s;
      if (idx === (8 | KING)) kingSq[1] = s;
      f++;
    }
    side = turn === "b" ? 1 : 0;
    castle = 0;
    if (cas && cas !== "-") { if (cas.includes("K")) castle |= 1; if (cas.includes("Q")) castle |= 2; if (cas.includes("k")) castle |= 4; if (cas.includes("q")) castle |= 8; }
    ep = eps && eps !== "-" ? parseSq(eps) : -1;
    half = +hm || 0;
    hashFull();
    histLen = 0;
  }

  // --- Attaques ---
  function attacked(s, by) {
    const c8 = by << 3;
    if (by === 0) {
      let t = s + 15; if (!(t & 0x88) && board[t] === PAWN) return true;
      t = s + 17; if (!(t & 0x88) && board[t] === PAWN) return true;
    } else {
      let t = s - 15; if (!(t & 0x88) && board[t] === (8 | PAWN)) return true;
      t = s - 17; if (!(t & 0x88) && board[t] === (8 | PAWN)) return true;
    }
    for (let i = 0; i < 8; i++) { const t = s + N_OFF[i]; if (!(t & 0x88) && board[t] === (c8 | KNIGHT)) return true; }
    for (let i = 0; i < 8; i++) { const t = s + K_OFF[i]; if (!(t & 0x88) && board[t] === (c8 | KING)) return true; }
    for (let i = 0; i < 4; i++) {
      const d = B_DIR[i]; let t = s + d;
      while (!(t & 0x88)) { const p = board[t]; if (p) { if (p === (c8 | BISHOP) || p === (c8 | QUEEN)) return true; break; } t += d; }
    }
    for (let i = 0; i < 4; i++) {
      const d = R_DIR[i]; let t = s + d;
      while (!(t & 0x88)) { const p = board[t]; if (p) { if (p === (c8 | ROOK) || p === (c8 | QUEEN)) return true; break; } t += d; }
    }
    return false;
  }
  const inCheck = c => attacked(kingSq[c], c ^ 1);

  // --- Coups : from | to<<7 | promo<<14 | flags<<17 ---
  const F_CAP = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8, F_PROMO = 16;
  const mFrom = m => m & 127, mTo = m => (m >> 7) & 127, mPromo = m => (m >> 14) & 7, mFlags = m => m >> 17;
  const enc = (f, t, pr, fl) => f | (t << 7) | (pr << 14) | (fl << 17);
  const moveBuf = new Int32Array(MAXPLY * 256), scoreBuf = new Int32Array(MAXPLY * 256);

  function gen(ply, capsOnly) {
    let n = ply * 256;
    const us = side, them = us ^ 1, c8 = us << 3;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = board[s];
      if (!p || (p >> 3) !== us) continue;
      const t = p & 7;
      if (t === PAWN) {
        const dir = us ? 16 : -16, startRow = us ? 1 : 6, lastRow = us ? 7 : 0;
        const one = s + dir;
        if (!(one & 0x88) && !board[one]) {
          if ((one >> 4) === lastRow) { for (const pr of [QUEEN, KNIGHT, ROOK, BISHOP]) moveBuf[n++] = enc(s, one, pr, F_PROMO); }
          else if (!capsOnly) {
            moveBuf[n++] = enc(s, one, 0, 0);
            const two = one + dir;
            if ((s >> 4) === startRow && !board[two]) moveBuf[n++] = enc(s, two, 0, F_DOUBLE);
          }
        }
        for (const d of (us ? [15, 17] : [-15, -17])) {
          const to = s + d;
          if (to & 0x88) continue;
          const q = board[to];
          if (q && (q >> 3) === them) {
            if ((to >> 4) === lastRow) { for (const pr of [QUEEN, KNIGHT, ROOK, BISHOP]) moveBuf[n++] = enc(s, to, pr, F_PROMO | F_CAP); }
            else moveBuf[n++] = enc(s, to, 0, F_CAP);
          } else if (to === ep) moveBuf[n++] = enc(s, to, 0, F_EP | F_CAP);
        }
      } else if (t === KNIGHT || t === KING) {
        const offs = t === KNIGHT ? N_OFF : K_OFF;
        for (let i = 0; i < 8; i++) {
          const to = s + offs[i];
          if (to & 0x88) continue;
          const q = board[to];
          if (!q) { if (!capsOnly) moveBuf[n++] = enc(s, to, 0, 0); }
          else if ((q >> 3) === them) moveBuf[n++] = enc(s, to, 0, F_CAP);
        }
      } else {
        const dirs = t === BISHOP ? B_DIR : t === ROOK ? R_DIR : K_OFF;
        for (let i = 0; i < dirs.length; i++) {
          const d = dirs[i]; let to = s + d;
          while (!(to & 0x88)) {
            const q = board[to];
            if (!q) { if (!capsOnly) moveBuf[n++] = enc(s, to, 0, 0); }
            else { if ((q >> 3) === them) moveBuf[n++] = enc(s, to, 0, F_CAP); break; }
            to += d;
          }
        }
      }
    }
    if (!capsOnly) {
      if (us === 0 && kingSq[0] === 0x74) {
        if ((castle & 1) && board[0x77] === ROOK && !board[0x75] && !board[0x76] && !attacked(0x74, 1) && !attacked(0x75, 1) && !attacked(0x76, 1)) moveBuf[n++] = enc(0x74, 0x76, 0, F_CASTLE);
        if ((castle & 2) && board[0x70] === ROOK && !board[0x73] && !board[0x72] && !board[0x71] && !attacked(0x74, 1) && !attacked(0x73, 1) && !attacked(0x72, 1)) moveBuf[n++] = enc(0x74, 0x72, 0, F_CASTLE);
      }
      if (us === 1 && kingSq[1] === 0x04) {
        if ((castle & 4) && board[0x07] === (8 | ROOK) && !board[0x05] && !board[0x06] && !attacked(0x04, 0) && !attacked(0x05, 0) && !attacked(0x06, 0)) moveBuf[n++] = enc(0x04, 0x06, 0, F_CASTLE);
        if ((castle & 8) && board[0x00] === (8 | ROOK) && !board[0x03] && !board[0x02] && !board[0x01] && !attacked(0x04, 0) && !attacked(0x03, 0) && !attacked(0x02, 0)) moveBuf[n++] = enc(0x04, 0x02, 0, F_CASTLE);
      }
    }
    return n;
  }

  // --- Faire / défaire ---
  const uCap = new Int8Array(1024), uCastle = new Int8Array(1024), uEp = new Int16Array(1024), uHalf = new Int16Array(1024);
  const uLo = new Int32Array(1024), uHi = new Int32Array(1024);
  let uLen = 0;
  function xorPiece(p, s) { hashLo ^= zPL[p * 128 + s]; hashHi ^= zPH[p * 128 + s]; }
  function make(m) {
    const from = mFrom(m), to = mTo(m), fl = mFlags(m), p = board[from], us = side;
    uLo[uLen] = hashLo; uHi[uLen] = hashHi; uCastle[uLen] = castle; uEp[uLen] = ep; uHalf[uLen] = half;
    histLo[histLen] = hashLo; histHi[histLen] = hashHi; histLen++;
    let cap = 0;
    if (fl & F_EP) { const cs = to + (us ? -16 : 16); cap = board[cs]; board[cs] = 0; xorPiece(cap, cs); }
    else if (board[to]) { cap = board[to]; xorPiece(cap, to); }
    uCap[uLen] = cap; uLen++;
    xorPiece(p, from);
    board[from] = 0;
    const np = (fl & F_PROMO) ? ((us << 3) | mPromo(m)) : p;
    board[to] = np; xorPiece(np, to);
    if ((p & 7) === KING) {
      kingSq[us] = to;
      if (fl & F_CASTLE) {
        let rf, rt;
        if (to === 0x76) { rf = 0x77; rt = 0x75; } else if (to === 0x72) { rf = 0x70; rt = 0x73; } else if (to === 0x06) { rf = 0x07; rt = 0x05; } else { rf = 0x00; rt = 0x03; }
        const rook = board[rf]; board[rf] = 0; board[rt] = rook; xorPiece(rook, rf); xorPiece(rook, rt);
      }
    }
    hashLo ^= zCL[castle]; hashHi ^= zCH[castle];
    castle &= castleMask[from] & castleMask[to];
    hashLo ^= zCL[castle]; hashHi ^= zCH[castle];
    if (ep >= 0) { hashLo ^= zEL[ep & 7]; hashHi ^= zEH[ep & 7]; }
    ep = (fl & F_DOUBLE) ? from + (us ? 16 : -16) : -1;
    if (ep >= 0) { hashLo ^= zEL[ep & 7]; hashHi ^= zEH[ep & 7]; }
    half = ((p & 7) === PAWN || cap) ? 0 : half + 1;
    side ^= 1; hashLo ^= zSL; hashHi ^= zSH;
    // légal ?
    if (attacked(kingSq[us], side)) { unmake(m); return false; }
    return true;
  }
  function unmake(m) {
    uLen--; histLen--;
    side ^= 1;
    const from = mFrom(m), to = mTo(m), fl = mFlags(m), us = side;
    let p = board[to];
    if (fl & F_PROMO) p = (us << 3) | PAWN;
    board[from] = p;
    board[to] = 0;
    const cap = uCap[uLen];
    if (fl & F_EP) board[to + (us ? -16 : 16)] = cap; else board[to] = cap;
    if ((p & 7) === KING) {
      kingSq[us] = from;
      if (fl & F_CASTLE) {
        let rf, rt;
        if (to === 0x76) { rf = 0x77; rt = 0x75; } else if (to === 0x72) { rf = 0x70; rt = 0x73; } else if (to === 0x06) { rf = 0x07; rt = 0x05; } else { rf = 0x00; rt = 0x03; }
        board[rf] = board[rt]; board[rt] = 0;
      }
    }
    castle = uCastle[uLen]; ep = uEp[uLen]; half = uHalf[uLen]; hashLo = uLo[uLen]; hashHi = uHi[uLen];
  }
  function makeNull() {
    uLo[uLen] = hashLo; uHi[uLen] = hashHi; uCastle[uLen] = castle; uEp[uLen] = ep; uHalf[uLen] = half; uCap[uLen] = 0; uLen++;
    histLo[histLen] = hashLo; histHi[histLen] = hashHi; histLen++;
    if (ep >= 0) { hashLo ^= zEL[ep & 7]; hashHi ^= zEH[ep & 7]; }
    ep = -1; half++;
    side ^= 1; hashLo ^= zSL; hashHi ^= zSH;
  }
  function unmakeNull() {
    uLen--; histLen--; side ^= 1;
    castle = uCastle[uLen]; ep = uEp[uLen]; half = uHalf[uLen]; hashLo = uLo[uLen]; hashHi = uHi[uLen];
  }

  // --- Évaluation progressive (milieu de partie / finale) ---
  const MG_VAL = [0, 82, 337, 365, 477, 1025, 0], EG_VAL = [0, 94, 281, 297, 512, 936, 0];
  const PHASE = [0, 0, 1, 1, 2, 4, 0];
  const T = s => s.trim().split(/[\s,]+/).map(Number);
  const PST_MG = [null,
    T(`0 0 0 0 0 0 0 0  50 50 50 50 50 50 50 50  10 10 20 30 30 20 10 10  5 5 10 25 25 10 5 5  0 0 0 20 20 0 0 0  5 -5 -10 0 0 -10 -5 5  5 10 10 -20 -20 10 10 5  0 0 0 0 0 0 0 0`),
    T(`-50 -40 -30 -30 -30 -30 -40 -50  -40 -20 0 0 0 0 -20 -40  -30 0 10 15 15 10 0 -30  -30 5 15 20 20 15 5 -30  -30 0 15 20 20 15 0 -30  -30 5 10 15 15 10 5 -30  -40 -20 0 5 5 0 -20 -40  -50 -40 -30 -30 -30 -30 -40 -50`),
    T(`-20 -10 -10 -10 -10 -10 -10 -20  -10 0 0 0 0 0 0 -10  -10 0 5 10 10 5 0 -10  -10 5 5 10 10 5 5 -10  -10 0 10 10 10 10 0 -10  -10 10 10 10 10 10 10 -10  -10 5 0 0 0 0 5 -10  -20 -10 -10 -10 -10 -10 -10 -20`),
    T(`0 0 0 0 0 0 0 0  5 10 10 10 10 10 10 5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  0 0 0 5 5 0 0 0`),
    T(`-20 -10 -10 -5 -5 -10 -10 -20  -10 0 0 0 0 0 0 -10  -10 0 5 5 5 5 0 -10  -5 0 5 5 5 5 0 -5  0 0 5 5 5 5 0 -5  -10 5 5 5 5 5 0 -10  -10 0 5 0 0 0 0 -10  -20 -10 -10 -5 -5 -10 -10 -20`),
    T(`-30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -20 -30 -30 -40 -40 -30 -30 -20  -10 -20 -20 -20 -20 -20 -20 -10  20 20 0 0 0 0 20 20  20 30 10 0 0 10 30 20`)
  ];
  const PST_EG = [null,
    T(`0 0 0 0 0 0 0 0  80 80 80 80 80 80 80 80  50 50 50 50 50 50 50 50  30 30 30 30 30 30 30 30  15 15 15 15 15 15 15 15  5 5 5 5 5 5 5 5  0 0 0 0 0 0 0 0  0 0 0 0 0 0 0 0`),
    PST_MG[2], PST_MG[3],
    T(`5 5 5 5 5 5 5 5  10 10 10 10 10 10 10 10  0 0 0 0 0 0 0 0  0 0 0 0 0 0 0 0  0 0 0 0 0 0 0 0  0 0 0 0 0 0 0 0  0 0 0 0 0 0 0 0  0 0 0 0 0 0 0 0`),
    PST_MG[5],
    T(`-50 -40 -30 -20 -20 -30 -40 -50  -30 -20 -10 0 0 -10 -20 -30  -30 -10 20 30 30 20 -10 -30  -30 -10 30 40 40 30 -10 -30  -30 -10 30 40 40 30 -10 -30  -30 -10 20 30 30 20 -10 -30  -30 -30 0 0 0 0 -30 -30  -50 -30 -30 -30 -30 -30 -30 -50`)
  ];
  const PASSED_MG = [0, 5, 10, 15, 25, 45, 70, 0], PASSED_EG = [0, 10, 20, 35, 60, 100, 160, 0];
  const pawnRows = [new Int8Array(8), new Int8Array(8)]; // nombre de pions par colonne
  const minRow = [new Int8Array(8), new Int8Array(8)], maxRow = [new Int8Array(8), new Int8Array(8)];

  function evaluate() {
    let mg0 = 0, mg1 = 0, eg0 = 0, eg1 = 0, phase = 0;
    let bishops0 = 0, bishops1 = 0;
    for (let c = 0; c < 2; c++) { pawnRows[c].fill(0); minRow[c].fill(8); maxRow[c].fill(-1); }
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = board[s];
      if ((p & 7) === PAWN) { const c = p >> 3, f = s & 7, r = s >> 4; pawnRows[c][f]++; if (r < minRow[c][f]) minRow[c][f] = r; if (r > maxRow[c][f]) maxRow[c][f] = r; }
    }
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = board[s];
      if (!p) continue;
      const t = p & 7, c = p >> 3, r = s >> 4, f = s & 7;
      const idx = c === 0 ? r * 8 + f : (7 - r) * 8 + f;
      let mg = MG_VAL[t] + PST_MG[t][idx], eg = EG_VAL[t] + PST_EG[t][idx];
      phase += PHASE[t];
      if (t === PAWN) {
        const opp = c ^ 1;
        let passed = true;
        for (let ff = f - 1; ff <= f + 1; ff++) {
          if (ff < 0 || ff > 7) continue;
          if (c === 0 ? minRow[opp][ff] < r : (maxRow[opp][ff] > r && maxRow[opp][ff] >= 0)) { passed = false; break; }
        }
        if (passed) { const adv = c === 0 ? 6 - r : r - 1; mg += PASSED_MG[adv]; eg += PASSED_EG[adv]; }
        if (pawnRows[c][f] > 1) { mg -= 8; eg -= 15; }
        if ((f === 0 || !pawnRows[c][f - 1]) && (f === 7 || !pawnRows[c][f + 1])) { mg -= 10; eg -= 14; }
      } else if (t === KNIGHT || t === BISHOP || t === ROOK || t === QUEEN) {
        let mob = 0;
        if (t === KNIGHT) { for (let i = 0; i < 8; i++) { const to = s + N_OFF[i]; if (!(to & 0x88) && (!board[to] || (board[to] >> 3) !== c)) mob++; } mg += (mob - 4) * 4; eg += (mob - 4) * 4; }
        else {
          const dirs = t === BISHOP ? B_DIR : t === ROOK ? R_DIR : K_OFF;
          for (let i = 0; i < dirs.length; i++) { const d = dirs[i]; let to = s + d; while (!(to & 0x88)) { const q = board[to]; if (!q) mob++; else { if ((q >> 3) !== c) mob++; break; } to += d; } }
          if (t === BISHOP) { mg += (mob - 6) * 5; eg += (mob - 6) * 5; if (c) bishops1++; else bishops0++; }
          else if (t === ROOK) {
            mg += (mob - 7) * 2; eg += (mob - 7) * 4;
            if (!pawnRows[c][f]) { if (!pawnRows[c ^ 1][f]) { mg += 25; eg += 10; } else { mg += 12; eg += 6; } }
          } else { mg += (mob - 13) * 1; eg += (mob - 13) * 2; }
        }
      } else if (t === KING) {
        // Abri de pions devant un roi roqué
        const homeRow = c === 0 ? 7 : 0;
        if (r === homeRow && (f <= 2 || f >= 5)) {
          const front = c === 0 ? r - 1 : r + 1;
          let missing = 0;
          for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1); ff++) {
            const q1 = board[front * 16 + ff], q2 = board[(c === 0 ? front - 1 : front + 1) * 16 + ff];
            if (q1 !== ((c << 3) | PAWN) && q2 !== ((c << 3) | PAWN)) missing++;
            if (!pawnRows[c][ff]) mg -= 12;
          }
          mg -= missing * 18;
        }
      }
      if (c === 0) { mg0 += mg; eg0 += eg; } else { mg1 += mg; eg1 += eg; }
    }
    if (bishops0 >= 2) { mg0 += 30; eg0 += 50; }
    if (bishops1 >= 2) { mg1 += 30; eg1 += 50; }
    if (phase > 24) phase = 24;
    let score = ((mg0 - mg1) * phase + (eg0 - eg1) * (24 - phase)) / 24;
    // Finale gagnante : repousser le roi adverse
    if (phase <= 6 && Math.abs(score) > 300) {
      const strong = score > 0 ? 0 : 1, ek = kingSq[strong ^ 1], ok = kingSq[strong];
      const er = ek >> 4, ef = ek & 7;
      const center = Math.max(3 - er, er - 4) + Math.max(3 - ef, ef - 4);
      const dist = Math.abs(er - (ok >> 4)) + Math.abs(ef - (ok & 7));
      const bonus = center * 12 + (14 - dist) * 5;
      score += strong === 0 ? bonus : -bonus;
    }
    score = side === 0 ? score + 10 : -score + 10;
    return score | 0;
  }
  function nonPawnMaterial(c) {
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = board[s]; if (p && (p >> 3) === c && (p & 7) !== PAWN && (p & 7) !== KING) return true; }
    return false;
  }

  // --- Table de transposition ---
  const TT_BITS = 19, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  const ttLock = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttScore = new Int16Array(TT_SIZE);
  const ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE);
  const EXACT = 1, LOWER = 2, UPPER = 3;
  function ttStore(depth, flag, score, move, ply) {
    const i = hashLo & TT_MASK;
    if (ttFlag[i] && ttLock[i] === hashHi && ttDepth[i] > depth && flag !== EXACT) return;
    if (score > MATE - 200) score += ply; else if (score < -MATE + 200) score -= ply;
    ttLock[i] = hashHi; ttMove[i] = move; ttScore[i] = score; ttDepth[i] = depth; ttFlag[i] = flag;
  }
  function ttClear() { ttFlag.fill(0); }

  // --- Recherche ---
  const killers = new Int32Array(MAXPLY * 2), history = new Int32Array(2 * 128 * 128);
  const pvTable = new Int32Array(MAXPLY * MAXPLY), pvLen = new Int32Array(MAXPLY);
  let nodes = 0, deadline = 0, stopped = false;
  const SEE_VAL = [0, 100, 320, 330, 500, 900, 20000];

  function isRepetition() {
    for (let i = histLen - 2; i >= 0 && i >= histLen - half; i -= 2) if (histLo[i] === hashLo && histHi[i] === hashHi) return true;
    return false;
  }
  function orderMoves(start, end, ttm, ply) {
    for (let i = start; i < end; i++) {
      const m = moveBuf[i];
      let sc;
      if (m === ttm) sc = 2000000;
      else {
        const fl = mFlags(m);
        if (fl & F_CAP) {
          const victim = fl & F_EP ? PAWN : board[mTo(m)] & 7, att = board[mFrom(m)] & 7;
          sc = 1000000 + SEE_VAL[victim] * 10 - SEE_VAL[att] / 10;
          if (fl & F_PROMO) sc += 50000;
        } else if (fl & F_PROMO) sc = mPromo(m) === QUEEN ? 950000 : 0;
        else if (m === killers[ply * 2]) sc = 900000;
        else if (m === killers[ply * 2 + 1]) sc = 800000;
        else sc = history[side * 16384 + mFrom(m) * 128 + mTo(m)];
      }
      scoreBuf[i] = sc;
    }
  }
  function pick(i, end) {
    let best = i;
    for (let j = i + 1; j < end; j++) if (scoreBuf[j] > scoreBuf[best]) best = j;
    if (best !== i) {
      const m = moveBuf[i]; moveBuf[i] = moveBuf[best]; moveBuf[best] = m;
      const s = scoreBuf[i]; scoreBuf[i] = scoreBuf[best]; scoreBuf[best] = s;
    }
    return moveBuf[i];
  }
  function quiesce(alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) stopped = true;
    if (stopped) return 0;
    if (ply >= MAXPLY - 1) return evaluate();
    const chk = inCheck(side);
    let best = -INF;
    if (!chk) {
      best = evaluate();
      if (best >= beta) return best;
      if (best > alpha) alpha = best;
    }
    const start = ply * 256, end = gen(ply, !chk);
    orderMoves(start, end, 0, ply);
    let legal = 0;
    const them = side ^ 1;
    for (let i = start; i < end; i++) {
      const m = pick(i, end), fl = mFlags(m);
      if (!chk) {
        const victim = fl & F_EP ? PAWN : board[mTo(m)] & 7, att = board[mFrom(m)] & 7;
        // Élagage delta et captures perdantes évidentes
        if (!(fl & F_PROMO) && best + SEE_VAL[victim] + 200 < alpha) continue;
        if (!(fl & F_PROMO) && SEE_VAL[att] > SEE_VAL[victim] + 50 && attacked(mTo(m), them)) continue;
      }
      if (!make(m)) continue;
      legal++;
      const sc = -quiesce(-beta, -alpha, ply + 1);
      unmake(m);
      if (stopped) return 0;
      if (sc > best) { best = sc; if (sc > alpha) { alpha = sc; if (sc >= beta) return sc; } }
    }
    if (chk && !legal) return -MATE + ply;
    return best;
  }
  function negamax(depth, alpha, beta, ply, allowNull) {
    pvLen[ply] = ply;
    if ((++nodes & 2047) === 0 && Date.now() > deadline) stopped = true;
    if (stopped) return 0;
    if (ply > 0 && (half >= 100 || isRepetition())) return 0;
    const chk = inCheck(side);
    if (chk) depth++;
    if (depth <= 0) return quiesce(alpha, beta, ply);
    if (ply >= MAXPLY - 2) return evaluate();
    const pvNode = beta - alpha > 1;
    // Distance au mat
    if (ply > 0) {
      const ma = Math.max(alpha, -MATE + ply), mb = Math.min(beta, MATE - ply - 1);
      if (ma >= mb) return ma;
    }
    const ti = hashLo & TT_MASK;
    let ttm = 0;
    if (ttFlag[ti] && ttLock[ti] === hashHi) {
      ttm = ttMove[ti];
      if (!pvNode && ply > 0 && ttDepth[ti] >= depth) {
        let s = ttScore[ti];
        if (s > MATE - 200) s -= ply; else if (s < -MATE + 200) s += ply;
        const fl = ttFlag[ti];
        if (fl === EXACT || (fl === LOWER && s >= beta) || (fl === UPPER && s <= alpha)) return s;
      }
    }
    let staticEval = 0;
    if (!chk && !pvNode) {
      staticEval = evaluate();
      if (depth <= 3 && staticEval - 110 * depth >= beta && Math.abs(beta) < MATE - 200) return staticEval;
      if (allowNull && depth >= 3 && staticEval >= beta && nonPawnMaterial(side)) {
        const R = depth >= 6 ? 3 : 2;
        makeNull();
        const s = -negamax(depth - 1 - R, -beta, -beta + 1, ply + 1, false);
        unmakeNull();
        if (stopped) return 0;
        if (s >= beta && s < MATE - 200) return s;
      }
    }
    const start = ply * 256, end = gen(ply, false);
    orderMoves(start, end, ttm, ply);
    const alphaOrig = alpha;
    let best = -INF, bestMove = 0, legal = 0;
    for (let i = start; i < end; i++) {
      const m = pick(i, end), fl = mFlags(m);
      const quiet = !(fl & (F_CAP | F_PROMO));
      if (!make(m)) continue;
      legal++;
      const gives = inCheck(side);
      let sc;
      if (legal === 1) sc = -negamax(depth - 1, -beta, -alpha, ply + 1, true);
      else {
        let r = 0;
        if (depth >= 3 && legal > 3 && quiet && !chk && !gives && m !== killers[ply * 2] && m !== killers[ply * 2 + 1]) r = legal > 10 && depth >= 5 ? 2 : 1;
        sc = -negamax(depth - 1 - r, -alpha - 1, -alpha, ply + 1, true);
        if (sc > alpha && r) sc = -negamax(depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (sc > alpha && sc < beta) sc = -negamax(depth - 1, -beta, -alpha, ply + 1, true);
      }
      unmake(m);
      if (stopped) return 0;
      if (sc > best) {
        best = sc; bestMove = m;
        if (sc > alpha) {
          alpha = sc;
          pvTable[ply * MAXPLY + ply] = m;
          for (let j = ply + 1; j < pvLen[ply + 1]; j++) pvTable[ply * MAXPLY + j] = pvTable[(ply + 1) * MAXPLY + j];
          pvLen[ply] = pvLen[ply + 1];
          if (sc >= beta) {
            if (quiet) {
              if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
              const hi = side * 16384 + mFrom(m) * 128 + mTo(m);
              history[hi] += depth * depth;
              if (history[hi] > 400000) for (let k = 0; k < history.length; k++) history[k] >>= 1;
            }
            ttStore(depth, LOWER, sc, m, ply);
            return sc;
          }
        }
      }
    }
    if (!legal) return chk ? -MATE + ply : 0;
    ttStore(depth, best > alphaOrig ? EXACT : UPPER, best, bestMove, ply);
    return best;
  }
  function moveToUci(m) { return sqName(mFrom(m)) + sqName(mTo(m)) + (mFlags(m) & F_PROMO ? "?pnbrqk"[mPromo(m)] : ""); }
  function legalMoves() {
    const out = [], end = gen(MAXPLY - 1, false);
    for (let i = (MAXPLY - 1) * 256; i < end; i++) { const m = moveBuf[i]; if (make(m)) { unmake(m); out.push(m); } }
    return out;
  }
  function findUci(u) { return legalMoves().find(m => moveToUci(m) === u) || 0; }
  function playUci(u) { const m = findUci(u); if (!m) return false; make(m); uLen = 0; return true; }
  function setPosition(fen, moves) {
    setFen(fen);
    for (const u of moves || []) { const m = findUci(u); if (!m) break; make(m); uLen = 0; }
  }
  function pvFromTable() { const out = []; for (let j = 0; j < pvLen[0]; j++) out.push(moveToUci(pvTable[j])); return out; }

  // Recherche itérative. Renvoie le meilleur coup, le score (point de vue du camp au trait), la profondeur et la variante.
  function search(opts) {
    const maxDepth = opts.depth || 64, time = opts.time || 1000;
    deadline = Date.now() + time; stopped = false; nodes = 0;
    killers.fill(0);
    for (let k = 0; k < history.length; k++) history[k] >>= 2;
    const t0 = Date.now();
    let result = null, prev = 0;
    const roots = legalMoves();
    if (!roots.length) return { move: null, score: inCheck(side) ? -MATE : 0, depth: 0, pv: [], nodes: 0 };
    for (let d = 1; d <= maxDepth; d++) {
      let alpha = -INF, beta = INF;
      if (d >= 4 && result) { alpha = prev - 40; beta = prev + 40; }
      let s, delta = 40;
      for (;;) {
        s = negamax(d, alpha, beta, 0, false);
        if (stopped) break;
        if (s <= alpha) { alpha = Math.max(-INF, s - delta); delta *= 3; }
        else if (s >= beta) { beta = Math.min(INF, s + delta); delta *= 3; }
        else break;
      }
      if (stopped && result) break;
      if (pvLen[0] > 0) {
        prev = s;
        result = { move: moveToUci(pvTable[0]), score: s, depth: d, pv: pvFromTable(), nodes };
        if (opts.onDepth) opts.onDepth(result);
      }
      if (stopped) break;
      if (Math.abs(s) > MATE - 200 && d >= 4) break;
      if (Date.now() - t0 > time * 0.55) break;
    }
    if (!result) result = { move: moveToUci(roots[0]), score: 0, depth: 0, pv: [moveToUci(roots[0])], nodes };
    result.nodes = nodes;
    return result;
  }
  // Score de chaque coup légal, précis autour du meilleur (fenêtre de 400 centipions)
  function analyseAll(opts) {
    const time = opts.time || 1500;
    const main = search({ time: time * 0.45, depth: opts.depth || 64 });
    const roots = legalMoves();
    const out = new Map();
    const deadlineAll = Date.now() + time * 0.55;
    // Passe rapide à faible profondeur pour tous les coups
    deadline = Date.now() + time; stopped = false;
    for (const m of roots) {
      make(m);
      const s = -negamax(1, -INF, INF, 1, true);
      unmake(m);
      out.set(moveToUci(m), { score: s, depth: 2, bound: 0 });
    }
    if (main.move) out.set(main.move, { score: main.score, depth: main.depth, bound: 0 });
    // Passe profonde, du plus prometteur au moins prometteur
    const D = Math.max(1, main.depth - 1);
    const lo = main.score - 400, hi = main.score + 1;
    const ordered = roots.slice().sort((a, b) => out.get(moveToUci(b)).score - out.get(moveToUci(a)).score);
    for (const m of ordered) {
      const u = moveToUci(m);
      if (u === main.move) continue;
      deadline = deadlineAll; stopped = false;
      make(m);
      const s = -negamax(D - 1, -hi, -lo, 1, true);
      unmake(m);
      if (stopped) break;
      out.set(u, { score: Math.min(s, main.score), depth: D, bound: s <= lo ? -1 : 0 });
    }
    return { best: main.move, bestScore: main.score, depth: main.depth, pv: main.pv, moves: [...out.entries()].map(([u, v]) => ({ u, ...v })) };
  }
  // Menace : ce que l'adversaire jouerait s'il avait le trait
  function threat(opts) {
    if (inCheck(side)) return null;
    const t = opts.time || 400;
    const base = search({ time: t * 0.35, depth: opts.depth || 5 });
    makeNull();
    const r = search({ time: t * 0.65, depth: opts.depth || 5 });
    unmakeNull();
    r.base = base.score;
    return r;
  }
  // Coup de l'ordinateur selon le niveau
  function play(opts) {
    const roots = legalMoves();
    if (!roots.length) return null;
    if (opts.random && Math.random() < opts.random) return { move: moveToUci(roots[(Math.random() * roots.length) | 0]) };
    if (!opts.noise) return search({ time: opts.time, depth: opts.depth });
    const a = analyseAll({ time: opts.time, depth: opts.depth });
    let best = null, bestN = -Infinity;
    for (const x of a.moves) {
      const n = x.score + (x.score > MATE - 200 ? 1e6 : 0) + (Math.random() * 2 - 1) * opts.noise;
      if (n > bestN) { bestN = n; best = x.u; }
    }
    return { move: best, score: a.bestScore };
  }
  function handle(job) {
    setPosition(job.fen, job.moves);
    let res = null;
    if (job.type === "search") res = search({ time: job.time, depth: job.depth });
    else if (job.type === "analyse") res = analyseAll({ time: job.time, depth: job.depth });
    else if (job.type === "threat") res = threat({ time: job.time, depth: job.depth });
    else if (job.type === "play") res = play(job);
    else if (job.type === "eval") res = { score: evaluate() };
    return { id: job.id, type: job.type, res };
  }
  // Pour les tests
  function perft(d) {
    if (!d) return 1;
    let n = 0;
    const ply = 40 + d, end = gen(ply, false);
    for (let i = ply * 256; i < end; i++) { const m = moveBuf[i]; if (make(m)) { n += perft(d - 1); unmake(m); } }
    return n;
  }
  return { handle, setPosition, search, analyseAll, threat, play, evaluate, perft, MATE, clear: ttClear };
}
