// Sprites procedurais dos lutadores (48×64), retratos 96×64 (cut-in/pergaminho) e 16×16 (HUD).
// Tudo desenhado do zero em código: corpo chibi de ~2,5 cabeças, peças por classe, 7 expressões.
import { Tela, rampa, novoCanvas, tomVol, tomCil, tomFixo, variar } from "./pixel.ts";
import { quadroChefe, retratoChefe, miniChefe, CABECA, CX, CY } from "./chefes-arte.ts";
import type { Rampa, Tom, OpForma } from "./pixel.ts";
import type { Lutador, Visual } from "./personagem.ts";
import { hash3 } from "./rng.ts";

export type Expr = "neutra" | "foco" | "grito" | "dor" | "pvbaixo" | "derrota" | "vitoria";
export type Anim = "idle" | "andar" | "ataque" | "magia" | "dano" | "derrota" | "vitoria";
export type Dir = "S" | "N" | "E" | "W";
export const SW = 48,
  SH = 64,
  PE_X = 24,
  PE_Y = 61; // âncora (pés) dentro do quadro

// ───────────── materiais ─────────────
const MATS = [
  "pele",
  "cabelo",
  "olho",
  "roupa",
  "roupa2",
  "couro",
  "metal",
  "madeira",
  "ouro",
  "branco",
  "capa",
  "pluma",
  "magia",
  "brasao",
  "pelagem",
  "chifre",
  "boca",
  "sangue",
  "blush",
  "tatuagem",
  "pintura",
  "bandagem",
  "folha",
  "traco",
  "suor",
  "escuro",
  "gema",
] as const;
type MatNome = (typeof MATS)[number];
const M = Object.fromEntries(MATS.map((n, i) => [n, i])) as Record<MatNome, number>;

const paletaDe = (v: Visual, l: Lutador): Rampa[] => {
  const cores: Record<MatNome, string> = {
    pele: v.pele,
    cabelo: v.cabelo,
    olho: v.olho,
    roupa: v.roupa,
    roupa2: v.roupa2,
    couro: v.couro,
    metal: v.metal,
    madeira: "#8a5c36",
    ouro: "#d8a838",
    branco: "#f4f0e4",
    capa: v.capa || v.roupa,
    pluma: v.pluma || "#c83a3a",
    magia: v.magia,
    brasao: v.brasao,
    pelagem: "#9a7a5a",
    chifre: l.especie === "TIEFLING" ? "#4a3a46" : "#d8ccb0",
    boca: "#7a2a30",
    sangue: "#b0283a",
    blush: variar(v.pele, 0.04, 20, 1.3, 350),
    tatuagem: l.especie === "GOLIAS" ? "#3a4e7a" : "#2e4a7a",
    pintura: hash3(l.id, 7) < 0.5 ? "#3a6ac8" : "#b82a2a",
    bandagem: "#e8e0cc",
    folha: "#4f8f3a",
    traco: "#2a1a1e",
    suor: "#9ad8f8",
    escuro: "#1a1418",
    gema: v.magia,
  };
  return MATS.map((n) => {
    const r = rampa(cores[n], n === "metal" ? 1.25 : 1);
    if (n === "traco" || n === "escuro") return [cores[n], cores[n], cores[n], cores[n], "#ffffff", "#0e0a0c"] as Rampa;
    if (n === "magia" || n === "gema") return [variar(cores[n], 0.25), variar(cores[n], 0.12), cores[n], variar(cores[n], -0.12), "#ffffff", variar(cores[n], -0.3)] as Rampa;
    if (n === "branco") return ["#ffffff", "#f4f0e4", "#c8c4d8", "#9a94b0", "#ffffff", "#5a5068"] as Rampa;
    return r;
  });
};

// ───────────── pose ─────────────
type Pose = {
  bob: number;
  pe: [number, number]; // frontal: levanta (px) · lateral: avanço (px)
  maoA: [number, number]; // mão da arma (relativa ao ombro; x+ = para fora / para a frente)
  maoB: [number, number];
  armaAng: number; // graus; 0 = para cima, + = para fora/para a frente
  inclina: number;
  capa: number;
  brilho: number; // 0..1 (magia nas mãos)
  arco: number; // corda puxada 0..1
  deitado: number; // derrota: 0 em pé · 1 ajoelhado · 2 caindo · 3 no chão
};
const P0: Pose = { bob: 0, pe: [0, 0], maoA: [1, 10], maoB: [1, 10], armaAng: 25, inclina: 0, capa: 0, brilho: 0, arco: 0, deitado: 0 };

type Estilo = "lamina" | "pesada" | "estocada" | "arco" | "punho" | "cajado" | "alaude" | "leve";
const estiloDe = (v: Visual): Estilo => {
  switch (v.arma) {
    case "montante":
    case "machadoGrande":
      return "pesada";
    case "rapieira":
    case "adagas":
    case "adaga":
      return "estocada";
    case "arcoLongo":
    case "arcoCurto":
      return "arco";
    case "punhos":
      return "punho";
    case "cajado":
      return "cajado";
    case "alaude":
      return "alaude";
    default:
      return "lamina";
  }
};

export const QUADROS: Record<Anim, number> = { idle: 4, andar: 6, ataque: 4, magia: 7, dano: 2, derrota: 4, vitoria: 4 };

const pose = (anim: Anim, q: number, est: Estilo, classe: string): Pose => {
  const p: Pose = { ...P0, pe: [0, 0], maoA: [...P0.maoA] as [number, number], maoB: [...P0.maoB] as [number, number] };
  if (est === "pesada") {
    p.maoA = [-3, 9];
    p.maoB = [-3, 10];
    p.armaAng = 35;
  }
  if (est === "arco") {
    p.maoB = [2, 8];
    p.armaAng = 0;
  }
  if (est === "cajado") {
    p.maoA = [1, 8];
    p.armaAng = 0;
  }
  if (est === "alaude") {
    p.maoA = [-4, 9];
    p.maoB = [-3, 7];
  }
  if (est === "punho") {
    p.maoA = [-1, 7];
    p.maoB = [-1, 7];
  }
  switch (anim) {
    case "idle": {
      const r = [0, 0, 1, 1][q];
      p.bob = r;
      p.capa = [0, 1, 1, 0][q];
      p.maoA[1] += r;
      p.maoB[1] += r;
      break;
    }
    case "andar": {
      const fase = [0, 1, 2, 3, 4, 5][q];
      const lado = fase < 3 ? 1 : -1;
      const k = [0, 2, 1, 0, 2, 1][fase];
      p.pe = lado > 0 ? [k, 0] : [0, k];
      p.bob = [0, 1, 0, 0, 1, 0][fase];
      p.capa = [1, 2, 1, -1, -2, -1][fase];
      if (est !== "pesada" && est !== "alaude") {
        p.maoA[1] += lado > 0 ? -1 : 1;
        p.maoB[1] += lado > 0 ? 1 : -1;
        p.maoA[0] += lado > 0 ? 1 : 0;
      }
      p.maoA[1] += p.bob;
      p.maoB[1] += p.bob;
      break;
    }
    case "ataque": {
      if (est === "arco") {
        p.maoB = [5, 5];
        p.maoA = [[1, 6], [-3, 5], [-3, 5], [0, 7]][q] as [number, number];
        p.arco = [0.4, 1, 0, 0][q];
        p.armaAng = 90;
        p.inclina = [0, 0, 1, 0][q];
      } else if (est === "punho") {
        p.maoA = [[-1, 6], [6, 3], [7, 3], [0, 6]][q] as [number, number];
        p.maoB = [[-1, 7], [-2, 6], [-1, 7], [-1, 7]][q] as [number, number];
        p.inclina = [0, 2, 2, 0][q];
        p.pe = [[0, 0], [0, 2], [0, 2], [0, 0]][q] as [number, number];
      } else if (est === "estocada") {
        p.maoA = [[-2, 6], [6, 4], [8, 4], [1, 8]][q] as [number, number];
        p.armaAng = [60, 90, 90, 60][q];
        p.inclina = [-1, 2, 2, 0][q];
      } else if (est === "pesada") {
        p.maoA = [[-2, -10], [4, -4], [5, 7], [1, 9]][q] as [number, number];
        p.maoB = [[-1, -9], [4, -3], [5, 8], [1, 10]][q] as [number, number];
        p.armaAng = [-30, 40, 135, 120][q];
        p.inclina = [-1, 1, 3, 1][q];
        p.bob = [0, 0, 1, 0][q];
      } else {
        p.maoA = [[-1, -8], [3, -5], [6, 5], [2, 9]][q] as [number, number];
        p.armaAng = [-35, 30, 130, 110][q];
        p.inclina = [-1, 1, 2, 0][q];
      }
      break;
    }
    case "magia": {
      // antecipação → reunir → soltar → follow-through
      const sobe = [0, 1, 2, 2, 1, 1, 0][q];
      p.brilho = [0, 0.4, 0.8, 1, 0.7, 0.3, 0][q];
      p.bob = [0, 1, 0, -1, 0, 0, 0][q];
      if (est === "cajado") {
        p.maoA = [[1, 8], [0, 2], [-1, -4], [3, -2], [5, 2], [3, 5], [1, 8]][q] as [number, number];
        p.armaAng = [0, -10, -15, 25, 55, 30, 0][q];
      } else {
        p.maoA = [[1, 9], [2, 4], [1, -2 * sobe], [6, 2], [7, 3], [4, 6], [1, 9]][q] as [number, number];
      }
      p.maoB = [[1, 9], [2, 4], [1, -2 * sobe], [6, 3], [6, 4], [3, 7], [1, 9]][q] as [number, number];
      if (est === "arco") p.maoB = [[2, 8], [3, 4], [2, 0], [6, 2], [6, 3], [3, 6], [2, 8]][q] as [number, number];
      p.inclina = [0, -1, -1, 2, 2, 1, 0][q];
      p.capa = [0, 1, 2, -1, -2, -1, 0][q];
      if (classe === "BARBARO") p.brilho *= 0.5;
      break;
    }
    case "dano":
      p.inclina = -2 - q;
      p.bob = q;
      p.maoA = [3, 6];
      p.maoB = [3, 6];
      p.armaAng = 60;
      break;
    case "derrota":
      p.deitado = [1, 1, 2, 3][q];
      p.bob = [2, 4, 0, 0][q];
      p.inclina = [-1, 2, 0, 0][q];
      p.maoA = [4, 4];
      p.maoB = [4, 4];
      p.armaAng = 100;
      break;
    case "vitoria": {
      const r = [0, 1, 1, 0][q];
      p.bob = -r;
      p.capa = [1, 2, 2, 1][q];
      if (est === "arco") {
        p.maoB = [2, -8 - r];
        p.maoA = [2, 8];
      } else if (est === "punho") {
        p.maoA = [1, -8 - r];
        p.maoB = [-2, 6];
      } else if (est === "alaude") {
        p.maoA = [-4, 7 - r];
        p.maoB = [-2, 5 - r];
      } else if (est === "pesada") {
        p.maoA = [0, -10 - r];
        p.maoB = [1, -10 - r];
        p.armaAng = -5;
      } else {
        p.maoA = [1, -9 - r];
        p.armaAng = -8;
        p.brilho = est === "cajado" ? 0.6 + r * 0.4 : 0;
      }
      break;
    }
  }
  return p;
};

// ───────────── desenho do lutador ─────────────
type Ctx = { t: Tela; v: Visual; l: Lutador; dir: Dir; p: Pose; expr: Expr; rasgado: boolean; est: Estilo };

const PELE_HUMANOIDE = (l: Lutador) => l.especie !== "DRACONATO";

