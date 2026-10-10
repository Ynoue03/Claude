// Gerador procedural dos sprites (48×64) e retratos (96×64 / 16×16) de cada lutador.
// Tudo é desenhado do zero por camadas: corpo da espécie → roupa da classe → cabeça/rosto → arma.
import { Lutador } from "../sim/ficha";
import { ESPECIE } from "../sim/tabelas";
import { hash } from "../sim/rng";
import { hex, misturar, rampa, RGB } from "./cor";
import { Material, Pintura, pintar, Tela, VAZIO } from "./tela";

export type Dir = "S" | "N" | "E" | "W";
export type Expr = "neutra" | "concentrada" | "grito" | "dor" | "pvBaixo" | "derrota" | "vitoria";
export type Anim = "idle" | "andar" | "ataque" | "magia" | "dano" | "derrota" | "vitoria";
export const QUADROS: Record<Anim, number> = { idle: 4, andar: 6, ataque: 4, magia: 7, dano: 2, derrota: 4, vitoria: 4 };
export const EXPRESSOES: Expr[] = ["neutra", "concentrada", "grito", "dor", "pvBaixo", "derrota", "vitoria"];

export const SPR_W = 48;
export const SPR_H = 64;

// ─────────────────────────── materiais ───────────────────────────
const enum K {
  pele,
  blush,
  cabelo,
  branco,
  iris,
  pupila,
  linha,
  boca,
  dente,
  r1,
  r2,
  couro,
  metal,
  ouro,
  madeira,
  malha,
  pelo,
  bota,
  cristal,
  orbe,
  chifre,
  pluma,
  faixa,
  sangue,
  olhoBrilho,
  linho,
  folha,
  suor,
  escama,
  capa,
  pintura,
  corda,
}

const fixo = (c: string, semLinha = true, emissivo = false): Material => ({
  rampa: rampa(c, { contraste: 0.8 }),
  textura: "liso",
  semLinha,
  emissivo,
});

const materiais = (l: Lutador): Material[] => {
  const ap = l.aparencia;
  const drac = l.especie === "draconato";
  const ms: Material[] = [];
  ms[K.pele] = { rampa: rampa(ap.pele), textura: drac ? "escama" : "liso" };
  ms[K.blush] = { rampa: rampa(misturar(hex(ap.pele), [230, 90, 100], 0.35).map(Math.round).reduce((s, v) => s + ("0" + v.toString(16)).slice(-2), "#")), textura: "liso", semLinha: true };
  ms[K.cabelo] = { rampa: rampa(ap.cabelo, { contraste: 1.1 }), textura: "cabelo", brilhante: true };
  ms[K.branco] = fixo("#ece6dc");
  ms[K.iris] = { rampa: rampa(ap.olhos), textura: "liso", semLinha: true };
  ms[K.pupila] = fixo("#1c1420");
  ms[K.linha] = { rampa: rampa("#2e1c26"), textura: "liso", semLinha: true };
  ms[K.boca] = fixo("#8a2c34");
  ms[K.dente] = fixo("#f2ecdc");
  ms[K.r1] = { rampa: rampa(ap.roupa1), textura: "tecido" };
  ms[K.r2] = { rampa: rampa(ap.roupa2), textura: "tecido" };
  ms[K.couro] = { rampa: rampa(l.classe === "ladino" ? "#4a3a34" : "#7c5236"), textura: "couro" };
  ms[K.metal] = { rampa: rampa("#a2acbc", { contraste: 1.35 }), textura: "metal", brilhante: true };
  ms[K.ouro] = { rampa: rampa(ap.dourado ? "#d6aa3a" : "#b8925a", { contraste: 1.2 }), textura: "metal", brilhante: true };
  ms[K.madeira] = { rampa: rampa("#8a5a34"), textura: "madeira" };
  ms[K.malha] = { rampa: rampa("#8e96a6", { contraste: 1.2 }), textura: "malha", brilhante: true };
  ms[K.pelo] = { rampa: rampa(l.classe === "barbaro" ? "#8a6a4c" : "#9a8a72"), textura: "pelo" };
  ms[K.bota] = { rampa: rampa("#4e382c"), textura: "couro" };
  ms[K.cristal] = { rampa: rampa(ap.orbe ?? "#6ad8f2", { brilho: 0.1 }), textura: "liso", brilhante: true, emissivo: true };
  ms[K.orbe] = { rampa: rampa(ap.orbe ?? "#9a4ae0", { brilho: 0.15 }), textura: "liso", brilhante: true, emissivo: true };
  ms[K.chifre] = { rampa: rampa(l.especie === "tiefling" ? "#4e3a52" : "#e2d4b4"), textura: "liso", brilhante: true };
  ms[K.pluma] = { rampa: rampa(ap.pluma), textura: "pelo" };
  ms[K.faixa] = { rampa: rampa(ap.faixa), textura: "tecido" };
  ms[K.sangue] = fixo("#b0202a");
  ms[K.olhoBrilho] = fixo("#ffe27a", true, true);
  ms[K.linho] = { rampa: rampa("#ddd2bc"), textura: "tecido" };
  ms[K.folha] = { rampa: rampa("#4f8e3c"), textura: "liso" };
  ms[K.suor] = fixo("#a8e0fa");
  ms[K.escama] = { rampa: rampa(misturar(hex(ap.pele), [60, 120, 140], 0.4).map(Math.round).reduce((s, v) => s + ("0" + v.toString(16)).slice(-2), "#")), textura: "escama", semLinha: true };
  ms[K.capa] = { rampa: rampa(l.classe === "patrulheiro" ? ap.roupa1 : ap.roupa2), textura: "tecido" };
  ms[K.pintura] = fixo(l.classe === "barbaro" ? "#3a5ec0" : "#c03a3a");
  ms[K.corda] = fixo("#e8e0c8");
  return ms;
};

// ─────────────────────────── proporções ───────────────────────────
type Corpo = { perna: number; tronco: number; ombro: number; quadril: number; cabW: number; cabH: number };

const proporcoes = (l: Lutador): Corpo => {
  const porte = ESPECIE[l.especie].porte;
  let c: Corpo = { perna: 15, tronco: 15, ombro: 16, quadril: 12, cabW: 20, cabH: 19 };
  if (porte === "baixo") c = { perna: 10, tronco: 12, ombro: 14, quadril: 11, cabW: 20, cabH: 19 };
  if (l.especie === "anao") c = { perna: 10, tronco: 13, ombro: 18, quadril: 14, cabW: 20, cabH: 19 };
  if (porte === "alto") c = { perna: 18, tronco: 17, ombro: 19, quadril: 14, cabW: 19, cabH: 19 };
  if (l.especie === "orc") c.ombro += 2;
  if (l.classe === "barbaro" || l.classe === "guerreiro") c.ombro += 1;
  return c;
};

// ─────────────────────────── pose de cada quadro ───────────────────────────
type Pose = {
  bob: number; // desce o tronco (respiração / passo)
  inclina: number; // tronco para frente (+) / trás (-)
  pernaA: [number, number]; // deslocamento do pé A (frente/trás em E; esquerda em S)
  pernaB: [number, number];
  maoF: [number, number]; // mão da frente (segura a arma), relativa ao ombro
  maoT: [number, number];
  arma: number; // ângulo da arma (rad)
  vento: number; // onda da capa/cabelo
  magia: number; // brilho da magia 0..1
  queda: number; // 0 de pé, 1 = 45°, 2 = deitado
};

const PI = Math.PI;

const poseDe = (l: Lutador, anim: Anim, f: number, dir: Dir): Pose => {
  const lado = dir === "E" || dir === "W";
  const arco = l.aparencia.arma === "arcoLongo" || l.aparencia.arma === "arcoCurto";
  const cajado = l.aparencia.arma === "cajado";
  const p: Pose = {
    bob: 0,
    inclina: 0,
    pernaA: [0, 0],
    pernaB: [0, 0],
    maoF: lado ? [3, 11] : [-1, 11],
    maoT: lado ? [-2, 11] : [1, 11],
    arma: lado ? (arco ? -PI / 2 : cajado ? -PI / 2 : -0.9) : arco || cajado ? -PI / 2 : -PI / 2 - 0.35,
    vento: 0,
    magia: 0,
    queda: 0,
  };
  switch (anim) {
    case "idle":
      p.bob = f === 1 || f === 2 ? 1 : 0;
      p.vento = f;
      break;
    case "andar": {
      const fase = (f / 6) * PI * 2;
      const s = Math.sin(fase);
      p.bob = f === 1 || f === 4 ? 1 : 0;
      if (lado) {
        p.pernaA = [Math.round(s * 4), s > 0.3 ? -1 : 0];
        p.pernaB = [Math.round(-s * 4), s < -0.3 ? -1 : 0];
        p.maoF = [3 - Math.round(s * 2), 11];
        p.maoT = [-2 + Math.round(s * 2), 11];
      } else {
        p.pernaA = [0, s > 0.3 ? -2 : 0];
        p.pernaB = [0, s < -0.3 ? -2 : 0];
        p.maoF = [-1, 11 - Math.round(s)];
        p.maoT = [1, 11 + Math.round(s)];
      }
      p.vento = f;
      break;
    }
    case "ataque": {
      if (arco) {
        const puxa = [2, 5, 7, 1][f];
        p.maoF = [8, 6];
        p.maoT = [8 - puxa, 6];
        p.arma = -PI / 2;
        p.inclina = f === 3 ? 1 : 0;
      } else if (l.aparencia.arma === "punhos") {
        const fr = [[2, 7], [-1, 8], [12, 6], [9, 7]][f];
        p.maoF = [fr[0], fr[1]];
        p.maoT = f === 1 ? [4, 6] : [1, 8];
        p.inclina = [0, -1, 3, 2][f];
        p.pernaA = [[0, 0], [1, 0], [4, 0], [3, 0]][f] as [number, number];
      } else {
        const ang = [-2.5, -2.2, 0.5, 1.0][f];
        const mao = [[-1, 1], [0, 0], [9, 7], [7, 10]][f];
        p.arma = ang;
        p.maoF = [mao[0], mao[1]];
        p.maoT = [mao[0] - 2, mao[1] + 1];
        p.inclina = [-1, -2, 3, 2][f];
        p.pernaA = [[0, 0], [-1, 0], [4, 0], [3, 0]][f] as [number, number];
      }
      if (!lado) {
        p.maoF = [-3, f >= 2 ? 6 : 0];
        p.arma = [-PI / 2 - 0.3, -PI / 2 - 0.6, PI / 2 + 0.4, PI / 2 + 0.2][f];
      }
      break;
    }
    case "magia": {
      const fr = [
        { b: 1, f: [-1, 12], t: [-3, 12], m: 0.1, i: -1 },
        { b: 0, f: [2, 6], t: [0, 6], m: 0.3, i: 0 },
        { b: -1, f: [1, -4], t: [-1, -4], m: 0.6, i: -1 },
        { b: -1, f: [1, -5], t: [-1, -5], m: 1, i: -1 },
        { b: 0, f: [10, 4], t: [6, 6], m: 1, i: 2 },
        { b: 0, f: [11, 5], t: [5, 7], m: 0.7, i: 3 },
        { b: 0, f: [6, 8], t: [0, 10], m: 0.3, i: 1 },
      ][f];
      p.bob = fr.b;
      p.maoF = [fr.f[0], fr.f[1]];
      p.maoT = [fr.t[0], fr.t[1]];
      p.magia = fr.m;
      p.inclina = fr.i;
      p.arma = cajado ? (f >= 4 ? -PI / 2 + 0.6 : -PI / 2) : p.arma;
      if (!lado) {
        p.maoF = [fr.f[1] < 5 ? -3 : -2, fr.f[1]];
        p.maoT = [fr.f[1] < 5 ? 3 : 2, fr.t[1]];
      }
      break;
    }
    case "dano":
      p.inclina = f === 0 ? -3 : -2;
      p.bob = f;
      p.maoF = lado ? [0, 9] : [-2, 8];
      p.maoT = lado ? [-4, 8] : [2, 8];
      break;
    case "derrota":
      p.inclina = [-2, -3, -3, -3][f];
      p.bob = [1, 4, 4, 4][f];
      p.queda = [0, 0, 1, 2][f];
      p.maoF = lado ? [-2, 6] : [-3, 6];
      p.maoT = lado ? [-5, 5] : [3, 6];
      break;
    case "vitoria":
      p.bob = f === 1 || f === 2 ? -1 : 0;
      p.maoF = lado ? [2, -6 - (f % 2)] : [-2, -6 - (f % 2)];
      p.arma = -PI / 2 + (lado ? 0.15 : -0.15);
      p.maoT = lado ? [-2, 10] : [2, 10];
      p.vento = f;
      if (l.aparencia.arma === "alaude") {
        p.maoF = [3, 8];
        p.maoT = [-1, 6 + (f % 2)];
      }
      break;
  }
  return p;
};

