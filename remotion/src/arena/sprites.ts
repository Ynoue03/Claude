// Sprites chibi 24×32 desenhados pixel a pixel a partir dos dados do lutador (cores + penteado).
// Cada quadro vira um canvas pequeno (com contorno de 1 px → 26×34) guardado em cache.
import { brilho, CONTORNO, mistura, sombra, tom } from "./cores";
import { PENTEADOS } from "./penteados";
import type { Lutador, Visual } from "./tipos";

export type Pose = "parado" | "passo1" | "passo2" | "ataque" | "dano" | "vitoria";
export const SW = 26;
export const SH = 34;

type Px = (string | null)[];

class Grade {
  px: Px = new Array(SW * SH).fill(null);
  set(x: number, y: number, c: string | undefined | null) {
    if (!c) return;
    const X = x + 1;
    const Y = y + 1;
    if (X < 0 || Y < 0 || X >= SW || Y >= SH) return;
    this.px[Y * SW + X] = c;
  }
  rect(x0: number, y0: number, x1: number, y1: number, c: string | undefined | null) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }
  pts(lista: [number, number][], c: string | undefined | null) {
    for (const [x, y] of lista) this.set(x, y, c);
  }
}

const OVAL: [number, number, number][] = [
  [5, 7, 16],
  [6, 6, 17],
  ...[7, 8, 9, 10, 11, 12, 13, 14, 15].map((y) => [y, 5, 18] as [number, number, number]),
  [16, 6, 17],
  [17, 7, 16],
];

const cor = (v: Visual, c: string | undefined) => (c === "pele" ? v.pele : c);

// "pele" vale em qualquer campo de cor (personagens sem camisa, mangas curtas…)
export const resolverVisual = (v: Visual): Visual => {
  const r = { ...v } as Record<string, unknown>;
  for (const [k, val] of Object.entries(r)) if (val === "pele" && k !== "pele") r[k] = v.pele;
  return r as Visual;
};

// ── pernas ──────────────────────────────────────────────
const pernas = (g: Grade, v: Visual, dir: string, pose: Pose) => {
  const calca = v.calca;
  const perna = v.shorts ? v.pele : calca;
  const sap = v.sapato;
  if (dir === "lado") {
    g.rect(9, 26, 14, 27, calca);
    if (pose === "passo1" || pose === "passo2") {
      const [fx, tx] = pose === "passo1" ? [12, 8] : [8, 12];
      g.rect(fx, 28, fx + 2, 29, perna);
      g.rect(fx, 30, fx + 3, 31, sap);
      g.rect(tx, 28, tx + 2, 28, perna);
      g.rect(tx - 1, 29, tx + 2, 30, tom(sap, -0.2));
    } else {
      g.rect(10, 28, 13, 29, perna);
      g.rect(10, 30, 14, 31, sap);
    }
    return;
  }
  g.rect(8, 26, 15, 27, calca);
  const esq = (lev: boolean) => {
    if (lev) {
      g.rect(8, 28, 10, 28, perna);
      g.rect(7, 29, 10, 30, sap);
    } else {
      g.rect(8, 28, 10, 29, perna);
      g.rect(7, 30, 10, 31, sap);
    }
  };
  const dirp = (lev: boolean) => {
    if (lev) {
      g.rect(13, 28, 15, 28, perna);
      g.rect(13, 29, 16, 30, sap);
    } else {
      g.rect(13, 28, 15, 29, perna);
      g.rect(13, 30, 16, 31, sap);
    }
  };
  esq(pose === "passo1");
  dirp(pose === "passo2");
  if (v.shorts) {
    g.rect(8, 27, 10, 27, tom(calca, 0.25));
    g.rect(13, 27, 15, 27, tom(calca, 0.25));
  }
};

