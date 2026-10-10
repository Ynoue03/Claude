// Desenho das arenas (temas.ts): fundo animado, chão, plataforma em degraus, decoração, obstáculo
// central, partículas e luz noturna. Tudo em pixel na resolução interna.
import { mistura, sombra, tom } from "./cores";
import { anel, disco, elipse, linha, px, ret, type Ctx } from "./pixel";
import { hash } from "./rng";
import { ARENA, CENTRO, H, PEDRA, W } from "./tempo";
import { TEMAS, type Decor, type Tema } from "./temas";

export const M = 12; // margem do mundo (para o tremor de tela não mostrar bordas)
export const MW = W + M * 2;
export const MH = H + M * 2;

export const tema = (id: string) => TEMAS.find((t) => t.id === id) ?? TEMAS[0];

const ILHA = { x0: 6, y0: 112, x1: 263, y1: 414, r: 18 };
const naIlha = (x: number, y: number) => {
  const { x0, y0, x1, y1, r } = ILHA;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const temIlha = (t: Tema) => t.fundo === "agua" || t.fundo === "abismo";

export const noOct = (x: number, y: number, a: number, b: number, k = ARENA.k) => {
  const dx = Math.abs(x - CENTRO.x);
  const dy = Math.abs(y - CENTRO.y);
  return dx <= a && dy <= b && dx / a + dy / b <= k;
};
const naForma = (forma: string, x: number, y: number, a: number, b: number) => {
  const dx = x - CENTRO.x;
  const dy = y - CENTRO.y;
  if (forma === "quadrado") return Math.abs(dx) <= a * 0.94 && Math.abs(dy) <= b * 0.94;
  if (forma === "circulo") return (dx / (a * 1.04)) ** 2 + (dy / (b * 1.04)) ** 2 <= 1;
  return noOct(x, y, a, b);
};
const DEGRAUS = [
  [ARENA.a + 16, ARENA.b + 16],
  [ARENA.a + 8, ARENA.b + 8],
  [ARENA.a - 22, ARENA.b - 24],
  [ARENA.a - 50, ARENA.b - 56],
  [ARENA.a - 74, ARENA.b - 82],
];

const novo = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

// ── texturas do chão ───────────────────────────────────
const corChao = (t: Tema, x: number, y: number) => {
  const [base, v1, v2] = t.chao.cores;
  const h = hash(x, y);
  switch (t.chao.tipo) {
    case "grama":
      return h < 0.07 ? v1 : h > 0.95 ? v2 : (x + y) % 7 === 0 && h > 0.6 ? mistura(base, v1, 0.5) : base;
    case "pedra": {
      const linhaY = Math.floor(y / 5);
      const ox = (linhaY % 2) * 4;
      const borda = y % 5 === 0 || (x + ox) % 8 === 0;
      const cel = hash(Math.floor((x + ox) / 8), linhaY);
      if (borda) return v1;
      return cel < 0.3 ? mistura(base, v1, 0.35) : cel > 0.8 ? v2 : h > 0.97 ? v2 : base;
    }
    case "asfalto":
      return h < 0.06 ? v1 : h > 0.94 ? v2 : base;
    case "concreto":
      return x % 24 === 0 || y % 24 === 0 ? v1 : h > 0.96 ? v2 : base;
    default:
      return h < 0.05 ? v1 : h > 0.96 ? v2 : base;
  }
};

// ── decoração ──────────────────────────────────────────
const arvore = (ctx: Ctx, x: number, y: number, c: [string, string, string, string]) => {
  elipse(ctx, x + 1, y + 2, 11, 3, "rgba(20,30,20,0.35)");
  ret(ctx, x - 2, y - 7, 5, 9, "#6E4426");
  ret(ctx, x - 2, y - 7, 1, 9, "#8A5A34");
  disco(ctx, x, y - 16, 12, c[0]);
  disco(ctx, x, y - 17, 11, c[1]);
  disco(ctx, x - 4, y - 20, 6, c[2]);
  disco(ctx, x + 4, y - 14, 5, mistura(c[1], c[2], 0.5));
  disco(ctx, x - 5, y - 22, 3, mistura(c[2], c[3], 0.5));
  px(ctx, x - 6, y - 24, c[3], 2);
  px(ctx, x + 3, y - 18, c[2], 2);
};

const decorar = (ctx: Ctx, d: Decor, t: Tema) => {
  const arv = t.arvore ?? ["#1F4F2A", "#2E6B34", "#3F8A44", "#7CC46E"];
  const { x, y } = d;
  switch (d.t) {
    case "arvore":
    case "cerejeira":
      arvore(ctx, x, y, arv);
      break;
    case "ajisa": {
      // árvore de Namek: tronco fino e copa redonda azul-esverdeada no alto
      elipse(ctx, x + 1, y + 2, 8, 2, "rgba(20,40,30,0.35)");
      ret(ctx, x - 1, y - 20, 3, 22, "#6A7A50");
      ret(ctx, x - 1, y - 20, 1, 22, "#8A9A6A");
      disco(ctx, x, y - 27, 9, arv[0]);
      disco(ctx, x, y - 28, 8, arv[1]);
      disco(ctx, x - 3, y - 31, 4, arv[2]);
      px(ctx, x - 4, y - 33, arv[3], 2);
      break;
    }
    case "palmeira": {
      elipse(ctx, x + 2, y + 2, 9, 2, "rgba(20,40,20,0.3)");
      for (let k = 0; k < 22; k++) px(ctx, x + Math.round(Math.sin(k / 7) * 2), y - k, k % 3 ? "#8A6A40" : "#6E5030", 2);
      for (const [dx, dy] of [[-10, 2], [10, 2], [-8, -4], [8, -5], [0, -7]])
        linha(ctx, x, y - 22, x + dx, y - 22 + dy + 4, "#2E7A34", 2);
      for (const [dx, dy] of [[-12, 4], [12, 4], [-9, -3], [9, -3]]) px(ctx, x + dx, y - 22 + dy + 3, "#46A040", 2);
      break;
    }
    case "estatua": {
      // estátuas gigantes do Vale do Fim (vistas do alto), braço erguido para o centro
      const c = d.cor ?? "#9A9AA0";
      const l = d.lado ?? 1;
      ret(ctx, x - 16, y + 18, 32, 10, sombra(c, 0.4));
      ret(ctx, x - 16, y + 18, 32, 2, tom(c, 0.15));
      ret(ctx, x - 9, y + 8, 18, 12, sombra(c, 0.2));
      ret(ctx, x - 12, y - 18, 24, 28, c);
      ret(ctx, x - 12, y - 18, 24, 3, tom(c, 0.25));
      ret(ctx, x + (l > 0 ? 9 : -12), y - 18, 3, 28, sombra(c, 0.25));
      disco(ctx, x, y - 26, 8, c);
      disco(ctx, x - 2 * l, y - 28, 4, tom(c, 0.2));
      ret(ctx, x - 7, y - 34, 14, 4, sombra(c, 0.35));
      linha(ctx, x + 10 * l, y - 12, x + 18 * l, y - 30, c, 4);
      ret(ctx, x + 16 * l - 2, y - 36, 4, 6, tom(c, 0.15));
      for (let k = 0; k < 8; k++) px(ctx, x - 12 + Math.floor(hash(k, x) * 24), y - 18 + Math.floor(hash(k, y) * 36), "#5E7A4A");
      break;
    }
    case "rocha":
      elipse(ctx, x + 1, y + 3, 8, 2, "rgba(30,20,10,0.3)");
      elipse(ctx, x, y - 2, 7, 5, "#1A1424");
      elipse(ctx, x, y - 2, 6, 4, "#7A808A");
      elipse(ctx, x - 2, y - 3, 3, 2, "#A8AEB6");
      break;
    case "pilar-quebrado":
    case "pilar": {
      const h = d.t === "pilar" ? 26 : 14;
      elipse(ctx, x + 2, y + 2, 8, 2, "rgba(30,20,10,0.35)");
      ret(ctx, x - 5, y - h, 10, h, "#C8C2B6");
      ret(ctx, x - 5, y - h, 2, h, "#E6E0D6");
      ret(ctx, x + 3, y - h, 2, h, "#9A9488");
      ret(ctx, x - 6, y - 3, 12, 3, "#A8A296");
      if (d.t === "pilar-quebrado") {
        for (let k = -5; k < 5; k++) px(ctx, x + k, y - h - Math.floor(hash(k, y) * 3), "#C8C2B6");
        px(ctx, x + 8, y - 1, "#B0AA9E", 2);
        px(ctx, x - 9, y, "#B0AA9E", 2);
      } else ret(ctx, x - 7, y - h - 3, 14, 3, "#E6E0D6");
      break;
    }
    case "bandeira":
      ret(ctx, x, y - 26, 1, 28, "#5A4A3A");
      ret(ctx, x + 1, y - 26, 10, 7, d.cor ?? "#F4F4F8");
      ret(ctx, x + 1, y - 20, 10, 1, sombra(d.cor ?? "#F4F4F8", 0.3));
      if (t.id === "marineford") {
        ret(ctx, x + 4, y - 24, 4, 3, "#2E5BC8");
      } else px(ctx, x + 5, y - 24, "#C8302A", 2);
      break;
    case "telhado": {
      // telhados vermelhos do pavilhão do torneio
      const c = d.cor ?? "#C8302A";
      ret(ctx, x - 16, y - 2, 32, 12, "#E8E0D0");
      ret(ctx, x - 12, y, 4, 8, "#3A2A20");
      ret(ctx, x + 8, y, 4, 8, "#3A2A20");
      for (let k = 0; k < 9; k++) ret(ctx, x - 20 + k, y - 4 - k, 40 - k * 2, 1, k % 2 ? c : tom(c, -0.15));
      ret(ctx, x - 22, y - 4, 44, 2, tom(c, -0.3));
      px(ctx, x - 1, y - 15, "#F2C230", 3);
      break;
    }
    case "gelo":
      elipse(ctx, x, y, 14, 6, "#9ACAE8");
      elipse(ctx, x, y - 2, 13, 5, "#E8F6FF");
      elipse(ctx, x - 4, y - 3, 5, 2, "#FFFFFF");
      break;
    case "predio": {
      const w = d.w ?? 60;
      const h = d.h ?? 40;
      const c = d.cor ?? "#2A2E44";
      ret(ctx, x, y - h, w, h, c);
      ret(ctx, x, y - h, w, 2, tom(c, 0.25));
      ret(ctx, x, y - 2, w, 2, sombra(c, 0.4));
      for (let wy = y - h + 5; wy < y - 5; wy += 6)
        for (let wx = x + 3; wx < x + w - 4; wx += 6) {
          const aceso = hash(wx, wy) > 0.45;
          ret(ctx, wx, wy, 3, 3, aceso ? "#FFE8A0" : "#1A1C28");
        }
      break;
    }
    case "poste":
      elipse(ctx, x + 1, y + 1, 4, 1, "rgba(0,0,0,0.35)");
      ret(ctx, x, y - 24, 2, 25, "#5A5E68");
      ret(ctx, x - 3, y - 26, 8, 3, "#3A3E48");
      ret(ctx, x - 2, y - 23, 6, 1, "#FFE8A0");
      break;
    case "sokyoku": {
      // a grande estrutura de execução no alto da colina
      ret(ctx, x - 40, y - 4, 80, 6, "#5A3A28");
      ret(ctx, x - 36, y - 26, 6, 26, "#8A2A20");
      ret(ctx, x + 30, y - 26, 6, 26, "#8A2A20");
      ret(ctx, x - 44, y - 30, 88, 5, "#6A2018");
      ret(ctx, x - 44, y - 30, 88, 1, "#B04A38");
      ret(ctx, x - 2, y - 26, 4, 22, "#C8C2B6");
      linha(ctx, x, y - 4, x, y + 8, "#F2C230", 2);
      break;
    }
    case "trilho":
      for (let k = 0; k < W; k += 6) ret(ctx, k, y - 3, 4, 8, "#5A4030");
      ret(ctx, 0, y - 2, W, 1, "#A8AEB6");
      ret(ctx, 0, y + 3, W, 1, "#A8AEB6");
      break;
    case "trem":
      for (let k = 0; k < 5; k++) {
        const cx = x + k * 54;
        ret(ctx, cx, y - 10, 50, 14, "#1E4A34");
        ret(ctx, cx, y - 10, 50, 2, "#2E6A4A");
        ret(ctx, cx, y + 2, 50, 2, "#12301E");
        for (let j = 0; j < 5; j++) ret(ctx, cx + 4 + j * 9, y - 6, 5, 4, "#FFD890");
        ret(ctx, cx + 50, y - 4, 4, 2, "#3A3A40");
      }
      break;
  }
};

// ── camada estática (pré-desenhada uma vez por tema) ───
type Cache = { canvas: HTMLCanvasElement; espuma: [number, number][]; flores: { x: number; y: number; c: string; fase: number }[] };
const caches = new Map<string, Cache>();

export const estatico = (t: Tema): Cache => {
  const c0 = caches.get(t.id);
  if (c0) return c0;
  const c = novo(MW, MH);
  const ctx = c.getContext("2d")!;
  ctx.translate(M, M);
  const ilha = temIlha(t);
  const pen = t.penhasco ?? ["#7A4C2A", "#9AA0A8", "#5E646E"];
  for (let y = -M; y < H + M; y++)
    for (let x = -M; x < W + M; x++) {
      if (!ilha || naIlha(x, y)) {
        px(ctx, x, y, corChao(t, x, y));
        if (ilha && !naIlha(x, y - 1)) px(ctx, x, y, t.chao.cores[3]);
      } else {
        let k = 0;
        const fundo = t.fundo === "abismo" ? 14 : 6;
        for (let d = 1; d <= fundo; d++) if (naIlha(x, y - d)) { k = d; break; }
        if (k) {
          const h = hash(x, y + 999);
          const cor = k <= 2 ? pen[0] : k <= fundo - 2 ? (h < 0.4 ? sombra(pen[1], 0.1) : pen[1]) : pen[2];
          px(ctx, x, y, cor);
        } else if (naIlha(x - 1, y) || naIlha(x + 1, y) || naIlha(x, y + 1)) px(ctx, x, y, sombra(t.chao.cores[1], 0.3));
      }
    }
  if (t.fundo === "estadio") {
    // arquibancadas em volta, com a torcida
    for (let y = -M; y < H + M; y++)
      for (let x = -M; x < W + M; x++) {
        const dentro = x >= 14 && x <= 256 && y >= 118 && y <= 406;
        if (dentro) continue;
        const fileira = Math.floor(y / 4) + Math.floor(x / 4);
        const banco = y % 4 === 3 || x % 4 === 3;
        px(ctx, x, y, banco ? "#4A5060" : hash(fileira, Math.floor(x / 4)) > 0.5 ? "#5A6070" : "#646A7A");
      }
    ret(ctx, 12, 116, 246, 2, "#E8ECF0");
    ret(ctx, 12, 406, 246, 2, "#2A2E38");
    ret(ctx, 12, 116, 2, 292, "#E8ECF0");
    ret(ctx, 256, 116, 2, 292, "#2A2E38");
  }
  if (t.fundo === "cidade") {
    // calçadas
    for (let y = -M; y < H + M; y++)
      for (let x = -M; x < W + M; x++) {
        const calcada = x < 8 || x > 262 || y < 118 || y > 410;
        if (calcada) px(ctx, x, y, (x + y) % 6 === 0 ? "#6A6C76" : "#7A7C86");
      }
  }
  // plataforma em degraus
  const pl = t.plataforma;
  DEGRAUS.forEach(([a, b], i) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!naForma(pl.forma, x, y, a, b)) continue;
        let cor = pl.cores[i];
        const h = hash(x * 3 + i, y);
        if (t.chao.tipo !== "asfalto") {
          if (h < 0.04) cor = sombra(cor, 0.12);
          else if (h > 0.975) cor = tom(cor, 0.25);
        }
        if (pl.ladrilho && (x % 12 === 0 || y % 12 === 0) && i > 0) cor = pl.ladrilho;
        const baixo = !naForma(pl.forma, x, y + 1, a, b) || !naForma(pl.forma, x, y + 2, a, b);
        if (baixo) cor = i === 0 ? pl.contorno : pl.degrau;
        else if (!naForma(pl.forma, x, y - 1, a, b)) cor = i === 0 ? pl.degrau : tom(pl.cores[i], 0.3);
        else if (!naForma(pl.forma, x - 1, y, a, b) || !naForma(pl.forma, x + 1, y, a, b)) cor = i === 0 ? pl.contorno : pl.degrau;
        px(ctx, x, y, cor);
      }
  });
  if (pl.faixas) {
    // faixas de pedestre do cruzamento de Shibuya
    const C = CENTRO;
    for (let k = -60; k <= 60; k += 10) {
      ret(ctx, C.x + k - 3, C.y - 92, 6, 18, pl.faixas);
      ret(ctx, C.x + k - 3, C.y + 74, 6, 18, pl.faixas);
    }
    for (let k = -70; k <= 70; k += 10) {
      ret(ctx, C.x - 92, C.y + k - 3, 18, 6, pl.faixas);
      ret(ctx, C.x + 74, C.y + k - 3, 18, 6, pl.faixas);
    }
    for (let k = -50; k <= 50; k += 10) {
      ret(ctx, C.x + k - 2, C.y + k * 1.1 - 2, 5, 5, tom(pl.faixas, -0.15));
      ret(ctx, C.x - k - 2, C.y + k * 1.1 - 2, 5, 5, tom(pl.faixas, -0.15));
    }
  }
  // tufos e flores só onde é grama
  const flores: Cache["flores"] = [];
  if (t.chao.tipo === "grama") {
    for (let k = 0; k < 140; k++) {
      const x = Math.round(10 + hash(k, 1) * 250);
      const y = Math.round(118 + hash(k, 2) * 290);
      if ((ilha && !naIlha(x, y)) || naForma(pl.forma, x, y, ARENA.a + 22, ARENA.b + 22)) continue;
      const d = sombra(t.chao.cores[1], 0.2);
      px(ctx, x, y, d);
      px(ctx, x + 2, y, d);
      px(ctx, x + 1, y - 1, d);
      px(ctx, x + 1, y - 2, t.chao.cores[3]);
    }
    if (t.flores) {
      const CORES = ["#F04A5A", "#F8D048", "#FFFFFF", "#F28AC8", "#8AB8F8"];
      for (let k = 0; k < 70; k++) {
        const x = Math.round(12 + hash(k, 11) * 246);
        const y = Math.round(120 + hash(k, 12) * 286);
        if ((ilha && !naIlha(x, y)) || naForma(pl.forma, x, y, ARENA.a + 22, ARENA.b + 22)) continue;
        if (t.decor.some((d) => Math.hypot(d.x - x, d.y - 14 - y) < 16)) continue;
        flores.push({ x, y, c: CORES[k % CORES.length], fase: Math.floor(hash(k, 13) * 40) });
      }
    }
  }
  [...t.decor].sort((a, b) => a.y - b.y).forEach((d) => decorar(ctx, d, t));
  const espuma: [number, number][] = [];
  if (t.fundo === "agua")
    for (let y = 100; y < 428; y++)
      for (let x = -2; x < W + 2; x++) {
        if (naIlha(x, y)) continue;
        let terra = false;
        for (let d = 0; d <= 6 && !terra; d++) if (naIlha(x, y - d)) terra = true;
        if (terra) continue;
        const viz = [[1, 0], [-1, 0], [0, -1], [0, 1]].some(([dx, dy]) => {
          for (let d = 0; d <= 6; d++) if (naIlha(x + dx, y + dy - d)) return true;
          return false;
        });
        if (viz) espuma.push([x, y]);
      }
  const out = { canvas: c, espuma, flores };
  caches.set(t.id, out);
  return out;
};