// ─────────────────────────── armas ───────────────────────────
/** desenha uma peça ao longo do eixo da arma: de `a` a `b` px a partir da mão */
const ao = (t: Tela, hx: number, hy: number, ang: number, a: number, b: number, larg: number, m: number) => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  t.capsula(hx + c * a, hy + s * a, hx + c * b, hy + s * b, larg / 2, larg / 2, m);
};

const desenharArma = (t: Tela, l: Lutador, hx: number, hy: number, ang: number, magia: number, dir: Dir) => {
  const id = l.aparencia.arma;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const cruz = (d: number, meia: number, m: number) => {
    const px = -s;
    const py = c;
    t.capsula(hx + c * d - px * meia, hy + s * d - py * meia, hx + c * d + px * meia, hy + s * d + py * meia, 0.8, 0.8, m);
  };
  switch (id) {
    case "espadaLonga":
      ao(t, hx, hy, ang, -3, 1, 2, K.couro);
      t.elipse(hx - c * 3.5, hy - s * 3.5, 1.2, 1.2, K.ouro);
      cruz(1.5, 3, K.ouro);
      ao(t, hx, hy, ang, 2.5, 15, 2.2, K.metal);
      break;
    case "montante":
      ao(t, hx, hy, ang, -5, 1, 2, K.couro);
      t.elipse(hx - c * 5.5, hy - s * 5.5, 1.3, 1.3, K.ouro);
      cruz(1.5, 4, K.ouro);
      ao(t, hx, hy, ang, 2.5, 20, 3, K.metal);
      break;
    case "machado":
    case "machadoGrande": {
      const g = id === "machadoGrande";
      ao(t, hx, hy, ang, -4, g ? 17 : 13, 2, K.madeira);
      const d = g ? 14 : 11;
      const px = -s;
      const py = c;
      const bx = hx + c * d;
      const by = hy + s * d;
      const r = g ? 6 : 4.5;
      t.poli(
        [
          bx - c * 2, by - s * 2,
          bx + px * r - c * 3, by + py * r - s * 3,
          bx + px * (r + 1) + c * 2, by + py * (r + 1) + s * 2,
          bx + c * 3, by + s * 3,
        ],
        K.metal,
        "plano",
        0.25,
      );
      if (g)
        t.poli([bx - c * 1, by - s * 1, bx - px * 3 - c * 2, by - py * 3 - s * 2, bx - px * 3 + c * 2, by - py * 3 + s * 2, bx + c * 2, by + s * 2], K.metal, "plano", 0.1);
      break;
    }
    case "martelo":
    case "maca": {
      ao(t, hx, hy, ang, -3, 11, 2, K.madeira);
      const bx = hx + c * 12;
      const by = hy + s * 12;
      if (id === "martelo") {
        const px = -s;
        const py = c;
        t.capsula(bx - px * 4, by - py * 4, bx + px * 4, by + py * 4, 2.6, 2.6, K.metal);
      } else {
        t.elipse(bx, by, 3, 3, K.metal);
        t.px(bx - 3, by, K.metal, 3);
        t.px(bx + 3, by, K.metal, 1);
        t.px(bx, by - 3, K.metal, 4);
      }
      break;
    }
    case "rapieira":
      ao(t, hx, hy, ang, -2, 1, 2, K.couro);
      t.elipse(hx + c * 1, hy + s * 1, 2.4, 2.4, K.ouro);
      ao(t, hx, hy, ang, 2, 17, 1.2, K.metal);
      break;
    case "adagas":
    case "adaga":
      ao(t, hx, hy, ang, -2, 1, 2, K.couro);
      cruz(1, 2, K.ouro);
      ao(t, hx, hy, ang, 1.5, 8, 2, K.metal);
      break;
    case "cimitarra": {
      ao(t, hx, hy, ang, -2, 1, 2, K.couro);
      cruz(1, 2.5, K.ouro);
      const px = -s;
      const py = c;
      for (let i = 2; i <= 13; i++) {
        const curva = ((i - 2) / 11) ** 2 * 3;
        t.capsula(hx + c * i + px * curva, hy + s * i + py * curva, hx + c * (i + 1) + px * curva, hy + s * (i + 1) + py * curva, 1.1, 1.1, K.metal);
      }
      break;
    }
    case "cajado":
      ao(t, hx, hy, ang, -14, 12, 2.2, K.madeira);
      t.elipse(hx + c * 14, hy + s * 14, 2.6 + magia, 3.2 + magia, K.cristal, 0.2);
      t.capsula(hx + c * 11, hy + s * 11 - 2, hx + c * 11, hy + s * 11 + 2, 1, 1, K.ouro);
      break;
    case "arcoLongo":
    case "arcoCurto": {
      const r = id === "arcoLongo" ? 13 : 10;
      // arco na vertical, curva para frente
      const frente = dir === "S" || dir === "N" ? 0 : 1;
      for (let i = -r; i <= r; i++) {
        const curva = (1 - (i / r) ** 2) * 4 * (frente ? 1 : 0.6);
        t.capsula(hx + curva, hy + i, hx + curva, hy + i + 1, 1, 1, K.madeira);
      }
      return;
    }
    case "alaude": {
      // alaúde em diagonal no peito
      t.elipse(hx, hy, 4.5, 3.6, K.madeira, 0.1);
      t.elipse(hx, hy, 1.2, 1.2, K.linha);
      ao(t, hx, hy, -0.7, 4, 12, 1.6, K.madeira);
      t.capsula(hx + 7, hy - 9, hx + 9, hy - 10, 1, 1, K.couro);
      break;
    }
    case "punhos":
      break;
  }
};

/** corda do arco (desenhada depois da mão de trás) */
const cordaArco = (t: Tela, l: Lutador, hx: number, hy: number, puxada: number, dir: Dir) => {
  const id = l.aparencia.arma;
  if (id !== "arcoLongo" && id !== "arcoCurto") return;
  const r = id === "arcoLongo" ? 13 : 10;
  if (dir === "S" || dir === "N") {
    t.linha(hx, hy - r, hx, hy + r, K.corda, 2);
    return;
  }
  t.linha(hx, hy - r, hx - puxada, hy, K.corda, 2);
  t.linha(hx - puxada, hy, hx, hy + r, K.corda, 2);
  if (puxada > 2) {
    // flecha armada
    t.linha(hx - puxada, hy, hx + 6, hy, K.madeira, 2);
    t.px(hx + 7, hy, K.metal, 4);
    t.px(hx - puxada - 1, hy - 1, K.pluma, 3);
    t.px(hx - puxada - 1, hy + 1, K.pluma, 2);
  }
};

// ─────────────────────────── rosto (gabaritos de 1×) ───────────────────────────
type Gab = string[];
const OLHO: Record<Expr, Gab> = {
  neutra: ["lll", "whI", "wip"],
  concentrada: ["...", "lll", "wip"],
  grito: ["lll", "www", "wpw"],
  dor: ["l..", ".ll", "l.."],
  pvBaixo: ["...", "lll", "wiI"],
  derrota: ["l.l", ".l.", "l.l"],
  vitoria: [".l.", "l.l", "..."],
};
const SOBRANCELHA: Record<Expr, Gab> = {
  neutra: ["...", "bbb"],
  concentrada: ["bb.", "..b"],
  grito: ["b..", ".bb"],
  dor: ["..b", "bb."],
  pvBaixo: ["..b", "bb."],
  derrota: ["...", "bbb"],
  vitoria: [".b.", "b.b"],
};
const BOCA: Record<Expr, Gab> = {
  neutra: [".mm."],
  concentrada: ["mmm"],
  grito: [".ttt.", "mmmmm", ".mrm."],
  dor: ["mtttm"],
  pvBaixo: [".m.", "mrm"],
  derrota: [".m.", "m.m", ".m."],
  vitoria: ["m...m", ".ttt."],
};

const espelharGab = (g: Gab) => g.map((s) => s.split("").reverse().join(""));

// ─────────────────────────── cabeça ───────────────────────────
type OptCab = { k: number; dir: Dir; expr: Expr; rasgado: boolean; coroa: boolean; vento: number };

const ehElmoFechado = (l: Lutador) => l.aparencia.cabeca === "elmoFechadoPluma" || l.aparencia.cabeca === "elmoFechadoCruz";

