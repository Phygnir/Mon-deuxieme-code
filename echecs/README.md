# L'École des Échecs

Une application pour apprendre les échecs, en français, contenue dans un seul fichier : `echecs/index.html`. Il suffit de l'ouvrir dans un navigateur, sans installation ni serveur.

## Ce qu'elle propose

- **Leçons** : 14 leçons interactives, de l'échiquier jusqu'aux principes d'ouverture. On y trouve chaque pièce avec des parcours d'étoiles, la capture, l'échec, le roque, la prise en passant, la promotion, le mat et le pat.
- **Exercices** : 14 problèmes classiques : mats en 1 et en 2 (couloir, berger, étouffée, Philidor…), fourchettes, enfilade, clouage, et les finales roi + dame et roi + tour à jouer contre l'ordinateur.
- **Jouer** : une partie contre l'ordinateur sur 4 niveaux. Un coach commente chacun de tes coups (bon coup, imprécision, gaffe, pièce en prise) et indique le meilleur coup. Tu as aussi des indices, une barre de balance, la reprise de coup et un historique en notation française.
- **Coordonnées** : un entraînement chronométré de 30 secondes pour apprendre à lire l'échiquier.

La progression est enregistrée dans le navigateur (`localStorage`).

## Technique

Le moteur d'échecs est écrit à la main en JavaScript : génération de coups complète, vérifiée par perft sur les positions de référence. La recherche utilise alpha-bêta, la quiescence et l'approfondissement itératif. Le fichier n'a aucune dépendance, à part les polices Google Fonts.
