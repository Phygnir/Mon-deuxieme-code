# Cap Calisthénie

Programme de calisthénie sur mesure : bilan de niveau, 10 arbres de skills, cycles de 12 semaines, séances guidées avec chrono et suivi de progression. Tout tient dans `index.html`, sans serveur ni compte : les données restent sur l'appareil.

## Installer sur iPad

1. Ouvre l'adresse GitHub Pages de ce dossier dans **Safari** : `https://<ton-pseudo>.github.io/Mon-deuxieme-code/calisthenie/`.
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.

L'appli s'ouvre alors en plein écran et fonctionne hors connexion.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | L'appli complète (code, styles, polices intégrées) |
| `manifest.webmanifest` | Nom et icônes pour l'écran d'accueil |
| `sw.js` | Mode hors connexion |
| `icons/` | Icônes de l'appli |

## Mettre à jour

Remplace `index.html`, puis change `VERSION` dans `sw.js` (par exemple `cap-cali-v2`). L'iPad récupère la nouvelle version à la prochaine ouverture avec du réseau, et l'affiche à l'ouverture suivante.

## Sauvegarder ses données

Réglages (⚙ sur l'écran Aujourd'hui) → **Copier ma sauvegarde**, à coller dans Notes. **Restaurer** recharge une sauvegarde, par exemple sur un nouvel appareil.
