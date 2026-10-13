"""
Gera src/arena/chefes-sprites.ts a partir das poses pixelizadas em ../arena-d20/chefes-ia/<chefe>/px/
(scripts/pixelizar.py). Cada pose vira índices na paleta comum (1 caractere por pixel), para o vídeo desenhar na hora.
CABECA: posição da cabeça na pose parada, em fração da largura/altura (retrato, mini, ▼ e textos).
CINTURA: fração da altura da pose parada onde o tronco "respira" (o que está acima sobe 1 px).
"""
import json
import os

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, "..", "arena-d20", "chefes-ia")
CABECA = {"MINOTAURO": (0.70, 0.33)}
CINTURA = {"MINOTAURO": 0.62}
CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-/:;<=>?@[]^_{|}~"
saida = {}
for chefe in CABECA:
    d = os.path.join(PASTA, chefe.lower(), "px")
    if not os.path.exists(os.path.join(d, "poses.json")):
        continue
    meta = json.load(open(os.path.join(d, "poses.json")))
    pal: list[str] = []
    poses = {}
    for pose, m in meta.items():
        im = Image.open(os.path.join(d, pose + ".png")).convert("RGBA")
        px = im.load()
        cs = []
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                if a < 128:
                    cs.append(".")
                    continue
                c = f"#{r:02x}{g:02x}{b:02x}"
                if c not in pal:
                    pal.append(c)
                cs.append(CHARS[pal.index(c)])
        poses[pose] = {"w": im.width, "h": im.height, "px": "".join(cs), "pes": m["pes"]}
    b = poses["base"]
    saida[chefe] = {"pal": pal, "poses": poses, "cabeca": [round(CABECA[chefe][0] * b["w"]), round(CABECA[chefe][1] * b["h"])], "cintura": round(CINTURA[chefe] * b["h"])}
    print(f"✓ {chefe}: {len(poses)} poses, {len(pal)} cores")
ts = (
    "// Gerado por scripts/chefes-sprites.py a partir de arena-d20/chefes-ia/<chefe>/px (arte por IA, pixelizada). Não editar à mão.\n"
    'import type { ChefeId } from "./chefes.ts";\n'
    "export type PoseSprite = { w: number; h: number; px: string; pes: [number, number] };\n"
    "export type SpriteChefe = { pal: string[]; poses: Record<string, PoseSprite>; cabeca: [number, number]; cintura: number };\n"
    f'export const CHARS_SPRITE = {json.dumps(CHARS)};\n'
    f"export const SPRITES_CHEFE: Partial<Record<ChefeId, SpriteChefe>> = {json.dumps(saida)};\n"
)
open(os.path.join(RAIZ, "src", "arena", "chefes-sprites.ts"), "w").write(ts)
