"""
ARENA D20 — trilha chiptune e efeitos 8/16 bits 100% sintetizados (sem direito autoral de terceiros).

Lê os eventos gerados pelo roteiro (remotion/public/arena/epNN-sons.json) e escreve um único WAV
sincronizado com o vídeo (remotion/public/arena/epNN.wav):
  • ambiente de calabouço (tochas crepitando, gotas, vento grave) por baixo de tudo
  • trilha de batalha em lá menor, 145 BPM, em loop; versão intensa no duelo final;
    calma no pergaminho; recua no CTA
  • um efeito por evento (golpes por tipo, dado, cut-in, crítico, erro, derrota, banners, contagem…)
    ~4–6 dB acima da trilha, com eco curto de masmorra e limite de efeitos simultâneos

Uso: python3 audio/arena.py [01]
Tudo é determinístico: rodar de novo gera exatamente o mesmo som.
"""
import json
import os
import sys
import wave

import numpy as np

SR = 48000
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BPM = 145
BEAT = 60 / BPM
S16 = BEAT / 4


# ───────────────────────── osciladores e utilidades ─────────────────────────
def t_(dur):
    return np.arange(int(dur * SR)) / SR


def hz(n):
    nomes = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    b = nomes[n[0]]
    r = n[1:]
    if r.startswith("#"):
        b += 1
        r = r[1:]
    elif r.startswith("b"):
        b -= 1
        r = r[1:]
    return 440.0 * 2 ** ((b + 12 * (int(r) + 1) - 69) / 12)


def pulso(f, dur, duty=0.5, vib=0.0):
    t = t_(dur)
    fase = np.cumsum(np.full_like(t, f) * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 4 - 0.4, 0, 1))) / SR
    return np.where((fase % 1) < duty, 1.0, -1.0)


def tri(f, dur):
    t = t_(dur)
    fase = (f * t) % 1
    # triângulo de 4 bits, como nos consoles
    x = 4 * np.abs(fase - 0.5) - 1
    return np.round(x * 7) / 7


