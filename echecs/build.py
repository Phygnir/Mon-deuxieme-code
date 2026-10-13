#!/usr/bin/env python3
"""Assemble les sources de src/ en un seul fichier index.html (aucune dépendance)."""
import pathlib
S = pathlib.Path(__file__).parent / "src"
r = lambda n: (S / n).read_text()
JS = ["rules.js", "search.js", "content.js", "puzzles-data.js", "puzzles-lichess.js", "lessons-extra.js", "app.js", "analysis.js", "review.js", "start.js"]
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
