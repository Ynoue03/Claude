"""
Pixelizador dos chefes: transforma uma ilustração (fundo verde liso) em pixel art pronta para o motor.

  python3 scripts/pixelizar.py entrada.jpg saida.png [altura=150] [cores=20]

1. tira o fundo verde (chroma key) e o "vazamento" verde nas bordas
2. recorta no corpo e reduz para a altura pedida (média por área, sem borrar)
3. limita a paleta (median cut) e remove pixels soltos
4. contorno escuro de 1 px (sel-out: a cor do contorno puxa a cor vizinha, nunca preto puro)
"""
import sys

import numpy as np
from PIL import Image

ent, sai = sys.argv[1], sys.argv[2]
H = int(sys.argv[3]) if len(sys.argv) > 3 else 150
NC = int(sys.argv[4]) if len(sys.argv) > 4 else 20

im = np.asarray(Image.open(ent).convert("RGB")).astype(np.float32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
verde = (g - np.maximum(r, b))  # quão "verde" é o pixel
alfa = np.clip(1 - (verde - 40) / 60, 0, 1)  # >100 = fundo, <40 = corpo
# tira o verde que vazou nas bordas
g2 = np.minimum(g, np.maximum(r, b) + 10)
im[..., 1] = np.where(verde > 0, g2, g)
ys, xs = np.where(alfa > 0.5)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
rgba = np.dstack([im, alfa * 255])[y0:y1, x0:x1].astype(np.uint8)
src = Image.fromarray(rgba, "RGBA")
W = max(1, round(src.width * H / src.height))
# reduz pela média (premultiplicada, para a borda não escurecer)
pm = np.asarray(src).astype(np.float32)
pm[..., :3] *= pm[..., 3:4] / 255
pequeno = np.asarray(Image.fromarray(pm.astype(np.uint8), "RGBA").resize((W, H), Image.BOX)).astype(np.float32)
a = pequeno[..., 3]
cor = np.where(a[..., None] > 0, pequeno[..., :3] * 255 / np.maximum(a[..., None], 1), 0)
opaco = a > 110
# paleta reduzida só com os pixels do corpo
px = cor[opaco].astype(np.uint8).reshape(-1, 1, 3)
pal_img = Image.fromarray(px, "RGB").quantize(colors=NC, method=Image.Quantize.MEDIANCUT)
paleta = np.array(pal_img.getpalette()[: NC * 3]).reshape(-1, 3)
idx = np.argmin(((cor[..., None, :] - paleta[None, None]) ** 2).sum(-1), axis=-1)
out = np.zeros((H, W, 4), np.uint8)
out[..., :3] = paleta[idx]
out[..., 3] = np.where(opaco, 255, 0)
# remove pixels opacos isolados (ruído da borda)
viz = sum(np.roll(np.roll(opaco, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
opaco &= viz >= 2
out[..., 3] = np.where(opaco, 255, 0)
# margem de 2 px para o contorno caber
pad = 2
out = np.pad(out, ((pad, pad), (pad, pad), (0, 0)))
opaco = np.pad(opaco, pad)
H, W = opaco.shape
# contorno de 1 px por fora, escurecendo a cor vizinha (sel-out)
# cor do contorno: a do primeiro vizinho opaco, escurecida (no máximo 1 tom escuro por cor da paleta)
viz_cor = np.zeros((H, W, 3), np.float32)
tem = np.zeros((H, W), bool)
for dy, dx in ((1, 0), (0, -1), (0, 1), (-1, 0)):
    o = np.roll(np.roll(opaco, dy, 0), dx, 1)
    c = np.roll(np.roll(out[..., :3].astype(np.float32), dy, 0), dx, 1)
    novo = o & ~tem
    viz_cor[novo] = c[novo]
    tem |= o
borda = (~opaco) & tem
escuro = (viz_cor * 0.28 + np.array([18, 10, 22])).clip(0, 255)
out[borda, :3] = escuro[borda].astype(np.uint8)
out[borda, 3] = 255
Image.fromarray(out, "RGBA").save(sai)
print(f"✓ {sai} {W}×{H}, {NC} cores")