def ruido(dur, seed, curto=False):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    if curto:  # ruído "metálico" de período curto (LFSR de 93 passos)
        base = rng.choice([-1.0, 1.0], 93)
        return np.resize(np.repeat(base, 6), n)
    passo = 3
    v = rng.choice([-1.0, 1.0], n // passo + 1)
    return np.repeat(v, passo)[:n]


def env(n, a=0.002, d=0.1, s=0.0, r=0.05, total=None):
    """ADSR simples em amostras."""
    total = total or n
    e = np.zeros(n)
    ia, idd, ir = int(a * SR), int(d * SR), int(r * SR)
    i = 0
    if ia:
        e[: min(ia, n)] = np.linspace(0, 1, ia)[: min(ia, n)]
    i = ia
    if i < n:
        k = min(idd, n - i)
        e[i : i + k] = np.linspace(1, s, idd)[:k]
        i += k
    if i < n:
        e[i:] = s
    if ir and n > ir:
        e[-ir:] *= np.linspace(1, 0, ir)
    return e


def decai(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def varredura(f0, f1, dur, forma="pulso", duty=0.5):
    t = t_(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    fase = np.cumsum(f) / SR
    if forma == "tri":
        return 4 * np.abs((fase % 1) - 0.5) - 1
    if forma == "sen":
        return np.sin(2 * np.pi * fase)
    return np.where((fase % 1) < duty, 1.0, -1.0)


def lp_fft(x, hi=None, lo=None):
    n = len(x)
    N = 1 << int(np.ceil(np.log2(n + 1)))
    X = np.fft.rfft(x, N)
    f = np.fft.rfftfreq(N, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-6)) ** 4)
    return np.fft.irfft(X * g, N)[:n]


def cat(*xs):
    return np.concatenate(xs)


def junta(base, x, em):
    i = int(em * SR)
    if i >= len(base):
        return
    k = min(len(x), len(base) - i)
    base[i : i + k] += x[:k]


# ───────────────────────── efeitos (cada um ~ -3 dBFS de pico) ─────────────────────────
def norm(x, pico=0.7):
    m = np.max(np.abs(x)) or 1
    return x / m * pico


def sfx_passo(i):
    n = ruido(0.05, 100 + i % 7)
    return norm(lp_fft(n, hi=900) * decai(len(n), 0.012), 0.5)


def sfx_queda(i):
    a = varredura(160, 50, 0.16, "tri") * decai(int(0.16 * SR), 0.05)
    b = lp_fft(ruido(0.25, 7 + i), hi=1200) * decai(int(0.25 * SR), 0.06) * 0.6
    return norm(cat(a, np.zeros(len(b) - len(a))) + b if len(b) > len(a) else a + cat(b, np.zeros(len(a) - len(b))))


def sfx_dado(i):
    out = np.zeros(int(0.32 * SR))
    rng = np.random.default_rng(300 + i)
    t = 0.0
    for k in range(7):
        clique = pulso(1800 + rng.integers(0, 900), 0.012, 0.3) * decai(int(0.012 * SR), 0.004)
        junta(out, clique * (1 - k / 9), t)
        t += 0.028 + rng.random() * 0.03
    return norm(out, 0.55)


def sfx_corte(i):
    sw = lp_fft(ruido(0.18, 20 + i), lo=1500) * env(int(0.18 * SR), a=0.01, d=0.17, s=0)
    ting = pulso(2400, 0.12, 0.25) * decai(int(0.12 * SR), 0.03) * 0.35
    return norm(sw + cat(ting, np.zeros(len(sw) - len(ting))))


def sfx_swing(i):
    sw = lp_fft(ruido(0.16, 40 + i), lo=700, hi=4000) * np.sin(np.linspace(0, np.pi, int(0.16 * SR)))
    return norm(sw, 0.45)


def sfx_impacto(i):
    a = varredura(220, 45, 0.18, "tri") * decai(int(0.18 * SR), 0.05)
    b = lp_fft(ruido(0.12, 50 + i), hi=2500) * decai(int(0.12 * SR), 0.025)
    return norm(a + cat(b, np.zeros(len(a) - len(b))))


def sfx_soco(i):
    a = varredura(300, 70, 0.1, "pulso", 0.5) * decai(int(0.1 * SR), 0.025)
    b = ruido(0.06, 60 + i) * decai(int(0.06 * SR), 0.01)
    return norm(a + cat(b, np.zeros(len(a) - len(b))))


def sfx_flecha(i):
    w = varredura(2600, 900, 0.22, "pulso", 0.125) * env(int(0.22 * SR), a=0.02, d=0.2, s=0) * 0.6
    thunk = varredura(260, 90, 0.08, "tri") * decai(int(0.08 * SR), 0.02)
    return norm(cat(w, thunk))


def sfx_fogo(i):
    n = int(0.55 * SR)
    r = lp_fft(ruido(0.55, 70 + i), hi=2200) * env(n, a=0.01, d=0.5, s=0)
    rng = np.random.default_rng(71 + i)
    for _ in range(10):  # estalos
        p = rng.integers(0, n - 400)
        r[p : p + 120] += rng.choice([-1, 1], 120) * 0.5 * decai(120, 0.0006)
    grave = varredura(120, 45, 0.4, "tri") * decai(int(0.4 * SR), 0.12)
    return norm(r + cat(grave, np.zeros(n - len(grave))))


def sfx_gelo(i):
    out = np.zeros(int(0.6 * SR))
    for k, f in enumerate([2093, 2637, 3136, 2349, 3520]):
        junta(out, pulso(f, 0.18, 0.25) * decai(int(0.18 * SR), 0.05) * 0.4, k * 0.06)
    out += lp_fft(ruido(0.6, 80 + i), lo=4000) * decai(len(out), 0.15) * 0.4
    return norm(out)


def sfx_trovao(i):
    n = int(0.8 * SR)
    b = varredura(90, 30, 0.8, "tri") * decai(n, 0.3)
    r = lp_fft(ruido(0.8, 90 + i), hi=600) * decai(n, 0.25)
    return norm(b + r * 0.8)


def sfx_raio(i):
    n = int(0.35 * SR)
    z = ruido(0.35, 95 + i, curto=True) * decai(n, 0.08)
    s = varredura(1800, 200, 0.35, "pulso", 0.25) * decai(n, 0.1) * 0.5
    return norm(z + s)


def sfx_luz(i):
    out = np.zeros(int(0.9 * SR))
    for k, n in enumerate(["C6", "E6", "G6", "C7"]):
        junta(out, pulso(hz(n), 0.7, 0.25, vib=0.004) * decai(int(0.7 * SR), 0.25) * 0.35, k * 0.04)
    return norm(out)


def sfx_sombra(i):
    n = int(0.5 * SR)
    a = pulso(110, 0.5, 0.5) * 0.5 + pulso(116.5, 0.5, 0.5) * 0.5
    wob = 0.6 + 0.4 * np.sin(2 * np.pi * 9 * t_(0.5))
    return norm(lp_fft(a * wob, hi=1400) * env(n, a=0.02, d=0.45, s=0))


def sfx_energia(i):
    out = np.zeros(int(0.45 * SR))
    for k in range(3):
        junta(out, varredura(600 + k * 200, 2400 + k * 300, 0.12, "pulso", 0.25) * decai(int(0.12 * SR), 0.05) * 0.5, k * 0.07)
    return norm(out)


def sfx_cura(i):
    out = np.zeros(int(0.8 * SR))
    for k, n in enumerate(["C5", "E5", "G5", "C6", "E6"]):
        junta(out, tri(hz(n), 0.3) * decai(int(0.3 * SR), 0.12) * 0.5 + pulso(hz(n) * 2, 0.3, 0.125) * decai(int(0.3 * SR), 0.06) * 0.15, k * 0.07)
    return norm(out)


def sfx_zombaria(i):
    out = np.zeros(int(0.6 * SR))
    for k, (f0, f1) in enumerate([(880, 660), (740, 520), (620, 400)]):
        junta(out, varredura(f0, f1, 0.17, "pulso", 0.25) * env(int(0.17 * SR), a=0.01, d=0.16, s=0) * 0.5, k * 0.16)
    return norm(out)


def sfx_sopro(i):
    n = int(0.7 * SR)
    r = lp_fft(ruido(0.7, 110 + i), hi=1800) * env(n, a=0.08, d=0.6, s=0)
    g = pulso(70, 0.7, 0.5) * env(n, a=0.05, d=0.6, s=0) * 0.3
    return norm(r + g)


def sfx_furia(i):
    n = int(0.6 * SR)
    g = varredura(80, 140, 0.6, "pulso", 0.5) * 0.5 + varredura(83, 146, 0.6, "pulso", 0.3) * 0.5
    g = np.clip(g * 1.5, -1, 1) * env(n, a=0.03, d=0.55, s=0)
    r = lp_fft(ruido(0.6, 120 + i), hi=1500) * env(n, a=0.02, d=0.5, s=0) * 0.5
    return norm(g + r)


def sfx_brilho(i):
    out = np.zeros(int(0.6 * SR))
    for k, n in enumerate(["E6", "B6", "E7", "G#6"]):
        junta(out, pulso(hz(n), 0.2, 0.125) * decai(int(0.2 * SR), 0.06) * 0.4, k * 0.05)
    return norm(out)


def sfx_conjura(i):
    w = varredura(400, 1600, 0.25, "pulso", 0.125) * env(int(0.25 * SR), a=0.05, d=0.2, s=0)
    return norm(w, 0.4)


def sfx_whoosh(i):
    n = int(0.35 * SR)
    r = ruido(0.35, 130 + i)
    w = np.sin(np.linspace(0, np.pi, n)) ** 2
    return norm(lp_fft(r, lo=500, hi=6000) * w)


def sfx_estalo(i):
    n = int(0.12 * SR)
    c = ruido(0.12, 140 + i, curto=True) * decai(n, 0.015)
    s = pulso(1200, 0.12, 0.5) * decai(n, 0.02) * 0.5
    return norm(c + s)


def sfx_hit(i):
    a = varredura(700, 140, 0.09, "pulso", 0.5) * decai(int(0.09 * SR), 0.03)
    return norm(a, 0.6)


def sfx_sino(i):
    t = t_(1.6)
    f = hz("A6")
    m = np.sin(2 * np.pi * f * 1.4 * t) * 2.2 * np.exp(-t * 3)
    b = np.sin(2 * np.pi * f * t + m) * np.exp(-t * 2.2)
    b += 0.4 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 4)
    return norm(b, 0.8)


