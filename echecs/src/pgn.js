// ---------- Lecture des parties au format PGN (Lichess, Chess.com, ChessBase...) ----------
// Renvoie une liste de parties { tags, fen, moves: [{u, san}], result } ou lève une erreur lisible.
// Les coups peuvent être en notation anglaise (N, B, R, Q, K) ou française (C, F, T, D, R).
const PGN_FR = { C: "N", F: "B", T: "R", D: "Q", R: "K" };
const sanKey = s => s.replace(/[+#!?=x]/g, "").replace(/e\.p\.$/, "").replace(/^0-0-0/, "O-O-O").replace(/^0-0/, "O-O");
function pgnFind(g, tok) {
  const moves = g.moves(), keys = moves.map(m => sanKey(g.san(m)));
  const tryKey = k => { const i = keys.indexOf(k); return i >= 0 && keys.indexOf(k, i + 1) < 0 ? moves[i] : null; };
  let k = sanKey(tok);
  let m = tryKey(k);
  // Promotion écrite sans pièce (e8) : on prend la dame
  if (!m && /^[a-h]x?[18]$/.test(tok.replace(/[+#!?]/g, ""))) m = tryKey(k + "Q");
  // Notation française : C, F, T, D, R
  if (!m && /^[CFTDR]/.test(k)) m = tryKey(PGN_FR[k[0]] + k.slice(1).replace(/[CFTD]$/, c => PGN_FR[c]));
  else if (!m && /[CFTD]$/.test(k)) m = tryKey(k.replace(/[CFTD]$/, c => PGN_FR[c]));
  // Coup donné en notation longue (e2e4, g1f3)
  if (!m && /^[a-h][1-8]-?[a-h][1-8][qrbn]?$/i.test(tok)) m = g.find(tok.replace("-", "").toLowerCase());
  return m;
}
function parsePgn(text) {
  const games = [];
  // Une partie = ses en-têtes puis ses coups ; on découpe sur les blocs d'en-têtes
  const src = text.replace(/\r/g, "").replace(/^﻿/, "");
  const parts = src.split(/\n\s*\n(?=\s*\[)/);
  for (const part of parts) {
    if (!part.trim()) continue;
    const tags = {};
    const body = part.replace(/^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm, (_, k, v) => { tags[k] = v.replace(/\\(.)/g, "$1"); return ""; });
    // Retire commentaires, variantes (imbriquées), annotations numériques
    let mt = body.replace(/\{[^}]*\}/g, " ").replace(/;[^\n]*/g, " ");
    let prev;
    do { prev = mt; mt = mt.replace(/\([^()]*\)/g, " "); } while (mt !== prev);
    mt = mt.replace(/\$\d+/g, " ");
    const toks = mt.split(/\s+/).filter(Boolean);
    if (!toks.length && !Object.keys(tags).length) continue;
    const fen = tags.FEN || null;
    const g = new Chess(fen || START), moves = [];
    let result = tags.Result || "*";
    for (let t of toks) {
      if (/^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(t)) { result = t.replace("½-½", "1/2-1/2"); break; }
      t = t.replace(/^\d+\.(\.\.)?/, "").replace(/^\.+/, "");
      if (!t || /^\d+$/.test(t)) continue;
      if (/^[!?]+$/.test(t) || /^e\.p\.?$/i.test(t)) continue;
      const m = pgnFind(g, t);
      if (!m) {
        const n = Math.floor(moves.length / 2) + (fen ? +(fen.split(" ")[5] || 1) : 1);
        throw new Error(`Coup illisible « ${t} » (coup ${n} des ${g.turn === "w" ? "Blancs" : "Noirs"}${tags.White ? `, partie ${tags.White} – ${tags.Black || "?"}` : ""}).`);
      }
      moves.push({ u: uci(m), san: g.san(m) });
      g.make(m);
    }
    if (moves.length) games.push({ tags, fen, moves, result });
  }
  if (!games.length) throw new Error("Aucune partie trouvée. Colle le texte PGN complet (les en-têtes entre crochets puis les coups).");
  return games;
}
