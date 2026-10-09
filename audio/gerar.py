"""
Gerador da identidade sonora — trilhas e efeitos 100% sintetizados (sem direito autoral de terceiros).

Uso:  python3 audio/gerar.py
Saída: remotion/public/audio/  e  hyperframes/assets/audio/  (mesmos arquivos)

Tudo é determinístico (sementes fixas): rodar de novo gera exatamente o mesmo som.
"""
import os
import shutil
import wave

import numpy as np

SR = 48000
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINOS = [os.path.join(RAIZ, "remotion/public/audio"), os.path.join(RAIZ, "hyperframes/assets/audio")]


# ───────────────────────── utilidades ─────────────────────────
def rng(seed):
    return np.random.default_rng(seed)


def tempo(dur):
    return np.arange(int(dur * SR)) / SR


def nota(n):
    """Nome → Hz. Ex.: 'A4' = 440, 'C#5', 'Eb3'."""
    nomes = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    base = nomes[n[0]]
    resto = n[1:]
    if resto.startswith("#"):
        base += 1
        resto = resto[1:]
    elif resto.startswith("b"):
        base -= 1
        resto = resto[1:]
    midi = base + 12 * (int(resto) + 1)
    return 440.0 * 2 ** ((midi - 69) / 12)


def filtro(x, lo=None, hi=None, ordem=2):
    """Passa-altas/baixas suave no domínio da frequência (Butterworth em magnitude)."""
    n = len(x)
    N = 1 << int(np.ceil(np.log2(n + 1)))
    X = np.fft.rfft(x, N)
    f = np.fft.rfftfreq(N, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (2 * ordem))
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-6)) ** (2 * ordem))
    return np.fft.irfft(X * g, N)[:n]


def filtro_variavel(x, corte_fn, tipo="lp", ordem=2, hop=512):
    """Filtro que muda com o tempo (STFT). corte_fn(t_segundos) -> Hz."""
    win = 2048
    janela = np.hanning(win)
    pad = np.concatenate([np.zeros(win), x, np.zeros(win)])
    saida = np.zeros_like(pad)
    norma = np.zeros_like(pad)
    f = np.fft.rfftfreq(win, 1 / SR)
    for i in range(0, len(pad) - win, hop):
        bloco = pad[i : i + win] * janela
        c = corte_fn(max(0.0, (i - win + win / 2) / SR))
        if tipo == "lp":
            g = 1 / np.sqrt(1 + (f / c) ** (2 * ordem))
        else:  # passa-banda centrado em c
            g = 1 / np.sqrt(1 + ((f - c) / (c * 0.6)) ** (2 * ordem))
        saida[i : i + win] += np.fft.irfft(np.fft.rfft(bloco) * g, win) * janela
        norma[i : i + win] += janela**2
    saida /= np.maximum(norma, 1e-6)
    return saida[win : win + len(x)]


def reverb(x, dur=2.4, mistura=0.25, brilho=5000, seed=7, cauda=False):
    """Reverb por convolução com resposta ao impulso sintética (estéreo).
    cauda=True estende o som para a reverberação terminar naturalmente (efeitos curtos)."""
    r = rng(seed)
    if cauda:
        extra = int(dur * 0.8 * SR)
        x = np.pad(x, [(0, 0), (0, extra)] if x.ndim == 2 else (0, extra))
    t = tempo(dur)
    env = np.exp(-t * 6.9 / dur)
    saida = []
    for canal in range(2):
        ir = filtro(r.standard_normal(len(t)) * env, hi=brilho)
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))  # pré-delay suave
        ir /= np.sqrt(np.sum(ir**2))
        seco = x[canal] if x.ndim == 2 else x
        n = len(seco) + len(ir) - 1
        N = 1 << int(np.ceil(np.log2(n)))
        molhado = np.fft.irfft(np.fft.rfft(seco, N) * np.fft.rfft(ir, N), N)[: len(seco)]
        saida.append(seco * (1 - mistura) + molhado * mistura * 1.6)
    return np.array(saida)


def estereo(x, pan=0.0):
    """Mono → estéreo com pan (-1 esquerda, +1 direita), lei de potência constante."""
    a = (pan + 1) * np.pi / 4
    return np.array([x * np.cos(a), x * np.sin(a)])


def colocar(buf, som, inicio):
    """Soma `som` (2×n) em `buf` a partir de `inicio` segundos."""
    i = int(inicio * SR)
    if i >= buf.shape[1]:
        return
    n = min(som.shape[1], buf.shape[1] - i)
    buf[:, i : i + n] += som[:, :n]


