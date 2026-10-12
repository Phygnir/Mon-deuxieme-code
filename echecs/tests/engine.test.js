const { Chess, makeEngine, START } = require("./load.js");
const E = makeEngine();
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log("ÉCHEC", msg); } else console.log("ok  ", msg); };
// 1. Perft
const cases = [[START, 4, 197281], ["r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 3, 97862],
  ["8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", 5, 674624], ["r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", 4, 422333],
  ["rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", 3, 62379]];
for (const [f, d, n] of cases) { E.setPosition(f, []); const t = Date.now(); const r = E.perft(d); ok(r === n, `perft ${d} = ${r} (${n}) ${Date.now() - t}ms`); }
// 2. Vitesse
E.setPosition(START, []); let r = E.search({ time: 2000 }); console.log("départ :", r.move, r.score, "prof", r.depth, "nœuds", r.nodes);
E.setPosition("r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 8", []); r = E.search({ time: 2000 }); console.log("milieu :", r.move, r.score, "prof", r.depth, "nœuds", r.nodes);
// 3. Tactique
const T = [
  ["r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", "b5c7", "fourchette de cavalier"],
  ["r5k1/8/8/8/8/8/5PPP/3Q2K1 w - - 0 1", "d1d5", "fourchette de dame"],
  ["6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", "a1a8", "mat du couloir"],
  ["5r1k/6pp/8/3Q2N1/2B5/8/8/6K1 w - - 0 1", "d5g8", "mat en 2 Philidor"],
  ["4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 17", "b3b8", "Opéra Morphy"],
  ["rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9", "d3d8", "Réti mat en 3"],
  ["5r1k/6pp/8/6N1/2Q5/8/8/6K1 w - - 0 1", "g5f7", "mat étouffé en 4"],
];
for (const [f, best, name] of T) { E.setPosition(f, []); const t = Date.now(); const r = E.search({ time: 3000 }); ok(r.move === best, `${name} : ${r.move} (${best}) score ${r.score} prof ${r.depth} ${Date.now() - t}ms`); }
console.log(fails ? fails + " échec(s)" : "tout est bon");
process.exitCode = fails ? 1 : 0;
