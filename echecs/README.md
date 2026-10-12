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
- **Jouer** : une partie contre l'ordinateur sur 5 niveaux (de Débutant à Maître), avec un coach en temps réel.
  - Avant ton coup, il explique le coup adverse, montre en rouge la menace adverse (fourchette, mat…) et chiffre ce que tu perdrais si tu l'ignorais.
  - Quand tu prends une pièce, ses cases d'arrivée sont colorées selon la qualité du coup.
  - Après ton coup, il donne un verdict justifié : la réponse adverse, la suite probable, le bilan matériel et le meilleur coup.
  - Sur une erreur, la partie se met en pause et tu peux reprendre ton coup.
- **Coordonnées** : un entraînement chronométré de 30 secondes.

Il y a aussi des sons, l'animation des pièces, une barre d'évaluation et des points gagnés. La progression est enregistrée dans le navigateur (`localStorage`).

## Organisation du code

Les sources sont dans `src/`. `python3 build.py` les assemble en `index.html`.

| Fichier | Rôle |
|---|---|
| `src/rules.js` | Règles du jeu (classe `Chess`), validées par perft, plus un petit solveur de mats |
| `src/search.js` | Moteur de recherche : représentation 0x88, tables de transposition, PVS, coup nul, réductions des coups tardifs, quiescence avec parades aux échecs. Il tourne dans un Web Worker |
| `src/content.js`, `src/lessons-extra.js` | Leçons, fiches d'ouverture, problèmes classiques |
| `src/puzzles-data.js` | Problèmes tirés de parties (fichier généré) |
| `src/app.js` | Interface : échiquier, leçons, exercices, coach, coordonnées |
| `src/styles.css`, `src/pieces.css`, `src/body.html` | Présentation |

## Vérifications

```sh
node tests/engine.test.js        # perft de référence, vitesse, tactiques (fourchettes, mats)
node tests/coach.test.js         # le coach repère un coup qui permet une fourchette
node tools/check-content.js      # légalité de chaque position et de chaque coup des leçons, mats, pats, finales
```

Les problèmes « tirés de parties » sont produits en trois étapes :

1. `tools/mine2.js` fait jouer le moteur contre lui-même en injectant des erreurs plausibles.
2. `tools/verify-puzzles.js` analyse chaque position en profondeur et ne garde que celles où un seul coup gagne, à chaque étape de la solution.
3. `tools/build-puzzles.js` génère `src/puzzles-data.js`.

## Crédits

Les pièces viennent du jeu « cburnett » de Colin M. L. Burnett (licence GPLv2+), celui qu'utilisent Lichess et Wikipédia.