def normalizar(x, pico_db=-3.0):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (pico_db / 20)


def salvar(nome, x):
    x = np.clip(x, -1, 1)
    if nome.startswith("sfx/"):  # corta silêncio final (abaixo de -60 dB) com fade curto
        vivo = np.where(np.max(np.abs(x), axis=0) > 1e-3)[0]
        fim = min(x.shape[1], vivo[-1] + int(0.02 * SR))
        x = x[:, :fim]
        f = min(int(0.03 * SR), fim)
        x[:, -f:] *= np.linspace(1, 0, f)
    dados = (x.T * 32767).astype(np.int16)
    for d in DESTINOS:
        caminho = os.path.join(d, nome)
        os.makedirs(os.path.dirname(caminho), exist_ok=True)
        with wave.open(caminho, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(dados.tobytes())
    print(f"  {nome:28s} {x.shape[1] / SR:5.2f}s")


# ───────────────────────── instrumentos ─────────────────────────
def piano_eletrico(f, dur, vel=0.6):
    """Timbre tipo Rhodes: FM suave com índice que decai + leve tremolo."""
    t = tempo(dur + 1.2)
    ind = 1.6 * vel * np.exp(-t * 5)
    mod = np.sin(2 * np.pi * f * t) * ind
    tom = np.sin(2 * np.pi * f * t + mod) + 0.18 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
    env = np.minimum(t / 0.006, 1) * np.exp(-t * 1.1)
    solta = np.clip((dur + 0.25 - t) / 0.25, 0, 1)
    return tom * env * solta * (1 + 0.06 * np.sin(2 * np.pi * 4.5 * t)) * vel


def baixo(f, dur, vel=0.8):
    t = tempo(dur + 0.1)
    tom = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(t / 0.01, 1) * np.exp(-t * 1.8) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    return tom * env * vel


def pad(freqs, dur, seed=1):
    """Pad quente: osciladores levemente desafinados, ataque lento."""
    r = rng(seed)
    t = tempo(dur)
    x = np.zeros_like(t)
    for f in freqs:
        for d in (-0.07, 0.0, 0.07):
            fase = r.uniform(0, 2 * np.pi)
            ff = f * 2 ** (d / 12)
            for h, a in ((1, 1.0), (2, 0.35), (3, 0.15)):
                x += a * np.sin(2 * np.pi * ff * h * t + fase)
    env = np.minimum(t / 0.8, 1) * np.clip((dur - t) / 0.8, 0, 1)
    return filtro(x * env, hi=1800) / (len(freqs) * 3)


def bumbo(vel=1.0):
    t = tempo(0.45)
    f = 45 + 75 * np.exp(-t * 28)
    fase = 2 * np.pi * np.cumsum(f) / SR
    corpo = np.sin(fase) * np.exp(-t * 7)
    clique = filtro(rng(3).standard_normal(len(t)) * np.exp(-t * 300), hi=3000) * 0.15
    return (corpo + clique) * vel


def palma(seed, vel=0.5):
    """Palma/estalo suave: rajadas de ruído filtrado."""
    r = rng(seed)
    t = tempo(0.35)
    env = np.zeros_like(t)
    for k, d in enumerate((0, 0.008, 0.017)):
        env += np.exp(-np.maximum(t - d, 0) * (90 if k < 2 else 14)) * (t >= d)
    x = filtro(r.standard_normal(len(t)), lo=900, hi=4500) * env
    return x * vel


def chimbal(seed, vel=0.25, aberto=False):
    r = rng(seed)
    t = tempo(0.25 if aberto else 0.08)
    x = filtro(r.standard_normal(len(t)), lo=7000, hi=14000) * np.exp(-t * (14 if aberto else 70))
    return x * vel


def aro(seed, vel=0.4):
    """Aro de caixa (lo-fi): tom curto + ruído."""
    t = tempo(0.12)
    x = np.sin(2 * np.pi * 420 * t) * np.exp(-t * 60) + filtro(rng(seed).standard_normal(len(t)), lo=1500, hi=6000) * np.exp(-t * 45) * 0.6
    return x * vel


def marimba(f, vel=0.5):
    t = tempo(0.6)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.25 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 40)
    return x * np.minimum(t / 0.002, 1) * vel


