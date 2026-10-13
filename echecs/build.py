#!/usr/bin/env python3
"""Assemble les sources de src/ en un seul fichier index.html (aucune dépendance)."""
import pathlib
S = pathlib.Path(__file__).parent / "src"
r = lambda n: (S / n).read_text()
JS = ["rules.js", "search.js", "content.js", "puzzles-data.js", "puzzles-lichess.js", "lessons-extra.js", "app.js", "pgn.js", "analysis.js", "review.js", "daily.js", "repertoire.js", "vision.js", "start.js"]
js = "\n".join(r(n) for n in JS if (S / n).exists())
page = (
    '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    "<!--ARTIFACT-START-->\n" + r("head.html") + "<style>\n" + r("styles.css") + r("pieces.css") + "</style>\n"
    + r("body.html") + '<script>\n"use strict";\n/*ENGINE-START*/\n' + js.replace("/*RULES-END*/", "/*ENGINE-END*/", 1)
    + "</script>\n<!--ARTIFACT-END-->\n</html>\n"
)
(S.parent / "index.html").write_text(page)
print("index.html", len(page), "octets")

# Version site web (GitHub Pages, Netlify...) : icône d'écran d'accueil et manifeste en plus
SITE = S.parent / "site"
SITE.mkdir(exist_ok=True)
pwa = (
    '<meta name="apple-mobile-web-app-capable" content="yes">\n'
    '<meta name="mobile-web-app-capable" content="yes">\n'
    '<meta name="apple-mobile-web-app-title" content="Échecs">\n'
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
    '<meta name="theme-color" content="#e9ede6">\n'
    '<link rel="apple-touch-icon" href="icon-180.png">\n'
    '<link rel="icon" type="image/png" href="icon-192.png">\n'
    '<link rel="manifest" href="manifest.webmanifest">\n'
)
(SITE / "index.html").write_text(page.replace("<!--ARTIFACT-START-->\n", "<!--ARTIFACT-START-->\n" + pwa, 1))
(SITE / "manifest.webmanifest").write_text(
    '{\n  "name": "L\'École des Échecs",\n  "short_name": "Échecs",\n  "lang": "fr",\n  "start_url": "./",\n  "display": "standalone",\n'
    '  "background_color": "#e9ede6",\n  "theme_color": "#e9ede6",\n'
    '  "icons": [\n    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },\n    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }\n  ]\n}\n')
(SITE / ".nojekyll").write_text("")
print("site/index.html prêt")
