// Gera uma folha com todas as classes × espécies para conferir os sprites.
// Uso: npm run sprites  → out/sprites.png
import { mkdirSync } from "node:fs";
import { criarFicha } from "../src/motor/personagem";
import { CLASSES, ClasseId, ESPECIES, EspecieId } from "../src/motor/srd";
import { ALT, montarArma, montarSprite, Pose } from "../src/pixel/sprites";
import { hexParaRgb } from "../src/pixel/cor";
import { salvarPng } from "./png";

const classes = Object.keys(CLASSES) as ClasseId[];
const especies = Object.keys(ESPECIES) as EspecieId[];
const pose = (process.argv[2] as Pose) || "parado";
const ESC = 5;
const CEL = 34;
const W = classes.length * CEL * ESC;
const H = especies.length * CEL * ESC;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([86, 140, 92, 255], i * 4);

const px = (x: number, y: number, cor: string) => {
  const [r, g, b] = hexParaRgb(cor);
  for (let yy = 0; yy < ESC; yy++)
    for (let xx = 0; xx < ESC; xx++) {
      const X = x * ESC + xx, Y = y * ESC + yy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      img.set([r, g, b, 255], (Y * W + X) * 4);
    }
};

especies.forEach((e, j) =>
  classes.forEach((c, i) => {
    const f = criarFicha({ nome: `T${i}${j}`, classe: c, especie: e }, i + j, 7 + i * 31 + j);
    const ox = i * CEL + 5, oy = j * CEL + 2;
    // sombra
    for (let x = 4; x < 20; x++) px(ox + x, oy + ALT, "#4b6e4c");
    const s = montarSprite(f, pose);
    const arma = montarArma(f);
    const escudo = f.escudo ? montarArma(f, "escudo") : null;
    const desenharArma = (a: ReturnType<typeof montarArma>, mx: number, my: number) =>
      a.grade.forEach((l, y) => l.forEach((cor, x) => cor && px(ox + mx - a.pega[0] + x, oy + my - a.pega[1] + y, cor)));
    if (escudo) desenharArma(escudo, 6, 21);
    s.forEach((l, y) => l.forEach((cor, x) => cor && px(ox + x, oy + y, cor)));
    desenharArma(arma, 18, 22);
  }),
);
mkdirSync("out", { recursive: true });
salvarPng(`out/sprites-${pose}.png`, W, H, img);
console.log(`out/sprites-${pose}.png  ${W}x${H}`);