// arma no espaço local: u ao longo (da mão para a ponta), w atravessado
const desenharArma = (c: Ctx, hx: number, hy: number, angGraus: number) => {
  const { t, v } = c;
  const a = (angGraus * Math.PI) / 180;
  const ux = Math.sin(a),
    uy = -Math.cos(a);
  const wx = -uy,
    wy = ux;
  const P = (u: number, w: number): [number, number] => [hx + ux * u + wx * w, hy + uy * u + wy * w];
  const seg = (u0: number, u1: number, r: number, mat: number, op: OpForma = {}) => {
    const [x0, y0] = P(u0, 0),
      [x1, y1] = P(u1, 0);
    t.capsula(x0, y0, x1, y1, r, mat, op);
  };
  const lamina = (u0: number, u1: number, larg: number, curva = 0) => {
    const pts: [number, number][] = [P(u0, -larg / 2), P(u1 - 2, -larg / 2 + curva), P(u1, curva * 1.2), P(u1 - 2, larg / 2 + curva), P(u0, larg / 2)];
    t.poli(pts, M.metal, { tom: tomVol(0.15) });
    // fio com brilho especular de 1 px
    const [ex0, ey0] = P(u0 + 1, -larg / 2 + 0.6),
      [ex1, ey1] = P(u1 - 2, -larg / 2 + curva + 0.6);
    t.linha(ex0, ey0, ex1, ey1, M.metal, 0);
    const [sx, sy] = P(u0 + (u1 - u0) * 0.35, -larg / 2 + 0.6);
    t.px(sx, sy, M.metal, 4);
    // canaleta escura no meio
    if (larg >= 2.5) {
      const [fx0, fy0] = P(u0 + 1, 0.5),
        [fx1, fy1] = P(u1 - 4, 0.5 + curva * 0.6);
      t.linha(fx0, fy0, fx1, fy1, M.metal, 2);
    }
  };
  switch (v.arma) {
    case "espadaLonga":
      seg(-4, 0, 0.9, M.couro);
      t.capsula(...P(0, -3), ...P(0, 3), 0.8, M.ouro);
      lamina(1, 14, 2.6);
      t.elipse(...P(-4.5, 0), 1, 1, M.ouro);
      break;
    case "montante":
      seg(-6, 0, 1, M.couro);
      t.capsula(...P(0, -4), ...P(0, 4), 0.9, M.metal);
      lamina(1, 19, 3.4);
      t.elipse(...P(-6.5, 0), 1.2, 1.2, M.metal);
      break;
    case "machado":
      seg(-4, 12, 0.9, M.madeira, { padrao: (x, y, tt) => ((x + y) % 3 === 0 && tt === 1 ? 2 : tt) });
      t.poli([P(8, 0), P(7, 5), P(10, 7), P(14, 6), P(13, 0)], M.metal, { tom: tomVol(0.1) });
      t.linha(...P(7.5, 6), ...P(13.5, 5.5), M.metal, 0);
      break;
    case "machadoGrande":
      seg(-7, 16, 1.1, M.madeira, { padrao: (x, y, tt) => ((x + y) % 3 === 0 && tt === 1 ? 2 : tt) });
      t.poli([P(10, 0), P(9, 7), P(13, 9), P(18, 7), P(17, 0)], M.metal, { tom: tomVol(0.1) });
      t.poli([P(11, 0), P(11, -4), P(15, -5), P(16, 0)], M.metal, { tom: tomVol(0.1) });
      t.linha(...P(9.5, 8), ...P(17.5, 7), M.metal, 0);
      t.px(...P(13, 8.5), M.metal, 4);
      break;
    case "martelo":
      seg(-4, 11, 0.9, M.madeira);
      t.poli([P(9, -4), P(9, 4), P(14, 4), P(14, -4)], M.metal, { tom: tomVol(0.1) });
      t.px(...P(10, -3), M.metal, 4);
      break;
    case "maca":
      seg(-4, 8, 0.9, M.madeira);
      t.elipse(...P(10, 0), 2.8, 2.8, M.metal);
      t.px(...P(10, -3.5), M.metal, 2);
      t.px(...P(12.5, 0), M.metal, 2);
      t.px(...P(9, -1), M.metal, 4);
      break;
    case "rapieira":
      seg(-3, 0, 0.8, M.couro);
      t.elipse(...P(0.5, 0), 2.2, 2.2, M.ouro);
      t.linha(...P(1, 0), ...P(16, 0), M.metal, 0);
      t.linha(...P(1, 1), ...P(13, 0.6), M.metal, 2);
      break;
    case "adagas":
    case "adaga":
      seg(-2, 0, 0.8, M.couro);
      t.capsula(...P(0, -2), ...P(0, 2), 0.6, M.metal);
      lamina(1, 7, 1.8);
      break;
    case "cimitarra":
      seg(-3, 0, 0.8, M.couro);
      t.capsula(...P(0, -2.5), ...P(0, 2.5), 0.7, M.ouro);
      lamina(1, 13, 2.4, 2.5);
      break;
    case "cajado": {
      seg(-13, 12, 1, M.madeira, { padrao: (x, y, tt) => ((x * 2 + y) % 4 === 0 && tt === 1 ? 2 : tt) });
      // garras de madeira segurando o cristal
      t.capsula(...P(12, -2), ...P(15, -2.5), 0.6, M.madeira);
      t.capsula(...P(12, 2), ...P(15, 2.5), 0.6, M.madeira);
      const [gx, gy] = P(15.5, 0);
      t.poli(
        [
          [gx, gy - 3.5],
          [gx + 2.2, gy],
          [gx, gy + 3],
          [gx - 2.2, gy],
        ],
        M.gema,
        { tom: tomVol(0.3) },
      );
      t.px(gx - 1, gy - 1, M.gema, 4);
      break;
    }
    case "punhos":
      break;
    case "alaude": {
      // corpo do alaúde atravessado no peito
      const [bx, by] = P(-1, 4);
      t.elipse(bx, by, 4.2, 3.6, M.madeira, { tom: tomVol(0.1) });
      t.elipse(bx, by, 1.1, 1.1, M.escuro);
      t.capsula(...P(1, 4), ...P(12, 2), 0.9, M.madeira);
      t.capsula(...P(12, 2), ...P(14, 1), 1.1, M.couro);
      t.linha(...P(-3, 4), ...P(12, 2), M.branco, 1);
      break;
    }
    default:
      break;
  }
};

const desenharArco = (c: Ctx, hx: number, hy: number, lateral: boolean, flip: number) => {
  const { t, p } = c;
  const L = c.v.arma === "arcoLongo" ? 12 : 9;
  const puxa = p.arco * 4;
  if (lateral) {
    // arco na vertical à frente, corda puxada para trás
    for (let i = -L; i <= L; i++) {
      const bend = Math.round(3 * Math.cos((i / L) * (Math.PI / 2)) * flip);
      t.px(hx + bend, hy + i, M.madeira, Math.abs(i) > L - 3 ? 2 : i < 0 ? 0 : 1);
      t.px(hx + bend + flip, hy + i, M.madeira, 2);
    }
    t.linha(hx, hy - L, hx - puxa * flip, hy, M.branco, 1);
    t.linha(hx - puxa * flip, hy, hx, hy + L, M.branco, 1);
    if (p.arco > 0.3) t.linha(hx - puxa * flip, hy, hx + 7 * flip, hy, M.madeira, 0);
  } else {
    for (let i = -L; i <= L; i++) {
      t.px(hx + flip * Math.round(2 * Math.cos((i / L) * (Math.PI / 2))), hy + i, M.madeira, i < 0 ? 0 : 1);
    }
    t.linha(hx, hy - L, hx, hy + L, M.branco, 2);
  }
};

const ESCUDO = (c: Ctx, cx: number, cy: number, s = 1) => {
  const { t, v } = c;
  if (v.escudo === "madeira") {
    t.elipse(cx, cy, 5.5 * s, 6 * s, M.madeira, { padrao: (x, y, tt) => (x % 3 === 0 && tt <= 1 ? 2 : tt) });
    t.elipse(cx, cy, 5.5 * s, 6 * s, M.metal, { so: (x, y) => (x - cx) ** 2 / (5.5 * s) ** 2 + (y - cy) ** 2 / (6 * s) ** 2 > 0.62 });
    t.elipse(cx, cy, 1.6 * s, 1.6 * s, M.metal);
    return;
  }
  // escudo de brasão (heater)
  const pts: [number, number][] = [
    [cx - 6 * s, cy - 6 * s],
    [cx + 6 * s, cy - 6 * s],
    [cx + 6 * s, cy + 1 * s],
    [cx, cy + 8 * s],
    [cx - 6 * s, cy + 1 * s],
  ];
  t.poli(pts, M.metal, { tom: tomVol(0.2) });
  const inner: [number, number][] = [
    [cx - 4.6 * s, cy - 4.8 * s],
    [cx + 4.6 * s, cy - 4.8 * s],
    [cx + 4.6 * s, cy + 0.6 * s],
    [cx, cy + 6.4 * s],
    [cx - 4.6 * s, cy + 0.6 * s],
  ];
  t.poli(inner, M.roupa2, { tom: tomVol(0) });
  // brasão: cruz ou divisa
  if (hash3(c.l.id, 3) < 0.5) {
    t.ret(cx - 0.5, cy - 4 * s, cx + 0.5, cy + 4 * s, M.brasao, { tom: tomFixo(1) });
    t.ret(cx - 3 * s, cy - 1.5 * s, cx + 3 * s, cy - 0.5 * s, M.brasao, { tom: tomFixo(1) });
  } else {
    t.linha(cx - 4 * s, cy - 2 * s, cx, cy + 2 * s, M.brasao, 1);
    t.linha(cx, cy + 2 * s, cx + 4 * s, cy - 2 * s, M.brasao, 1);
    t.linha(cx - 4 * s, cy - 1 * s, cx, cy + 3 * s, M.brasao, 2);
    t.linha(cx, cy + 3 * s, cx + 4 * s, cy - 1 * s, M.brasao, 2);
  }
  t.px(cx - 4 * s, cy - 4 * s, M.metal, 4);
};

// ───────────── cabeça (vale para sprite e retrato: R = raio) ─────────────
type OpCabeca = { cx: number; cy: number; R: number; dir: Dir; grande: boolean };