/** cabelo de trás (antes da cabeça) */
const cabeloTras = (t: Tela, l: Lutador, cx: number, cy: number, o: OptCab) => {
  const ap = l.aparencia;
  const k = o.k;
  if (ap.estilo === "careca" || ehElmoFechado(l) || l.especie === "draconato") return;
  const v = (o.vento % 4 < 2 ? 0 : 1) * k * 0.5;
  if (ap.estilo === "longo") {
    if (o.dir === "S") {
      t.capsula(cx - 8 * k, cy - 2 * k, cx - 10 * k - v, cy + 13 * k, 3.6 * k, 3 * k, K.cabelo);
      t.capsula(cx + 8 * k, cy - 2 * k, cx + 10 * k - v, cy + 13 * k, 3.6 * k, 3 * k, K.cabelo);
    } else if (o.dir === "N") {
      t.poli([cx - 10 * k, cy - 2 * k, cx + 10 * k, cy - 2 * k, cx + 9 * k + v, cy + 15 * k, cx - 9 * k + v, cy + 15 * k], K.cabelo);
    } else {
      t.capsula(cx - 4 * k, cy - 3 * k, cx - 8 * k - v, cy + 14 * k, 5 * k, 3.5 * k, K.cabelo);
    }
  }
  if (ap.estilo === "rabo") {
    if (o.dir === "S") t.capsula(cx + 7 * k, cy - 4 * k, cx + 11 * k + v, cy + 9 * k, 2.2 * k, 1.6 * k, K.cabelo);
    else if (o.dir === "N") t.capsula(cx, cy - 2 * k, cx + v, cy + 12 * k, 2.6 * k, 1.8 * k, K.cabelo);
    else t.capsula(cx - 8 * k, cy - 6 * k, cx - 13 * k - v, cy + 7 * k, 2.6 * k, 1.6 * k, K.cabelo);
  }
};

const cabeca = (t: Tela, l: Lutador, cx: number, cy: number, o: OptCab) => {
  const ap = l.aparencia;
  const k = o.k;
  const esp = l.especie;
  const drac = esp === "draconato";
  const lado = o.dir === "E";
  const costas = o.dir === "N";
  const rw = 10 * k;
  const rh = 9.5 * k;

  // chifres de tiefling e draconato atrás
  if (esp === "tiefling" && ap.cabeca !== "elmoFechadoPluma" && ap.cabeca !== "elmoFechadoCruz") {
    const hx = lado ? -2 * k : 0;
    t.capsula(cx - 6 * k + hx, cy - 7 * k, cx - 9 * k + hx, cy - 14 * k, 2.2 * k, 1 * k, K.chifre);
    t.capsula(cx - 9 * k + hx, cy - 14 * k, cx - 7 * k + hx, cy - 17 * k, 1 * k, 0.5 * k, K.chifre);
    if (!lado) {
      t.capsula(cx + 6 * k, cy - 7 * k, cx + 9 * k, cy - 14 * k, 2.2 * k, 1 * k, K.chifre);
      t.capsula(cx + 9 * k, cy - 14 * k, cx + 7 * k, cy - 17 * k, 1 * k, 0.5 * k, K.chifre);
    }
  }
  if (drac) {
    const hx = lado ? -3 * k : 0;
    t.capsula(cx - 6 * k + hx, cy - 6 * k, cx - 12 * k + hx, cy - 13 * k, 2 * k, 0.8 * k, K.chifre);
    if (!lado) t.capsula(cx + 6 * k, cy - 6 * k, cx + 12 * k, cy - 13 * k, 2 * k, 0.8 * k, K.chifre);
    // crista
    for (let i = -1; i <= 1; i++) t.capsula(cx + i * 3 * k + hx, cy - 8 * k, cx + i * 3 * k + hx - 1 * k, cy - 12 * k, 1.2 * k, 0.5 * k, K.escama);
  }

  cabeloTras(t, l, cx, cy, o);

  // orelhas
  const orelha = (sx: number) => {
    const ox = cx + sx * 9.5 * k;
    if (esp === "elfo") t.poli([ox - sx * 1 * k, cy - 1 * k, ox + sx * 6 * k, cy - 6 * k, ox + sx * 1 * k, cy + 3 * k], K.pele, "plano", 0.1);
    else if (esp === "gnomo") t.elipse(ox + sx * 1.5 * k, cy, 2.6 * k, 3.6 * k, K.pele);
    else if (esp === "orc") t.poli([ox - sx * 1 * k, cy - 1 * k, ox + sx * 3.5 * k, cy - 3 * k, ox + sx * 1 * k, cy + 3 * k], K.pele, "plano", 0.05);
    else if (!drac) t.elipse(ox, cy + 1 * k, 1.6 * k, 2.4 * k, K.pele);
  };
  if (!lado) {
    orelha(-1);
    orelha(1);
  } else if (!drac) {
    // de perfil, uma orelha no meio da cabeça
    const ox = cx - 1 * k;
    if (esp === "elfo") t.poli([ox, cy - 1 * k, ox - 7 * k, cy - 6 * k, ox + 1 * k, cy + 3 * k], K.pele, "plano", 0.1);
    else if (esp === "gnomo") t.elipse(ox, cy, 2.6 * k, 3.6 * k, K.pele);
    else t.elipse(ox, cy + 1 * k, 1.6 * k, 2.4 * k, K.pele);
  }

  // crânio + rosto
  t.elipse(cx, cy, rw, rh, K.pele);
  t.elipse(cx + (lado ? 1 * k : 0), cy + 3.5 * k, 8 * k, 6.2 * k, K.pele);
  if (drac) {
    // focinho
    if (lado) t.elipse(cx + 8 * k, cy + 3 * k, 6 * k, 4 * k, K.pele, 0.15);
    else if (!costas) t.elipse(cx, cy + 4 * k, 6.5 * k, 4.5 * k, K.pele, 0.2);
  }

  if (!costas) rosto(t, l, cx, cy, o);

  // cabelo da frente / topo
  cabeloFrente(t, l, cx, cy, o);
  chapeu(t, l, cx, cy, o);
  if (o.coroa) {
    const ty = cy - rh - (ap.cabeca === "chapeuPontudo" ? 10 * k : 1 * k);
    t.poli([cx - 5 * k, ty + 3 * k, cx - 5 * k, ty - 2 * k, cx - 2.5 * k, ty + 1 * k, cx, ty - 3 * k, cx + 2.5 * k, ty + 1 * k, cx + 5 * k, ty - 2 * k, cx + 5 * k, ty + 3 * k], K.ouro, "plano", 0.3);
    t.px(cx, ty + 1 * k, K.sangue, 2);
  }
};

const rosto = (t: Tela, l: Lutador, cx: number, cy: number, o: OptCab) => {
  const ap = l.aparencia;
  const k = o.k;
  const lado = o.dir === "E";
  const drac = l.especie === "draconato";
  const e = o.expr;

  // sombra do queixo no pescoço fica no corpo; aqui: blush, marcas e traços
  if (k === 1) {
    const mapa: Record<string, [number, number]> = {
      l: [K.linha, 1],
      w: [K.branco, 2],
      i: [K.iris, 2],
      I: [K.iris, 1],
      h: [K.branco, 4],
      p: [K.pupila, 1],
      b: [K.cabelo, 0],
      m: [K.boca, 0],
      r: [K.boca, 3],
      t: [K.dente, 2],
    };
    if (drac) {
      mapa.p = [K.pupila, 1];
      mapa.b = [K.escama, 1];
    }
    const ey = cy;
    if (lado) {
      t.gabarito(cx + 4, ey - 1, OLHO[e], mapa, true);
      t.gabarito(cx + 4, ey - 3, SOBRANCELHA[e], mapa, true);
      if (drac) {
        t.px(cx + 13, cy + 2, K.linha, 1);
        t.linha(cx + 8, cy + 5, cx + 13, cy + 5, K.linha, 1);
        t.px(cx + 9, cy + 6, K.dente, 2);
        t.px(cx + 11, cy + 6, K.dente, 2);
      } else {
        t.px(cx + 10, cy + 3, K.pele, 1); // nariz
        const b = BOCA[e];
        t.gabarito(cx + 9 - Math.floor(b[0].length / 2), cy + 6, b.map((s) => s.slice(Math.floor(s.length / 2))), mapa);
        t.px(cx + 5, cy + 4, K.blush, 2);
      }
    } else {
      t.gabarito(cx - 6, ey - 1, OLHO[e], mapa);
      t.gabarito(cx + 3, ey - 1, espelharGab(OLHO[e]), mapa);
      t.gabarito(cx - 6, ey - 3, SOBRANCELHA[e], mapa);
      t.gabarito(cx + 3, ey - 3, espelharGab(SOBRANCELHA[e]), mapa);
      if (drac) {
        t.px(cx - 2, cy + 3, K.linha, 1);
        t.px(cx + 1, cy + 3, K.linha, 1);
        t.linha(cx - 4, cy + 6, cx + 3, cy + 6, K.linha, 1);
        for (let x = -3; x <= 3; x += 2) t.px(cx + x, cy + 7, K.dente, 2);
        if (e === "grito" || e === "vitoria") t.linha(cx - 3, cy + 7, cx + 2, cy + 7, K.boca, 0);
      } else {
        t.px(cx, cy + 3, K.pele, 1);
        t.px(cx - 1, cy + 3, K.pele, 3);
        const b = BOCA[e];
        t.gabarito(cx - Math.floor(b[0].length / 2), cy + 6, b, mapa);
        if (e !== "dor") {
          t.px(cx - 7, cy + 3, K.blush, 2);
          t.px(cx - 6, cy + 3, K.blush, 3);
          t.px(cx + 6, cy + 3, K.blush, 2);
          t.px(cx + 5, cy + 3, K.blush, 3);
        }
        if (l.especie === "orc") {
          t.px(cx - 2, cy + 5, K.dente, 3);
          t.px(cx + 2, cy + 5, K.dente, 3);
        }
      }
      // marcas
      if (ap.marca === "cicatriz") t.linha(cx + 4, cy - 3, cx + 6, cy + 3, K.blush, 1);
      if (ap.marca === "tatuagem") {
        t.px(cx - 7, cy + 1, K.pintura, 1);
        t.px(cx - 7, cy + 2, K.pintura, 1);
        t.px(cx - 6, cy + 4, K.pintura, 1);
      }
      if (ap.marca === "sardas") {
        t.px(cx - 5, cy + 3, K.pele, 1);
        t.px(cx + 4, cy + 3, K.pele, 1);
        t.px(cx - 4, cy + 4, K.pele, 1);
      }
      if (ap.marca === "escamas") {
        t.px(cx - 8, cy + 1, K.escama, 2);
        t.px(cx - 8, cy + 3, K.escama, 1);
        t.px(cx + 7, cy + 1, K.escama, 2);
      }
      if (l.aparencia.pintura) {
        t.linha(cx - 8, cy + 2, cx - 5, cy + 2, K.pintura, 2);
        t.linha(cx + 4, cy + 2, cx + 7, cy + 2, K.pintura, 2);
      }
      if (l.especie === "golias") {
        t.linha(cx - 3, cy - 6, cx - 1, cy - 4, K.linha, 1);
        t.px(cx + 6, cy + 5, K.linha, 1);
      }
    }
    if (e === "dor" || e === "pvBaixo") {
      const sx = lado ? cx - 3 : cx + 9;
      t.px(sx, cy - 4, K.suor, 3);
      t.px(sx, cy - 3, K.suor, 2);
    }
    if (o.rasgado || e === "pvBaixo") {
      t.px(cx - 6 + (lado ? 9 : 0), cy + 5, K.sangue, 2);
      t.px(cx - 5 + (lado ? 9 : 0), cy + 4, K.sangue, 1);
    }
    return;
  }
  rostoGrande(t, l, cx, cy, o);
};