def sfx_plim(i):
    a = pulso(hz("E6"), 0.07, 0.25) * decai(int(0.07 * SR), 0.02)
    b = pulso(hz("C6"), 0.12, 0.25) * decai(int(0.12 * SR), 0.04)
    return norm(cat(a, b), 0.45)


def sfx_bip(i):
    b = pulso(hz("A5"), 0.07, 0.5) * 0.8
    return norm(cat(b, np.zeros(int(0.06 * SR)), b), 0.4)


def sfx_derrota(i):
    out = []
    for n in ["E5", "C5", "A4", "E4", "C4", "A3"]:
        out.append(pulso(hz(n), 0.07, 0.5) * env(int(0.07 * SR), a=0.002, d=0.06, s=0.3, r=0.01))
    return norm(cat(*out), 0.6)


def sfx_banner(i):
    a = pulso(hz("C6"), 0.04, 0.25)
    b = pulso(hz("G6"), 0.07, 0.25) * decai(int(0.07 * SR), 0.03)
    return norm(cat(a, b), 0.45)


def sfx_conta(i):
    b = pulso(hz("A5"), 0.16, 0.5) * env(int(0.16 * SR), a=0.002, d=0.15, s=0.2)
    return norm(b, 0.6)


def sfx_lutem(i):
    n = int(0.9 * SR)
    acorde = sum(pulso(hz(x), 0.9, 0.25) for x in ["A5", "C6", "E6"]) / 3
    acorde *= env(n, a=0.005, d=0.8, s=0.0)
    r = lp_fft(ruido(0.9, 150), hi=3000) * decai(n, 0.08)
    k = varredura(150, 40, 0.3, "tri") * decai(int(0.3 * SR), 0.1)
    return norm(acorde + r * 0.5 + cat(k, np.zeros(n - len(k))))