const cabelo = (c: Ctx, o: OpCabeca, camada: "tras" | "frente") => {
  const { t, v } = c;
  const { cx, cy, R, dir } = o;
  const k = R / 10;
  const est = v.estiloCabelo;
  if (est === "careca") return;
  const cobre = ["elmoFechado", "elmoAberto", "elmoChifres", "capuz", "chapeu"].includes(v.cabeca);
  const textura: OpForma["padrao"] = (x, y, tt) => {
    // mechas em cluster: linhas íngremes de sombra + dois brilhos em arco no lado da luz
    const dx = x + 0.5 - (cx - R * 0.3),
      dy = y + 0.5 - (cy - R * 0.45);
    const d1 = Math.hypot(dx, dy * 1.2);
    if (tt <= 1 && dx < 0.6 * k && dy < 0 && Math.abs(d1 - 4.2 * k) < 0.55 * k + 0.3) return 0;
    const d2 = Math.hypot(x + 0.5 - (cx + R * 0.35), (y + 0.5 - (cy - R * 0.5)) * 1.2);
    if (tt <= 1 && dy < -0.5 * k && x > cx && Math.abs(d2 - 2.4 * k) < 0.45 * k + 0.25) return 0;
    const passo = Math.max(4, Math.round(4 * k));
    if (tt === 1 && (x + Math.floor(y / Math.max(2, Math.round(2 * k)))) % passo === 0) return 2;
    if (tt === 2 && (x + Math.floor(y / Math.max(2, Math.round(2 * k)))) % passo === 0) return 3;
    return tt;
  };
  const op: OpForma = { padrao: textura, linha: true };
  if (camada === "tras") {
    if (dir === "N") return; // atrás da cabeça, na vista de costas, vai por cima (camada frente)
    if (cobre && v.cabeca !== "capuz" && v.cabeca !== "chapeu") return;
    if (est === "longo") {
      if (dir === "S") t.poli([[cx - R - 1 * k, cy - 2 * k], [cx + R + 1 * k, cy - 2 * k], [cx + R + 2 * k, cy + R + 6 * k], [cx - R - 2 * k, cy + R + 6 * k]], M.cabelo, op);
      else t.poli([[cx - R * 0.2, cy - R], [cx - R - 2 * k, cy], [cx - R - 2 * k, cy + R + 6 * k], [cx + 1 * k, cy + R + 4 * k]], M.cabelo, op);
    }
    if (est === "rabo" && dir === "E") {
      t.capsula(cx - R + 1 * k, cy - 3 * k, cx - R - 3 * k, cy + 9 * k, 2.2 * k, M.cabelo, op);
    }
    if (est === "trancas" && dir === "E") {
      for (let i = 0; i < 5; i++) t.elipse(cx - R * 0.6, cy + 4 * k + i * 2.6 * k, 1.8 * k, 1.5 * k, M.cabelo, op);
    }
    return;
  }
  // camada da frente
  if (dir === "N") {
    if (cobre) return;
    t.elipse(cx, cy - 1 * k, R + 0.8 * k, R + 0.2 * k, M.cabelo, op);
    if (est === "longo") t.poli([[cx - R - 1 * k, cy], [cx + R + 1 * k, cy], [cx + R + 1.5 * k, cy + R + 6 * k], [cx - R - 1.5 * k, cy + R + 6 * k]], M.cabelo, op);
    if (est === "rabo") t.capsula(cx, cy + 2 * k, cx + 1 * k, cy + 13 * k, 2.2 * k, M.cabelo, op);
    if (est === "trancas")
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) t.elipse(cx + s * 4 * k, cy + 6 * k + i * 2.6 * k, 1.8 * k, 1.5 * k, M.cabelo, op);
    if (est === "coque") t.elipse(cx, cy - R - 1 * k, 3.6 * k, 3.2 * k, M.cabelo, op);
    if (est === "moicano") t.ret(cx - 2 * k, cy - R - 4 * k, cx + 2 * k, cy + R * 0.6, M.cabelo, op);
    return;
  }
  if (cobre) {
    // franja aparecendo por baixo do capuz/elmo aberto
    if (v.cabeca === "capuz" || v.cabeca === "elmoAberto" || v.cabeca === "elmoChifres" || v.cabeca === "chapeu") {
      if (dir === "S") {
        for (let i = -3; i <= 2; i++) t.poli([[cx + i * 2.4 * k, cy - 4.4 * k], [cx + (i + 1) * 2.4 * k, cy - 4.4 * k], [cx + (i + 0.4) * 2.4 * k, cy - 1.8 * k]], M.cabelo, { padrao: textura });
      } else t.poli([[cx - 2 * k, cy - 5 * k], [cx + R * 0.8, cy - 5 * k], [cx + R * 0.7, cy - 2 * k]], M.cabelo, { padrao: textura });
      if (est === "longo" && dir === "S") {
        t.poli([[cx - R, cy - 3 * k], [cx - R + 2.5 * k, cy - 3 * k], [cx - R + 2 * k, cy + 9 * k], [cx - R - 1 * k, cy + 9 * k]], M.cabelo, op);
        t.poli([[cx + R, cy - 3 * k], [cx + R - 2.5 * k, cy - 3 * k], [cx + R - 2 * k, cy + 9 * k], [cx + R + 1 * k, cy + 9 * k]], M.cabelo, op);
      }
    }
    return;
  }
  if (dir === "S") {
    if (est === "moicano") {
      t.elipse(cx, cy - 1 * k, R, R * 0.95, M.cabelo, { so: (x, y) => y < cy - 4 * k && Math.abs(x - cx) < 2.6 * k, padrao: textura });
      t.poli([[cx - 2.4 * k, cy - R + 1 * k], [cx + 2.4 * k, cy - R + 1 * k], [cx + 1.4 * k, cy - R - 4.5 * k], [cx - 1.4 * k, cy - R - 4.5 * k]], M.cabelo, op);
      return;
    }
    // calota + franja em mechas
    t.elipse(cx, cy - 1.2 * k, R + 0.9 * k, R + 0.3 * k, M.cabelo, { so: (x, y) => y < cy - 3.6 * k || (Math.abs(x - cx) > R - 1.6 * k && y < cy + 1 * k), padrao: textura, linha: true });
    const franja = est === "curto" || est === "coque" ? 5 : 4;
    for (let i = 0; i < franja; i++) {
      const x0 = cx - R + 1 + (i * (2 * R - 2)) / franja;
      const x1 = x0 + (2 * R - 2) / franja + 0.6 * k;
      const ponta = x0 + (x1 - x0) * (est === "curto" ? 0.5 : 0.7);
      t.poli([[x0, cy - 4.6 * k], [x1, cy - 4.6 * k], [ponta, cy - (i % 2 ? 1.4 : 2.4) * k]], M.cabelo, { padrao: textura });
    }
    if (est === "longo") {
      t.poli([[cx - R - 1 * k, cy - 3 * k], [cx - R + 2.2 * k, cy - 3 * k], [cx - R + 1.5 * k, cy + 10 * k], [cx - R - 1.5 * k, cy + 10 * k]], M.cabelo, op);
      t.poli([[cx + R + 1 * k, cy - 3 * k], [cx + R - 2.2 * k, cy - 3 * k], [cx + R - 1.5 * k, cy + 10 * k], [cx + R + 1.5 * k, cy + 10 * k]], M.cabelo, op);
    }
    if (est === "trancas")
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) t.elipse(cx + s * (R + 0.3 * k), cy + 1 * k + i * 2.6 * k, 1.7 * k, 1.5 * k, M.cabelo, op);
    if (est === "coque") t.elipse(cx, cy - R - 1.4 * k, 3.6 * k, 3.2 * k, M.cabelo, op);
    if (est === "rabo") t.elipse(cx + R * 0.8, cy - R * 0.4, 2.2 * k, 2 * k, M.cabelo, op);
  } else {
    // perfil (olhando para a direita): cabelo cobre a nuca e o topo
    if (est === "moicano") {
      t.poli([[cx - R * 0.7, cy - R * 0.5], [cx + R * 0.4, cy - R * 0.9], [cx + R * 0.3, cy - R - 4 * k], [cx - R * 0.9, cy - R - 1 * k]], M.cabelo, op);
      return;
    }
    t.elipse(cx - 0.6 * k, cy - 1 * k, R + 0.8 * k, R + 0.3 * k, M.cabelo, {
      so: (x, y) => y < cy - 3.6 * k || x < cx - R * 0.25 + (y > cy + 2 * k ? -2 * k : 0),
      padrao: textura,
      linha: true,
    });
    t.poli([[cx + R * 0.1, cy - 4.8 * k], [cx + R + 1 * k, cy - 4 * k], [cx + R * 0.7, cy - 1.6 * k], [cx + R * 0.3, cy - 3 * k]], M.cabelo, { padrao: textura });
    if (est === "coque") t.elipse(cx - R * 0.5, cy - R * 0.9, 3.4 * k, 3 * k, M.cabelo, op);
    if (est === "longo") t.poli([[cx - R * 0.2, cy - 2 * k], [cx - R - 1.5 * k, cy - 2 * k], [cx - R - 1 * k, cy + 10 * k], [cx - R * 0.4, cy + 9 * k]], M.cabelo, op);
  }
};

const barba = (c: Ctx, o: OpCabeca) => {
  const { t, v } = c;
  if (!v.barba || o.dir === "N" || v.cabeca === "elmoFechado" || v.mascara) return;
  const { cx, cy, R } = o;
  const k = R / 10;
  const op: OpForma = { padrao: (x, y, tt) => ((x + y * 2) % 3 === 0 && tt === 1 ? 2 : tt), linha: true };
  const L = v.barba === "curta" ? 2 : v.barba === "longa" ? 7 : 8;
  if (o.dir === "S") {
    t.poli([[cx - R + 0.5 * k, cy + 1 * k], [cx - R + 2 * k, cy + 6 * k], [cx - 2.5 * k, cy + R + L * k], [cx + 2.5 * k, cy + R + L * k], [cx + R - 2 * k, cy + 6 * k], [cx + R - 0.5 * k, cy + 1 * k], [cx + R - 2.5 * k, cy + 5 * k], [cx - R + 2.5 * k, cy + 5 * k]], M.cabelo, op);
    // bigode
    t.poli([[cx - 3.5 * k, cy + 5.6 * k], [cx + 3.5 * k, cy + 5.6 * k], [cx + 2 * k, cy + 4.6 * k], [cx - 2 * k, cy + 4.6 * k]], M.cabelo, { tom: tomFixo(2) });
    if (v.barba === "trancada") {
      t.ret(cx - 1 * k, cy + R + L * k, cx + 1 * k, cy + R + (L + 3) * k, M.cabelo, op);
      t.ret(cx - 1.4 * k, cy + R + (L + 1) * k, cx + 1.4 * k, cy + R + (L + 1.6) * k, M.ouro, { tom: tomFixo(1) });
    }
  } else {
    t.poli([[cx - 1 * k, cy + 2 * k], [cx + R * 0.9, cy + 4.6 * k], [cx + R * 0.7, cy + R + (L - 1) * k], [cx + 1 * k, cy + R + L * k], [cx - 2 * k, cy + 5 * k]], M.cabelo, op);
  }
};