/** rosto detalhado para o retrato (k ≥ 2) */
const rostoGrande = (t: Tela, l: Lutador, cx: number, cy: number, o: OptCab) => {
  const k = o.k;
  const e = o.expr;
  const drac = l.especie === "draconato";
  const olho = (sx: number) => {
    const ex = cx + sx * 4.6 * k;
    const ey = cy + 0.6 * k;
    const rx = 2.5 * k;
    const ry = 2.9 * k;
    const lin = (x0: number, y0: number, x1: number, y1: number) => t.capsula(ex + x0 * k, ey + y0 * k, ex + x1 * k, ey + y1 * k, 0.55 * k, 0.55 * k, K.linha);
    if (e === "dor") {
      lin(-2 * sx, -2, 2 * sx, 0);
      lin(2 * sx, 0, -2 * sx, 1.8);
      return;
    }
    if (e === "derrota") {
      lin(-2, -2, 2, 2);
      lin(2, -2, -2, 2);
      return;
    }
    if (e === "vitoria") {
      lin(-2.4, 1, 0, -1.4);
      lin(0, -1.4, 2.4, 1);
      return;
    }
    const corte = e === "concentrada" ? -0.25 : e === "pvBaixo" ? 0.05 : -2;
    const clip = (x: number, y: number) => (y + 0.5 - ey) / ry > corte;
    t.elipse(ex, ey, rx, ry, K.branco, 0.3, clip);
    const ir = e === "grito" ? 0.7 : 1;
    t.elipse(ex + sx * 0.3 * k, ey + 0.2 * k, 1.75 * k * ir, 2.4 * k * ir, K.iris, 0, clip);
    if (drac) t.elipse(ex + sx * 0.3 * k, ey + 0.2 * k, 0.4 * k, 2 * k * ir, K.pupila, 0, clip);
    else t.elipse(ex + sx * 0.3 * k, ey + 0.3 * k, 0.9 * k * ir, 1.2 * k * ir, K.pupila, 0, clip);
    // brilhos
    if (clip(0, ey - 1 * k)) {
      t.px(ex - 0.6 * k, ey - 1.1 * k, K.branco, 4);
      t.px(ex - 0.6 * k + 1, ey - 1.1 * k, K.branco, 4);
      t.px(ex - 0.6 * k, ey - 1.1 * k + 1, K.branco, 4);
    }
    t.px(ex + 0.9 * k, ey + 1.2 * k, K.branco, 3);
    // pálpebra superior grossa
    const topo = corte > -1 ? ey + corte * ry : ey - ry;
    t.capsula(ex - rx - 0.3 * k, topo + 0.3 * k, ex + rx + 0.2 * k, topo - (corte > -1 ? 0 : 0.2 * k), 0.75 * k, 0.75 * k, K.linha);
    t.px(ex + sx * (rx + 0.6 * k), topo, K.linha, 1); // cílio
    if (e === "pvBaixo") t.capsula(ex - rx, ey + ry - 0.3 * k, ex + rx, ey + ry - 0.3 * k, 0.4 * k, 0.4 * k, K.pele);
  };
  olho(-1);
  olho(1);
  // sobrancelhas
  const sob = (sx: number) => {
    const bx = cx + sx * 4.6 * k;
    const by = cy - 3.6 * k;
    const inc: Record<Expr, number> = { neutra: 0, concentrada: 1.1, grito: 1.6, dor: -1.2, pvBaixo: -1.1, derrota: -0.6, vitoria: -0.7 };
    const d = inc[e];
    t.capsula(bx - sx * 2.6 * k, by - (e === "vitoria" ? 0.6 * k : 0), bx + sx * 2.2 * k, by + d * k, 0.7 * k, 0.6 * k, drac ? K.escama : K.cabelo);
  };
  sob(-1);
  sob(1);
  // nariz
  if (drac) {
    t.px(cx - 1.6 * k, cy + 3.3 * k, K.linha, 1);
    t.px(cx + 1.6 * k, cy + 3.3 * k, K.linha, 1);
  } else {
    t.px(cx + 0.4 * k, cy + 3.4 * k, K.pele, 1);
    t.px(cx + 0.4 * k + 1, cy + 3.4 * k, K.pele, 1);
    t.px(cx - 0.6 * k, cy + 2.6 * k, K.pele, 3);
  }
  // boca
  const my = cy + 6.3 * k;
  const bocaLinha = (x0: number, y0: number, x1: number, y1: number) =>
    t.capsula(cx + x0 * k, my + y0 * k, cx + x1 * k, my + y1 * k, 0.45 * k, 0.45 * k, K.boca);
  switch (e) {
    case "neutra":
      bocaLinha(-1.4, 0, 1.4, 0);
      break;
    case "concentrada":
      bocaLinha(-1.8, 0.2, 1.8, -0.2);
      break;
    case "grito":
      t.elipse(cx, my + 0.6 * k, 2.8 * k, 2.4 * k, K.boca, -0.6);
      t.elipse(cx, my + 1.8 * k, 1.6 * k, 1 * k, K.boca, 0.6);
      t.poli([cx - 2.2 * k, my - 1 * k, cx + 2.2 * k, my - 1 * k, cx + 1.8 * k, my - 0.2 * k, cx - 1.8 * k, my - 0.2 * k], K.dente, "plano");
      break;
    case "dor":
      t.poli([cx - 2.4 * k, my - 0.6 * k, cx + 2.4 * k, my - 0.6 * k, cx + 2.4 * k, my + 0.8 * k, cx - 2.4 * k, my + 0.8 * k], K.dente, "plano");
      bocaLinha(-2.6, 0.1, 2.6, 0.1);
      break;
    case "pvBaixo":
      t.elipse(cx, my + 0.3 * k, 1.3 * k, 1.1 * k, K.boca, -0.5);
      break;
    case "derrota":
      t.elipse(cx, my + 0.3 * k, 1.4 * k, 1.6 * k, K.boca, -0.5);
      break;
    case "vitoria":
      t.poli([cx - 2.8 * k, my - 0.8 * k, cx + 2.8 * k, my - 0.8 * k, cx + 1.4 * k, my + 1.6 * k, cx - 1.4 * k, my + 1.6 * k], K.boca, "plano", -0.6);
      t.poli([cx - 2.4 * k, my - 0.8 * k, cx + 2.4 * k, my - 0.8 * k, cx + 2 * k, my - 0.1 * k, cx - 2 * k, my - 0.1 * k], K.dente, "plano");
      break;
  }
  if (drac) {
    for (let x = -3; x <= 3; x += 1.5) t.px(cx + x * k, my - 1 * k, K.dente, 3);
  }
  if (l.especie === "orc") {
    t.poli([cx - 2.6 * k, my - 0.2 * k, cx - 1.9 * k, my - 2.4 * k, cx - 1.4 * k, my - 0.2 * k], K.dente, "plano", 0.2);
    t.poli([cx + 1.4 * k, my - 0.2 * k, cx + 1.9 * k, my - 2.4 * k, cx + 2.6 * k, my - 0.2 * k], K.dente, "plano", 0.2);
  }
  // blush
  if (e !== "dor" && e !== "derrota" && !drac) {
    t.elipse(cx - 6.4 * k, cy + 3.6 * k, 1.6 * k, 0.8 * k, K.blush, 0.2);
    t.elipse(cx + 6.4 * k, cy + 3.6 * k, 1.6 * k, 0.8 * k, K.blush, 0.2);
  }
  const ap = l.aparencia;
  if (ap.marca === "cicatriz") {
    t.capsula(cx + 3.4 * k, cy - 4 * k, cx + 6.2 * k, cy + 4 * k, 0.4 * k, 0.4 * k, K.blush);
    for (let i = 0; i < 3; i++) t.px(cx + (4 + i * 0.9) * k, cy + (-2 + i * 2.4) * k, K.pele, 3);
  }
  if (ap.marca === "tatuagem") {
    t.capsula(cx - 7.6 * k, cy + 0.6 * k, cx - 7 * k, cy + 4.4 * k, 0.4 * k, 0.4 * k, K.pintura);
    t.capsula(cx - 7 * k, cy + 4.4 * k, cx - 5.6 * k, cy + 5.4 * k, 0.4 * k, 0.4 * k, K.pintura);
  }
  if (ap.marca === "sardas")
    for (const [x, y] of [[-5, 3.2], [-4, 4], [-6, 4.3], [5, 3.2], [4, 4.1], [6, 4.4]]) t.px(cx + x * k, cy + y * k, K.pele, 1);
  if (ap.marca === "escamas") {
    for (const [x, y] of [[-8, 1], [-7.4, 2.4], [-8.4, 3], [7.6, 1], [7, 2.6]]) t.elipse(cx + x * k, cy + y * k, 0.7 * k, 0.6 * k, K.escama, 0.3);
  }
  if (ap.pintura) {
    t.capsula(cx - 8.4 * k, cy + 2.6 * k, cx - 5 * k, cy + 2.2 * k, 0.5 * k, 0.5 * k, K.pintura);
    t.capsula(cx + 5 * k, cy + 2.2 * k, cx + 8.4 * k, cy + 2.6 * k, 0.5 * k, 0.5 * k, K.pintura);
  }
  if (l.especie === "golias") {
    t.capsula(cx - 2.5 * k, cy - 7 * k, cx - 0.5 * k, cy - 4.5 * k, 0.35 * k, 0.35 * k, K.linha);
    t.capsula(cx + 5.5 * k, cy + 5 * k, cx + 7 * k, cy + 6.5 * k, 0.35 * k, 0.35 * k, K.linha);
  }
  if (e === "dor" || e === "pvBaixo") {
    t.elipse(cx + 8.8 * k, cy - 4 * k, 0.8 * k, 1.2 * k, K.suor, 0.5);
    t.px(cx + 8.8 * k, cy - 5.6 * k, K.suor, 4);
  }
  if (o.rasgado || e === "pvBaixo") {
    t.capsula(cx - 7 * k, cy + 4.6 * k, cx - 4.6 * k, cy + 6.4 * k, 0.35 * k, 0.35 * k, K.sangue);
    t.capsula(cx - 6.6 * k, cy + 5.6 * k, cx - 5 * k, cy + 6.8 * k, 0.3 * k, 0.3 * k, K.sangue);
  }
};

