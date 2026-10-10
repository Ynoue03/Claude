"""
Gera a trilha e os efeitos sonoros 8-bit da Arena (100% próprios, sem direito autoral de terceiros).

Uso:  python3 audio/gerar_chip.py
Saída: public/audio/musica-batalha.wav, public/audio/vitoria.wav e public/audio/sfx/*.wav
       (mono, 16 bits, 44,1 kHz)

Síntese no estilo de console antigo: onda quadrada (pulso), triângulo e ruído.
"""
import os
import wave

import numpy as np

SR = 44100
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "audio")
SFX = os.path.join(RAIZ, "sfx")
os.makedirs(SFX, exist_ok=True)
rng = np.random.default_rng(20)


def salvar(nome, x, pico=0.7):
    x = np.asarray(x, dtype=np.float64)
    m = np.max(np.abs(x)) or 1
    x = x / m * pico
    with wave.open(nome, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def t_(dur):
    return np.arange(int(SR * dur)) / SR


def _freq(freq, t):
    if not np.ndim(freq):
        return np.full(t.shape, float(freq))
    f = np.asarray(freq, dtype=np.float64)
    return np.resize(f, t.shape) if len(f) < len(t) else f[: len(t)]


def pulso(freq, dur, duty=0.5):
    t = t_(dur)
    f = _freq(freq, t)
    fase = np.cumsum(f) / SR
    return np.where((fase % 1) < duty, 1.0, -1.0)


def triangulo(freq, dur):
    t = t_(dur)
    f = _freq(freq, t)
    fase = np.cumsum(f) / SR
    return 2 * np.abs(2 * (fase % 1) - 1) - 1


def ruido(dur, passo=1):
    n = int(SR * dur)
    base = rng.uniform(-1, 1, n // passo + 1)
    return np.repeat(base, passo)[:n]


def env(n, a=0.002, d=0.1, s=0.0, total=None):
    """ataque linear + decaimento exponencial"""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))
    return np.maximum(e, s * (t < (total or 99)))


def varre(f0, f1, dur, curva=1.0):
    k = np.linspace(0, 1, int(SR * dur)) ** curva
    return f0 + (f1 - f0) * k


def nota(n):  # número MIDI → Hz
    return 440 * 2 ** ((n - 69) / 12)


