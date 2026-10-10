"""
ARENA D20 — trilha chiptune e efeitos 8/16 bits, 100% sintetizados (sem direito autoral de terceiros).

Uso:  python3 audio/arena.py remotion/public/arena/episodio-1.sons.json
Saída: remotion/public/arena/episodio-1.wav  (mixagem completa, sincronizada com o vídeo)

- Trilha de batalha: 144 BPM, lá menor harmônico, clima de masmorra (loop); versão intensa no duelo.
- Jingle de vitória, jingle de "level up" no pergaminho e tema calmo da ficha.
- Ambiente: crepitar das tochas, gotas nas poças, eco leve nos golpes.
- Efeitos ~4–6 dB acima da trilha, no máximo 5 simultâneos (prioridade por evento).
"""
import json
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gerar import SR, colocar, estereo, filtro, nota, reverb, rng, tempo  # noqa: E402

BPM = 144
BATIDA = 60 / BPM


# ───────────────────────── osciladores 8 bits ─────────────────────────
def quadrada(f, dur, duty=0.5, vib=0.0, vib_hz=5.5):
    t = tempo(dur)
    fase = np.cumsum(np.full(len(t), f) * (1 + vib * np.sin(2 * np.pi * vib_hz * t)) / SR) if vib else f * t
    return np.where((fase % 1.0) < duty, 1.0, -1.0)


def quadrada_var(freqs, duty=0.5):
    fase = np.cumsum(freqs / SR)
    return np.where((fase % 1.0) < duty, 1.0, -1.0)


def triangulo(f, dur):
    t = tempo(dur)
    return 2 * np.abs(2 * ((f * t) % 1.0) - 1) - 1


def triangulo_var(freqs):
    fase = np.cumsum(freqs / SR)
    return 2 * np.abs(2 * (fase % 1.0) - 1) - 1


