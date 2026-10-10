// Sprites dos chefes (112×112, ~2,5× a altura dos heróis), desenhados do zero com o mesmo motor de pixel art.
// Vista de lado (olhando para a direita; a esquerda é espelhada). Poses: idle, andar, ataque, dano, derrota, vitória.
import { Tela, rampa, novoCanvas, tomVol, tomFixo } from "./pixel.ts";
import type { Rampa, OpForma, Tom } from "./pixel.ts";
import type { ChefeId } from "./chefes.ts";

export const CW = 112,
  CH = 112,
  CX = 56,
  CY = 106; // âncora (pés) dentro do quadro

type Anim = "idle" | "andar" | "ataque" | "magia" | "dano" | "derrota" | "vitoria";
type Pose = { bob: number; passo: number; golpe: number; boca: number; recua: number; caido: number; ruge: number };

const pose = (anim: Anim, q: number): Pose => {
  const p: Pose = { bob: 0, passo: 0, golpe: 0, boca: 0, recua: 0, caido: 0, ruge: 0 };
  switch (anim) {
    case "idle":
      p.bob = [0, 1, 1, 0][q % 4];
      break;
    case "andar":
      p.passo = [-1, 0, 1, 0, -1, 0][q % 6];
      p.bob = [0, 1, 0, 0, 1, 0][q % 6];
      break;
    case "ataque":
    case "magia":
      p.golpe = [0.15, 0.45, 1, 0.6, 0.3, 0.6, 0.2][q % 7];
      p.boca = [0.3, 0.6, 1, 1, 0.8, 0.5, 0.2][q % 7];
      break;
    case "dano":
      p.recua = q === 0 ? 3 : 2;
      p.boca = 0.6;
      break;
    case "derrota":
      p.caido = Math.min(1, (q + 1) / 3);
      p.recua = 2;
      break;
    case "vitoria":
      p.ruge = 1;
      p.boca = 1;
      p.bob = [0, -1, -1, 0][q % 4];
      break;
  }
  return p;
};

// ───────────── paletas por chefe ─────────────
type Pal = Record<string, string>;
const PALETAS: Record<ChefeId, Pal> = {
  MINOTAURO: { pelo: "#7a4a2e", pele: "#9a6444", chifre: "#e8dcc0", casco: "#2e2420", tanga: "#9c2a2e", metal: "#a8b0bc", madeira: "#6a4428", olho: "#ff4a3a", ouro: "#d8a838", boca: "#4a1a1a" },
  GRIFO: { pena: "#f0ece0", bico: "#e8b030", corpo: "#c09050", asa: "#8a5a32", garra: "#3a2e26", olho: "#e8c040", boca: "#5a2a1a", ponta: "#5a3a22" },
  HIDRA: { escama: "#3e8a4a", ventre: "#c8c080", espinho: "#2a5a3a", olho: "#ffd040", boca: "#8a2030", dente: "#f0ece0", escuro: "#1e3a28" },
  GIGANTE: { pele: "#c8946a", pelego: "#8a6a4a", couro: "#6a4428", barba: "#5a3a26", madeira: "#7a5232", olho: "#3a2a20", boca: "#5a2a24", corda: "#c8a060" },
  QUIMERA: { pelo: "#c89838", juba: "#8a4a20", bode: "#9a9aa0", chifre: "#4a3a30", asa: "#6a3a4a", cobra: "#4a8a3a", olho: "#ff6a2a", boca: "#5a1a1a", dente: "#f0ece0" },
  DRAGAO: { escama: "#b8322a", ventre: "#e8b060", asa: "#7a1e22", chifre: "#e8dcc0", olho: "#ffd040", boca: "#4a0e10", dente: "#f0ece0", garra: "#2a1a1a" },
};

