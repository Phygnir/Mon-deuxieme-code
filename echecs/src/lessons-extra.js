// ---------- Contenu enrichi : présentations, objectifs, encadrés, quiz et nouvelles leçons ----------
// Chaque position a été vérifiée par tools/check-content.js (légalité, coups attendus, mats, pats).

// --- Présentation des parcours ---
const PATH_INTRO = {
  debutant: "Les règles complètes, de la marche des pièces jusqu'au mat avec la dame et la tour. À la fin, tu sais jouer une partie entière.",
  intermediaire: "Les motifs tactiques qui décident la plupart des parties : fourchettes, clouages, enfilades, découvertes, sacrifices. Chaque leçon finit par des positions tirées de vraies parties.",
  avance: "Les finales qu'il faut connaître par cœur et les bases de la stratégie : structure de pions, bons et mauvais fous, plans.",
  expert: "Les grandes combinaisons de l'histoire des échecs, de Philidor à Réti, et le calcul de variantes forcées.",
  ouvertures: "Les ouvertures les plus jouées, avec leurs idées, leurs pièges et les coups typiques. Chacune se joue guidée, puis de mémoire."
};

// --- Enrichissement des leçons existantes ---
// intro : phrase de présentation ; goals : objectifs ; recap : l'essentiel ; keys : encadrés « À retenir » par étape ;
// add : étapes ajoutées (insérées à l'index indiqué, dans l'ordre croissant).
const ENRICH = {
  plateau: {
    intro: "Avant de jouer, il faut savoir lire l'échiquier : chaque case a un nom, et c'est ce nom qui permet de noter et de comprendre les coups.",
    goals: ["Placer l'échiquier dans le bon sens", "Nommer n'importe quelle case", "Connaître la position de départ"],
    recap: ["La case h1 (en bas à droite) est toujours claire.", "Une case se nomme par sa colonne (a à h) puis sa rangée (1 à 8).", "La dame se pose sur sa couleur : dame blanche en d1, dame noire en d8."],
    keys: { 0: "Colonnes de a à h, rangées de 1 à 8. On lit toujours la lettre d'abord : e4, pas 4e.", 1: "« Blanc à droite » : la case du coin en bas à droite est claire. « La dame sur sa couleur » : d1 est une case claire." },
    add: [{ at: 2, step: { k: "quiz", fen: START, q: "Sur quelle case se trouve le roi blanc au départ ?", options: ["d1", "e1", "e8", "f1"], answer: 1, explain: "Le roi blanc commence en e1, juste à côté de sa dame en d1.", arrowsAfter: [] } }]
  },
  tour: {
    intro: "La tour est la pièce la plus simple à déplacer, et l'une des plus puissantes : elle vaut 5 pions.",
    goals: ["Déplacer la tour en ligne droite", "Trouver le chemin le plus court", "Comprendre qu'une pièce ne saute pas"],
    recap: ["La tour avance en ligne droite, horizontalement ou verticalement.", "Elle peut traverser tout l'échiquier en un coup, mais ne saute jamais.", "Valeur : 5 pions."],
    keys: { 0: "Une tour au centre contrôle 14 cases, autant qu'au bord : c'est la seule pièce dont la force ne dépend pas de sa place, mais des colonnes ouvertes." }
  },
  fou: {
    intro: "Le fou file en diagonale. Chaque camp en a deux : un sur les cases claires, un sur les cases foncées.",
    goals: ["Déplacer le fou en diagonale", "Comprendre qu'un fou ne change jamais de couleur", "Repérer les grandes diagonales"],
    recap: ["Le fou se déplace en diagonale, aussi loin qu'il veut.", "Il reste toute la partie sur sa couleur de départ.", "Valeur : 3 pions. La paire de fous est un avantage en finale."],
    keys: { 0: "Les deux grandes diagonales a1-h8 et h1-a8 traversent le centre : un fou placé dessus est très actif." }
  },
  dame: {
    intro: "La dame est la pièce la plus forte : elle cumule les pouvoirs de la tour et du fou.",
    goals: ["Déplacer la dame dans les huit directions", "Comprendre pourquoi on ne la sort pas trop tôt"],
    recap: ["La dame bouge comme une tour et comme un fou.", "Valeur : 9 pions.", "Sortie trop tôt, elle se fait chasser par les pièces adverses qui se développent en gagnant du temps."],
    keys: { 0: "Une dame au centre d'un échiquier vide contrôle 27 cases. Mais en début de partie, garde-la en réserve." }
  },
  roi: {
    intro: "Le roi est la pièce la plus importante : s'il est pris au piège, la partie est perdue.",
    goals: ["Déplacer le roi d'une case", "Savoir qu'il ne va jamais sur une case attaquée"],
    recap: ["Le roi avance d'une case dans toutes les directions.", "Il ne peut jamais se mettre en échec.", "Deux rois ne peuvent jamais être côte à côte."],
    keys: { 0: "Au début, on cache son roi (le roque). En finale, quand il reste peu de pièces, il devient une pièce d'attaque." }
  },
  cavalier: {
    intro: "Le cavalier est la pièce la plus surprenante : il bouge en L et il est le seul à sauter par-dessus les autres.",
    goals: ["Maîtriser le saut en L", "Voir que le cavalier change de couleur de case à chaque coup", "Planifier un trajet de cavalier"],
    recap: ["Deux cases tout droit, puis une sur le côté : un L.", "Il saute par-dessus toutes les pièces.", "À chaque saut, il change de couleur de case.", "Valeur : 3 pions. Il est plus fort au centre qu'au bord."],
    keys: { 0: "« Cavalier au bord, cavalier mort » : en a1, il ne contrôle que 2 cases ; en d4, il en contrôle 8." }
  },
  pion: {
    intro: "Le pion est la plus petite pièce, mais Philidor disait : « Les pions sont l'âme des échecs ».",
    goals: ["Avancer d'une ou deux cases", "Capturer en diagonale", "Savoir qu'un pion ne recule jamais"],
    recap: ["Le pion avance tout droit, deux cases au premier coup s'il le veut.", "Il prend en diagonale, vers l'avant.", "Il ne recule jamais : chaque coup de pion est définitif."],
    keys: { 1: "Avancer de deux cases n'est possible qu'au premier coup de chaque pion.", 2: "Le pion prend en diagonale, mais avance tout droit : il peut donc être bloqué par une pièce juste devant lui." }
  },
  capture: {
    intro: "Prendre les pièces adverses, oui, mais pas n'importe lesquelles : il faut savoir compter.",
    goals: ["Connaître la valeur de chaque pièce", "Repérer une pièce non défendue", "Éviter de perdre une pièce en capturant"],
    recap: ["Pion 1, cavalier 3, fou 3, tour 5, dame 9.", "Une pièce non défendue est « en prise » : prends-la si c'est sans danger.", "Avant de prendre, demande-toi : peut-il reprendre ?"],
    keys: { 0: "On ne compte pas seulement ce qu'on prend, mais aussi ce qu'on risque de perdre juste après." }
  },
  echec: {
    intro: "Attaquer le roi s'appelle donner échec. Le roi attaqué doit être sauvé immédiatement.",
    goals: ["Donner échec", "Connaître les trois façons de parer un échec"],
    recap: ["Échec = le roi est attaqué.", "Trois parades : bouger le roi, prendre la pièce qui attaque, s'interposer.", "Il est interdit de laisser son roi en échec."],
    keys: { 0: "Moyen mnémotechnique : « Fuir, Prendre, Boucher »." },
    add: [{ at: 4, step: { k: "quiz", fen: "4r1k1/8/8/8/8/8/3N4/4K3 w - - 0 1", q: "Le roi blanc est en échec par la tour e8. Quelle parade est impossible ici ?", options: ["Bouger le roi en f2", "Interposer le cavalier en e4", "Prendre la tour e8", "Bouger le roi en d1"], answer: 2, explain: "Aucune pièce blanche n'attaque e8 : on ne peut pas prendre la tour. Fuir (Rf2, Rd1...) ou boucher (Ce4) restent possibles." } }]
  },
  roque: {
    intro: "Le roque est le seul coup où l'on bouge deux pièces à la fois. Il met le roi à l'abri et active une tour.",
    goals: ["Faire le petit et le grand roque", "Connaître les quatre conditions du roque"],
    recap: ["Petit roque O-O : le roi va en g1, la tour en f1.", "Grand roque O-O-O : le roi va en c1, la tour en d1.", "Interdit si le roi ou la tour ont bougé, si le roi est en échec ou s'il traverse une case attaquée."],
    keys: { 0: "On roque en général dans les 10 premiers coups. Un roi resté au centre devient une cible." },
    add: [{ at: 3, step: { k: "quiz", fen: "r3k2r/pppp1ppp/8/8/1b6/8/PPP2PPP/R3K2R w KQkq - 0 1", q: "Les Blancs peuvent-ils faire le grand roque ?", options: ["Oui", "Non, le roi est en échec", "Non, le roi traverserait une case attaquée", "Non, la tour a déjà bougé"], answer: 1, explain: "Le fou b4 donne échec au roi e1 par la diagonale e1-a5. On ne peut jamais roquer pour sortir d'un échec.", arrowsAfter: ["b4e1:red"] } }]
  },
  passant: {
    intro: "Une règle ancienne, ajoutée quand les pions ont obtenu le droit d'avancer de deux cases.",
    goals: ["Reconnaître une prise en passant", "Savoir qu'elle n'est possible qu'immédiatement"],
    recap: ["Possible seulement contre un pion qui vient d'avancer de deux cases et arrive à côté du tien.", "On prend comme s'il n'avait avancé que d'une case.", "C'est maintenant ou jamais : au coup suivant, le droit disparaît."],
    keys: { 0: "La prise en passant ne concerne que les pions. Un cavalier ne peut pas prendre en passant." }
  },
  promotion: {
    intro: "Un pion qui arrive au bout de l'échiquier se transforme : c'est souvent ce qui décide les finales.",
    goals: ["Promouvoir un pion", "Choisir la bonne pièce"],
    recap: ["Le pion arrivé sur la dernière rangée devient dame, tour, fou ou cavalier.", "On choisit presque toujours la dame.", "On peut avoir deux dames (ou plus) en même temps."],
    keys: { 0: "La sous-promotion (en cavalier ou en tour) sert rarement : pour éviter un pat, ou pour donner échec avec un cavalier." }
  },
  mat: {
    intro: "Le but du jeu : mettre le roi adverse en échec sans qu'il puisse s'en sortir.",
    goals: ["Reconnaître un mat", "Distinguer mat et pat", "Donner un mat simple"],
    recap: ["Mat = échec + aucune parade possible.", "Pat = pas d'échec, mais aucun coup légal : partie nulle.", "Quand tu as un gros avantage, vérifie toujours que l'adversaire garde au moins un coup."],
    keys: { 0: "Le pat est le cauchemar du joueur qui gagne : il transforme une victoire en nulle." }
  },
  ouverture: {
    intro: "Les premiers coups décident de la suite. Trois principes simples suffisent pour bien commencer.",
    goals: ["Occuper le centre", "Développer les pièces mineures", "Roquer tôt"],
    recap: ["Joue un pion central (e4 ou d4).", "Sors cavaliers et fous avant la dame.", "Roque dans les 10 premiers coups.", "Ne joue pas deux fois la même pièce sans raison."],
    keys: { 0: "Le centre (d4, d5, e4, e5) est la zone la plus importante : les pièces y sont plus actives." }
  },
  fourchette: {
    intro: "La fourchette est le motif tactique le plus fréquent : une seule pièce attaque deux cibles.",
    goals: ["Repérer les fourchettes de cavalier", "Utiliser la dame et les pions pour fourchetter", "Reconnaître les cibles idéales"],
    recap: ["Une pièce, deux cibles : l'adversaire n'en sauve qu'une.", "Le cavalier est le roi de la fourchette, car on ne peut pas le bloquer.", "Les meilleures cibles : le roi (échec), la dame, les tours et les pièces non défendues."],
    keys: { 0: "Une fourchette avec échec (« fourchette royale ») est la plus forte : l'adversaire doit d'abord sauver son roi." }
  },
  clouage: {
    intro: "Une pièce clouée ne peut plus bouger sans exposer ce qui est derrière elle.",
    goals: ["Distinguer clouage absolu et relatif", "Attaquer une pièce clouée"],
    recap: ["Clouage absolu : la pièce derrière est le roi, la pièce clouée ne peut pas bouger du tout.", "Clouage relatif : derrière, une pièce de valeur ; bouger reste permis, mais coûte cher.", "Une pièce clouée est une cible : attaque-la avec un pion."],
    keys: { 0: "Seuls les fous, les tours et les dames peuvent clouer : il faut une ligne droite." }
  },
  enfilade: {
    intro: "L'enfilade, c'est le clouage à l'envers : la grosse pièce est devant, et doit s'écarter.",
    goals: ["Reconnaître une enfilade", "Gagner la pièce cachée derrière le roi ou la dame"],
    recap: ["La pièce de devant est la plus précieuse (souvent le roi).", "Quand elle s'écarte, la pièce de derrière tombe.", "Cherche les rois et dames alignés avec une autre pièce."],
    keys: { 0: "En finale, l'enfilade du roi et de la dame avec une tour ou un fou est un motif de gain classique." }
  },
  decouverte: {
    intro: "Une pièce s'écarte et en démasque une autre : deux menaces d'un coup.",
    goals: ["Préparer une attaque à la découverte", "Comprendre la puissance de l'échec à la découverte"],
    recap: ["La pièce qui bouge peut faire ce qu'elle veut pendant que l'autre attaque.", "Avec échec, l'adversaire n'a pas le temps de répondre à la seconde menace.", "Le double échec oblige le roi à bouger."],
    keys: { 1: "Avec un échec à la découverte, la pièce qui bouge peut même se sacrifier : l'adversaire doit d'abord parer l'échec." }
  },
  enprise: {
    intro: "La plupart des parties de débutants se perdent sur une pièce oubliée. Apprends à scanner l'échiquier.",
    goals: ["Repérer les pièces non défendues", "Prendre la plus grosse pièce en premier"],
    recap: ["À chaque coup, regarde ce qui est attaqué et ce qui n'est pas défendu, chez toi et chez l'adversaire.", "Une pièce non défendue est la cible idéale des fourchettes.", "Prends la pièce de plus grande valeur d'abord."],
    keys: { 0: "Le réflexe des forts joueurs : « Qu'est-ce qui a changé ? Qu'est-ce qui est attaqué ? »" }
  },
  batterie: {
    intro: "Deux pièces alignées sur la même cible forment une batterie : la plus courante vise h7.",
    goals: ["Construire une batterie dame-fou", "Reconnaître la menace de mat en h7"],
    recap: ["Dame devant, fou derrière (ou l'inverse) sur la même diagonale : c'est une batterie.", "Le pion h7 (ou h2) n'est défendu que par le roi : c'est le point faible du roque.", "Un cavalier en f6 (ou f3) défend h7 : si tu l'élimines, le mat arrive."],
    keys: { 0: "Le défenseur de h7 est souvent le cavalier f6. Retiens ce trio : Fd3, Dh5, et le cavalier f6 qui disparaît." }
  },
  carre: {
    intro: "Un calcul instantané pour savoir si ton roi rattrape un pion qui file à dame.",
    goals: ["Tracer le carré d'un pion", "Savoir si un roi peut rattraper un pion"],
    recap: ["Trace un carré du pion jusqu'à sa case de promotion.", "Si le roi peut entrer dans le carré au coup suivant, il rattrape le pion.", "Attention : un pion sur sa case de départ peut avancer de deux cases, compte le carré depuis la 3e rangée."],
    keys: { 0: "Plus besoin de compter les coups un par un : le carré te donne la réponse d'un coup d'œil." }
  },
  opposition: {
    intro: "L'opposition décide de la plupart des finales de pions. C'est la première finale que tout joueur doit maîtriser.",
    goals: ["Prendre l'opposition", "Mener un pion à dame avec le roi devant", "Éviter le pat final"],
    recap: ["Opposition : rois face à face, une case entre eux. Celui qui doit jouer cède le passage.", "Mets ton roi devant ton pion, pas derrière.", "Roi en 6e rangée devant son pion : gain toujours (sauf pion de la colonne a ou h)."],
    keys: { 0: "Le camp qui a l'opposition est celui qui n'a PAS le trait : c'est un rare cas où jouer est un désavantage (zugzwang)." }
  },
  percee: {
    intro: "Comment créer un pion passé à partir de rien : la percée, une combinaison de pions.",
    goals: ["Reconnaître une majorité de pions", "Exécuter la percée classique"],
    recap: ["Un pion passé n'a plus de pion adverse devant lui ni à côté.", "Trois pions contre trois face à face : le pion du milieu avance et sacrifie.", "Compte toujours les coups : le roi adverse doit être trop loin."],
    keys: { 0: "La percée fonctionne parce que les pions noirs ne peuvent pas tout couvrir après le premier sacrifice." }
  },
  structure: {
    intro: "Les pions forment le squelette de la position. Leurs faiblesses sont permanentes.",
    goals: ["Reconnaître pions doublés, isolés et passés", "Savoir lesquels sont des forces ou des faiblesses"],
    recap: ["Doublé : deux pions sur la même colonne, souvent une faiblesse.", "Isolé : aucun pion ami à côté, il faut le défendre avec des pièces.", "Passé : plus aucun pion adverse devant lui, une force qui grandit en finale."],
    keys: { 0: "Les faiblesses de pions ne se réparent pas : avant de pousser un pion, pense aux cases que tu affaiblis." }
  },
  "pieces-actives": {
    intro: "À matériel égal, celui qui a les pièces les plus actives gagne. Voici comment les activer.",
    goals: ["Placer une tour sur une colonne ouverte", "Reconnaître un avant-poste pour le cavalier"],
    recap: ["Les tours veulent des colonnes ouvertes.", "Un avant-poste est une case protégée par un pion, qu'aucun pion adverse ne peut attaquer.", "Améliore toujours ta pièce la moins active."],
    keys: { 0: "Quand tu ne sais pas quoi jouer, trouve ta pièce la plus mal placée et améliore-la." }
  },
  calcul: {
    intro: "Les combinaisons commencent toujours par les coups forcés. Voici comment les chercher.",
    goals: ["Examiner les coups forcés dans l'ordre", "Oser un sacrifice quand il force la suite"],
    recap: ["Ordre de recherche : échecs, captures, menaces.", "Un sacrifice qui donne échec laisse peu de choix à l'adversaire : c'est calculable.", "Vérifie toujours la meilleure défense adverse, pas celle que tu espères."],
    keys: { 0: "Les forts joueurs ne calculent pas tout : ils calculent les coups forcés jusqu'au bout." }
  },
  boden: { intro: "Deux fous qui se croisent devant un roi roqué côté dame : un mat élégant, souvent préparé par un sacrifice.", goals: ["Reconnaître le schéma du mat de Boden", "Ouvrir une diagonale par un sacrifice"], recap: ["Les deux fous couvrent les cases de fuite en croix.", "Le sacrifice de la dame en c6 ouvre la diagonale a6-c8.", "Schéma typique contre un grand roque bloqué par ses propres pièces."], keys: { 0: "Les propres pièces du roi (cavalier d7, tour d8) lui bouchent les cases de fuite : c'est le point commun de beaucoup de mats." } },
  anastasie: { intro: "Le mat d'Anastasie vient d'un roman de 1803. Le cavalier en e7 et la tour sur la colonne h travaillent ensemble.", goals: ["Reconnaître le schéma cavalier e7 et tour en h", "Attirer le roi par un sacrifice"], recap: ["Le cavalier e7 contrôle g8 et g6.", "La dame se sacrifie en h7 pour attirer le roi.", "La tour arrive sur la colonne h : mat."], keys: { 0: "Le sacrifice d'attraction : on donne une pièce pour forcer le roi sur une case précise." } },
  philidor: { intro: "Connu depuis le XVe siècle et popularisé par Philidor : le plus beau mat du cavalier.", goals: ["Enchaîner échecs du cavalier et double échec", "Sacrifier la dame pour étouffer le roi"], recap: ["Le cavalier donne échec en f7, puis double échec en h6.", "La dame se sacrifie en g8 : la tour doit la prendre.", "Le cavalier revient en f7 : le roi est étouffé par ses propres pièces."], keys: { 0: "Le double échec ne laisse qu'une option : bouger le roi. C'est ce qui rend la combinaison forcée." } },
  opera: { intro: "Paris, 1858 : une partie jouée pendant une représentation du Barbier de Séville, restée célèbre pour sa beauté.", goals: ["Exploiter une avance de développement", "Voir un sacrifice de dame menant au mat"], recap: ["Morphy a sacrifié du matériel pour développer plus vite.", "Le sacrifice Db8+ dévie le cavalier qui défendait d8.", "La tour mate en d8, le fou g5 couvre e7."], keys: { 0: "Leçon de Morphy : en ouverture, le temps compte plus que les pions." } },
  doubleechec: { intro: "Vienne, 1910 : Réti bat Tartakower en 11 coups avec un double échec.", goals: ["Reconnaître une batterie cachée", "Exécuter un double échec"], recap: ["La tour d1 était cachée derrière la dame et le fou.", "Le sacrifice Dd8+ attire le roi sur la colonne d.", "Le double échec Fg5++ oblige le roi à bouger : le mat suit."], keys: { 0: "Une pièce cachée derrière une autre sur une ligne ouverte est une arme : cherche toujours les batteries." } }
};