const cabeloFrente = (t: Tela, l: Lutador, cx: number, cy: number, o: OptCab) => {
  const ap = l.aparencia;
  const k = o.k;
  const lado = o.dir === "E";
  const costas = o.dir === "N";
  if (l.especie === "draconato" || ehElmoFechado(l)) return;
  const coberto = ap.cabeca === "capuz" || ap.cabeca === "chapeuPontudo" || ap.cabeca === "elmoAberto" || ap.cabeca === "elmoChifres" || ap.cabeca === "elmoPluma";
  const estilo = ap.estilo;
  if (estilo === "careca") {
    if (!coberto) {
      t.px(cx - 4 * k, cy - 7 * k, K.pele, 4);
      t.px(cx - 3 * k, cy - 7.6 * k, K.pele, 4);
    }
    return;
  }
  // barba (antes do cabelo para ficar embaixo da franja lateral)
  if (ap.barba && !costas) {
    if (lado) t.poli([cx + 2 * k, cy + 3 * k, cx + 9 * k, cy + 4 * k, cx + 7 * k, cy + 11 * k, cx + 1 * k, cy + 10 * k, cx - 2 * k, cy + 4 * k], K.cabelo);
    else {
      t.poli([cx - 8.6 * k, cy + 2.5 * k, cx - 6.5 * k, cy + 4.8 * k, cx + 6.5 * k, cy + 4.8 * k, cx + 8.6 * k, cy + 2.5 * k, cx + 7 * k, cy + 9.5 * k, cx, cy + 11.5 * k, cx - 7 * k, cy + 9.5 * k], K.cabelo);
      // abre a boca no meio da barba
      const my = cy + 6 * k;
      const bw = k === 1 ? 2 : 2.4 * k;
      for (let y = my - 0.6 * k; y <= my + (o.expr === "grito" ? 2.4 * k : 1 * k); y++)
        for (let x = cx - bw; x <= cx + bw; x++) if (t.get(Math.floor(x), Math.floor(y)) === K.cabelo) t.set(x, y, K.pele, 0.4);
      // re-desenha a boca por cima
      if (k === 1) {
        const b = BOCA[o.expr];
        const mapa: Record<string, [number, number]> = { m: [K.boca, 0], r: [K.boca, 3], t: [K.dente, 2] };
        t.gabarito(cx - Math.floor(b[0].length / 2), cy + 6, b, mapa);
      } else t.capsula(cx - 1.6 * k, my + 0.2 * k, cx + 1.6 * k, my + 0.2 * k, 0.45 * k, 0.45 * k, K.boca);
      // bigode
      t.capsula(cx - 3 * k, cy + 5 * k, cx - 0.6 * k, cy + 4.4 * k, 0.9 * k, 0.9 * k, K.cabelo);
      t.capsula(cx + 0.6 * k, cy + 4.4 * k, cx + 3 * k, cy + 5 * k, 0.9 * k, 0.9 * k, K.cabelo);
    }
  }
  if (ap.cabeca === "capuz") return; // o capuz cobre o topo
  const top = cy - 9.6 * k;
  // calota
  if (costas) {
    t.elipse(cx, cy - 1 * k, 10.6 * k, 10 * k, K.cabelo);
  } else if (lado) {
    t.elipse(cx - 2 * k, cy - 3 * k, 10 * k, 7.6 * k, K.cabelo, 0, (x, y) => y < cy - 3 * k + 3 * k * Math.sin((x - cx) * 0.9 / k) || x < cx - 3 * k);
    // mecha caindo na frente da orelha
    t.capsula(cx + 2 * k, cy - 5 * k, cx + 1 * k, cy + 1 * k, 1.4 * k, 0.8 * k, K.cabelo);
  } else {
    const franja = (x: number) => {
      const u = (x - cx) / k;
      const base = estilo === "moicano" ? -6 : -3.2;
      return cy + (base + 1.6 * Math.abs(Math.sin(u * 0.95 + 0.6)) + (u < -2 ? 1 : 0)) * k;
    };
    if (estilo !== "moicano") {
      t.elipse(cx, cy - 2.6 * k, 10.8 * k, 7.6 * k, K.cabelo, 0, (x, y) => y < franja(x));
      // laterais
      t.capsula(cx - 9.4 * k, cy - 4 * k, cx - 9.6 * k, cy + 2 * k, 1.6 * k, 1 * k, K.cabelo);
      t.capsula(cx + 9.4 * k, cy - 4 * k, cx + 9.6 * k, cy + 2 * k, 1.6 * k, 1 * k, K.cabelo);
    }
  }
  // estilos
  if (estilo === "moicano") {
    if (lado || costas) {
      for (let i = -3; i <= 3; i++) {
        const x = cx - 2 * k + i * 2 * k;
        t.capsula(x, top + 1.5 * k, x - 1 * k, top - 4 * k + Math.abs(i) * 0.6 * k, 1.8 * k, 0.6 * k, K.cabelo);
      }
    } else {
      t.elipse(cx, top + 2 * k, 2.6 * k, 3.4 * k, K.cabelo);
      for (let i = -2; i <= 2; i++) t.capsula(cx + i * 1.2 * k, top + 1 * k, cx + i * 2.2 * k, top - 4.5 * k + Math.abs(i) * 1.2 * k, 1.3 * k, 0.5 * k, K.cabelo);
    }
  }
  if (estilo === "coque") t.elipse(cx + (lado ? -4 * k : 0), top - 1 * k, 4 * k, 3.4 * k, K.cabelo);
  if (estilo === "curto" && !costas) {
    for (let i = -2; i <= 2; i++) t.capsula(cx + i * 3 * k, top + 1.5 * k, cx + i * 3.6 * k - 1 * k, top - 1.8 * k, 1.4 * k, 0.5 * k, K.cabelo);
  }
  if (estilo === "trancas" && !lado && !costas) {
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) t.elipse(cx + sx * 9 * k, cy + 2 * k + i * 2.6 * k, 1.7 * k, 1.5 * k, K.cabelo);
      t.elipse(cx + sx * 9 * k, cy + 15 * k, 1.2 * k, 0.9 * k, K.faixa);
    }
  }
  if (estilo === "longo" && !lado && !costas) {
    t.capsula(cx - 9.6 * k, cy - 2 * k, cx - 10 * k, cy + 10 * k, 2 * k, 2.2 * k, K.cabelo);
    t.capsula(cx + 9.6 * k, cy - 2 * k, cx + 10 * k, cy + 10 * k, 2 * k, 2.2 * k, K.cabelo);
  }
  // dois brilhos em mechas
  if (!costas && estilo !== "moicano") {
    const hx = lado ? cx - 4 * k : cx - 5 * k;
    t.capsula(hx, top + 2.4 * k, hx + 2 * k, top + 1.6 * k, 0.5 * k, 0.5 * k, K.cabelo);
    t.tonalizar(hx, top + 2.4 * k, 4);
    t.tonalizar(hx + 1, top + 2 * k, 4);
    t.tonalizar(hx + 5 * k, top + 1.6 * k, 4);
    t.tonalizar(hx + 5 * k + 1, top + 1.6 * k, 3);
  }
};