// ── camadas animadas ───────────────────────────────────
export const desenharFundo = (ctx: Ctx, t: Tema, f: number) => {
  if (t.fundo === "agua") {
    const [base, clara, escura] = t.agua ?? ["#2F7DD8", "#6FB8F4", "#2768C0"];
    ret(ctx, -M, -M, MW, MH, base);
    for (let ty = -M; ty < H + M; ty += 10) {
      const lin = Math.floor((ty + M) / 10);
      for (let tx = -M - 20; tx < W + M; tx += 22) {
        const fase = hash(lin, Math.floor(tx / 22) + 50);
        const off = Math.floor(f * 0.25 + fase * 22 + (lin % 2) * 11) % 22;
        const x = tx + off;
        const y = ty + Math.round(fase * 6);
        if (Math.floor(f / 12 + fase * 8) % 4 !== 0) {
          ret(ctx, x, y, 4, 1, clara);
          ret(ctx, x + 1, y - 1, 2, 1, tom(clara, 0.4));
        }
        ret(ctx, x + 9, y + 4, 5, 1, escura);
      }
    }
  } else if (t.fundo === "abismo") {
    const [ceu, nuvem] = t.ceu ?? ["#8CC8F0", "#F4FAFF"];
    ret(ctx, -M, -M, MW, MH, ceu);
    for (let k = 0; k < 14; k++) {
      const y = -M + hash(k, 1) * (H + 2 * M);
      const x = ((hash(k, 2) * (W + 80) + f * (0.15 + hash(k, 3) * 0.2)) % (W + 80)) - 40;
      elipse(ctx, x, y, 14 + hash(k, 4) * 10, 4, tom(nuvem, -0.06));
      elipse(ctx, x - 4, y - 2, 9, 3, nuvem);
    }
  } else {
    ret(ctx, -M, -M, MW, MH, t.chao.cores[0]);
  }
};

