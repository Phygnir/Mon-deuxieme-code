# L'École des Échecs

Une application pour apprendre les échecs, en français. Tout tient dans un seul fichier, `echecs/index.html` : il suffit de l'ouvrir dans un navigateur, sans installation ni serveur.

## Ce qu'elle propose

- **Leçons** : 61 leçons réparties en 5 parcours au choix. Chaque leçon commence par une présentation avec ses objectifs. Les étapes mêlent explications illustrées (flèches, cases marquées, encadrés « À retenir »), quiz, exercices sur l'échiquier et finales jouées contre l'ordinateur. Un bilan conclut chaque leçon.
  - **Débutant** (18) : les règles, la notation, les parties nulles, le mat avec la dame et avec la tour.
  - **Intermédiaire** (8) : fourchette, clouage, enfilade, découverte, pièces en prise, batterie, compter les échanges, mat du couloir. Chaque leçon de tactique se termine par des positions tirées de vraies parties.
  - **Avancé** (9) : règle du carré, opposition, roi actif, percée, structure de pions, pièces actives, finales de Lucena et de Philidor, bon et mauvais fou.
  - **Expert** (8) : Boden, Anastasie, Philidor, l'Opéra de Morphy, le double échec de Réti, l'Immortelle et la Toujours Jeune d'Anderssen.
  - **Ouvertures** (18) : italienne, espagnole, écossaise, gambit Dame, Londres, gambit du roi, anglaise, sicilienne, française, Caro-Kann, scandinave, est-indienne, slave, nimzo-indienne, Pirc, Petrov, mat de Légal, défense contre le coup du berger. Pour chacune, on trouve la ligne jouée guidée puis de mémoire, une fiche (plans, coups typiques, pièges) et des exercices.
- **Exercices** : 120 problèmes tirés de parties, classés par thème (pièces en prise, fourchettes, clouages, découvertes, sacrifices, mats, promotion), avec un mode « série tactique ». S'y ajoutent les 14 problèmes classiques. Sur une mauvaise réponse, le coach explique pourquoi le coup échoue.
- **Problèmes** : un entraînement inspiré des puzzles de Lichess.
  - **Entraînement** classé : ton classement évolue après chaque problème selon la méthode Glicko-2, comme sur Lichess. Un « ? » signale un classement encore provisoire. On te propose des problèmes jamais vus, proches de ton niveau. Cinq niveaux de difficulté sont possibles, du plus facile (−600) au plus difficile (+600), et un filtre par thème (motifs, mats, phases de jeu, longueur).
  - **Série** : des problèmes de plus en plus difficiles, jusqu'à la première erreur.
  - **Tempête** : 3 minutes pour en résoudre un maximum, avec un combo qui rapporte du temps et des erreurs qui en coûtent.
  - Après chaque problème, le coach explique la solution coup par coup (sacrifice, fourchette, coup calme, bilan matériel). Sur une erreur, le moteur montre la réponse adverse qui la réfute.
  - Un tableau de bord montre ta courbe de classement, ta réussite par thème et tes records.
- **Jouer** : une partie contre l'ordinateur sur 5 niveaux (de Débutant à Maître), avec un coach en temps réel.
  - Avant ton coup, il explique le coup adverse, montre en rouge la menace adverse (fourchette, mat…) et chiffre ce que tu perdrais si tu l'ignorais.
  - Quand tu prends une pièce, ses cases d'arrivée sont colorées selon la qualité du coup.
  - Après ton coup, il donne un verdict justifié : la réponse adverse, la suite probable, le bilan matériel et le meilleur coup.
  - Sur une erreur, la partie se met en pause et tu peux reprendre ton coup.
- **Plan du jour** : trois objectifs par jour, en tête des leçons : la révision du jour, 5 problèmes classés, une leçon ou une partie. Une série de jours d'affilée récompense la régularité.
- **Sauvegarde** : un fichier .json garde toute la progression, pour la mettre à l'abri ou la reprendre sur un autre appareil (boutons « Sauvegarder » et « Restaurer » dans l'onglet Leçons).
- **Révision espacée** : ce que tu rates revient le lendemain, puis après 3, 7, 14 et 30 jours si tu le réussis. Une erreur le renvoie au début, et après cinq réussites il est acquis. On y retrouve les problèmes et exercices ratés, les moments clés de tes parties et les ouvertures apprises. Une carte « À réviser aujourd'hui » apparaît en tête des leçons et des exercices.
- **Analyse** : un onglet pour revoir tes parties.
  - **Import par pseudo** : tape ton pseudo Lichess ou Chess.com et choisis une de tes 20 dernières parties, via les API publiques des deux sites. On peut aussi coller un PGN ou choisir un fichier .pgn (notation anglaise ou française). Si la page ne peut pas joindre le site, elle le dit et propose le copier-coller.
  - **Analyse de partie** : le moteur revoit chaque position. On obtient une courbe d'évaluation, la précision de chaque camp et le décompte des imprécisions, erreurs et gaffes, classées selon la perte de chances de gain, comme sur Lichess. On a aussi un commentaire sur chaque coup (la réfutation, ce qu'il fallait jouer) et tes moments clés, que tu peux rejouer.
  - **Bilan** : ta précision moyenne, son évolution et la part de tes erreurs par phase de jeu (ouverture, milieu, finale). Les 20 dernières parties sont gardées.
