# L'École des Échecs

Une application pour apprendre les échecs, en français, contenue dans un seul fichier : `echecs/index.html`. Il suffit de l'ouvrir dans un navigateur, sans installation ni serveur.

## Ce qu'elle propose

- **Leçons**, réparties en 5 parcours au choix (43 leçons) :
  - **Débutant** : les règles, pièce par pièce, avec des parcours d'étoiles. On y voit aussi l'échec, le roque, la prise en passant, la promotion, le mat et le pat.
  - **Intermédiaire** : fourchette, clouage, enfilade, attaque à la découverte, pièces en prise, batterie dame-fou.
  - **Avancé** : règle du carré, opposition, percée, structure de pions, pièces actives. Les finales roi + pion se jouent contre l'ordinateur et sont vérifiées par une base de données exacte.
  - **Expert** : mats de Boden, d'Anastasie, étouffé de Philidor, la partie de l'Opéra (Morphy, 1858), le double échec de Réti (1910).
  - **Ouvertures** : italienne, espagnole, écossaise, gambit Dame, Londres, sicilienne, française, Caro-Kann, scandinave, est-indienne, mat de Légal, défense contre le coup du berger. Chaque ouverture comprend la ligne jouée guidée, une fiche (plans des deux camps, coups typiques montrés sur l'échiquier, situations et pièges courants), deux exercices « trouve le coup typique », puis la ligne de mémoire.
- **Exercices** : 14 problèmes classiques (mats en 1 et en 2, fourchettes, enfilade, clouage, finales roi + dame et roi + tour).
- **Jouer** : une partie contre l'ordinateur (4 niveaux) avec un coach en temps réel :
  - avant ton coup, il explique le coup adverse, signale tes pièces menacées et les menaces de mat, et donne le coup de théorie si vous êtes dans une ouverture connue ;
  - quand tu prends une pièce, ses cases d'arrivée sont colorées selon la qualité du coup (excellent, bon, imprécis, gaffe) ;
  - après ton coup, il donne un verdict avec les raisons (développement, centre, roque, fourchette, pièce en prise, menace ignorée…) et le meilleur coup ;
  - sur une gaffe, la partie se met en pause avec la réfutation en rouge et le bon coup en vert, et tu peux reprendre ton coup.
- **Coordonnées** : un entraînement chronométré de 30 secondes.

La progression est enregistrée dans le navigateur (`localStorage`).

## Technique

Le moteur d'échecs est écrit à la main en JavaScript : génération de coups vérifiée par perft, et recherche alpha-bêta avec quiescence. La finale roi + pion contre roi s'appuie sur une base exacte calculée dans le navigateur par analyse rétrograde. Toutes les positions des leçons et des exercices ont été vérifiées automatiquement : légalité, mats forcés sans solution plus courte, finales gagnantes.

Les pièces viennent du jeu « cburnett » de Colin M. L. Burnett (licence GPLv2+), celui qu'utilisent Lichess et Wikipédia.