// rosto do sprite (R = 10): pixels posicionados à mão
const rostoPequeno = (c: Ctx, o: OpCabeca) => {
  const { t, expr, v, l } = c;
  const { cx: fcx, cy: fcy, dir } = o;
  const cx = Math.round(fcx),
    cy = Math.round(fcy);
  const P = (x: number, y: number, m: number, tt: Tom = 1) => t.px(x, y, m, tt);
  const sobr = v.estiloCabelo === "careca" || v.estiloCabelo === "moicano" ? M.traco : M.cabelo;
  if (dir === "E") {
    const ex = cx + 4;
    // olho de perfil
    if (expr === "derrota") {
      P(ex, cy + 1, M.traco);
      P(ex + 1, cy + 2, M.traco);
      P(ex, cy + 3, M.traco);
      P(ex + 1, cy + 1, M.traco);
      P(ex, cy + 2, M.traco);
    } else if (expr === "dor") {
      P(ex, cy + 1, M.traco);
      P(ex + 1, cy + 2, M.traco);
      P(ex, cy + 3, M.traco);
    } else if (expr === "vitoria") {
      P(ex, cy + 2, M.traco);
      P(ex + 1, cy + 1, M.traco);
      P(ex + 2, cy + 2, M.traco);
    } else {
      P(ex, cy + 1, M.traco);
      P(ex + 1, cy + 1, M.traco);
      if (expr !== "pvbaixo") {
        P(ex, cy + 2, M.branco, 0);
        P(ex + 1, cy + 2, M.traco);
      } else {
        P(ex, cy + 2, M.traco);
        P(ex + 1, cy + 2, M.traco);
      }
      P(ex, cy + 3, M.olho, 1);
      P(ex + 1, cy + 3, M.olho, 2);
    }
    // sobrancelha
    const by = expr === "foco" || expr === "grito" ? [cy - 1, cy] : expr === "dor" || expr === "pvbaixo" ? [cy - 1, cy - 2] : [cy - 1, cy - 1];
    P(ex, by[0], sobr, 2);
    P(ex + 1, by[1], sobr, 2);
    // nariz e boca
    if (PELE_HUMANOIDE(l)) P(cx + 10, cy + 3, M.pele, 1);
    if (expr === "grito") {
      P(cx + 7, cy + 6, M.boca, 3);
      P(cx + 8, cy + 6, M.boca, 3);
      P(cx + 7, cy + 7, M.boca, 1);
      P(cx + 8, cy + 7, M.boca, 2);
    } else if (expr === "vitoria") {
      P(cx + 7, cy + 6, M.branco, 1);
      P(cx + 8, cy + 6, M.boca, 2);
      P(cx + 6, cy + 5, M.boca, 2);
    } else if (expr === "pvbaixo" || expr === "dor") {
      P(cx + 7, cy + 6, M.boca, 3);
      P(cx + 8, cy + 7, M.boca, 2);
    } else {
      P(cx + 7, cy + 6, M.boca, 2);
      P(cx + 8, cy + 6, M.boca, 2);
    }
    if (expr === "vitoria" || expr === "neutra") P(cx + 5, cy + 5, M.blush, 1);
    if (expr === "dor" || expr === "pvbaixo") {
      P(cx + 2, cy - 2, M.suor, 0);
      P(cx + 2, cy - 1, M.suor, 1);
    }
    return;
  }
  // de frente
  const olhos = [cx - 5, cx + 2];
  olhos.forEach((x0, i) => {
    const lado = i === 0 ? -1 : 1;
    switch (expr) {
      case "derrota":
        P(x0 - (lado < 0 ? 1 : 0), cy + 1, M.traco);
        P(x0 + 1 - (lado < 0 ? 1 : 0), cy + 2, M.traco);
        P(x0 + 2 - (lado < 0 ? 1 : 0), cy + 3, M.traco);
        P(x0 + 2 - (lado < 0 ? 1 : 0), cy + 1, M.traco);
        P(x0 - (lado < 0 ? 1 : 0), cy + 3, M.traco);
        break;
      case "dor":
        if (lado < 0) {
          P(x0, cy + 1, M.traco);
          P(x0 + 1, cy + 2, M.traco);
          P(x0, cy + 3, M.traco);
        } else {
          P(x0 + 1, cy + 1, M.traco);
          P(x0, cy + 2, M.traco);
          P(x0 + 1, cy + 3, M.traco);
        }
        break;
      case "vitoria":
        P(x0 - (lado < 0 ? 1 : 0), cy + 2, M.traco);
        P(x0 + 1 - (lado < 0 ? 1 : 0), cy + 1, M.traco);
        P(x0 + 2 - (lado < 0 ? 1 : 0), cy + 2, M.traco);
        break;
      case "pvbaixo":
        P(x0, cy + 2, M.traco);
        P(x0 + 1, cy + 2, M.traco);
        P(x0, cy + 3, M.olho, 1);
        P(x0 + 1, cy + 3, M.traco);
        break;
      default:
        P(x0, cy + 1, M.traco);
        P(x0 + 1, cy + 1, M.traco);
        if (expr === "grito") P(x0 + (lado < 0 ? -1 : 2), cy + 1, M.traco);
        P(x0, cy + 2, M.branco, 0);
        P(x0 + 1, cy + 2, expr === "grito" ? M.traco : M.traco);
        P(x0, cy + 3, M.olho, 1);
        P(x0 + 1, cy + 3, M.olho, 2);
    }
    // sobrancelhas
    const inner = lado < 0 ? x0 + 1 : x0;
    const outer = lado < 0 ? x0 - 1 : x0 + 2;
    const mid = lado < 0 ? x0 : x0 + 1;
    if (expr === "foco" || expr === "grito") {
      P(outer, cy - 1, sobr, 2);
      P(mid, cy - 1, sobr, 2);
      P(inner, cy, sobr, 2);
    } else if (expr === "dor" || expr === "pvbaixo") {
      P(outer, cy, sobr, 2);
      P(mid, cy - 1, sobr, 2);
      P(inner, cy - 1, sobr, 2);
    } else if (expr !== "derrota") {
      P(outer, cy - 1, sobr, 2);
      P(mid, cy - 1, sobr, 2);
      P(inner, cy - 1, sobr, 2);
    }
  });
  // nariz
  if (PELE_HUMANOIDE(l)) P(cx, cy + 4, M.pele, 2);
  // boca
  switch (expr) {
    case "grito":
      for (let x = cx - 2; x <= cx + 1; x++) {
        P(x, cy + 6, M.boca, 3);
        P(x, cy + 7, M.boca, x === cx - 2 || x === cx + 1 ? 3 : 1);
      }
      P(cx - 1, cy + 6, M.branco, 1);
      P(cx, cy + 6, M.branco, 1);
      break;
    case "vitoria":
      P(cx - 2, cy + 6, M.boca, 2);
      P(cx - 1, cy + 7, M.boca, 2);
      P(cx, cy + 7, M.boca, 2);
      P(cx + 1, cy + 6, M.boca, 2);
      P(cx - 1, cy + 6, M.branco, 1);
      P(cx, cy + 6, M.branco, 1);
      break;
    case "dor":
      P(cx - 2, cy + 7, M.boca, 2);
      P(cx - 1, cy + 6, M.boca, 2);
      P(cx, cy + 7, M.boca, 2);
      P(cx + 1, cy + 6, M.boca, 2);
      break;
    case "pvbaixo":
      P(cx - 1, cy + 6, M.boca, 3);
      P(cx, cy + 6, M.boca, 3);
      P(cx - 1, cy + 7, M.boca, 2);
      P(cx, cy + 7, M.boca, 2);
      break;
    case "derrota":
      P(cx - 1, cy + 7, M.boca, 3);
      P(cx, cy + 7, M.boca, 3);
      P(cx + 1, cy + 7, M.boca, 3);
      break;
    case "foco":
      P(cx - 1, cy + 6, M.boca, 3);
      P(cx, cy + 6, M.boca, 3);
      break;
    default:
      P(cx - 1, cy + 6, M.boca, 2);
      P(cx, cy + 6, M.boca, 2);
  }
  // blush
  if (PELE_HUMANOIDE(l)) {
    P(cx - 6, cy + 4, M.blush, expr === "vitoria" ? 0 : 1);
    P(cx + 5, cy + 4, M.blush, expr === "vitoria" ? 0 : 1);
    if (expr === "vitoria") {
      P(cx - 7, cy + 4, M.blush, 1);
      P(cx + 6, cy + 4, M.blush, 1);
    }
  }
  // gota de suor
  if (expr === "dor" || expr === "pvbaixo") {
    P(cx + 8, cy - 3, M.suor, 0);
    P(cx + 8, cy - 2, M.suor, 1);
    P(cx + 7, cy - 2, M.suor, 2);
  }
};

// rosto grande (retrato 96×64, R ≈ 22)
const rostoGrande = (c: Ctx, o: OpCabeca) => {
  const { t, expr, v, l } = c;
  const { cx, cy, R } = o;
  const k = R / 10;
  const sobr = v.estiloCabelo === "careca" || v.estiloCabelo === "moicano" ? M.traco : M.cabelo;
  const ey = cy + 1.6 * k;
  for (const lado of [-1, 1]) {
    const ex = cx + lado * 3.9 * k;
    if (expr === "derrota") {
      t.linha(ex - 2.5, ey - 2.5, ex + 2.5, ey + 2.5, M.traco, 1);
      t.linha(ex - 2.5, ey + 2.5, ex + 2.5, ey - 2.5, M.traco, 1);
      t.linha(ex - 1.5, ey - 2.5, ex + 3.5, ey + 2.5, M.traco, 1);
      t.linha(ex - 1.5, ey + 2.5, ex + 3.5, ey - 2.5, M.traco, 1);
    } else if (expr === "vitoria") {
      for (let i = -3; i <= 3; i++) t.px(ex + i, ey - 1 + Math.abs(i) * 0.6, M.traco, 1);
      for (let i = -3; i <= 3; i++) t.px(ex + i, ey - 2 + Math.abs(i) * 0.6, M.traco, 1);
    } else if (expr === "dor") {
      const s = lado;
      t.linha(ex - 3 * s, ey - 2.5, ex + 2 * s, ey, M.traco, 1);
      t.linha(ex + 2 * s, ey, ex - 3 * s, ey + 2.5, M.traco, 1);
      t.linha(ex - 3 * s, ey - 1.5, ex + 1 * s, ey, M.traco, 1);
    } else {
      const aberto = expr === "grito" ? 1.25 : expr === "pvbaixo" ? 0.6 : expr === "foco" ? 0.85 : 1;
      const rx = 2.9 * k * 0.95,
        ry = 3.3 * k * 0.5 * aberto + 1.2;
      t.elipse(ex, ey + 0.5, rx, ry + 0.5, M.branco, { tom: (nx, ny) => (ny < -0.3 ? 2 : 1) });
      // íris com gradiente (topo mais escuro) + pupila + dois brilhos
      const irx = rx * 0.62,
        iry = ry * 0.95;
      const iy = ey + 0.8;
      t.elipse(ex + lado * 0.3, iy, irx, iry, M.olho, { tom: (nx, ny) => (ny < -0.35 ? 3 : ny < 0.2 ? 2 : ny < 0.6 ? 1 : 0) });
      t.elipse(ex + lado * 0.3, iy, irx * 0.42, iry * 0.55, M.traco);
      t.ret(ex - irx * 0.7 + lado * 0.3, iy - iry * 0.75, ex - irx * 0.7 + 1 + lado * 0.3, iy - iry * 0.75 + 1, M.branco, { tom: tomFixo(0) });
      t.px(ex + irx * 0.5 + lado * 0.3, iy + iry * 0.5, M.branco, 0);
      // cílios / pálpebra superior grossa, puxando para fora
      const topo = ey + 0.5 - ry - 0.5;
      for (let i = -Math.ceil(rx) - 1; i <= Math.ceil(rx); i++) {
        const xx = ex + i;
        const yy = topo + (Math.abs(i) / rx) ** 2 * 1.4;
        t.px(xx, yy, M.traco, 1);
        t.px(xx, yy + 1, M.traco, 1);
      }
      t.px(ex + lado * (rx + 1.5), topo + 0.5, M.traco, 1);
      if (expr === "pvbaixo") t.ret(ex - rx, topo, ex + rx, topo + ry * 0.6, M.pele, { tom: tomFixo(2) });
    }
    // sobrancelha grossa
    const bx0 = ex - lado * 3 * k * 0.95,
      bx1 = ex + lado * 3.2 * k * 0.95;
    let by0 = ey - 5.2 * k * 0.5 - 2,
      by1 = by0;
    if (expr === "foco" || expr === "grito") {
      by0 += 3;
      by1 -= 1;
    } else if (expr === "dor" || expr === "pvbaixo") {
      by0 -= 2;
      by1 += 1.5;
    } else if (expr === "vitoria") {
      by0 -= 1;
      by1 -= 1.5;
    }
    t.capsula(bx0, by0, bx1, by1, 1.1, sobr, { tom: tomFixo(2) });
  }
  // nariz
  if (PELE_HUMANOIDE(l)) {
    t.px(cx + 1, cy + 4.6 * k, M.pele, 3);
    t.px(cx, cy + 4.9 * k, M.pele, 2);
    t.px(cx - 1, cy + 3.8 * k, M.pele, 0);
  }
  // boca
  const my = cy + 6.9 * k;
  switch (expr) {
    case "grito":
      t.poli([[cx - 4.5, my - 1.5], [cx + 4.5, my - 1.5], [cx + 3, my + 5], [cx - 3, my + 5]], M.boca, { tom: (nx, ny) => (ny > 0.3 ? 1 : 3) });
      t.ret(cx - 3.5, my - 1.5, cx + 3.5, my - 0.5, M.branco, { tom: tomFixo(1) });
      if (l.especie === "ORC" || l.especie === "DRACONATO") {
        t.px(cx - 3, my + 0.5, M.branco, 0);
        t.px(cx + 3, my + 0.5, M.branco, 0);
      }
      break;
    case "vitoria":
      t.poli([[cx - 5, my - 1], [cx + 5, my - 1], [cx + 2.5, my + 3], [cx - 2.5, my + 3]], M.boca, { tom: tomFixo(2) });
      t.ret(cx - 4, my - 1, cx + 4, my, M.branco, { tom: tomFixo(1) });
      break;
    case "dor":
      t.ret(cx - 4, my - 1, cx + 4, my + 1.5, M.branco, { tom: tomFixo(2) });
      t.linha(cx - 4, my + 0.3, cx + 4, my + 0.3, M.traco, 1);
      t.linha(cx - 4.5, my - 1.5, cx + 4.5, my - 1.5, M.boca, 3);
      break;
    case "pvbaixo":
      t.elipse(cx, my + 1, 2.4, 2, M.boca, { tom: tomFixo(3) });
      break;
    case "derrota":
      t.linha(cx - 3, my + 1, cx + 3, my + 1, M.boca, 3);
      break;
    default:
      t.linha(cx - 2.5, my, cx + 2.5, my, M.boca, 2);
      t.px(cx + 3, my - 1, M.boca, 2);
  }
  if (l.especie === "ORC" && expr !== "grito") {
    t.poli([[cx - 4, my], [cx - 2.6, my], [cx - 3.3, my - 3.5]], M.branco, { tom: tomFixo(1) });
    t.poli([[cx + 2.6, my], [cx + 4, my], [cx + 3.3, my - 3.5]], M.branco, { tom: tomFixo(1) });
  }
  // blush em hachura
  if (PELE_HUMANOIDE(l)) {
    for (const lado of [-1, 1]) {
      const bx = cx + lado * 6.2 * k,
        by = cy + 4.6 * k;
      for (let i = 0; i < 3; i++) t.linha(bx - 2 + i * 2, by + 1, bx - 1 + i * 2, by - 1, M.blush, expr === "vitoria" ? 0 : 1);
    }
  }
  if (expr === "dor" || expr === "pvbaixo") {
    t.elipse(cx + R - 3, cy - 3 * k, 1.6, 2.4, M.suor, { tom: tomVol(0.3) });
    t.poli([[cx + R - 4.4, cy - 3 * k - 1], [cx + R - 1.6, cy - 3 * k - 1], [cx + R - 3, cy - 3 * k - 5]], M.suor, { tom: tomFixo(0) });
  }
  if (expr === "pvbaixo" || c.rasgado) {
    t.linha(cx - R * 0.55, cy + 2 * k, cx - R * 0.35, cy + 4.4 * k, M.sangue, 1);
    t.linha(cx - R * 0.5, cy + 2 * k, cx - R * 0.3, cy + 4.4 * k, M.sangue, 2);
  }
};