export const desenharAnimado = (ctx: Ctx, t: Tema, f: number) => {
  const st = estatico(t);
  for (const [x, y] of st.espuma) {
    const onda = (Math.floor((x + y) / 3) + Math.floor(f / 8)) % 4;
    if (onda) px(ctx, x, y, onda === 1 ? "#FFFFFF" : "#BFE2FF");
  }
  for (const fl of st.flores) {
    const s = Math.floor((f + fl.fase) / 20) % 2;
    px(ctx, fl.x, fl.y + 1, "#3D7F33");
    const cx = fl.x + (s ? 1 : 0);
    px(ctx, cx - 1, fl.y - 1, fl.c);
    px(ctx, cx + 1, fl.y - 1, fl.c);
    px(ctx, cx, fl.y - 2, fl.c);
    px(ctx, cx, fl.y, fl.c);
    px(ctx, cx, fl.y - 1, "#F8E070");
  }
  if (t.cachoeira) {
    // queda d'água entre as estátuas, descendo para fora da ilha
    for (let y = 422; y < H + M; y++)
      for (let x = 110; x < 160; x++) {
        const v = (((y * 2 - f * 3 + Math.floor(hash(x, 0) * 20)) % 12) + 12) % 12;
        px(ctx, x, y, v < 3 ? "#FFFFFF" : v < 6 ? "#BFE2FF" : "#7CC4F0");
      }
  }
  if (t.fundo === "estadio") {
    // torcida: cabeças coloridas que pulam
    const CORES = ["#F04A5A", "#F8D048", "#48D060", "#3A8CF0", "#F4F4F8", "#F28AC8"];
    for (let k = 0; k < 160; k++) {
      const lado = k % 4;
      const u = hash(k, 7);
      let x = 0;
      let y = 0;
      if (lado === 0) [x, y] = [u * W, 60 + hash(k, 8) * 54];
      else if (lado === 1) [x, y] = [u * W, 412 + hash(k, 8) * 60];
      else if (lado === 2) [x, y] = [hash(k, 8) * 12, 118 + u * 290];
      else [x, y] = [258 + hash(k, 8) * 12, 118 + u * 290];
      const pulo = Math.floor((f + k * 5) / 9) % 3 === 0 ? 1 : 0;
      ret(ctx, x, y - pulo, 2, 2, CORES[k % CORES.length]);
      px(ctx, x, y + 2 - pulo, "#F2C49A");
    }
  }
};