def sfx_vs(i):
    n = int(1.4 * SR)
    k = varredura(120, 35, 1.0, "tri") * decai(int(1.0 * SR), 0.35)
    ac = sum(pulso(hz(x), 1.4, 0.5) for x in ["A3", "E4", "A4", "C5"]) / 4 * env(n, a=0.005, d=1.3, s=0)
    return norm(cat(k, np.zeros(n - len(k))) + ac * 0.6)


def sfx_fanfarra(i):
    notas = [("C5", 1), ("C5", 1), ("C5", 1), ("C5", 3), ("Ab4", 3), ("Bb4", 3), ("C5", 2), ("Bb4", 1), ("C5", 8)]
    u = BEAT / 3
    lead, baixo = [], []
    for n, d in notas:
        dur = d * u
        lead.append(pulso(hz(n) * 2, dur, 0.25, vib=0.006) * env(int(dur * SR), a=0.003, d=dur * 0.6, s=0.6, r=0.02))
    harm = [("E5", 1), ("E5", 1), ("E5", 1), ("E5", 3), ("C5", 3), ("D5", 3), ("E5", 2), ("D5", 1), ("E5", 8)]
    h = [pulso(hz(n), d * u, 0.5) * env(int(d * u * SR), a=0.003, d=d * u * 0.6, s=0.5, r=0.02) * 0.5 for n, d in harm]
    for n, d in [("C3", 6), ("Ab2", 3), ("Bb2", 3), ("C3", 11)]:
        baixo.append(tri(hz(n), d * u))
    L, H, B = cat(*lead), cat(*h), cat(*baixo)
    m = max(len(L), len(H), len(B))
    f = lambda x: cat(x, np.zeros(m - len(x)))  # noqa: E731
    return norm(f(L) + f(H) + f(B) * 0.8, 0.8)


