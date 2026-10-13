#!/usr/bin/env python3
"""Sélectionne des problèmes dans la base de puzzles de Lichess (licence CC0).

La base : https://database.lichess.org/lichess_db_puzzle.csv.zst
Colonnes : PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags

On garde des problèmes populaires, joués souvent et au classement fiable, répartis
par tranches de 100 points de classement. Dans chaque tranche, on alterne les motifs
(mat étouffé, fourchette, clouage, déviation, finale de tours...) pour varier.

Usage : python3 -I tools/import-lichess.py lichess_db_puzzle.csv.zst sortie.csv [--per-band=170]
La sortie est vérifiée puis convertie par tools/build-lichess.js.
"""
import csv, heapq, io, math, sys, zlib

import zstandard

# Motifs, du plus rare au plus courant : un problème est rangé sous le premier de ses thèmes qui figure ici
MOTIFS = [
    "underPromotion", "enPassant", "castling", "doubleBishopMate", "dovetailMate", "hookMate", "bodenMate",
    "anastasiaMate", "arabianMate", "smotheredMate", "killBoxMate", "vukovicMate", "cornerMate", "balestraMate",
    "blindSwineMate", "morphysMate", "operaMate", "pillsburysMate", "triangleMate", "epauletteMate", "swallowstailMate",
    "zugzwang", "interference", "doubleCheck", "xRayAttack", "intermezzo", "clearance", "capturingDefender",
    "attraction", "trappedPiece", "quietMove", "defensiveMove", "skewer", "discoveredAttack", "backRankMate",
    "deflection", "promotion", "pin", "sacrifice", "fork", "mateIn5", "mateIn4", "mateIn3", "mateIn2", "mateIn1",
    "pawnEndgame", "rookEndgame", "queenEndgame", "knightEndgame", "bishopEndgame", "queenRookEndgame",
    "advancedPawn", "attackingF2F7", "exposedKing", "kingsideAttack", "queensideAttack", "hangingPiece",
]
RANK = {m: i for i, m in enumerate(MOTIFS)}
LO, HI, STEP = 400, 3100, 100
KEEP = 60  # candidats gardés par (tranche, motif)


def motif(themes):
    best = None
    for t in themes:
        if t in RANK and (best is None or RANK[t] < RANK[best]):
            best = t
    return best or "other"


def main():
    src, out = sys.argv[1], sys.argv[2]
    per_band = next((int(a.split("=")[1]) for a in sys.argv[3:] if a.startswith("--per-band=")), 170)
    heaps = {}
    n = 0
    with open(src, "rb") as fh:
        reader = zstandard.ZstdDecompressor().stream_reader(fh)
        rows = csv.reader(io.TextIOWrapper(reader, encoding="utf-8"))
        header = next(rows)
        col = {name: i for i, name in enumerate(header)}
        for row in rows:
            n += 1
            rating, rd = int(row[col["Rating"]]), int(row[col["RatingDeviation"]])
            pop, plays = int(row[col["Popularity"]]), int(row[col["NbPlays"]])
            if rating < LO or rating >= HI or rd > 100 or pop < 80:
                continue
            # Les problèmes très difficiles sont moins joués : on assouplit le seuil
            if plays < (1000 if rating < 2400 else 300):
                continue
            themes = row[col["Themes"]].split()
            band = (rating - LO) // STEP
            key = (band, motif(themes))
            # Qualité : popularité, nombre de parties, puis un tirage stable pour varier
            q = (pop + 4 * math.log10(plays), zlib.crc32(row[0].encode()))
            item = (q, row[col["PuzzleId"]], row[col["FEN"]], row[col["Moves"]], rating, rd, " ".join(themes))
            h = heaps.setdefault(key, [])
            if len(h) < KEEP:
                heapq.heappush(h, item)
            elif item > h[0]:
                heapq.heapreplace(h, item)
    # Dans chaque tranche, on prend les motifs à tour de rôle
    picked = []
    for band in range((HI - LO) // STEP):
        groups = sorted(((k[1], sorted(h, reverse=True)) for k, h in heaps.items() if k[0] == band), key=lambda g: RANK.get(g[0], 99))
        take, i = [], 0
        while len(take) < per_band and any(i < len(g) for _, g in groups):
            for _, g in groups:
                if i < len(g) and len(take) < per_band:
                    take.append(g[i])
            i += 1
        picked += take
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["id", "fen", "moves", "rating", "rd", "themes"])
        for _, pid, fen, moves, rating, rd, themes in picked:
            w.writerow([pid, fen, moves, rating, rd, themes])
    print(f"{n} problèmes lus, {len(picked)} retenus", file=sys.stderr)


if __name__ == "__main__":
    main()