def ruido(dur, seed=1, passo=1):
    r = rng(seed)
    n = int(dur * SR)
    if passo <= 1:
        return r.uniform(-1, 1, n)
    base = r.uniform(-1, 1, n // passo + 2)
    return np.repeat(base, passo)[:n]


def env(n, a=0.002, d=0.08, s=0.6, r=0.05, dur=None):
    """ADSR em amostras (durações em segundos)."""
    total = n
    ia, idd, ir = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(total, s)
    e[: min(ia, total)] = np.linspace(0, 1, min(ia, total))
    if ia < total:
        k = min(idd, total - ia)
        e[ia : ia + k] = np.linspace(1, s, k)
    if ir and total > ir:
        e[-ir:] *= np.linspace(1, 0, ir)
    return e


def decai(dur, k):
    return np.exp(-tempo(dur) * k)


def st(x, pan=0.0):
    return estereo(x, pan)


# ───────────────────────── trilha de batalha ─────────────────────────
ACORDES = [  # lá menor harmônico, 8 compassos
    ["A2", "A3", "C4", "E4"],
    ["A2", "A3", "C4", "E4"],
    ["F2", "F3", "A3", "C4"],
    ["G2", "G3", "B3", "D4"],
    ["A2", "A3", "C4", "E4"],
    ["D2", "D3", "F3", "A3"],
    ["E2", "E3", "G#3", "B3"],
    ["E2", "E3", "G#3", "B3"],
]
# melodia (nome, início em colcheias, duração em colcheias) por compasso de 8 colcheias
MELODIA = [
    [("E5", 0, 2), ("C5", 2, 1), ("D5", 3, 1), ("E5", 4, 3), ("A4", 7, 1)],
    [("C5", 0, 2), ("B4", 2, 2), ("A4", 4, 2), ("G#4", 6, 2)],
    [("A4", 0, 2), ("C5", 2, 2), ("F5", 4, 3), ("E5", 7, 1)],
    [("D5", 0, 2), ("B4", 2, 2), ("G4", 4, 4)],
    [("E5", 0, 2), ("A5", 2, 2), ("G#5", 4, 1), ("A5", 5, 1), ("E5", 6, 2)],
    [("F5", 0, 3), ("E5", 3, 1), ("D5", 4, 2), ("A4", 6, 2)],
    [("G#4", 0, 2), ("B4", 2, 2), ("D5", 4, 2), ("F5", 6, 2)],
    [("E5", 0, 6), ("B4", 6, 2)],
]


def bumbo8(vel=1.0):
    d = 0.16
    t = tempo(d)
    f = 140 * np.exp(-t * 28) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * decai(d, 22) * vel


def caixa8(seed, vel=0.6):
    d = 0.14
    return (ruido(d, seed, 3) * 0.8 + quadrada(190, d, 0.5) * 0.25) * decai(d, 26) * vel


def chimbal8(seed, vel=0.25, aberto=False):
    d = 0.12 if aberto else 0.035
    return filtro(ruido(d, seed), lo=6000) * decai(d, 18 if aberto else 90) * vel


def trilha_batalha(dur, intensa=False, seed=0, calma=False):
    n = int(dur * SR)
    buf = np.zeros((2, n + SR))
    colch = BATIDA / 2
    comp = BATIDA * 4
    nb = int(np.ceil(dur / comp)) + 1
    for b in range(nb):
        t0 = b * comp
        if t0 >= dur:
            break
        acorde = ACORDES[b % 8]
        # baixo (triângulo) em colcheias com oitava
        for k in range(8):
            f = nota(acorde[0]) * (2 if (k % 2 and not calma) else 1)
            dd = colch * (0.9 if not calma else 1.9)
            if calma and k % 2:
                continue
            x = triangulo(f, dd) * env(int(dd * SR), d=0.05, s=0.8, r=0.02)
            colocar(buf, st(x * (0.33 if not calma else 0.28)), t0 + k * colch)
        # arpejo (pulso 12,5%) em semicolcheias
        if True:
            semi = colch / 2
            notas = acorde[1:]
            passos = 16 if not calma else 8
            for k in range(passos):
                nn = notas[k % len(notas)] if k % 8 < 4 else notas[(len(notas) - 1 - k) % len(notas)]
                f = nota(nn) * 2
                dd = semi * (0.85 if not calma else 1.7)
                x = quadrada(f, dd, 0.125) * env(int(dd * SR), d=0.04, s=0.4, r=0.01)
                vol = 0.06 if not intensa else 0.075
                colocar(buf, st(x * (vol if not calma else 0.05), 0.35 * (1 if k % 2 else -1)), t0 + k * (semi if not calma else colch))
        # melodia (pulso 25%) com vibrato; na intensa, oitava acima dobrando
        if not calma or b % 2 == 0:
            for nm, ini, du in MELODIA[b % 8]:
                f = nota(nm)
                dd = du * colch * 0.95
                x = quadrada(f, dd, 0.25, vib=0.006 if du >= 2 else 0) * env(int(dd * SR), d=0.1, s=0.7, r=0.04)
                vol = 0.085 if not calma else 0.05
                colocar(buf, st(x * vol, -0.1), t0 + ini * colch)
                if intensa:
                    x2 = quadrada(f * 2, dd, 0.5) * env(int(dd * SR), d=0.1, s=0.5, r=0.04)
                    colocar(buf, st(x2 * 0.035, 0.2), t0 + ini * colch + 0.012)
        if calma:
            continue
        # bateria
        for k in range(8):
            tk = t0 + k * colch
            if k in (0, 4) or (intensa and k in (2, 6)) or (k == 5 and b % 2):
                colocar(buf, st(bumbo8(0.8)), tk)
            if k in (2, 6):
                colocar(buf, st(caixa8(seed + b * 8 + k, 0.35), 0.05), tk)
            colocar(buf, st(chimbal8(seed + b * 13 + k, 0.13 if k % 2 else 0.08, aberto=(intensa and k == 7)), 0.25), tk)
            if intensa:
                colocar(buf, st(chimbal8(seed + b * 17 + k, 0.06), -0.25), tk + colch / 2)
        if intensa and b % 2 == 1:
            # virada de caixa no fim de cada 2 compassos
            for k in range(4):
                colocar(buf, st(caixa8(seed + 900 + b * 4 + k, 0.2 + k * 0.05)), t0 + comp - colch * 2 + k * colch / 2)
    return buf[:, :n]


def fanfarra():
    """Jingle de vitória (lá maior, ~3 s)."""
    seq = [("A4", 0, 1), ("C#5", 1, 1), ("E5", 2, 1), ("A5", 3, 3), ("F#5", 6, 1), ("G#5", 7, 1), ("A5", 8, 1), ("B5", 9, 1), ("C#6", 10, 6)]
    u = 0.12
    dur = 16 * u + 1.2
    buf = np.zeros((2, int(dur * SR)))
    for nm, ini, du in seq:
        dd = du * u * 0.95 + (0.5 if du >= 6 else 0)
        f = nota(nm)
        x = quadrada(f, dd, 0.25, vib=0.008 if du >= 3 else 0) * env(int(dd * SR), d=0.08, s=0.7, r=0.15)
        x2 = quadrada(f * 0.5, dd, 0.5) * env(int(dd * SR), d=0.08, s=0.5, r=0.15)
        colocar(buf, st(x * 0.16, -0.15) + st(x2 * 0.07, 0.15), ini * u)
    for k, nm in enumerate(["A2", "E3", "A2", "E3", "A2", "A2"]):
        colocar(buf, st(triangulo(nota(nm), 0.3) * env(int(0.3 * SR), s=0.8, r=0.05) * 0.3), k * 3 * u)
    for k in range(0, 16, 2):
        colocar(buf, st(bumbo8(0.6)), k * u)
    colocar(buf, st(ruido(0.8, 9) * decai(0.8, 5) * 0.08), 10 * u)
    return reverb(buf, dur=1.0, mistura=0.12)


def levelup():
    """Jingle de subir de nível (~1,3 s)."""
    notas = ["C5", "E5", "G5", "C6", "E6", "G6", "C7"]
    buf = np.zeros((2, int(1.6 * SR)))
    for k, nm in enumerate(notas):
        dd = 0.09 if k < len(notas) - 1 else 0.7
        x = quadrada(nota(nm), dd, 0.125) * env(int(dd * SR), d=0.05, s=0.6, r=0.05)
        colocar(buf, st(x * 0.16, -0.3 + k * 0.1), k * 0.07)
    x = triangulo(nota("C4"), 0.9) * env(int(0.9 * SR), d=0.3, s=0.5, r=0.3)
    colocar(buf, st(x * 0.25), 0.42)
    return reverb(buf, dur=1.2, mistura=0.2)


# ───────────────────────── efeitos ─────────────────────────
def sfx(nome, tom=0.0, seed=1):
    k = 2 ** (tom)  # tom em oitavas (pequenos desvios)
    if nome == "dado":
        d = 0.28
        x = np.zeros(int(d * SR))
        r = rng(seed)
        t = 0.0
        gap = 0.018
        while t < d - 0.02:
            c = filtro(ruido(0.012, int(r.integers(1e6))), lo=1800, hi=7000) * decai(0.012, 300)
            i = int(t * SR)
            x[i : i + len(c)] += c * (1 - t / d)
            t += gap
            gap *= 1.35
        return st(x * 0.9)
    if nome == "sino":
        d = 1.3
        t = tempo(d)
        f = nota("E6")
        x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * decai(d, 6) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * decai(d, 12)) * decai(d, 3.2)
        blip = quadrada(f * 2, 0.06, 0.5) * decai(0.06, 30) * 0.3
        x[: len(blip)] += blip
        return reverb(st(x * 0.5), dur=1.0, mistura=0.2, cauda=True)
    if nome == "falha":
        out = np.zeros((2, int(0.6 * SR)))
        for i, nm in enumerate(["D4", "C#4"]):
            dd = 0.18 if i == 0 else 0.32
            x = quadrada(nota(nm), dd, 0.5, vib=0.02, vib_hz=7) * env(int(dd * SR), d=0.05, s=0.6, r=0.05)
            colocar(out, st(x * 0.3), i * 0.19)
        return out
    if nome == "plim":
        dd = 0.09
        x = quadrada(1320 * k, dd, 0.25) * decai(dd, 30)
        return st(x * 0.25)
    if nome == "corte":
        d = 0.2
        t = tempo(d)
        sw = filtro(ruido(d, seed), lo=1500) * np.exp(-((t - 0.05) ** 2) / 0.002) * 0.9
        ting = np.sin(2 * np.pi * 3200 * k * t) * decai(d, 25) * 0.18
        return st(sw + ting)
    if nome == "flecha":
        d = 0.3
        t = tempo(d)
        f = 2400 - 1500 * t / d
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 * decai(d, 6) + filtro(ruido(d, seed), lo=3000) * 0.25 * decai(d, 10)
        return st(x)
    if nome == "fogo":
        d = 0.5
        x = filtro(ruido(d, seed, 2), hi=1800) * decai(d, 6) * 0.9
        cr = np.zeros(len(x))
        r = rng(seed + 3)
        for _ in range(14):
            i = int(r.integers(0, len(x) - 200))
            cr[i : i + 60] += r.uniform(-1, 1, 60) * 0.6
        whoosh = quadrada_var(np.linspace(300, 90, len(x)), 0.5) * decai(d, 8) * 0.12
        return reverb(st(x + cr * decai(d, 4) + whoosh), dur=0.6, mistura=0.15, cauda=True)
    if nome == "gelo":
        out = np.zeros((2, int(0.6 * SR)))
        for i, nm in enumerate(["E6", "B6", "G#6", "E7", "B6", "E7"]):
            x = quadrada(nota(nm) * k, 0.05, 0.125) * decai(0.05, 30)
            colocar(out, st(x * 0.16, -0.4 + i * 0.16), i * 0.04)
        colocar(out, st(filtro(ruido(0.4, seed), lo=6000) * decai(0.4, 8) * 0.25), 0)
        return reverb(out, dur=0.8, mistura=0.25, cauda=True)
    if nome == "trovao":
        d = 0.9
        t = tempo(d)
        x = filtro(ruido(d, seed, 4), hi=300) * decai(d, 4) * 1.1 + np.sin(2 * np.pi * 55 * t) * decai(d, 5) * 0.6
        return reverb(st(x), dur=1.2, mistura=0.25, cauda=True)
    if nome == "luz":
        out = np.zeros((2, int(0.8 * SR)))
        for i, nm in enumerate(["C6", "E6", "G6", "C7"]):
            x = quadrada(nota(nm) * k, 0.25, 0.125) * env(int(0.25 * SR), d=0.1, s=0.4, r=0.1)
            colocar(out, st(x * 0.12, -0.3 + i * 0.2), i * 0.05)
        colocar(out, st(filtro(ruido(0.6, seed), lo=7000) * decai(0.6, 5) * 0.12), 0)
        return reverb(out, dur=1.0, mistura=0.3, cauda=True)
    if nome == "sombra":
        d = 0.5
        f = np.linspace(330, 110, int(d * SR)) * k
        x = (quadrada_var(f, 0.5) + quadrada_var(f * 1.012, 0.5)) * 0.5 * env(int(d * SR), d=0.1, s=0.7, r=0.15)
        return reverb(st(filtro(x, hi=2500) * 0.3), dur=0.8, mistura=0.25, cauda=True)
    if nome == "energia":
        out = np.zeros((2, int(0.5 * SR)))
        for i in range(3):
            d = 0.12
            f = np.linspace(1100, 300, int(d * SR)) * k
            x = quadrada_var(f, 0.5) * decai(d, 14)
            colocar(out, st(x * 0.2, -0.3 + i * 0.3), i * 0.06)
        return out
    if nome == "soco":
        d = 0.18
        t = tempo(d)
        f = 160 * np.exp(-t * 30) + 50
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * decai(d, 18)
        x[: int(0.02 * SR)] += filtro(ruido(0.02, seed), lo=1000) * 0.5
        return st(x * 0.8)
    if nome == "espinhos":
        d = 0.35
        x = filtro(ruido(d, seed, 2), lo=800, hi=4000) * (np.abs(np.sin(2 * np.pi * 18 * tempo(d)))) * decai(d, 5) * 0.6
        snap = filtro(ruido(0.03, seed + 1), lo=2000) * decai(0.03, 150)
        out = st(x)
        colocar(out, st(snap * 0.7), 0.28)
        return out
    if nome == "zombaria":
        d = 0.45
        t = tempo(d)
        f = (520 + 140 * np.sin(2 * np.pi * 9 * t)) * k
        x = quadrada_var(f, 0.25) * env(int(d * SR), d=0.1, s=0.6, r=0.1)
        return st(x * 0.18)
    if nome == "sopro":
        d = 0.75
        x = filtro(ruido(d, seed, 2), lo=200, hi=2500) * env(int(d * SR), a=0.05, d=0.2, s=0.7, r=0.3) * 0.9
        return reverb(st(x), dur=0.8, mistura=0.2, cauda=True)
    if nome == "furia":
        d = 0.55
        t = tempo(d)
        f = 85 + 25 * np.sin(2 * np.pi * 6 * t)
        x = np.tanh(3 * quadrada_var(f, 0.4)) * env(int(d * SR), a=0.03, d=0.2, s=0.6, r=0.2) * 0.35
        x += filtro(ruido(d, seed), hi=900) * decai(d, 4) * 0.3
        return st(x)
    if nome == "marca":
        out = np.zeros((2, int(0.3 * SR)))
        for i, f in enumerate([1760, 2350]):
            colocar(out, st(quadrada(f, 0.06, 0.25) * decai(0.06, 25) * 0.16), i * 0.07)
        return out
    if nome == "escudo":
        d = 0.4
        t = tempo(d)
        x = (np.sin(2 * np.pi * 1800 * t) + np.sin(2 * np.pi * 2710 * t) * 0.6) * decai(d, 9) * 0.2
        return reverb(st(x), dur=0.6, mistura=0.25, cauda=True)
    if nome == "brilho":
        out = np.zeros((2, int(0.6 * SR)))
        r = rng(seed)
        for i in range(8):
            f = 2000 + r.uniform(0, 3000)
            colocar(out, st(np.sin(2 * np.pi * f * tempo(0.06)) * decai(0.06, 40) * 0.15, r.uniform(-0.6, 0.6)), i * 0.05)
        return out
    if nome == "cura":
        out = np.zeros((2, int(0.8 * SR)))
        for i, nm in enumerate(["C5", "E5", "G5", "C6"]):
            x = triangulo(nota(nm), 0.3) * env(int(0.3 * SR), d=0.1, s=0.5, r=0.1)
            colocar(out, st(x * 0.22), i * 0.07)
        return reverb(out, dur=0.8, mistura=0.25, cauda=True)
    if nome == "passo":
        d = 0.05
        return st(filtro(ruido(d, seed), hi=600) * decai(d, 60) * 0.5)
    if nome == "hit":
        d = 0.16
        f = np.linspace(320, 70, int(d * SR)) * k
        x = quadrada_var(f, 0.5) * decai(d, 16) * 0.35
        x[: int(0.03 * SR)] += filtro(ruido(0.03, seed), lo=500) * 0.6 * decai(0.03, 60)
        return reverb(st(x), dur=0.5, mistura=0.12, cauda=True)
    if nome == "derrota":
        out = np.zeros((2, int(0.9 * SR)))
        for i, nm in enumerate(["E5", "C5", "A4", "F4", "D4", "B3"]):
            x = quadrada(nota(nm), 0.1, 0.5) * env(int(0.1 * SR), d=0.03, s=0.6, r=0.02)
            colocar(out, st(x * 0.32), i * 0.085)
        return out
    if nome == "poof":
        d = 0.3
        return st(filtro(ruido(d, seed), lo=300, hi=2500) * env(int(d * SR), a=0.02, d=0.1, s=0.4, r=0.15) * 0.4)
    if nome == "whoosh":
        d = 0.35
        t = tempo(d)
        x = filtro(ruido(d, seed), lo=500, hi=6000) * np.exp(-((t - 0.16) ** 2) / 0.004) * 0.9
        return st(x)
    if nome == "estalo":
        x = filtro(ruido(0.02, seed), lo=2000) * decai(0.02, 120)
        y = quadrada(1560, 0.08, 0.5) * decai(0.08, 25) * 0.3
        out = np.zeros(int(0.1 * SR))
        out[: len(x)] += x
        out[: len(y)] += y
        return st(out * 0.8)
    if nome == "vs":
        d = 1.2
        t = tempo(d)
        x = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t * 4) + 40) / SR) * decai(d, 3) * 0.9
        x += filtro(ruido(d, seed, 2), hi=1500) * decai(d, 5) * 0.5
        out = reverb(st(x), dur=1.5, mistura=0.25, cauda=True)
        colocar(out, sfx("whoosh", seed=seed + 1), 0)
        return out
    if nome == "blip":
        out = np.zeros((2, int(0.16 * SR)))
        for i, f in enumerate([988 * k, 1319 * k]):
            colocar(out, st(quadrada(f, 0.06, 0.5) * decai(0.06, 20) * 0.18), i * 0.06)
        return out
    if nome == "bip":
        d = 0.18
        return st(quadrada(880 * k, d, 0.5) * env(int(d * SR), d=0.02, s=0.8, r=0.04) * 0.22)
    if nome == "lutem":
        out = np.zeros((2, int(1.0 * SR)))
        for nm in ["A4", "C#5", "E5", "A5"]:
            x = quadrada(nota(nm), 0.6, 0.25) * env(int(0.6 * SR), d=0.2, s=0.5, r=0.2)
            colocar(out, st(x * 0.1), 0)
        colocar(out, st(bumbo8(1.0)), 0)
        colocar(out, st(ruido(0.4, seed) * decai(0.4, 8) * 0.3), 0)
        return reverb(out, dur=1.0, mistura=0.2, cauda=True)
    if nome == "baque":
        d = 0.2
        t = tempo(d)
        x = np.sin(2 * np.pi * np.cumsum(120 * k * np.exp(-t * 20) + 45) / SR) * decai(d, 16)
        x += filtro(ruido(d, seed), hi=1500) * decai(d, 20) * 0.4
        return st(x * 0.7)
    if nome == "bipPV":
        out = np.zeros((2, int(0.3 * SR)))
        for i in range(2):
            colocar(out, st(quadrada(1600, 0.05, 0.5) * 0.12), i * 0.1)
        return out
    if nome == "subiu":
        return levelup()
    if nome == "levelup":
        return levelup()
    if nome == "fanfarra":
        return fanfarra()
    if nome == "papel":
        d = 0.9
        x = filtro(ruido(d, seed, 3), lo=1500, hi=8000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * tempo(d)))) * env(int(d * SR), a=0.05, d=0.3, s=0.5, r=0.3)
        return st(x * 0.35)
    if nome == "plimSobe":
        out = np.zeros((2, int(0.4 * SR)))
        for i, f in enumerate([1047, 1568, 2093]):
            colocar(out, st(quadrada(f * k, 0.06, 0.125) * decai(0.06, 25) * 0.16), i * 0.045)
        return reverb(out, dur=0.5, mistura=0.2, cauda=True)
    if nome == "tique":
        return st(quadrada(1760 * k, 0.03, 0.25) * decai(0.03, 60) * 0.12)
    if nome == "tecla":
        return st(filtro(ruido(0.015, seed), lo=2500) * decai(0.015, 200) * 0.3)
    if nome == "selo":
        d = 0.25
        x = filtro(ruido(d, seed), hi=900) * decai(d, 25) + np.sin(2 * np.pi * 80 * tempo(d)) * decai(d, 20)
        return st(x * 0.6)
    if nome == "final":
        out = np.zeros((2, int(2.0 * SR)))
        for nm in ["A3", "E4", "A4", "C#5", "E5"]:
            x = quadrada(nota(nm), 1.4, 0.25, vib=0.005) * env(int(1.4 * SR), d=0.3, s=0.6, r=0.6)
            colocar(out, st(x * 0.07), 0)
        x = triangulo(nota("A2"), 1.4) * env(int(1.4 * SR), d=0.3, s=0.7, r=0.6)
        colocar(out, st(x * 0.3), 0)
        return reverb(out, dur=1.5, mistura=0.3, cauda=True)
    raise ValueError(f"efeito desconhecido: {nome}")