const cacheRampas = new Map<ChefeId, { nomes: string[]; rampas: Rampa[] }>();
const rampasDe = (id: ChefeId) => {
  let r = cacheRampas.get(id);
  if (!r) {
    const nomes = Object.keys(PALETAS[id]);
    r = { nomes, rampas: nomes.map((n) => rampa(PALETAS[id][n])) };
    cacheRampas.set(id, r);
  }
  return r;
};

type Pinta = {
  t: Tela;
  m: (nome: string) => number;
  el: (cx: number, cy: number, rx: number, ry: number, mat: string, op?: OpForma) => void;
  po: (pts: [number, number][], mat: string, op?: OpForma) => void;
  ca: (x0: number, y0: number, x1: number, y1: number, r: number, mat: string, op?: OpForma) => void;
  px: (x: number, y: number, mat: string, tom?: Tom) => void;
  li: (x0: number, y0: number, x1: number, y1: number, mat: number, tom: Tom) => void;
};
const escamas: OpForma["padrao"] = (x, y, tt) => (tt === 1 && ((x + (Math.floor(y / 2) % 2) * 2) % 4 === 0) && y % 2 === 0 ? 2 : tt);
const pelos: OpForma["padrao"] = (x, y, tt) => (tt === 1 && (x * 2 + y) % 5 === 0 ? 2 : tt);
const penas: OpForma["padrao"] = (x, y, tt) => (tt <= 1 && (x + y * 2) % 6 === 0 ? 2 : tt);

// ───────────── desenhos ─────────────
const minotauro = (P: Pinta, p: Pose) => {
  const b = p.bob,
    s = p.passo * 3;
  const op = { linha: true, padrao: pelos };
  // perna de trás, perna da frente (cascos)
  P.ca(50 - s, 74 + b, 48 - s, 100, 6, "pelo", op);
  P.el(48 - s, 102, 6, 3, "casco");
  P.ca(62 + s, 74 + b, 64 + s, 100, 6.5, "pelo", op);
  P.el(64 + s, 102, 6.5, 3, "casco");
  // tanga
  P.po([[42, 70 + b], [72, 70 + b], [70, 84 + b], [44, 84 + b]], "tanga", { linha: true });
  // tronco musculoso
  P.el(56 - p.recua, 56 + b, 17, 18, "pele", { linha: true });
  P.el(60 - p.recua, 52 + b, 9, 7, "pele", { tom: tomVol(0.3) });
  P.li(52 - p.recua, 50 + b, 52 - p.recua, 66 + b, P.m("pele"), 2);
  // braço de trás
  P.ca(46, 46 + b, 40, 66 + b, 5, "pele", { linha: true });
  // machado grande (ergue e desce no golpe)
  const ang = -1.6 + p.golpe * 2.6 - p.ruge * 0.6;
  const hx = 70 + Math.cos(ang) * 6,
    hy = 50 + b + Math.sin(ang) * 6;
  const tx = hx + Math.cos(ang) * 44,
    ty = hy + Math.sin(ang) * 44;
  P.ca(hx - Math.cos(ang) * 8, hy - Math.sin(ang) * 8, tx, ty, 1.8, "madeira");
  const nx = -Math.sin(ang),
    ny = Math.cos(ang);
  const lam = (k: number): [number, number] => [tx - Math.cos(ang) * 10 + nx * k * 12, ty - Math.sin(ang) * 10 + ny * k * 12];
  P.po([[tx, ty], lam(1), [tx - Math.cos(ang) * 14, ty - Math.sin(ang) * 14], lam(-1)], "metal", { tom: tomVol(0.2), linha: true });
  // braço da frente segurando
  P.ca(64, 44 + b, hx, hy, 5.5, "pele", { linha: true });
  P.el(hx, hy, 4, 4, "pele");
  // cabeça de touro
  const cx = 64 - p.recua + p.golpe * 3,
    cy = 28 + b;
  P.el(cx, cy, 11, 10, "pelo", op);
  P.el(cx + 9, cy + 5, 7, 6, "pele", { tom: tomVol(0.2), linha: true }); // focinho
  P.px(cx + 13, cy + 4, "casco", 1);
  P.px(cx + 13, cy + 7, "casco", 1);
  P.el(cx + 12, cy + 9, 2.5, 2.5, "ouro", { tom: tomFixo(1) }); // argola
  P.px(cx + 12, cy + 9, "pele", 2);
  if (p.boca > 0.4) P.po([[cx + 5, cy + 9], [cx + 15, cy + 9], [cx + 13, cy + 12 + p.boca * 3], [cx + 6, cy + 11]], "boca");
  // chifres
  P.ca(cx - 4, cy - 7, cx - 14, cy - 14, 2.6, "chifre", { tom: tomVol(0.2) });
  P.ca(cx - 14, cy - 14, cx - 12, cy - 22, 1.8, "chifre", { tom: tomVol(0.2) });
  P.ca(cx + 4, cy - 8, cx + 10, cy - 17, 2.6, "chifre", { tom: tomVol(0.2) });
  P.ca(cx + 10, cy - 17, cx + 17, cy - 21, 1.8, "chifre", { tom: tomVol(0.2) });
  // olho brilhando
  P.px(cx + 4, cy - 1, "olho", 0);
  P.px(cx + 5, cy - 1, "olho", 1);
  P.px(cx + 4, cy - 3, "pelo", 3);
  P.px(cx + 5, cy - 3, "pelo", 3);
};

