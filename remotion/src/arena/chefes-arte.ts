// Sprites dos chefes (112×112, ~2,5× a altura dos heróis), desenhados do zero com o mesmo motor de pixel art.
// Vista de lado (olhando para a direita; a esquerda é espelhada). Poses: idle, andar, ataque, dano, derrota, vitória.
import { Tela, rampa, novoCanvas, tomVol, tomFixo } from "./pixel.ts";
import type { Rampa, OpForma, Tom } from "./pixel.ts";
import type { ChefeId } from "./chefes.ts";
import { SPRITES_CHEFE, CHARS_SPRITE } from "./chefes-sprites.ts";
import type { SpriteChefe } from "./chefes-sprites.ts";

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
// (Sir Aldric é desenhado como herói, em sprite.ts)
const PALETAS: Partial<Record<ChefeId, Pal>> = {
  MINOTAURO: { pelo: "#6a3e26", pele: "#94603e", focinho: "#b07a52", crina: "#5e6a2c", chifre: "#c8ccd4", casco: "#2e2424", cinto: "#3e3240", tanga: "#4e5a30", metal: "#a8b0bc", madeira: "#7a5232", olho: "#ff3a2a", ouro: "#d8a838", boca: "#3a1414", dente: "#f0ece0" },
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
    const nomes = Object.keys(PALETAS[id]!);
    r = { nomes, rampas: nomes.map((n) => rampa(PALETAS[id]![n])) };
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
  // inspirado em minotauros de pixel art de ação: corpo curvado para a frente, ombros e trapézio enormes,
  // cabeça baixa e projetada, chifres longos para a frente, tufos de pelo nas canelas e machado de duas lâminas
  const b = p.bob,
    s = p.passo * 3,
    r = p.recua;
  const lin = { linha: true };
  // tufo de pelo desgrenhado (canelas)
  const tufo = (x: number, y: number, rx: number, ry: number, escuro: boolean) => {
    const pts: [number, number][] = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const f = k % 2 ? 0.62 : 1 + (k % 4 === 0 ? 0.18 : 0);
      pts.push([x + Math.cos(a) * rx * f, y + Math.sin(a) * ry * f]);
    }
    P.po(pts, "crina", { linha: true, padrao: pelos, tom: tomVol(escuro ? -0.3 : 0) });
  };
  const musc = (x0: number, y0: number, x1: number, y1: number) => P.li(x0 - r, y0 + b, x1 - r, y1 + b, P.m("pele"), 3);
  const brilho = (cx: number, cy: number, rx: number, ry: number) => P.el(cx - r, cy + b, rx, ry, "pele", { tom: tomFixo(0) });
  // ── cabeça (calculada antes: o chifre de trás vai atrás do corpo)
  const cx = 80 - r + p.golpe * 2,
    cy = 36 + b - p.ruge * 5 + p.golpe * 2;
  // chifre de trás
  P.ca(cx - 3, cy - 8, cx - 2, cy - 15, 2.2, "chifre", { tom: tomVol(-0.4), linha: true });
  P.ca(cx - 2, cy - 15, cx + 4, cy - 21, 1.5, "chifre", { tom: tomVol(-0.4) });
  // ── perna de trás: coxa, canela com tufo de pelo, casco
  P.ca(48 - r, 68 + b, 42 - s, 85, 8, "pele", { linha: true, tom: tomVol(-0.35) });
  P.ca(42 - s, 85, 45 - s, 100, 5.5, "pele", { linha: true, tom: tomVol(-0.35) });
  tufo(44 - s, 94, 8, 7, true);
  P.el(46 - s, 102.5, 6.5, 2.8, "casco", lin);
  // ── braço de trás (mais escuro, atrás do corpo)
  P.ca(44 - r, 36 + b, 34 - r, 52 + b, 7, "pele", { linha: true, tom: tomVol(-0.45) });
  P.ca(34 - r, 52 + b, 39 - r, 64 + b, 5.8, "pele", { linha: true, tom: tomVol(-0.45) });
  P.el(40 - r, 67 + b, 5, 4.5, "pele", { linha: true, tom: tomVol(-0.45) });
  // ── tronco: trapézio/costas, peito e barriga
  P.el(50 - r, 36 + b, 19, 14, "pele", lin);
  P.el(57 - r, 49 + b, 19, 16, "pele", lin);
  P.el(57 - r, 61 + b, 13, 8, "pele", lin);
  brilho(46, 30, 7, 4); // topo das costas
  brilho(64, 45, 7, 5); // peitoral
  musc(52, 40, 66, 38); // linha do peitoral
  musc(58, 54, 66, 54); // abdômen
  musc(58, 59, 65, 59);
  musc(61, 52, 61, 64);
  // ── cinto com rebites e tanga
  P.po([[38 - r, 63 + b], [73 - r, 60 + b], [74 - r, 67 + b], [39 - r, 70 + b]], "cinto", lin);
  for (const x of [43, 50, 57, 64, 70]) P.px(x - r, 65 + b - (x - 38) * 0.08, "metal", 0);
  P.po([[55 - r, 61 + b], [60 - r, 61 + b], [60 - r, 67 + b], [55 - r, 67 + b]], "metal", { tom: tomVol(0.2), linha: true }); // fivela
  P.po([[50 - r, 67 + b], [67 - r, 65 + b], [66 - r, 79 + b], [62 - r, 82 + b], [59 - r, 78 + b], [55 - r, 83 + b], [52 - r, 78 + b]], "tanga", lin);
  // ── perna da frente
  P.ca(62 - r, 68 + b, 69 + s, 85, 8.5, "pele", lin);
  P.ca(69 + s, 85, 65 + s, 100, 6, "pele", lin);
  tufo(66 + s, 94, 8.5, 7, false);
  P.el(66 + s, 102.5, 7, 3, "casco", lin);
  // ── pescoço e cabeça de touro
  P.el(cx - 9, cy + 2, 10, 9, "pele", lin);
  P.po([[cx - 13, cy - 2], [cx - 10, cy - 7], [cx - 7, cy - 3]], "pelo", lin); // orelha
  P.el(cx, cy, 12.5, 11, "pelo", { linha: true, padrao: pelos });
  P.el(cx + 11, cy + 6, 10, 7.5, "focinho", lin);
  P.el(cx + 13, cy + 3, 5, 2.5, "focinho", { tom: tomFixo(0) }); // brilho do focinho
  P.el(cx + 3, cy - 4, 7, 3, "pelo", { tom: tomFixo(2) }); // sobrancelha pesada
  P.el(cx - 6, cy - 8, 9, 5, "crina", { linha: true, padrao: pelos }); // crina
  P.po([[cx - 14, cy - 6], [cx - 9, cy - 13], [cx - 6, cy - 7]], "crina", lin);
  P.po([[cx - 8, cy - 10], [cx - 2, cy - 15], [cx, cy - 9]], "crina", lin);
  P.el(cx + 5, cy - 1, 1.8, 1.3, "olho", { tom: tomFixo(0) }); // olho vermelho
  P.px(cx + 5, cy - 1, "olho", 0);
  P.px(cx + 16, cy + 3, "casco", 1); // narina
  P.px(cx + 17, cy + 4, "casco", 1);
  P.el(cx + 15, cy + 11, 2.6, 2.6, "ouro", { tom: tomVol(0.3), linha: true }); // argola
  P.px(cx + 15, cy + 11, "focinho", 2);
  if (p.boca > 0.4) {
    P.po([[cx + 6, cy + 10], [cx + 17, cy + 9], [cx + 15, cy + 12 + p.boca * 4], [cx + 7, cy + 12]], "boca", lin);
    P.px(cx + 9, cy + 10, "dente", 0);
    P.px(cx + 13, cy + 10, "dente", 0);
  } else P.li(cx + 7, cy + 11, cx + 16, cy + 10, P.m("pelo"), 3);
  // chifre da frente: sai para o lado, curva para a frente e para cima
  P.ca(cx + 1, cy - 7, cx + 8, cy - 12, 3.6, "chifre", { tom: tomVol(0.1), linha: true });
  P.ca(cx + 8, cy - 12, cx + 16, cy - 14, 2.8, "chifre", { tom: tomVol(0.1), linha: true });
  P.ca(cx + 16, cy - 14, cx + 22, cy - 21, 1.8, "chifre", { tom: tomVol(0.1), linha: true });
  P.li(cx + 5, cy - 12, cx + 6, cy - 8, P.m("chifre"), 3);
  P.li(cx + 11, cy - 15, cx + 11, cy - 11, P.m("chifre"), 3);
  // ── machado de duas lâminas (descansa na diagonal, ergue atrás e desce no golpe)
  // parado: baixo, na frente da barriga; no ataque ergue por cima da cabeça (golpe < 1) e desce no impacto (golpe = 1)
  const ang = p.golpe === 0 ? 0.5 - p.ruge * 2.2 : p.golpe >= 0.9 ? 0.35 : p.golpe >= 0.55 ? -0.2 : -1.0 - p.golpe * 2.6;
  const hx = 68 - r,
    hy = 60 + b;
  const ux = Math.cos(ang),
    uy = Math.sin(ang);
  const nx = -uy,
    ny = ux;
  const L = 38;
  P.ca(hx - ux * 10, hy - uy * 10, hx + ux * L, hy + uy * L, 1.9, "madeira", { linha: true });
  for (const k of [1, -1]) {
    const pt = (ao: number, fora: number): [number, number] => [hx + ux * (L - ao) + nx * k * fora, hy + uy * (L - ao) + ny * k * fora];
    // lâmina em meia-lua: estreita junto do cabo, fio largo e curvo com duas pontas
    P.po([pt(3, 2), pt(11, 2), pt(14, 6), pt(18, 14), pt(13, 15), pt(7, 16), pt(1, 15), pt(-4, 13), pt(0, 6)], "metal", { tom: tomVol(0.15), linha: true });
    P.li(...pt(-2, 13), ...pt(5, 15), P.m("metal"), 0); // fio da lâmina
    P.li(...pt(5, 15), ...pt(15, 13), P.m("metal"), 0);
  }
  P.el(hx + ux * (L - 7), hy + uy * (L - 7), 2.6, 2.6, "metal", { tom: tomFixo(2), linha: true });
  // ── braço da frente: deltoide enorme, bíceps, antebraço com bracelete, punho no cabo
  P.el(60 - r, 38 + b, 11, 10, "pele", lin);
  brilho(57, 34, 5, 3);
  P.ca(60 - r, 42 + b, 63 - r, 53 + b, 7, "pele", lin);
  brilho(60, 46, 2.5, 4);
  musc(56, 44, 60, 52);
  P.ca(63 - r, 53 + b, hx, hy, 6, "pele", lin);
  {
    // bracelete: faixa atravessada no antebraço
    const ax = 63 - r,
      ay = 53 + b;
    const dx = hx - ax,
      dy = hy - ay,
      dl = Math.hypot(dx, dy) || 1;
    const [ex, ey] = [dx / dl, dy / dl];
    const mx = ax + dx * 0.45,
      my = ay + dy * 0.45;
    P.po([[mx - ey * 6.5 - ex * 1.6, my + ex * 6.5 - ey * 1.6], [mx + ey * 6.5 - ex * 1.6, my - ex * 6.5 - ey * 1.6], [mx + ey * 6.5 + ex * 1.6, my - ex * 6.5 + ey * 1.6], [mx - ey * 6.5 + ex * 1.6, my + ex * 6.5 + ey * 1.6]], "cinto", lin);
    P.px(mx, my, "metal", 0);
  }
  P.el(hx, hy, 5, 5, "pele", lin);
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

