// Arena top-down estilo GBA/SNES: ilha de grama cercada de água, borda de terra/pedra,
// árvores nos cantos e areia em "pirâmide em degraus" no centro, com uma pedra no meio.
import { hash } from "./rng";
import { anel, disco, elipse, px, ret, type Ctx } from "./pixel";
import { ARENA, CENTRO, H, PEDRA, W } from "./tempo";

export const M = 12; // margem do mundo (para o tremor de tela não mostrar bordas)
export const MW = W + M * 2;
export const MH = H + M * 2;

const ILHA = { x0: 6, y0: 112, x1: 263, y1: 414, r: 18 };

const naIlha = (x: number, y: number) => {
  const { x0, y0, x1, y1, r } = ILHA;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

export const noOct = (x: number, y: number, a: number, b: number, k = ARENA.k) => {
  const dx = Math.abs(x - CENTRO.x);
  const dy = Math.abs(y - CENTRO.y);
  return dx <= a && dy <= b && dx / a + dy / b <= k;
};

// degraus da pirâmide (de fora para dentro)
const DEGRAUS = [
  { a: ARENA.a + 16, b: ARENA.b + 16, c: "#C29858" },
  { a: ARENA.a + 8, b: ARENA.b + 8, c: "#D2AC6A" },
  { a: ARENA.a - 22, b: ARENA.b - 24, c: "#DCB978" },
  { a: ARENA.a - 50, b: ARENA.b - 56, c: "#E5C68A" },
  { a: ARENA.a - 74, b: ARENA.b - 82, c: "#EDD29C" },
];

const ARVORES = [
  [24, 132], [246, 132], [22, 402], [248, 402], [14, 236], [256, 300], [44, 120], [228, 122],
];

const novo = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

let ilhaCache: HTMLCanvasElement | null = null;
let espuma: [number, number][] = [];
let flores: { x: number; y: number; c: string; fase: number }[] = [];

const arvore = (ctx: Ctx, x: number, y: number) => {
  elipse(ctx, x + 1, y + 2, 11, 3, "rgba(20,40,20,0.35)");
  ret(ctx, x - 2, y - 7, 5, 9, "#6E4426");
  ret(ctx, x - 2, y - 7, 1, 9, "#8A5A34");
  disco(ctx, x, y - 16, 12, "#1F4F2A");
  disco(ctx, x, y - 17, 11, "#2E6B34");
  disco(ctx, x - 4, y - 20, 6, "#3F8A44");
  disco(ctx, x + 4, y - 14, 5, "#3A8040");
  disco(ctx, x - 5, y - 22, 3, "#58A85A");
  px(ctx, x - 6, y - 24, "#7CC46E", 2);
  px(ctx, x + 3, y - 18, "#58A85A", 2);
};

export const ilhaEstatica = () => {
  if (ilhaCache) return ilhaCache;
  const c = novo(MW, MH);
  const ctx = c.getContext("2d")!;
  ctx.translate(M, M);
  // grama + penhasco
  for (let y = -M; y < H + M; y++)
    for (let x = -M; x < W + M; x++) {
      if (naIlha(x, y)) {
        const h = hash(x, y);
        ctx.fillStyle = h < 0.07 ? "#4F9A40" : h > 0.95 ? "#72BE5A" : (x + y) % 7 === 0 && h > 0.6 ? "#58A447" : "#5DA94A";
        ctx.fillRect(x, y, 1, 1);
        if (!naIlha(x, y - 1)) px(ctx, x, y, "#86CF6A");
      } else {
        let k = 0;
        for (let d = 1; d <= 6; d++) if (naIlha(x, y - d)) { k = d; break; }
        if (k) {
          const h = hash(x, y + 999);
          const cor = k <= 2 ? (h < 0.3 ? "#7A4C2A" : "#8A5A34") : k <= 4 ? (h < 0.4 ? "#7E848E" : "#9AA0A8") : "#5E646E";
          px(ctx, x, y, cor);
        } else if (naIlha(x - 1, y) || naIlha(x + 1, y) || naIlha(x, y + 1)) {
          px(ctx, x, y, "#3D7F33");
        }
      }
    }
  // areia em degraus
  DEGRAUS.forEach((d, i) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!noOct(x, y, d.a, d.b)) continue;
        let cor = d.c;
        const h = hash(x * 3 + i, y);
        if (h < 0.05) cor = "#B88E52";
        else if (h > 0.97) cor = "#F4E0B0";
        if (!noOct(x, y + 1, d.a, d.b) || !noOct(x, y + 2, d.a, d.b)) cor = i === 0 ? "#8A6A3A" : "#B08048";
        else if (!noOct(x, y - 1, d.a, d.b)) cor = i === 0 ? "#9A7442" : "#F2DCA8";
        else if (!noOct(x - 1, y, d.a, d.b) || !noOct(x + 1, y, d.a, d.b)) cor = i === 0 ? "#8A6A3A" : "#C49A5A";
        px(ctx, x, y, cor);
      }
  });
  // tufos de grama
  for (let k = 0; k < 140; k++) {
    const x = Math.round(10 + hash(k, 1) * 250);
    const y = Math.round(118 + hash(k, 2) * 290);
    if (!naIlha(x, y) || noOct(x, y, ARENA.a + 20, ARENA.b + 20)) continue;
    px(ctx, x, y, "#3D7F33");
    px(ctx, x + 2, y, "#3D7F33");
    px(ctx, x + 1, y - 1, "#3D7F33");
    px(ctx, x - 1, y - 1, "#4F9A40");
    px(ctx, x + 3, y - 1, "#4F9A40");
    px(ctx, x + 1, y - 2, "#86CF6A");
  }
  // pedrinhas na areia
  for (let k = 0; k < 40; k++) {
    const x = Math.round(CENTRO.x + (hash(k, 7) - 0.5) * 200);
    const y = Math.round(CENTRO.y + (hash(k, 8) - 0.5) * 220);
    if (!noOct(x, y, ARENA.a, ARENA.b) || Math.hypot(x - PEDRA.x, y - PEDRA.y) < 22) continue;
    px(ctx, x, y, "#A88A60");
    px(ctx, x + 1, y, "#C8B088");
  }
  ARVORES.forEach(([x, y]) => arvore(ctx, x, y));
  // espuma e flores (animadas): só as posições
  espuma = [];
  for (let y = 100; y < 428; y++)
    for (let x = -2; x < W + 2; x++) {
      if (naIlha(x, y)) continue;
      let terra = false;
      for (let d = 0; d <= 6 && !terra; d++) if (naIlha(x, y - d)) terra = true;
      if (terra) continue;
      const viz = [[1, 0], [-1, 0], [0, -1], [0, 1]].some(([dx, dy]) => {
        const X = x + dx;
        const Y = y + dy;
        if (naIlha(X, Y)) return true;
        for (let d = 0; d <= 6; d++) if (naIlha(X, Y - d)) return true;
        return false;
      });
      if (viz) espuma.push([x, y]);
    }
  flores = [];
  const CORES = ["#F04A5A", "#F8D048", "#FFFFFF", "#F28AC8", "#8AB8F8"];
  for (let k = 0; k < 70; k++) {
    const x = Math.round(12 + hash(k, 11) * 246);
    const y = Math.round(120 + hash(k, 12) * 286);
    if (!naIlha(x, y) || noOct(x, y, ARENA.a + 20, ARENA.b + 20)) continue;
    if (ARVORES.some(([ax, ay]) => Math.hypot(ax - x, ay - 14 - y) < 15)) continue;
    flores.push({ x, y, c: CORES[k % CORES.length], fase: Math.floor(hash(k, 13) * 40) });
  }
  ilhaCache = c;
  return c;
};