const grifo = (P: Pinta, p: Pose) => {
  const b = p.bob,
    s = p.passo * 3;
  // asa de trás
  const asa = p.ruge ? -10 : p.golpe * -8;
  P.po([[44, 50 + b], [20, 22 + asa + b], [14, 40 + asa + b], [30, 58 + b]], "asa", { linha: true, padrao: penas });
  // patas traseiras (leão)
  P.ca(36 - s, 72 + b, 34 - s, 100, 5.5, "corpo", { linha: true, padrao: pelos });
  P.el(34 - s, 101, 5, 2.5, "garra");
  // corpo de leão
  P.el(52 - p.recua, 70 + b, 24, 14, "corpo", { linha: true, padrao: pelos });
  // rabo
  P.ca(28, 68 + b, 14, 60 + b, 2, "corpo");
  P.el(12, 58 + b, 3.5, 3.5, "ponta");
  // pata dianteira com garras de águia
  P.ca(68 + s, 72 + b, 72 + s + p.golpe * 10, 96 - p.golpe * 10, 5, "pena", { linha: true, padrao: penas });
  P.el(72 + s + p.golpe * 10, 98 - p.golpe * 10, 4.5, 2.5, "bico");
  // peito de penas e pescoço
  P.el(70 - p.recua, 60 + b, 12, 14, "pena", { linha: true, padrao: penas });
  const cx = 78 - p.recua + p.golpe * 8,
    cy = 38 + b - p.golpe * 3;
  P.el(cx, cy, 10, 10, "pena", { linha: true, padrao: penas });
  // bico curvo
  P.po([[cx + 7, cy - 2], [cx + 19, cy + 1], [cx + 17, cy + 6], [cx + 8, cy + 6]], "bico", { tom: tomVol(0.2), linha: true });
  if (p.boca > 0.4) P.po([[cx + 8, cy + 4], [cx + 16, cy + 5], [cx + 9, cy + 8 + p.boca * 3]], "boca");
  P.px(cx + 3, cy - 2, "olho", 0);
  P.px(cx + 4, cy - 2, "garra", 1);
  P.px(cx + 3, cy - 4, "ponta", 2);
  // tufos na cabeça
  P.po([[cx - 6, cy - 6], [cx - 14, cy - 12], [cx - 4, cy - 9]], "pena", { tom: tomFixo(2) });
  // asa da frente (por cima)
  P.po([[50, 52 + b], [34, 18 + asa + b], [22, 30 + asa + b], [30, 46 + b], [44, 60 + b]], "asa", { linha: true, padrao: penas });
  for (let k = 0; k < 4; k++) P.li(32 + k * 4, 24 + asa + b + k * 6, 46, 54 + b, P.m("asa"), 3);
};

