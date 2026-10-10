// Folha de aprovação com os 10 personagens de UMA batalha (só os que vão ser usados).
// Uso: npm run sprites -- batalha-001     → out/sprites-batalha-001.png
//      npm run sprites                      → batalha de exemplo (semente 42)
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { montarFichas, PropsBatalha } from "../src/motor";
import { CLASSES, ESPECIES } from "../src/motor/srd";
import { ALT, CHAO, LARG, MAO, montarArma, montarSprite, Pose, descreverVestimenta } from "../src/pixel/sprites";
import { hexParaRgb } from "../src/pixel/cor";
import { larguraTexto } from "../src/pixel/fonte";
import { glifo } from "../src/pixel/fonte";
import { salvarPng } from "./png";

const nome = process.argv[2];
const props: PropsBatalha = nome && existsSync(`batalhas/${nome}.json`) ? JSON.parse(readFileSync(`batalhas/${nome}.json`, "utf8")) : { semente: 42, lutadores: [] };
const fichas = montarFichas(props);

const ESC = 5;
const POSES: { pose: Pose; ang: number }[] = [
  { pose: "parado", ang: 0.5 },
  { pose: "passoA", ang: 0.5 },
  { pose: "golpe", ang: 1.9 },
];
const CEL_W = 44, CEL_H = 62;
const COLS = 4;
const W = COLS * POSES.length * CEL_W * ESC;
const H = Math.ceil(fichas.length / COLS) * CEL_H * ESC;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([226, 196, 142, 255], i * 4);

const px = (x: number, y: number, cor: string) => {
  const [r, g, b] = hexParaRgb(cor);
  for (let yy = 0; yy < ESC; yy++)
    for (let xx = 0; xx < ESC; xx++) {
      const X = Math.round(x) * ESC + xx, Y = Math.round(y) * ESC + yy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      img.set([r, g, b, 255], (Y * W + X) * 4);
    }
};
const escrever = (t: string, x: number, y: number, cor: string) => {
  let cx = x;
  for (const ch of t) {
    const g = glifo(ch);
    g.linhas.forEach((l, yy) => [...l].forEach((p, xx) => p === "#" && px(cx + xx, y + yy, cor)));
    g.acento?.forEach((l, yy) => [...l].forEach((p, xx) => p === "#" && px(cx + xx, y + yy - 3, cor)));
    cx += g.w + 1;
  }
};

fichas.forEach((f, i) => {
  const col = i % COLS, lin = Math.floor(i / COLS);
  const arma = montarArma(f);
  POSES.forEach(({ pose, ang }, k) => {
    const ox = (col * POSES.length + k) * CEL_W + 2, oy = lin * CEL_H + 6;
    // sombra
    for (let x = 10; x < 28; x++) px(ox + x, oy + CHAO, "#c4a06a");
    const s = montarSprite(f, pose);
    s.forEach((l, y) => l.forEach((cor, x) => cor && px(ox + x, oy + y, cor)));
    // arma girada na mão (amostragem do vizinho mais próximo)
    if (arma.chave !== "punhos") {
      const [hx, hy] = MAO;
      const pequeno = f.especie === "halfling" || f.especie === "gnomo" || f.especie === "anao";
      const cy = hy + (pequeno ? 2 : 0);
      const c = Math.cos(ang), sn = Math.sin(ang);
      for (let y = -30; y <= 30; y++)
        for (let x = -30; x <= 30; x++) {
          const u = Math.round(c * x + sn * y) + arma.pega[0];
          const v = Math.round(-sn * x + c * y) + arma.pega[1];
          const cor = arma.grade[v]?.[u];
          if (cor) px(ox + hx + x, oy + cy + y, cor);
        }
    }
  });
  const x0 = col * POSES.length * CEL_W + 4, y0 = lin * CEL_H + 6 + ALT + 1;
  escrever(`${f.id + 1}. ${f.nome.toUpperCase()}`, x0, y0, "#1a1219");
  escrever(`${ESPECIES[f.especie].nome} ${CLASSES[f.classe].nome}`.toUpperCase(), x0, y0 + 9, "#6a3a2a");
  void larguraTexto;
});
mkdirSync("out", { recursive: true });
const arq = `out/sprites-${nome ?? "exemplo"}.png`;
salvarPng(arq, W, H, img);
console.log(arq);
for (const f of fichas) console.log(`${f.id + 1}. ${f.nome} — ${ESPECIES[f.especie].nome} ${CLASSES[f.classe].nome}: ${descreverVestimenta(f)}`);
void LARG;
