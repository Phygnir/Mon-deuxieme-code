// Vérifie la lecture des parties PGN (src/pgn.js).
const fs = require("fs"), path = require("path"), assert = require("assert");
const { Chess, uci, START } = require("./load.js");
const { parsePgn } = new Function("Chess", "uci", "START", fs.readFileSync(path.join(__dirname, "..", "src", "pgn.js"), "utf8") + "; return { parsePgn };")(Chess, uci, START);
// Export Lichess : en-têtes, horloges, évaluations, variantes imbriquées, NAG
const lichess = `[Event "Rated Blitz game"]
[Site "https://lichess.org/abcd1234"]
[White "alice"]
[Black "bob"]
[Result "0-1"]

1. e4 { [%eval 0.2] [%clk 0:03:00] } 1... e5 { [%clk 0:03:00] } 2. Nf3 Nc6 (2... d6 3. d4 (3. Bc4 Be7) exd4) 3. Bc4 Nd4?! $6 4. Nxe5?? Qg5! 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3# 0-1


[Event "Casual"]
[White "bob"]
[Black "alice"]
[Result "1-0"]

1.d4 d5 2.c4 dxc4 3.e3 b5 4.a4 c6 5.axb5 cxb5 6.Qf3 1-0`;
const gs = parsePgn(lichess);
assert.strictEqual(gs.length, 2);
assert.strictEqual(gs[0].moves.length, 14);
assert.strictEqual(gs[0].moves[13].u, "d4f3");
assert.strictEqual(gs[0].result, "0-1");
assert.strictEqual(gs[0].tags.White, "alice");
assert.strictEqual(gs[1].moves.length, 11);
// Roques, prise en passant, promotion avec et sans « = »
const g3 = parsePgn(`1. e4 Nf6 2. e5 d5 3. exd6 e.p. Qxd6 4. Nf3 Bg4 5. Be2 Nc6 6. O-O O-O-O *`)[0];
assert.strictEqual(g3.moves[4].u, "e5d6"); assert.strictEqual(g3.moves[11].u, "e8c8");
const prom = parsePgn(`[FEN "8/P7/8/8/8/8/6k1/4K3 w - - 0 1"]\n[SetUp "1"]\n\n1. a8=Q Kg3 *`)[0];
assert.strictEqual(prom.moves[0].u, "a7a8q"); assert(prom.fen);
assert.strictEqual(parsePgn(`[FEN "8/P7/8/8/8/8/6k1/4K3 w - - 0 1"]\n\n1. a8Q *`)[0].moves[0].u, "a7a8q");
// Notation française (Chess.com en français, carnets)
const fr = parsePgn(`1. e4 e5 2. Cf3 Cc6 3. Fb5 a6 4. Fa4 Cf6 5. O-O Fe7 6. Te1 b5 7. Fb3 d6 8. c3 O-O 9. h3 Dd7 *`)[0];
assert.strictEqual(fr.moves.length, 18); assert.strictEqual(fr.moves[17].u, "d8d7");
// Erreur lisible
assert.throws(() => parsePgn(`1. e4 e5 2. Ke2 Qh4 3. Qxf7 *`), /Coup illisible « Qxf7 » \(coup 3 des Blancs/);
assert.throws(() => parsePgn(`bonjour`), /Coup illisible|Aucune partie/);
assert.throws(() => parsePgn(`  `), /Aucune partie/);
console.log("pgn ok");
