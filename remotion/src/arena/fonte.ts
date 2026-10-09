// Fonte pixel 5 linhas, largura variável (3 px na maioria). Desenhada com fillRect inteiro:
// nada de suavização, sai nítida em qualquer escala inteira.

const G: Record<string, string> = {
  A: "010/101/111/101/101",
  B: "110/101/110/101/110",
  C: "011/100/100/100/011",
  D: "110/101/101/101/110",
  E: "111/100/110/100/111",
  F: "111/100/110/100/100",
  G: "011/100/101/101/011",
  H: "101/101/111/101/101",
  I: "111/010/010/010/111",
  J: "001/001/001/101/010",
  K: "101/101/110/101/101",
  L: "100/100/100/100/111",
  M: "10001/11011/10101/10001/10001",
  N: "1001/1101/1011/1001/1001",
  O: "010/101/101/101/010",
  P: "110/101/110/100/100",
  Q: "010/101/101/110/011",
  R: "110/101/110/101/101",
  S: "011/100/010/001/110",
  T: "111/010/010/010/010",
  U: "101/101/101/101/111",
  V: "101/101/101/101/010",
  W: "10001/10001/10101/11011/10001",
  X: "101/101/010/101/101",
  Y: "101/101/010/010/010",
  Z: "111/001/010/100/111",
  "0": "111/101/101/101/111",
  "1": "010/110/010/010/111",
  "2": "110/001/010/100/111",
  "3": "110/001/010/001/110",
  "4": "101/101/111/001/001",
  "5": "111/100/110/001/110",
  "6": "011/100/110/101/010",
  "7": "111/001/010/010/010",
  "8": "010/101/010/101/010",
  "9": "010/101/011/001/110",
  "!": "1/1/1/0/1",
  "?": "110/001/010/000/010",
  ".": "0/0/0/0/1",
  ",": "00/00/00/01/10",
  ":": "0/1/0/1/0",
  ";": "00/01/00/01/10",
  "-": "000/000/111/000/000",
  "+": "000/010/111/010/000",
  "/": "001/001/010/100/100",
  "_": "000/000/000/000/111",
  "'": "1/1/0/0/0",
  "@": "0110/1001/1011/1000/0111",
  "#": "01010/11111/01010/11111/01010",
  "×": "000/101/010/101/000",
  "(": "01/10/10/10/01",
  ")": "10/01/01/01/10",
  "[": "11/10/10/10/11",
  "]": "11/01/01/01/11",
  " ": "00/00/00/00/00",
};

// Acentos do português: letra-base + marca acima (linhas -2 e -1) ou cedilha.
const ACENTO: Record<string, [string, string]> = {
  Á: ["A", "agudo"], À: ["A", "crase"], Â: ["A", "circ"], Ã: ["A", "til"],
  É: ["E", "agudo"], Ê: ["E", "circ"], Í: ["I", "agudo"],
  Ó: ["O", "agudo"], Ô: ["O", "circ"], Õ: ["O", "til"], Ú: ["U", "agudo"], Ç: ["C", "cedilha"],
};
const MARCA: Record<string, [number, number][]> = {
  agudo: [[2, -2], [1, -1]],
  crase: [[0, -2], [1, -1]],
  circ: [[1, -2], [0, -1], [2, -1]],
  til: [[1, -2], [2, -2], [0, -1], [1, -1]],
  cedilha: [[1, 5], [1, 6]],
};

type Glifo = { w: number; px: [number, number][] };
const cache = new Map<string, Glifo>();

const glifo = (ch: string): Glifo => {
  const c = cache.get(ch);
  if (c) return c;
  let base = ch.toUpperCase();
  let marca: [number, number][] = [];
  if (ACENTO[base]) {
    marca = MARCA[ACENTO[base][1]];
    base = ACENTO[base][0];
  }
  const def = G[base] ?? G["?"];
  const linhas = def.split("/");
  const px: [number, number][] = [];
  linhas.forEach((l, y) => [...l].forEach((b, x) => b === "1" && px.push([x, y])));
  const g = { w: linhas[0].length, px: [...px, ...marca] };
  cache.set(ch, g);
  return g;
};

export const larguraTexto = (txt: string, escala = 1) =>
  Math.max(0, [...txt].reduce((s, ch) => s + glifo(ch).w + 1, 0) - 1) * escala;

// Desenha texto com contorno opcional (8 direções, 1 px na escala do texto).
export const texto = (
  ctx: CanvasRenderingContext2D,
  txt: string,
  x: number,
  y: number,
  cor: string,
  escala = 1,
  contorno?: string,
  alinhar: "esq" | "centro" | "dir" = "esq",
) => {
  let x0 = Math.round(x);
  const w = larguraTexto(txt, escala);
  if (alinhar === "centro") x0 = Math.round(x - w / 2);
  if (alinhar === "dir") x0 = Math.round(x - w);
  const y0 = Math.round(y);
  const desenha = (dx: number, dy: number, c: string) => {
    ctx.fillStyle = c;
    let cx = x0;
    for (const ch of txt) {
      const g = glifo(ch);
      for (const [px, py] of g.px) {
        ctx.fillRect(cx + px * escala + dx, y0 + py * escala + dy, escala, escala);
      }
      cx += (g.w + 1) * escala;
    }
  };
  if (contorno) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      desenha(dx * Math.max(1, escala >> 1), dy * Math.max(1, escala >> 1), contorno);
    }
  }
  desenha(0, 0, cor);
  return w;
};