// --- Nouvelles leçons ---
const NEW_DEBUT = [
  { id: "notation", t: "Lire et noter les coups", d: "La notation algébrique en français", g: "p",
    intro: "Pour lire un livre, suivre une vidéo ou rejouer ses parties, il faut savoir noter les coups. C'est simple et universel.",
    goals: ["Noter un coup de pièce et de pion", "Comprendre les symboles x, +, # et O-O", "Lire une partie notée"],
    recap: ["Un coup = la lettre de la pièce + la case d'arrivée (Cf3). Pas de lettre pour le pion (e4).", "Lettres françaises : R roi, D dame, T tour, F fou, C cavalier.", "x = prise, + = échec, # = mat, O-O et O-O-O = roques."],
    steps: [
      { k: "info", fen: START, arrows: ["e2e4"], x: "On note un coup avec la <strong>pièce</strong>, puis la <strong>case d'arrivée</strong>. Pour un pion, on n'écrit que la case. Le coup montré par la flèche s'écrit donc simplement <strong>e4</strong>.", key: "En français : R roi, D dame, T tour, F fou, C cavalier. En anglais, on lit K, Q, R, B et N." },
      { k: "info", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", arrows: ["g1f3"], x: "Ici, le cavalier g1 va en f3 : on écrit <strong>Cf3</strong>. La partie commencée s'écrit : 1.e4 e5 2.Cf3. Le numéro compte les coups des deux camps ensemble." },
      { k: "quiz", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", arrows: ["f1b5"], q: "Comment note-t-on le coup montré par la flèche ?", options: ["Fb5", "Cb5", "Fxb5", "b5"], answer: 0, explain: "Le fou va en b5 sans rien prendre : Fb5. C'est la partie espagnole !", wrongs: { 2: "Il n'y a rien à prendre en b5 : pas de « x ».", 3: "Sans lettre, ce serait un coup de pion." } },
      { k: "info", fen: "r1bqkbnr/pppp1ppp/2B5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4", marks: ["c6"], x: "<p>Les symboles à connaître :</p><p><strong>x</strong> une prise (ici Fxc6) · <strong>+</strong> échec · <strong>#</strong> mat · <strong>O-O</strong> petit roque · <strong>O-O-O</strong> grand roque · <strong>e8=D</strong> promotion.</p><p>Et pour commenter : <strong>!</strong> bon coup, <strong>?</strong> erreur, <strong>??</strong> gaffe.</p>", key: "Pour une prise de pion, on écrit la colonne de départ : exd5 veut dire « le pion e prend en d5 »." },
      { k: "quiz", q: "Que signifie Cxe5+ ?", fen: START, options: ["Un cavalier prend en e5 et donne échec", "Un cavalier va en e5 et fait mat", "Un pion prend en e5", "Une tour prend en e5"], answer: 0, explain: "C = cavalier, x = prise, e5 = case, + = échec." },
      { k: "quiz", q: "Ce coup fait mat. Comment le note-t-on ?", fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", arrows: ["a1a8"], options: ["Ta8+", "Ta8#", "Txa8", "Da8#"], answer: 1, explain: "Tour en a8, et c'est mat : Ta8#." },
      { k: "quiz", q: "Comment note-t-on le grand roque ?", fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1", options: ["O-O", "O-O-O", "Rc1", "Td1"], answer: 1, explain: "Trois zéros pour le grand roque (côté dame, la tour fait trois cases), deux pour le petit." }
    ] },
  { id: "nulle", t: "Les parties nulles", d: "Pat, répétition, matériel insuffisant", g: "k",
    intro: "Une partie d'échecs peut se terminer sans vainqueur. Connaître les cas de nulle permet de sauver des positions perdues... et d'éviter de gâcher des positions gagnées.",
    goals: ["Reconnaître le pat", "Connaître les cinq façons de faire nulle", "Éviter le pat quand on gagne"],
    recap: ["Pat : pas d'échec, aucun coup légal.", "Triple répétition, règle des 50 coups, matériel insuffisant, accord mutuel.", "Roi + fou ou roi + cavalier contre roi seul : impossible de mater."],
    steps: [
      { k: "info", fen: "k7/2Q5/1K6/8/8/8/8/8 b - - 0 1", x: "<p>Cinq façons de faire nulle :</p><p><strong>1.</strong> Le pat. <strong>2.</strong> La triple répétition de la même position. <strong>3.</strong> 50 coups de chaque camp sans prise ni coup de pion. <strong>4.</strong> Le matériel insuffisant pour mater. <strong>5.</strong> L'accord entre les joueurs.</p>" },
      { k: "quiz", fen: "k7/2Q5/1K6/8/8/8/8/8 b - - 0 1", q: "Les Noirs ont le trait. Que se passe-t-il ?", options: ["Échec et mat, les Blancs gagnent", "Pat : la partie est nulle", "Les Noirs jouent Rb8", "Les Noirs jouent Ra7"], answer: 1, explain: "Le roi noir n'est pas en échec, mais a7, b7 et b8 sont toutes contrôlées. Aucun coup légal : pat. Les Blancs avaient une dame de plus et font nulle !", marks: [] },
      { k: "quiz", fen: "8/8/4k3/8/8/2B5/4K3/8 w - - 0 1", q: "Roi et fou contre roi seul : qui peut gagner ?", options: ["Les Blancs, en jouant bien", "Personne : c'est nul", "Les Noirs"], answer: 1, explain: "Un fou seul (ou un cavalier seul) ne peut jamais mater. La partie est déclarée nulle immédiatement." },
      { k: "quiz", fen: START, q: "La même position apparaît pour la troisième fois, avec le même joueur au trait. Que se passe-t-il ?", options: ["Rien de spécial", "On peut réclamer la nulle", "Le joueur au trait perd", "On rejoue le coup précédent"], answer: 1, explain: "C'est la triple répétition : la nulle peut être réclamée. C'est souvent une sortie de secours avec un échec perpétuel." },
      { k: "move", fen: "7k/8/6K1/8/8/8/8/5Q2 w - - 0 1", goal: "mate", x: "Fais mat en un coup. Attention : un coup imprudent de la dame serait pat !", ok: "Df8# ! Le roi g6 garde g7 et h7, la dame tient la 8e rangée.", key: "Avant de jouer dans une position gagnante, vérifie que l'adversaire a encore au moins un coup." }
    ] },
  { id: "matdame", t: "Mater avec la dame", d: "Roi et dame contre roi seul", g: "q",
    intro: "C'est la finale la plus importante à savoir gagner : elle arrive dès que tu promeus un pion. Avec la bonne méthode, le mat vient en moins de 10 coups.",
    goals: ["Réduire la « boîte » du roi adverse", "Rapprocher son roi", "Mater sans faire pat"],
    recap: ["La dame se place à un saut de cavalier du roi adverse pour réduire sa boîte.", "Quand le roi adverse est sur le bord, arrête de le serrer et amène ton roi.", "Le mat se donne sur le bord, la dame protégée par le roi."],
    steps: [
      { k: "info", fen: "8/8/8/4k3/8/8/8/3QK3 w - - 0 1", x: "<p>La méthode en trois temps :</p><p><strong>1.</strong> La dame enferme le roi adverse dans une « boîte » de plus en plus petite. Le bon réflexe : placer la dame à un <strong>saut de cavalier</strong> du roi adverse.</p><p><strong>2.</strong> Quand il est sur le bord, ton roi s'approche.</p><p><strong>3.</strong> La dame donne mat, protégée par ton roi.</p>" },
      { k: "info", fen: "6k1/8/5Q2/8/8/8/8/6K1 b - - 0 1", marks: ["g8", "h7"], x: "Ici, la dame f6 enferme le roi noir dans le coin : il n'a plus que deux cases, g8 et h7. Inutile de donner des échecs : il est temps d'amener le roi blanc. Mais attention, chaque coup de dame doit laisser une case au roi noir, sinon c'est pat.", key: "Échecs inutiles = temps perdu. On ne donne échec que pour mater." },
      { k: "quiz", fen: "7k/8/6K1/8/8/8/8/5Q2 w - - 0 1", q: "Les Blancs jouent. Quel coup fait mat ?", options: ["Df8#", "Df7", "Df6+", "Rh6"], answer: 0, explain: "Df8 : échec sur la 8e rangée, et g7, h7 sont gardées par le roi g6.", wrongs: { 1: "Df7 est pat : le roi noir n'a plus aucune case et n'est pas en échec !", 2: "Échec, mais le roi s'échappe en g8.", 3: "Ce n'est pas un échec : le roi noir joue Rg8." } },
      { k: "endgame", fen: "8/8/8/4k3/8/8/8/3QK3 w - - 0 1", max: 15, pieces: 1, x: "À toi : mate en 15 coups maximum. Le coach joue le roi noir et se défend au mieux.", ok: "Mat ! Tu sais gagner la finale roi et dame contre roi." }
    ] },
  { id: "mattour", t: "Mater avec la tour", d: "Roi et tour contre roi seul", g: "r",
    intro: "Plus technique que le mat de la dame : la tour a besoin de l'aide du roi. C'est la base de toutes les finales de tours.",
    goals: ["Couper le roi adverse avec la tour", "Mettre les rois face à face", "Donner le mat sur le bord"],
    recap: ["La tour coupe le roi adverse (une rangée ou une colonne qu'il ne peut pas franchir).", "Ton roi vient se placer face au roi adverse (opposition).", "Échec de la tour sur le bord : mat. Sinon, un coup d'attente de la tour."],
    steps: [
      { k: "info", fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1", x: "<p>La tour seule ne peut pas mater : elle a besoin du roi.</p><p><strong>1.</strong> La tour coupe le roi adverse, rangée après rangée.</p><p><strong>2.</strong> Ton roi vient face au roi adverse.</p><p><strong>3.</strong> La tour donne échec sur le bord : mat.</p>" },
      { k: "info", fen: "4k3/8/4K3/8/8/8/8/R7 w - - 0 1", arrows: ["a1a8"], x: "Voici la position finale typique : rois face à face, une case entre eux. L'échec de la tour sur la 8e rangée est mat, car le roi blanc garde d7, e7 et f7.", key: "Le mat de la tour se donne toujours sur le bord, rois en opposition." },
      { k: "move", fen: "4k3/8/4K3/8/8/8/8/R7 w - - 0 1", goal: "mate", x: "Donne le mat.", ok: "Ta8# : le schéma final à reconnaître d'un coup d'œil." },
      { k: "move", fen: "3k4/R7/4K3/8/8/8/8/8 w - - 0 1", accept: ["a7g7", "a7e7", "a7h7", "a7f7"], x: "Le roi noir n'est pas en face du tien. Joue un <strong>coup d'attente</strong> avec la tour en restant sur la 7e rangée, loin du roi noir : il devra se mettre en face du tien, ou s'éloigner.", ok: "Bien : la tour garde la 7e rangée. Si le roi noir vient en face du tien (...Re8), la tour mate sur la 8e rangée ; s'il s'éloigne (...Rc8), ton roi le suit en d6.", no: "Garde la tour sur la 7e rangée, loin du roi noir." },
      { k: "endgame", fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1", max: 25, pieces: 1, x: "À toi : mate en 25 coups maximum. Coupe, approche, mate.", ok: "Mat ! Tu maîtrises la finale roi et tour contre roi." }
    ] }
];

const NEW_INTER = [
  { id: "echanges", t: "Compter avant de prendre", d: "Attaquants contre défenseurs", g: "r",
    intro: "Une prise n'est bonne que si l'échange qui suit te rapporte. La méthode : compter les attaquants et les défenseurs.",
    goals: ["Compter attaquants et défenseurs", "Savoir quand une prise gagne du matériel"],
    recap: ["Si tu attaques une cible plus de fois qu'elle n'est défendue, elle tombe en général.", "Commence l'échange avec ta pièce la moins précieuse.", "Une pièce de grande valeur ne doit pas prendre une cible bien défendue."],
    steps: [
      { k: "info", fen: "3r2k1/5ppp/3p4/8/8/8/5PPP/3R2K1 w - - 0 1", arrows: ["d1d6", "d8d6:red"], x: "Le pion d6 est attaqué <strong>une</strong> fois (la tour d1) et défendu <strong>une</strong> fois (la tour d8). Si la tour prend, la tour noire reprend : tu perds une tour (5) pour un pion (1)." },
      { k: "quiz", fen: "3r2k1/5ppp/3p4/8/8/8/5PPP/3R2K1 w - - 0 1", q: "Les Blancs peuvent-ils prendre le pion d6 ?", options: ["Oui, Txd6 gagne un pion", "Non : après Txd6 Txd6, je perds ma tour contre un pion"], answer: 1, explain: "Un attaquant contre un défenseur : la prise perd." },
      { k: "move", fen: "3r2k1/5ppp/3p4/8/8/8/3R1PPP/3R2K1 w - - 0 1", accept: ["d2d6"], x: "Maintenant tes deux tours attaquent d6 : <strong>deux attaquants contre un défenseur</strong>. Gagne le pion.", ok: "Txd6 ! Après Txd6 Txd6, tu as gagné un pion.", key: "Deux attaquants contre un défenseur : la cible tombe. Pense à doubler tes tours avant de prendre." }
    ] }
];

NEW_INTER.push({ id: "couloir", t: "Le mat du couloir", d: "L'attaquer et s'en protéger", g: "r",
  intro: "Le mat du couloir décide d'innombrables parties, même chez les bons joueurs. Il faut savoir le donner, et surtout s'en protéger.",
  goals: ["Reconnaître un roi enfermé sur sa dernière rangée", "Donner le mat du couloir", "Créer une fenêtre pour son roi"],
  recap: ["Un roi roqué derrière trois pions intacts n'a aucune case de fuite.", "Une tour ou une dame sur la dernière rangée suffit alors à mater.", "La parade : avancer un pion devant le roi (h3 ou g3) pour lui donner une « fenêtre »."],
  steps: [
    { k: "info", fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", arrows: ["d1d8"], marks: ["f7", "g7", "h7"], x: "Le roi noir est enfermé par ses propres pions f7, g7 et h7. S'il est attaqué sur la 8e rangée, il n'a aucune case où fuir." },
    { k: "move", fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", goal: "mate", x: "Donne le mat du couloir.", ok: "Td8# : le roi est prisonnier de ses propres pions." },
    { k: "info", fen: "4r1k1/5ppp/8/8/8/1R6/5PPP/6K1 w - - 0 1", arrows: ["e8e1:red"], x: "Les rôles s'inversent : cette fois, c'est <strong>ton</strong> roi qui est enfermé, et les Noirs menacent Te1#. La parade la plus sûre : ouvrir une <strong>fenêtre</strong> en avançant un pion devant le roi.", key: "Une fenêtre (« luft ») coûte un temps, mais supprime pour toujours le danger du couloir." },
    { k: "quiz", fen: "4r1k1/5ppp/8/8/8/1R6/5PPP/6K1 w - - 0 1", q: "Les Noirs menacent Te1#. Que jouent les Blancs ?", options: ["h3 : une fenêtre pour le roi", "Tb8 : on attaque la tour", "Tb7 : on attaque le pion f7"], answer: 0, explain: "Après h3, le roi peut fuir en h2 : Te1+ Rh2 et il n'y a plus de mat.", wrongs: { 1: "Txb8 ? Non : la tour e8 prend en b8, et tu as perdu ta tour.", 2: "Te1# : les Noirs matent immédiatement." }, arrowsAfter: ["h2h3"] }
  ] });
const NEW_AVANCE = [
  { id: "roiactif", t: "Le roi actif en finale", d: "Le roi passe devant son pion", g: "k",
    intro: "En finale, le roi devient une pièce d'attaque. Le principe le plus important : le roi doit marcher devant son pion, pas derrière.",
    goals: ["Placer son roi devant le pion", "Utiliser les cases clés"],
    recap: ["En finale de pions, le roi doit précéder le pion.", "Les cases clés sont deux rangées devant le pion : si ton roi les atteint, le pion va à dame.", "Ne pousse le pion que quand ton roi lui a ouvert la route."],
    steps: [
      { k: "info", fen: "8/8/3k4/8/8/2K5/4P3/8 w - - 0 1", marks: ["d4", "e4", "f4"], x: "Pour un pion en e2, les <strong>cases clés</strong> sont d4, e4 et f4 : deux rangées devant le pion (pour un pion en e3, ce serait d5, e5 et f5). Si ton roi atteint l'une d'elles, la finale est gagnée quelle que soit la défense.", key: "Le pion attend : c'est le roi qui ouvre la route." },
      { k: "kpk", fen: "8/8/3k4/8/8/2K5/4P3/8 w - - 0 1", x: "Gagne cette finale. Un seul premier coup gagne : trouve-le, puis mène le pion à dame." },
      { k: "kpk", fen: "8/8/8/3k4/8/8/2K1P3/8 w - - 0 1", x: "Même idée, avec ton roi un peu plus loin. Le roi d'abord !" }
    ] },
  { id: "lucena", t: "Finale de tours : Lucena", d: "Construire le pont", g: "r",
    intro: "La position de Lucena (1497) est la position gagnante de référence des finales de tours. La technique s'appelle « construire le pont ».",
    goals: ["Reconnaître la position de Lucena", "Couper le roi adverse", "Construire le pont avec la tour"],
    recap: ["Pion en 7e rangée, roi devant lui, roi adverse coupé : c'est gagné.", "La tour coupe le roi adverse d'une colonne de plus.", "La tour va en 4e rangée pour servir d'abri contre les échecs : c'est le pont."],
    steps: [
      { k: "info", fen: "1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1", x: "Ton roi est devant le pion, mais il ne peut pas sortir : la tour noire le harcèle d'échecs par les côtés. La solution en deux temps : <strong>repousser le roi noir</strong> d'une colonne, puis placer ta tour en 4e rangée pour <strong>faire un pont</strong> qui stoppera les échecs." },
      { k: "line", fen: "1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1", side: "w", moves: ["c1d1", "d7e7", "d1d4", "a2a1", "b8c7", "a1c1", "c7b6", "c1b1", "b6c6", "b1c1", "c6b5", "c1b1", "d4b4"], x: "Joue la technique complète. Commence par repousser le roi noir.", notes: { 0: "Td1+ : le roi noir s'éloigne d'une colonne.", 2: "Td4 ! La tour se place en 4e rangée : c'est le futur pont.", 4: "Rc7 : le roi sort enfin de sa cachette.", 8: "Rc6 : le roi s'approche de la tour.", 10: "Rb5 : encore un pas vers la tour.", 12: "Tb4 ! Le pont est construit : plus d'échec possible, le pion va à dame." }, done: "Le pont est construit : le pion va promouvoir. Tu connais la finale de tours la plus importante !" }
    ] },
  { id: "philidordef", t: "Finale de tours : Philidor", d: "La défense de la 3e rangée", g: "r",
    intro: "Le pendant défensif de Lucena : avec la méthode de Philidor (1777), le camp qui a un pion de moins fait nulle.",
    goals: ["Placer la tour en 3e rangée", "Passer derrière quand le pion avance"],
    recap: ["Le roi se place devant le pion adverse.", "La tour reste sur sa 3e rangée (la 6e pour les Noirs) pour empêcher le roi adverse d'avancer.", "Quand le pion avance sur cette rangée, la tour passe derrière et donne des échecs par l'arrière."],
    steps: [
      { k: "info", fen: "4k3/8/8/3KP3/8/8/7R/r7 b - - 0 1", x: "Les Noirs ont un pion de moins. Leur roi est bien placé, devant le pion. Il faut maintenant empêcher le roi blanc d'atteindre la 6e rangée." },
      { k: "move", fen: "4k3/8/8/3KP3/8/8/7R/r7 b - - 0 1", accept: ["a1a6"], x: "Tu as les Noirs. Place ta tour sur la bonne rangée.", ok: "Ta6 ! Le roi blanc ne peut plus avancer. Si le pion vient en e6, la tour passe en a1 et donne des échecs par derrière : nulle.", no: "La tour doit couper le roi blanc de la 6e rangée.", key: "Philidor : tour en 3e rangée tant que le pion n'y est pas, puis échecs par derrière." },
      { k: "quiz", fen: "4k3/8/r3P3/3K4/8/8/7R/8 b - - 0 1", q: "Le pion blanc vient d'arriver en e6. Que fait la tour noire ?", options: ["Elle reste en a6 et attend", "Elle va en a1 pour donner des échecs par derrière", "Elle prend le pion e6"], answer: 1, explain: "Le roi blanc n'a plus d'abri en 6e rangée (son pion occupe e6) : la tour donne des échecs par derrière et le roi ne peut pas s'en cacher.", wrongs: { 2: "Txe6 ?? Rxe6 : le roi blanc reprend, et la tour est perdue." } }
    ] },
  { id: "bonfou", t: "Bon et mauvais fou", d: "Le fou et la chaîne de pions", g: "b",
    intro: "Un fou bloqué par ses propres pions est dit « mauvais ». Comprendre cette idée change la façon de placer ses pions.",
    goals: ["Reconnaître un mauvais fou", "Savoir sur quelle couleur placer ses pions"],
    recap: ["Mauvais fou : ses propres pions sont sur sa couleur et le bloquent.", "Bon fou : ses pions sont sur l'autre couleur, ses diagonales sont libres.", "Mets tes pions sur la couleur opposée à celle de ton fou restant."],
    steps: [
      { k: "info", fen: "4k3/8/2b5/3p1p2/8/1P1PB3/8/6K1 w - - 0 1", x: "Les deux camps ont un fou. Regarde les pions : tous sont sur des cases claires (d5 et f5 pour les Noirs, b3 et d3 pour les Blancs). Le fou noir c6 court sur les cases claires, le fou blanc e3 sur les foncées." },
      { k: "pick", fen: "4k3/8/2b5/3p1p2/8/1P1PB3/8/6K1 w - - 0 1", answers: ["c6"], x: "Clique sur le <strong>mauvais fou</strong>.", ok: "Le fou c6 est sur cases claires, comme ses propres pions d5 et f5 : ils lui bouchent les diagonales. Le fou blanc e3, sur cases foncées, est libre.", no: "Le mauvais fou est celui qui court sur la même couleur que ses propres pions." },
      { k: "quiz", fen: "4k3/8/2b5/3p1p2/8/1P1PB3/8/6K1 w - - 0 1", q: "Ton dernier fou est sur cases foncées. Où placer tes pions ?", options: ["Sur cases foncées, pour les protéger", "Sur cases claires, pour libérer le fou"], answer: 1, explain: "Pions sur la couleur opposée : le fou garde ses diagonales libres et les pions contrôlent les autres cases." }
    ] }
];

const NEW_EXPERT = [
  { id: "immortelle", t: "L'Immortelle", d: "Anderssen – Kieseritzky, Londres 1851", g: "q",
    intro: "La partie la plus célèbre du romantisme : Anderssen sacrifie un fou, deux tours puis sa dame, et mate avec ses trois pièces mineures.",
    goals: ["Apprécier le développement face au matériel", "Exécuter le mat final"],
    recap: ["Anderssen avait donné une tour, une autre tour et un fou, mais toutes ses pièces restantes attaquaient.", "Le sacrifice de dame Df6+ dévie le cavalier g8 de la défense de e7.", "Le fou mate en e7 : un mat avec seulement des pièces mineures."],
    steps: [
      { k: "info", fen: "r1bk2nr/p2p1pNp/n2B4/1p1NP2P/6P1/3P1Q2/P1P1K3/q5b1 w - - 1 22", x: "Londres, 1851. Les Noirs ont deux tours et un fou de plus ! Mais le roi noir est en d8, entouré de pièces blanches actives : Cd5, Cg7, Fd6, Df3. Il reste à trouver la conclusion." },
      { k: "mate", fen: "r1bk2nr/p2p1pNp/n2B4/1p1NP2P/6P1/3P1Q2/P1P1K3/q5b1 w - - 1 22", n: 2, x: "Mat en 2, comme Anderssen.", ok: "22.Df6+ Cxf6 23.Fe7# ! L'Immortelle." }
    ] },
  { id: "toujoursjeune", t: "La Toujours Jeune", d: "Anderssen – Dufresne, Berlin 1852", g: "b",
    intro: "Un an après l'Immortelle, Anderssen signe une autre combinaison : sacrifice de dame en d7 et mat des deux fous.",
    goals: ["Exécuter une combinaison avec double échec", "Coordonner deux fous"],
    recap: ["Dxd7+ ! attire le roi en d7.", "Ff5+ est un double échec (fou et tour d1).", "Les deux fous terminent le travail : Fd7+ puis Fxe7#."],
    steps: [
      { k: "info", fen: "1r2k1r1/pbppnp1p/1b3P2/8/Q7/B1PB1q2/P4PPP/3R2K1 w - - 0 21", x: "Berlin, 1852. Les Noirs menacent Dxg2#. Anderssen a besoin de coups forcés : uniquement des échecs." },
      { k: "line", fen: "1r2k1r1/pbppnp1p/1b3P2/8/Q7/B1PB1q2/P4PPP/3R2K1 w - - 0 21", side: "w", moves: ["a4d7", "e8d7", "d3f5", "d7e8", "f5d7", "e8f8", "a3e7"], x: "Rejoue la combinaison : 4 coups, tous avec échec.", notes: { 0: "21.Dxd7+ !! Le roi doit prendre.", 2: "22.Ff5++ : double échec du fou et de la tour d1.", 4: "23.Fd7+ : le roi recule encore.", 6: "24.Fxe7# : la Toujours Jeune !" }, done: "Mat ! Une combinaison entièrement faite d'échecs." }
    ] }
];

// --- Nouvelles ouvertures (lignes, fiches, exercices) ---
Object.assign(SHEETS, {
  gambitroi: {
    plans: { w: ["Ouvrir la colonne f pour attaquer f7.", "Reprendre le pion f4 plus tard (Fxf4).", "Développer vite et roquer."], b: ["Garder le pion de plus avec ...g5.", "Ou rendre le pion avec ...d5 pour se développer.", "Attaquer le roi blanc affaibli par f4."] },
    typical: [{ u: "d1e2", t: "De2 : cloue le cavalier e4 sur la colonne e." }, { u: "b1c3", t: "Cc3 : attaque le cavalier e4." }, { u: "d8e7", t: "...De7 : défend le cavalier e4 et vise e2." }, { u: "c8f5", t: "...Ff5 : soutient le cavalier e4." }],
    situations: [{ t: "Un gambit romantique", x: "Le gambit du roi était l'ouverture favorite du XIXe siècle. Les Blancs donnent un pion pour ouvrir la colonne f et attaquer vite." }, { t: "Le roi blanc exposé", x: "Après f4, la diagonale e1-h4 est affaiblie : ...Dh4+ est une idée à surveiller dans beaucoup de variantes." }],
    practice: [{ pre: [], cut: 6, accept: ["h2h4"], x: "Les Noirs défendent le pion f4 avec ...g5. Attaque la chaîne de pions.", ok: "h4 ! On attaque g5 pour casser la défense du pion f4." }]
  },
  anglaise: {
    plans: { w: ["Contrôler d5 avec c4 et Cc3.", "Fianchetto Fg2 sur la grande diagonale.", "Jouer d3, puis attaquer à l'aile dame avec a3 et b4."], b: ["Occuper le centre avec ...e5 et ...d5.", "Développer vite et roquer.", "Le jeu ressemble à une sicilienne inversée."] },
    typical: [{ u: "a2a3", t: "a3 : prépare b4." }, { u: "a1b1", t: "Tb1 : soutient la poussée b4." }, { u: "e8g8", t: "...O-O : roi à l'abri." }, { u: "c8e6", t: "...Fe6 : développement." }],
    situations: [{ t: "La sicilienne inversée", x: "Après 1.c4 e5, les Blancs jouent une sicilienne avec un temps de plus. Les plans sont les mêmes, couleurs inversées." }, { t: "La grande diagonale", x: "Le fou g2 vise b7 et le centre : les Noirs doivent surveiller la diagonale h1-a8." }],
    practice: [{ pre: [], cut: 14, accept: ["d2d3", "a2a3", "a1b1"], x: "Les Noirs préparent le roque. Continue le plan typique de l'Anglaise.", ok: "Bon plan : d3 solidifie, a3 et Tb1 préparent b4." }]
  },
  slave: {
    plans: { w: ["Récupérer le pion c4 avec a4 et e3.", "Contrôler e4 et jouer e4 au bon moment.", "Développer vite le fou f1."], b: ["Défendre d5 avec ...c6 sans enfermer le fou c8.", "Sortir le fou en f5 ou g4 avant ...e6.", "Structure solide, contre-jeu avec ...c5 ou ...e5."] },
    typical: [{ u: "f3e5", t: "Ce5 : vise c4 et f7." }, { u: "d1e2", t: "De2 : prépare e4." }, { u: "b8d7", t: "...Cbd7 : développement." }, { u: "c6c5", t: "...c5 : frappe le centre." }],
    situations: [{ t: "Le fou c8 libre", x: "Contrairement au gambit Dame refusé, le fou c8 sort avant ...e6 : c'est le grand avantage de la Slave." }, { t: "Le pion c4", x: "Après ...dxc4, les Noirs ne gardent pas le pion : ils l'échangent contre du temps pour développer leur fou." }],
    practice: [{ pre: [], cut: 9, accept: ["c8f5", "c8g4"], x: "Les Blancs viennent de jouer a4 pour empêcher ...b5. Développe la pièce qui fait l'intérêt de la Slave.", ok: "Le fou sort avant ...e6 : il ne sera jamais enfermé derrière ses pions." }]
  },
  nimzo: {
    plans: { w: ["Prendre le centre avec e3, Fd3 et Cf3.", "Garder la paire de fous si les Noirs échangent en c3.", "Jouer e4 quand c'est possible."], b: ["Clouer le cavalier c3 pour empêcher e4.", "Échanger en c3 pour abîmer les pions blancs.", "Frapper le centre avec ...d5 et ...c5."] },
    typical: [{ u: "b4c3", t: "...Fxc3 : pions doublés pour les Blancs." }, { u: "c5d4", t: "...cxd4 : ouvre le centre." }, { u: "a2a3", t: "a3 : demande au fou de se décider." }, { u: "d1e2", t: "De2 : prépare Td1 et e4." }],
    situations: [{ t: "Pions doublés contre paire de fous", x: "Après ...Fxc3 bxc3, les Blancs ont des pions doublés mais deux fous. Toute la partie tourne autour de ce déséquilibre." }, { t: "Le contrôle de e4", x: "Le clouage du cavalier c3 empêche e4 : c'est le premier but des Noirs." }],
    practice: [{ pre: [], cut: 7, accept: ["e8g8", "c7c5", "b7b6", "d7d5"], x: "4.e3 : la variante Rubinstein. Continue ton développement.", ok: "Bon coup : roque, ...c5, ...b6 ou ...d5 sont les plans classiques." }]
  },
  pirc: {
    plans: { w: ["Grand centre e4-d4 et développement simple.", "Roquer, puis attaquer avec e5 ou f4.", "Ne pas laisser les Noirs frapper le centre sans réagir."], b: ["Laisser les Blancs prendre le centre pour l'attaquer ensuite.", "Fianchetto ...g6 et ...Fg7.", "Frapper avec ...e5 ou ...c5."] },
    typical: [{ u: "e7e5", t: "...e5 : la frappe centrale." }, { u: "b8d7", t: "...Cbd7 : prépare ...e5." }, { u: "a2a4", t: "a4 : empêche ...b5." }, { u: "f1e1", t: "Te1 : soutient e4." }],
    situations: [{ t: "Une défense hypermoderne", x: "Les Noirs contrôlent le centre à distance avec le fou g7 avant de l'attaquer avec leurs pions." }, { t: "L'attaque autrichienne", x: "Contre 4.f4, les Blancs visent e5 avec leurs pions : les Noirs doivent réagir vite avec ...c5." }],
    practice: [{ pre: [], cut: 11, accept: ["b8d7", "e7e5", "a7a6", "c8g4"], x: "Les Blancs ont roqué. Prépare ta frappe centrale.", ok: "Bien : ...Cbd7 prépare ...e5, et ...Fg4 développe." }]
  },
  petrov: {
    plans: { w: ["Garder l'avantage du trait avec un jeu actif.", "c4 pour chasser le cavalier e4.", "Pression sur la colonne e."], b: ["Copier les Blancs de façon sûre.", "Garder le cavalier en e4 actif le plus longtemps possible.", "Égaliser en échangeant les pièces."] },
    typical: [{ u: "c2c4", t: "c4 : attaque d5." }, { u: "f1e1", t: "Te1 : la colonne e." }, { u: "c8f5", t: "...Ff5 : soutient le cavalier e4." }, { u: "e8g8", t: "...O-O : les Noirs mettent leur roi à l'abri." }],
    situations: [{ t: "Le piège 3...Cxe4 ??", x: "Après 1.e4 e5 2.Cf3 Cf6 3.Cxe5, la copie 3...Cxe4 ?? perd : 4.De2 ! et si 4...Cf6 ??, 5.Cc6+ (échec à la découverte) gagne la dame. Il faut d'abord jouer 3...d6." }, { t: "Une défense très solide", x: "La Petrov est l'arme des joueurs qui veulent annuler les Blancs : la symétrie limite les risques." }],
    practice: [{ base: ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5"], accept: ["d7d6"], x: "Le cavalier blanc vient de prendre en e5. Attention au piège classique !", ok: "...d6 ! On chasse d'abord le cavalier. 3...Cxe4 ?? 4.De2 aurait été une grave erreur.", wrong: { f6e4: "Le piège ! Après 4.De2, ton cavalier e4 est cloué et tu vas perdre du matériel." } }]
  }
});
L_OUV.push(
  opening("gambitroi", "Le gambit du roi", "1.e4 e5 2.f4", "w",
    "L'ouverture des romantiques : les Blancs sacrifient le pion f pour ouvrir la colonne f et prendre l'initiative. Spectaculaire et risqué.",
    ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "g7g5", "h2h4", "g5g4", "f3e5", "g8f6", "d2d4", "d7d6", "e5d3", "f6e4", "c1f4"],
    { 2: "2.f4 : le gambit du roi. Le pion f est offert.", 3: "2...exf4 : les Noirs acceptent.", 4: "3.Cf3 empêche ...Dh4+.", 5: "3...g5 : les Noirs défendent leur pion de plus.", 6: "4.h4 ! On attaque la chaîne de pions.", 8: "5.Ce5 : le gambit Kieseritzky.", 12: "7.Cd3 : le cavalier attaque f4.", 14: "8.Fxf4 : les Blancs récupèrent le pion avec un jeu actif." }),
  opening("anglaise", "La partie anglaise", "1.c4", "w",
    "Une ouverture de flanc : les Blancs contrôlent d5 avec le pion c, puis jouent comme une sicilienne avec un temps de plus.",
    ["c2c4", "e7e5", "b1c3", "g8f6", "g1f3", "b8c6", "g2g3", "d7d5", "c4d5", "f6d5", "f1g2", "d5b6", "e1g1", "f8e7", "d2d3"],
    { 0: "1.c4 : le pion contrôle d5 depuis le côté.", 1: "1...e5 : la sicilienne inversée.", 6: "4.g3 prépare le fianchetto.", 7: "4...d5 : les Noirs prennent le centre.", 10: "6.Fg2 : le fou vise d5 et b7.", 11: "6...Cb6 : le cavalier recule à l'abri.", 13: "7...Fe7 : les Noirs préparent le roque.", 14: "8.d3 : solide. Le plan a3 et b4 suivra." }),
  opening("slave", "La défense slave", "1.d4 d5 2.c4 c6", "b",
    "Une défense très solide contre le gambit Dame : les Noirs tiennent d5 avec le pion c, en gardant libre la diagonale de leur fou c8.",
    ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6", "b1c3", "d5c4", "a2a4", "c8f5", "e2e3", "e7e6", "f1c4", "f8b4", "e1g1", "e8g8"],
    { 3: "2...c6 : la Slave. Le pion c soutient d5.", 7: "4...dxc4 : les Noirs prennent le pion c4.", 8: "5.a4 empêche ...b5, qui garderait le pion.", 9: "5...Ff5 : le fou sort AVANT ...e6.", 11: "6...e6 : la structure est complète.", 13: "7...Fb4 : cloue le cavalier c3.", 15: "8...O-O : position classique et équilibrée." }),
  opening("nimzo", "La défense nimzo-indienne", "1.d4 Cf6 2.c4 e6 3.Cc3 Fb4", "b",
    "La défense de Nimzowitsch : le fou cloue le cavalier c3 pour contrôler e4. Une des défenses les plus respectées au plus haut niveau.",
    ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4", "e2e3", "e8g8", "f1d3", "d7d5", "g1f3", "c7c5", "e1g1", "d5c4", "d3c4", "b8c6"],
    { 5: "3...Fb4 : la Nimzo-indienne. Le cavalier c3 est cloué.", 6: "4.e3 : la variante Rubinstein, solide.", 7: "4...O-O : roque rapide.", 9: "5...d5 : les Noirs prennent leur part du centre.", 11: "6...c5 : pression sur d4.", 13: "7...dxc4 : les Noirs échangent au centre.", 15: "8...Cc6 : toutes les pièces noires visent le centre." }),
  opening("pirc", "La défense Pirc", "1.e4 d6 2.d4 Cf6 3.Cc3 g6", "b",
    "Une défense hypermoderne : les Noirs laissent les Blancs bâtir un grand centre pour mieux l'attaquer avec ...e5 ou ...c5.",
    ["e2e4", "d7d6", "d2d4", "g8f6", "b1c3", "g7g6", "g1f3", "f8g7", "f1e2", "e8g8", "e1g1", "c7c6"],
    { 1: "1...d6 : la Pirc. Les Noirs préparent ...Cf6.", 3: "2...Cf6 attaque e4.", 5: "3...g6 prépare le fianchetto.", 6: "4.Cf3 : la variante classique.", 7: "4...Fg7 : le fou contrôle le centre à distance.", 9: "5...O-O : roi à l'abri.", 11: "6...c6 : prépare ...b5 ou ...Dc7 et ...e5." }),
  opening("petrov", "La défense Petrov", "1.e4 e5 2.Cf3 Cf6", "b",
    "La défense russe : au lieu de défendre e5, les Noirs contre-attaquent e4. Très solide, avec un piège célèbre à connaître.",
    ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "d7d6", "e5f3", "f6e4", "d2d4", "d6d5", "f1d3", "b8c6", "e1g1", "f8e7"],
    { 3: "2...Cf6 : la Petrov. Les Noirs attaquent e4 au lieu de défendre e5.", 4: "3.Cxe5 : les Blancs prennent.", 5: "3...d6 ! D'abord chasser le cavalier. 3...Cxe4 ?? serait une erreur.", 7: "4...Cxe4 : maintenant les Noirs récupèrent le pion.", 9: "5...d5 : le cavalier e4 est soutenu.", 11: "6...Cc6 : développement.", 13: "7...Fe7 : les Noirs préparent le roque. Position symétrique et solide." })
);

// --- Positions tirées de parties, ajoutées à la fin des leçons de tactique ---
const REAL_GAMES = { fourchette: "fork", clouage: "pin", decouverte: "discovered", enprise: "capture" };
function realSteps(theme, n) {
  if (typeof MINED === "undefined") return [];
  const has = m => theme === "pin" ? m.tags.includes("pin") || m.tags.includes("skewer") : m.tags.includes(theme);
  return MINED.filter(m => has(m) && !m.tags.includes("mate")).sort((a, b) => a.line.length - b.line.length).slice(0, n).map((m, i) => ({
    k: "line", fen: m.fen, side: m.fen.split(" ")[1], moves: m.line, title: `En partie ${i + 1}`,
    x: `Position tirée d'une vraie partie. ${m.fen.split(" ")[1] === "w" ? "Les Blancs" : "Les Noirs"} jouent : trouve le coup qui gagne du matériel${m.line.length > 1 ? ", puis termine le travail" : ""}.`,
    done: "Bien vu ! Tu as reconnu le motif dans une vraie position."
  }));
}

// --- Application : intégration des nouvelles leçons et enrichissements ---
L_DEBUT.push(...NEW_DEBUT);
L_INTER.push(...NEW_INTER);
L_AVANCE.splice(2, 0, NEW_AVANCE[0]);
L_AVANCE.push(...NEW_AVANCE.slice(1));
L_EXPERT.push(...NEW_EXPERT);
for (const p of PATHS) p.intro = PATH_INTRO[p.id];
PATHS.find(p => p.id === "ouvertures").d = `Les ${L_OUV.length} ouvertures et pièges essentiels`;
for (const p of PATHS) for (const l of p.lessons) {
  const e = ENRICH[l.id];
  if (!e) continue;
  if (e.intro) l.intro = e.intro;
  if (e.goals) l.goals = e.goals;
  if (e.recap) l.recap = e.recap;
  if (e.keys) for (const [i, k] of Object.entries(e.keys)) if (l.steps[+i]) l.steps[+i].key = k;
  if (e.add) for (const a of e.add.slice().sort((x, y) => y.at - x.at)) l.steps.splice(a.at, 0, a.step);
}
// Ouvertures : objectifs et bilan générés depuis la fiche
for (const l of L_OUV) {
  const sh = SHEETS[l.id];
  if (!l.goals) l.goals = [`Jouer les ${l.steps[1].moves.length} premiers demi-coups de mémoire`, "Comprendre les plans des deux camps", "Reconnaître les coups typiques et les pièges"];
  if (!l.recap && sh) l.recap = [...sh.plans[l.side].slice(0, 2), sh.situations[0].t + " : " + sh.situations[0].x.split(". ")[0] + "."];
  if (!l.intro) l.intro = l.steps[0].x;
}
for (const [id, th] of Object.entries(REAL_GAMES)) { const l = L_INTER.find(x => x.id === id); if (l) l.steps.push(...realSteps(th, 2)); }
const LESSONS = PATHS.flatMap(p => p.lessons);