const marcas = (c: Ctx, o: OpCabeca) => {
  const { t, v } = c;
  const { cx, cy, R, dir } = o;
  const k = R / 10;
  if (dir === "N" || v.cabeca === "elmoFechado") return;
  const sx = dir === "E" ? 3 : 0;
  if (v.marca === "cicatriz") {
    t.linha(cx + 3 * k + sx, cy - 1.5 * k, cx + 5 * k + sx, cy + 4.5 * k, M.pele, 3);
    if (o.grande) t.linha(cx + 3 * k + sx + 1, cy - 1.5 * k, cx + 5 * k + sx + 1, cy + 4.5 * k, M.blush, 0);
  } else if (v.marca === "sardas") {
    for (const [dx, dy] of [
      [-6, 3.5],
      [-5, 4.5],
      [-7, 4.6],
      [5, 3.5],
      [6, 4.5],
      [4, 4.6],
    ])
      if (dir === "S" || dx > 0) t.px(cx + dx * k + sx, cy + dy * k, M.pele, 2);
  } else if (v.marca === "tatuagem") {
    t.linha(cx - 7 * k + sx, cy + 3 * k, cx - 6 * k + sx, cy + 6 * k, M.tatuagem, 1);
    t.linha(cx - 4 * k + sx, cy - 3 * k, cx - 3 * k + sx, cy - 1 * k, M.tatuagem, 1);
    if (dir === "S") t.linha(cx + 6 * k, cy + 3 * k, cx + 5 * k, cy + 6 * k, M.tatuagem, 1);
  } else if (v.marca === "pintura") {
    if (dir === "S") {
      t.ret(cx - 7 * k, cy + 3.6 * k, cx - 3 * k, cy + 4.4 * k, M.pintura, { tom: tomFixo(1) });
      t.ret(cx + 2 * k, cy + 3.6 * k, cx + 6 * k, cy + 4.4 * k, M.pintura, { tom: tomFixo(1) });
    } else t.ret(cx + 2 * k, cy + 3.6 * k, cx + 7 * k, cy + 4.4 * k, M.pintura, { tom: tomFixo(1) });
  }
};

const chapeu = (c: Ctx, o: OpCabeca, camada: "tras" | "frente") => {
  const { t, v } = c;
  const { cx, cy, R, dir } = o;
  const k = R / 10;
  const S = dir === "S",
    N = dir === "N";
  const hood = (mat: number) => {
    if (camada === "tras") {
      if (S) t.elipse(cx, cy + 1 * k, R + 2.4 * k, R + 2 * k, mat, { tom: tomVol(-0.2) });
      else if (!N) t.poli([[cx - R - 3 * k, cy + 9 * k], [cx - R - 2 * k, cy - 3 * k], [cx - 2 * k, cy - R - 3 * k], [cx + 4 * k, cy - R - 1 * k], [cx + 1 * k, cy + 9 * k]], mat, { tom: tomVol() });
      return;
    }
    const op: OpForma = { linha: true, padrao: (x, y, tt) => (y > cy + 2 * k && x % Math.max(5, Math.round(5 * k)) === 0 && tt === 1 ? 2 : tt) };
    if (N) {
      t.elipse(cx, cy, R + 2.2 * k, R + 2 * k, mat, op);
      t.poli([[cx - 3 * k, cy + 4 * k], [cx + 3 * k, cy + 4 * k], [cx, cy + 12 * k]], mat, op);
    } else if (S) {
      // borda do capuz emoldurando o rosto
      t.elipse(cx, cy - 0.5 * k, R + 2.2 * k, R + 1.6 * k, mat, { ...op, so: (x, y) => y < cy - 4 * k || Math.abs(x - cx) > R - 1.4 * k || y > cy + R + 0 * k });
      t.poli([[cx - R - 2 * k, cy + 3 * k], [cx - R + 1.5 * k, cy + 3 * k], [cx - 4 * k, cy + R + 3 * k], [cx - R, cy + R + 2 * k]], mat, op);
      t.poli([[cx + R + 2 * k, cy + 3 * k], [cx + R - 1.5 * k, cy + 3 * k], [cx + 4 * k, cy + R + 3 * k], [cx + R, cy + R + 2 * k]], mat, op);
    } else {
      t.elipse(cx - 1 * k, cy - 0.5 * k, R + 2.2 * k, R + 1.6 * k, mat, { ...op, so: (x, y) => y < cy - 4 * k || x < cx + R * 0.15 });
    }
  };
  switch (v.cabeca) {
    case "capuz":
      hood(c.l.classe === "PATRULHEIRO" || c.l.classe === "DRUIDA" ? M.capa : M.roupa);
      break;
    case "chapeu": {
      if (camada === "tras") return;
      // aba larga + cone pontudo com faixa dourada (ponta caída para trás)
      const by = cy - 4.6 * k;
      const lean = N ? 0 : S ? 2 * k : -3 * k;
      t.elipse(cx, by, R + 6 * k, 2.6 * k, M.roupa, { tom: (nx, ny) => (ny < 0 ? 1 : 3), linha: true });
      t.poli([[cx - R + 1.5 * k, by], [cx + R - 1.5 * k, by], [cx + 3 * k + lean, by - 9 * k], [cx + 6 * k + lean * 2.4, by - 13 * k], [cx + lean, by - 10 * k]], M.roupa, { tom: tomVol(0.05), linha: true });
      t.poli([[cx - R + 1.4 * k, by - 0.4 * k], [cx + R - 1.4 * k, by - 0.4 * k], [cx + R - 2.4 * k, by - 2.4 * k], [cx - R + 2.4 * k, by - 2.4 * k]], M.roupa2, { tom: tomCil() });
      t.px(cx - 1 * k, by - 1.4 * k, M.gema, 0);
      break;
    }
    case "elmoFechado":
    case "elmoAberto":
    case "elmoChifres": {
      if (camada === "tras") {
        if (v.cabeca === "elmoChifres") {
          for (const s of N ? [-1, 1] : S ? [-1, 1] : [-1]) {
            const hx = cx + s * (R - 1 * k) + (dir === "E" ? -2 * k : 0);
            t.capsula(hx, cy - 4 * k, hx + s * 4 * k, cy - 8 * k, 1.6 * k, M.chifre, { tom: tomVol(0.1) });
            t.capsula(hx + s * 4 * k, cy - 8 * k, hx + s * 4.6 * k, cy - 13 * k, 1 * k, M.chifre, { tom: tomVol(0.1) });
          }
        }
        return;
      }
      const fechado = v.cabeca === "elmoFechado";
      const op: OpForma = { linha: true, tom: tomVol(0.15) };
      t.elipse(cx, cy - (fechado ? 0 : 1.6) * k, R + 1.2 * k, R + (fechado ? 1 : 0.2) * k, M.metal, { ...op, so: fechado ? undefined : (x, y) => y < cy - 3 * k || (S ? Math.abs(x - cx) > R - 2 * k && y < cy + 5 * k : dir === "E" ? x < cx - 1 * k : true) });
      // aro de reforço com rebites
      t.ret(cx - R - 1 * k, cy - 4.4 * k, cx + R + 1 * k, cy - 3.4 * k, M.metal, { tom: tomFixo(2), so: (x, y) => t.get(x, y) === M.metal });
      if (fechado && !N) {
        if (S) {
          // fenda dos olhos com brilho
          t.ret(cx - 6 * k, cy + 0.6 * k, cx + 5 * k, cy + 2.2 * k, M.escuro, { tom: tomFixo(1) });
          const brilho = c.expr === "derrota" ? M.escuro : M.magia;
          const tb: Tom = c.expr === "dor" ? 2 : c.expr === "vitoria" || c.expr === "grito" ? 0 : 1;
          t.px(cx - 4 * k, cy + 1.4 * k, brilho, tb);
          t.px(cx + 3 * k, cy + 1.4 * k, brilho, tb);
          if (o.grande) {
            t.elipse(cx - 4 * k, cy + 1.4 * k, 1.6, 1, brilho, { tom: tomFixo(tb) });
            t.elipse(cx + 3 * k, cy + 1.4 * k, 1.6, 1, brilho, { tom: tomFixo(tb) });
          }
          if (hash3(c.l.id, 5) < 0.5) t.ret(cx - 0.5 * k, cy + 2.4 * k, cx + 0.5 * k, cy + 7 * k, M.escuro, { tom: tomFixo(1) });
          else for (let i = 0; i < 3; i++) t.px(cx - 2 * k + i * 2 * k, cy + 5.5 * k, M.escuro, 1);
        } else {
          t.ret(cx + 2 * k, cy + 0.6 * k, cx + R + 1 * k, cy + 2.2 * k, M.escuro, { tom: tomFixo(1) });
          t.px(cx + 6 * k, cy + 1.4 * k, c.expr === "derrota" ? M.escuro : M.magia, c.expr === "dor" ? 2 : 0);
        }
      } else if (!fechado && S) {
        t.ret(cx - 0.6 * k, cy - 3 * k, cx + 0.6 * k, cy + 3.2 * k, M.metal, { tom: tomCil(), linha: true });
      }
      t.px(cx - R * 0.45, cy - R * 0.6, M.metal, 4);
      if (v.pluma) {
        if (S || N) t.poli([[cx - 1.5 * k, cy - R - 0.5 * k], [cx + 1.5 * k, cy - R - 0.5 * k], [cx + 3 * k, cy - R - 6 * k], [cx, cy - R - 8 * k], [cx - 2 * k, cy - R - 5 * k]], M.pluma, { tom: tomVol(), padrao: (x, y, tt) => (y % 2 === 0 && tt === 1 ? 2 : tt) });
        else t.poli([[cx - 2 * k, cy - R], [cx + 2 * k, cy - R], [cx - 6 * k, cy - R - 5 * k], [cx - 9 * k, cy - R - 2 * k]], M.pluma, { tom: tomVol() });
      }
      break;
    }
    case "boina": {
      if (camada === "tras") return;
      const lado = dir === "E" ? -1 : 1;
      t.elipse(cx + lado * 2 * k, cy - R * 0.62, R + 1.6 * k, 4.4 * k, M.roupa2, { tom: tomVol(0.1), linha: true });
      if (v.pluma) t.capsula(cx - lado * 4 * k, cy - R * 0.8, cx - lado * 9 * k, cy - R - 6 * k, 1.2 * k, M.pluma, { tom: tomVol(0.2) });
      break;
    }
    case "bandana": {
      if (camada === "tras") return;
      t.ret(cx - R - 0.5 * k, cy - 4.6 * k, cx + R + 0.5 * k, cy - 2.6 * k, M.roupa2, { tom: tomCil(), so: (x, y) => t.get(x, y) >= 0 || S });
      if (!S) t.poli([[cx - R, cy - 4 * k], [cx - R - 5 * k, cy - 1 * k + c.p.capa], [cx - R - 4 * k, cy + 1 * k + c.p.capa]], M.roupa2, { tom: tomVol() });
      break;
    }
    case "diadema": {
      if (camada === "tras" || N) return;
      t.ret(cx - R + 0.5 * k, cy - 4.4 * k, cx + R - 0.5 * k, cy - 3.6 * k, M.ouro, { tom: tomCil(), so: (x, y) => t.get(x, y) >= 0 });
      if (S) t.elipse(cx, cy - 4.2 * k, 1.2 * k, 1.2 * k, M.gema, { tom: tomVol(0.3) });
      break;
    }
    case "folhas": {
      if (camada === "tras") return;
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        const lx = cx + Math.cos(a) * (R + 0.5 * k),
          ly = cy - 3 * k + Math.sin(a) * (R * 0.55);
        if (N || S || lx > cx - R * 0.6) t.elipse(lx, ly, 1.8 * k, 1.1 * k, M.folha, { tom: tomVol() });
      }
      break;
    }
    case "galhada": {
      if (camada === "frente") return;
      for (const s of N || S ? [-1, 1] : [-1, 1]) {
        const bx = cx + s * 4 * k + (dir === "E" ? -1 * k : 0);
        t.linha(bx, cy - R + 1 * k, bx + s * 3 * k, cy - R - 6 * k, M.madeira, 1);
        t.linha(bx + 1, cy - R + 1 * k, bx + s * 3 * k + 1, cy - R - 6 * k, M.madeira, 2);
        t.linha(bx + s * 3 * k, cy - R - 6 * k, bx + s * 6 * k, cy - R - 9 * k, M.madeira, 1);
        t.linha(bx + s * 1.5 * k, cy - R - 3 * k, bx + s * 5 * k, cy - R - 3.5 * k, M.madeira, 1);
        t.linha(bx + s * 3 * k, cy - R - 6 * k, bx + s * 2 * k, cy - R - 10 * k, M.madeira, 0);
      }
      break;
    }
  }
};