// obstáculo central (entra na ordenação por profundidade)
export const desenharCentro = (ctx: Ctx, t: Tema) => {
  const { x, y } = PEDRA;
  switch (t.centro) {
    case "pedra":
      elipse(ctx, x + 1, y + 5, 15, 4, "rgba(60,40,20,0.35)");
      elipse(ctx, x, y - 4, 13, 9, "#1A1424");
      elipse(ctx, x, y - 4, 12, 8, "#7A808A");
      elipse(ctx, x - 2, y - 6, 9, 6, "#9AA0A8");
      elipse(ctx, x - 4, y - 8, 4, 2, "#C4CAD2");
      px(ctx, x + 5, y - 2, "#5E646E", 2);
      px(ctx, x - 6, y, "#5E646E", 2);
      anel(ctx, x + 3, y - 5, 2, "#6A707A");
      break;
    case "pilar":
      decorar(ctx, { t: "pilar", x, y: y + 4 }, t);
      break;
    case "escombros":
      elipse(ctx, x + 1, y + 5, 16, 4, "rgba(60,40,20,0.35)");
      for (let k = 0; k < 7; k++) {
        const ox = (hash(k, 1) - 0.5) * 22;
        const oy = (hash(k, 2) - 0.5) * 10;
        ret(ctx, x + ox - 4, y + oy - 6, 8, 6, CONTORNO_ESC);
        ret(ctx, x + ox - 3, y + oy - 5, 6, 4, k % 2 ? "#B8B0A0" : "#9A9282");
        ret(ctx, x + ox - 3, y + oy - 5, 6, 1, "#D8D0C0");
      }
      break;
    case "estatua-cao":
      // estátua do Hachiko, marco de Shibuya
      elipse(ctx, x + 1, y + 5, 12, 3, "rgba(0,0,0,0.4)");
      ret(ctx, x - 10, y - 4, 20, 9, "#6A6C76");
      ret(ctx, x - 10, y - 4, 20, 2, "#8A8C96");
      ret(ctx, x - 6, y - 14, 10, 10, "#5A4A2E");
      ret(ctx, x + 2, y - 20, 6, 8, "#5A4A2E");
      px(ctx, x + 3, y - 22, "#5A4A2E", 2);
      ret(ctx, x - 6, y - 14, 10, 2, "#8A7448");
      px(ctx, x + 6, y - 17, "#2A2018");
      break;
  }
};
const CONTORNO_ESC = "#3A3428";
export const BASE_CENTRO = PEDRA.y + 4;

