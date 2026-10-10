// Arena top-down estilo GBA/SNES: ilha de grama, borda de terra/pedra, água animada, árvores e tufos,
// "pirâmide em degraus" de areia no centro e uma pedra central. Saturação ~20% menor que os lutadores.
import { Img, hex, rgba } from './img.mjs';
import { rampa } from './cores.mjs';
import { hash } from './rng.mjs';
import { Tela } from './sprites/tela.mjs';

export const W = 360, H = 640;
export const CENTRO = [180, 372];
export const LIMITES = { x0: 36, x1: 324, y0: 234, y1: 516 };
export const PEDRA = { x: 180, y: 368, r: 17 };
const SAT = 0.78;
const Rp = (h, o = {}) => rampa(h, { sat: SAT, ...o });

const ILHA = { cx: 180, cy: 368, a: 170, b: 196 };
export function naIlha(x, y) {
  const dx = (x - ILHA.cx) / ILHA.a, dy = (y - ILHA.cy) / ILHA.b;
  const ang = Math.atan2(dy, dx);
  const ruido = Math.sin(ang * 7 + 1.3) * 0.018 + Math.sin(ang * 13 + 0.4) * 0.012;
  return dx ** 4 + dy ** 4 <= 1 + ruido;
}

const grama = Rp('#5FA04A'), grama2 = Rp('#6FB052'), terra = Rp('#9A6B45'), pedraR = Rp('#8A8A96'), areia = Rp('#D7BE86', { sat: 0.7 });
const agua = Rp('#3F86B8'), aguaFunda = Rp('#2F6C9C');

// ruído de valor suave (interpolação bilinear de uma grade de hashes)
function ruido(x, y, esc, sem) {
  const gx = x / esc, gy = y / esc, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const s = (t) => t * t * (3 - 2 * t);
  const a = hash(x0, y0, sem), b = hash(x0 + 1, y0, sem), c = hash(x0, y0 + 1, sem), d = hash(x0 + 1, y0 + 1, sem);
  return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
}
const BAYER = [[0, 0.5], [0.75, 0.25]];
function texturaGrama(img, x, y) {
  const n = ruido(x, y, 14, 5) * 0.7 + ruido(x, y, 5, 8) * 0.3;
  const d = BAYER[y & 1][x & 1] * 0.08;
  let c = grama.tons[2];
  if (n + d > 0.62) c = grama2.tons[2];
  if (n + d > 0.74) c = grama2.tons[3];
  if (n - d < 0.3) c = grama.tons[1];
  const h = hash(x, y, 11);
  if (h < 0.025) c = grama2.tons[3];
  else if (h < 0.04) c = grama.tons[1];
  img.set(x, y, c);
}

// tufo de grama (lâminas)
function tufo(img, x, y, s) {
  const pts = [[0, 0, 3], [-2, 1, 2], [2, 1, 2], [-1, 0, 3], [1, 0, 3]];
  for (const [dx, dy, h] of pts) for (let k = 0; k < h; k++) img.set(x + dx + (k === h - 1 ? Math.sign(dx) : 0), y + dy - k, k === h - 1 ? grama2.tons[4] : k === 0 ? grama.tons[0] : grama2.tons[3]);
  void s;
}
function flor(img, x, y, cor) {
  img.set(x, y, cor); img.set(x - 1, y, cor); img.set(x + 1, y, cor); img.set(x, y - 1, cor); img.set(x, y + 1, cor);
  img.set(x, y, hex('#F6D35A'));
}

