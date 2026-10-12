# L'École des Échecs

Une application pour apprendre les échecs, en français, contenue dans un seul fichier : `echecs/index.html`. Il suffit de l'ouvrir dans un navigateur, sans installation ni serveur.

## Ce qu'elle propose

- **Leçons**, réparties en 5 parcours au choix (43 leçons) :
  - **Débutant** : les règles, pièce par pièce, avec des parcours d'étoiles. On y voit aussi l'échec, le roque, la prise en passant, la promotion, le mat et le pat.
  - **Intermédiaire** : fourchette, clouage, enfilade, attaque à la découverte, pièces en prise, batterie dame-fou.
  - **Avancé** : règle du carré, opposition, percée, structure de pions, pièces actives. Les finales roi + pion se jouent contre l'ordinateur et sont vérifiées par une base de données exacte.
  - **Expert** : mats de Boden, d'Anastasie, étouffé de Philidor, la partie de l'Opéra (Morphy, 1858), le double échec de Réti (1910).
  - **Ouvertures** : italienne, espagnole, écossaise, gambit Dame, Londres, sicilienne, française, Caro-Kann, scandinave, est-indienne, mat de Légal, défense contre le coup du berger. Chaque ouverture se joue d'abord guidée, puis de mémoire.
- **Exercices** : 14 problèmes classiques (mats en 1 et en 2, fourchettes, enfilade, clouage, finales roi + dame et roi + tour).
- **Jouer** : une partie contre l'ordinateur sur 4 niveaux, avec un coach qui commente chacun de tes coups. Tu as aussi des indices, une barre de balance, la reprise de coup et un historique en notation française.
- **Coordonnées** : un entraînement chronométré de 30 secondes.

La progression est enregistrée dans le navigateur (`localStorage`).

## Technique

Le moteur d'échecs est écrit à la main en JavaScript : génération de coups vérifiée par perft, et recherche alpha-bêta avec quiescence. La finale roi + pion contre roi s'appuie sur une base exacte calculée dans le navigateur par analyse rétrograde. Toutes les positions des leçons et des exercices ont été vérifiées automatiquement : légalité, mats forcés sans solution plus courte, finales gagnantes.

Les pièces viennent du jeu « cburnett » de Colin M. L. Burnett (licence GPLv2+), celui qu'utilisent Lichess et Wikipédia.