const hidra = (P: Pinta, p: Pose) => {
  const b = p.bob;
  const op = { linha: true, padrao: escamas };
  // rabo e corpo baixo
  P.ca(30, 88 + b, 10, 80 + b, 6, "escama", op);
  P.el(46 - p.recua, 86 + b, 26, 14, "escama", op);
  P.el(50 - p.recua, 92 + b, 18, 6, "ventre", { tom: tomVol(0.2) });
  // patas curtas
  for (const x of [34, 58]) {
    P.ca(x, 92 + b, x + 2, 102, 4.5, "escama", op);
    P.el(x + 3, 103, 4.5, 2, "escuro");
  }
  // pescoços com cabeças (3 a 5), balançando em fase diferente
  const n = 5;
  for (let k = 0; k < n; k++) {
    const fase = Math.sin(k * 1.7 + b * 0.8);
    const bx = 40 + k * 7 - p.recua,
      by = 78 + b;
    const ataca = p.golpe * (k % 2 === 0 ? 1 : 0.5);
    const hx = 40 + k * 12 + fase * 4 + ataca * 16 - p.recua,
      hy = 22 + Math.abs(k - 2) * 8 + fase * 3 - ataca * 4 + b;
    P.ca(bx, by, (bx + hx) / 2 - 6, (by + hy) / 2, 4.5, "escama", op);
    P.ca((bx + hx) / 2 - 6, (by + hy) / 2, hx, hy, 4, "escama", op);
    // cabeça de serpente
    P.el(hx + 4, hy, 7, 5, "escama", op);
    const abre = Math.max(p.boca * (k % 2 ? 0.6 : 1), 0.15);
    P.po([[hx + 4, hy + 1], [hx + 13, hy - 1], [hx + 12, hy + 2 + abre * 5], [hx + 4, hy + 4]], "boca");
    P.px(hx + 8, hy + 1, "dente", 0);
    P.px(hx + 11, hy + 1, "dente", 0);
    P.px(hx + 4, hy - 2, "olho", 0);
    P.po([[hx - 2, hy - 3], [hx - 6, hy - 8], [hx + 1, hy - 4]], "espinho", { tom: tomFixo(2) });
  }
  // espinhos nas costas
  for (let k = 0; k < 5; k++) P.po([[26 + k * 8, 76 + b], [30 + k * 8, 68 + b], [34 + k * 8, 76 + b]], "espinho", { tom: tomFixo(1) });
};

const gigante = (P: Pinta, p: Pose) => {
  const b = p.bob,
    s = p.passo * 3;
  // pernas grossas
  P.ca(48 - s, 72 + b, 46 - s, 100, 7, "couro", { linha: true });
  P.el(46 - s, 102, 8, 3, "couro");
  P.ca(62 + s, 72 + b, 64 + s, 100, 7.5, "pele", { linha: true });
  P.el(64 + s, 102, 8, 3, "couro");
  // pele de animal (tanga e ombro)
  P.po([[38, 64 + b], [76, 64 + b], [74, 80 + b], [40, 80 + b]], "pelego", { linha: true, padrao: pelos });
  // tronco
  P.el(56 - p.recua, 48 + b, 20, 20, "pele", { linha: true });
  P.li(46, 32 + b, 70, 66 + b, P.m("corda"), 1);
  P.el(50 - p.recua, 36 + b, 14, 7, "pelego", { linha: true, padrao: pelos });
  // braço de trás
  P.ca(40, 38 + b, 34, 62 + b, 6, "pele", { linha: true });
  // clava grande
  const ang = -1.7 + p.golpe * 2.7 - p.ruge * 0.5;
  const hx = 72 + Math.cos(ang) * 6,
    hy = 44 + b + Math.sin(ang) * 6;
  const tx = hx + Math.cos(ang) * 40,
    ty = hy + Math.sin(ang) * 40;
  P.ca(hx, hy, tx - Math.cos(ang) * 10, ty - Math.sin(ang) * 10, 3, "madeira", { linha: true });
  P.el(tx, ty, 9, 9, "madeira", { linha: true, padrao: (x, y, tt) => ((x + y) % 4 === 0 && tt <= 1 ? 2 : tt) });
  P.ca(68, 36 + b, hx, hy, 6.5, "pele", { linha: true });
  P.el(hx, hy, 5, 5, "pele");
  // cabeça com barba
  const cx = 60 - p.recua,
    cy = 18 + b;
  P.el(cx, cy, 11, 11, "pele", { linha: true });
  P.po([[cx - 6, cy + 2], [cx + 10, cy + 2], [cx + 8, cy + 18], [cx - 4, cy + 16]], "barba", { linha: true, padrao: pelos });
  P.el(cx - 1, cy - 8, 10, 5, "barba", { padrao: pelos });
  P.px(cx + 6, cy - 1, "olho", 1);
  P.px(cx + 7, cy - 1, "olho", 1);
  P.px(cx + 5, cy - 3, "barba", 3);
  P.px(cx + 7, cy - 3, "barba", 3);
  P.px(cx + 11, cy + 2, "pele", 2);
  if (p.boca > 0.4) P.po([[cx + 3, cy + 6], [cx + 10, cy + 6], [cx + 8, cy + 9 + p.boca * 2]], "boca");
};