const chapeu = (t: Tela, l: Lutador, cx: number, cy: number, o: OptCab) => {
  const ap = l.aparencia;
  const k = o.k;
  const lado = o.dir === "E";
  const costas = o.dir === "N";
  const v = o.vento % 4 < 2 ? 0 : 1;
  const plumar = (x: number, y: number) => {
    for (let i = 0; i < 6; i++) {
      const a = -PI / 2 - 0.2 - i * 0.28;
      t.capsula(x + Math.cos(a) * i * 1.4 * k - (lado ? i * 0.8 * k : 0), y + Math.sin(a) * i * 1.2 * k + i * 0.5 * k, x + Math.cos(a) * (i + 1) * 1.4 * k - (lado ? i * 0.8 * k : 0), y + Math.sin(a) * (i + 1) * 1.2 * k + i * 0.5 * k + v * 0.5 * k, (2 - i * 0.2) * k, (1.8 - i * 0.2) * k, K.pluma);
    }
  };
  switch (ap.cabeca) {
    case "elmoFechadoPluma":
    case "elmoFechadoCruz": {
      t.elipse(cx + (lado ? 1 * k : 0), cy, 10.6 * k, 10.2 * k, K.metal);
      t.elipse(cx + (lado ? 1 * k : 0), cy + 4 * k, 8.8 * k, 6.6 * k, K.metal, -0.05);
      if (!costas) {
        const x0 = lado ? cx + 2 * k : cx - 7 * k;
        const x1 = lado ? cx + 10 * k : cx + 7 * k;
        const ey = cy + 0.4 * k;
        for (let x = x0; x <= x1; x++) for (let y = ey - 0.5 * k; y <= ey + 0.8 * k; y++) t.px(x, y, K.linha, 0);
        if (ap.cabeca === "elmoFechadoCruz") for (let y = cy - 6 * k; y <= cy + 8 * k; y++) for (let x = cx - 0.7 * k; x <= cx + 0.6 * k; x++) t.px(x + (lado ? 6 * k : 0), y, K.linha, 0);
        else for (let i = 0; i < 3; i++) t.px(cx + (lado ? 7 * k : -3 * k + i * 3 * k), cy + 6 * k, K.linha, 0);
        // olhos brilhando na fenda (mudam com a expressão)
        const e = o.expr;
        const brilho = (x: number) => {
          if (e === "derrota") return;
          const w = e === "grito" ? 2 : 1;
          for (let i = 0; i < Math.max(1, w * k); i++)
            for (let j = 0; j < Math.max(1, (e === "dor" || e === "vitoria" ? 0.5 : 1) * k); j++) t.px(x + i, ey - (e === "vitoria" ? 1 : 0) + j, K.olhoBrilho, e === "dor" ? 1 : 3);
        };
        if (lado) brilho(cx + 5 * k);
        else {
          brilho(cx - 5 * k);
          brilho(cx + 3 * k);
        }
        // rebites
        t.px(cx - 8 * k, cy + 3 * k, K.metal, 4);
        t.px(cx + 8 * k, cy + 3 * k, K.metal, 1);
      }
      if (ap.cabeca === "elmoFechadoPluma") plumar(cx - (lado ? 2 * k : 0), cy - 9 * k);
      else t.capsula(cx - (lado ? 1 * k : 0), cy - 10 * k, cx - (lado ? 1 * k : 0), cy - 13 * k, 1.4 * k, 1 * k, K.ouro);
      break;
    }
    case "elmoAberto":
    case "elmoChifres":
    case "elmoPluma": {
      t.elipse(cx + (lado ? -1 * k : 0), cy - 4.4 * k, 10.8 * k, 7.4 * k, K.metal, 0, (x, y) => y < cy - 4.4 * k);
      t.capsula(cx - 10.4 * k, cy - 4.4 * k, cx - 10.6 * k, cy + 2 * k, 1.4 * k, 1.1 * k, K.metal);
      if (!lado) t.capsula(cx + 10.4 * k, cy - 4.4 * k, cx + 10.6 * k, cy + 2 * k, 1.4 * k, 1.1 * k, K.metal);
      t.capsula(cx - 10.6 * k, cy - 4.6 * k, cx + 10.6 * k, cy - 4.6 * k, 0.9 * k, 0.9 * k, K.ouro);
      if (!costas) t.capsula(cx + (lado ? 8 * k : 0), cy - 4.4 * k, cx + (lado ? 8 * k : 0), cy - 1.6 * k, 0.7 * k, 0.5 * k, K.metal);
      if (ap.cabeca === "elmoChifres") {
        for (const sx of lado ? [-1] : [-1, 1]) {
          t.capsula(cx + sx * 9 * k, cy - 6 * k, cx + sx * 14 * k, cy - 9 * k, 2 * k, 1.4 * k, K.chifre);
          t.capsula(cx + sx * 14 * k, cy - 9 * k, cx + sx * 15 * k, cy - 14 * k, 1.4 * k, 0.5 * k, K.chifre);
        }
      }
      if (ap.cabeca === "elmoPluma") plumar(cx, cy - 10 * k);
      break;
    }
    case "bandana":
      t.capsula(cx - 10.4 * k, cy - 4.6 * k, cx + 10.4 * k, cy - 4.6 * k, 1.6 * k, 1.6 * k, K.r2);
      t.capsula(cx + (lado ? -10 * k : 9 * k), cy - 4 * k, cx + (lado ? -14 * k : 13 * k), cy + (1 + v) * k, 1.2 * k, 0.8 * k, K.r2);
      break;
    case "capuz": {
      const capuzM = l.classe === "patrulheiro" || l.classe === "ladino" ? K.capa : K.r1;
      t.elipse(cx + (lado ? -1 * k : 0), cy - 0.6 * k, 11.6 * k, 11 * k, capuzM, 0, (x, y) => {
        if (costas) return true;
        const fx = lado ? cx + 4 * k : cx;
        const u = (x + 0.5 - fx) / (lado ? 7 * k : 7.6 * k);
        const w = (y + 0.5 - (cy + 2.2 * k)) / (8.4 * k);
        return u * u + w * w > 1;
      });
      // sombra do capuz na testa
      if (!costas) for (let x = cx - 7 * k; x <= cx + 7 * k; x++) t.tonalizar(x, cy - 5.6 * k, -1);
      if (costas) t.poli([cx - 4 * k, cy + 8 * k, cx + 4 * k, cy + 8 * k, cx, cy + 14 * k], capuzM);
      break;
    }
    case "mascara":
      if (!costas) {
        const x0 = lado ? cx + 1 * k : cx - 8.6 * k;
        t.poli([x0, cy + 2.6 * k, cx + (lado ? 11 : 8.6) * k, cy + 2.6 * k, cx + (lado ? 9 : 7) * k, cy + 10 * k, cx, cy + 11 * k, x0 + 1 * k, cy + 9 * k], K.r1, "cil");
      }
      t.capsula(cx - 10 * k, cy - 4 * k, cx + 10 * k, cy - 4 * k, 1.4 * k, 1.4 * k, K.r1);
      break;
    case "chapeuPontudo": {
      const by = cy - 6 * k;
      t.elipse(cx + (lado ? -1 * k : 0), by, 15 * k, 3.6 * k, K.r1, 0.1);
      const tipX = cx + (lado ? -7 : 6) * k + v * 0.5 * k;
      t.poli([cx - 8 * k, by, cx + 8 * k, by, cx + 3 * k, by - 11 * k, tipX, by - 17 * k, cx - 1 * k, by - 12 * k], K.r1);
      t.capsula(cx - 8.4 * k, by - 1.2 * k, cx + 8.4 * k, by - 1.2 * k, 1.2 * k, 1.2 * k, K.faixa);
      t.px(cx, by - 1.4 * k, K.ouro, 4);
      break;
    }
    case "diadema":
      t.capsula(cx - 9.6 * k, cy - 4.6 * k, cx + 9.6 * k, cy - 4.6 * k, 0.8 * k, 0.8 * k, K.ouro);
      if (!costas) t.elipse(cx + (lado ? 7 * k : 0), cy - 4.8 * k, 1.4 * k, 1.6 * k, K.cristal, 0.2);
      break;
    case "coroaFolhas":
      for (let i = -4; i <= 4; i++) t.elipse(cx + i * 2.5 * k, cy - 6 * k + Math.abs(i) * 0.6 * k, 1.8 * k, 1.1 * k, K.folha);
      break;
    case "galhada":
      for (const sx of lado ? [-1] : [-1, 1]) {
        t.capsula(cx + sx * 5 * k, cy - 8 * k, cx + sx * 9 * k, cy - 17 * k, 1.1 * k, 0.8 * k, K.madeira);
        t.capsula(cx + sx * 7 * k, cy - 12 * k, cx + sx * 12 * k, cy - 14 * k, 0.8 * k, 0.6 * k, K.madeira);
        t.capsula(cx + sx * 8.4 * k, cy - 15 * k, cx + sx * 6 * k, cy - 19 * k, 0.8 * k, 0.5 * k, K.madeira);
      }
      for (let i = -3; i <= 3; i++) t.elipse(cx + i * 3 * k, cy - 6.6 * k, 1.5 * k, 1 * k, K.folha);
      break;
    case "boina":
      t.elipse(cx - 2 * k, cy - 7 * k, 11.4 * k, 4 * k, K.r2, 0.2);
      t.elipse(cx - 1 * k, cy - 9 * k, 7 * k, 3 * k, K.r2, 0.3);
      t.capsula(cx + 5 * k, cy - 9 * k, cx + 12 * k, cy - 16 * k + v * k, 1.4 * k, 0.6 * k, K.pluma);
      break;
    default:
      break;
  }
};

