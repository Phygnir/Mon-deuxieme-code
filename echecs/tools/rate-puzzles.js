// Estime la difficulté (classement) de chaque problème vérifié.
// Idée : la profondeur minimale à laquelle le moteur trouve la solution, et la garde, mesure ce qu'il faut « voir ».
// Usage : node tools/rate-puzzles.js sortie.jsonl entrée1.jsonl [entrée2.jsonl ...] [--part i/n]
const { Chess, makeEngine } = require("../tests/load.js");
const fs = require("fs");
const args = process.argv.slice(2);
const partArg = args.find(a => a.startsWith("--part="));
const [part, parts] = partArg ? partArg.slice(7).split("/").map(Number) : [0, 1];
const [outp, ...inputs] = args.filter(a => !a.startsWith("--"));
const E = makeEngine();
const seen = new Set(), list = [];
for (const f of inputs) for (const l of fs.readFileSync(f, "utf8").split("\n")) {
  if (!l.trim()) continue;
  const p = JSON.parse(l), key = p.fen.split(" ").slice(0, 2).join(" ");
  if (seen.has(key)) continue;
  seen.add(key); list.push(p);
}
function depthFound(fen, moves, sol) {
  let prev = false;
  for (let d = 1; d <= 9; d++) {
    E.clear();
    const r = E.handle({ type: "search", fen, moves, depth: d, time: 4000 }).res;
    const ok = r && r.move === sol;
    if (ok && prev) return d - 1;
    prev = ok;
  }
  return prev ? 9 : 10;
}
let n = 0;
for (let i = part; i < list.length; i += parts) {
  const p = list[i];
  let D = 1;
  for (let k = 0; k < p.line.length; k += 2) D = Math.max(D, depthFound(p.fen, p.line.slice(0, k), p.line[k]));
  const g = new Chess(p.fen), m = g.find(p.line[0]);
  // Leurres : autres coups forcés (prises, échecs) qui attirent l'œil
  let decoys = 0;
  for (const x of g.moves()) {
    if (x.from === m.from && x.to === m.to) continue;
    g.make(x, true); const chk = g.inCheck(); g.undo();
    if (x.captured || chk) decoys++;
  }
  g.make(m);
  const quiet = !m.captured && !g.inCheck() && !m.promo;
  const userMoves = Math.ceil(p.line.length / 2);
  const t = p.tags;
  let r = 560 + 120 * (D - 1) + 170 * (userMoves - 1) + Math.min(180, decoys * 22);
  if (quiet) r += 260;
  if (t.includes("sacrifice")) r += 240;
  if (t.includes("discovered")) r += 170;
  if (t.includes("pin") || t.includes("skewer")) r += 110;
  if (t.includes("fork")) r += 140;
  if (t.includes("mate")) r += 60 * userMoves;
  if (m.piece.toLowerCase() === "n" && t.includes("fork")) r += 40;
  // Petite variation déterministe pour éviter les égalités
  let h = 0; for (const c of p.fen) h = (h * 31 + c.charCodeAt(0)) | 0;
  r += ((h >>> 0) % 81) - 40;
  p.r = Math.max(500, Math.min(2500, Math.round(r / 10) * 10));
  p.depth = D;
  fs.appendFileSync(outp, JSON.stringify(p) + "\n");
  n++;
}
console.log("notés", n);