// ── tronco e braços ─────────────────────────────────────
const tronco = (g: Grade, v: Visual, dir: string, pose: Pose) => {
  const roupa = v.roupa;
  const manga = cor(v, v.mangas) ?? roupa;
  const mao = v.luvas ?? v.pele;
  const lado = dir === "lado";
  const x0 = lado ? 9 : 8;
  const x1 = lado ? 14 : 15;
  g.rect(x0, 18, x1, 25, roupa);
  if (!lado) g.rect(7, 18, 16, 18, v.ombros ?? roupa);
  else if (v.ombros) g.rect(9, 18, 14, 18, v.ombros);

  // padrão do tecido (sobre a roupa)
  if (v.padrao === "xadrez" && v.padraoCor) {
    for (let y = 18; y <= 25; y++)
      for (let x = x0; x <= x1; x++) if (((x >> 1) + (y >> 1)) % 2 === 0) g.set(x, y, v.padraoCor);
  }
  if (v.padrao === "triangulos" && v.padraoCor) {
    for (let x = x0; x <= x1; x++) {
      if (x % 4 !== 3) g.set(x, 25, v.padraoCor);
      if (x % 4 === 1) g.set(x, 24, v.padraoCor);
    }
  }
  if (v.padrao === "escamas" && v.padraoCor) {
    for (let y = 19; y <= 25; y++)
      for (let x = x0; x <= x1; x++) if ((x * 2 + y) % 5 === 0) g.set(x, y, v.padraoCor);
  }
  if (dir === "baixo") {
    if (v.centro) g.rect(10, 18, 13, 23, cor(v, v.centro));
    if (v.decote) {
      g.rect(10, 18, 13, 18, cor(v, v.decote));
      g.rect(11, 19, 12, 20, cor(v, v.decote));
    }
    if (v.padrao === "x" && v.padraoCor) {
      for (let i = 0; i < 6; i++) {
        g.set(9 + i, 19 + i, v.padraoCor);
        g.set(14 - i, 19 + i, v.padraoCor);
      }
    }
  }
  if (lado && v.centro) g.rect(13, 18, 14, 23, cor(v, v.centro));
  if (dir === "baixo") g.rect(10, 18, 13, 18, sombra(v.decote ?? v.centro ?? roupa, 0.3));
  if (lado && v.decote) g.rect(13, 18, 14, 19, cor(v, v.decote));
  if (v.cinto) g.rect(x0, 24, x1, 24, v.cinto);
  g.rect(x0, 25, x1, 25, v.calca);

  // braços
  if (lado) {
    if (pose === "ataque") {
      g.rect(12, 19, 18, 20, manga);
      g.rect(19, 18, 21, 21, mao);
    } else if (pose === "vitoria") {
      g.rect(11, 12, 12, 19, manga);
      g.rect(11, 10, 12, 11, mao);
    } else {
      const sw = pose === "passo1" ? 1 : pose === "passo2" ? -1 : 0;
      const ax = pose === "dano" ? 9 : 11 + sw;
      g.rect(ax, 19, ax + 1, 23, manga);
      g.rect(ax, 24, ax + 1, 25, mao);
    }
    return;
  }
  if (pose === "vitoria") {
    g.rect(5, 12, 6, 18, manga);
    g.rect(17, 12, 18, 18, manga);
    g.rect(5, 10, 6, 11, mao);
    g.rect(17, 10, 18, 11, mao);
  } else if (pose === "ataque" && dir === "baixo") {
    g.rect(6, 19, 7, 21, manga);
    g.rect(16, 19, 17, 21, manga);
    g.rect(8, 21, 15, 21, manga);
    g.rect(10, 20, 13, 22, mao);
  } else if (pose === "dano") {
    g.rect(5, 19, 6, 22, manga);
    g.rect(17, 19, 18, 22, manga);
    g.rect(4, 23, 5, 24, mao);
    g.rect(18, 23, 19, 24, mao);
  } else {
    const sw = pose === "passo1" ? 1 : pose === "passo2" ? -1 : 0;
    g.rect(6, 19, 7, 23 + sw, manga);
    g.rect(16, 19, 17, 23 - sw, manga);
    g.rect(6, 24 + sw, 7, 25 + sw, mao);
    g.rect(16, 24 - sw, 17, 25 - sw, mao);
    if (pose === "ataque") {
      // costas: braços abertos para frente (some atrás)
      g.rect(6, 19, 7, 21, manga);
    }
  }
};