const especieCabeca = (c: Ctx, o: OpCabeca, camada: "tras" | "frente") => {
  const { t, l } = c;
  const { cx, cy, R, dir } = o;
  const k = R / 10;
  const S = dir === "S",
    N = dir === "N";
  const tapada = c.v.cabeca === "elmoFechado" || c.v.cabeca === "capuz";
  if (camada === "tras") {
    if (l.especie === "TIEFLING" && !c.v.cabeca.startsWith("elmo")) {
      // chifres curvos com anéis
      for (const s of S || N ? [-1, 1] : [1]) {
        const bx = cx + s * 4 * k + (dir === "E" ? -2 * k : 0);
        const pts = [
          [bx, cy - R + 2 * k],
          [bx + s * 2 * k, cy - R - 3 * k],
          [bx + s * 5 * k, cy - R - 5 * k],
          [bx + s * 7 * k, cy - R - 4 * k],
        ];
        for (let i = 1; i < pts.length; i++) t.capsula(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], (2.2 - i * 0.5) * k, M.chifre, { tom: tomVol(0.1), padrao: (x, y, tt) => ((x + y) % 3 === 0 && tt <= 1 ? 2 : tt) });
      }
    }
    if (l.especie === "DRACONATO") {
      for (const s of S || N ? [-1, 1] : [-1]) {
        const bx = cx + s * 5 * k + (dir === "E" ? -2 * k : 0);
        t.capsula(bx, cy - R + 3 * k, bx + s * 3 * k - (dir === "E" ? 3 * k : 0), cy - R - 4 * k, 1.4 * k, M.chifre, { tom: tomVol(0.1) });
      }
    }
    return;
  }
  if (tapada && l.especie !== "DRACONATO") return;
  if (l.especie === "ELFO" || l.especie === "GNOMO" || l.especie === "ORC") {
    const longa = l.especie === "ELFO";
    const gnomo = l.especie === "GNOMO";
    for (const s of S || N ? [-1, 1] : [-1]) {
      const ex = dir === "E" ? cx - 1 * k : cx + s * (R - 0.5 * k);
      if (gnomo) t.elipse(ex + s * 1.5 * k, cy + 1 * k, 2.6 * k, 3.4 * k, M.pele, { tom: tomVol(), linha: true });
      else if (dir === "E") t.poli([[ex - 1 * k, cy], [ex + 2 * k, cy + 3 * k], [ex - (longa ? 6 : 3) * k, cy - (longa ? 5 : 2) * k]], M.pele, { tom: tomVol(), linha: true });
      else t.poli([[ex, cy - 1 * k], [ex, cy + 3 * k], [ex + s * (longa ? 6 : 3) * k, cy - (longa ? 5 : 2) * k]], M.pele, { tom: tomVol(), linha: true });
    }
  }
  if (l.especie === "DRACONATO" && !N) {
    // focinho de dragão com escamas, narinas e dentes
    if (S) {
      t.elipse(cx, cy + 5.6 * k, 4.4 * k, 3.6 * k, M.pele, { tom: tomVol(0.05), linha: true });
      t.px(cx - 1.6 * k, cy + 4.2 * k, M.escuro, 1);
      t.px(cx + 1.6 * k, cy + 4.2 * k, M.escuro, 1);
      t.linha(cx - 3.4 * k, cy + 7.4 * k, cx + 3.4 * k, cy + 7.4 * k, M.escuro, 1);
      t.px(cx - 2.4 * k, cy + 8.2 * k, M.branco, 0);
      t.px(cx + 2.4 * k, cy + 8.2 * k, M.branco, 0);
      if (k > 1.5) for (let i = -2; i <= 2; i++) t.px(cx + i * k, cy + 8 * k, M.branco, 1);
    } else {
      t.poli([[cx + 2 * k, cy + 1 * k], [cx + R + 5 * k, cy + 3 * k], [cx + R + 5 * k, cy + 7 * k], [cx + 2 * k, cy + 9 * k]], M.pele, { tom: tomVol(0.2), linha: true });
      t.px(cx + R + 4 * k, cy + 3.6 * k, M.escuro, 1);
      t.linha(cx + 4 * k, cy + 6.6 * k, cx + R + 4 * k, cy + 6.2 * k, M.escuro, 1);
      t.px(cx + R + 2 * k, cy + 7.2 * k, M.branco, 1);
      t.px(cx + 7 * k, cy + 7.2 * k, M.branco, 1);
    }
    // crista
    for (let i = 0; i < 4; i++) t.poli([[cx - 2 * k + (dir === "E" ? -i * 2.4 * k : 0), cy - R + i * 3 * k], [cx + 2 * k + (dir === "E" ? -i * 2.4 * k : 0), cy - R + i * 3 * k], [cx + (dir === "E" ? -i * 2.4 * k - 3 * k : 0), cy - R - 2.5 * k + i * 3 * k]], M.chifre, { tom: tomFixo(2) });
  }
};

const cabeca = (c: Ctx, o: OpCabeca) => {
  const { t, l, v } = c;
  const { cx, cy, R, dir } = o;
  const k = R / 10;
  // camadas de trás
  chapeu(c, o, "tras");
  especieCabeca(c, o, "tras");
  cabelo(c, o, "tras");
  // pescoço com sombra
  t.ret(cx - 2.5 * k, cy + R - 2 * k, cx + 2.5 * k, cy + R + 3 * k, M.pele, { tom: tomFixo(2) });
  t.ret(cx - 2.5 * k, cy + R - 1 * k, cx + 2.5 * k, cy + R + 0.5 * k, M.pele, { tom: tomFixo(3) });
  // crânio
  const largo = l.especie === "ANAO" || l.especie === "ORC" || l.especie === "GOLIAS" ? 0.6 * k : 0;
  const escamas: OpForma["padrao"] =
    l.especie === "DRACONATO"
      ? (x, y, tt) => (tt === 1 && ((Math.floor(y / (1.6 * k)) % 2 === 0 ? x : x + 1.5 * k) % (3 * k) < 1 * k) && y % Math.max(2, Math.round(1.6 * k)) === 0 ? 2 : tt)
      : l.especie === "GOLIAS"
        ? (x, y, tt) => tt
        : undefined;
  t.elipse(cx + (dir === "E" ? 0.5 * k : 0), cy, R + largo, R * 0.98, M.pele, { tom: tomVol(0.05), padrao: escamas, linha: true });
  if (dir !== "N") {
    // maçã do rosto mais clara; sombra do queixo
    t.tonalizar((x, y, m, tt) => (m === M.pele && y > cy + R * 0.72 && Math.abs(x - cx) < R * 0.6 && tt === 1 ? 2 : tt));
  }
  if (dir === "N") {
    cabelo(c, o, "frente");
    especieCabeca(c, o, "frente");
    chapeu(c, o, "frente");
    return;
  }
  const fechado = v.cabeca === "elmoFechado";
  if (!fechado) {
    if (o.grande) rostoGrande(c, o);
    else rostoPequeno(c, o);
    marcas(c, o);
  }
  especieCabeca(c, o, "frente");
  barba(c, o);
  if (v.mascara && !fechado) {
    if (dir === "S") t.poli([[cx - R + 0.5 * k, cy + 4 * k], [cx + R - 0.5 * k, cy + 4 * k], [cx + R - 2 * k, cy + 8 * k], [cx, cy + R + 0.5 * k], [cx - R + 2 * k, cy + 8 * k]], M.roupa, { tom: tomVol(), linha: true });
    else t.poli([[cx, cy + 4 * k], [cx + R + 1 * k, cy + 4 * k], [cx + R, cy + 8 * k], [cx + 2 * k, cy + R]], M.roupa, { tom: tomVol(), linha: true });
  }
  cabelo(c, o, "frente");
  chapeu(c, o, "frente");
  // sombra do capuz sobre os olhos
  if (v.cabeca === "capuz") t.tonalizar((x, y, m, tt) => (m === M.pele && y < cy + 1 * k && tt < 3 ? ((tt + 1) as Tom) : tt));
};

// ───────────── corpo ─────────────
const geo = (v: Visual, p: Pose) => {
  const h = v.altura;
  const leg = Math.round(15 * h);
  const tronco = Math.round(13 * h);
  const hip = PE_Y - leg + p.bob;
  const ombro = hip - tronco;
  const hcy = ombro - 9 + (v.altura < 0.9 ? 1 : 0);
  const tw = v.altura >= 1.04 ? 8 : v.altura < 0.9 ? 6 : 7;
  return { leg, tronco, hip, ombro, hcy, tw };
};

const texturaCorpo = (c: Ctx, mat: number): OpForma["padrao"] => {
  const { v } = c;
  if (mat === M.metal && v.corpo === "malha") return (x, y, tt) => (tt <= 2 && (x + y) % 2 === 0 ? (Math.min(3, tt + 1) as Tom) : tt);
  if (mat === M.roupa || mat === M.roupa2 || mat === M.capa) {
    // dobras verticais e vincos na parte de baixo do pano
    const hip = geo(v, c.p).hip;
    return (x, y, tt) => (tt === 1 && y > hip - 2 && (x * 3 + Math.floor(y / 5)) % 7 === 0 ? 2 : tt);
  }
  return undefined;
};