// ─────────────────────────── corpo ───────────────────────────
const desenharCorpo = (t: Tela, l: Lutador, p: Pose, dir: Dir, expr: Expr, rasgado: boolean, coroa: boolean) => {
  const ap = l.aparencia;
  const c = proporcoes(l);
  const lado = dir === "E";
  const costas = dir === "N";
  const cx = 24;
  const pe = 61;
  const quadril = pe - c.perna + Math.max(0, p.bob);
  const pesc = quadril - c.tronco;
  const ox = lado ? p.inclina : 0; // inclinação do tronco
  const cabCY = pesc - c.cabH / 2 + 3 + Math.min(0, p.bob) + (p.bob > 0 ? 0 : 0);
  const longo = ap.torso === "manto" || ap.torso === "mantoClaro";
  const ombroW = lado ? c.ombro * 0.6 : c.ombro;
  const quadrilW = lado ? c.quadril * 0.75 : c.quadril;
  const v = p.vento % 4 < 2 ? 0 : 1;

  // material do tronco e das mangas
  let mTronco = K.r1;
  let mManga = K.r1;
  switch (ap.torso) {
    case "placas":
      mTronco = K.metal;
      mManga = K.metal;
      break;
    case "malha":
      mTronco = K.malha;
      mManga = K.malha;
      break;
    case "peitoNu":
      mTronco = K.pele;
      mManga = K.pele;
      break;
    case "coleteCouro":
      mTronco = K.pele;
      mManga = K.pele;
      break;
    case "couro":
      mTronco = K.couro;
      mManga = l.classe === "patrulheiro" ? K.r2 : K.couro;
      break;
    case "couroEscuro":
      mTronco = K.r1;
      mManga = K.r1;
      break;
    default:
      break;
  }
  const mCalca = ap.torso === "placas" ? K.metal : ap.torso === "gi" ? K.r1 : l.classe === "barbaro" ? K.couro : K.r2;

  // ── capa e itens das costas (atrás) ──
  const capaTras = () => {
    if (!(ap.capa || ap.capaCurta)) return;
    const fim = ap.capaCurta ? quadril + 4 : pe - 3;
    const mCapa = K.capa;
    if (lado) {
      t.poli([cx - 2 + ox, pesc + 1, cx - 6 + ox - v, pesc + 3, cx - 11 - v * 2, fim, cx - 3, fim - 1, cx + ox, pesc + 4], mCapa);
    } else if (!costas) {
      t.poli([cx - ombroW / 2, pesc + 1, cx + ombroW / 2, pesc + 1, cx + ombroW / 2 + 4 + v, fim, cx - ombroW / 2 - 4 - v, fim], mCapa, "cil", -0.25);
    }
  };
  const aljavaTras = () => {
    if (!ap.aljava) return;
    if (lado) {
      t.capsula(cx - 7 + ox, pesc - 2, cx - 3 + ox, quadril - 2, 2.4, 2.4, K.couro);
      for (let i = 0; i < 3; i++) t.linha(cx - 7 + ox + i, pesc - 2, cx - 8 + ox + i, pesc - 6, K.pluma, 2 + (i % 2));
    } else if (!costas) {
      for (let i = 0; i < 3; i++) t.linha(cx + 6 + i, pesc - 1, cx + 7 + i, pesc - 5, K.pluma, 2 + (i % 2));
    }
  };
  const cauda = () => {
    if (l.especie !== "tiefling" && l.especie !== "draconato") return;
    const m = K.pele;
    if (lado) t.capsula(cx - 3, quadril, cx - 13 - v, pe - 4, 2, 1, m);
    else if (costas) t.capsula(cx, quadril, cx + 6 + v, pe - 2, 2.2, 1, m);
    else t.capsula(cx + 3, quadril, cx + 12 + v, pe - 3, 2, 0.8, m);
    if (l.especie === "tiefling") {
      const tx = lado ? cx - 13 - v : costas ? cx + 6 + v : cx + 12 + v;
      t.poli([tx - 2, pe - 4, tx + 2, pe - 4, tx, pe - 7], m, "plano");
    }
  };

  // ── pernas ──
  const perna = (sx: number, off: [number, number], tras: boolean) => {
    const hx = cx + sx * (lado ? 1 : quadrilW / 4);
    const fx = hx + off[0] + (lado ? 0 : sx * 1);
    const fy = pe - 2 + off[1];
    const extra = tras ? -0.3 : 0;
    if (!longo) t.capsula(hx, quadril, fx, fy - 4, 3, 2.4, mCalca, extra);
    const descalco = l.classe === "monge";
    if (descalco) {
      t.capsula(fx, fy - 5, fx, fy - 1, 2, 2, K.linho, extra);
      t.elipse(fx + (lado ? 1.5 : 0), fy, 2.6, 1.6, K.pele, extra);
    } else {
      t.capsula(fx, fy - 5, fx, fy - 1, 2.5, 2.5, ap.torso === "placas" ? K.metal : K.bota, extra);
      t.elipse(fx + (lado ? 1.5 : 0), fy, 3, 1.8, ap.torso === "placas" ? K.metal : K.bota, extra);
    }
  };

  // ── braços ──
  const braco = (sx: number, mao: [number, number], tras: boolean) => {
    const sxp = lado ? cx + ox + (tras ? -2 : 1) : cx + sx * (ombroW / 2 - 1);
    const syp = pesc + 3;
    const hx = lado ? cx + ox + mao[0] : cx + sx * (ombroW / 2) + mao[0] * (sx < 0 ? 1 : -1) * -1;
    const hy = pesc + mao[1];
    const extra = tras ? -0.35 : 0;
    const mx = (sxp + hx) / 2 + (lado ? -1 : sx * 1);
    const my = (syp + hy) / 2 + 1;
    t.capsula(sxp, syp, mx, my, 2.6, 2.3, mManga, extra);
    const ante = ap.torso === "gi" || ap.torso === "peitoNu" || ap.torso === "coleteCouro" ? K.pele : mManga;
    t.capsula(mx, my, hx, hy, 2.3, 2, ante, extra);
    if (l.classe === "monge" || l.classe === "barbaro") t.capsula(mx + (hx - mx) * 0.5, my + (hy - my) * 0.5, hx, hy, 2.2, 2, K.linho, extra);
    const luva = ap.torso === "placas" || (ap.torso === "malha" && l.classe !== "clerigo") ? K.metal : l.classe === "patrulheiro" || l.classe === "ladino" ? K.couro : K.pele;
    t.elipse(hx, hy, 2, 2, luva, extra);
    return [hx, hy] as [number, number];
  };

  // ── tronco ──
  const tronco = () => {
    const sy = pesc + 1;
    const ws = ombroW / 2;
    const wq = quadrilW / 2;
    const fim = longo ? pe - 2 : ap.torso === "tunica" || ap.torso === "gi" ? quadril + 4 : quadril + 2;
    const abre = longo ? 5 : ap.torso === "tunica" ? 2 : 1;
    const x0 = cx + ox;
    t.poli([x0 - ws, sy, x0 + ws, sy, x0 + wq + 1, quadril - 3, cx + wq + abre, fim, cx - wq - abre, fim, x0 - wq - 1, quadril - 3], mTronco, "cil");
    if (ap.torso === "peitoNu" || ap.torso === "coleteCouro") {
      // calça até a cintura
      t.poli([cx - wq - 1, quadril - 2, cx + wq + 1, quadril - 2, cx + wq + 1, quadril + 2, cx - wq - 1, quadril + 2], mCalca, "cil");
    }
    if (costas) {
      if (ap.capa || ap.capaCurta) {
        const fimC = ap.capaCurta ? quadril + 4 : pe - 3;
        t.poli([cx - ws - 1, sy, cx + ws + 1, sy, cx + ws + 3 + v, fimC, cx - ws - 3 - v, fimC], K.capa, "cil");
        for (const dx of [-3, 2]) t.linha(cx + dx, sy + 6, cx + dx + v, fimC - 1, K.capa, 1);
      }
      if (ap.aljava) {
        t.capsula(cx + 5, pesc - 2, cx - 2, quadril - 1, 2.6, 2.6, K.couro);
        for (let i = 0; i < 3; i++) t.linha(cx + 5 + i, pesc - 2, cx + 6 + i, pesc - 7, K.pluma, 2 + (i % 2));
      }
      return;
    }
    // detalhes da frente
    switch (ap.torso) {
      case "placas":
        t.linha(x0, sy + 1, x0, quadril - 3, K.metal, 4);
        t.linha(x0 - ws + 2, sy + 7, x0 + ws - 2, sy + 7, K.metal, 1);
        t.linha(x0 - wq, quadril - 4, x0 + wq, quadril - 4, K.metal, 1);
        break;
      case "peitoNu":
        t.px(x0 - 3, sy + 5, K.pele, 1);
        t.px(x0 - 2, sy + 6, K.pele, 1);
        t.px(x0 + 2, sy + 6, K.pele, 1);
        t.px(x0 + 3, sy + 5, K.pele, 1);
        t.px(x0 - 1, sy + 9, K.pele, 1);
        t.px(x0 + 1, sy + 9, K.pele, 1);
        t.px(x0 - 1, sy + 11, K.pele, 1);
        t.px(x0 + 1, sy + 11, K.pele, 1);
        t.linha(x0 - 4, sy + 3, x0 + 1, sy + 10, K.blush, 1);
        if (ap.pintura) {
          t.linha(x0 - ws + 2, sy + 3, x0 - 2, sy + 3, K.pintura, 2);
          t.linha(x0 + 2, sy + 3, x0 + ws - 2, sy + 3, K.pintura, 2);
        }
        break;
      case "coleteCouro":
        t.poli([x0 - ws, sy, x0 - 2, sy, x0 - 2, quadril - 1, x0 - wq - 1, quadril - 1], K.couro, "cil");
        t.poli([x0 + 2, sy, x0 + ws, sy, x0 + wq + 1, quadril - 1, x0 + 2, quadril - 1], K.couro, "cil");
        for (let y = sy + 2; y < quadril - 2; y += 2) {
          t.px(x0 - 3, y, K.couro, 4);
          t.px(x0 + 3, y, K.couro, 4);
        }
        break;
      case "couro":
      case "couroEscuro":
        t.linha(x0 - ws + 1, sy + 1, x0 + ws - 2, quadril - 3, K.couro, 0);
        t.linha(x0 - ws + 2, sy + 1, x0 + ws - 1, quadril - 3, K.couro, 1);
        t.px(x0, (sy + quadril) / 2 - 1, K.ouro, 4);
        for (let y = sy + 2; y < quadril - 1; y += 2) t.px(x0 + ws - 2, y, mTronco, 4);
        break;
      case "gi":
        t.poli([x0 - 3, sy, x0 + 3, sy, x0, sy + 7], K.pele, "plano");
        t.linha(x0 - 3, sy, x0 + 1, sy + 7, K.r1, 3);
        break;
      case "manto":
      case "mantoClaro":
        if (ap.torso === "manto") t.poli([x0 - 1.5, sy + 1, x0 + 1.5, sy + 1, cx + 2, pe - 2, cx - 2, pe - 2], K.faixa, "cil");
        else {
          t.elipse(x0, sy + 6, 2.4, 2.4, K.ouro);
          t.px(x0, sy + 6, K.ouro, 4);
        }
        for (const dx of [-wq + 1, wq - 2]) t.linha(cx + dx, quadril + 2, cx + dx * 1.3, pe - 3, mTronco, 1);
        t.capsula(x0 - ws + 2, sy, x0 + ws - 2, sy, 1.2, 1.2, K.r2);
        break;
      case "tunica":
        t.capsula(x0 - 3, sy, x0 + 3, sy, 1, 1, K.r2);
        t.linha(x0, sy + 1, x0, sy + 5, K.r2, 1);
        for (const dx of [-3, 2]) t.linha(cx + dx, quadril + 1, cx + dx, quadril + 3, K.r1, 1);
        break;
      case "malha":
        break;
    }
    if (ap.tabardo) {
      const tw = Math.max(3, ws - 3);
      t.poli([x0 - tw, sy + 2, x0 + tw, sy + 2, x0 + tw - 1, quadril + 6, x0 - tw + 1, quadril + 6], K.r1, "cil");
      // brasão
      if (l.classe === "paladino" || l.classe === "clerigo") {
        t.linha(x0, sy + 4, x0, sy + 9, K.ouro, 3);
        t.linha(x0 - 2, sy + 6, x0 + 2, sy + 6, K.ouro, 3);
      } else {
        t.elipse(x0, sy + 6, 2, 2, K.r2);
      }
      t.linha(x0 - tw, quadril + 6, x0 + tw - 1, quadril + 6, K.ouro, 2);
    }
    // cinto
    if (!longo || ap.torso === "manto") {
      const cy = ap.torso === "gi" ? quadril - 2 : quadril - 1;
      const cm = ap.torso === "gi" ? K.faixa : K.couro;
      t.poli([cx - wq - 1, cy - 1, cx + wq + 1, cy - 1, cx + wq + 1, cy + 1, cx - wq - 1, cy + 1], cm, "cil");
      if (ap.torso === "gi") {
        t.capsula(cx + 2, cy, cx + 3 + v, cy + 6, 1, 0.8, K.faixa);
        t.capsula(cx + 1, cy, cx + 1, cy + 5, 1, 0.8, K.faixa);
      } else {
        t.px(cx + (lado ? 3 : 0), cy, K.ouro, 4);
        t.px(cx + (lado ? 3 : 0), cy - 1, K.ouro, 3);
      }
    }
    // alça da aljava atravessando o peito
    if (ap.aljava && !lado) t.linha(cx - ws + 2, quadril - 3, cx + ws - 1, sy, K.couro, 0);
    // rasgos e ferimentos
    if (rasgado) {
      const s = hash(l.nome, "rasgo");
      for (let i = 0; i < 6; i++) {
        const rx = Math.round(x0 - ws + 2 + ((s >> (i * 3)) % Math.max(1, ws * 2 - 3)));
        const ry = Math.round(sy + 2 + ((s >> (i * 4 + 1)) % Math.max(1, quadril - sy - 2)));
        const m = t.get(rx, ry);
        if (m === K.r1 || m === K.r2 || m === K.couro || m === K.capa) {
          t.px(rx, ry, K.pele, 1);
          t.px(rx + 1, ry + 1, K.pele, 2);
          t.px(rx, ry + 1, K.sangue, 1);
        } else if (m === K.metal || m === K.malha) {
          t.px(rx, ry, m, 0);
          t.px(rx + 1, ry, m, 0);
        } else if (m === K.pele) {
          t.linha(rx, ry, rx + 2, ry + 2, K.sangue, 2);
        }
      }
    }
  };

  // ── ordem de desenho ──
  const pernaFrenteA = lado ? p.pernaA : p.pernaA;
  if (costas) {
    // arma nas costas fica atrás: desenhada primeiro
    const mao = braco(1, p.maoF, true);
    if (ap.arma !== "alaude" && ap.arma !== "punhos") desenharArma(t, l, mao[0], mao[1], p.arma, p.magia, dir);
    if (ap.escudo !== "nenhum") escudo(t, l, cx - ombroW / 2 - 1, pesc + 8, dir);
    cauda();
    perna(-1, p.pernaA, false);
    perna(1, p.pernaB, false);
    tronco();
    braco(-1, p.maoT, false);
    if (ap.pelePeles) pele(t, cx, pesc, ombroW, lado);
    if (ap.ombreiras) ombreiras(t, cx, pesc, ombroW, lado, ox);
    cabeca(t, l, cx, cabCY, { k: 1, dir, expr, rasgado, coroa, vento: p.vento });
    orbe(t, l, cx, pesc, p, dir);
    return;
  }

  capaTras();
  aljavaTras();
  cauda();
  if (lado) {
    // perna de trás, braço de trás, tronco, perna da frente, cabeça, braço da frente + arma
    perna(1, p.pernaB, true);
    const maoT = braco(-1, p.maoT, true);
    if (ap.escudo !== "nenhum") escudo(t, l, maoT[0] + 4, maoT[1] - 2, dir);
    perna(-1, pernaFrenteA, false);
    tronco();
    if (ap.pelePeles) pele(t, cx + ox, pesc, ombroW, lado);
    if (ap.ombreiras) ombreiras(t, cx, pesc, ombroW, lado, ox);
    cabeca(t, l, cx + ox + 1, cabCY, { k: 1, dir, expr, rasgado, coroa, vento: p.vento });
    const arco = ap.arma === "arcoLongo" || ap.arma === "arcoCurto";
    const mao = braco(1, p.maoF, false);
    if (ap.arma === "alaude") desenharArma(t, l, cx + ox + 3, pesc + 9, 0, 0, dir);
    else desenharArma(t, l, mao[0], mao[1], p.arma, p.magia, dir);
    if (arco) cordaArco(t, l, mao[0], mao[1], Math.max(0, mao[0] - (cx + ox + p.maoT[0])), dir);
    if (ap.escudo !== "nenhum") escudo(t, l, cx + ox + 6, pesc + 9, dir);
  } else {
    perna(-1, p.pernaA, false);
    perna(1, p.pernaB, false);
    tronco();
    if (ap.pelePeles) pele(t, cx, pesc, ombroW, lado);
    const maoT = braco(1, p.maoT, false);
    const maoF = braco(-1, p.maoF, false);
    if (ap.ombreiras) ombreiras(t, cx, pesc, ombroW, lado, 0);
    cabeca(t, l, cx, cabCY, { k: 1, dir, expr, rasgado, coroa, vento: p.vento });
    if (ap.arma === "alaude") desenharArma(t, l, cx + 2, pesc + 9, 0, 0, dir);
    else desenharArma(t, l, maoF[0], maoF[1], p.arma, p.magia, dir);
    if (ap.arma === "arcoLongo" || ap.arma === "arcoCurto") cordaArco(t, l, maoF[0], maoF[1], 0, dir);
    if (ap.escudo !== "nenhum") escudo(t, l, maoT[0] + 1, maoT[1] - 3, dir);
  }
  orbe(t, l, cx, pesc, p, dir);
  // brilho de magia nas mãos
  if (p.magia > 0.5 && ap.arma !== "cajado") {
    const hx = lado ? cx + ox + p.maoF[0] : cx - ombroW / 2 - p.maoF[0];
    const hy = pesc + p.maoF[1];
    t.elipse(hx + (lado ? 2 : 0), hy - 1, 1.5 + p.magia, 1.5 + p.magia, K.cristal, 0.3);
  }
};