def vinil(dur, seed=11):
    r = rng(seed)
    n = int(dur * SR)
    chiado = filtro(r.standard_normal(n), lo=800, hi=5000) * 0.012
    estalos = np.zeros(n)
    idx = r.choice(n, size=int(dur * 9), replace=False)
    estalos[idx] = r.uniform(-1, 1, len(idx)) * 0.35
    estalos = filtro(estalos, lo=1500, hi=9000)
    return chiado + estalos


# ───────────────────────── trilhas ─────────────────────────
def trilha(nome, bpm, acordes, estilo, compassos=16, seed=0, chave_baixo=None):
    """
    Trilha em loop: 1º compasso só harmonia (filtro abrindo), bateria entra no 2º.
    acordes: lista de listas de notas, um acorde por compasso (ciclando).
    """
    batida = 60 / bpm
    compasso = 4 * batida
    dur = compassos * compasso
    buf = np.zeros((2, int((dur + 2.5) * SR)))
    harm = np.zeros_like(buf)
    swing = 0.58 if estilo == "lofi" else 0.5

    def oitavo(b, k):  # posição do k-ésimo colcheia do compasso b, com swing
        base = b * compasso + (k // 2) * batida
        return base + (swing * batida if k % 2 else 0)

    for b in range(compassos):
        ac = acordes[b % len(acordes)]
        t0 = b * compasso
        # ── harmonia
        if estilo == "house":
            for pos, d in ((0, 1.2), (1.5, 0.45), (2.5, 1.0)):  # stabs sincopados
                for i, n in enumerate(ac):
                    colocar(harm, estereo(piano_eletrico(nota(n), d * batida, 0.45), (i - 1.5) * 0.25), t0 + pos * batida + i * 0.004)
        else:
            for i, n in enumerate(ac):  # acorde dedilhado sustentado
                colocar(harm, estereo(piano_eletrico(nota(n), compasso * 0.92, 0.5), (i - 1.5) * 0.3), t0 + i * 0.018)
        if estilo == "pop":  # arpejo de marimba em colcheias
            for k in range(8):
                n = ac[[0, 2, 1, 3, 2, 1, 3, 2][k] % len(ac)]
                colocar(harm, estereo(marimba(nota(n) * 2, 0.22), [-0.4, 0.4][k % 2]), oitavo(b, k))
        colocar(harm, estereo(pad([nota(n) for n in ac], compasso + 0.6, seed + b), 0) * 0.55, t0)

        # ── baixo
        raiz = nota(chave_baixo[b % len(chave_baixo)]) if chave_baixo else nota(ac[0]) / 2
        if estilo == "house":
            for k in range(4):
                colocar(buf, estereo(baixo(raiz, batida * 0.4, 0.7)), t0 + (k + 0.5) * batida)
        else:
            colocar(buf, estereo(baixo(raiz, batida * 1.7, 0.75)), t0)
            colocar(buf, estereo(baixo(raiz * (1.5 if estilo == "lofi" else 1), batida * 1.4, 0.6)), t0 + 2.5 * batida)

        if b == 0:
            continue  # bateria entra no 2º compasso
        # ── bateria
        if estilo == "house":
            for k in range(4):
                colocar(buf, estereo(bumbo(0.75)), t0 + k * batida)
            for k in (1, 3):
                colocar(buf, estereo(palma(seed + b * 4 + k, 0.35), 0.1), t0 + k * batida)
            for k in range(4):
                colocar(buf, estereo(chimbal(seed + b * 8 + k, 0.22, aberto=True), 0.25), t0 + (k + 0.5) * batida)
            for k in range(16):
                colocar(buf, estereo(chimbal(seed + b * 16 + k, 0.06), -0.3), t0 + k * batida / 4)
        elif estilo == "lofi":
            for pos in (0, 1.75, 2.5):
                colocar(buf, estereo(bumbo(0.7)), t0 + pos * batida)
            for k in (1, 3):
                colocar(buf, estereo(aro(seed + b * 4 + k, 0.4), 0.15), t0 + k * batida + 0.012)
            for k in range(8):
                colocar(buf, estereo(chimbal(seed + b * 8 + k, 0.13 if k % 2 == 0 else 0.08), -0.25), oitavo(b, k))
        else:  # pop
            for pos in (0, 2.5):
                colocar(buf, estereo(bumbo(0.7)), t0 + pos * batida)
            for k in (1, 3):
                colocar(buf, estereo(palma(seed + b * 4 + k, 0.3), -0.1), t0 + k * batida)
            for k in range(8):
                colocar(buf, estereo(chimbal(seed + b * 8 + k, 0.1), 0.3), oitavo(b, k))

    # filtro abrindo no 1º compasso (entrada "abafada" → clara)
    corte = lambda s: 500 * (16000 / 500) ** min(1.0, s / (compasso * 1.15))
    for c in range(2):
        harm[c] = filtro_variavel(harm[c], corte)
    mix = reverb(harm, dur=2.6, mistura=0.28) + reverb(buf, dur=1.2, mistura=0.12, seed=9)
    if estilo == "lofi":
        mix = np.array([filtro(mix[c], lo=40, hi=7000) for c in range(2)]) + estereo(vinil(mix.shape[1] / SR)) * 0.9
    else:
        mix = np.array([filtro(mix[c], lo=35, hi=15000) for c in range(2)])
    mix = mix[:, : int(dur * SR)]
    # emenda do loop: cauda curta para não estalar
    f = int(0.05 * SR)
    mix[:, -f:] *= np.linspace(1, 0, f)
    salvar(f"musica/{nome}.wav", normalizar(np.tanh(mix / np.max(np.abs(mix)) * 1.3), -6))


# ───────────────────────── efeitos ─────────────────────────
def sfx_transicao(seed=21):
    """Whoosh de ar + grave suave. Pico do whoosh em 0,45 s (alinhar ao meio do corte)."""
    r = rng(seed)
    dur, pico = 0.95, 0.45
    t = tempo(dur)
    env = np.where(t < pico, (t / pico) ** 2.2, np.exp(-(t - pico) * 9))
    ruido = r.standard_normal(len(t))
    centro = lambda s: 350 + 2600 * np.exp(-(((s - pico) / 0.18) ** 2))
    whoosh = filtro_variavel(ruido, centro, tipo="bp", ordem=1) * env
    pan = np.clip((t - pico) / 0.35, -1, 1) * 0.6
    st = np.array([whoosh * np.cos((pan + 1) * np.pi / 4), whoosh * np.sin((pan + 1) * np.pi / 4)])
    tt = np.maximum(t - pico, 0)
    f = 38 + 50 * np.exp(-tt * 20)
    grave = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7) * (t >= pico) * 0.9
    st = normalizar(st, -6) + estereo(grave) * 0.35
    return normalizar(reverb(st, dur=1.4, mistura=0.22, seed=seed, cauda=True), -3)