// ── cabeça ──────────────────────────────────────────────
const cabeca = (g: Grade, v: Visual, dir: string, pose: Pose) => {
  const masc = v.mascara ?? PENTEADOS[v.penteado] ?? PENTEADOS.curto;
  const cab = v.cabelo;
  const cab2 = v.cabelo2 ?? tom(cab, -0.25);
  const acc = v.acessorios ?? [];
  const pele = v.pele;
  const escuro = tom(pele, -0.45);
  for (const [y, a, b] of OVAL) g.rect(a, y, b, y, dir === "cima" ? cab : pele);
  if (dir === "lado") {
    for (const [y, a, b] of OVAL) g.rect(a, y, Math.min(b, 10), y, cab);
    g.rect(10, 12, 10, 13, tom(pele, -0.1));
  }
  if (dir === "baixo") {
    if (acc.includes("cicatriz-queimadura")) g.rect(13, 9, 17, 14, "#B5583E");
    const olho = (x: number, c: string) => {
      if (pose === "dano") return;
      if (pose === "vitoria") {
        g.pts([[x - 1, 12], [x, 11], [x + 1, 11], [x + 2, 12]], CONTORNO);
        return;
      }
      g.rect(x, 11, x + 1, 11, CONTORNO);
      g.rect(x, 12, x + 1, 13, c);
      g.set(x + 1, 12, "#FFFFFF");
      g.set(x, 13, tom(c, -0.35));
    };
    olho(8, v.olhos);
    olho(14, v.olhos2 ?? v.olhos);
    if (pose === "dano") {
      g.pts([[8, 11], [9, 12], [8, 13], [15, 11], [14, 12], [15, 13]], CONTORNO);
      g.rect(11, 15, 12, 16, "#5A1A22");
    } else if (pose === "vitoria" || pose === "ataque") {
      g.rect(10, 15, 13, 15, "#5A1A22");
      g.rect(11, 16, 12, 16, "#D84A5A");
    } else {
      g.rect(11, 15, 12, 15, tom(pele, -0.35));
    }
    if (acc.includes("bigodes"))
      g.pts([[6, 14], [7, 14], [6, 16], [7, 16], [16, 14], [17, 14], [16, 16], [17, 16]], escuro);
    if (acc.includes("sardas")) g.pts([[7, 14], [9, 15], [14, 15], [16, 14]], tom(pele, -0.3));
    if (acc.includes("cicatriz-olho")) g.pts([[14, 14], [15, 14]], "#8A2A2A");
    if (acc.includes("cicatriz-testa")) g.pts([[14, 9], [15, 9], [15, 10], [16, 10]], "#A03028");
    if (acc.includes("olheiras")) g.pts([[8, 14], [9, 14], [14, 14], [15, 14]], tom(pele, -0.4));
    if (acc.includes("tatuagem")) g.pts([[7, 14], [8, 14], [9, 15], [14, 15], [15, 14], [16, 14]], "#2A1A22");
    if (acc.includes("estrela-lagrima")) {
      g.pts([[7, 14], [7, 15]], "#3A8CF0");
      g.pts([[16, 13], [15, 14], [16, 14], [17, 14], [16, 15]], "#E83A8A");
    }
    if (acc.includes("sobrancelhas")) {
      g.rect(7, 10, 10, 10, "#14141A");
      g.rect(13, 10, 16, 10, "#14141A");
    }
    if (acc.includes("sobrancelhas-curvas")) g.pts([[8, 10], [9, 10], [10, 9]], tom(v.cabelo, -0.3));
    if (acc.includes("tapa-olho")) {
      g.rect(7, 11, 10, 13, "#14141A");
      g.pts([[6, 10], [5, 9], [11, 10], [12, 9]], "#14141A");
    }
  }
  if (dir === "lado") {
    if (pose !== "dano") {
      g.rect(14, 11, 15, 11, CONTORNO);
      g.rect(14, 12, 15, 13, v.olhos);
      g.set(15, 12, "#FFFFFF");
    } else g.pts([[14, 11], [15, 12], [14, 13]], CONTORNO);
    g.rect(16, 15, 17, 15, pose === "ataque" ? "#5A1A22" : tom(pele, -0.35));
    if (acc.includes("bigodes")) g.pts([[15, 14], [16, 14], [15, 16], [16, 16]], escuro);
  }
  // penteado
  const mapa: Record<string, string | undefined> = {
    "#": cab,
    "-": tom(cab, -0.22),
    "+": cab2,
    o: v.acessorioCor ?? "#2E4FA0",
    r: v.acessorioCor2 ?? "#C8202A",
    m: "#B8BEC8",
    w: "#FFFFFF",
    k: v.acessorioCor ?? "#141418",
    p: pele,
  };
  masc.forEach((linha, y) => {
    [...linha].forEach((ch, x) => {
      if (ch === "." || ch === " ") return;
      if (dir === "lado" && ch === "k" && x < 9) return;
      g.set(x, y, mapa[ch]);
    });
  });
  if (acc.includes("mascara-boca")) {
    const c = v.acessorioCor2 ?? "#1E2A44";
    if (dir === "baixo") g.rect(6, 14, 17, 17, c);
    if (dir === "lado") g.rect(11, 14, 18, 17, c);
  }
  if (acc.includes("kanji-testa") && dir === "baixo") g.pts([[14, 9], [15, 9], [14, 10], [16, 10]], "#C8302A");
  if (acc.includes("serra")) {
    g.rect(11, 0, 12, 5, "#B8BEC8");
    for (let y = 0; y <= 5; y += 2) {
      g.set(10, y, "#5A5E68");
      g.set(13, y + 1, "#5A5E68");
    }
  }
  // brilho do cabelo (2 px no topo)
  if (dir !== "cima") {
    const topo = masc.findIndex((l) => l.includes("#"));
    if (topo >= 0) {
      const l = masc[Math.min(topo + 3, masc.length - 1)];
      const i = l.indexOf("#");
      if (i >= 0) g.pts([[i + 2, topo + 3], [i + 3, topo + 3]], tom(cab, 0.35));
    }
  }
  // orelhas e brincos
  if (dir === "baixo") {
    if (acc.includes("brincos")) g.rect(19, 13, 19, 15, v.acessorioCor ?? "#E8C040");
    if (acc.includes("brincos-hanafuda")) {
      for (const x of [4, 19]) {
        g.set(x, 14, v.acessorioCor ?? "#FFFFFF");
        g.set(x, 15, v.acessorioCor2 ?? "#D02828");
        g.set(x, 16, v.acessorioCor ?? "#FFFFFF");
      }
    }
  }
};

