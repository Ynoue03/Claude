// Fontes pixel próprias (5×7 e 3×5), com acentos do português. Desenho em canvas, com cache.

const G7: Record<string, string> = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
  B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".###.|#...#|#....|#....|#....|#...#|.###.",
  D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####",
  F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".###.|#...#|#....|#.###|#...#|#...#|.####",
  H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: "###|.#.|.#.|.#.|.#.|.#.|###",
  J: "..###|...#.|...#.|...#.|#..#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
  N: "#...#|##..#|#.#.#|#..##|#...#|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.",
  T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.",
  X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
  Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  "1": ".#.|##.|.#.|.#.|.#.|.#.|###",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####",
  "3": "####.|....#|....#|.###.|....#|....#|####.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": ".###.|#....|#....|####.|#...#|#...#|.###.",
  "7": "#####|....#|...#.|..#..|..#..|..#..|..#..",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  "9": ".###.|#...#|#...#|.####|....#|....#|.###.",
  " ": "...|...|...|...|...|...|...",
  ".": ".|.|.|.|.|.|#",
  ",": "..|..|..|..|..|.#|#.",
  "!": "#|#|#|#|#|.|#",
  "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
  ":": ".|.|#|.|.|#|.",
  ";": "..|..|.#|..|..|.#|#.",
  "-": "....|....|....|####|....|....|....",
  "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
  "=": "....|....|####|....|####|....|....",
  "/": "....#|...#.|...#.|..#..|.#...|.#...|#....",
  "(": ".#|#.|#.|#.|#.|#.|.#",
  ")": "#.|.#|.#|.#|.#|.#|#.",
  "'": "#|#|.|.|.|.|.",
  '"': "#.#|#.#|...|...|...|...|...",
  "#": ".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.",
  "@": ".###.|#...#|#.###|#.#.#|#.###|#....|.###.",
  "×": ".....|#...#|.#.#.|..#..|.#.#.|#...#|.....",
  "·": ".|.|.|#|.|.|.",
  "%": "##..#|##.#.|...#.|..#..|.#...|.#.##|#..##",
  "<": "...#|..#.|.#..|#...|.#..|..#.|...#",
  ">": "#...|.#..|..#.|...#|..#.|.#..|#...",
  "[": "##|#.|#.|#.|#.|#.|##",
  "]": "##|.#|.#|.#|.#|.#|##",
  "&": ".##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#",
  "—": "......|......|......|######|......|......|......",
  "→": ".....|..#..|...#.|#####|...#.|..#..|.....",
  "▼": "#####|#####|.###.|.###.|..#..|.....|.....",
  "º": "###|#.#|###|...|###|...|...",
  "★": "..#..|..#..|#####|.###.|.#.#.|#...#|.....",
  "♥": ".#.#.|#####|#####|.###.|..#..|.....|.....",
};

const G5: Record<string, string> = {
  A: "###|#.#|###|#.#|#.#",
  B: "##.|#.#|##.|#.#|##.",
  C: "###|#..|#..|#..|###",
  D: "##.|#.#|#.#|#.#|##.",
  E: "###|#..|##.|#..|###",
  F: "###|#..|##.|#..|#..",
  G: "###|#..|#.#|#.#|###",
  H: "#.#|#.#|###|#.#|#.#",
  I: "###|.#.|.#.|.#.|###",
  J: "..#|..#|..#|#.#|###",
  K: "#.#|#.#|##.|#.#|#.#",
  L: "#..|#..|#..|#..|###",
  M: "#.#|###|###|#.#|#.#",
  N: "##.|#.#|#.#|#.#|#.#",
  O: "###|#.#|#.#|#.#|###",
  P: "###|#.#|###|#..|#..",
  Q: "###|#.#|#.#|###|..#",
  R: "##.|#.#|##.|#.#|#.#",
  S: "###|#..|###|..#|###",
  T: "###|.#.|.#.|.#.|.#.",
  U: "#.#|#.#|#.#|#.#|###",
  V: "#.#|#.#|#.#|#.#|.#.",
  W: "#.#|#.#|###|###|#.#",
  X: "#.#|#.#|.#.|#.#|#.#",
  Y: "#.#|#.#|.#.|.#.|.#.",
  Z: "###|..#|.#.|#..|###",
  "0": "###|#.#|#.#|#.#|###",
  "1": ".#.|##.|.#.|.#.|###",
  "2": "###|..#|###|#..|###",
  "3": "###|..#|.##|..#|###",
  "4": "#.#|#.#|###|..#|..#",
  "5": "###|#..|###|..#|###",
  "6": "###|#..|###|#.#|###",
  "7": "###|..#|..#|.#.|.#.",
  "8": "###|#.#|###|#.#|###",
  "9": "###|#.#|###|..#|###",
  " ": "..|..|..|..|..",
  ".": ".|.|.|.|#",
  "!": "#|#|#|.|#",
  ":": ".|#|.|#|.",
  "-": "...|...|###|...|...",
  "+": "...|.#.|###|.#.|...",
  "/": "..#|..#|.#.|#..|#..",
  "@": "###|#.#|#.#|#..|###",
  "#": "#.#|###|#.#|###|#.#",
  "·": ".|.|#|.|.",
  "'": "#|#|.|.|.",
  "?": "###|..#|.##|...|.#.",
  "(": ".#|#.|#.|#.|.#",
  ")": "#.|.#|.#|.#|#.",
  "—": "...|...|###|...|...",
  "→": "....|..#.|####|..#.|....",
  "=": "...|###|...|###|...",
  ",": ".|.|.|#|#",
  "º": "##|##|..|..|..",
  "×": "...|#.#|.#.|#.#|...",
};

