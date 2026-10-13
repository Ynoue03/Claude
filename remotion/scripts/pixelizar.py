"""
Pixelizador dos chefes: ilustrações com fundo verde liso → pixel art pronta para o motor.

  python3 scripts/pixelizar.py PASTA [altura=100] [cores=24]

PASTA tem base.jpg (pose parada, define a escala) e as outras poses (ergue.jpg, golpe.jpg, ruge.jpg, passo.jpg…).
Todas as poses usam a MESMA escala e a MESMA paleta, e ficam ancoradas pelos cascos — assim o corpo não "pula" ao
trocar de pose. Saída: PASTA/px/<pose>.png e PASTA/px/poses.json (âncora dos pés de cada pose).

1. tira o fundo verde (chroma key) e o verde que vaza nas bordas
2. reduz pela média por área (premultiplicada) para a escala em que a pose parada tem `altura` px
3. paleta única (median cut) com os pixels de todas as poses; remove pixels soltos
4. contorno escuro de 1 px por fora, com a cor do vizinho escurecida (sel-out)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

PASTA = sys.argv[1]
ALTURA = int(sys.argv[2]) if len(sys.argv) > 2 else 100
NC = int(sys.argv[3]) if len(sys.argv) > 3 else 24
poses = ["base"] + sorted(os.path.splitext(f)[0] for f in os.listdir(PASTA) if f.endswith(".jpg") and f != "base.jpg")


def chroma(arq):
    im = np.asarray(Image.open(os.path.join(PASTA, arq + ".jpg")).convert("RGB")).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    verde = g - np.maximum(r, b)
    alfa = np.clip(1 - (verde - 40) / 60, 0, 1)
    im[..., 1] = np.where(verde > 0, np.minimum(g, np.maximum(r, b) + 10), g)
    return im, alfa


fontes = {p: chroma(p) for p in poses}
ys = np.where(fontes["base"][1] > 0.5)[0]
f = ALTURA / (ys.max() + 1 - ys.min())  # escala única, pela altura da pose parada

reduzidas = {}
for p, (im, alfa) in fontes.items():
    h0, w0 = alfa.shape
    W, H = max(1, round(w0 * f)), max(1, round(h0 * f))
    pm = np.dstack([im * alfa[..., None], alfa * 255]).clip(0, 255).astype(np.uint8)
    pq = np.asarray(Image.fromarray(pm, "RGBA").resize((W, H), Image.BOX)).astype(np.float32)
    a = pq[..., 3]
    cor = np.where(a[..., None] > 0, pq[..., :3] * 255 / np.maximum(a[..., None], 1), 0)
    opaco = a > 110
    viz = sum(np.roll(np.roll(opaco, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    reduzidas[p] = (cor, opaco & (viz >= 2))

# paleta única com os pixels de todas as poses
todos = np.concatenate([c[o] for c, o in reduzidas.values()]).astype(np.uint8).reshape(-1, 1, 3)
paleta = np.array(Image.fromarray(todos, "RGB").quantize(colors=NC, method=Image.Quantize.MEDIANCUT).getpalette()[: NC * 3]).reshape(-1, 3)

os.makedirs(os.path.join(PASTA, "px"), exist_ok=True)
meta = {}
for p, (cor, opaco) in reduzidas.items():
    idx = np.argmin(((cor[..., None, :] - paleta[None, None]) ** 2).sum(-1), axis=-1)
    out = np.zeros(opaco.shape + (4,), np.uint8)
    out[..., :3] = paleta[idx]
    out[..., 3] = np.where(opaco, 255, 0)
    out = np.pad(out, ((2, 2), (2, 2), (0, 0)))
    opaco = np.pad(opaco, 2)
    # contorno: cor do primeiro vizinho opaco, escurecida
    viz_cor = np.zeros(opaco.shape + (3,), np.float32)
    tem = np.zeros(opaco.shape, bool)
    for dy, dx in ((1, 0), (0, -1), (0, 1), (-1, 0)):
        o = np.roll(np.roll(opaco, dy, 0), dx, 1)
        c = np.roll(np.roll(out[..., :3].astype(np.float32), dy, 0), dx, 1)
        novo = o & ~tem
        viz_cor[novo] = c[novo]
        tem |= o
    borda = (~opaco) & tem
    out[borda, :3] = (viz_cor[borda] * 0.28 + np.array([18, 10, 22])).clip(0, 255).astype(np.uint8)
    out[borda, 3] = 255
    # recorte no corpo e âncora nos cascos (centro dos pixels das 5 linhas de baixo)
    yy, xx = np.where(out[..., 3] > 0)
    y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    out = out[y0:y1, x0:x1]
    h, w = out.shape[:2]
    baixo = np.where(out[h - 5 :, :, 3] > 0)[1]
    meta[p] = {"w": int(w), "h": int(h), "pes": [int(round(baixo.mean())), int(h - 1)]}
    Image.fromarray(out, "RGBA").save(os.path.join(PASTA, "px", p + ".png"))
    print(f"✓ {p}: {w}×{h}")
json.dump(meta, open(os.path.join(PASTA, "px", "poses.json"), "w"), indent=1)
print(f"escala {f:.3f} · {NC} cores")