// ── acessórios grandes ──────────────────────────────────
const espadaGrande = (g: Grade, dir: string) => {
  const x = dir === "lado" ? 5 : 18;
  g.rect(x, 3, x + 2, 19, "#1E1E26");
  g.rect(x + 2, 3, x + 2, 19, "#C8CCD8");
  g.rect(x, 20, x + 1, 23, "#E8E8EC");
};

const katanas = (g: Grade, v: Visual, dir: string) => {
  const acc = v.acessorios ?? [];
  const lista: string[] = [];
  if (acc.includes("katana")) lista.push("#2A2A30");
  if (acc.includes("tres-katanas")) lista.push("#F0F0F0", "#1E1E24", "#B0283A");
  lista.forEach((c, i) => {
    if (dir === "lado") {
      g.pts([[8, 22 - i], [7, 21 - i], [6, 20 - i]], c);
    } else {
      const ox = dir === "cima" ? -10 : 0;
      g.pts([[16 + ox, 23 - i], [17 + ox, 22 - i], [18 + ox, 21 - i], [19 + ox, 20 - i]], c);
      g.set(16 + ox, 24 - i, "#C8A040");
    }
  });
};

const manoplas = (g: Grade, v: Visual, dir: string, pose: Pose) => {
  const c = v.acessorioCor ?? "#8A8E98";
  const c2 = v.acessorioCor2 ?? "#F07A1A";
  const bloco = (x: number, y: number) => {
    g.rect(x, y, x + 3, y + 4, c);
    g.rect(x, y + 2, x + 3, y + 2, c2);
    g.rect(x + 1, y - 1, x + 2, y - 1, tom(c, 0.3));
  };
  if (dir === "lado") {
    if (pose === "ataque") bloco(18, 17);
    else if (pose !== "vitoria") bloco(10, 21);
    return;
  }
  if (pose === "vitoria") {
    bloco(4, 8);
    bloco(16, 8);
  } else if (pose === "ataque" && dir === "baixo") bloco(10, 19);
  else {
    bloco(4, 21);
    bloco(16, 21);
  }
};

const capa = (g: Grade, v: Visual, dir: string) => {
  if (!v.capa) return;
  const c = v.capa;
  const chamas = v.padrao === "chamas" && v.padraoCor;
  const [x0, x1] = dir === "lado" ? [5, 10] : dir === "cima" ? [6, 17] : [5, 18];
  g.rect(x0, 18, x1, 29, c);
  g.rect(x0, 18, x0, 29, sombra(c, 0.25));
  if (chamas) {
    for (let x = x0; x <= x1; x++) {
      const h = x % 3 === 0 ? 4 : x % 3 === 1 ? 2 : 3;
      g.rect(x, 30 - h, x, 29, v.padraoCor);
      if (h === 4) g.set(x, 26, "#FFD040");
    }
  }
};

