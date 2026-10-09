"""
Analisa um vídeo de referência ("vídeo modelo") e gera uma ficha técnica para replicar o estilo.

Uso:  python3 scripts/analisar-modelo.py caminho/do/video.mp4 [pasta_saida]
Saída (padrão: modelos/<nome>/):
  ficha.md        — duração, formato, cortes, ritmo, BPM estimado, loudness, picos de efeito
  quadros.png     — folha de contato com um quadro de cada cena
  onda.png        — forma de onda do áudio com os cortes marcados

Requer: ffmpeg/ffprobe e numpy.
"""
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np


def rodar(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def info(video):
    r = rodar(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", video])
    d = json.loads(r.stdout)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    num, den = (v["r_frame_rate"].split("/") if v else ("0", "1"))
    return {
        "duracao": float(d["format"]["duration"]),
        "largura": int(v["width"]) if v else 0,
        "altura": int(v["height"]) if v else 0,
        "fps": round(int(num) / max(int(den), 1), 2),
        "tem_audio": a is not None,
    }


def cortes(video, fps=10, janela=0.5):
    """
    Detecta trocas de cena, secas ou graduais (fade, slide, blur), comparando cada quadro com o de
    `janela` s antes. Um corte é um pico local (±1 s) bem acima da mudança típica do vídeo.
    Calibrado nos vídeos do projeto (gabarito conhecido): 100% dos cortes, sem falso positivo.
    """
    w, h = 48, 85
    r = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", video, "-vf", f"fps={fps},scale={w}:{h}", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
        capture_output=True,
    )
    q = np.frombuffer(r.stdout, np.uint8).reshape(-1, h, w, 3).astype(np.float32)
    k = int(janela * fps)
    if len(q) <= k + 2:
        return []
    d = np.abs(q[k:] - q[:-k]).mean(axis=(1, 2, 3))
    d1 = np.abs(q[1:] - q[:-1]).mean(axis=(1, 2, 3))
    # 1) cortes secos: salto grande de um quadro para o seguinte (podem estar a 0,25 s um do outro)
    base1 = max(float(np.median(d1)), 0.5)
    secos = []
    for i in np.argsort(-d1):
        if d1[i] < max(8 * base1, 6):
            break
        t = (i + 1) / fps
        vizinhos = max(d1[i - 1] if i > 0 else 0, d1[i + 1] if i + 1 < len(d1) else 0)
        isolado = d1[i] > 3 * max(vizinhos, base1)  # seco = salto isolado; transição = vários quadros mudando
        if isolado and all(abs(t - c) >= 0.25 for c in secos):
            secos.append(t)
    # 2) transições graduais: pico local (±1 s) da mudança em janela, longe de um corte seco
    base = max(float(np.median(d)), 0.5)
    suaves = []
    for i in range(len(d)):
        lo, hi = max(0, i - fps), min(len(d), i + fps + 1)
        t = (i + k / 2) / fps
        if d[i] == d[lo:hi].max() and d[i] > 8 * base and d[i] > 4 and all(abs(t - c) > 0.6 for c in secos):
            suaves.append(t)
    achados = sorted([(t, "seco") for t in secos] + [(t, "suave") for t in suaves])
    return achados


def audio_mono(video, sr=22050):
    tmp = "/tmp/_analise_audio.wav"
    rodar(["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-ac", "1", "-ar", str(sr), tmp])
    with wave.open(tmp) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    os.remove(tmp)
    return x, sr


def bpm_e_picos(x, sr):
    """
    BPM: autocorrelação do fluxo espectral com soma de harmônicos (pulso, 2×, 3×, 4×).
    Devolve os 3 andamentos mais prováveis — o primeiro acerta na maioria dos casos, mas
    confundir com 3/2 ou 2/3 do real é comum; por isso a ficha lista as alternativas.
    Picos = ataques fortes (prováveis efeitos sonoros/batidas).
    """
    hop, win = 512, 2048
    n = 1 + (len(x) - win) // hop
    if n < 50:
        return [], []
    janela = np.hanning(win)
    esp = np.abs(np.fft.rfft(np.stack([x[i * hop : i * hop + win] * janela for i in range(n)]), axis=1))
    bruto = np.maximum(np.diff(np.log1p(esp), axis=0), 0).sum(axis=1)
    o = np.maximum(bruto - np.convolve(bruto, np.ones(16) / 16, "same"), 0)
    taxa = sr / hop
    ac = np.correlate(o, o, "full")[len(o) - 1 :]
    bs = np.arange(60, 180.5, 0.5)
    score = np.array([sum(np.interp(m * 60 / b * taxa, np.arange(len(ac)), ac) / m for m in (1, 2, 3, 4)) for b in bs])
    locais = [i for i in range(1, len(bs) - 1) if score[i] >= score[i - 1] and score[i] >= score[i + 1]]
    candidatos = []
    for i in sorted(locais, key=lambda i: -score[i]):
        if all(abs(bs[i] - c) > 4 for c in candidatos):
            candidatos.append(round(float(bs[i])))
        if len(candidatos) == 3:
            break
    z = (bruto - bruto.mean()) / (bruto.std() + 1e-9)
    picos = []
    for i in np.argsort(-z):
        if z[i] < 2.5 or len(picos) >= 25:
            break
        t = (i + 1) * hop / sr
        if all(abs(t - p) > 0.25 for p in picos):
            picos.append(t)
    return candidatos, sorted(picos)


def loudness(video):
    r = rodar(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"])
    i = re.findall(r"I:\s+(-?[0-9.]+) LUFS", r.stderr)
    p = re.findall(r"Peak:\s+(-?[0-9.]+) dBFS", r.stderr)
    return (float(i[-1]) if i else None, float(p[-1]) if p else None)


def folha_contato(video, tempos, saida, largura=270):
    pasta = saida + "_tmp"
    os.makedirs(pasta, exist_ok=True)
    arquivos = []
    for k, t in enumerate(tempos[:16]):
        f = os.path.join(pasta, f"{k:02d}.png")
        rodar(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1", "-vf", f"scale={largura}:-2", f])
        if os.path.exists(f):
            arquivos.append(f)
    if arquivos:
        entradas = sum([["-i", f] for f in arquivos], [])
        rodar(["ffmpeg", "-loglevel", "error", "-y", *entradas, "-filter_complex", f"hstack=inputs={len(arquivos)}" if len(arquivos) > 1 else "null", saida])
    for f in arquivos:
        os.remove(f)
    os.rmdir(pasta)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    video = sys.argv[1]
    nome = os.path.splitext(os.path.basename(video))[0]
    saida = sys.argv[2] if len(sys.argv) > 2 else os.path.join("modelos", nome)
    os.makedirs(saida, exist_ok=True)

    i = info(video)
    achados = cortes(video)
    cts = [t for t, _ in achados]
    tipos = dict(achados)
    cenas = [0.0] + cts
    duracoes = [b - a for a, b in zip(cenas, cenas[1:] + [i["duracao"]])]
    bpm, picos, lufs, pico = [], [], None, None
    if i["tem_audio"]:
        x, sr = audio_mono(video)
        bpm, picos = bpm_e_picos(x, sr)
        lufs, pico = loudness(video)
        marcas = "".join(f",drawbox=x={int(t / i['duracao'] * 1400)}:y=0:w=2:h=200:color=red@0.8:t=fill" for t in cts)
        rodar(["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-lavfi", f"showwavespic=s=1400x200:colors=#5C6449{marcas}", os.path.join(saida, "onda.png")])

    folha_contato(video, [t + min(0.4, d / 2) for t, d in zip(cenas, duracoes)], os.path.join(saida, "quadros.png"))

    formato = "vertical 9:16" if i["altura"] > i["largura"] else ("quadrado" if i["altura"] == i["largura"] else "horizontal 16:9")
    ritmo = len(cenas) / i["duracao"]
    perfil = "calmo/editorial" if ritmo < 0.4 else ("médio" if ritmo < 0.9 else "acelerado (cortes rápidos)")
    picos_perto_cortes = sum(1 for c in cts if any(abs(c - p) < 0.3 for p in picos))

    linhas = [
        f"# Ficha técnica do vídeo modelo — {nome}",
        "",
        "> Gerada por `scripts/analisar-modelo.py`. Números são estimativas automáticas: confira olhando `quadros.png` e `onda.png`.",
        "",
        "## Formato",
        f"- Duração: **{i['duracao']:.1f} s** · {i['largura']}×{i['altura']} ({formato}) · {i['fps']} fps",
        "",
        "## Ritmo de edição",
        f"- Cenas detectadas: **{len(cenas)}** · {ritmo:.2f} cortes/s → perfil **{perfil}**",
        f"- Duração média por cena: **{np.mean(duracoes):.1f} s** (mín. {min(duracoes):.1f} s · máx. {max(duracoes):.1f} s)",
        "- Cortes em: " + (", ".join(f"{t:.2f}s ({tipos[t]})" for t in cts) if cts else "nenhum corte detectado (plano único)"),
        f"- Tipo predominante: **{'cortes secos' if sum(v == 'seco' for v in tipos.values()) > len(cts) / 2 else 'transições suaves (fade/slide/blur)'}**" if cts else "",
        "",
        "## Áudio",
    ]
    if i["tem_audio"]:
        linhas += [
            f"- BPM provável: **{bpm[0] if bpm else '?'}** · alternativas: {', '.join(map(str, bpm[1:])) or '—'} (confira batendo o pé junto com o vídeo)",
            f"- Loudness: **{lufs} LUFS** · pico {pico} dBFS",
            f"- Ataques fortes (prováveis efeitos sonoros/batidas): {len(picos)} — " + ", ".join(f"{p:.2f}s" for p in picos[:15]),
            f"- Cortes com ataque sonoro junto (±0,3 s): **{picos_perto_cortes}/{len(cts)}** "
            + ("→ edição sincronizada com som (whoosh/impacto nos cortes)" if cts and picos_perto_cortes / len(cts) > 0.5 else "→ cortes pouco marcados por som"),
        ]
    else:
        linhas += ["- Sem faixa de áudio."]
    linhas += [
        "",
        "## Preencher olhando os quadros (Claude + pessoa)",
        "- Tipos de transição percebidos: ",
        "- Estilo de texto (fonte, tamanho, animação): ",
        "- Paleta / tratamento de cor: ",
        "- Efeitos sonoros percebidos: ",
        "- O que **copiar** do modelo: ",
        "- O que **não** copiar (ajustar à nossa marca): ",
        "",
        "![quadros](quadros.png)",
        "",
        "![onda](onda.png)" if i["tem_audio"] else "",
    ]
    with open(os.path.join(saida, "ficha.md"), "w") as f:
        f.write("\n".join(linhas) + "\n")
    print("\n".join(linhas[:22]))
    print(f"\n✓ Ficha em {saida}/ficha.md")


if __name__ == "__main__":
    main()