def sfx_levelup(i):
    out = np.zeros(int(1.6 * SR))
    for k, n in enumerate(["C5", "E5", "G5", "C6", "E6", "G6", "C7"]):
        junta(out, pulso(hz(n), 0.12, 0.25) * env(int(0.12 * SR), a=0.002, d=0.1, s=0.3, r=0.01) * 0.6, k * 0.07)
    junta(out, sum(pulso(hz(x), 0.8, 0.125) for x in ["C6", "E6", "G6"]) / 3 * decai(int(0.8 * SR), 0.3), 0.5)
    return norm(out, 0.7)


def sfx_papel(i):
    n = int(1.1 * SR)
    r = lp_fft(ruido(1.1, 160), lo=1200, hi=7000)
    am = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * t_(1.1)))
    return norm(r * am * env(n, a=0.05, d=1.0, s=0), 0.5)


def sfx_plimsobe(i):
    escala = ["C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7", "G7", "A7"]
    f = hz(escala[min(i, len(escala) - 1)])
    a = pulso(f, 0.1, 0.25) * decai(int(0.1 * SR), 0.05)
    b = pulso(f * 1.5, 0.18, 0.125) * decai(int(0.18 * SR), 0.06) * 0.6
    return norm(cat(a, b), 0.55)


def sfx_tique(i):
    return norm(pulso(2200, 0.02, 0.5) * decai(int(0.02 * SR), 0.005), 0.35)


SFX = {
    "passo": sfx_passo,
    "queda": sfx_queda,
    "dado": sfx_dado,
    "corte": sfx_corte,
    "swing": sfx_swing,
    "impacto": sfx_impacto,
    "soco": sfx_soco,
    "flecha": sfx_flecha,
    "fogo": sfx_fogo,
    "gelo": sfx_gelo,
    "trovao": sfx_trovao,
    "raio": sfx_raio,
    "luz": sfx_luz,
    "sombra": sfx_sombra,
    "energia": sfx_energia,
    "veneno": sfx_sopro,
    "cura": sfx_cura,
    "zombaria": sfx_zombaria,
    "sopro": sfx_sopro,
    "furia": sfx_furia,
    "brilho": sfx_brilho,
    "conjura": sfx_conjura,
    "whoosh": sfx_whoosh,
    "estalo": sfx_estalo,
    "hit": sfx_hit,
    "sino": sfx_sino,
    "plim": sfx_plim,
    "bip": sfx_bip,
    "derrota": sfx_derrota,
    "banner": sfx_banner,
    "conta": sfx_conta,
    "lutem": sfx_lutem,
    "vs": sfx_vs,
    "fanfarra": sfx_fanfarra,
    "levelup": sfx_levelup,
    "papel": sfx_papel,
    "plimSobe": sfx_plimsobe,
    "tique": sfx_tique,
}
# prioridade para o limite de efeitos simultâneos (maior = mais importante)
PRIORIDADE = {"passo": 0, "tique": 1, "dado": 2, "conjura": 2, "swing": 3, "plim": 4, "hit": 5, "bip": 4}
ECO = {"corte", "impacto", "soco", "flecha", "fogo", "trovao", "raio", "hit", "derrota", "queda", "sopro", "furia", "vs", "lutem", "estalo"}


