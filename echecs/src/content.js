// ---------- Contenu pédagogique ----------
const FR_LETTER = { K: "R", Q: "D", R: "T", B: "F", N: "C" };
const NAME = { p: "pion", n: "cavalier", b: "fou", r: "tour", q: "dame", k: "roi" };
const POSS = { p: "ton", n: "ton", b: "ton", r: "ta", q: "ta", k: "ton" };
const frSan = s => s.replace(/[KQRBN]/g, ch => FR_LETTER[ch]);
const pieceEl = (p, cls = "") => `<span class="pc ${colorOf(p)}${p.toUpperCase()}${cls ? " " + cls : ""}"></span>`;

const L_DEBUT = [
  { id: "plateau", t: "L'échiquier", d: "Les cases, les colonnes, les rangées", g: "k", steps: [
    { k: "info", fen: EMPTY, x: "L'échiquier compte <strong>64 cases</strong>. Les colonnes vont de <strong>a</strong> à <strong>h</strong>, les rangées de <strong>1</strong> à <strong>8</strong>. Chaque case a un nom : sa colonne puis sa rangée, comme <strong>e4</strong>." },
    { k: "info", fen: START, x: "Voici la position de départ. Pour bien poser l'échiquier, la case en bas à droite (<strong>h1</strong>) doit être claire. La dame se place sur sa couleur : dame blanche sur <strong>d1</strong>, dame noire sur <strong>d8</strong>. Les Blancs jouent toujours le premier coup." },
    { k: "square", fen: EMPTY, targets: ["e4", "a1", "h8", "d5", "c7", "f2"], x: "À toi : clique sur la case demandée." }
  ]},
  { id: "tour", t: "La tour", d: "En ligne droite · vaut 5 points", g: "r", steps: [
    { k: "info", fen: "8/8/8/8/3R4/8/8/8 w - - 0 1", show: "d4", x: "La <strong>tour</strong> se déplace en ligne droite, à l'horizontale ou à la verticale, d'autant de cases qu'elle veut. Elle ne saute jamais par-dessus une autre pièce. Les points montrent ses cases possibles." },
    { k: "stars", fen: "8/8/8/8/8/8/8/R7 w - - 0 1", stars: ["a8", "h8", "h1"], par: 3, x: "Ramasse toutes les étoiles avec la tour, en un minimum de coups." },
    { k: "stars", fen: "8/8/8/8/8/8/8/R7 w - - 0 1", stars: ["d1", "d5", "g5", "g8"], par: 4, x: "Encore un parcours. Vise le score parfait." }
  ]},
  { id: "fou", t: "Le fou", d: "En diagonale · vaut 3 points", g: "b", steps: [
    { k: "info", fen: "8/8/8/8/3B4/8/8/8 w - - 0 1", show: "d4", x: "Le <strong>fou</strong> se déplace en diagonale, aussi loin qu'il veut. Il reste toujours sur la même couleur de case : chaque camp a un fou de cases claires et un fou de cases foncées." },
    { k: "stars", fen: "8/8/8/8/8/8/8/2B5 w - - 0 1", stars: ["e3", "g5", "d8"], par: 3, x: "Ramasse les étoiles avec le fou." }
  ]},
  { id: "dame", t: "La dame", d: "Tour + fou · vaut 9 points", g: "q", steps: [
    { k: "info", fen: "8/8/8/8/3Q4/8/8/8 w - - 0 1", show: "d4", x: "La <strong>dame</strong> combine la tour et le fou : lignes droites et diagonales. C'est la pièce la plus forte. Ne la sors pas trop tôt, elle se ferait chasser." },
    { k: "stars", fen: "8/8/8/8/8/8/8/3Q4 w - - 0 1", stars: ["h5", "e8", "a4"], par: 3, x: "Trois étoiles, trois coups de dame." }
  ]},
  { id: "roi", t: "Le roi", d: "Une case à la fois · la pièce à protéger", g: "k", steps: [
    { k: "info", fen: "8/8/8/8/3K4/8/8/8 w - - 0 1", show: "d4", x: "Le <strong>roi</strong> avance d'une seule case, dans toutes les directions. Il ne peut jamais aller sur une case attaquée. Le but de la partie : piéger le roi adverse." },
    { k: "stars", fen: "8/8/8/8/8/8/8/4K3 w - - 0 1", stars: ["e3", "f4", "g4"], par: 4, x: "Promène le roi jusqu'aux étoiles." }
  ]},
  { id: "cavalier", t: "Le cavalier", d: "En L, il saute · vaut 3 points", g: "n", steps: [
    { k: "info", fen: "8/8/8/2PPP3/2PNP3/2PPP3/8/8 w - - 0 1", show: "d4", x: "Le <strong>cavalier</strong> bouge en <strong>L</strong> : deux cases dans une direction, puis une sur le côté. C'est la seule pièce qui saute par-dessus les autres. Ici, entouré de pions, il peut quand même sortir." },
    { k: "stars", fen: "8/8/8/8/8/8/8/1N6 w - - 0 1", stars: ["c3", "d5", "f6"], par: 3, x: "Saute d'étoile en étoile." },
    { k: "stars", fen: "8/8/8/8/8/8/8/6N1 w - - 0 1", stars: ["g3", "h5", "f4"], par: 4, x: "Plus difficile : certaines étoiles sont voisines, le cavalier doit faire un détour." }
  ]},
  { id: "pion", t: "Le pion", d: "Avance tout droit, prend en diagonale", g: "p", steps: [
    { k: "info", fen: "8/8/8/8/8/8/4P3/8 w - - 0 1", show: "e2", x: "Le <strong>pion</strong> avance tout droit d'une case. Lors de son premier coup, il peut avancer de deux cases. Il ne recule jamais." },
    { k: "move", fen: START, accept: ["e2e4"], x: "Avance le pion e de deux cases.", ok: "Bien : e2-e4, le coup d'ouverture le plus joué au monde." },
    { k: "move", fen: "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1", accept: ["e4d5"], x: "Le pion ne prend pas comme il avance : il capture <strong>en diagonale</strong>, d'une case vers l'avant. Prends le pion noir.", ok: "Exact : exd5." }
  ]},
  { id: "capture", t: "Capturer", d: "La valeur des pièces", g: "q", steps: [
    { k: "info", fen: START, x: "Pour capturer, on pose sa pièce sur la case d'une pièce adverse, qui sort du jeu. Retiens les valeurs : <strong>pion 1</strong>, <strong>cavalier 3</strong>, <strong>fou 3</strong>, <strong>tour 5</strong>, <strong>dame 9</strong>. Le roi ne se capture jamais." },
    { k: "move", fen: "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1", accept: ["d1d5"], x: "La dame noire n'est protégée par rien. Prends-la avec ta tour.", ok: "+9 points ! Une pièce non protégée s'appelle une pièce « en prise »." },
    { k: "move", fen: "4k3/8/4p3/1b1p4/8/2N5/8/4K3 w - - 0 1", accept: ["c3b5"], x: "Ton cavalier peut capturer deux pièces. Une seule capture est gratuite. Laquelle ?", no: "Le pion d5 est protégé par le pion e6 : tu donnerais ton cavalier (3 points) pour un pion (1 point).", ok: "Bien vu : le fou b5 n'était pas défendu, +3 points. Avant de prendre, demande-toi toujours si l'adversaire peut reprendre." }
  ]},
  { id: "echec", t: "L'échec", d: "Attaquer le roi, et se défendre", g: "k", steps: [
    { k: "info", fen: "4k3/8/8/8/8/8/8/4R1K1 b - - 0 1", x: "Quand le roi est attaqué, on dit qu'il est <strong>en échec</strong>. Il faut immédiatement parer : <strong>déplacer le roi</strong>, <strong>prendre la pièce</strong> qui attaque, ou <strong>s'interposer</strong>. Il est interdit de laisser son roi en échec." },
    { k: "move", fen: "4k3/8/8/8/8/8/8/R5K1 w - - 0 1", goal: "check", x: "Donne échec au roi noir avec ta tour.", ok: "Échec ! Le roi noir doit maintenant bouger." },
    { k: "move", fen: "4k3/8/8/8/8/8/4q3/3QK3 w - - 0 1", accept: ["d1e2", "e1e2"], x: "Ton roi est en échec par la dame noire. Pare en <strong>prenant</strong> l'attaquant.", ok: "Parfait, la menace a disparu et tu as gagné une dame." },
    { k: "move", fen: "4r1k1/8/8/8/8/8/3B1P2/4K3 w - - 0 1", accept: ["d2e3"], x: "La tour noire met ton roi en échec. Pare en <strong>interposant</strong> ton fou.", ok: "Bien joué : le fou fait barrière, et le pion f2 le protège." }
  ]},
  { id: "roque", t: "Le roque", d: "Mettre son roi à l'abri", g: "r", steps: [
    { k: "info", fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1", x: "Le <strong>roque</strong> est un coup spécial : le roi glisse de deux cases vers une tour, et la tour passe de l'autre côté du roi. Conditions : ni le roi ni la tour n'ont bougé, aucune pièce entre eux, et le roi n'est pas en échec et ne traverse pas de case attaquée." },
    { k: "move", fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1", accept: ["e1g1"], x: "Fais le <strong>petit roque</strong> : clique sur le roi, puis sur g1.", ok: "Petit roque, noté O-O. La tour h1 est arrivée en f1." },
    { k: "move", fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1", accept: ["e1c1"], x: "Maintenant le <strong>grand roque</strong>, côté dame.", ok: "Grand roque, noté O-O-O." }
  ]},
  { id: "passant", t: "La prise en passant", d: "La règle que tout le monde oublie", g: "p", steps: [
    { k: "move", fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2", accept: ["e5d6"], x: "Le pion noir vient d'avancer de deux cases (d7-d5) et se retrouve à côté de ton pion e5. Tu peux le prendre <strong>comme s'il n'avait avancé que d'une case</strong>, en allant en d6. Ce droit ne dure qu'un coup !", ok: "Prise en passant réussie : exd6 e.p." }
  ]},
  { id: "promotion", t: "La promotion", d: "Le pion devient dame", g: "p", steps: [
    { k: "move", fen: "4k3/1P6/8/8/8/8/8/4K3 w - - 0 1", accept: ["b7b8q"], x: "Un pion qui atteint la dernière rangée se transforme en <strong>dame</strong>, tour, fou ou cavalier. Mène ton pion en b8 et choisis la dame.", no: "On choisit presque toujours la dame : c'est la pièce la plus forte.", ok: "Nouvelle dame, et en plus c'est échec !" }
  ]},
  { id: "mat", t: "Échec et mat", d: "Gagner la partie, éviter le pat", g: "k", steps: [
    { k: "info", fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", x: "Si le roi est en échec et qu'<strong>aucun coup</strong> ne le sauve, c'est <strong>échec et mat</strong> : la partie est gagnée. Si un joueur n'est pas en échec mais n'a <strong>aucun coup légal</strong>, c'est <strong>pat</strong> : partie nulle." },
    { k: "move", fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", goal: "mate", x: "Fais mat en un coup. Les pions noirs enferment leur propre roi.", ok: "Mat du couloir ! Un grand classique." },
    { k: "move", fen: "k7/8/1K6/8/8/8/7Q/8 w - - 0 1", goal: "mate", x: "Fais mat avec la dame. Attention : si le roi noir n'a plus de coup sans être en échec, c'est pat.", ok: "Mat ! Le roi blanc protège les cases de fuite." }
  ]},
  { id: "ouverture", t: "Bien commencer", d: "Les trois principes de l'ouverture", g: "n", steps: [
    { k: "move", fen: START, accept: ["e2e4", "d2d4"], x: "Principe n°1 : <strong>occupe le centre</strong>. Avance un pion central de deux cases.", ok: "Le centre est à toi." },
    { k: "move", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", accept: ["g1f3", "b1c3"], x: "Principe n°2 : <strong>développe tes pièces</strong>. Sors un cavalier vers le centre.", ok: "Les cavaliers d'abord, ils visent le centre." },
    { k: "move", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", accept: ["f1c4", "f1b5"], x: "Sors maintenant ton fou de cases claires sur une diagonale active.", ok: "Bien, le fou vise le côté roi adverse." },
    { k: "move", fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", accept: ["e1g1"], x: "Principe n°3 : <strong>mets ton roi à l'abri</strong>. Roque.", ok: "Ton roi est en sécurité, ta tour entre dans le jeu. Tu connais les bases : direction la section Exercices !" }
  ]}
];
// ---------- Parcours : intermédiaire, avancé, expert, ouvertures ----------
const L_INTER = [
  { id: "fourchette", t: "La fourchette", d: "Attaquer deux cibles d'un coup", g: "n", steps: [
    { k: "info", fen: "r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1", x: "Une <strong>fourchette</strong>, c'est une pièce qui attaque deux cibles en même temps. L'adversaire ne peut en sauver qu'une. Ici le cavalier c7 attaque le roi et la tour : la tour est perdue." },
    { k: "line", fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", side: "w", moves: ["b5c7", "e8d7", "c7a8"], x: "Trouve la fourchette du cavalier, puis encaisse.", notes: { 0: "Échec et attaque sur la tour : c'est une fourchette royale.", 2: "La tour tombe. +5 points." } },
    { k: "line", fen: "r5k1/8/8/8/8/8/5PPP/3Q2K1 w - - 0 1", side: "w", moves: ["d1d5", "g8h7", "d5a8"], x: "La dame aussi fait des fourchettes. Attaque le roi et la tour en même temps.", notes: { 0: "Échec sur la diagonale d5-g8, et la tour a8 est visée par l'autre diagonale.", 2: "Tour gagnée." } },
    { k: "line", fen: "4k3/8/8/3r1r2/8/4P3/8/4K3 w - - 0 1", side: "w", moves: ["e3e4", "d5d6", "e4f5"], x: "Même un pion peut faire une fourchette. Attaque les deux tours.", notes: { 0: "Le pion attaque d5 et f5. Une tour va tomber.", 2: "Une tour pour un pion : excellente affaire." } }
  ]},
  { id: "clouage", t: "Le clouage", d: "Immobiliser une pièce devant plus précieux", g: "b", steps: [
    { k: "info", fen: "4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1", x: "Une pièce est <strong>clouée</strong> quand elle ne peut pas bouger sans exposer une pièce plus importante derrière elle. Ici le cavalier c6 ne peut pas bouger : il exposerait son roi. C'est un clouage <strong>absolu</strong>." },
    { k: "line", fen: "4k3/8/8/4n3/8/5P2/8/4RK2 w - - 0 1", side: "w", moves: ["f3f4", "e8d7", "f4e5"], x: "Le cavalier e5 est cloué par ta tour. Attaque-le avec une pièce de moindre valeur.", notes: { 0: "Le cavalier ne peut pas fuir : il est cloué sur la colonne e.", 2: "Le cavalier tombe. Une pièce clouée est une cible idéale." } },
    { k: "line", fen: "4k3/8/8/4q3/8/8/5KPP/R7 w - - 0 1", side: "w", moves: ["a1e1", "e5e1", "f2e1"], x: "Cloue la dame noire contre son roi.", notes: { 0: "La dame est clouée : elle ne peut que rester sur la colonne e.", 2: "Une dame (9) contre une tour (5)." } }
  ]},
  { id: "enfilade", t: "L'enfilade", d: "Le clouage à l'envers", g: "r", steps: [
    { k: "info", fen: "8/8/8/q2k4/8/8/8/6KR w - - 0 1", x: "L'<strong>enfilade</strong> ressemble au clouage, mais la pièce la plus précieuse est devant. Quand elle s'écarte, celle de derrière est prise. Ici, un échec sur la 5e rangée vise le roi... et la dame cachée derrière lui." },
    { k: "line", fen: "8/8/8/q2k4/8/8/8/6KR w - - 0 1", side: "w", moves: ["h1h5", "d5d4", "h5a5"], x: "Joue l'enfilade.", notes: { 0: "Échec ! Le roi doit quitter la rangée.", 2: "Et la dame tombe." } },
    { k: "line", fen: "8/1q6/8/3k4/8/8/8/4KB2 w - - 0 1", side: "w", moves: ["f1g2", "d5c5", "g2b7"], x: "Avec un fou cette fois, sur la grande diagonale.", notes: { 0: "Le roi est en échec sur la diagonale h1-a8. La dame est juste derrière.", 2: "Dame gagnée." } }
  ]},
  { id: "decouverte", t: "L'attaque à la découverte", d: "Une pièce bouge, une autre attaque", g: "q", steps: [
    { k: "info", fen: "q3k3/8/8/8/4B3/8/8/4RK2 w - - 0 1", x: "Ta tour e1 vise le roi noir, mais ton fou e4 lui bouche la vue. Si le fou bouge, la tour donne échec : c'est un <strong>échec à la découverte</strong>. Le fou peut alors aller où il veut, même sur une case attaquée." },
    { k: "move", fen: "q3k3/8/8/8/4B3/8/8/4RK2 w - - 0 1", accept: ["e4a8"], x: "Démasque ta tour en gagnant quelque chose avec le fou.", no: "Cherche ce que le fou peut prendre en quittant la colonne e.", ok: "Fxa8 avec échec à la découverte : la dame noire est gagnée." },
    { k: "info", fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1", x: "Encore plus fort : le <strong>double échec</strong>. La pièce qui bouge donne elle aussi échec. On ne peut ni prendre deux pièces ni s'interposer deux fois : le roi est obligé de bouger. Tu le verras en action dans le parcours Expert." }
  ]},
  { id: "enprise", t: "Pièces en prise", d: "Repérer ce qui n'est pas défendu", g: "p", steps: [
    { k: "info", fen: "r3k2r/ppp2ppp/2n5/3q4/8/2N5/PPPP1PPP/R1BQKB1R w KQkq - 0 1", x: "Avant chaque coup, pose-toi la question : <strong>quelles pièces adverses ne sont pas défendues ?</strong> Ce sont les cibles les plus faciles pour une fourchette ou une capture." },
    { k: "pick", fen: "r3k2r/ppp2ppp/2n5/3q4/8/2N5/PPPP1PPP/R1BQKB1R w KQkq - 0 1", answers: ["d5"], x: "Une seule pièce noire est à la fois <strong>attaquée</strong> par toi et <strong>sans défense</strong>. Clique dessus.", no: "Cherche une pièce que ton cavalier attaque et qu'aucune pièce noire ne protège.", ok: "Exact : la dame d5 est attaquée par le cavalier c3 et rien ne la protège." },
    { k: "move", fen: "r3k2r/ppp2ppp/2n5/3q4/8/2N5/PPPP1PPP/R1BQKB1R w KQkq - 0 1", accept: ["c3d5"], x: "Prends-la.", ok: "Cxd5 : +9 points. Les débutants perdent la plupart de leurs parties sur ce genre d'oubli." }
  ]},
  { id: "batterie", t: "La batterie dame-fou", d: "Le mat en h7", g: "q", steps: [
    { k: "info", fen: "5rk1/5ppp/8/7Q/8/3B4/5PPP/6K1 w - - 0 1", x: "Quand la dame et un fou visent la même case, on parle de <strong>batterie</strong>. Le roque noir est défendu par le seul pion h7 : si la dame y arrive protégée par le fou, c'est souvent mat." },
    { k: "move", fen: "5rk1/5ppp/8/7Q/8/3B4/5PPP/6K1 w - - 0 1", goal: "mate", x: "Fais mat en un coup.", ok: "Dxh7# : le roi ne peut pas prendre la dame, défendue par le fou d3." }
  ]}
];

const L_AVANCE = [
  { id: "carre", t: "La règle du carré", d: "Ton roi peut-il rattraper le pion ?", g: "k", steps: [
    { k: "info", fen: "7k/8/8/4K3/p7/8/8/8 w - - 0 1", x: "Pour savoir si un roi rattrape un pion, trace un <strong>carré</strong> entre le pion et sa case de promotion. Ici le pion a4 va en a1 : le carré va de a4 à d1. Si le roi peut entrer dans ce carré, il rattrape le pion." },
    { k: "move", fen: "7k/8/8/4K3/p7/8/8/8 w - - 0 1", accept: ["e5d4"], x: "Joue le seul coup qui fait entrer ton roi dans le carré du pion.", no: "Ton roi doit atteindre une case du carré a1-a4-d4-d1 dès maintenant.", ok: "Rd4 ! Après ...a3 Rc3 a2 Rb2, le pion est arrêté." }
  ]},
  { id: "opposition", t: "L'opposition", d: "La clé des finales de pions", g: "k", steps: [
    { k: "info", fen: "8/8/8/4k3/8/4K3/4P3/8 w - - 0 1", x: "Quand deux rois se font face avec une case entre eux, ils sont en <strong>opposition</strong>. Celui qui doit jouer est obligé de céder du terrain. Ici les Blancs ont le trait : ils doivent reculer, et la partie est nulle." },
    { k: "kpk", fen: "8/8/8/4k3/8/3K4/4P3/8 w - - 0 1", x: "Prends l'opposition, puis mène ton pion à dame. Je joue les Noirs." },
    { k: "kpk", fen: "8/8/4k3/8/3K4/8/4P3/8 w - - 0 1", x: "Même idée, deux rangées plus haut. Le roi passe <strong>devant</strong> son pion." },
    { k: "info", fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1", x: "À retenir : si ton roi atteint la <strong>6e rangée devant son pion</strong>, la finale est toujours gagnée (sauf avec un pion de la colonne a ou h), quel que soit le camp qui a le trait." },
    { k: "kpk", fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1", x: "Gagne cette position. Attention au pat !" }
  ]},
  { id: "percee", t: "La percée", d: "Créer un pion passé", g: "p", steps: [
    { k: "info", fen: "7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1", x: "Un <strong>pion passé</strong> n'a plus aucun pion adverse devant lui, ni sur les colonnes voisines. Rien ne peut l'arrêter, sauf les pièces. Ici, trois pions contre trois et des rois trop loin : il existe une <strong>percée</strong> gagnante." },
    { k: "line", fen: "7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1", side: "w", moves: ["b5b6", "c7b6", "a5a6", "b7a6", "c5c6", "h8g7", "c6c7", "g7f7", "c7c8q"], x: "Sacrifie un pion pour en faire passer un autre.", notes: { 0: "b6 ! Le pion du milieu attaque a7 et c7.", 2: "Si ...cxb6, alors a6 ! et le pion c passera.", 4: "c6 : ce pion est maintenant passé, le roi noir est trop loin.", 8: "Dame ! La percée a fonctionné." } }
  ]},
  { id: "structure", t: "La structure de pions", d: "Isolé, doublé, passé", g: "p", steps: [
    { k: "info", fen: "4k3/pp3p1p/5p2/3P4/8/8/PP4PP/4K3 w - - 0 1", x: "Les pions ne reculent jamais : leurs faiblesses sont définitives. Un pion <strong>doublé</strong> est derrière un autre pion de sa couleur. Un pion <strong>isolé</strong> n'a aucun pion ami sur les colonnes voisines. Un pion <strong>passé</strong> n'a plus de pion adverse devant lui, ni sur sa colonne ni sur les colonnes voisines." },
    { k: "pick", fen: "4k3/pp3p1p/5p2/3P4/8/8/PP4PP/4K3 w - - 0 1", answers: ["f7", "f6"], all: true, x: "Clique sur les <strong>pions noirs doublés</strong>.", ok: "Oui, f7 et f6 sont sur la même colonne : ils se gênent." },
    { k: "pick", fen: "4k3/pp3p1p/5p2/3P4/8/8/PP4PP/4K3 w - - 0 1", answers: ["d5"], x: "Clique sur le <strong>pion blanc passé</strong>.", no: "Regarde devant chaque pion blanc : y a-t-il un pion noir sur sa colonne ou les colonnes voisines ?", ok: "Le pion d5 n'a aucun pion noir en c, d ou e devant lui : il est passé, et c'est un atout énorme en finale." }
  ]},
  { id: "pieces-actives", t: "Pièces actives", d: "Colonnes ouvertes et avant-postes", g: "r", steps: [
    { k: "info", fen: "3r2k1/pp3ppp/2n5/8/8/2N5/PP3PPP/R4RK1 w - - 0 1", x: "Une <strong>colonne ouverte</strong> n'a plus aucun pion. C'est l'autoroute des tours. Ici, la colonne d est ouverte et les Noirs l'ont déjà prise : il faut la contester." },
    { k: "move", fen: "3r2k1/pp3ppp/2n5/8/8/2N5/PP3PPP/R4RK1 w - - 0 1", accept: ["f1d1", "a1d1"], x: "Conteste la colonne d avec une de tes tours.", ok: "Tour en d1 : tu contestes la colonne. Une tour sur une colonne ouverte vaut bien plus qu'une tour enfermée." },
    { k: "info", fen: "r4rk1/pp3ppp/3p4/2pNp3/4P3/8/PPP2PPP/R4RK1 w - - 0 1", x: "Un <strong>avant-poste</strong> est une case avancée qu'aucun pion adverse ne peut attaquer. Le cavalier d5 en est l'exemple parfait : il est protégé par e4 et aucun pion noir ne peut le chasser." }
  ]}
];

const L_EXPERT = [
  { id: "calcul", t: "Calculer comme un fort joueur", d: "Échecs, captures, menaces", g: "q", steps: [
    { k: "info", fen: "5r1k/6pp/8/3Q2N1/2B5/8/8/6K1 w - - 0 1", x: "Les forts joueurs examinent d'abord les coups <strong>forcés</strong> : les échecs, puis les captures, puis les menaces. Même un coup qui semble absurde, comme sacrifier sa dame, mérite d'être calculé s'il donne échec." },
    { k: "mate", fen: "5r1k/6pp/8/3Q2N1/2B5/8/8/6K1 w - - 0 1", n: 2, x: "Mat en 2. Commence par l'échec le plus violent." }
  ]},
  { id: "boden", t: "Le mat de Boden", d: "Deux fous en croix", g: "b", steps: [
    { k: "info", fen: "2kr4/pp1n4/2n5/8/5B2/2Q5/8/5BK1 w - - 0 1", x: "Le roi noir a roqué côté dame. Tes deux fous peuvent former une croix sur ses cases de fuite : c'est le <strong>mat de Boden</strong>, du nom d'un joueur anglais du XIXe siècle. Il faut d'abord ouvrir la diagonale a6-c8." },
    { k: "mate", fen: "2kr4/pp1n4/2n5/8/5B2/2Q5/8/5BK1 w - - 0 1", n: 2, x: "Mat en 2." }
  ]},
  { id: "anastasie", t: "Le mat d'Anastasie", d: "Cavalier et tour sur la colonne h", g: "n", steps: [
    { k: "info", fen: "5r1k/4N1pp/8/7Q/8/3R4/8/6K1 w - - 0 1", x: "Le cavalier e7 contrôle g8 et g6. Si le roi noir se retrouve en h7 et qu'une tour arrive sur la colonne h, il n'a plus aucune case. Pour l'attirer en h7, il faut un sacrifice." },
    { k: "mate", fen: "5r1k/4N1pp/8/7Q/8/3R4/8/6K1 w - - 0 1", n: 2, x: "Mat en 2." }
  ]},
  { id: "philidor", t: "Le mat étouffé", d: "Le legs de Philidor", g: "n", steps: [
    { k: "info", fen: "5r1k/6pp/8/6N1/2Q5/8/8/6K1 w - - 0 1", x: "Le <strong>mat étouffé</strong> : le roi est entouré de ses propres pièces et un cavalier lui porte le coup final. La combinaison complète utilise un échec double puis un sacrifice de dame. Elle est connue depuis le XVe siècle." },
    { k: "mate", fen: "5r1k/6pp/8/6N1/2Q5/8/8/6K1 w - - 0 1", n: 4, x: "Mat en 4. Indice : le cavalier saute, revient, et la dame se sacrifie en g8." }
  ]},
  { id: "opera", t: "La partie de l'Opéra", d: "Morphy, Paris 1858", g: "q", steps: [
    { k: "info", fen: "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 17", x: "1858, à l'Opéra de Paris. Paul Morphy joue contre le duc de Brunswick et le comte Isouard, qui se consultent. Morphy a tout sacrifié pour développer ses pièces plus vite. Il reste à porter le coup final, l'un des plus célèbres de l'histoire." },
    { k: "mate", fen: "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 17", n: 2, x: "Mat en 2, comme Morphy." }
  ]},
  { id: "doubleechec", t: "Le double échec", d: "Réti – Tartakower, Vienne 1910", g: "b", steps: [
    { k: "info", fen: "rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9", x: "Vienne, 1910. Richard Réti, avec les Blancs, vient de voir le cavalier noir prendre en e4. Sa tour d1 est cachée derrière sa dame et son fou. Un <strong>double échec</strong> ne se pare qu'en bougeant le roi : c'est l'arme la plus forte des combinaisons." },
    { k: "line", fen: "rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9", side: "w", moves: ["d3d8", "e8d8", "d2g5", "d8c7", "g5d8"], x: "Mat en 3 : rejoue la combinaison de Réti. Commence par sacrifier ta dame.", notes: { 0: "Dd8+ !! La dame se sacrifie pour attirer le roi sur la colonne d.", 2: "Fg5++ : double échec, du fou et de la tour d1. Le roi doit bouger.", 4: "Fd8# ! Si 10...Re8, alors 11.Td8#." } }
  ]}
];

// Fiches d'ouverture : plans, coups typiques (montrés en flèche depuis la position finale de la ligne), situations courantes,
// puis exercices « trouve le coup typique » joués à partir de la ligne prolongée de quelques coups (pre).
const SHEETS = {
  italienne: {
    plans: {
      w: ["Garder le centre e4-d4 et chasser les cavaliers noirs avec d5 ou e5.", "Mettre la pression sur f7 avec le fou c4 et la dame en b3.", "Roquer, puis Te1 et Cbd2 pour soutenir le centre."],
      b: ["Frapper le centre par ...d5 : c'est la libération classique.", "Échanger des pièces (...Fxd2+) pour réduire l'initiative blanche.", "Roquer vite : le roi en e8 est exposé sur la colonne e."]
    },
    typical: [
      { u: "b4d2", t: "...Fxd2+ : échanger avant de roquer." },
      { u: "d7d5", t: "...d5 ! La riposte au centre qui libère le jeu noir." },
      { u: "e4e5", t: "e5 : chasse le cavalier f6, très fort si les Noirs ne jouent pas ...d5." },
      { u: "d1b3", t: "Db3 : double attaque sur f7 et b7." }
    ],
    situations: [
      { t: "La partie des deux cavaliers", x: "Si les Noirs jouent 3...Cf6 au lieu de 3...Fc5, le coup 4.Cg5 attaque f7 deux fois. Réponse correcte : 4...d5 5.exd5 Ca5, en sacrifiant un pion pour l'initiative." },
      { t: "e4-e5 qui chasse le cavalier", x: "Quand le pion blanc arrive en e5, le cavalier f6 doit fuir. Réponds par ...d5 ou ...Ce4 pour garder une pièce active au centre." }
    ],
    practice: [
      { pre: ["b4d2", "b1d2", "d7d5"], accept: ["e4d5"], x: "Les Noirs frappent avec ...d5. Que fais-tu de ton pion e4 ?", ok: "exd5 : on échange au centre plutôt que de laisser les Noirs prendre en e4." },
      { pre: ["b4d2", "b1d2", "d7d5", "e4d5", "f6d5"], accept: ["d1b3"], x: "Le cavalier noir trône en d5. Trouve le coup de dame typique.", ok: "Db3 ! La dame attaque b7 et renforce la pression du fou c4 sur d5." }
    ]
  },
  espagnole: {
    plans: {
      w: ["Jouer d4 pour bâtir le centre idéal e4-d4.", "Manœuvre Cbd2-f1-g3 : le cavalier rejoint l'aile roi.", "Replier le fou en c2 pour viser le roque noir."],
      b: ["Chasser le fou b3 par ...Ca5 et gagner de l'espace avec ...c5.", "Mettre la pression sur e4 avec ...Fb7, ...Te8 et ...Ff8.", "Tenir le pion e5 : c'est le cœur de la position noire."]
    },
    typical: [
      { u: "c6a5", t: "...Ca5 : chasse le fou de la diagonale a2-g8." },
      { u: "c8b7", t: "...Fb7 : vise e4." },
      { u: "d2d4", t: "d4 : l'objectif central des Blancs." },
      { u: "a2a4", t: "a4 : attaque le pion b5 et ouvre la colonne a." }
    ],
    situations: [
      { t: "Le piège de l'arche de Noé", x: "Après un échange en d4, le fou blanc en b3 peut être enfermé par ...c5 puis ...c4. C'est pour ça que les Blancs jouent c3 : la case c2 sert de refuge." },
      { t: "La variante d'échange", x: "Avec 4.Fxc6 dxc6, les Blancs abîment les pions noirs. En finale, leur majorité à l'aile roi (4 pions contre 3) peut créer un pion passé." }
    ],
    practice: [
      { pre: ["c6a5"], accept: ["b3c2"], x: "Le cavalier noir attaque ton fou b3. Où le replier ?", ok: "Fc2 : le fou reste sur une diagonale qui vise le roque noir." },
      { pre: ["c6a5", "b3c2", "c7c5"], accept: ["d2d4"], x: "Les Noirs ont joué ...c5. C'est le moment de jouer le coup central prévu depuis c3.", ok: "d4 : la variante Tchigorine, position principale de l'espagnole fermée." }
    ]
  },
  ecossaise: {
    plans: {
      w: ["Gagner de l'espace avec e5 et c4.", "Développer vite et viser les pions noirs abîmés (c6 et a7).", "Défendre e5 avec De2 et Ff4."],
      b: ["Attaquer le pion e5 : ...De7, ...Cd5, puis ...d6.", "Utiliser la paire de fous et la colonne b semi-ouverte.", "Jouer ...d5 pour réparer la structure c6."]
    },
    typical: [
      { u: "d8e7", t: "...De7 : cloue le pion e5 contre le roi." },
      { u: "f6d5", t: "...Cd5 : le cavalier se centralise." },
      { u: "d1e2", t: "De2 : bloque la colonne e et défend e5." },
      { u: "c2c4", t: "c4 : chasse le cavalier de d5." }
    ],
    situations: [
      { t: "4...Fc5 au lieu de 4...Cf6", x: "Le fou vise f2 et le cavalier d4. Les Blancs répondent 5.Fe3 (ou 5.Cxc6) et c3 pour solidifier d4." },
      { t: "La dame trop tôt", x: "Après 5.Cxc6 bxc6 6.e5, si les Noirs jouent mollement, le cavalier f6 n'a plus de bonne case. Il faut réagir tout de suite avec ...De7 ou ...Cd5." }
    ],
    practice: [
      { pre: ["d8e7"], accept: ["d1e2"], x: "La dame noire attaque e5 et le cloue. Comment réagir ?", ok: "De2 : la dame défend e5 et bloque la colonne e." },
      { pre: ["d8e7", "d1e2", "f6d5"], accept: ["c2c4"], x: "Le cavalier noir s'installe en d5. Chasse-le.", ok: "c4 : le cavalier doit reculer, les Blancs gagnent de l'espace." }
    ]
  },
  gambitdame: {
    plans: {
      w: ["Maintenir la pression sur d5 (Cc3, Fg5, Dc2).", "Dans la structure Carlsbad (après cxd5 exd5), attaque de minorité avec b4-b5.", "Placer les tours en c1 et d1."],
      b: ["Libérer le jeu avec ...c5 ou ...dxc4 suivi de ...c5.", "Simplifier avec ...h6 et ...Ce4 (défense Lasker).", "Fianchetto ...b6 et ...Fb7 (défense Tartakower)."]
    },
    typical: [
      { u: "h7h6", t: "...h6 : questionne le fou g5." },
      { u: "b7b6", t: "...b6 : prépare ...Fb7 et ...c5." },
      { u: "a1c1", t: "Tc1 : la tour sur la colonne c, future colonne ouverte." },
      { u: "f1d3", t: "Fd3 : développement naturel vers le roque." }
    ],
    situations: [
      { t: "Le piège de l'éléphant", x: "Après 4...Cbd7 5.cxd5 exd5, le coup 6.Cxd5?? semble gagner un pion. Mais 6...Cxd5! 7.Fxd8 Fb4+ 8.Dd2 Fxd2+ 9.Rxd2 Rxd8 : les Noirs gagnent une pièce." },
      { t: "La structure Carlsbad", x: "Après cxd5 exd5, les Blancs avancent leurs pions b et a (b4-b5) contre les trois pions noirs a, b, c. C'est l'attaque de minorité : créer une faiblesse en c6." }
    ],
    practice: [
      { pre: ["h7h6"], accept: ["g5h4", "g5f6"], x: "Les Noirs demandent au fou g5 de choisir. Que fais-tu ?", ok: "Fh4 garde le clouage ; Fxf6 donne la paire de fous mais simplifie. Les deux se jouent." },
      { pre: ["h7h6", "g5h4", "b7b6"], accept: ["f1d3", "f1e2", "a1c1", "c4d5", "d1c2"], x: "Les Noirs préparent ...Fb7. Continue ton développement.", ok: "Bon plan : finir le développement, puis roquer et centraliser les tours." }
    ]
  },
  londres: {
    plans: {
      w: ["Fd3, roque, puis Ce5 : un avant-poste au centre.", "Avec f4, l'attaque à l'aile roi devient dangereuse.", "Garder la pyramide c3-d4-e3 : elle ne cède jamais."],
      b: ["Attaquer b2 avec ...Db6, sans laisser le fou d6 sans défense.", "Gagner de l'espace avec ...c4 ou frapper avec ...e5.", "Échanger le fou par ...Fxg3 : la colonne h s'ouvre alors pour les Blancs."]
    },
    typical: [
      { u: "c5c4", t: "...c4 : gagne de l'espace à l'aile dame." },
      { u: "d6g3", t: "...Fxg3 : échange, mais hxg3 ouvre la colonne h." },
      { u: "f1d3", t: "Fd3 : le fou vise h7." },
      { u: "f3e5", t: "Ce5 : le cavalier sur un avant-poste central." }
    ],
    situations: [
      { t: "La pression sur b2", x: "Le fou c1 est sorti en f4, donc b2 n'est plus défendu. Après ...Db6, défends-le avec Db3, Dc1, Db1 ou Tb1." },
      { t: "La colonne h ouverte", x: "Si les Noirs échangent en g3 et que tu reprends hxg3, ta tour h1 travaille déjà. Ne roque pas trop vite : une attaque sur h7 peut venir." }
    ],
    practice: [
      { pre: ["e8g8"], accept: ["f1d3"], x: "Les Noirs ont roqué. Développe ta dernière pièce mineure vers le roi adverse.", ok: "Fd3 : le fou vise h7 et prépare le roque." },
      { pre: ["e8g8", "f1d3", "b7b6"], accept: ["f3e5", "e1g1", "d1e2"], x: "Les Noirs préparent ...Fb7. Poursuis le plan du Londres.", ok: "Bien : le cavalier en e5 ou le roque, puis f4 pour attaquer à l'aile roi." }
    ]
  },
  sicilienne: {
    plans: {
      w: ["Attaque anglaise : Fe3, f3, Dd2, grand roque puis g4-g5.", "Attaque Fg5 avec f4 : pression immédiate.", "Utiliser la case d5, faible si les Noirs jouent ...e5."],
      b: ["Colonne c semi-ouverte : Tc8, ...Dc7, pression sur c3 et c2.", "Attaque à l'aile dame avec ...b5-b4.", "Jouer ...e5 ou ...e6 pour prendre sa part du centre."]
    },
    typical: [
      { u: "c1e3", t: "Fe3 : l'attaque anglaise." },
      { u: "c1g5", t: "Fg5 : variante principale, très tranchante." },
      { u: "e7e5", t: "...e5 : chasse le cavalier d4." },
      { u: "b7b5", t: "...b5 : expansion à l'aile dame." }
    ],
    situations: [
      { t: "Les sacrifices en d5 et e6", x: "Si le roi noir reste au centre, les Blancs sacrifient souvent un cavalier en d5 ou un fou en e6 pour ouvrir le jeu. Roque avant de lancer ton attaque." },
      { t: "Les attaques sur les deux ailes", x: "Quand les rois sont roqués de côtés opposés, c'est une course : chaque tempo compte. Avance tes pions vers le roi adverse, pas devant le tien." }
    ],
    practice: [
      { pre: ["c1e3"], accept: ["e7e5", "e7e6", "f6g4"], x: "6.Fe3 : les Blancs préparent l'attaque anglaise. Prends ta part du centre.", ok: "Bon coup : ...e5 et ...e6 sont les deux plans principaux, et ...Cg4 chasse le fou." },
      { pre: ["f1e2"], accept: ["e7e5"], x: "6.Fe2 : variante calme. Trouve le coup typique de la Najdorf.", ok: "...e5 ! Le cavalier d4 doit reculer. La case d5 s'affaiblit, mais les Noirs ont un bon jeu." }
    ]
  },
  francaise: {
    plans: {
      w: ["Tenir la chaîne d4-e5 coûte que coûte.", "Jouer a3 et b4 pour gagner de l'espace à l'aile dame.", "Attaquer à l'aile roi, où l'espace est blanc."],
      b: ["Attaquer la base de la chaîne : d4 (...c5, ...Cc6, ...Db6, ...Cge7-f5).", "Casser la tête de la chaîne avec ...f6.", "Activer le fou c8, souvent enfermé derrière e6."]
    },
    typical: [
      { u: "a2a3", t: "a3 : prépare b4." },
      { u: "f1d3", t: "Fd3 : développement actif, mais attention au pion d4." },
      { u: "c8d7", t: "...Fd7 : sort le fou enfermé." },
      { u: "g8e7", t: "...Ce7 puis ...Cf5 : une pièce de plus contre d4." }
    ],
    situations: [
      { t: "Le piège de d4", x: "Après 6.Fd3 cxd4 7.cxd4, la prise 7...Cxd4?? perd la dame : 8.Cxd4 Dxd4 9.Fb5+ et la dame d1 attaque la dame noire. Il faut d'abord jouer ...Fd7." },
      { t: "Le mauvais fou", x: "Le fou c8 est bloqué par le pion e6. Les Noirs cherchent à l'échanger (...b6 et ...Fa6) ou à le sortir par d7." }
    ],
    practice: [
      { pre: ["a2a3"], accept: ["c5c4", "g8h6", "c8d7", "a7a5", "f7f6"], x: "6.a3 prépare b4. Choisis un plan noir typique.", ok: "Bon plan. ...c4 bloque l'aile dame, ...Ch6-f5 attaque d4, ...f6 attaque e5." },
      { pre: ["f1d3", "c5d4", "c3d4"], accept: ["c8d7"], x: "Le pion d4 semble ne tenir qu'à un fil. Attention au piège !", ok: "...Fd7 ! Surtout pas ...Cxd4?? Cxd4 Dxd4 Fb5+ qui gagne la dame. Maintenant ...Fb5 n'est plus possible." }
    ]
  },
  carokann: {
    plans: {
      w: ["Chasser le fou avec h4-h5.", "Gagner de l'espace et installer un cavalier en e5.", "Grand roque et attaque à l'aile roi."],
      b: ["Structure solide c6-e6, puis ...Cd7, ...Cgf6, ...e6 et ...Fd6.", "Échanger les pièces et viser une bonne finale.", "Jouer ...c5 au bon moment pour attaquer d4."]
    },
    typical: [
      { u: "h2h4", t: "h4 : menace h5 et la capture du fou." },
      { u: "h7h6", t: "...h6 : garde la case h7 au fou." },
      { u: "b8d7", t: "...Cd7 : contrôle e5." },
      { u: "e7e6", t: "...e6 : ouvre la diagonale du fou f8." }
    ],
    situations: [
      { t: "Le mat étouffé en d6", x: "Après 4...Cd7 5.De2 Cgf6??, le coup 6.Cd6# est mat ! Le roi noir est entouré par ses propres pièces et le pion e7 est cloué par la dame." },
      { t: "La poussée h4-h5", x: "Quand les Blancs poussent h4, réponds ...h6 pour garder h7 au fou. Le pion h5 peut ensuite devenir une faiblesse blanche." }
    ],
    practice: [
      { pre: ["h2h4"], accept: ["h7h6", "h7h5"], x: "6.h4 menace h5 qui piégerait le fou. Que fais-tu ?", ok: "...h6 : le fou garde la case h7 pour se replier." },
      { pre: ["h2h4", "h7h6", "g1f3"], accept: ["b8d7", "e7e6", "g8f6"], x: "Continue ton développement solide.", ok: "Développement typique de la Caro-Kann : ...Cd7, ...e6, ...Cgf6." }
    ]
  },
  scandinave: {
    plans: {
      w: ["Développer en gagnant du temps sur la dame noire.", "Fc4, Fd2, O-O puis Ce5.", "Exploiter l'avance de développement."],
      b: ["Sortir le fou c8 (...Ff5 ou ...Fg4) avant ...e6.", "Structure type Caro-Kann : c6-e6.", "Garder une case de retraite à la dame (c7, d8)."]
    },
    typical: [
      { u: "c8f5", t: "...Ff5 : le fou sort avant ...e6." },
      { u: "c8g4", t: "...Fg4 : cloue le cavalier f3." },
      { u: "f1c4", t: "Fc4 : développement actif." },
      { u: "c1d2", t: "Fd2 : prépare une attaque à la découverte sur la dame a5." }
    ],
    situations: [
      { t: "La dame en a5 visée", x: "Avec un fou blanc en d2 et le cavalier en c3, si le cavalier bouge (Cd5, Cb5), le fou attaque la dame a5. Garde toujours une case de repli." },
      { t: "Le temps perdu", x: "La dame noire a déjà bougé deux fois. Les Noirs doivent jouer simple et solide pour compenser les temps perdus." }
    ],
    practice: [
      { pre: ["f1c4"], accept: ["c8f5", "c8g4", "e7e6"], x: "Développe-toi. Pense au fou c8.", ok: "Bien : le fou sort avant d'être enfermé par ...e6." },
      { pre: ["f1c4", "c8f5", "c1d2"], accept: ["e7e6", "b8d7"], x: "Le fou d2 regarde ta dame en a5. Continue sans paniquer.", ok: "Solide. Si le cavalier c3 bouge, ta dame recule simplement en d8 ou c7." }
    ]
  },
  estindienne: {
    plans: {
      w: ["Fermer le centre avec d5 puis attaquer à l'aile dame (c5, b4).", "Manœuvre Ce1-d3 pour soutenir c5.", "Échanger les dames (dxe5) si l'on veut une partie calme."],
      b: ["Après d5, attaque à l'aile roi : ...Ce8, ...f5, ...f4, ...g5.", "Le fou g7 reste sur la grande diagonale.", "Ne pas se presser : préparer ...f5 avant de lancer les pions."]
    },
    typical: [
      { u: "b8c6", t: "...Cc6 : met la pression sur d4." },
      { u: "d4d5", t: "d5 : ferme le centre et fixe les plans." },
      { u: "f6e8", t: "...Ce8 : libère la case f7 pour ...f5." },
      { u: "f6h5", t: "...Ch5 : libère le pion f pour la poussée ...f5." }
    ],
    situations: [
      { t: "La course aux ailes", x: "Après d5, les Blancs attaquent là où pointent leurs pions (l'aile dame) et les Noirs à l'aile roi. L'attaque noire vise directement le roi : elle est souvent plus dangereuse." },
      { t: "L'échange des dames", x: "Après dxe5 dxe5 Dxd8 Txd8, la finale est sûre pour les Noirs : le fou g7 est actif et la case d4 leur appartient." }
    ],
    practice: [
      { pre: ["e1g1"], accept: ["b8c6", "b8a6", "b8d7"], x: "7.O-O. Développe ta dernière pièce mineure.", ok: "Bien : ...Cc6 est le plus actif, ...Ca6 et ...Cbd7 se jouent aussi." },
      { pre: ["e1g1", "b8c6", "d4d5", "c6e7", "f3e1"], accept: ["f6e8", "f6d7"], x: "Le centre est fermé. Prépare la poussée typique des Noirs.", ok: "Le cavalier libère la case f7 : ...f5 arrive au prochain coup." }
    ]
  },
  pieges: {
    at: 8,
    plans: {
      w: ["Un clouage sur la dame n'est pas absolu : la pièce clouée peut bouger si ça rapporte plus.", "Chercher les échecs avant tout, même avec un sacrifice."],
      b: ["Avant de prendre une pièce offerte, vérifier tous les échecs adverses.", "Ne pas jouer ...g6 ou ...h6 sans raison quand f7 est fragile."]
    },
    typical: [
      { u: "f3e5", t: "Cxe5 !! : le cavalier « cloué » bouge quand même." },
      { u: "c4f7", t: "Fxf7+ : l'échec qui commence l'attaque." }
    ],
    situations: [
      { t: "Le mat du lion (mat de Kiss)", x: "Les mêmes idées reviennent souvent : le fou c4 et le cavalier visent f7, et le roi noir se retrouve sans cases. Défends f7 et roque tôt." },
      { t: "Les clouages relatifs", x: "Un cavalier cloué sur la dame peut bouger : on perd la dame, mais on gagne parfois bien plus. Un cavalier cloué sur le roi, lui, ne peut pas bouger." }
    ],
    practice: [
      { pre: [], cut: 9, accept: ["d6e5"], x: "Tu as les Noirs. Le cavalier blanc vient de prendre en e5 en abandonnant sa dame. Que joues-tu ?", ok: "...dxe5 ! Tu prends le cavalier et pas la dame. Après Dxg4, tu as perdu un pion, mais tu n'es pas mat." }
    ]
  },
  berger: {
    at: 8,
    plans: {
      w: ["Le coup du berger vise f7 avec la dame et le fou.", "Contre une bonne défense, la dame sortie tôt devient une cible."],
      b: ["Défendre f7 en développant : ...g6 chasse la dame, ...Cf6 bouche la diagonale.", "Profiter du temps gagné pour attaquer la dame."]
    },
    typical: [
      { u: "f8g7", t: "...Fg7 : le fou sur la grande diagonale." },
      { u: "c6d4", t: "...Cd4 : attaque la dame f3 et le pion c2." }
    ],
    situations: [
      { t: "La dame en f3", x: "Même idée avec la dame en f3 au lieu de h5 : le cavalier en f6 bouche la diagonale et défend f7." },
      { t: "Ne pas paniquer", x: "Après une défense correcte, c'est la dame blanche qui est en danger. Les Noirs gagnent souvent du temps en l'attaquant avec leurs pièces." }
    ],
    practice: [
      { base: ["e2e4", "e7e5", "d1f3", "b8c6", "f1c4"], accept: ["g8f6"], x: "Variante du berger avec la dame en f3. Les Blancs menacent Dxf7#. Pare la menace en développant.", ok: "...Cf6 : le cavalier bloque la colonne f et défend f7." }
    ]
  }
};

// Ouvertures : présentation, ligne guidée, fiche (plans, coups typiques, situations), exercices, puis la ligne de mémoire.
function fenAfter(moves) { const g = new Chess(START); for (const u of moves) g.make(g.find(u)); return g.fen(); }
function opening(id, t, d, side, intro, moves, notes) {
  const sh = SHEETS[id];
  return { id, t, d, g: side === "w" ? "n" : "p", side, steps: [
    { k: "info", fen: START, x: intro },
    { k: "line", fen: START, side, moves, notes, guide: true, x: `Joue les coups ${side === "w" ? "des Blancs" : "des Noirs"} en suivant la flèche. Je joue l'autre camp.` },
    { k: "sheet", fen: fenAfter(moves.slice(0, sh.at || moves.length)), side, sheet: sh, x: "Les idées à retenir. Clique sur un coup typique pour le voir sur l'échiquier." },
    ...sh.practice.map(p => ({ k: "move", fen: fenAfter(p.base || moves.slice(0, p.cut || moves.length).concat(p.pre || [])), accept: p.accept, x: p.x, ok: p.ok, wrong: p.wrong, no: p.no || "Ce n'est pas le coup typique de cette ouverture. Relis la fiche et réessaie." })),
    { k: "line", fen: START, side, moves, notes, x: "Pour finir, rejoue la ligne de mémoire. Après deux erreurs, la flèche réapparaît." }
  ]};
}
const L_OUV = [
  opening("italienne", "La partie italienne", "1.e4 e5 2.Cf3 Cc6 3.Fc4", "w",
    "L'une des plus vieilles ouvertures, jouée depuis le XVIe siècle. Idée : développer vite, viser le point faible f7 et construire un centre de pions avec c3 et d4.",
    ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "c2c3", "g8f6", "d2d4", "e5d4", "c3d4", "c5b4", "c1d2"],
    { 0: "1.e4 prend le centre et libère la dame et le fou.", 2: "2.Cf3 développe une pièce et attaque le pion e5.", 3: "2...Cc6 défend e5.", 4: "3.Fc4 vise f7, que seul le roi noir défend.", 5: "3...Fc5 : les Noirs visent f2 de la même façon.", 6: "4.c3 prépare d4 pour bâtir un grand centre.", 8: "5.d4 ouvre le centre.", 11: "6...Fb4+ gagne du temps avec un échec.", 12: "7.Fd2 pare l'échec en développant. Les Blancs ont le beau centre e4-d4." }),
  opening("espagnole", "La partie espagnole", "1.e4 e5 2.Cf3 Cc6 3.Fb5", "w",
    "L'ouverture préférée des champions du monde depuis 150 ans, aussi appelée Ruy Lopez. Le fou attaque le défenseur du pion e5 et met une pression durable sur le centre noir.",
    ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1", "f8e7", "f1e1", "b7b5", "a4b3", "d7d6", "c2c3", "e8g8", "h2h3"],
    { 4: "3.Fb5 attaque le cavalier qui défend e5.", 5: "3...a6 : la défense Morphy. Le fou doit choisir.", 6: "4.Fa4 garde la pression sur c6.", 8: "5.O-O : le roi à l'abri d'abord. Le pion e4 est indirectement protégé.", 10: "6.Te1 protège e4 pour de bon.", 12: "7.Fb3 : le fou reste sur la diagonale qui vise f7.", 14: "8.c3 prépare d4 et offre la case c2 au fou.", 16: "9.h3 empêche ...Fg4, qui clouerait le cavalier. C'est la position clé de l'espagnole fermée." }),
  opening("ecossaise", "La partie écossaise", "1.e4 e5 2.Cf3 Cc6 3.d4", "w",
    "Une ouverture directe : les Blancs ouvrent le centre dès le 3e coup. Facile à jouer, très appréciée de Kasparov.",
    ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f3d4", "g8f6", "d4c6", "b7c6", "e4e5"],
    { 4: "3.d4 : on ouvre le centre tout de suite.", 5: "3...exd4 : il faut prendre, sinon e5 tombe.", 6: "4.Cxd4 : le cavalier reprend et trône au centre.", 7: "4...Cf6 attaque e4.", 8: "5.Cxc6 : on échange avant d'avancer.", 9: "5...bxc6 : les Noirs reprennent vers le centre.", 10: "6.e5 chasse le cavalier f6 et gagne de l'espace." }),
  opening("gambitdame", "Le gambit Dame", "1.d4 d5 2.c4", "w",
    "La grande ouverture du pion dame. Le pion c4 attaque d5 : ce n'est pas un vrai sacrifice, car les Blancs récupèrent facilement le pion.",
    ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "f8e7", "e2e3", "e8g8", "g1f3"],
    { 0: "1.d4 : ce pion central est déjà protégé par la dame.", 2: "2.c4 : le gambit Dame.", 3: "2...e6 : les Noirs refusent le gambit et tiennent d5.", 4: "3.Cc3 ajoute une pression sur d5.", 6: "4.Fg5 cloue le cavalier f6, défenseur de d5.", 7: "4...Fe7 défait le clouage.", 8: "5.e3 ouvre la route au fou f1.", 10: "6.Cf3 : les Blancs vont roquer et placer leurs tours au centre." }),
  opening("londres", "Le système de Londres", "1.d4 d5 2.Ff4", "w",
    "Un système plus qu'une ouverture : on joue presque toujours la même structure, quoi que fassent les Noirs. Idéal pour commencer avec 1.d4.",
    ["d2d4", "d7d5", "c1f4", "g8f6", "e2e3", "e7e6", "g1f3", "c7c5", "c2c3", "b8c6", "b1d2", "f8d6", "f4g3"],
    { 2: "2.Ff4 : le fou sort AVANT e3, sinon il serait enfermé.", 4: "3.e3 solidifie d4 et libère le fou f1.", 6: "4.Cf3 développe.", 8: "5.c3 : la pyramide c3-d4-e3, très solide.", 10: "6.Cbd2 : le cavalier soutient e4 et f3.", 12: "7.Fg3 : on garde le fou plutôt que de l'échanger contre d6." }),
  opening("sicilienne", "La défense sicilienne", "1.e4 c5", "b",
    "La réponse la plus combative à 1.e4, l'arme de Fischer et de Kasparov. Les Noirs ne copient pas les Blancs : la partie devient déséquilibrée et riche.",
    ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"],
    { 1: "1...c5 contrôle d4 sans copier les Blancs.", 3: "2...d6 prépare ...Cf6 sans permettre e5.", 4: "3.d4 : les Blancs ouvrent le jeu.", 5: "3...cxd4 : un pion de côté contre un pion central. Les Noirs auront plus de pions au centre.", 7: "4...Cf6 attaque e4 et oblige Cc3.", 9: "5...a6 : la variante Najdorf. Elle contrôle b5 et prépare ...e5 ou ...b5." }),
  opening("francaise", "La défense française", "1.e4 e6", "b",
    "Une défense solide : les Noirs préparent ...d5 et attaquent ensuite la chaîne de pions blancs à sa base.",
    ["e2e4", "e7e6", "d2d4", "d7d5", "e4e5", "c7c5", "c2c3", "b8c6", "g1f3", "d8b6"],
    { 1: "1...e6 prépare ...d5.", 3: "2...d5 attaque e4.", 4: "3.e5 : la variante d'avance. Les Blancs gagnent de l'espace.", 5: "3...c5 ! On attaque la base de la chaîne de pions blancs : d4.", 7: "4...Cc6 ajoute une pression sur d4.", 9: "5...Db6 : troisième attaque sur d4, et la dame vise b2." }),
  opening("carokann", "La défense Caro-Kann", "1.e4 c6", "b",
    "Cousine de la française, mais le fou c8 peut sortir avant ...e6. Très solide, appréciée de Karpov et de Carlsen.",
    ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "c8f5", "e4g3", "f5g6"],
    { 1: "1...c6 prépare ...d5 en laissant la diagonale du fou c8 ouverte.", 3: "2...d5 conteste le centre.", 5: "3...dxe4 : on prend au centre.", 7: "4...Ff5 : le fou sort AVANT ...e6. C'est tout l'esprit de la Caro-Kann.", 8: "5.Cg3 attaque le fou.", 9: "5...Fg6 : le fou recule mais reste actif." }),
  opening("scandinave", "La défense scandinave", "1.e4 d5", "b",
    "Les Noirs attaquent e4 dès le premier coup. Simple à apprendre, avec des plans clairs.",
    ["e2e4", "d7d5", "e4d5", "d8d5", "b1c3", "d5a5", "d2d4", "g8f6", "g1f3", "c7c6"],
    { 1: "1...d5 attaque e4 immédiatement.", 3: "2...Dxd5 : la dame reprend, même si elle sort tôt.", 4: "3.Cc3 attaque la dame avec gain de temps.", 5: "3...Da5 : la dame se met à l'abri et cloue parfois le cavalier c3.", 7: "4...Cf6 développe.", 9: "5...c6 offre la case c7 à la dame et contrôle b5 et d5." }),
  opening("estindienne", "La défense est-indienne", "1.d4 Cf6 2.c4 g6", "b",
    "Les Noirs laissent les Blancs prendre le centre... pour mieux l'attaquer ensuite. Une défense dynamique, l'arme de Fischer et de Kasparov contre 1.d4.",
    ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6", "g1f3", "e8g8", "f1e2", "e7e5"],
    { 1: "1...Cf6 contrôle e4 sans occuper le centre.", 3: "2...g6 prépare le fianchetto du fou.", 5: "3...Fg7 : le fou sur la grande diagonale, pièce maîtresse de l'Est-indienne.", 6: "4.e4 : les Blancs prennent tout le centre.", 7: "4...d6 empêche e5.", 9: "5...O-O : le roi à l'abri avant d'agir.", 11: "6...e5 ! Les Noirs frappent le centre. Plan typique : ...Cc6, ...Ch5 et ...f5." }),
  opening("pieges", "Le mat de Légal", "Un piège célèbre de 1750", "w",
    "Le <strong>mat de Légal</strong>, joué à Paris vers 1750 au café de la Régence. Les Blancs sacrifient leur dame pour mater avec trois pièces mineures. Retiens surtout la leçon : avant de prendre une dame offerte, vérifie les échecs adverses.",
    ["e2e4", "e7e5", "g1f3", "d7d6", "f1c4", "c8g4", "b1c3", "g7g6", "f3e5", "g4d1", "c4f7", "e8e7", "c3d5"],
    { 5: "3...Fg4 cloue le cavalier f3... en apparence.", 7: "4...g6 ? Les Noirs ne voient pas le danger.", 8: "5.Cxe5 !! Le clouage n'était pas absolu : on abandonne la dame.", 9: "5...Fxd1 ? Les Noirs prennent la dame...", 10: "6.Fxf7+ chasse le roi.", 12: "7.Cd5# ! Trois pièces mineures font mat. Leçon : ne prends pas une dame sans vérifier les échecs." }),
  opening("berger", "Se défendre du coup du berger", "1.e4 e5 2.Fc4 Cc6 3.Dh5", "b",
    "Beaucoup de débutants tentent le coup du berger : la dame et le fou attaquent f7. Voici comment le parer proprement, en développant.",
    ["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g7g6", "h5f3", "g8f6", "g1e2", "f8g7"],
    { 4: "3.Dh5 menace Dxf7#.", 5: "3...g6 ! On chasse la dame et on bloque la diagonale. Surtout pas ...Cf6?? Dxf7#.", 6: "4.Df3 menace encore f7.", 7: "4...Cf6 : le cavalier défend en se développant.", 9: "5...Fg7 : les Noirs sont bien développés, la dame blanche est sortie trop tôt." })
];

const PATHS = [
  { id: "debutant", t: "Débutant", d: "Les règles du jeu, pièce par pièce", lessons: L_DEBUT },
  { id: "intermediaire", t: "Intermédiaire", d: "Les motifs tactiques de base", lessons: L_INTER },
  { id: "avance", t: "Avancé", d: "Finales et stratégie", lessons: L_AVANCE },
  { id: "expert", t: "Expert", d: "Combinaisons et mats célèbres", lessons: L_EXPERT },
  { id: "ouvertures", t: "Ouvertures", d: "Les 12 ouvertures et pièges essentiels", lessons: L_OUV }
];


const PUZZLES = [
  { id: "p1", t: "Le mat du couloir", th: "Mat en 1", fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", goal: "mate", n: 1, line: ["a1a8"] },
  { id: "p2", t: "Le coup du berger", th: "Mat en 1", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 3", goal: "mate", n: 1, line: ["f3f7"] },
  { id: "p3", t: "Mat à l'étouffée", th: "Mat en 1", fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", goal: "mate", n: 1, line: ["g5f7"] },
  { id: "p4", t: "L'escalier", th: "Mat en 1", fen: "1k6/7R/8/8/8/8/8/6RK w - - 0 1", goal: "mate", n: 1, line: ["g1g8"] },
  { id: "p5", t: "Le mat arabe", th: "Mat en 1", fen: "7k/7p/5N2/8/8/8/8/6RK w - - 0 1", goal: "mate", n: 1, line: ["g1g8"] },
  { id: "p6", t: "Roi et dame", th: "Mat en 1", fen: "k7/8/1K6/8/8/8/7Q/8 w - - 0 1", goal: "mate", n: 1, line: ["h2h8"] },
  { id: "p7", t: "La fourchette royale", th: "Gain de matériel", fen: "q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", goal: "gain", line: ["b5c7", "e8e7", "c7a8"], x: "Un coup de cavalier attaque deux pièces à la fois." },
  { id: "p8", t: "La fourchette de pion", th: "Gain de matériel", fen: "4k3/8/8/2n1b3/8/3P4/8/4K3 w - - 0 1", goal: "gain", line: ["d3d4", "c5e6", "d4e5"], x: "Le plus petit soldat peut attaquer deux pièces." },
  { id: "p9", t: "L'enfilade", th: "Gain de matériel", fen: "8/1q6/8/3k4/8/8/8/4KB2 w - - 0 1", goal: "gain", line: ["f1g2", "d5c5", "g2b7"], x: "Fais échec : quand le roi s'écarte, ce qui est derrière lui tombe." },
  { id: "p10", t: "Le clouage", th: "Gain de matériel", fen: "4k3/8/8/4q3/8/8/5KPP/R7 w - - 0 1", goal: "gain", line: ["a1e1", "e5e1", "f2e1"], x: "Une pièce placée devant son roi ne peut plus bouger librement." },
  { id: "p11", t: "L'échelle", th: "Mat en 2", fen: "7k/8/8/8/8/8/R7/1R4K1 w - - 0 1", goal: "mate", n: 2, line: ["a2a7", "h8g8", "b1b8"] },
  { id: "p12", t: "Le sacrifice de Philidor", th: "Mat en 2", fen: "5r1k/6pp/8/3Q2N1/2B5/8/8/6K1 w - - 0 1", goal: "mate", n: 2, line: ["d5g8", "f8g8", "g5f7"] },
  { id: "p13", t: "Mater avec la dame", th: "Finale", fen: "8/8/8/4k3/8/8/8/3QK3 w - - 0 1", goal: "convert", x: "Roi et dame contre roi seul. Repousse le roi noir vers un bord, rapproche ton roi, puis mate. Attention au pat !" },
  { id: "p14", t: "Mater avec la tour", th: "Finale", fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1", goal: "convert", x: "Plus technique : la tour coupe le roi noir rangée après rangée, ton roi vient l'aider." }
];