export const desenharAgua = (ctx: Ctx, f: number) => {
  ret(ctx, -M, -M, MW, MH, "#2F7DD8");
  for (let ty = -M; ty < H + M; ty += 10) {
    const linha = Math.floor((ty + M) / 10);
    for (let tx = -M - 20; tx < W + M; tx += 22) {
      const fase = hash(linha, Math.floor(tx / 22) + 50);
      const off = Math.floor((f * 0.25 + fase * 22 + (linha % 2) * 11)) % 22;
      const x = tx + off;
      const y = ty + Math.round(fase * 6);
      const vis = Math.floor(f / 12 + fase * 8) % 4 !== 0;
      if (vis) {
        ret(ctx, x, y, 4, 1, "#6FB8F4");
        ret(ctx, x + 1, y - 1, 2, 1, "#A8DAFF");
      }
      ret(ctx, x + 9, y + 4, 5, 1, "#2768C0");
    }
  }
};

export const desenharEspumaFlores = (ctx: Ctx, f: number) => {
  for (const [x, y] of espuma) {
    const onda = (Math.floor((x + y) / 3) + Math.floor(f / 8)) % 4;
    if (onda === 0) continue;
    px(ctx, x, y, onda === 1 ? "#FFFFFF" : "#BFE2FF");
  }
  for (const fl of flores) {
    const s = Math.floor((f + fl.fase) / 20) % 2;
    px(ctx, fl.x, fl.y + 1, "#3D7F33");
    const cx = fl.x + (s ? 1 : 0);
    px(ctx, cx - 1, fl.y - 1, fl.c);
    px(ctx, cx + 1, fl.y - 1, fl.c);
    px(ctx, cx, fl.y - 2, fl.c);
    px(ctx, cx, fl.y, fl.c);
    px(ctx, cx, fl.y - 1, "#F8E070");
  }
};

// a pedra entra na ordenação por profundidade junto com os lutadores
export const desenharPedra = (ctx: Ctx) => {
  const { x, y } = PEDRA;
  elipse(ctx, x + 1, y + 5, 15, 4, "rgba(60,40,20,0.35)");
  elipse(ctx, x, y - 4, 13, 9, "#1A1424");
  elipse(ctx, x, y - 4, 12, 8, "#7A808A");
  elipse(ctx, x - 2, y - 6, 9, 6, "#9AA0A8");
  elipse(ctx, x - 4, y - 8, 4, 2, "#C4CAD2");
  px(ctx, x + 5, y - 2, "#5E646E", 2);
  px(ctx, x - 6, y, "#5E646E", 2);
  anel(ctx, x + 3, y - 5, 2, "#6A707A");
};
export const PEDRA_BASE = PEDRA.y + 4;