const cachecol = (g: Grade, v: Visual, dir: string) => {
  if (!(v.acessorios ?? []).includes("cachecol")) return;
  const c = v.acessorioCor ?? "#C8302A";
  if (dir === "lado") {
    g.rect(9, 17, 14, 19, c);
    g.rect(7, 19, 8, 22, c);
  } else {
    g.rect(7, 17, 16, 19, c);
    g.rect(7, 17, 16, 17, brilho(c, 0.2));
    if (dir === "baixo") g.rect(14, 20, 15, 23, c);
    else g.rect(9, 20, 10, 24, c);
  }
};

// ── montagem ────────────────────────────────────────────
const montar = (v0: Visual, dir: string, pose: Pose): Grade => {
  const v = resolverVisual(v0);
  const g = new Grade();
  const acc = v.acessorios ?? [];
  const grande = acc.includes("espada-grande");
  if (dir !== "cima") capa(g, v, dir);
  if (grande && dir !== "cima") espadaGrande(g, dir);
  if (dir === "lado") katanas(g, v, dir);
  pernas(g, v, dir, pose);
  tronco(g, v, dir, pose);
  if (dir === "cima") capa(g, v, dir);
  cachecol(g, v, dir);
  cabeca(g, v, dir, pose);
  if (grande && dir === "cima") espadaGrande(g, dir);
  if (dir !== "lado") katanas(g, v, dir);
  if (acc.includes("manoplas")) manoplas(g, v, dir, pose);
  // braço da frente por cima de tudo no ataque de lado
  if (dir === "lado" && pose === "ataque") {
    g.rect(12, 19, 18, 20, cor(v, v.mangas) ?? v.roupa);
    if (!acc.includes("manoplas")) g.rect(19, 18, 21, 21, v.luvas ?? v.pele);
  }
  return g;
};

// Acabamento: sombra com hue shifting no lado de baixo/direita da silhueta, luz quente no topo/esquerda
// e contorno seletivo ("sel-out"): escuro embaixo, colorido em cima — volume sem "pillow shading".
const acabamento = (px: Px): Px => {
  const out = px.slice();
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= SW || y >= SH ? null : px[y * SW + x];
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const c = px[y * SW + x];
      if (!c) continue;
      if (!at(x + 1, y) || !at(x, y + 1)) out[y * SW + x] = sombra(c, 0.22);
      else if (!at(x - 1, y) || !at(x, y - 1)) out[y * SW + x] = brilho(c, 0.16);
    }
  const fim = out.slice();
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      if (out[y * SW + x]) continue;
      const viz = at(x, y + 1) ?? at(x + 1, y) ?? at(x - 1, y) ?? at(x, y - 1);
      if (!viz) continue;
      const ladoClaro = !!(at(x, y + 1) || at(x + 1, y));
      fim[y * SW + x] = ladoClaro ? mistura(viz, CONTORNO, 0.68) : CONTORNO;
    }
  return fim;
};

const novoCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

const paraCanvas = (px: Px, espelhar: boolean, branco: boolean) => {
  const c = novoCanvas(SW, SH);
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const p = px[y * SW + x];
      if (!p) continue;
      ctx.fillStyle = branco ? (p === CONTORNO ? "#FFFFFF" : "#FFFFFF") : p;
      ctx.fillRect(espelhar ? SW - 1 - x : x, y, 1, 1);
    }
  return c;
};

const cache = new Map<string, HTMLCanvasElement>();
const grades = new Map<string, Px>();

// dir: 0 baixo · 1 cima · 2 esquerda · 3 direita
export const sprite = (l: Lutador, dir: number, pose: Pose, branco = false) => {
  const chave = `${l.id}|${dir}|${pose}|${branco}`;
  const c = cache.get(chave);
  if (c) return c;
  const d = dir === 0 ? "baixo" : dir === 1 ? "cima" : "lado";
  const gk = `${l.id}|${d}|${pose}|${JSON.stringify(l.visual)}`;
  let px = grades.get(gk);
  if (!px) {
    px = acabamento(montar(l.visual, d, pose).px);
    grades.set(gk, px);
  }
  const canvas = paraCanvas(px, dir === 2, branco);
  cache.set(chave, canvas);
  return canvas;
};

// derrotado: sprite de dano deitado (90°)
export const spriteCaido = (l: Lutador) => {
  const chave = `${l.id}|caido`;
  const c = cache.get(chave);
  if (c) return c;
  const base = sprite(l, 0, "dano");
  const out = novoCanvas(SH, SW);
  const ctx = out.getContext("2d")!;
  ctx.translate(SH, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(base, 0, 0);
  cache.set(chave, out);
  return out;
};