const ACENTO: Record<string, [string, string]> = {
  Á: ["A", "agudo"],
  À: ["A", "grave"],
  Â: ["A", "circ"],
  Ã: ["A", "til"],
  É: ["E", "agudo"],
  Ê: ["E", "circ"],
  Í: ["I", "agudo"],
  Ó: ["O", "agudo"],
  Ô: ["O", "circ"],
  Õ: ["O", "til"],
  Ú: ["U", "agudo"],
  Ü: ["U", "trema"],
  Ç: ["C", "cedilha"],
};
const MARCA: Record<string, string[]> = {
  agudo: ["..#..", ".#..."],
  grave: [".#...", "..#.."],
  circ: [".#.#.", "..#.."].reverse(),
  til: [".#.#.", "#.#.."],
  trema: [".....", ".#.#."],
};

export type Fonte = "g" | "p"; // grande 5×7, pequena 3×5

const parse = (s: string) => s.split("|");
const glifo = (ch: string, f: Fonte): { rows: string[]; acento?: string } => {
  const tabela = f === "g" ? G7 : G5;
  if (tabela[ch]) return { rows: parse(tabela[ch]) };
  const a = ACENTO[ch];
  if (a) {
    if (f === "p") return { rows: parse(G5[a[0]]) };
    return { rows: parse(G7[a[0]]), acento: a[1] };
  }
  const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (tabela[base]) return { rows: parse(tabela[base]) };
  return { rows: parse(tabela["?"] ?? G5["?"]) };
};

export const larguraTexto = (txt: string, f: Fonte = "g", escala = 1) => {
  let w = 0;
  for (const ch of txt.toUpperCase()) w += (glifo(ch, f).rows[0].length + 1) * escala;
  return Math.max(0, w - escala);
};
export const ALTURA = { g: 7, p: 5 };

type Ctx = CanvasRenderingContext2D;
const cache = new Map<string, HTMLCanvasElement>();

// Rasteriza uma linha de texto (com contorno opcional) num canvas próprio.
const rasterizar = (txt: string, cor: string, contorno: string, f: Fonte, sombra: string) => {
  const chave = `${txt}|${cor}|${contorno}|${f}|${sombra}`;
  const c0 = cache.get(chave);
  if (c0) return c0;
  const T = txt.toUpperCase();
  const w = larguraTexto(T, f) + 4;
  const topo = f === "g" ? 3 : 1;
  const h = ALTURA[f] + topo + 4;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const px: [number, number][] = [];
  let x = 2;
  for (const ch of T) {
    const g = glifo(ch, f);
    g.rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] === "#") px.push([x + rx, topo + ry]);
    });
    if (g.acento === "cedilha") px.push([x + 2, topo + 7], [x + 1, topo + 8]);
    else if (g.acento) {
      const mk = MARCA[g.acento];
      mk.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === "#") px.push([x + rx, topo - 2 + ry]);
      });
    }
    x += g.rows[0].length + 1;
  }
  if (sombra) {
    ctx.fillStyle = sombra;
    for (const [a, b] of px) ctx.fillRect(a + 1, b + 1, 1, 1);
  }
  if (contorno) {
    ctx.fillStyle = contorno;
    for (const [a, b] of px)
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
      ])
        ctx.fillRect(a + dx, b + dy, 1, 1);
    if (sombra) for (const [a, b] of px) ctx.fillRect(a + 1, b + 2, 1, 1);
  }
  ctx.fillStyle = cor;
  for (const [a, b] of px) ctx.fillRect(a, b, 1, 1);
  cache.set(chave, c);
  return c;
};

export type OpTexto = {
  cor?: string;
  contorno?: string;
  sombra?: string;
  fonte?: Fonte;
  escala?: number;
  alinhar?: "esq" | "centro" | "dir";
  alpha?: number;
};

// Desenha texto com o topo das letras (sem acento) em y.
export const texto = (ctx: Ctx, txt: string, x: number, y: number, op: OpTexto = {}) => {
  const f = op.fonte ?? "g";
  const esc = op.escala ?? 1;
  const c = rasterizar(txt, op.cor ?? "#ffffff", op.contorno ?? "", f, op.sombra ?? "");
  const w = larguraTexto(txt, f) * esc;
  const x0 = Math.round(op.alinhar === "centro" ? x - w / 2 : op.alinhar === "dir" ? x - w : x);
  const topo = f === "g" ? 3 : 1;
  const a0 = ctx.globalAlpha;
  if (op.alpha !== undefined) ctx.globalAlpha = a0 * op.alpha;
  ctx.drawImage(c, x0 - 2 * esc, Math.round(y) - topo * esc, c.width * esc, c.height * esc);
  ctx.globalAlpha = a0;
  return w;
};

// Quebra um texto em linhas que cabem em `largura` px.
export const quebrar = (txt: string, largura: number, f: Fonte = "g", escala = 1): string[] => {
  const palavras = txt.split(/\s+/);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (larguraTexto(teste, f, escala) <= largura) atual = teste;
    else {
      if (atual) linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
};