# ---------------- EFEITOS ----------------
def efeitos():
    s = {}
    x = pulso(varre(900, 200, 0.09), 0.09, 0.25) * env(int(SR * 0.09), d=0.04)
    s["golpe"] = x + 0.6 * ruido(0.09, 3) * env(int(SR * 0.09), d=0.03)
    x = ruido(0.12, 6) * env(int(SR * 0.12), d=0.05)
    s["impacto"] = x + 0.7 * pulso(varre(220, 60, 0.12), 0.12) * env(int(SR * 0.12), d=0.05)
    x = ruido(0.25, 10) * env(int(SR * 0.25), d=0.1)
    s["impacto-forte"] = x + pulso(varre(160, 40, 0.25), 0.25) * env(int(SR * 0.25), d=0.12)
    a = pulso(varre(400, 1600, 0.08), 0.08, 0.125) * env(int(SR * 0.08), d=0.1)
    b = np.concatenate([pulso(nota(84), 0.06, 0.25), pulso(nota(88), 0.06, 0.25), pulso(nota(91), 0.16, 0.25) * env(int(SR * 0.16), d=0.08)])
    s["critico"] = np.concatenate([a, 0.8 * b, 0.6 * ruido(0.15, 8) * env(int(SR * 0.15), d=0.06)])
    s["erro"] = pulso(varre(500, 700, 0.07), 0.07, 0.125) * env(int(SR * 0.07), d=0.03) * 0.5
    s["flecha"] = ruido(0.12, 1) * env(int(SR * 0.12), a=0.03, d=0.04) * 0.6 + 0.3 * pulso(varre(1800, 900, 0.12), 0.12, 0.1) * env(int(SR * 0.12), d=0.05)
    s["magia"] = sum(pulso(varre(nota(76 + i * 4), nota(88 + i * 4), 0.22), 0.22, 0.25) * env(int(SR * 0.22), a=0.02, d=0.1) for i in range(3)) / 2
    s["fogo"] = ruido(0.35, 14) * env(int(SR * 0.35), a=0.03, d=0.15) + 0.5 * pulso(varre(300, 120, 0.35), 0.35) * env(int(SR * 0.35), d=0.12)
    s["explosao"] = ruido(0.7, 22) * env(int(SR * 0.7), a=0.005, d=0.28) + 0.8 * pulso(varre(120, 30, 0.7), 0.7) * env(int(SR * 0.7), d=0.25)
    s["trovao"] = ruido(0.6, 4) * env(int(SR * 0.6), a=0.002, d=0.22) * (1 + 0.5 * np.sign(np.sin(t_(0.6) * 60)))
    s["sopro"] = ruido(0.5, 5) * env(int(SR * 0.5), a=0.08, d=0.25)
    s["sagrado"] = sum(triangulo(nota(n), 0.6) * env(int(SR * 0.6), a=0.02, d=0.3) for n in (79, 83, 86, 91)) / 2
    s["cura"] = np.concatenate([pulso(nota(n), 0.07, 0.25) * env(int(SR * 0.07), d=0.08) for n in (72, 76, 79, 84, 88)])
    s["escudo"] = pulso(varre(1200, 1500, 0.18), 0.18, 0.5) * env(int(SR * 0.18), d=0.08) * 0.6
    s["zombaria"] = np.concatenate([pulso(nota(n), 0.08, 0.25) * env(int(SR * 0.08), d=0.06) for n in (79, 74, 79, 70)])
    s["furia"] = pulso(varre(80, 140, 0.4), 0.4, 0.5) * env(int(SR * 0.4), a=0.05, d=0.2) + 0.6 * ruido(0.4, 12) * env(int(SR * 0.4), a=0.05, d=0.18)
    s["buff"] = np.concatenate([pulso(nota(n), 0.06, 0.5) * env(int(SR * 0.06), d=0.1) for n in (67, 71, 74, 79)])
    s["atordoar"] = sum(pulso(nota(91 + i * 2) + 30 * np.sin(t_(0.4) * 40), 0.4, 0.25) * env(int(SR * 0.4), d=0.15) for i in range(2)) / 2
    s["derrota"] = np.concatenate([pulso(nota(n), 0.11, 0.5) * env(int(SR * 0.11), d=0.1) for n in (67, 63, 60)] + [pulso(varre(nota(55), nota(43), 0.4), 0.4, 0.5) * env(int(SR * 0.4), d=0.18)])
    s["queda"] = 0.8 * pulso(varre(180, 50, 0.1), 0.1) * env(int(SR * 0.1), d=0.04) + 0.4 * ruido(0.1, 10) * env(int(SR * 0.1), d=0.03)
    s["contagem"] = pulso(nota(72), 0.16, 0.5) * env(int(SR * 0.16), d=0.12)
    s["lutem"] = np.concatenate([pulso(nota(84), 0.5, 0.5) * env(int(SR * 0.5), d=0.25)]) + 0.5 * ruido(0.5, 18) * env(int(SR * 0.5), d=0.12)
    for nome, x in s.items():
        salvar(os.path.join(SFX, f"{nome}.wav"), x, 0.8)
    return list(s)


# ---------------- MÚSICA ----------------
BPM = 150