# ───────────────────────── trilha ─────────────────────────
ACORDES = [("A2", ["A4", "C5", "E5"]), ("F2", ["F4", "A4", "C5"]), ("G2", ["G4", "B4", "D5"]), ("E2", ["E4", "G#4", "B4"])]
MEL_A = [
    ["A4", None, "C5", "E5", "D5", "C5", "B4", "C5"],
    ["A4", None, "F4", "A4", "C5", None, "A4", "C5"],
    ["B4", None, "D5", "G5", "F5", "E5", "D5", "B4"],
    ["G#4", None, "B4", "E5", "D5", None, "B4", "G#4"],
]
MEL_B = [
    ["E5", None, "A5", None, "G5", "E5", "C5", "E5"],
    ["F5", None, "E5", "C5", "A4", "C5", "F5", None],
    ["G5", None, "F5", "D5", "B4", "D5", "G5", None],
    ["G#5", None, "E5", "B4", "G#4", "B4", "E5", None],
]


def nota_lead(n, dur, duty=0.5, oitava=1):
    x = pulso(hz(n) * oitava, dur, duty, vib=0.005) * env(int(dur * SR), a=0.004, d=dur * 0.7, s=0.55, r=0.015)
    return x


def kick():
    return varredura(160, 42, 0.14, "tri") * decai(int(0.14 * SR), 0.05)


def caixa_(seed):
    n = ruido(0.12, seed) * decai(int(0.12 * SR), 0.035)
    return n + tri(190, 0.12) * decai(int(0.12 * SR), 0.03) * 0.4


def chimbal(seed, aberto=False):
    d = 0.09 if aberto else 0.035
    return lp_fft(ruido(d, seed, curto=True), lo=5000) * decai(int(d * SR), d / 3)