// sprites de decoração montados com a mesma "tela de rótulos" dos lutadores
function arvore() {
  const mats = [Rp('#3E8A44', { sombraAlvo: 220 }), Rp('#7A5236')];
  const t = new Tela(48, 56, mats);
  const tr = t.parte(1, { limiar: 99 });
  t.ret(tr, 21, 34, 6, 16);
  t.poli(tr, [[19, 50], [29, 50], [27, 46], [21, 46]]);
  const folhas = [[24, 22, 15, 13], [15, 25, 9, 8], [33, 25, 9, 8], [24, 14, 10, 8], [18, 17, 8, 7], [31, 17, 8, 7], [24, 31, 11, 6], [14, 31, 7, 5], [34, 31, 7, 5]];
  for (const [x, y, rx, ry] of folhas) t.elipse(t.parte(0, { limiar: 5 }), x, y, rx, ry);
  const img = t.render();
  // pontinhos de luz nas folhas
  for (let i = 0; i < 26; i++) {
    const x = 10 + Math.floor(hash(i, 3) * 28), y = 8 + Math.floor(hash(i, 7) * 22);
    if (img.get(x, y) === mats[0].tons[3] || img.get(x, y) === mats[0].tons[2]) img.set(x, y, mats[0].tons[4]);
  }
  return img;
}
function pedraCentral() {
  const mats = [Rp('#8E8C99', { sombraAlvo: 250 }), Rp('#6F8A55')];
  const t = new Tela(48, 40, mats);
  const blocos = [[24, 22, 15, 12], [15, 25, 9, 8], [33, 26, 9, 7], [22, 14, 9, 7], [29, 17, 7, 6]];
  for (const [x, y, rx, ry] of blocos) t.elipse(t.parte(0, { limiar: 5 }), x, y, rx, ry);
  const musgo = t.parte(1, { limiar: 99 });
  t.elipse(musgo, 20, 11, 5, 2.5, [3, 4]);
  const img = t.render();
  // rachaduras
  for (const [x, y] of [[23, 20], [24, 21], [24, 22], [25, 23], [30, 26], [31, 27], [14, 24], [15, 25]]) img.set(x, y, mats[0].tons[0]);
  return img;
}
function arbusto() {
  const mats = [Rp('#4C944A', { sombraAlvo: 220 })];
  const t = new Tela(20, 14, mats);
  for (const [x, y, rx, ry] of [[10, 8, 7, 5], [6, 7, 4, 4], [14, 7, 4, 4], [10, 5, 4, 3]]) t.elipse(t.parte(0, { limiar: 4 }), x, y, rx, ry);
  return t.render();
}