const escudo = (t: Tela, l: Lutador, x: number, y: number, dir: Dir) => {
  const ap = l.aparencia;
  const lado = dir === "E";
  if (ap.escudo === "madeira") {
    t.elipse(x, y, lado ? 3 : 5.5, 6, K.madeira, 0.1);
    t.elipse(x, y, lado ? 1 : 1.6, 1.6, K.metal);
    t.linha(x - (lado ? 2 : 5), y, x + (lado ? 2 : 5), y, K.madeira, 0);
    return;
  }
  const w = lado ? 3 : 6;
  t.poli([x - w, y - 6, x + w, y - 6, x + w, y + 1, x, y + 7, x - w, y + 1], K.metal, "cil", 0.1);
  if (!lado && dir !== "N") {
    t.poli([x - w + 1.5, y - 4.5, x + w - 1.5, y - 4.5, x + w - 1.5, y + 0.5, x, y + 5, x - w + 1.5, y + 0.5], K.r1, "cil");
    t.linha(x, y - 4, x, y + 3, K.ouro, 3);
    t.linha(x - 2, y - 2, x + 2, y - 2, K.ouro, 3);
  } else if (lado) t.linha(x + 1, y - 5, x + 1, y + 5, K.r1, 2);
};

const ombreiras = (t: Tela, cx: number, pesc: number, ombroW: number, lado: boolean, ox: number) => {
  if (lado) {
    t.elipse(cx + ox, pesc + 3, 4, 3.4, K.metal);
    t.linha(cx + ox - 3, pesc + 4, cx + ox + 3, pesc + 4, K.metal, 1);
    return;
  }
  for (const sx of [-1, 1]) {
    t.elipse(cx + sx * (ombroW / 2), pesc + 3, 4.2, 3.4, K.metal);
    t.linha(cx + sx * (ombroW / 2) - 3, pesc + 4, cx + sx * (ombroW / 2) + 3, pesc + 4, K.metal, 1);
  }
};

const pele = (t: Tela, cx: number, pesc: number, ombroW: number, lado: boolean) => {
  const w = lado ? ombroW / 2 + 3 : ombroW / 2 + 4;
  for (let i = -w; i <= w; i += 2) {
    const len = 3 + ((i * 7) & 3);
    t.capsula(cx + i, pesc, cx + i * 1.1, pesc + len, 1.8, 1, K.pelo);
  }
};

const orbe = (t: Tela, l: Lutador, cx: number, pesc: number, p: Pose, dir: Dir) => {
  if (!l.aparencia.orbe) return;
  const flut = p.vento % 4 < 2 ? 0 : -1;
  const x = dir === "E" ? cx - 12 : dir === "N" ? cx - 13 : cx + 14;
  const y = pesc - 3 + flut - p.magia * 3;
  t.elipse(x, y, 3 + p.magia * 0.8, 3 + p.magia * 0.8, K.orbe, 0.25);
};

// ─────────────────────────── API ───────────────────────────
export type Quadro = { anim: Anim; f: number; dir: Dir; expr: Expr; rasgado: boolean };

const cacheMats = new Map<number, Material[]>();
const matsDe = (l: Lutador) => {
  let m = cacheMats.get(l.id * 1000 + l.nivel);
  if (!m) {
    m = materiais(l);
    cacheMats.set(l.id * 1000 + l.nivel, m);
  }
  return m;
};

const girar = (src: Pintura, quadrantes: number, meio: boolean): Pintura => {
  // gira em volta dos pés (deitado para trás = sentido anti-horário visto de frente)
  const { w, h } = src;
  const out = new Uint8ClampedArray(w * h * 4);
  const ang = meio ? -PI / 4 : -PI / 2 * quadrantes;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const px0 = w / 2;
  const py0 = h - 3;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // destino → origem
      const dx = x + 0.5 - px0 - (meio ? 4 : 10);
      const dy = y + 0.5 - py0;
      const sx = Math.floor(c * dx + s * dy + px0);
      const sy = Math.floor(-s * dx + c * dy + py0);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const i = (y * w + x) * 4;
      const j = (sy * w + sx) * 4;
      out[i] = src.rgba[j];
      out[i + 1] = src.rgba[j + 1];
      out[i + 2] = src.rgba[j + 2];
      out[i + 3] = src.rgba[j + 3];
    }
  return { w, h, rgba: out };
};

const espelharPintura = (src: Pintura): Pintura => {
  const { w, h } = src;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const j = (y * w + (w - 1 - x)) * 4;
      out[i] = src.rgba[j];
      out[i + 1] = src.rgba[j + 1];
      out[i + 2] = src.rgba[j + 2];
      out[i + 3] = src.rgba[j + 3];
    }
  return { w, h, rgba: out };
};

/** um quadro do sprite 48×64 */
export const gerarSprite = (l: Lutador, q: Quadro, coroa = false): Pintura => {
  const t = new Tela(SPR_W, SPR_H);
  const dir = q.dir === "W" ? "E" : q.dir;
  const p = poseDe(l, q.anim, q.f, dir);
  desenharCorpo(t, l, p, dir, q.expr, q.rasgado, coroa);
  let out = pintar(t, matsDe(l), hash(l.nome) % 97);
  if (p.queda) out = girar(out, 1, p.queda === 1);
  if (q.dir === "W") out = espelharPintura(out);
  return out;
};

/** retrato 96×64 (cut-in e pergaminho) */
export const gerarRetrato = (l: Lutador, expr: Expr, coroa = false): Pintura => {
  const t = new Tela(96, 64);
  const k = 3;
  const cx = 48;
  const cy = 37;
  // ombros e pescoço
  const ap = l.aparencia;
  const mOmbro = ap.torso === "placas" ? K.metal : ap.torso === "malha" ? K.malha : ap.torso === "peitoNu" || ap.torso === "coleteCouro" ? K.pele : ap.torso === "couro" ? K.couro : K.r1;
  t.elipse(cx, cy + 40, 34, 16, ap.capa ? K.capa : mOmbro);
  t.elipse(cx, cy + 40, 26, 14, mOmbro);
  if (ap.ombreiras) {
    t.elipse(cx - 26, cy + 30, 10, 7, K.metal);
    t.elipse(cx + 26, cy + 30, 10, 7, K.metal);
  }
  if (ap.pelePeles) for (let i = -30; i <= 30; i += 4) t.capsula(cx + i, cy + 24, cx + i * 1.1, cy + 32 + ((i * 7) & 7), 3.4, 1.6, K.pelo);
  t.capsula(cx, cy + 14, cx, cy + 26, 6, 7, K.pele, -0.35);
  cabeca(t, l, cx, cy, { k, dir: "S", expr, rasgado: expr === "pvBaixo", coroa, vento: 0 });
  return pintar(t, matsDe(l), hash(l.nome) % 97, { rim: true });
};

/** retrato 16×16 do HUD (recorte do rosto do sprite de frente) */
export const gerarMini = (l: Lutador, expr: Expr, coroa = false): Pintura => {
  const s = gerarSprite(l, { anim: "idle", f: 0, dir: "S", expr, rasgado: expr === "pvBaixo" }, coroa);
  const c = proporcoes(l);
  const quadril = 61 - c.perna;
  const pesc = quadril - c.tronco;
  const cy = Math.round(pesc - c.cabH / 2 + 3);
  const x0 = 16;
  const y0 = cy - 8;
  const out = new Uint8ClampedArray(16 * 16 * 4);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const sx = x0 + x;
      const sy = y0 + y;
      if (sy < 0 || sy >= SPR_H) continue;
      const i = (y * 16 + x) * 4;
      const j = (sy * SPR_W + sx) * 4;
      for (let k = 0; k < 4; k++) out[i + k] = s.rgba[j + k];
    }
  return { w: 16, h: 16, rgba: out };
};

export const corClasse = (l: Lutador): RGB => hex(l.aparencia.roupa1);
export { VAZIO };