const DESENHO: Partial<Record<ChefeId, (P: Pinta, p: Pose) => void>> = { MINOTAURO: minotauro, GRIFO: grifo, HIDRA: hidra, GIGANTE: gigante, QUIMERA: quimera, DRAGAO: dragao };
// onde fica a cabeça de cada um (para retrato, setas e textos)
export const CABECA: Record<ChefeId, { x: number; y: number }> = {
  MINOTAURO: { x: 82, y: 34 },
  GRIFO: { x: 80, y: 38 },
  HIDRA: { x: 64, y: 28 },
  GIGANTE: { x: 60, y: 18 },
  QUIMERA: { x: 78, y: 50 },
  DRAGAO: { x: 86, y: 32 },
  ALDRIC: { x: 56, y: 30 },
};

const cache = new Map<string, HTMLCanvasElement>();

// ───────────── chefes com sprite de pixel art (arte por IA pixelizada, chefes-sprites.ts) ─────────────
// Cada pixel do sprite vale 2 px do mundo. Poses desenhadas: base (parado), passo, ergue (machado no alto), golpe e
// ruge; por cima delas: respiração (o tronco sobe 1 px), balanço ao andar, avanço no golpe, recuo no dano, desabar.
const ESC_SPRITE = 2 / 3; // pixel do sprite → unidade do desenho de 112
const poseCv = new Map<string, HTMLCanvasElement>();
const canvasDaPose = (id: ChefeId, sp: SpriteChefe, nome: string) => {
  const chave = `${id}|${nome}`;
  let cv = poseCv.get(chave);
  if (cv) return cv;
  const ps = sp.poses[nome] ?? sp.poses.base;
  cv = novoCanvas(ps.w, ps.h);
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(ps.w, ps.h);
  const rgb = sp.pal.map((c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  for (let i = 0; i < ps.px.length; i++) {
    const ch = ps.px[i];
    if (ch === ".") continue;
    const [r, g, b] = rgb[CHARS_SPRITE.indexOf(ch)];
    img.data.set([r, g, b, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  poseCv.set(chave, cv);
  return cv;
};
// cabeça no espaço do desenho de 112 (o mesmo de CABECA), com os pés da pose parada na âncora (CX, CY)
export const cabecaChefe = (id: ChefeId): { x: number; y: number } => {
  const sp = SPRITES_CHEFE[id];
  if (!sp) return CABECA[id];
  const b = sp.poses.base;
  return { x: CX + (sp.cabeca[0] - b.pes[0]) * ESC_SPRITE, y: CY + (sp.cabeca[1] - b.pes[1]) * ESC_SPRITE };
};
// qual pose e que ajuste (deslocamento em px do sprite, respiração) para cada animação e quadro
const poseDoQuadro = (anim: Anim, q: number): { nome: string; dx: number; dy: number; respira: boolean } => {
  switch (anim) {
    case "idle":
      return { nome: "base", dx: 0, dy: 0, respira: q === 1 || q === 2 };
    case "andar": {
      // passo · passo · parado, duas vezes; o corpo sobe no meio do passo
      const ciclo = ["passo", "passo", "base", "passo", "passo", "base"][q % 6];
      return { nome: ciclo, dx: 0, dy: [0, -1, 0, 0, -1, 0][q % 6], respira: false };
    }
    case "ataque":
      // 0–1 ergue o machado; 2 desce com tudo (avança); 3 termina o golpe
      return q <= 1 ? { nome: "ergue", dx: -1, dy: 0, respira: q === 1 } : { nome: "golpe", dx: q === 2 ? 4 : 2, dy: 0, respira: false };
    case "magia":
      return q <= 2 ? { nome: "ergue", dx: -1, dy: 0, respira: false } : q <= 4 ? { nome: "golpe", dx: q === 3 ? 4 : 2, dy: 0, respira: false } : { nome: "base", dx: 0, dy: 0, respira: false };
    case "dano":
      return { nome: "base", dx: q === 0 ? -3 : -1, dy: 0, respira: false };
    case "vitoria":
      return { nome: "ruge", dx: 0, dy: [0, -1, -1, 0][q % 4], respira: q === 1 || q === 2 };
    default:
      return { nome: "base", dx: 0, dy: 0, respira: false };
  }
};
const desenharSprite = (ctx: CanvasRenderingContext2D, id: ChefeId, sp: SpriteChefe, anim: Anim, q: number, E: number) => {
  const { nome, dx, dy, respira } = poseDoQuadro(anim, q);
  const ps = sp.poses[nome] ?? sp.poses.base;
  const cv = canvasDaPose(id, sp, nome);
  const k = ESC_SPRITE * E; // 2 px por pixel do sprite no mundo
  ctx.imageSmoothingEnabled = k < 1.5;
  const x0 = Math.round(CX * E + (dx - ps.pes[0]) * k),
    y0 = Math.round(CY * E + (dy - ps.pes[1]) * k);
  ctx.drawImage(cv, x0, y0, ps.w * k, ps.h * k);
  if (respira) {
    // respiração: tudo acima da cintura sobe 1 pixel do sprite
    const c = Math.round(sp.cintura * (ps.h / sp.poses.base.h));
    ctx.drawImage(cv, 0, 0, ps.w, c, x0, y0 - k, ps.w * k, c * k);
  }
};

export const quadroChefe = (id: ChefeId, anim: Anim, q: number, dir: string, escala = 1): HTMLCanvasElement => {
  const chave = `${id}|${anim}|${q}|${dir}|${escala}`;
  const c0 = cache.get(chave);
  if (c0) return c0;
  const E = escala;
  const w = CW * E,
    h = CH * E;
  const p = pose(anim, q);
  const sp = SPRITES_CHEFE[id];
  let cv = novoCanvas(w, h);
  if (sp) desenharSprite(cv.getContext("2d")!, id, sp, anim, q, E);
  else cv = desenharProcedural(id, p, E);
  return finalizarQuadro(chave, cv, p, E, dir, w, h, id);
};
const desenharProcedural = (id: ChefeId, p: Pose, E: number): HTMLCanvasElement => {
  const { nomes, rampas } = rampasDe(id);
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
  DESENHO[id]!(P, p);
  const cv = novoCanvas(w, h);
  cv.getContext("2d")!.putImageData(t.cores(rampas), 0, 0);
  return cv;
};
const finalizarQuadro = (chave: string, cv: HTMLCanvasElement, p: Pose, E: number, dir: string, w: number, h: number, id: ChefeId): HTMLCanvasElement => {
  if (p.caido > 0) {
    // derrota: tomba de lado
    const r = novoCanvas(w, h);
    const ctx = r.getContext("2d")!;
    const c = p.caido;
    if ((id === "MINOTAURO" || id === "GIGANTE") && !SPRITES_CHEFE[id]) {
      // quem anda em pé tomba de cara no chão, para a frente; o giro anda para trás e para cima para caber no quadro
      ctx.translate((CX - 38 * c) * E, (CY - 44 * c) * E);
      ctx.rotate(c * (Math.PI / 2) * 0.96);
      ctx.drawImage(cv, -CX * E, -CY * E);
    } else {
      // quadrúpedes e voadores desabam de barriga: achatam, inclinam um pouco e afundam
      ctx.translate(CX * E, (CY + 2 * c) * E);
      ctx.rotate(c * 0.12);
      ctx.scale(1 + 0.08 * c, 1 - 0.42 * c);
      ctx.drawImage(cv, -CX * E, -CY * E);
    }
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
  const spr = SPRITES_CHEFE[id];
  if (spr) {
    // recorte 96×64 em volta da cabeça, direto do sprite (1 pixel do sprite = 1 pixel do retrato)
    const base = canvasDaPose(id, spr, "base");
    const cv = novoCanvas(96, 64);
    const x0 = Math.max(0, Math.min(base.width - 96, spr.cabeca[0] - 52)),
      y0 = Math.max(0, Math.min(base.height - 64, spr.cabeca[1] - 30));
    cv.getContext("2d")!.drawImage(base, x0, y0, 96, 64, 0, 0, 96, 64);
    cache.set(chave, cv);
    return cv;
  }
  const sp = quadroChefe(id, "vitoria", 1, "E");
  const cab = CABECA[id];
  const cv = novoCanvas(96, 64);
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(sp, Math.round(Math.max(0, Math.min(CW - 96, cab.x - 48))), Math.round(Math.max(0, cab.y - 26)), 96, 64, 0, 0, 96, 64);
  cache.set(chave, cv);
  return cv;
};
export const miniChefe = (id: ChefeId): HTMLCanvasElement => {
  const chave = `mini|${id}`;
  const c0 = cache.get(chave);
  if (c0) return c0;
  const spr = SPRITES_CHEFE[id];
  const sp = spr ? canvasDaPose(id, spr, "base") : quadroChefe(id, "idle", 0, "E");
  const cab = spr ? { x: spr.cabeca[0] + 2, y: spr.cabeca[1] + 2 } : CABECA[id];
  const cv = novoCanvas(16, 16);
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = !!spr;
  ctx.drawImage(sp, Math.round(cab.x - 16), Math.round(cab.y - 16), 32, 32, 0, 0, 16, 16);
  cache.set(chave, cv);
  return cv;
};