def compasso(i_compasso, intenso=False, calmo=False, var=0):
    """Um compasso (4 tempos) da trilha: baixo, arpejo, melodia e bateria."""
    dur = BEAT * 4
    n = int(dur * SR)
    out = np.zeros(n)
    raiz, acorde = ACORDES[i_compasso % 4]
    mel = (MEL_B if var % 2 else MEL_A)[i_compasso % 4]
    # baixo (triângulo): colcheias raiz/oitava; no duelo, semicolcheias
    passos = 16 if intenso else 8
    d = dur / passos
    for k in range(passos):
        f = hz(raiz) * (2 if k % 2 else 1)
        if calmo and k % 2:
            continue
        nota = tri(f, d * (1.9 if calmo else 0.9)) * (0.6 if calmo else 1)
        junta(out, nota * env(len(nota), a=0.002, d=d, s=0.7, r=0.01), k * d)
    # arpejo (pulso 12,5%)
    for k in range(16):
        f = hz(acorde[k % 3]) * (2 if (k // 3) % 2 else 1)
        a = pulso(f, S16 * 0.8, 0.125) * env(int(S16 * 0.8 * SR), a=0.001, d=S16 * 0.7, s=0.2, r=0.005)
        junta(out, a * (0.16 if calmo else 0.22), k * S16)
    if not calmo:
        # melodia
        for k, nt in enumerate(mel):
            if nt is None:
                continue
            dd = BEAT / 2
            if k + 1 < len(mel) and mel[k + 1] is None:
                dd *= 2
            junta(out, nota_lead(nt, dd * 0.95, 0.5 if not intenso else 0.25, 2 if intenso else 1) * 0.42, k * BEAT / 2)
            if intenso:
                junta(out, nota_lead(nt, dd * 0.95, 0.5, 1) * 0.22, k * BEAT / 2)
        # bateria
        for b in range(4):
            if b in (0, 2) or (intenso and b == 3):
                junta(out, kick() * 0.9, b * BEAT)
            if b == 2:
                junta(out, kick() * 0.6, b * BEAT + BEAT / 2)
            if b in (1, 3):
                junta(out, caixa_(i_compasso * 7 + b) * 0.55, b * BEAT)
        for k in range(16 if intenso else 8):
            dt = dur / (16 if intenso else 8)
            junta(out, chimbal(i_compasso * 31 + k, aberto=(k % 4 == 2 and not intenso)) * 0.22, k * dt)
    else:
        # pad suave (dois pulsos desafinados) no modo calmo
        for x in acorde:
            p = (pulso(hz(x), dur, 0.25) + pulso(hz(x) * 1.003, dur, 0.25)) * 0.5
            out += lp_fft(p, hi=2200) * env(n, a=0.3, d=0.1, s=1, r=0.3) * 0.08
    return out


def trilha(total, fases):
    out = np.zeros(int(total * SR))
    bat, duelo, vit, perg, cta = fases["batalha"], fases["duelo"], fases["vitoria"], fases["pergaminho"], fases["cta"]
    # intro: drone grave + toms nos tempos + arpejo subindo no fim
    t = 0.0
    dr = lp_fft(pulso(hz("A1"), bat, 0.5) + pulso(hz("A1") * 1.004, bat, 0.5), hi=500) * 0.12
    dr *= np.linspace(0.3, 1, len(dr))
    junta(out, dr, 0)
    while t < bat - BEAT:
        junta(out, varredura(110, 55, 0.25, "tri") * decai(int(0.25 * SR), 0.08) * 0.6, t)
        t += BEAT * (2 if t < bat - 2 else 1)
    for k in range(12):
        junta(out, pulso(hz(["A3", "C4", "E4", "A4"][k % 4]) * (1 + k // 4), S16, 0.25) * 0.15, bat - 2 + k * 0.15)
    # batalha: loop de 4 compassos (A, A, B, B)
    t = bat
    i = 0
    while t < duelo - 0.01:
        c = compasso(i, var=(i // 8) % 2 if i >= 8 else (i // 4) % 2)
        if t + len(c) / SR > duelo:
            c = c[: int((duelo - t) * SR)]
            c *= env(len(c), a=0, d=0, s=1, r=0.03)
        junta(out, c, t)
        t += BEAT * 4
        i += 1
    # duelo: versão intensa
    t = duelo
    i = 0
    while t < vit - 0.01:
        c = compasso(i, intenso=True, var=i // 4)
        if t + len(c) / SR > vit:
            c = c[: int((vit - t) * SR)]
            c *= env(len(c), a=0, d=0, s=1, r=0.02)
        junta(out, c * 1.05, t)
        t += BEAT * 4
        i += 1
    # vitória: só a fanfarra (efeito) + pad brilhante em dó maior
    pad = sum(pulso(hz(x), perg - vit, 0.25) for x in ["C4", "E4", "G4"]) / 3
    junta(out, lp_fft(pad, hi=2500) * env(len(pad), a=1.2, d=0.1, s=1, r=0.6) * 0.12, vit + 1.4)
    # pergaminho: modo calmo; CTA: recua e termina num acorde
    t = perg + 1.0
    i = 0
    while t < total - 0.01:
        c = compasso(i, calmo=True)
        if t + len(c) / SR > total:
            c = c[: int((total - t) * SR)]
        g = 1.0 if t < cta else 0.55
        junta(out, c * g, t)
        t += BEAT * 4
        i += 1
    fim = int((total - 1.5) * SR)
    out[fim:] *= np.linspace(1, 0, len(out) - fim)
    return out


# ───────────────────────── ambiente de calabouço ─────────────────────────
def ambiente(total):
    n = int(total * SR)
    rng = np.random.default_rng(900)
    # vento grave (ruído marrom filtrado)
    br = np.cumsum(rng.standard_normal(n))
    br -= lp_fft(br, hi=0.5)
    vento = lp_fft(br, hi=220)
    vento = vento / (np.max(np.abs(vento)) or 1) * 0.05
    out = vento
    # crepitar das tochas
    for _ in range(int(total * 9)):
        p = rng.integers(0, n - 300)
        k = rng.integers(40, 200)
        out[p : p + k] += rng.choice([-1, 1], k) * decai(k, 0.0008) * (0.02 + rng.random() * 0.04)
    # gotas pingando (com eco)
    tg = 1.3
    while tg < total - 1:
        f = 1400 + rng.random() * 900
        g = varredura(f, f * 1.6, 0.06, "sen") * decai(int(0.06 * SR), 0.02) * 0.07
        for e, a in [(0, 1), (0.21, 0.35), (0.43, 0.15)]:
            junta(out, g * a, tg + e)
        tg += 1.8 + rng.random() * 3.5
    return out


def eco(x, atraso=0.13, fb=0.32, mistura=0.28):
    d = int(atraso * SR)
    y = np.copy(x)
    for k in range(1, 6):
        if d * k >= len(x):
            break
        y[d * k :] += x[: -d * k] * (fb**k) * mistura / fb
    return y


# ───────────────────────── mixagem ─────────────────────────
def main():
    nn = sys.argv[1] if len(sys.argv) > 1 else "01"
    entrada = os.path.join(RAIZ, f"remotion/public/arena/ep{nn}-sons.json")
    saida = os.path.join(RAIZ, f"remotion/public/arena/ep{nn}.wav")
    dados = json.load(open(entrada))
    fps = dados["fps"]
    total = dados["quadros"] / fps
    fases = {k: v / fps for k, v in dados["fases"].items()}

    musica = trilha(total, fases)
    amb = ambiente(total)
    seco = np.zeros(len(musica))
    molhado = np.zeros(len(musica))

    # limite de efeitos simultâneos: no máximo 6 tocando; os de menor prioridade saem
    ativos = []
    contagem = {}
    plim = 0
    for ev in dados["sons"]:
        nome = ev["s"]
        if nome not in SFX:
            continue
        t0 = ev["v"] / fps
        ativos = [a for a in ativos if a[1] > t0]
        prio = PRIORIDADE.get(nome, 6)
        if len(ativos) >= 6:
            menor = min(ativos, key=lambda a: a[2])
            if menor[2] >= prio:
                continue
            ativos.remove(menor)
        i = contagem.get(nome, 0)
        contagem[nome] = i + 1
        if nome == "plimSobe":
            x = SFX[nome](plim)
            plim += 1
        else:
            x = SFX[nome](i)
        x = x * ev["vol"]
        ativos.append((nome, t0 + len(x) / SR, prio))
        if nome in ECO:
            junta(molhado, x, t0)
        else:
            junta(seco, x, t0)

    sfx = seco + eco(molhado)
    # níveis: trilha ~ -20 dBFS RMS, efeitos ~4–6 dB acima, ambiente por baixo
    def rms(x):
        return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2)) if np.any(np.abs(x) > 1e-4) else 1

    musica *= 0.1 / rms(musica)
    sfx *= (0.1 * 10 ** (5 / 20)) / rms(sfx) * 0.55
    amb *= 0.6
    mix = musica + sfx + amb
    # estéreo leve: música um pouco aberta, efeitos ao centro
    esq = mix + lp_fft(musica, hi=3000) * 0.04
    dir_ = mix - lp_fft(musica, hi=3000) * 0.04
    st = np.stack([esq, dir_], axis=1)
    # limitador suave e normalização (o loudness final é feito no masterizar.sh)
    st = np.tanh(st * 1.1) / np.tanh(1.1)
    st = st / (np.max(np.abs(st)) or 1) * 0.89
    pcm = (st * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(saida), exist_ok=True)
    with wave.open(saida, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"✓ {saida} ({total:.1f} s, {sum(contagem.values())} efeitos)")


if __name__ == "__main__":
    main()
