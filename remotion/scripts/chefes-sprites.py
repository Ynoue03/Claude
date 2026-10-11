"""
Gera src/arena/chefes-sprites.ts a partir dos PNGs pixelizados em ../arena-d20/chefes-ia/<chefe>.png.
O sprite vira paleta + índices (1 caractere por pixel), para o vídeo desenhar na hora, sem carregar arquivo.
Cabeça (para retrato, ▼ e textos) em fração da largura/altura: CABECA abaixo.
"""
import json
import os

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, "..", "arena-d20", "chefes-ia")
CABECA = {"MINOTAURO": (0.72, 0.29)}
CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
saida = {}
for chefe, (fx, fy) in CABECA.items():
    arq = os.path.join(PASTA, chefe.lower() + ".png")
    if not os.path.exists(arq):
        continue
    im = Image.open(arq).convert("RGBA")
    w, h = im.size
    px = im.load()
    pal: list[str] = []
    linhas = []
    for y in range(h):
        ln = []
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 128:
                ln.append(".")
                continue
            c = f"#{r:02x}{g:02x}{b:02x}"
            if c not in pal:
                pal.append(c)
            ln.append(CHARS[pal.index(c)])
        linhas.append("".join(ln))
    # âncora: centro do sprite na linha do chão (o corpo fica centrado na posição do chefe)
    saida[chefe] = {"w": w, "h": h, "pal": pal, "px": "".join(linhas), "pes": [w // 2, h - 1], "cabeca": [round(fx * w), round(fy * h)]}
    print(f"✓ {chefe}: {w}×{h}, {len(pal)} cores")
ts = (
    "// Gerado por scripts/chefes-sprites.py a partir de arena-d20/chefes-ia/*.png (arte por IA, pixelizada). Não editar à mão.\n"
    'import type { ChefeId } from "./chefes.ts";\n'
    "export type SpriteChefe = { w: number; h: number; pal: string[]; px: string; pes: [number, number]; cabeca: [number, number] };\n"
    f"export const SPRITES_CHEFE: Partial<Record<ChefeId, SpriteChefe>> = {json.dumps(saida)};\n"
)
open(os.path.join(RAIZ, "src", "arena", "chefes-sprites.ts"), "w").write(ts)
