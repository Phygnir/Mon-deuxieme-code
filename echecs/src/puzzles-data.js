// Problèmes tirés de parties autojouées, vérifiés par tools/verify-puzzles.js (solution unique à chaque coup).
// Fichier généré par tools/build-puzzles.js : ne pas modifier à la main.
const MINED = [
  {"fen":"r3kbnr/1p2ppp1/8/2p3Bp/p7/1nqPN1PP/R1P1KP2/3Q1B1R w kq - 0 22","line":["c2b3"],"tags":["capture"],"before":"r3kbnr/1p2ppp1/8/2p3Bp/p7/1nNPN1PP/RqP1KP2/3Q1B1R b kq - 6 21","last":"b2c3"},
  {"fen":"r2qkb1r/p1p1ppp1/1pn3b1/3pN1B1/3P3p/2N1P3/PPPQ1PPP/R4K1R w kq - 0 12","line":["e5c6"],"tags":["capture"],"before":"r2qkb1r/p1p1ppp1/1pn3b1/3pN1Bp/3P4/2N1P3/PPPQ1PPP/R4K1R b kq - 1 11","last":"h5h4"},
  {"fen":"rnb2rk1/pp2bpp1/n3p2p/2p1P3/3p1B1P/P1PP1NP1/Rq3P2/1N1QKBR1 b - - 2 15","line":["b2a2"],"tags":["capture"],"before":"rnb2rk1/pp2bpp1/n3p2p/2p1P3/3p1B1P/P1PP1NP1/1q3P2/RN1QKBR1 w Q - 1 15","last":"a1a2"},
  {"fen":"r5kr/ppp2p1p/2nq3B/3p1P2/6n1/6Q1/PPP2PPP/R3KB1R w KQ - 3 14","line":["g3g4"],"tags":["check","capture"],"before":"r5kr/ppp2p1p/2nq1n1B/3p1P2/8/6Q1/PPP2PPP/R3KB1R b KQ - 2 13","last":"f6g4"},
  {"fen":"r1b1k2r/1pppqppp/pN3n2/1B2p3/1P1nP3/P4N2/2PPQPPP/R1B1K2R b KQkq - 0 9","line":["d4e2"],"tags":["capture"],"before":"r1b1k2r/1pppqppp/pb3n2/1B1Np3/1P1nP3/P4N2/2PPQPPP/R1B1K2R w KQkq - 2 9","last":"d5b6"},
  {"fen":"3r4/p6k/7p/2pb1p2/5P2/P1p3rp/1PPR3K/3R1B2 b - - 1 30","line":["c3d2"],"tags":["capture"],"before":"3r4/p6k/7p/2pb1p2/5P2/P1p3rp/1PPR3K/R4B2 w - - 0 30","last":"a1d1"},
  {"fen":"r3k3/pp6/6rp/1Pb1Bp2/3p1N2/3P4/2P1nP2/R1K4R w - - 7 45","line":["f4e2"],"tags":["capture"],"before":"r3k3/pp6/6rp/1Pb1Bp2/3p1N2/2nP4/2P2P2/R1K4R b - - 6 44","last":"c3e2"},
  {"fen":"1rb1kb1r/1N2ppp1/2pq3p/4Q3/p2P3P/3P1N2/P3K1P1/RR6 w k - 1 24","line":["b7d6"],"tags":["check","capture","fork","discovered"],"before":"1r2kb1r/1N1bppp1/2pq3p/4Q3/p2P3P/3P1N2/P3K1P1/RR6 b k - 0 23","last":"d7c8"},
  {"fen":"r3kb1r/pppq1ppp/2B1p3/3p3Q/8/2nPP3/PPP2PPP/R1B1K2R b KQkq - 0 9","line":["d7c6"],"tags":["capture"],"before":"r3kb1r/pppq1ppp/2n1p3/1B1p3Q/8/2nPP3/PPP2PPP/R1B1K2R w KQkq - 0 9","last":"b5c6"},
  {"fen":"r3r3/1qp3k1/2p1p3/p1PpNp2/P2Pnb1p/1P2P2P/2Q3P1/R3B1K1 b - - 1 45","line":["f4e3","g1h1","e3d4","a1d1","d4e5"],"tags":["check","capture"],"before":"r3r3/1qp3k1/2p1p3/p1PpNp2/P2Pnb1p/1P2P2P/2Q3PK/R3B3 w - - 0 45","last":"h2g1"},
  {"fen":"r3k1q1/b1p5/p2pQB2/1p1Pp3/7r/3P4/PPP2PP1/R3K3 b - - 2 27","line":["g8e6","d5e6","h4h1","e1e2","h1a1"],"tags":[],"before":"r3k1q1/b1p5/p2p1B2/1p1PpQ2/7r/3P4/PPP2PP1/R3K3 w - - 1 27","last":"f5e6"},
  {"fen":"r3k2r/ppp4p/3b1p2/6p1/2Pn3P/5P2/PP2BP2/R1B1K1R1 b Qkq - 4 17","line":["d4c2","e1f1","c2a1"],"tags":["check","fork"],"before":"r3k2r/ppp4p/3b1p2/6p1/2Pn3P/5P2/PP3P2/R1B1KBR1 w Qkq - 3 17","last":"f1e2"},
  {"fen":"rn2k2r/ppp3p1/3qp3/1b1p2Pp/3P1p2/P4NRP/1PP2P2/R1Q1KB2 b Qkq - 1 20","line":["b5f1"],"tags":[],"before":"rn2k2r/ppp3p1/3qp3/1b1p2Pp/3P1p2/P3QNRP/1PP2P2/R3KB2 w Qkq - 0 20","last":"e3c1"},
  {"fen":"r7/1p5r/4p1kp/2Pp1p2/b1qP1PP1/b1B2B1P/4N1RK/1Q6 w - - 1 51","line":["g4f5","g6f6","g2g6","f6e7","b1b7","a4d7","g6e6"],"tags":["check"],"before":"r7/1p5r/2b1p1kp/2Pp1p2/2qP1PP1/b1B2B1P/4N1RK/1Q6 b - - 0 50","last":"c6a4"}
];
