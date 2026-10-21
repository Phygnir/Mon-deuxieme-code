# Cap Muscu

Programme de musculation sur mesure : bloc de 12 semaines (intro, accumulation, décharge, intensification, affûtage, test), charges calculées sur ton 1RM estimé et ton RPE, un objectif à battre à chaque séance, séance guidée avec chrono de repos et schéma animé pour chaque exercice. Tout tient dans `index.html`, sans serveur ni compte : les données restent sur l'appareil.

Sources : Eric Helms, *The Muscle & Strength Pyramid: Training* (2e éd.) ; Arnold Schwarzenegger, *The New Encyclopedia of Modern Bodybuilding*.

## Installer sur téléphone

Adresse : `https://phygnir.github.io/Mon-deuxieme-code/muscu/`

- **iPhone** : ouvre l'adresse dans **Safari** → bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
- **Android** : ouvre l'adresse dans **Chrome** → menu **⋮** → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).

L'appli s'ouvre alors en plein écran et fonctionne hors connexion.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | L'appli complète (code, styles, polices intégrées) |
| `manifest.webmanifest` | Nom et icônes pour l'écran d'accueil |
| `sw.js` | Mode hors connexion |
| `icons/` | Icônes de l'appli |

## Mettre à jour

Remplace `index.html`, puis change `VERSION` dans `sw.js` (par exemple `cap-muscu-v2`). Le téléphone récupère la nouvelle version à la prochaine ouverture avec du réseau, et l'affiche à l'ouverture suivante.

## Sauvegarder ses données

Profil → **Copier la sauvegarde**, à coller dans Notes. **Restaurer** recharge une sauvegarde, par exemple sur un nouveau téléphone.