// partículas do clima (folhas, pétalas, neve, brasas, cinzas)
export const desenharParticulas = (ctx: Ctx, t: Tema, f: number) => {
  const p = t.particulas;
  if (!p) return;
  for (let k = 0; k < p.n; k++) {
    const cor = p.cores[k % p.cores.length];
    const vel = 0.3 + hash(k, 1) * 0.5;
    const x0 = hash(k, 2) * (W + 40) - 20;
    const y0 = hash(k, 3) * (H + 40);
    let x = x0;
    let y = y0;
    if (p.tipo === "brasas") {
      y = (((y0 - f * vel) % (H + 40)) + H + 40) % (H + 40) - 20;
      x = x0 + Math.sin(f * 0.05 + k) * 4;
      if ((f + k * 3) % 20 < 3) continue;
      px(ctx, x, y, cor, hash(k, 4) > 0.7 ? 2 : 1);
    } else {
      y = ((y0 + f * vel) % (H + 40)) - 20;
      x = ((x0 + (p.tipo === "neve" ? Math.sin(f * 0.03 + k) * 6 : f * vel * 0.6)) % (W + 40) + W + 40) % (W + 40) - 20;
      if (p.tipo === "folhas" || p.tipo === "petalas") {
        const giro = Math.floor((f + k * 7) / 6) % 2;
        ret(ctx, x, y, giro ? 2 : 1, giro ? 1 : 2, cor);
        px(ctx, x + 1, y + 1, sombra(cor, 0.25));
      } else px(ctx, x, y, cor, p.tipo === "neve" && hash(k, 5) > 0.6 ? 2 : 1);
    }
  }
};