const quimera = (P: Pinta, p: Pose) => {
  const b = p.bob,
    s = p.passo * 3;
  const asa = p.ruge ? -8 : p.golpe * -6;
  P.po([[44, 56 + b], [26, 30 + asa + b], [18, 44 + asa + b], [32, 60 + b]], "asa", { linha: true });
  // rabo de cobra
  P.ca(26, 70 + b, 12, 62 + b, 2.5, "cobra", { padrao: escamas });
  P.el(10, 60 + b, 4, 3, "cobra", { linha: true });
  P.px(9, 59 + b, "olho", 0);
  // patas e corpo de leão
  P.ca(34 - s, 74 + b, 32 - s, 100, 5.5, "pelo", { linha: true, padrao: pelos });
  P.ca(66 + s, 74 + b, 68 + s + p.golpe * 6, 100 - p.golpe * 6, 5.5, "pelo", { linha: true, padrao: pelos });
  P.el(52 - p.recua, 70 + b, 24, 14, "pelo", { linha: true, padrao: pelos });
  // cabeça de bode nas costas
  P.el(42, 50 + b, 7, 6, "bode", { linha: true });
  P.ca(40, 45 + b, 32, 38 + b, 2, "chifre");
  P.ca(32, 38 + b, 30, 44 + b, 1.5, "chifre");
  P.px(44, 49 + b, "olho", 0);
  // juba e cabeça de leão
  const cx = 76 - p.recua + p.golpe * 6,
    cy = 50 + b - p.golpe * 2;
  P.el(cx - 2, cy, 14, 14, "juba", { linha: true, padrao: pelos });
  P.el(cx + 3, cy + 1, 9, 9, "pelo", { linha: true });
  P.el(cx + 9, cy + 4, 5, 4, "pelo", { tom: tomVol(0.3) });
  P.px(cx + 13, cy + 2, "boca", 2);
  P.px(cx + 5, cy - 2, "olho", 0);
  P.px(cx + 6, cy - 2, "boca", 1);
  if (p.boca > 0.3) {
    P.po([[cx + 4, cy + 6], [cx + 14, cy + 6], [cx + 12, cy + 9 + p.boca * 4], [cx + 5, cy + 9]], "boca");
    P.px(cx + 7, cy + 6, "dente", 0);
    P.px(cx + 12, cy + 6, "dente", 0);
  }
  P.po([[44, 58 + b], [32, 26 + asa + b], [26, 36 + asa + b], [38, 64 + b]], "asa", { linha: true });
};