- **Vision** : trois entraînements chronométrés. **Coordonnées** : cliquer la case affichée. **Couleur des cases** : dire si une case est claire ou foncée, l'échiquier voilé. **Cases attaquées** : cliquer toutes les cases qu'attaque une pièce.
- **Mon répertoire d'ouvertures** (dans Exercices) : tu choisis tes ouvertures avec les Blancs et avec les Noirs, puis tu les rejoues de mémoire face à l'entraîneur. Parfois, l'adversaire sort de la théorie avec un coup plausible choisi par le moteur, et il faut trouver soi-même un coup sain. Trois lignes sans faute d'affilée, et l'ouverture est maîtrisée. Une erreur renvoie la ligne en révision.
- **Jouer une position** : depuis un problème ou une analyse, un bouton lance une partie contre l'ordinateur, avec le coach, à partir de la position affichée. On peut aussi continuer une ligne du répertoire.

Il y a aussi des sons, l'animation des pièces, une barre d'évaluation et des points gagnés. La progression est enregistrée dans le navigateur (`localStorage`).

## Organisation du code

Les sources sont dans `src/`. `python3 build.py` les assemble en `index.html`.

| Fichier | Rôle |
|---|---|
| `src/rules.js` | Règles du jeu (classe `Chess`), validées par perft, plus un petit solveur de mats |
| `src/search.js` | Moteur de recherche : représentation 0x88, tables de transposition, PVS, coup nul, réductions des coups tardifs, quiescence avec parades aux échecs. Il tourne dans un Web Worker |
| `src/content.js`, `src/lessons-extra.js` | Leçons, fiches d'ouverture, problèmes classiques |
| `src/puzzles-data.js` | Problèmes tirés de parties (fichier généré) |
| `src/puzzles-lichess.js` | Problèmes de la base Lichess (fichier généré, facultatif) |
| `src/app.js` | Interface : échiquier, leçons, exercices, coach, coordonnées |
| `src/pgn.js` | Lecture des parties PGN |
| `src/analysis.js` | Analyse de partie : évaluations, précision, moments clés |
| `src/review.js` | Révision espacée |
| `src/repertoire.js` | Répertoire d'ouvertures |
| `src/vision.js` | Entraînements de vision |
| `src/daily.js` | Plan du jour, série de jours, sauvegarde de la progression |
| `src/styles.css`, `src/pieces.css`, `src/body.html` | Présentation |

## Vérifications

```sh
node tests/engine.test.js        # perft de référence, vitesse, tactiques (fourchettes, mats)
node tests/coach.test.js         # le coach repère un coup qui permet une fourchette
node tools/check-content.js      # légalité de chaque position et de chaque coup des leçons, mats, pats, finales
node tests/glicko.test.js        # classement Glicko-2 des problèmes
node tests/pgn.test.js           # lecture des parties PGN (Lichess, notation française, promotions, roques)
```

### Problèmes de Lichess

L'onglet Problèmes utilise la base de puzzles de Lichess (domaine public, CC0) quand `src/puzzles-lichess.js` existe. Ces problèmes ont de vrais classements, calculés à partir de millions de tentatives. Sinon, il utilise les problèmes tirés de parties.

```sh
curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
python3 -I tools/import-lichess.py lichess_db_puzzle.csv.zst selection.csv   # tranches de 100 points, motifs variés
node tools/build-lichess.js selection.csv                                    # vérifie chaque coup, écrit src/puzzles-lichess.js
python3 build.py
```

`import-lichess.py` ne garde que des problèmes populaires, souvent joués et au classement fiable. Il retient environ 170 problèmes par tranche de 100 points, de 400 à 3 100, en prenant les motifs à tour de rôle.

Les problèmes « tirés de parties » sont produits en trois étapes :

1. `tools/mine2.js` fait jouer le moteur contre lui-même en injectant des erreurs plausibles.
2. `tools/verify-puzzles.js` analyse chaque position en profondeur et ne garde que celles où un seul coup gagne, à chaque étape de la solution.
3. `tools/rate-puzzles.js` estime la difficulté de chaque problème. Il mesure la profondeur à laquelle le moteur trouve la solution, puis ajoute des points pour les leurres (autres prises ou échecs), les coups calmes, la longueur et le motif.
4. `tools/build-puzzles.js` génère `src/puzzles-data.js` : il répartit les classements par rang entre 600 et 2 100.

Ces classements sont des estimations : contrairement à ceux de Lichess, ils ne viennent pas des résultats de vrais joueurs.

## Crédits

Les problèmes de l'onglet Problèmes (4 511, classés de 400 à 3 100) viennent de la [base de puzzles de Lichess](https://database.lichess.org/#puzzles) (CC0). Les pièces viennent du jeu « cburnett » de Colin M. L. Burnett (licence GPLv2+), celui qu'utilisent Lichess et Wikipédia.