// noite (escurece o cenário antes dos lutadores) + luzes quentes
export const desenharNoite = (ctx: Ctx, t: Tema, f: number) => {
  if (t.tinta) {
    ctx.fillStyle = t.tinta;
    ctx.fillRect(-M, -M, MW, MH);
  }
  if (!t.noite) return;
  ctx.fillStyle = `rgba(10,12,40,${t.noite})`;
  ctx.fillRect(-M, -M, MW, MH);
  ctx.globalCompositeOperation = "lighter";
  for (const [x, y, r, c] of t.luzes ?? []) {
    const pisca = 0.9 + 0.1 * Math.sin(f * 0.2 + x);
    for (let k = 3; k >= 1; k--) {
      ctx.globalAlpha = 0.05 * pisca;
      disco(ctx, x, y, (r * k) / 3, c);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
};

// vinheta em degraus (visual retrô depois da ampliação)
export const desenharVinheta = (ctx: Ctx, t: Tema) => {
  const g = ctx.createRadialGradient(W / 2, H / 2 + 20, 120, W / 2, H / 2 + 20, 300);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(8,6,20,${t.noite ? 0.55 : 0.32})`);
  ctx.fillStyle = g;
  ctx.fillRect(-M, -M, MW, MH);
};

// versão do cenário na escala dos sprites (EPX/Scale2x sobre a imagem): bordas e curvas acompanham
// o detalhe dos personagens em vez de ficarem em blocos 2×/4× maiores.
const hd = new Map<string, HTMLCanvasElement>();
export const estaticoHD = (t: Tema, k: number) => {
  const base = estatico(t).canvas;
  if (k === 1) return base;
  const chave = `${t.id}|${k}`;
  const c0 = hd.get(chave);
  if (c0) return c0;
  let w = base.width;
  let h = base.height;
  let px = new Uint32Array(base.getContext("2d")!.getImageData(0, 0, w, h).data.buffer.slice(0));
  for (let e = 1; e < k; e *= 2) {
    const out = new Uint32Array(w * 2 * h * 2);
    const at = (x: number, y: number) => px[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const P = at(x, y);
        const A = at(x, y - 1);
        const B = at(x + 1, y);
        const C = at(x - 1, y);
        const D = at(x, y + 1);
        const i = y * 2 * w * 2 + x * 2;
        out[i] = C === A && C !== D && A !== B ? A : P;
        out[i + 1] = A === B && A !== C && B !== D ? B : P;
        out[i + w * 2] = D === C && D !== B && C !== A ? C : P;
        out[i + w * 2 + 1] = B === D && B !== A && D !== C ? D : P;
      }
    px = out;
    w *= 2;
    h *= 2;
  }
  const c = novo(w, h);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  img.data.set(new Uint8ClampedArray(px.buffer));
  ctx.putImageData(img, 0, 0);
  hd.set(chave, c);
  return c;
};