const dragao = (P: Pinta, p: Pose) => {
  const b = p.bob,
    s = p.passo * 3;
  const op = { linha: true, padrao: escamas };
  const asa = p.ruge ? -12 : p.golpe * -8;
  // asa de trás
  P.po([[46, 52 + b], [18, 6 + asa + b], [4, 24 + asa + b], [10, 46 + b], [36, 62 + b]], "asa", { linha: true });
  // cauda
  P.ca(30, 76 + b, 12, 86 + b, 6, "escama", op);
  P.ca(12, 86 + b, 2, 76 + b, 3.5, "escama", op);
  P.po([[0, 72 + b], [6, 76 + b], [2, 80 + b]], "chifre", { tom: tomFixo(1) });
  // patas
  P.ca(38 - s, 76 + b, 36 - s, 100, 6, "escama", op);
  P.el(36 - s, 102, 6, 3, "garra");
  P.ca(68 + s + p.golpe * 6, 76 + b, 70 + s + p.golpe * 10, 100 - p.golpe * 8, 6, "escama", op);
  P.el(71 + s + p.golpe * 10, 102 - p.golpe * 8, 6, 3, "garra");
  // corpo e ventre
  P.el(52 - p.recua, 72 + b, 26, 16, "escama", op);
  P.el(56 - p.recua, 80 + b, 18, 6, "ventre", { tom: tomVol(0.2), padrao: (x, y, tt) => (y % 3 === 0 && tt <= 1 ? 2 : tt) });
  // pescoço e cabeça
  const cx = 82 - p.recua + p.golpe * 6,
    cy = 32 + b - p.golpe * 2;
  P.ca(66, 62 + b, cx - 6, cy + 6, 7, "escama", op);
  P.el(cx, cy, 11, 9, "escama", op);
  P.po([[cx + 4, cy - 4], [cx + 22, cy + 1], [cx + 20, cy + 6], [cx + 4, cy + 7]], "escama", op); // focinho
  if (p.boca > 0.3) {
    P.po([[cx + 6, cy + 5], [cx + 21, cy + 5], [cx + 18, cy + 9 + p.boca * 5], [cx + 6, cy + 9]], "boca");
    for (let k = 0; k < 3; k++) P.px(cx + 9 + k * 4, cy + 5, "dente", 0);
  }
  P.px(cx + 19, cy, "garra", 1);
  P.px(cx + 3, cy - 3, "olho", 0);
  P.px(cx + 4, cy - 3, "boca", 1);
  // chifres
  P.ca(cx - 4, cy - 6, cx - 14, cy - 14, 2.2, "chifre", { tom: tomVol(0.2) });
  P.ca(cx - 1, cy - 7, cx - 6, cy - 17, 1.8, "chifre", { tom: tomVol(0.2) });
  // espinhos nas costas
  for (let k = 0; k < 6; k++) P.po([[30 + k * 7, 58 + b - (k > 3 ? 4 : 0)], [33 + k * 7, 50 + b - (k > 3 ? 4 : 0)], [36 + k * 7, 58 + b - (k > 3 ? 4 : 0)]], "chifre", { tom: tomFixo(2) });
  // asa da frente
  P.po([[50, 54 + b], [30, 2 + asa + b], [16, 16 + asa + b], [22, 40 + b], [44, 64 + b]], "asa", { linha: true });
  for (let k = 0; k < 3; k++) P.li(30 - k * 5, 4 + asa + b + k * 6, 46, 58 + b, P.m("chifre"), 2);
};

const DESENHO: Record<ChefeId, (P: Pinta, p: Pose) => void> = { MINOTAURO: minotauro, GRIFO: grifo, HIDRA: hidra, GIGANTE: gigante, QUIMERA: quimera, DRAGAO: dragao };
// onde fica a cabeça de cada um (para retrato, setas e textos)
export const CABECA: Record<ChefeId, { x: number; y: number }> = {
  MINOTAURO: { x: 66, y: 26 },
  GRIFO: { x: 80, y: 38 },
  HIDRA: { x: 64, y: 28 },
  GIGANTE: { x: 60, y: 18 },
  QUIMERA: { x: 78, y: 50 },
  DRAGAO: { x: 86, y: 32 },
};