let CACHE = null;
/** camada estática (ilha, areia, pedra, árvores) — calculada uma vez */
export function cenarioEstatico() {
  if (CACHE) return CACHE;
  const img = new Img(W, H);
  const ilha = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ilha[y * W + x] = naIlha(x + 0.5, y + 0.5) ? 1 : 0;
  const I = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : ilha[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (I(x, y)) {
      // borda de terra (2 px) + lábio claro no norte
      let borda = 99;
      for (let r = 1; r <= 3; r++) if (!I(x - r, y) || !I(x + r, y) || !I(x, y - r) || !I(x, y + r)) { borda = r; break; }
      if (borda <= 2) img.set(x, y, borda === 1 ? terra.tons[!I(x, y - 1) ? 3 : 1] : terra.tons[2]);
      else if (borda === 3) img.set(x, y, grama.tons[!I(x, y - 3) ? 3 : 1]);
      else texturaGrama(img, x, y);
      continue;
    }
    // penhasco: até 10 px abaixo da borda sul
    let k = 0;
    for (let r = 1; r <= 10; r++) if (I(x, y - r)) { k = r; break; }
    if (k) {
      const estrato = (y + Math.floor(hash(x >> 3, 1) * 3)) % 4;
      let c = pedraR.tons[k <= 2 ? 3 : k >= 8 ? 0 : estrato === 0 ? 0 : 1];
      if (hash(x, y, 9) < 0.08) c = pedraR.tons[2];
      if (!I(x - 1, y - k) || !I(x + 1, y - k)) c = pedraR.tons[0];
      img.set(x, y, c);
    }
  }
  // pirâmide de areia em degraus (3 níveis)
  const [cx, cy] = CENTRO;
  const niveis = [[118, 86, 0], [86, 62, 1], [54, 38, 2]];
  for (const [hw, hh, n] of niveis) {
    const base = areia.tons[2 + (n === 2 ? 1 : 0)];
    for (let y = cy - hh; y <= cy + hh; y++) for (let x = cx - hw; x <= cx + hw; x++) {
      // degraus: forma de diamante com cantos em escada
      const dx = Math.abs(x - cx) / hw, dy = Math.abs(y - cy) / hh;
      const passo = Math.floor((dx + dy) * 6) / 6;
      if (dx + dy > 1.18 || passo > 1) continue;
      let c = base;
      if (hash(x, y, 21 + n) < 0.07) c = areia.tons[n === 2 ? 4 : 3];
      if (hash(x, y, 31 + n) < 0.04) c = areia.tons[1];
      img.set(x, y, c);
    }
    // arestas: degrau visível ao sul/leste (sombra) e luz ao norte/oeste
    for (let y = cy - hh - 1; y <= cy + hh + 3; y++) for (let x = cx - hw - 2; x <= cx + hw + 2; x++) {
      const dentro = (xx, yy) => { const dx = Math.abs(xx - cx) / hw, dy = Math.abs(yy - cy) / hh; return dx + dy <= 1.18 && Math.floor((dx + dy) * 6) / 6 <= 1; };
      if (!dentro(x, y)) {
        if (dentro(x, y - 1) || dentro(x, y - 2)) img.set(x, y, areia.tons[dentro(x, y - 1) ? 0 : 1]);
        continue;
      }
      if (!dentro(x, y - 1) || !dentro(x - 1, y)) img.set(x, y, areia.tons[4]);
      else if (!dentro(x + 1, y)) img.set(x, y, areia.tons[1]);
    }
  }
  // detalhes: tufos e flores espalhados na grama (fora da areia)
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(hash(i, 1, 77) * W), y = Math.floor(hash(i, 2, 77) * H);
    if (!I(x, y) || !I(x, y + 4) || !I(x - 4, y) || !I(x + 4, y)) continue;
    const dx = Math.abs(x - cx) / 120, dy = Math.abs(y - cy) / 88;
    if (dx + dy < 1.25) continue;
    if (hash(i, 9) < 0.18) flor(img, x, y, hash(i, 4) < 0.5 ? hex('#F2EEF6') : hex('#E98AA6'));
    else tufo(img, x, y);
  }
  const arv = arvore(), bus = arbusto();
  const sombra = (x, y, rx, ry) => img.elipse(x, y, rx, ry, rgba(20, 40, 30, 90));
  for (const [x, y] of [[26, 208], [334, 206], [22, 532], [338, 528], [62, 186], [298, 184]]) {
    sombra(x + 3, y + 22, 15, 5);
    img.blit(arv, x - 24, y - 30);
  }
  for (const [x, y] of [[96, 196], [262, 194], [70, 540], [292, 544], [16, 380], [344, 372]]) { sombra(x, y + 6, 9, 3); img.blit(bus, x - 10, y - 7); }
  const pd = pedraCentral();
  sombra(PEDRA.x + 2, PEDRA.y + 13, 18, 5);
  img.blit(pd, PEDRA.x - 24, PEDRA.y - 24);
  CACHE = { img, ilha };
  return CACHE;
}

/** água animada (camada de fundo) — base e espuma pré-calculadas, só as ondas mudam por quadro */
let AGUA = null;
export function desenharAgua(img, t, ilha) {
  if (!AGUA) {
    const base = new Uint32Array(W * H), espuma = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (ilha[i]) continue;
      const prof = ruido(x, y, 40, 3) + BAYER[y & 1][x & 1] * 0.1;
      base[i] = prof > 0.62 ? aguaFunda.tons[2] : agua.tons[2];
      if (y > 0 && y < H - 1 && x > 0 && x < W - 1) {
        let perto = 0;
        for (let r = 1; r <= 13; r++) if (ilha[Math.max(0, y - r) * W + x]) { perto = r; break; }
        if (ilha[i - 1] || ilha[i + 1] || ilha[i + W] || perto === 1) espuma[i] = 1;
        else if (ilha[i - 2] || ilha[i + 2] || ilha[i + 2 * W] || perto === 11 || perto === 12) espuma[i] = 2;
      }
    }
    AGUA = { base, espuma };
  }
  const { base, espuma } = AGUA;
  for (let y = 0; y < H; y++) {
    const onda = y % 6 === 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (ilha[i]) continue;
      let c = base[i];
      if (onda) {
        const w = Math.sin(x * 0.21 + (y / 6) * 1.7 + t * 0.09) + Math.sin(x * 0.07 - t * 0.05 + y * 0.4);
        if (w > 1.9) c = agua.tons[4]; else if (w > 1.72) c = agua.tons[3];
      }
      const e = espuma[i];
      if (e === 1) c = agua.tons[4];
      else if (e === 2 && Math.sin(t * 0.12 + x * 0.15 + y * 0.1) > -0.1) c = agua.tons[3];
      img.d[i] = c;
    }
  }
}