def sfx_ar(seed=31):
    """Sopro curto e aéreo — entrada de título."""
    t = tempo(0.6)
    env = np.sin(np.pi * np.clip(t / 0.5, 0, 1)) ** 2
    x = filtro_variavel(rng(seed).standard_normal(len(t)), lambda s: 2500 + 5000 * s, tipo="bp", ordem=1) * env
    return normalizar(reverb(estereo(x, -0.2), dur=1.0, mistura=0.3, seed=seed, cauda=True), -3)


def sfx_tique(f):
    """Toque de madeira afinado (marimba) — itens de lista sobem em escala pentatônica."""
    x = marimba(f, 1.0)
    return normalizar(reverb(estereo(x, 0.1), dur=1.2, mistura=0.25, brilho=6000, cauda=True), -3)


def sfx_bolha(f0):
    """Pop arredondado (bolha) — marcadores de ingredientes."""
    t = tempo(0.25)
    f = f0 * (1 + 1.4 * (1 - np.exp(-t * 60)))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28) * np.minimum(t / 0.002, 1)
    return normalizar(reverb(estereo(x, -0.1), dur=0.8, mistura=0.2, cauda=True), -3)


def sfx_escrita(seed=41, dur=0.55):
    """Lápis riscando — acompanha o sublinhado à mão."""
    r = rng(seed)
    t = tempo(dur)
    # traços irregulares: envelope aleatório suavizado (cada risco tem força diferente)
    bruto = np.repeat(r.uniform(0.2, 1.0, int(dur * 14) + 2), SR // 14)[: len(t)]
    tracos = filtro(bruto, hi=18) + 0.15
    env = np.minimum(t / 0.03, 1) * np.clip((dur - t) / 0.08, 0, 1) * tracos
    x = filtro(r.standard_normal(len(t)), lo=2500, hi=7500) * env
    return normalizar(reverb(estereo(x, 0.2), dur=0.6, mistura=0.12, cauda=True), -3)


def sfx_salvar():
    """Clique duplo macio + nota curta — ícone de 'salvar'."""
    t = tempo(0.5)
    x = np.zeros_like(t)
    for d, f in ((0.0, 2100), (0.07, 2600)):
        tt = np.maximum(t - d, 0)
        x += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 120) * (t >= d)
    tt = np.maximum(t - 0.09, 0)
    x += 0.5 * np.sin(2 * np.pi * nota("E6") * tt) * np.exp(-tt * 14) * (t >= 0.09)
    return normalizar(reverb(estereo(x), dur=0.9, mistura=0.2, cauda=True), -3)