def musica(compassos=32):
    """Batalha em lá menor: baixo em triângulo, arpejo em pulso 12,5%, melodia em pulso 25%, bateria em ruído."""
    seminima = 60 / BPM
    colcheia = seminima / 2
    total = int(SR * compassos * 4 * seminima)
    out = np.zeros(total)

    def por(x, inicio):
        i = int(inicio * SR)
        n = min(len(x), total - i)
        if n > 0:
            out[i : i + n] += x[:n]

    # Am - F - C - G  /  Am - F - G - E
    progressao = [(57, [0, 3, 7]), (53, [0, 4, 7]), (48, [0, 4, 7]), (55, [0, 4, 7]), (57, [0, 3, 7]), (53, [0, 4, 7]), (55, [0, 4, 7]), (52, [0, 4, 7])]
    melodias = [
        [76, 0, 74, 76, 79, 0, 76, 74],
        [72, 0, 74, 72, 69, 0, 72, 0],
        [72, 74, 76, 0, 79, 81, 79, 76],
        [74, 0, 71, 74, 79, 0, 74, 0],
        [81, 0, 79, 81, 84, 0, 81, 79],
        [77, 0, 76, 74, 72, 0, 74, 76],
        [79, 0, 74, 79, 83, 0, 79, 0],
        [80, 0, 76, 80, 83, 0, 80, 76],
    ]
    for c in range(compassos):
        raiz, acorde = progressao[c % 8]
        ini = c * 4 * seminima
        # baixo (colcheias com oitava)
        for i in range(8):
            n = raiz - 12 + (12 if i % 2 else 0)
            por(0.55 * triangulo(nota(n), colcheia * 0.95) * env(int(SR * colcheia * 0.95), a=0.003, d=0.2, s=0.6, total=colcheia * 0.8), ini + i * colcheia)
        # arpejo (semicolcheias) — entra a partir do compasso 4
        if c >= 4:
            for i in range(16):
                n = raiz + 12 + acorde[i % 3] + (12 if i % 6 >= 3 else 0)
                por(0.12 * pulso(nota(n), colcheia / 2 * 0.9, 0.125) * env(int(SR * colcheia / 2 * 0.9), d=0.05), ini + i * colcheia / 2)
        # melodia — entra no compasso 8, descansa a cada 16
        if c >= 8 and (c // 8) % 2 == 1 or c >= 24:
            for i, n in enumerate(melodias[c % 8]):
                if n:
                    x = pulso(nota(n) * (1 + 0.004 * np.sin(t_(colcheia) * 30)), colcheia * 0.9, 0.25)
                    por(0.2 * x * env(len(x), a=0.004, d=0.18, s=0.5, total=colcheia * 0.7), ini + i * colcheia)
        # bateria
        for b in range(4):
            tb = ini + b * seminima
            por(0.5 * pulso(varre(150, 45, 0.09), 0.09) * env(int(SR * 0.09), d=0.04), tb if b in (0, 2) else tb + 99)
            if b in (1, 3):
                por(0.35 * ruido(0.12, 3) * env(int(SR * 0.12), d=0.05), tb)
            for h in range(2):
                por(0.09 * ruido(0.03, 1) * env(int(SR * 0.03), d=0.01), tb + h * colcheia)
    return out


def vitoria():
    seminima = 60 / 140
    out = np.zeros(int(SR * 3.2))
    seq = [(72, 0.5), (72, 0.5), (72, 0.5), (72, 1.5), (68, 1.5), (70, 1.5), (72, 1), (70, 0.5), (72, 3)]
    pos = 0.0
    for n, dur in seq:
        d_ = dur * seminima * 0.5
        x = 0.4 * pulso(nota(n), d_ * 0.95, 0.25) + 0.25 * pulso(nota(n - 12), d_ * 0.95, 0.5)
        x *= env(len(x), a=0.004, d=0.4, s=0.6, total=d_ * 0.85)
        i = int(pos * SR)
        out[i : i + len(x)] += x[: len(out) - i]
        pos += d_
    return out


if __name__ == "__main__":
    nomes = efeitos()
    salvar(os.path.join(RAIZ, "musica-batalha.wav"), musica(), 0.6)
    salvar(os.path.join(RAIZ, "vitoria.wav"), vitoria(), 0.7)
    print(f"✓ {len(nomes)} efeitos em public/audio/sfx/ + musica-batalha.wav + vitoria.wav")