const materialTronco = (v: Visual) => {
  switch (v.corpo) {
    case "placas":
    case "malha":
      return M.metal;
    case "couro":
    case "colete":
      return M.couro;
    case "peito":
      return M.pele;
    default:
      return M.roupa;
  }
};
const materialPernas = (v: Visual) => (v.corpo === "placas" ? M.metal : v.corpo === "gi" ? M.roupa : v.corpo === "peito" || v.corpo === "colete" ? M.couro : v.corpo === "couro" ? M.roupa : M.roupa2);
const materialBraco = (v: Visual) => (v.corpo === "placas" ? M.metal : v.corpo === "malha" ? M.metal : v.corpo === "peito" || v.corpo === "colete" ? M.pele : v.corpo === "couro" ? M.roupa : M.roupa);

const desenharCorpo = (c: Ctx) => {
  const { t, v, l, p, dir } = c;
  const g = geo(v, p);
  const cx = PE_X + (dir === "E" ? p.inclina * 0.5 : 0);
  const cxH = PE_X + (dir === "E" ? p.inclina : 0);
  const S = dir === "S",
    N = dir === "N",
    E = dir === "E";
  const matT = materialTronco(v);
  const matP = materialPernas(v);
  const matB = materialBraco(v);
  const manto = v.corpo === "manto";

  // ombros e mãos
  const flipA = S ? -1 : N ? 1 : 1; // direção "para fora" da mão da arma
  const ombroA: [number, number] = E ? [cx - 1, g.ombro + 2] : [cx + flipA * (g.tw - 1), g.ombro + 2];
  const ombroB: [number, number] = E ? [cx + 2, g.ombro + 2] : [cx - flipA * (g.tw - 1), g.ombro + 2];
  const mao = (o: [number, number], d: [number, number], sinal: number): [number, number] => [o[0] + d[0] * sinal, o[1] + d[1]];
  const maoA = mao(ombroA, p.maoA, E ? 1 : flipA);
  const maoB = mao(ombroB, p.maoB, E ? 1 : -flipA);
  const angA = E ? p.armaAng : flipA * p.armaAng;

  // capa (atrás)
  const desenharCapa = (frente: boolean) => {
    if (!v.capa) return;
    const op: OpForma = { padrao: (x, y, tt) => (tt === 1 && (x + p.capa) % 4 === 0 ? 2 : tt), linha: true };
    const baixo = PE_Y - 3;
    if (E) {
      if (frente) return;
      t.poli([[cx - 3, g.ombro], [cx + 3, g.ombro], [cx - 4 - p.capa, baixo], [cx - 11 - p.capa * 1.5, baixo - 2]], M.capa, op);
    } else if (N) {
      if (!frente) return;
      t.poli([[cx - g.tw - 1, g.ombro], [cx + g.tw + 1, g.ombro], [cx + g.tw + 4 + p.capa, baixo], [cx - g.tw - 4 + p.capa, baixo]], M.capa, op);
      // dobras
      for (const dx of [-3, 1, 4]) t.linha(cx + dx, g.ombro + 4, cx + dx * 1.5 + p.capa, baixo - 1, M.capa, 2);
      if (c.rasgado) for (let x = cx - g.tw - 3; x < cx + g.tw + 4; x += 3) t.apagar(x + p.capa, baixo - (hash3(x, 9) < 0.5 ? 0 : 1));
    } else {
      if (frente) return;
      t.poli([[cx - g.tw - 1, g.ombro], [cx + g.tw + 1, g.ombro], [cx + g.tw + 3 + p.capa, baixo], [cx - g.tw - 3 + p.capa, baixo]], M.capa, { tom: tomFixo(2), linha: true });
    }
  };
  desenharCapa(false);

  // aljava nas costas
  if (v.aljava && !N) {
    const ax = E ? cx - 5 : cx + flipA * -5;
    t.ret(ax - 1.5, g.ombro - 4, ax + 1.5, g.ombro + 6, M.couro, { tom: tomCil(), linha: true });
    for (let i = 0; i < 3; i++) t.px(ax - 1 + i, g.ombro - 5 - (i % 2), M.branco, i === 0 ? 0 : 2);
  }
  // cauda do tiefling
  if (l.especie === "TIEFLING" && !N) {
    const s = E ? -1 : 1;
    t.capsula(cx + s * 2, g.hip - 1, cx + s * 9, g.hip + 6 + p.capa, 1.1, M.pele, { tom: tomVol() });
    t.capsula(cx + s * 9, g.hip + 6 + p.capa, cx + s * 12, g.hip + 1 + p.capa, 1, M.pele, { tom: tomVol() });
    t.poli([[cx + s * 11, g.hip + 1 + p.capa], [cx + s * 14, g.hip - 1 + p.capa], [cx + s * 12, g.hip + 3 + p.capa]], M.pele, { tom: tomFixo(2) });
  }

  // braço de trás (lateral) e escudo atrás
  const braco = (o: [number, number], m: [number, number], frente: boolean) => {
    const opB: OpForma = { padrao: texturaCorpo(c, matB), linha: true };
    t.capsula(o[0], o[1], m[0], m[1] - 1, v.corpo === "manto" ? 2.4 : 2, matB, opB);
    // mão / manopla / faixas
    const mm = v.corpo === "placas" ? M.metal : v.arma === "punhos" ? M.bandagem : v.corpo === "couro" || v.corpo === "malha" ? M.couro : M.pele;
    t.elipse(m[0], m[1], 1.8, 1.8, mm, { tom: tomVol(0.2) });
    if (v.corpo === "manto" || v.corpo === "gi") t.elipse(o[0] + (m[0] - o[0]) * 0.6, o[1] + (m[1] - o[1]) * 0.6, 2.6, 2.6, M.roupa, { tom: tomVol() });
    if (p.brilho > 0.2 && frente) t.elipse(m[0], m[1], 1 + p.brilho * 1.5, 1 + p.brilho * 1.5, M.magia, { tom: tomFixo(0) });
  };

  if (E) {
    braco(ombroB, maoB, false);
    if (v.escudo) ESCUDO(c, maoB[0] + 2, maoB[1] - 2, 0.85);
    if (c.est === "arco") desenharArco(c, maoB[0] + 2, maoB[1] - 2, true, 1);
  }

  // pernas
  const pernas = () => {
    const opP: OpForma = { padrao: texturaCorpo(c, matP), linha: true };
    const bota = v.corpo === "placas" ? M.metal : v.corpo === "gi" ? M.pele : v.corpo === "peito" ? M.pelagem : M.couro;
    if (E) {
      for (const [lado, mat] of [
        [-1, 2],
        [1, 1],
      ] as const) {
        const av = (lado < 0 ? p.pe[1] : p.pe[0]) * (lado < 0 ? -1 : 1) * 1.5;
        const x0 = cx + (lado < 0 ? 1 : -1);
        t.capsula(x0, g.hip + 1, x0 + av, PE_Y - 3, 2.6, matP, { ...opP, tom: mat === 2 ? tomFixo(2) : undefined });
        t.ret(x0 + av - 2, PE_Y - 3, x0 + av + 3, PE_Y, bota, { tom: tomCil(), linha: true });
      }
      return;
    }
    for (const lado of [-1, 1]) {
      const x0 = cx + lado * 3;
      const lev = lado < 0 ? p.pe[0] : p.pe[1];
      t.ret(x0 - 2.5, g.hip, x0 + 2.5, PE_Y - 3 - lev, matP, opP);
      t.ret(x0 - 2.5, PE_Y - 4 - lev, x0 + 2.5, PE_Y - lev, bota, { tom: tomVol(0.1), linha: true });
      if (v.corpo === "placas") t.px(x0 - 1, g.hip + 5 - lev, M.metal, 4); // joelheira
    }
  };
  if (!manto) pernas();

  // tronco
  const op: OpForma = { padrao: texturaCorpo(c, matT), linha: true };
  const topo = g.ombro;
  const base = manto ? PE_Y - 1 : g.hip + 2;
  if (E) {
    t.poli([[cx - 4, topo], [cx + 4, topo], [cx + 4 + (manto ? 3 : 0), base], [cx - 5 - (manto ? 3 : 0), base]], matT, op);
  } else {
    const alarga = manto ? 4 : 0;
    t.poli([[cx - g.tw, topo], [cx + g.tw, topo], [cx + g.tw - 1 + alarga, base], [cx - g.tw + 1 - alarga, base]], matT, op);
    if (manto && (p.pe[0] || p.pe[1])) {
      // barra do manto balança e mostra os pés
      t.ret(cx - 5, PE_Y - 1, cx - 1, PE_Y, M.couro, { tom: tomFixo(2) });
      t.ret(cx + 1, PE_Y - 1, cx + 5, PE_Y, M.couro, { tom: tomFixo(2) });
    }
  }
  // detalhes por tipo de corpo (frente)
  if (S) {
    switch (v.corpo) {
      case "placas":
        t.elipse(cx, topo + 5, g.tw - 2, 4, M.metal, { tom: tomVol(0.25), linha: true });
        t.px(cx - 2, topo + 3, M.metal, 4);
        t.ret(cx - g.tw + 1, g.hip, cx + g.tw - 1, g.hip + 3, M.metal, { tom: tomCil(-0.1), linha: true });
        break;
      case "peito":
        // peitoral, abdômen e cicatrizes
        t.linha(cx, topo + 2, cx, g.hip - 1, M.pele, 2);
        t.linha(cx - 4, topo + 5, cx - 1, topo + 6, M.pele, 2);
        t.linha(cx + 1, topo + 6, cx + 4, topo + 5, M.pele, 3);
        t.px(cx - 2, topo + 9, M.pele, 2);
        t.px(cx + 2, topo + 9, M.pele, 2);
        t.linha(cx + 2, topo + 3, cx - 3, topo + 8, M.pele, 3);
        break;
      case "colete":
        t.poli([[cx - 2, topo], [cx + 2, topo], [cx + 1, g.hip], [cx - 1, g.hip]], M.pele, { tom: tomFixo(1) });
        t.linha(cx - 2, topo + 1, cx - 1, g.hip, M.couro, 0);
        break;
      case "gi":
        t.poli([[cx - 3, topo], [cx + 3, topo], [cx, topo + 6]], M.pele, { tom: tomVol() });
        t.linha(cx - 3, topo, cx + 1, topo + 7, M.roupa, 3);
        break;
      case "manto":
        t.ret(cx - 1.5, topo + 2, cx + 1.5, PE_Y - 2, M.roupa2, { tom: tomCil(), linha: true });
        break;
      case "couro":
        // correia diagonal com fivela e costuras
        t.linha(cx - g.tw + 1, topo + 1, cx + g.tw - 1, g.hip - 1, M.couro, 3);
        t.linha(cx - g.tw + 2, topo + 1, cx + g.tw, g.hip - 1, M.couro, 2);
        t.px(cx, topo + 7, M.ouro, 0);
        for (let y = topo + 2; y < g.hip; y += 2) t.px(cx - g.tw + 1, y, M.couro, 0);
        break;
      case "tunica":
        t.poli([[cx - 2, topo], [cx + 2, topo], [cx, topo + 3]], M.pele, { tom: tomFixo(2) });
        t.linha(cx - 3, topo + 4, cx - 4, g.hip, M.roupa, 2);
        break;
    }
    if (v.tabardo) {
      t.poli([[cx - 3.5, topo + 2], [cx + 3.5, topo + 2], [cx + 3, g.hip + 5], [cx - 3, g.hip + 5]], M.roupa, { tom: tomCil(), linha: true, padrao: (x, y, tt) => (tt === 1 && x === cx + 2 ? 2 : tt) });
      t.ret(cx - 0.5, topo + 4, cx + 0.5, topo + 9, M.brasao, { tom: tomFixo(1) });
      t.ret(cx - 2, topo + 5.5, cx + 2, topo + 6.5, M.brasao, { tom: tomFixo(1) });
    }
  }
  // cinto
  if (!manto || S) {
    const cintoMat = v.corpo === "gi" ? M.roupa2 : M.couro;
    if (E) t.ret(cx - 4, g.hip - 1, cx + 4, g.hip, cintoMat, { tom: tomCil() });
    else t.ret(cx - g.tw + 1, g.hip - 1, cx + g.tw - 1, g.hip, cintoMat, { tom: tomCil(), linha: true });
    if (S && v.corpo !== "gi") t.px(cx, g.hip - 1, M.ouro, 0);
    if (S && v.corpo === "gi") t.capsula(cx + 2, g.hip, cx + 4, g.hip + 5, 0.8, M.roupa2);
  }
  // pele de animal nos ombros
  if (v.peleOmbros) {
    const op2: OpForma = { padrao: (x, y, tt) => ((x + y * 3) % 4 === 0 && tt <= 1 ? 2 : tt), linha: true };
    if (E) t.elipse(cx, topo + 1, 5, 3, M.pelagem, op2);
    else t.elipse(cx, topo + 1, g.tw + 2, 3.2, M.pelagem, op2);
  }
  // ombreiras
  if (v.ombreiras) {
    if (E) t.elipse(cx, topo + 2, 3.5, 2.8, M.metal, { tom: tomVol(0.2), linha: true });
    else
      for (const s of [-1, 1]) {
        t.elipse(cx + s * (g.tw - 0.5), topo + 1.5, 3.4, 2.8, M.metal, { tom: tomVol(0.2), linha: true });
        t.px(cx + s * (g.tw - 0.5) - 1, topo + 0.5, M.metal, 4);
      }
  }
  // capa por cima (vista de costas)
  desenharCapa(true);
  if (v.aljava && N) {
    t.ret(cx + 3, g.ombro - 3, cx + 6, g.ombro + 8, M.couro, { tom: tomCil(), linha: true });
    for (let i = 0; i < 3; i++) t.px(cx + 4 + i, g.ombro - 4 - (i % 2), M.branco, 0);
  }
  if (c.est === "alaude" && N) t.elipse(cx, g.ombro + 6, 4, 5, M.madeira, { tom: tomVol(), linha: true });

  // roupa rasgada + arranhões (PV abaixo de 30%)
  if (c.rasgado) {
    const panos = new Set([M.roupa, M.roupa2, M.capa, M.couro, M.pelagem]);
    t.tonalizar((x, y, m, tt) => {
      if (!panos.has(m)) return tt;
      const h = hash3(x * 7 + l.id, y * 13);
      if (h < 0.035) return 3;
      return tt;
    });
    for (let i = 0; i < 3; i++) {
      const x = cx - 4 + Math.floor(hash3(l.id, i) * 9);
      const y = topo + 3 + Math.floor(hash3(l.id, i + 5) * 8);
      if (t.get(x, y) >= 0) {
        t.px(x, y, M.pele, 2);
        t.px(x + 1, y + 1, M.pele, 1);
      }
    }
    t.linha(cx + 3, topo + 3, cx + 5, topo + 6, M.sangue, 1);
  }

  // braço da frente (lateral) e braços na vista frontal/costas
  const armaAtras = N;
  if (E) {
    cabeca(c, { cx: cxH + 0.5, cy: g.hcy, R: 10, dir, grande: false });
    braco(ombroA, maoA, true);
    if (c.est === "pesada") t.elipse(maoA[0] + 1, maoA[1] + 1, 1.8, 1.8, v.corpo === "placas" ? M.metal : M.pele, { tom: tomVol() });
    if (c.est !== "arco") desenharArma(c, maoA[0], maoA[1], angA);
    return;
  }
  // frontal / costas
  if (armaAtras) {
    // costas: arma e escudo atrás do corpo... desenhados antes da cabeça, por cima do tronco
    braco(ombroB, maoB, true);
    braco(ombroA, maoA, true);
    if (c.est !== "arco") desenharArma(c, maoA[0], maoA[1], angA);
    if (c.est === "arco") desenharArco(c, maoB[0], maoB[1] - 2, false, 1);
    if (v.escudo) ESCUDO(c, cx - flipA * 2, g.ombro + 7, 0.9);
    cabeca(c, { cx: cxH, cy: g.hcy, R: 10, dir, grande: false });
    return;
  }
  cabeca(c, { cx: cxH, cy: g.hcy, R: 10, dir, grande: false });
  braco(ombroB, maoB, true);
  if (v.escudo) ESCUDO(c, maoB[0] - flipA * 1, maoB[1] - 3, 0.9);
  if (c.est === "arco") desenharArco(c, maoB[0], maoB[1] - 2, false, -flipA);
  braco(ombroA, maoA, true);
  if (c.est === "pesada") t.elipse(maoB[0], maoB[1], 1.8, 1.8, v.corpo === "placas" ? M.metal : M.pele, { tom: tomVol() });
  if (c.est !== "arco") desenharArma(c, maoA[0], maoA[1], angA);
  // orbe flutuante na cor da magia
  if (v.orbe) {
    const ox = cx + g.tw + 6,
      oy = g.ombro - 2 + Math.round(Math.sin(p.capa) * 1);
    t.elipse(ox, oy, 2.6, 2.6, M.magia, { tom: tomVol(0.4) });
    t.px(ox - 1, oy - 1, M.magia, 4);
  }
};

