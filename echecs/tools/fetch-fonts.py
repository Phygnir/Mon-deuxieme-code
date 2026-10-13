#!/usr/bin/env python3
"""Télécharge les polices Google Fonts de l'application et les intègre dans src/fonts.css (base64),
pour que l'apparence soit identique hors connexion. Seuls les jeux de caractères latins sont gardés.
Usage : python3 tools/fetch-fonts.py"""
import base64, pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
head = (ROOT / "src" / "head.html").read_text()
url = re.search(r'href="(https://fonts\.googleapis\.com/css2[^"]+)"', head).group(1).replace("&amp;", "&")
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA})).read()
css = get(url).decode()
blocks = re.findall(r"/\* ([\w-]+) \*/\s*(@font-face \{.*?\})", css, re.S)
cache, out = {}, []
for subset, block in blocks:
    if subset not in ("latin", "latin-ext"):
        continue
    src = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
    if src not in cache:
        cache[src] = "data:font/woff2;base64," + base64.b64encode(get(src)).decode()
    out.append(f"/* {subset} */\n" + block.replace(src, cache[src]))
(ROOT / "src" / "fonts.css").write_text(
    "/* Polices intégrées (licence SIL Open Font License) : Bricolage Grotesque, Atkinson Hyperlegible, JetBrains Mono.\n"
    "   Fichier généré par tools/fetch-fonts.py. */\n" + "\n".join(out) + "\n")
size = sum(len(v) for v in cache.values())
print(f"{len(out)} @font-face, {len(cache)} fichiers, {size // 1024} Ko en base64")