def sfx_sino(notas, seed=51):
    """Sino FM com cauda longa — fecho do vídeo (afinado com a trilha)."""
    t = tempo(3.2)
    x = np.zeros_like(t)
    for i, n in enumerate(notas):
        f = nota(n)
        ind = 2.2 * np.exp(-t * 2.5)
        x += np.sin(2 * np.pi * f * t + ind * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t * (1.4 + i * 0.3))
    x *= np.minimum(t / 0.003, 1)
    return normalizar(reverb(estereo(x), dur=2.8, mistura=0.35, seed=seed, cauda=True), -3)


def sfx_brilho(seed=61, dur=1.8):
    """Cintilar que sobe — preenchimento do anel de calorias."""
    r = rng(seed)
    t = tempo(dur + 0.6)
    x = np.zeros((2, len(t)))
    for k in range(38):
        ini = (k / 38) ** 0.8 * dur
        f = nota("C6") * 2 ** (r.choice([0, 2, 4, 7, 9, 12, 14, 16]) / 12)
        tt = tempo(0.4)
        g = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18) * (0.3 + 0.7 * k / 38)
        colocar(x, estereo(g, r.uniform(-0.7, 0.7)), ini)
    return normalizar(reverb(x, dur=1.6, mistura=0.35, seed=seed, cauda=True), -3)


def sfx_cartao(seed=71):
    """Papel deslizando + toque leve — cartões entrando."""
    r = rng(seed)
    t = tempo(0.4)
    env = np.sin(np.pi * np.clip(t / 0.28, 0, 1)) ** 1.5
    x = filtro(r.standard_normal(len(t)), lo=600, hi=3200) * env
    tt = np.maximum(t - 0.26, 0)
    x += 0.4 * np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 70) * (t >= 0.26)
    return normalizar(reverb(estereo(x, 0.15), dur=0.7, mistura=0.15, cauda=True), -3)


if __name__ == "__main__":
    print("Trilhas:")
    # Treino: deep house suave, 112 BPM — energia sem agressividade (Am)
    trilha("treino-house", 112, [["F3", "A3", "C4", "E4"], ["G3", "B3", "D4", "E4"], ["E3", "G3", "B3", "D4"], ["A3", "C4", "E4", "G4"]],
           "house", seed=100, chave_baixo=["F2", "G2", "E2", "A2"])
    # Receita: lo-fi jazzístico, 84 BPM com swing — clima de cozinha calma (C)
    trilha("receita-lofi", 84, [["D3", "F3", "A3", "C4", "E4"], ["G3", "B3", "D4", "F4", "A4"], ["C3", "E3", "G3", "B3", "D4"], ["A3", "C#4", "E4", "G4"]],
           "lofi", seed=200, chave_baixo=["D2", "G2", "C2", "A2"])
    # Pré-treino: pop leve com marimba, 100 BPM — ânimo de manhã (C)
    trilha("pre-treino-pop", 100, [["A3", "C4", "E4", "G4"], ["F3", "A3", "C4", "E4"], ["C4", "E4", "G4", "B4"], ["G3", "B3", "D4", "E4"]],
           "pop", seed=300, chave_baixo=["A2", "F2", "C2", "G2"])

    print("Efeitos:")
    salvar("sfx/transicao.wav", sfx_transicao())
    salvar("sfx/ar.wav", sfx_ar())
    for i, n in enumerate(["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6"]):
        salvar(f"sfx/tique-{i + 1}.wav", sfx_tique(nota(n)))
    for i, f in enumerate([420, 470, 520, 580, 650, 720, 800, 880]):
        salvar(f"sfx/bolha-{i + 1}.wav", sfx_bolha(f))
    salvar("sfx/escrita.wav", sfx_escrita())
    salvar("sfx/salvar.wav", sfx_salvar())
    salvar("sfx/sino-treino.wav", sfx_sino(["A5", "E6", "C7"]))
    salvar("sfx/sino-receita.wav", sfx_sino(["C6", "G6", "E7"]))
    salvar("sfx/brilho.wav", sfx_brilho())
    salvar("sfx/cartao.wav", sfx_cartao())