// ───────────── API ─────────────
export type Quadro = { anim: Anim; q: number; dir: Dir; expr: Expr; rasgado: boolean };

const caches = new Map<number, Map<string, HTMLCanvasElement>>();
const paletas = new Map<number, Rampa[]>();

const renderizar = (l: Lutador, fq: Quadro): HTMLCanvasElement => {
  const v = l.visual;
  const est = estiloDe(v);
  const dirReal: Dir = fq.dir === "W" ? "E" : fq.dir;
  const p = pose(fq.anim, fq.q, est, l.classe);
  const t = new Tela(SW, SH);
  const c: Ctx = { t, v, l, dir: dirReal, p, expr: fq.expr, rasgado: fq.rasgado, est };
  desenharCorpo(c);
  let pal = paletas.get(l.id);
  if (!pal) {
    pal = paletaDe(v, l);
    paletas.set(l.id, pal);
  }
  const img = t.cores(pal);
  let canvas = novoCanvas(SW, SH);
  canvas.getContext("2d")!.putImageData(img, 0, 0);
  // derrota: ajoelha → cai → no chão (rotação de 90°, sem perder pixels)
  if (p.deitado >= 2) {
    const r = novoCanvas(SW, SH);
    const ctx = r.getContext("2d")!;
    ctx.translate(PE_X, PE_Y - 2);
    ctx.rotate(p.deitado === 2 ? -Math.PI / 4 : -Math.PI / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, -PE_X, -PE_Y + (p.deitado === 3 ? 6 : 2));
    canvas = r;
  }
  if (fq.dir === "W") {
    const f = novoCanvas(SW, SH);
    const ctx = f.getContext("2d")!;
    ctx.translate(SW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0);
    canvas = f;
  }
  return canvas;
};

export const quadro = (l: Lutador, fq: Quadro): HTMLCanvasElement => {
  if (l.boss) return quadroChefe(l.boss, fq.anim, fq.q, fq.dir === "W" ? "W" : "E");
  let m = caches.get(l.id);
  if (!m) {
    m = new Map();
    caches.set(l.id, m);
  }
  const chave = `${fq.anim}|${fq.q}|${fq.dir}|${fq.expr}|${fq.rasgado ? 1 : 0}`;
  let cv = m.get(chave);
  if (!cv) {
    cv = renderizar(l, fq);
    m.set(chave, cv);
  }
  return cv;
};

// retrato grande 96×64 (cut-in e pergaminho)
const retratos = new Map<string, HTMLCanvasElement>();
export const retrato = (l: Lutador, expr: Expr): HTMLCanvasElement => {
  if (l.boss) return retratoChefe(l.boss);
  const chave = `${l.id}|${expr}`;
  const r0 = retratos.get(chave);
  if (r0) return r0;
  const v = l.visual;
  const t = new Tela(96, 64);
  const c: Ctx = { t, v, l, dir: "S", p: { ...P0, maoA: [1, 10], maoB: [1, 10], pe: [0, 0] }, expr, rasgado: false, est: estiloDe(v) };
  // busto: ombros e peito
  const matT = materialTronco(v);
  const R = 21;
  const cx = 48,
    cy = 30;
  if (v.capa) t.poli([[14, 64], [20, 50], [76, 50], [82, 64]], M.capa, { tom: tomVol(), linha: true });
  t.poli([[20, 64], [26, 52], [70, 52], [76, 64]], matT, { tom: tomVol(0.1), linha: true, padrao: texturaCorpo(c, matT) });
  if (v.corpo === "peito") {
    t.linha(48, 54, 48, 64, M.pele, 2);
    t.linha(36, 58, 46, 60, M.pele, 2);
    t.linha(50, 60, 60, 58, M.pele, 3);
  }
  if (v.corpo === "gi") t.poli([[40, 52], [56, 52], [48, 64]], M.pele, { tom: tomVol() });
  if (v.tabardo) t.ret(40, 56, 56, 64, M.roupa, { tom: tomCil(), linha: true });
  if (v.peleOmbros) for (const s of [-1, 1]) t.elipse(48 + s * 20, 55, 15, 7, M.pelagem, { tom: tomVol(), linha: true, padrao: (x, y, tt) => ((x + y * 3) % 4 === 0 && tt <= 1 ? 2 : tt) });
  if (v.ombreiras)
    for (const s of [-1, 1]) {
      t.elipse(48 + s * 24, 56, 9, 7, M.metal, { tom: tomVol(0.2), linha: true });
      t.px(48 + s * 24 - 3, 52, M.metal, 4);
    }
  cabeca(c, { cx, cy, R, dir: "S", grande: true });
  const img = t.cores(paletaDe(v, l));
  const cv = novoCanvas(96, 64);
  cv.getContext("2d")!.putImageData(img, 0, 0);
  retratos.set(chave, cv);
  return cv;
};

// mini retrato 16×16 do HUD: recorte do rosto do sprite de frente
const minis = new Map<string, HTMLCanvasElement>();
export const mini = (l: Lutador, expr: Expr, cinza = false): HTMLCanvasElement => {
  const chave = `${l.id}|${expr}|${cinza ? 1 : 0}`;
  const m0 = minis.get(chave);
  if (m0) return m0;
  const cv = novoCanvas(16, 16);
  const ctx = cv.getContext("2d")!;
  if (l.boss) ctx.drawImage(miniChefe(l.boss), 0, 0);
  else {
    const sp = quadro(l, { anim: "idle", q: 0, dir: "S", expr, rasgado: expr === "pvbaixo" });
    const g = geo(l.visual, P0);
    ctx.drawImage(sp, PE_X - 8, g.hcy - 7, 16, 16, 0, 0, 16, 16);
  }
  if (cinza) {
    const d = ctx.getImageData(0, 0, 16, 16);
    for (let i = 0; i < d.data.length; i += 4) {
      const y = d.data[i] * 0.3 + d.data[i + 1] * 0.55 + d.data[i + 2] * 0.15;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = y * 0.7;
    }
    ctx.putImageData(d, 0, 0);
  }
  minis.set(chave, cv);
  return cv;
};

// altura da cabeça medida como num herói (âncora PE_Y): o chefe usa a cabeça do desenho dele
export const alturaCabeca = (l: Lutador) => (l.boss ? CABECA[l.boss].y - CY + PE_Y : geo(l.visual, P0).hcy);
// âncora (pés) dentro do quadro devolvido por quadro()
export const ancora = (l: Lutador) => (l.boss ? { x: CX, y: CY } : { x: PE_X, y: PE_Y });
export const corClasse = (l: Lutador) => l.visual.magia;