const cache = new Map<string, HTMLCanvasElement>();
// escala: 1 = desenho original 112×112 (retrato, mini, CTA); 3 = no mundo (3× maior, redesenhado em resolução
// tripla — não é ampliado, então o pixel do chefe tem o mesmo tamanho do pixel dos heróis)
export const quadroChefe = (id: ChefeId, anim: Anim, q: number, dir: string, escala = 1): HTMLCanvasElement => {
  const chave = `${id}|${anim}|${q}|${dir}|${escala}`;
  const c0 = cache.get(chave);
  if (c0) return c0;
  const { nomes, rampas } = rampasDe(id);
  const E = escala;
  const w = CW * E,
    h = CH * E;
  const t = new Tela(w, h);
  const m = (nome: string) => nomes.indexOf(nome);
  const P: Pinta = {
    t,
    m,
    el: (cx, cy, rx, ry, mat, op) => t.elipse(cx * E, cy * E, rx * E, ry * E, m(mat), op),
    po: (pts, mat, op) => t.poli(pts.map(([x, y]) => [x * E, y * E]), m(mat), op),
    ca: (x0, y0, x1, y1, r, mat, op) => t.capsula(x0 * E, y0 * E, x1 * E, y1 * E, r * E, m(mat), op),
    px: (x, y, mat, tom = 1) => (E === 1 ? t.px(x, y, m(mat), tom) : t.ret(x * E, y * E, x * E + E - 1, y * E + E - 1, m(mat), { tom: tomFixo(tom) })),
    li: (x0, y0, x1, y1, mat, tom) => (E === 1 ? t.linha(x0, y0, x1, y1, mat, tom) : t.capsula(x0 * E, y0 * E, x1 * E, y1 * E, E / 2, mat, { tom: tomFixo(tom) })),
  };
  const p = pose(anim, q);
  DESENHO[id](P, p);
  let cv = novoCanvas(w, h);
  cv.getContext("2d")!.putImageData(t.cores(rampas), 0, 0);
  if (p.caido > 0) {
    // derrota: tomba de lado
    const r = novoCanvas(w, h);
    const ctx = r.getContext("2d")!;
    ctx.translate(CX * E, CY * E);
    ctx.rotate(-p.caido * (Math.PI / 2) * 0.9);
    ctx.drawImage(cv, -CX * E, -CY * E + p.caido * 8 * E);
    cv = r;
  }
  if (dir === "W") {
    const f = novoCanvas(w, h);
    const ctx = f.getContext("2d")!;
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(cv, 0, 0);
    cv = f;
  }
  cache.set(chave, cv);
  return cv;
};

// retrato 96×64 (cut-in, VS, vitória e pergaminho): recorte da cabeça em pose de rugido
export const retratoChefe = (id: ChefeId): HTMLCanvasElement => {
  const chave = `ret|${id}`;
  const c0 = cache.get(chave);
  if (c0) return c0;
  const sp = quadroChefe(id, "vitoria", 1, "E");
  const cab = CABECA[id];
  const cv = novoCanvas(96, 64);
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(sp, Math.round(cab.x - 48), Math.round(cab.y - 26), 96, 64, 0, 0, 96, 64);
  cache.set(chave, cv);
  return cv;
};
export const miniChefe = (id: ChefeId): HTMLCanvasElement => {
  const chave = `mini|${id}`;
  const c0 = cache.get(chave);
  if (c0) return c0;
  const sp = quadroChefe(id, "idle", 0, "E");
  const cab = CABECA[id];
  const cv = novoCanvas(16, 16);
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sp, Math.round(cab.x - 16), Math.round(cab.y - 16), 32, 32, 0, 0, 16, 16);
  cache.set(chave, cv);
  return cv;
};