# ───────────────────────── ambiente do calabouço ─────────────────────────
def ambiente(dur, gotas, fps):
    n = int(dur * SR)
    r = rng(77)
    # crepitar das tochas: estalos aleatórios filtrados + chiado grave
    cr = np.zeros(n)
    for _ in range(int(dur * 22)):
        i = int(r.integers(0, n - 400))
        L = int(r.integers(40, 300))
        cr[i : i + L] += r.uniform(-1, 1, L) * np.exp(-np.arange(L) / (L / 4)) * r.uniform(0.2, 1)
    cr = filtro(cr, lo=500, hi=5000) * 0.06
    rumor = filtro(r.uniform(-1, 1, n), hi=160) * 0.25
    amb = np.array([cr + rumor, np.roll(cr, 1200) + rumor])
    # gotas
    for f in gotas:
        d = 0.12
        t = tempo(d)
        fr = 1400 * np.exp(-t * 18) + 700
        x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * decai(d, 30) * 0.08
        colocar(amb, st(x, float(r.uniform(-0.5, 0.5))), f / fps + 0.45)
    return reverb(amb, dur=2.0, mistura=0.3)


# ───────────────────────── mixagem ─────────────────────────
def main(caminho):
    dados = json.load(open(caminho))
    fps = dados["fps"]
    dur = dados["quadros"] / fps
    m = dados["marcos"]
    n = int(dur * SR)
    mix = np.zeros((2, n + 3 * SR))

    # trilha: batalha (0 → duelo), intensa (duelo → vitória), calma no pergaminho
    t_duelo = (m["duelo"] or m["vencedor"]) / fps
    t_venc = m["vencedor"] / fps
    t_perg = m["pergaminho"] / fps
    t_cta = m["cta"] / fps
    bat = trilha_batalha(t_duelo + 0.5, seed=3)
    bat[:, -int(0.5 * SR):] *= np.linspace(1, 0, int(0.5 * SR))
    # entrada suave da trilha na intro (só baixo e arpejo nos primeiros 2 s)
    bat[:, : int(1.0 * SR)] *= np.linspace(0.3, 1, int(1.0 * SR))
    colocar(mix, bat * 0.9, 0)
    if m["duelo"]:
        inten = trilha_batalha(t_venc - t_duelo + 0.3, intensa=True, seed=11)
        inten[:, -int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
        colocar(mix, inten * 0.95, t_duelo)
    calma = trilha_batalha(dur - t_perg + 1, calma=True, seed=21)
    calma[:, : int(1.5 * SR)] *= np.linspace(0, 1, int(1.5 * SR))
    # trilha recua no fecho
    k_cta = int((t_cta - t_perg) * SR)
    calma[:, k_cta:] *= np.linspace(1, 0.55, calma.shape[1] - k_cta)
    colocar(mix, calma * 0.8, t_perg + 0.6)
    trilha = mix.copy()

    # efeitos (limite de simultâneos por prioridade)
    sfxbuf = np.zeros_like(mix)
    eventos = sorted(dados["sons"], key=lambda s: (s["f"], -s["prio"]))
    ativos = []  # (fim, prio)
    cache = {}
    usados = 0
    for i, ev in enumerate(eventos):
        t = ev["f"] / fps
        ativos = [a for a in ativos if a[0] > t]
        if len(ativos) >= 5 and ev["prio"] <= min(a[1] for a in ativos):
            continue
        chave = (ev["som"], round(ev.get("tom", 0) or 0, 3), i % 4)
        if chave not in cache:
            cache[chave] = sfx(ev["som"], tom=ev.get("tom", 0) or 0, seed=101 + i % 4)
        x = cache[chave]
        pan = ev.get("pan", 0) or 0
        if pan:
            a = (pan + 1) * np.pi / 4
            x = np.array([x[0] * np.cos(a) * 1.41, x[1] * np.sin(a) * 1.41])
        colocar(sfxbuf, x * ev["vol"], t)
        ativos.append((t + x.shape[1] / SR * 0.5, ev["prio"]))
        usados += 1
    # eco leve de calabouço nos efeitos
    sfxbuf = reverb(sfxbuf, dur=1.4, mistura=0.14)

    amb = ambiente(dur + 1, dados["gotas"], fps)
    # mixagem: trilha um pouco abaixo dos efeitos (acentos ~5 dB acima)
    final = trilha[:, :n] * 0.55 + sfxbuf[:, :n] * 1.0 + amb[:, :n] * 0.5
    # fade final
    final[:, -int(0.6 * SR):] *= np.linspace(1, 0, int(0.6 * SR))
    # passa-baixa suave: ondas quadradas têm harmônicos que fazem o AAC estourar o pico verdadeiro
    final = np.array([filtro(c, hi=11000, ordem=4) for c in final])
    # limitador suave: segura os picos para o master chegar a −14 LUFS sem passar de −1 dBTP
    final = final / np.max(np.abs(final))
    final = np.tanh(2.2 * final) / np.tanh(2.2)
    final *= 0.89
    saida = caminho.replace(".sons.json", ".wav")
    dadosi = (np.clip(final, -1, 1).T * 32767).astype(np.int16)
    with wave.open(saida, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(dadosi.tobytes())
    print(f"✓ {saida} · {dur:.1f} s · {usados}/{len(eventos)} efeitos")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "../remotion/public/arena/episodio-1.sons.json"))
