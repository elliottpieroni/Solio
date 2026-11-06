# Terrasses au soleil (PWA)

Application installable : plein écran, hors ligne, géolocalisation « Autour de moi ».
Elle doit être servie en **HTTPS** (obligatoire pour l'installation, le mode hors ligne et la localisation).

## Mettre en ligne (gratuit, 2 minutes)
- **Netlify Drop** : ouvrir app.netlify.com/drop et glisser le dossier décompressé. Un lien https:// est créé.
- **GitHub Pages** : créer un dépôt, y déposer tous les fichiers à la racine, puis Settings > Pages > Deploy from a branch.
- **Cloudflare Pages / Vercel** : importer le dossier, aucune commande de build.

## Installer sur iPhone
1. Ouvrir le lien https:// dans **Safari**.
2. Bouton Partager > **Sur l'écran d'accueil** > Ajouter.
3. Lancer « Terrasses » depuis l'icône. Au premier lancement, attendre la fin de l'intro : tout est alors mis en cache pour le hors ligne.

## Contenu
index.html, style.css, app.js : l'app. data.js : relief LiDAR IGN, plan et établissements (2,8 Mo).
thumbs/ : photos aériennes IGN. sw.js : cache hors ligne. manifest.webmanifest et icons/ : installation.
Pour publier une mise à jour, changer le nom de cache `terrasses-v1` dans sw.js.

Zone couverte : centre d'Antibes. Hors zone, choisir un point de départ dans la liste.
