"""
Áudio do ANIME PIXEL ARENA — trilha chiptune e efeitos 8/16 bits, 100% sintetizados (sem direito autoral).

Uso:  python3 audio/arena.py deixas.json saida.wav
      (deixas.json vem da simulação: scripts/arena.sh faz tudo de uma vez)

A trilha segue a linha do tempo do vídeo: intro → batalha (144 BPM) → duelo final mais intenso
(168 BPM, um tom acima) → jingle de vitória → fecho calmo. Cada deixa da simulação (golpe, dano,
derrota, contagem…) vira um efeito, com limite de vozes simultâneas. Determinístico.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
RNG = np.random.default_rng(140)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env(n, a=0.005, d=0.0, s=1.0, r=0.03):
    """ADSR em amostras (a, d, r em segundos)."""
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na, endpoint=False) if na else e[:na]
    if nd:
        e[na : na + nd] = np.linspace(1, s, len(e[na : na + nd]))
    if nr and n > nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def pulso(freq, dur, duty=0.5):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (int(dur * SR),))
    fase = np.cumsum(f) / SR
    return np.where((fase % 1.0) < duty, 1.0, -1.0)


def tri(freq, dur, bits=4):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (int(dur * SR),))
    fase = np.cumsum(f) / SR
    x = 4 * np.abs((fase % 1.0) - 0.5) - 1
    q = 2 ** bits / 2
    return np.round(x * q) / q  # degraus de 4 bits, como o NES


def ruido(dur, periodo=1):
    """Ruído "LFSR": amostra-e-segura a cada `periodo` amostras (maior = mais grave/metálico)."""
    n = int(dur * SR)
    base = RNG.uniform(-1, 1, n // periodo + 2)
    return np.repeat(base, periodo)[:n]




def lp(x, corte):
    """Passa-baixa via FFT (rápido)."""
    n = len(x)
    N = 1 << int(np.ceil(np.log2(n + 1)))
    X = np.fft.rfft(x, N)
    f = np.fft.rfftfreq(N, 1 / SR)
    X *= 1 / np.sqrt(1 + (f / corte) ** 4)
    return np.fft.irfft(X, N)[:n]


def hp(x, corte):
    n = len(x)
    N = 1 << int(np.ceil(np.log2(n + 1)))
    X = np.fft.rfft(x, N)
    f = np.fft.rfftfreq(N, 1 / SR)
    X *= 1 / np.sqrt(1 + (corte / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, N)[:n]


def norm(x, pico=1.0):
    m = np.max(np.abs(x)) or 1
    return x / m * pico


def somar(buf, x, ini, ganho=1.0):
    i = int(ini * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x = x[-i:]
        i = 0
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i] * ganho


# ───────────────────────── efeitos ─────────────────────────
def sfx_passo(tom=0):
    d = 0.035
    return lp(ruido(d, 6), 1800 + 400 * tom) * env(int(d * SR), 0.001, r=0.03)


def sfx_pop(tom=0):
    d = 0.07
    f = np.linspace(500, 1100, int(d * SR)) * 2 ** (tom / 12)
    return pulso(f, d, 0.25) * env(int(d * SR), 0.001, r=0.04) * 0.6


def sfx_blip():
    d = 0.09
    return pulso(mtof(88), d, 0.25) * env(int(d * SR), 0.001, r=0.05) * 0.7


def sfx_banner():
    a = pulso(mtof(81), 0.07, 0.25) * env(int(0.07 * SR), 0.001, r=0.02)
    b = pulso(mtof(88), 0.16, 0.25) * env(int(0.16 * SR), 0.001, r=0.1)
    return np.concatenate([a, b]) * 0.7


def sfx_conta():
    d = 0.32
    return pulso(mtof(69), d, 0.5) * env(int(d * SR), 0.002, r=0.12) * 0.7


def sfx_fight():
    d = 0.9
    n = int(d * SR)
    acorde = sum(pulso(mtof(m), d, 0.5) for m in (81, 85, 88)) / 3
    sweep = pulso(np.linspace(300, 1200, n), d, 0.25) * np.exp(-t_(d) * 6)
    batida = lp(ruido(d, 2), 3000) * np.exp(-t_(d) * 9)
    return (acorde * env(n, 0.002, r=0.5) * 0.8 + sweep * 0.3 + batida * 0.6)


def sfx_carga(tom=0):
    d = 0.42
    n = int(d * SR)
    f = np.geomspace(180, 900, n) * 2 ** (tom / 12)
    vib = 1 + 0.03 * np.sin(2 * np.pi * 28 * t_(d))
    return pulso(f * vib, d, 0.125) * env(n, 0.02, r=0.05) * np.linspace(0.3, 0.8, n)


def sfx_feixe():
    d = 0.75
    n = int(d * SR)
    f = np.linspace(110, 70, n)
    zumbido = pulso(f, d, 0.5) * 0.6 + pulso(f * 2.01, d, 0.25) * 0.4
    sopro = hp(ruido(d, 1), 900) * 0.5
    return (zumbido + sopro) * env(n, 0.01, r=0.25) * (1 + 0.2 * np.sin(2 * np.pi * 18 * t_(d)))


def sfx_explosao():
    d = 0.9
    n = int(d * SR)
    corpo = lp(ruido(d, 3), 1400) * np.exp(-t_(d) * 4.5)
    thump = np.sin(2 * np.pi * np.cumsum(np.geomspace(140, 40, n)) / SR) * np.exp(-t_(d) * 8)
    return corpo * 0.9 + thump * 0.8


def sfx_corte():
    d = 0.2
    n = int(d * SR)
    swish = hp(ruido(d, 1), 2500) * np.sin(np.linspace(0, np.pi, n)) ** 2
    ping = pulso(mtof(100), d, 0.125) * np.exp(-t_(d) * 25) * 0.35
    return swish * 0.9 + ping


def sfx_agua():
    d = 0.45
    out = np.zeros(int(d * SR))
    for k in range(5):
        dd = 0.06
        f = np.linspace(400 + 120 * k, 1200 + 150 * k, int(dd * SR))
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(int(dd * SR), 0.003, r=0.03)
        somar(out, b * 0.6, k * 0.07)
    return out + lp(ruido(d, 2), 1500) * np.exp(-t_(d) * 5) * 0.4


def sfx_raio():
    d = 0.45
    n = int(d * SR)
    gate = np.repeat(RNG.uniform(0, 1, n // 400 + 1) > 0.45, 400)[:n]
    estalo = hp(ruido(d, 1), 1500) * gate
    zap = pulso(np.geomspace(1800, 300, n), d, 0.5) * 0.4
    return (estalo * 0.8 + zap) * np.exp(-t_(d) * 4)


def sfx_gelo():
    d = 0.5
    out = np.zeros(int(d * SR))
    for k, m in enumerate((96, 100, 103, 108, 103)):
        dd = 0.12
        b = tri(mtof(m), dd, 5) * np.exp(-t_(dd) * 25)
        somar(out, b * 0.6, k * 0.06)
    return out + hp(ruido(d, 1), 5000) * np.exp(-t_(d) * 8) * 0.3


def sfx_fogo():
    d = 0.7
    n = int(d * SR)
    flick = 0.6 + 0.4 * np.repeat(RNG.uniform(0, 1, n // 1200 + 1), 1200)[:n]
    return lp(ruido(d, 2), 2200) * flick * env(n, 0.03, r=0.3) * 0.9


def sfx_soco():
    d = 0.18
    n = int(d * SR)
    corpo = pulso(np.geomspace(220, 60, n), d, 0.5) * np.exp(-t_(d) * 18)
    clique = lp(ruido(d, 1), 6000) * np.exp(-t_(d) * 60)
    return corpo * 0.8 + clique * 0.7


def sfx_esfera():
    d = 0.5
    n = int(d * SR)
    vib = 1 + 0.08 * np.sin(2 * np.pi * 22 * t_(d))
    return pulso(np.linspace(300, 520, n) * vib, d, 0.25) * env(n, 0.01, r=0.15) * 0.7


def sfx_escudo():
    d = 0.55
    out = np.zeros(int(d * SR))
    for k, m in enumerate((84, 88, 91, 96)):
        b = tri(mtof(m), 0.3, 5) * env(int(0.3 * SR), 0.01, r=0.2)
        somar(out, b * 0.5, k * 0.05)
    return out


def sfx_hit():
    d = 0.13
    n = int(d * SR)
    return lp(ruido(d, 2), 4000) * np.exp(-t_(d) * 30) * 0.8 + pulso(np.geomspace(500, 120, n), d, 0.5) * np.exp(-t_(d) * 25) * 0.5


def sfx_miss():
    d = 0.22
    n = int(d * SR)
    return lp(hp(ruido(d, 1), 600), 3000) * np.sin(np.linspace(0, np.pi, n)) * 0.5


def sfx_hpbaixo():
    a = pulso(mtof(93), 0.08, 0.5) * env(int(0.08 * SR), 0.001, r=0.02)
    return np.concatenate([a, np.zeros(int(0.06 * SR)), a]) * 0.5


def sfx_derrota():
    out = np.zeros(int(0.75 * SR))
    for k, m in enumerate((84, 79, 76, 72, 67, 60)):
        b = pulso(mtof(m), 0.11, 0.25) * env(int(0.11 * SR), 0.002, r=0.04)
        somar(out, b * 0.7, k * 0.09)
    return out


def sfx_zoom():
    d = 0.7
    n = int(d * SR)
    w = lp(hp(ruido(d, 1), 300), 4000) * np.linspace(0.1, 1, n) ** 2
    s = pulso(np.geomspace(150, 900, n), d, 0.125) * 0.25 * np.linspace(0, 1, n)
    return (w * 0.7 + s) * env(n, 0.01, r=0.08)


def sfx_fanfarra():
    d = 1.6
    return hp(ruido(d, 1), 3000) * np.exp(-t_(d) * 2.5) * 0.45  # prato do jingle


SFX = {
    "passo": sfx_passo, "pop": sfx_pop, "blip": sfx_blip, "banner": sfx_banner, "conta": sfx_conta,
    "fight": sfx_fight, "carga": sfx_carga, "feixe": sfx_feixe, "explosao": sfx_explosao,
    "corte": sfx_corte, "agua": sfx_agua, "raio": sfx_raio, "gelo": sfx_gelo, "fogo": sfx_fogo,
    "soco": sfx_soco, "esfera": sfx_esfera, "escudo": sfx_escudo, "hit": sfx_hit, "miss": sfx_miss,
    "hpbaixo": sfx_hpbaixo, "derrota": sfx_derrota, "zoom": sfx_zoom, "fanfarra": sfx_fanfarra,
}
COM_TOM = {"passo", "pop", "carga"}

# ───────────────────────── trilha ─────────────────────────
# Lá menor: Am F C G | Am F G E  (fundamentais MIDI e tríades)
ACORDES = [(45, (0, 3, 7)), (41, (0, 4, 7)), (48, (0, 4, 7)), (43, (0, 4, 7)),
           (45, (0, 3, 7)), (41, (0, 4, 7)), (43, (0, 4, 7)), (40, (0, 4, 7))]
# melodia: por compasso, (início em 16 avos, duração em 16 avos, nota MIDI)
MELODIA = [
    [(0, 4, 69), (4, 2, 72), (6, 2, 76), (8, 4, 74), (12, 4, 72)],
    [(0, 4, 69), (4, 2, 65), (6, 2, 69), (8, 6, 72), (14, 2, 69)],
    [(0, 4, 67), (4, 2, 64), (6, 2, 67), (8, 4, 72), (12, 4, 76)],
    [(0, 6, 74), (6, 2, 71), (8, 4, 67), (12, 4, 71)],
    [(0, 2, 69), (2, 2, 72), (4, 2, 76), (6, 2, 81), (8, 4, 79), (12, 4, 76)],
    [(0, 4, 77), (4, 2, 76), (6, 2, 72), (8, 8, 69)],
    [(0, 4, 71), (4, 4, 74), (8, 4, 79), (12, 4, 77)],
    [(0, 6, 76), (6, 2, 74), (8, 4, 71), (12, 4, 68)],
]


class Trilha:
    def __init__(self, dur):
        self.L = np.zeros(int(dur * SR) + SR)
        self.R = np.zeros_like(self.L)

    def nota(self, onda, ini, dur, ganho, pan=0.0):
        somar(self.L, onda, ini, ganho * (1 - max(0, pan)))
        somar(self.R, onda, ini, ganho * (1 + min(0, pan)))

    def secao(self, t0, t1, bpm, transp=0, modo="cheio", compasso0=0):
        s16 = 60 / bpm / 4
        bar = s16 * 16
        nb = int(np.ceil((t1 - t0) / bar))
        for b in range(nb):
            tb = t0 + b * bar
            if tb >= t1:
                break
            k = (compasso0 + b) % 8
            frase = ((compasso0 + b) // 8)
            raiz, tri_ = ACORDES[k]
            raiz += transp
            pausa = modo == "intro" or (modo == "cheio" and frase % 4 == 2)  # respiro a cada 4 frases
            # baixo (triângulo) em colcheias, oitavas alternadas
            for e in range(8):
                ti = tb + e * 2 * s16
                if ti >= t1:
                    break
                m = raiz + (12 if e % 2 else 0)
                if modo == "intro" and e % 2:
                    continue
                self.nota(tri(mtof(m), s16 * 1.8) * env(int(s16 * 1.8 * SR), 0.003, r=0.02), ti, 1, 0.55)
            # arpejo (pulso 12,5 %) em semicolcheias
            for e in range(16):
                ti = tb + e * s16
                if ti >= t1:
                    break
                m = raiz + 24 + tri_[e % 3] + (12 if (e // 3) % 2 and modo == "duelo" else 0)
                o = pulso(mtof(m), s16 * 0.9, 0.125) * env(int(s16 * 0.9 * SR), 0.002, r=0.02)
                self.nota(o, ti, 1, 0.13 if modo != "intro" else 0.08 + 0.1 * (ti - t0) / max(0.1, t1 - t0), -0.35)
            # bateria
            if modo != "intro":
                for e in range(16):
                    ti = tb + e * s16
                    if ti >= t1:
                        break
                    bumbo = e in (0, 8, 10) if modo == "cheio" else e % 4 == 0
                    if pausa:
                        bumbo = e == 0
                    if bumbo:
                        d = 0.12
                        f = np.geomspace(160, 45, int(d * SR))
                        self.nota(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_(d) * 25), ti, 1, 0.8)
                    if e in (4, 12) and not pausa:
                        d = 0.14
                        self.nota(lp(ruido(d, 2), 5000) * np.exp(-t_(d) * 22), ti, 1, 0.45)
                    hat = e % 2 == 0 if modo == "cheio" else True
                    if hat and not (pausa and e % 4):
                        d = 0.03
                        self.nota(hp(ruido(d, 1), 7000) * np.exp(-t_(d) * 120), ti, 1, 0.22 if e % 4 else 0.3, 0.4)
            # melodia (pulso 50 %, com eco)
            if not pausa and modo != "intro":
                oit = 12 if (modo == "duelo" or frase % 4 == 3) else 0
                for (ini, dur, m) in MELODIA[k]:
                    ti = tb + ini * s16
                    if ti >= t1:
                        break
                    dd = dur * s16 * 0.92
                    vib = 1 + 0.006 * np.sin(2 * np.pi * 6 * t_(dd)) * np.clip(t_(dd) / 0.15, 0, 1)
                    o = pulso(mtof(m + transp + oit) * vib, dd, 0.5 if modo == "cheio" else 0.25)
                    o = o * env(len(o), 0.004, 0.08, 0.7, 0.03)
                    self.nota(o, ti, 1, 0.2)
                    self.nota(o, ti + 3 * s16, 1, 0.06, 0.5)

    def jingle(self, t0):
        """Fanfarra de vitória em Dó maior (~4 s)."""
        bpm = 150
        b = 60 / bpm
        seq = [(0, 1 / 3, 72), (1 / 3, 1 / 3, 76), (2 / 3, 1 / 3, 79), (1, 1.5, 84),
               (2.5, 0.5, 79), (3, 0.5, 81), (3.5, 0.5, 83), (4, 2.5, 84)]
        for ini, dur, m in seq:
            dd = dur * b * 0.95
            for oit, g, duty in ((0, 0.24, 0.5), (-12, 0.12, 0.25)):
                o = pulso(mtof(m + oit), dd, duty) * env(int(dd * SR), 0.004, 0.1, 0.75, 0.08)
                self.nota(o, t0 + ini * b, 1, g)
        for ini, dur, raiz in ((0, 1, 48), (1, 1.5, 48), (2.5, 1.5, 43), (4, 2.5, 48)):
            for i in range(int(dur * 2)):
                self.nota(tri(mtof(raiz + (12 if i % 2 else 0)), b * 0.45), t0 + (ini + i * 0.5) * b, 1, 0.5)
        for ini in (0, 1, 2.5, 4):
            d = 0.12
            f = np.geomspace(160, 45, int(d * SR))
            self.nota(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_(d) * 25), t0 + ini * b, 1, 0.8)
        return t0 + 6.5 * b

    def fecho(self, t0, t1):
        """Arpejo calmo em Dó maior até o fim."""
        s = 60 / 100 / 4
        notas = [60, 64, 67, 72, 67, 64]
        k = 0
        t = t0
        while t < t1:
            raiz = [0, -3, 5, -5][int((t - t0) / (s * 16)) % 4]
            m = notas[k % len(notas)] + raiz + 12
            o = tri(mtof(m), s * 1.6, 5) * env(int(s * 1.6 * SR), 0.003, r=0.08)
            self.nota(o, t, 1, 0.25, 0.3 if k % 2 else -0.3)
            k += 1
            t += s


def gerar(deixas, saida):
    fps = deixas["fps"]
    dur = deixas["quadros"] / fps
    T = {k: v / fps for k, v in deixas["marcos"].items()}
    fim_duelo = deixas["fimDuelo"] / fps

    # trilha
    tr = Trilha(dur)
    tr.secao(0, T["luta"], 144, 0, "intro")
    tr.secao(T["luta"], T["duelo"], 144, 0, "cheio")
    tr.secao(T["duelo"], min(T["vencedor"], fim_duelo + 0.9), 168, 2, "duelo")
    fim_j = tr.jingle(T["vencedor"])
    tr.fecho(fim_j - 0.2, dur)
    mus = np.stack([tr.L, tr.R])[:, : int(dur * SR)]
    tt = np.arange(mus.shape[1]) / SR
    # recua no fecho (CTA) e silencia entre o fim do duelo e o jingle
    g = np.ones_like(tt)
    g *= np.interp(tt, [T["cta"] - 0.3, T["cta"] + 0.5], [1, 0.55])
    g *= np.interp(tt, [dur - 1.2, dur], [1, 0])
    g *= np.interp(tt, [0, 0.4], [0.3, 1])
    mus *= g

    # efeitos com limite de vozes
    sfx = np.zeros(mus.shape[1] + SR)
    ativos = []  # (fim, prio)
    ultimo = {}
    cache = {}
    usados = 0
    for c in sorted(deixas["cues"], key=lambda c: (c["f"], -c["prio"])):
        t0 = c["f"] / fps
        som = c["som"]
        if som not in SFX:
            continue
        if t0 - ultimo.get(som, -9) < (0.12 if som == "passo" else 0.05):
            continue
        ativos = [a for a in ativos if a[0] > t0]
        if som != "passo":
            if len(ativos) >= 4 and c["prio"] < max(5, min(a[1] for a in ativos)):
                continue
        elif len(ativos) >= 2:
            continue
        chave = (som, c.get("tom", 0) if som in COM_TOM else 0)
        if chave not in cache:
            x = SFX[som](c.get("tom", 0)) if som in COM_TOM else SFX[som]()
            cache[chave] = norm(x)
        x = cache[chave]
        somar(sfx, x, t0, c["vol"] * (0.35 if som == "passo" else 1.0))
        ultimo[som] = t0
        if som != "passo":
            ativos.append((t0 + len(x) / SR, c["prio"]))
        usados += 1
    sfx = sfx[: mus.shape[1]]

    # equilíbrio: acentos ~5 dB acima da trilha (RMS dos trechos com efeito vs. trilha)
    jan = SR // 10
    n = len(sfx) // jan
    rms_s = np.sqrt((sfx[: n * jan].reshape(n, jan) ** 2).mean(1))
    rms_m = np.sqrt((mus.mean(0)[: n * jan].reshape(n, jan) ** 2).mean(1))
    ativos_s = rms_s[rms_s > rms_s.max() * 0.05]
    alvo = np.percentile(ativos_s, 75) if len(ativos_s) else 1
    base_m = np.median(rms_m[rms_m > 0]) or 1
    ganho_m = alvo / base_m / (10 ** (5 / 20))
    mix = mus * ganho_m + sfx[None, :]
    # limitador suave e pico em -1 dBFS (a masterização final ajusta o volume em -14 LUFS)
    mix = np.tanh(mix / (np.max(np.abs(mix)) * 0.7))
    mix = mix / np.max(np.abs(mix)) * 10 ** (-1 / 20)
    pcm = (mix.T * 32767).astype(np.int16)
    with wave.open(saida, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"✓ {saida}  ({dur:.1f} s, {usados} efeitos tocados de {len(deixas['cues'])} deixas)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    gerar(json.load(open(sys.argv[1])), sys.argv[2])
