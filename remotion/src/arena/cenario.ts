// Calabouço de pedra (top-down estilo GBA/SNES): fundo estático + luz das tochas + detalhes animados.
import { Rng, hash3 } from "./rng.ts";
import { novoCanvas } from "./pixel.ts";
import {
  fundoFloresta,
  desenharLanternas,
  desenharVidaFloresta,
} from "./floresta.ts";

export type Arena = "calabouco" | "floresta";
// luz ambiente fora das poças de luz: penumbra azul-esverdeada (calabouço) / entardecer na mata (floresta)
export const AMBIENTE: Record<Arena, [number, number, number]> = {
  calabouco: [46, 66, 82],
  floresta: [86, 112, 110],
};

export const W = 360,
  H = 640;
export const PAREDE_TOPO = 182; // fim da face da parede de cima
export const PAREDE_BASE = 534;
export const PAREDE_LADO = 26;
export const ALTAR = { x: 180, y: 352 };

export type Tocha = {
  x: number;
  y: number;
  tipo: "parede" | "braseiro" | "lateral";
};
export const TOCHAS: Tocha[] = [
  { x: 66, y: 160, tipo: "parede" },
  { x: 142, y: 160, tipo: "parede" },
  { x: 218, y: 160, tipo: "parede" },
  { x: 294, y: 160, tipo: "parede" },
  { x: 16, y: 292, tipo: "lateral" },
  { x: 16, y: 432, tipo: "lateral" },
  { x: 344, y: 292, tipo: "lateral" },
  { x: 344, y: 432, tipo: "lateral" },
  { x: 40, y: 524, tipo: "braseiro" },
  { x: 320, y: 524, tipo: "braseiro" },
];
export const POCAS = [
  { x: 92, y: 236, rx: 13, ry: 5 },
  { x: 282, y: 454, rx: 15, ry: 6 },
  { x: 250, y: 228, rx: 9, ry: 4 },
  { x: 76, y: 400, rx: 10, ry: 4 },
];

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const esc = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

const cacheFundo = new Map<string, HTMLCanvasElement>();

export const fundo = (
  arena: Arena = "calabouco",
  comAltar = true,
): HTMLCanvasElement => {
  if (arena === "floresta") return fundoFloresta(comAltar);
  const chave = comAltar ? "altar" : "livre";
  const c0 = cacheFundo.get(chave);
  if (c0) return c0;
  const rng = new Rng("calabouco-arena-d20");
  const img = new ImageData(W, H);
  const d = img.data;
  const set = (x: number, y: number, c: RGB, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    d[i] = d[i] * (1 - a) + c[0] * a;
    d[i + 1] = d[i + 1] * (1 - a) + c[1] * a;
    d[i + 2] = d[i + 2] * (1 - a) + c[2] * a;
    d[i + 3] = 255;
  };
  const get = (x: number, y: number): RGB => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
  const rect = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    c: RGB,
    a = 1,
  ) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) set(x, y, c, a);
  };
  const elip = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    c: RGB | ((nx: number, ny: number) => RGB),
    a = 1,
  ) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx,
          ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1)
          set(x, y, typeof c === "function" ? c(nx, ny) : c, a);
      }
  };

  // paleta do calabouço (menos saturada e mais escura que os personagens)
  const PEDRA: RGB = [104, 104, 112];
  const JUNTA: RGB = [34, 34, 42];
  const MUSGO: RGB = [70, 92, 54];
  const PAREDE: RGB = [78, 76, 86];
  const PAREDE_TOP: RGB = [52, 50, 60];

  // ── chão de lajotas irregulares ──
  rect(0, 0, W - 1, H - 1, JUNTA);
  let y = PAREDE_TOPO - 6;
  while (y < PAREDE_BASE + 4) {
    const hRow = rng.int(11, 16);
    let x = PAREDE_LADO - rng.int(0, 14);
    while (x < W - PAREDE_LADO + 8) {
      const wSt = rng.int(13, 26);
      const base = esc(PEDRA, 0.86 + rng.next() * 0.22);
      const tint =
        rng.next() < 0.3
          ? mix(base, [96, 100, 118], 0.4)
          : rng.next() < 0.2
            ? mix(base, [118, 108, 96], 0.3)
            : base;
      for (let yy = y + 1; yy < y + hRow; yy++)
        for (let xx = x + 1; xx < x + wSt; xx++) {
          // canto arredondado + bisel: borda de cima/esquerda clara, de baixo/direita escura
          const cantos =
            (xx === x + 1 || xx === x + wSt - 1) &&
            (yy === y + 1 || yy === y + hRow - 1);
          if (cantos) continue;
          let c = tint;
          if (yy === y + 1 || xx === x + 1) c = esc(tint, 1.14);
          else if (yy === y + hRow - 1 || xx === x + wSt - 1)
            c = esc(tint, 0.74);
          const n = hash3(xx, yy, 3);
          if (n < 0.08) c = esc(c, 0.9);
          else if (n > 0.95) c = esc(c, 1.07);
          set(xx, yy, c);
        }
      // musgo nas juntas
      if (rng.next() < 0.35) {
        const mx = x + rng.int(2, wSt - 2);
        for (let k = 0; k < rng.int(2, 6); k++)
          set(
            mx + k - 2,
            y + (k % 2),
            mix(MUSGO, [90, 120, 60], rng.next() * 0.4),
          );
      }
      // rachaduras
      if (rng.next() < 0.18) {
        let cx = x + rng.int(3, wSt - 3),
          cy = y + 2;
        for (let k = 0; k < hRow - 3; k++) {
          set(cx, cy, esc(tint, 0.5));
          if (rng.next() < 0.4) set(cx + 1, cy, esc(tint, 1.1));
          cy++;
          cx += rng.int(-1, 1);
        }
      }
      x += wSt;
    }
    y += hRow;
  }

  // manchas de sangue antigo
  for (let i = 0; i < 9; i++) {
    const cx = rng.int(50, 310),
      cy = rng.int(210, 510);
    if (Math.hypot(cx - 180, cy - 352) < 80) continue;
    for (let k = 0; k < 14; k++)
      elip(
        cx + rng.int(-5, 5),
        cy + rng.int(-3, 3),
        rng.int(1, 3),
        rng.int(1, 2),
        [86, 34, 38],
        0.35,
      );
  }

  if (comAltar) {
    // ── tablado em pirâmide de degraus (3 níveis) com runas ──
    const niveis = [
      { w: 136, h: 86, face: 6 },
      { w: 102, h: 64, face: 6 },
      { w: 70, h: 44, face: 5 },
    ];
    niveis.forEach((n, i) => {
      const x0 = ALTAR.x - n.w / 2,
        y0 = ALTAR.y - n.h / 2 - i * 4;
      const topo: RGB = esc([112, 112, 124], 1 + i * 0.05);
      // tampo em blocos
      for (let yy = y0; yy < y0 + n.h; yy++)
        for (let xx = x0; xx < x0 + n.w; xx++) {
          const bx = Math.floor(
              (xx - x0 + (Math.floor((yy - y0) / 10) % 2) * 9) / 18,
            ),
            by = Math.floor((yy - y0) / 10);
          let c = esc(topo, 0.94 + hash3(bx, by, i) * 0.1);
          if (
            (xx - x0 + (Math.floor((yy - y0) / 10) % 2) * 9) % 18 === 0 ||
            (yy - y0) % 10 === 0
          )
            c = esc(c, 0.7);
          if (yy === y0 || xx === x0) c = esc(topo, 1.2);
          if (xx === x0 + n.w - 1) c = esc(c, 0.75);
          set(xx, yy, c);
        }
      // face (degrau) virada para baixo
      for (let yy = y0 + n.h; yy < y0 + n.h + n.face; yy++)
        for (let xx = x0; xx < x0 + n.w; xx++) {
          let c = esc(
            [84, 82, 96],
            yy === y0 + n.h ? 1.15 : 1 - (yy - y0 - n.h) * 0.04,
          );
          if ((xx - x0) % 12 === 0) c = esc(c, 0.7);
          set(xx, yy, c);
        }
      // runas gravadas na face (brilho azul é animado depois)
      for (let k = 6; k < n.w - 6; k += 9) {
        const rx = x0 + k,
          ry = y0 + n.h + 1;
        const tipo = Math.floor(hash3(k, i, 11) * 4);
        const g: RGB = [40, 56, 84];
        if (tipo === 0) {
          set(rx, ry, g);
          set(rx, ry + 1, g);
          set(rx, ry + 2, g);
          set(rx + 1, ry, g);
        } else if (tipo === 1) {
          set(rx, ry, g);
          set(rx + 1, ry + 1, g);
          set(rx + 2, ry, g);
          set(rx + 1, ry + 2, g);
        } else if (tipo === 2) {
          set(rx, ry + 2, g);
          set(rx + 1, ry + 1, g);
          set(rx + 2, ry + 2, g);
          set(rx + 1, ry, g);
        } else {
          set(rx, ry, g);
          set(rx + 2, ry, g);
          set(rx + 1, ry + 1, g);
          set(rx + 1, ry + 2, g);
        }
      }
    });

    // ── altar central: pedra em forma de d20 (icosaedro) ──
    {
      const cx = ALTAR.x,
        cy = ALTAR.y - 12;
      const R = 13;
      const hex: [number, number][] = [];
      for (let k = 0; k < 6; k++)
        hex.push([
          cx + Math.cos(-Math.PI / 2 + (k * Math.PI) / 3) * R,
          cy + Math.sin(-Math.PI / 2 + (k * Math.PI) / 3) * R,
        ]);
      // sombra no chão
      elip(cx + 3, ALTAR.y + 2, 15, 5, [20, 20, 28], 0.55);
      // base
      rect(cx - 8, ALTAR.y - 4, cx + 8, ALTAR.y + 1, [70, 70, 82]);
      rect(cx - 8, ALTAR.y - 4, cx + 8, ALTAR.y - 4, [100, 100, 114]);
      const tri = (
        a: [number, number],
        b: [number, number],
        c: [number, number],
        cor: RGB,
      ) => {
        const x0 = Math.floor(Math.min(a[0], b[0], c[0])),
          x1 = Math.ceil(Math.max(a[0], b[0], c[0]));
        const y0 = Math.floor(Math.min(a[1], b[1], c[1])),
          y1 = Math.ceil(Math.max(a[1], b[1], c[1]));
        for (let yy = y0; yy <= y1; yy++)
          for (let xx = x0; xx <= x1; xx++) {
            const X = xx + 0.5,
              Y = yy + 0.5;
            const s1 = (b[0] - a[0]) * (Y - a[1]) - (b[1] - a[1]) * (X - a[0]);
            const s2 = (c[0] - b[0]) * (Y - b[1]) - (c[1] - b[1]) * (X - b[0]);
            const s3 = (a[0] - c[0]) * (Y - c[1]) - (a[1] - c[1]) * (X - c[0]);
            if (
              (s1 >= 0 && s2 >= 0 && s3 >= 0) ||
              (s1 <= 0 && s2 <= 0 && s3 <= 0)
            )
              set(xx, yy, cor);
          }
      };
      const c0: [number, number] = [cx, cy + 1];
      const inner: [number, number][] = [0, 1, 2].map((k) => [
        cx +
          Math.cos(-Math.PI / 2 + (k * 2 * Math.PI) / 3 + Math.PI / 3) *
            R *
            0.55,
        cy +
          1 +
          Math.sin(-Math.PI / 2 + (k * 2 * Math.PI) / 3 + Math.PI / 3) *
            R *
            0.55,
      ]);
      const tons: RGB[] = [
        [150, 150, 166],
        [120, 120, 136],
        [96, 96, 112],
        [74, 74, 90],
        [86, 86, 102],
        [134, 134, 150],
      ];
      for (let k = 0; k < 6; k++) tri(hex[k], hex[(k + 1) % 6], c0, tons[k]);
      // triângulo central de face (onde fica o 20)
      tri(inner[0], inner[1], inner[2], [128, 128, 144]);
      for (let k = 0; k < 6; k++) {
        const a = hex[k],
          b = hex[(k + 1) % 6];
        for (let t = 0; t <= 1; t += 0.05)
          set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, [44, 44, 56]);
      }
      for (let k = 0; k < 3; k++) {
        const a = inner[k],
          b = inner[(k + 1) % 3];
        for (let t = 0; t <= 1; t += 0.08)
          set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, [70, 70, 86]);
        const hv = hex[(k * 2 + 1) % 6];
        for (let t = 0; t <= 1; t += 0.1)
          set(
            a[0] + (hv[0] - a[0]) * t,
            a[1] + (hv[1] - a[1]) * t,
            [80, 80, 96],
          );
      }
      // "20" gravado
      const dig = ["###.###", "..#.#.#", "###.#.#", "#...#.#", "###.###"];
      dig.forEach((row, ry) =>
        [...row].forEach(
          (ch, rx) => ch === "#" && set(cx - 3 + rx, cy - 1 + ry, [40, 52, 82]),
        ),
      );
    }
  }

  // ── detalhes espalhados ──
  // poças d'água (refletem o fogo; o brilho é animado no render)
  for (const p of POCAS) {
    elip(p.x, p.y, p.rx + 1, p.ry + 1, [30, 34, 44], 0.7);
    elip(p.x, p.y, p.rx, p.ry, (nx, ny) =>
      ny < -0.4 ? [52, 64, 84] : [38, 46, 62],
    );
    for (let k = -p.rx + 3; k < p.rx - 3; k += 3)
      set(p.x + k, p.y - 1, [80, 96, 120], 0.6);
  }
  // ossos
  const osso = (x: number, yy: number, ang: number) => {
    const c: RGB = [196, 186, 162];
    for (let t = -4; t <= 4; t++)
      set(x + Math.cos(ang) * t, yy + Math.sin(ang) * t, c);
    for (const s of [-1, 1]) {
      set(x + Math.cos(ang) * 5 * s, yy + Math.sin(ang) * 5 * s - 1, c);
      set(x + Math.cos(ang) * 5 * s, yy + Math.sin(ang) * 5 * s + 1, c);
    }
  };
  osso(60, 214, 0.3);
  osso(300, 498, -0.5);
  osso(110, 508, 1.2);
  osso(276, 214, 2.4);
  osso(318, 370, 0.9);
  // crânio
  const cranio = (x: number, yy: number, c: RGB = [200, 190, 166]) => {
    elip(x, yy, 3, 2.6, c);
    rect(x - 2, yy + 2, x + 2, yy + 3, esc(c, 0.85));
    set(x - 1, yy, [30, 26, 30]);
    set(x + 1, yy, [30, 26, 30]);
    set(x, yy + 3, [60, 54, 56]);
  };
  cranio(48, 470);
  cranio(312, 236);
  // barris e caixotes quebrados nos cantos
  const barril = (x: number, yy: number) => {
    elip(x, yy, 7, 5, (nx, ny) =>
      ny < -0.2 ? [140, 98, 60] : nx > 0.3 ? [90, 60, 40] : [118, 82, 50],
    );
    elip(x, yy, 5, 3.5, [70, 46, 32]);
    elip(x, yy, 7, 5, [60, 60, 66], 0);
    for (let k = -6; k <= 6; k++)
      set(x + k, yy - 2 + Math.round(Math.abs(k) * 0.2), [72, 72, 80], 0.8);
  };
  const caixote = (x: number, yy: number, quebrado: boolean) => {
    rect(x - 7, yy - 6, x + 7, yy + 6, [124, 88, 54]);
    rect(x - 7, yy - 6, x + 7, yy - 6, [156, 114, 72]);
    rect(x - 7, yy + 6, x + 7, yy + 6, [70, 48, 32]);
    for (let k = -6; k <= 6; k++) {
      set(x + k, yy + k * 0.85, [84, 58, 38]);
      set(x + k, yy - 2 - k * 0, [104, 72, 46], 0.4);
    }
    if (quebrado) {
      rect(x + 2, yy - 6, x + 7, yy - 1, JUNTA);
      set(x + 3, yy - 1, [124, 88, 54]);
      set(x + 9, yy + 4, [124, 88, 54]);
      set(x + 10, yy + 5, [124, 88, 54]);
    }
  };
  barril(40, 196);
  barril(54, 202);
  caixote(320, 198, true);
  barril(320, 512);
  caixote(42, 498, true);
  // teias de aranha nos cantos
  const teia = (x: number, yy: number, sx: number, sy: number) => {
    const c: RGB = [190, 196, 204];
    for (let k = 0; k < 4; k++) {
      const ang = (k / 3) * (Math.PI / 2);
      for (let t = 0; t < 14; t++)
        set(x + Math.cos(ang) * t * sx, yy + Math.sin(ang) * t * sy, c, 0.35);
    }
    for (const r of [5, 9, 13])
      for (let a = 0; a <= Math.PI / 2; a += 0.08)
        set(x + Math.cos(a) * r * sx, yy + Math.sin(a) * r * sy, c, 0.25);
  };
  teia(PAREDE_LADO, PAREDE_TOPO, 1, 1);
  teia(W - PAREDE_LADO - 1, PAREDE_TOPO, -1, 1);
  teia(PAREDE_LADO, PAREDE_BASE - 1, 1, -1);
  teia(W - PAREDE_LADO - 1, PAREDE_BASE - 1, -1, -1);

  // ── paredes ──
  // topo das paredes (vistas de cima)
  const blocos = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    bw: number,
    bh: number,
    cor: RGB,
  ) => {
    for (let yy = y0; yy <= y1; yy++)
      for (let xx = x0; xx <= x1; xx++) {
        const row = Math.floor((yy - y0) / bh);
        const off = (row % 2) * Math.floor(bw / 2);
        const bx = Math.floor((xx - x0 + off) / bw);
        let c = esc(cor, 0.9 + hash3(bx, row, 21) * 0.18);
        if ((xx - x0 + off) % bw === 0 || (yy - y0) % bh === 0)
          c = esc(cor, 0.55);
        else if ((yy - y0) % bh === 1 || (xx - x0 + off) % bw === 1)
          c = esc(c, 1.12);
        set(xx, yy, c);
      }
  };
  blocos(0, 0, W - 1, 140, 20, 10, PAREDE_TOP);
  blocos(0, PAREDE_BASE, W - 1, H - 1, 20, 10, PAREDE_TOP);
  blocos(0, 140, PAREDE_LADO - 1, PAREDE_BASE, 13, 11, PAREDE_TOP);
  blocos(W - PAREDE_LADO, 140, W - 1, PAREDE_BASE, 13, 11, PAREDE_TOP);
  // borda interna das paredes laterais e da base (degrau de sombra)
  for (let yy = 140; yy < PAREDE_BASE + 2; yy++) {
    set(PAREDE_LADO, yy, [20, 20, 26]);
    set(PAREDE_LADO + 1, yy, [30, 30, 38], 0.6);
    set(W - PAREDE_LADO - 1, yy, [20, 20, 26]);
    set(W - PAREDE_LADO - 2, yy, [30, 30, 38], 0.6);
  }
  for (let xx = 0; xx < W; xx++) {
    set(xx, PAREDE_BASE, [20, 20, 26]);
    set(xx, PAREDE_BASE - 1, [26, 26, 32], 0.7);
    set(xx, PAREDE_BASE + 1, [86, 84, 96]);
  }
  // face da parede de cima (aparece embaixo do topo)
  blocos(PAREDE_LADO, 140, W - PAREDE_LADO - 1, PAREDE_TOPO - 1, 16, 8, PAREDE);
  for (let xx = PAREDE_LADO; xx < W - PAREDE_LADO; xx++) {
    set(xx, 140, [110, 108, 120]);
    set(xx, PAREDE_TOPO - 1, [36, 34, 42]);
    set(xx, PAREDE_TOPO, [26, 26, 32], 0.8);
    set(xx, PAREDE_TOPO + 1, [26, 26, 32], 0.4);
  }
  // arcos com portões de ferro (grade levadiça)
  for (const ax of [104, 256]) {
    const aw = 30,
      top = 146;
    for (let yy = top; yy < PAREDE_TOPO; yy++)
      for (let xx = ax - aw / 2; xx <= ax + aw / 2; xx++) {
        const dx = (xx - ax) / (aw / 2),
          dy = (yy - (top + aw / 2)) / (aw / 2);
        if (yy < top + aw / 2 && dx * dx + dy * dy > 1) continue;
        set(xx, yy, [14, 12, 18]);
      }
    // aduelas do arco
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.04) {
      set(
        ax + Math.cos(a) * (aw / 2 + 1),
        top + aw / 2 + Math.sin(a) * (aw / 2 + 1),
        [128, 124, 136],
      );
      set(
        ax + Math.cos(a) * (aw / 2 + 2),
        top + aw / 2 + Math.sin(a) * (aw / 2 + 2),
        [92, 90, 100],
      );
    }
    // grade
    for (let xx = ax - 12; xx <= ax + 12; xx += 4)
      for (let yy = top + 2; yy < PAREDE_TOPO; yy++) {
        const dx = (xx - ax) / (aw / 2),
          dy = (yy - (top + aw / 2)) / (aw / 2);
        if (yy < top + aw / 2 && dx * dx + dy * dy > 0.9) continue;
        set(xx, yy, [58, 58, 66]);
        set(xx + 1, yy, [34, 34, 40]);
      }
    for (let yy = top + 8; yy < PAREDE_TOPO; yy += 7)
      for (let xx = ax - 13; xx <= ax + 13; xx++) {
        const dx = (xx - ax) / (aw / 2),
          dy = (yy - (top + aw / 2)) / (aw / 2);
        if (yy < top + aw / 2 && dx * dx + dy * dy > 0.9) continue;
        set(xx, yy, [70, 70, 80]);
      }
    for (let xx = ax - 12; xx <= ax + 12; xx += 4)
      set(xx, PAREDE_TOPO - 2, [90, 90, 100]);
  }
  // nichos com crânios
  for (const nx of [36, 180, 324]) {
    rect(nx - 6, 150, nx + 6, 164, [20, 18, 24]);
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.1)
      set(nx + Math.cos(a) * 6, 150 + Math.sin(a) * 4, [20, 18, 24]);
    rect(nx - 7, 165, nx + 7, 166, [110, 108, 120]);
    cranio(nx, 159, [176, 168, 146]);
  }
  // correntes penduradas
  for (const cx of [72, 128, 232, 288]) {
    for (let yy = 142; yy < 176; yy++) {
      const elo = Math.floor((yy - 142) / 3);
      if (elo % 2 === 0) {
        set(cx, yy, [96, 96, 104]);
        set(cx + 1, yy, [60, 60, 68]);
      } else {
        set(cx - 1, yy, [80, 80, 90]);
        set(cx + 2, yy, [50, 50, 58]);
      }
    }
    set(cx, 176, [120, 120, 128]);
  }
  // estandartes rasgados
  for (const [bx, cor] of [
    [158, [120, 34, 40]],
    [202, [40, 54, 110]],
  ] as [number, RGB][]) {
    for (let yy = 141; yy < 178; yy++)
      for (let xx = bx - 7; xx <= bx + 7; xx++) {
        const rasgo = yy > 168 && hash3(xx, 77) < 0.5 + (yy - 168) * 0.06;
        if (rasgo) continue;
        let c = cor;
        if (xx === bx - 7) c = esc(cor, 1.2);
        if (xx === bx + 7) c = esc(cor, 0.6);
        if ((xx - bx) % 5 === 0) c = esc(c, 0.82);
        set(xx, yy, c);
      }
    rect(bx - 8, 141, bx + 8, 142, [150, 120, 50]);
    // emblema: d20 estilizado
    for (let k = -3; k <= 3; k++) {
      set(bx + k, 152 - (3 - Math.abs(k)), [200, 170, 80]);
      set(bx + k, 152 + (3 - Math.abs(k)), [200, 170, 80]);
    }
    set(bx, 152, [200, 170, 80]);
  }

  const c = novoCanvas(W, H);
  c.getContext("2d")!.putImageData(img, 0, 0);
  void get;
  cacheFundo.set(chave, c);
  return c;
};

// ───────────── luz ─────────────
export type Luz = {
  x: number;
  y: number;
  r: number;
  cor: [number, number, number];
  i: number;
};

let luzCanvas: HTMLCanvasElement | null = null;
export const luzesTochas = (f: number): Luz[] =>
  TOCHAS.map((t, i) => {
    const fl =
      1 +
      0.07 * Math.sin(f * 0.53 + i * 1.7) +
      0.05 * Math.sin(f * 1.37 + i * 3.1) +
      (hash3(Math.floor(f / 2), i) - 0.5) * 0.06;
    const y = t.tipo === "parede" ? t.y + 18 : t.y;
    return {
      x: t.x + (t.tipo === "lateral" ? (t.x < 180 ? 14 : -14) : 0),
      y,
      r: (t.tipo === "braseiro" ? 70 : 74) * fl,
      cor: [255, 170, 90],
      i: 0.9 * fl,
    };
  });

// multiplica o fundo pela luz (penumbra azul-esverdeada fora das poças de luz)
export const aplicarLuz = (
  ctx: CanvasRenderingContext2D,
  luzes: Luz[],
  ambiente: [number, number, number] = [46, 66, 82],
) => {
  if (!luzCanvas) luzCanvas = novoCanvas(W, H);
  const lc = luzCanvas.getContext("2d")!;
  lc.globalCompositeOperation = "source-over";
  lc.fillStyle = `rgb(${ambiente.join(",")})`;
  lc.fillRect(0, 0, W, H);
  lc.globalCompositeOperation = "lighter";
  for (const l of luzes) {
    const g = lc.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    const [r, gg, b] = l.cor;
    g.addColorStop(0, `rgba(${r},${gg},${b},${l.i})`);
    g.addColorStop(0.35, `rgba(${r},${gg},${b},${l.i * 0.6})`);
    g.addColorStop(0.7, `rgba(${r},${gg},${b},${l.i * 0.18})`);
    g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    lc.fillStyle = g;
    lc.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(luzCanvas, 0, 0);
  ctx.restore();
};

// intensidade de luz num ponto (para clarear os personagens perto das tochas)
export const luzEm = (luzes: Luz[], x: number, y: number) => {
  let s = 0;
  for (const l of luzes) {
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < l.r) s += l.i * (1 - d / l.r) ** 1.5;
  }
  return Math.min(1, s);
};

// ───────────── chamas, fagulhas, fumaça e detalhes animados ─────────────
const CHAMA = [
  ["..y..", ".yoy.", ".oyo.", "orroo", ".rr.."],
  [".y...", ".yo..", "yoyo.", "oroo.", ".rr.."],
  ["...y.", "..oy.", ".oyoy", ".oorr", "..rr."],
  ["..y..", ".oy..", ".oyo.", "oryo.", ".rro."],
];
const COR_CHAMA: Record<string, string> = {
  y: "#fff2a8",
  o: "#ffb03a",
  r: "#e0501e",
};

export const desenharTochas = (
  ctx: CanvasRenderingContext2D,
  f: number,
  arena: Arena = "calabouco",
) => {
  if (arena === "floresta") return desenharLanternas(ctx, f, TOCHAS);
  TOCHAS.forEach((t, i) => {
    const q = Math.floor(f / 4 + i) % 4;
    // suporte
    ctx.fillStyle = "#2a2a30";
    if (t.tipo === "braseiro") {
      ctx.fillRect(t.x - 6, t.y - 2, 13, 4);
      ctx.fillStyle = "#48484f";
      ctx.fillRect(t.x - 6, t.y - 2, 13, 1);
      ctx.fillStyle = "#1e1e24";
      ctx.fillRect(t.x - 4, t.y + 2, 2, 6);
      ctx.fillRect(t.x + 3, t.y + 2, 2, 6);
      ctx.fillStyle = "#e0501e";
      ctx.fillRect(t.x - 5, t.y - 3, 11, 1);
    } else {
      ctx.fillRect(t.x - 1, t.y, 3, 7);
      ctx.fillStyle = "#5a4030";
      ctx.fillRect(t.x - 1, t.y - 1, 3, 3);
      ctx.fillStyle = "#44444c";
      ctx.fillRect(t.x - 2, t.y + 5, 5, 1);
    }
    // chama de 4 quadros (maior no braseiro)
    const sx = t.tipo === "braseiro" ? 2 : 1;
    const rows = CHAMA[q];
    const fy = t.y - rows.length * sx - (t.tipo === "braseiro" ? 2 : 1);
    rows.forEach((row, ry) =>
      [...row].forEach((ch, rx) => {
        if (ch === ".") return;
        ctx.fillStyle = COR_CHAMA[ch];
        ctx.fillRect(t.x - 2 * sx + rx * sx, fy + ry * sx, sx, sx);
      }),
    );
    // fagulhas subindo
    for (let k = 0; k < 3; k++) {
      const per = 26 + k * 7;
      const ph = (f + i * 13 + k * 9) % per;
      const yy = fy - ph * 0.8;
      const xx = t.x + Math.round(Math.sin((f + k * 20) * 0.2 + i) * 2);
      const a = 1 - ph / per;
      if (a > 0.1) {
        ctx.fillStyle = `rgba(255,${180 + k * 20},90,${a})`;
        ctx.fillRect(xx, Math.round(yy), 1, 1);
      }
    }
    // fumaça leve
    for (let k = 0; k < 2; k++) {
      const per = 60;
      const ph = (f + i * 17 + k * 30) % per;
      const yy = fy - 6 - ph * 0.5;
      const xx = t.x + Math.round(Math.sin((f + k * 30) * 0.05 + i) * 3);
      ctx.fillStyle = `rgba(150,150,160,${0.18 * (1 - ph / per)})`;
      ctx.fillRect(xx - 1, Math.round(yy), 3, 2);
    }
  });
};

// brilho das runas, reflexo das poças, gotas, poeira e ratos
export const desenharAmbiente = (
  ctx: CanvasRenderingContext2D,
  f: number,
  arena: Arena = "calabouco",
  comAltar = true,
) => {
  if (arena === "floresta") return desenharVidaFloresta(ctx, f, comAltar);
  if (comAltar) {
    // runas que respiram em azul
    const pulso = 0.45 + 0.35 * Math.sin(f * 0.06);
    const niveis = [
      { w: 136, h: 86 },
      { w: 102, h: 64 },
      { w: 70, h: 44 },
    ];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    niveis.forEach((n, i) => {
      const x0 = ALTAR.x - n.w / 2,
        y0 = ALTAR.y - n.h / 2 - i * 4 + n.h + 1;
      for (let k = 6; k < n.w - 6; k += 9) {
        const a = pulso * (0.6 + 0.4 * Math.sin(f * 0.1 + k * 0.3 + i));
        ctx.fillStyle = `rgba(70,140,255,${a * 0.75})`;
        ctx.fillRect(x0 + k, y0, 3, 3);
        ctx.fillStyle = `rgba(70,140,255,${a * 0.18})`;
        ctx.fillRect(x0 + k - 1, y0 - 1, 5, 5);
      }
    });
    // "20" do altar
    ctx.fillStyle = `rgba(80,150,255,${pulso * 0.5})`;
    ctx.fillRect(ALTAR.x - 4, ALTAR.y - 14, 9, 7);
  }

  // reflexo do fogo nas poças
  for (const p of POCAS) {
    const a = 0.25 + 0.15 * Math.sin(f * 0.4 + p.x);
    ctx.fillStyle = `rgba(255,160,80,${a})`;
    ctx.fillRect(
      p.x - 3 + Math.round(Math.sin(f * 0.2 + p.y) * 2),
      p.y - 1,
      4,
      1,
    );
    ctx.fillRect(p.x + 2, p.y + 1, 2, 1);
  }
  ctx.restore();
  // gotas pingando do teto nas poças
  POCAS.forEach((p, i) => {
    const per = 70 + i * 23;
    const ph = (f + i * 31) % per;
    if (ph < 10) {
      ctx.fillStyle = "rgba(170,200,230,0.8)";
      ctx.fillRect(p.x + 2, p.y - 18 + ph * 1.7, 1, 2);
    } else if (ph < 26) {
      const r = (ph - 10) * 0.6;
      ctx.strokeStyle = `rgba(170,200,230,${0.6 * (1 - (ph - 10) / 16)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(
        p.x + 2.5,
        p.y + 0.5,
        r + 1,
        (r + 1) * 0.45,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  });
  // poeira no ar
  for (let k = 0; k < 28; k++) {
    const x = (hash3(k, 1) * W + f * (0.1 + hash3(k, 2) * 0.2)) % W;
    const y = 180 + ((hash3(k, 3) * 360 + Math.sin(f * 0.02 + k) * 8) % 360);
    const a = 0.15 + 0.2 * Math.sin(f * 0.05 + k * 2);
    if (a > 0) {
      ctx.fillStyle = `rgba(230,220,200,${a})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  // ratos correndo de vez em quando (rente às paredes)
  const corridas = [
    { v0: 260, y: 528, dir: 1 },
    { v0: 980, y: 190, dir: -1 },
    { v0: 1500, y: 528, dir: -1 },
    { v0: 2120, y: 528, dir: 1 },
  ];
  for (const c of corridas) {
    const t = f - c.v0;
    if (t < 0 || t > 90) continue;
    const x = c.dir > 0 ? PAREDE_LADO + t * 3.6 : W - PAREDE_LADO - t * 3.6;
    const pata = Math.floor(t / 2) % 2;
    ctx.fillStyle = "#4a4048";
    ctx.fillRect(Math.round(x) - 3, c.y - 2, 6, 3);
    ctx.fillRect(Math.round(x) + 3 * c.dir, c.y - 1, 2, 2);
    ctx.fillStyle = "#6a5e66";
    ctx.fillRect(Math.round(x) - 2, c.y - 2, 4, 1);
    ctx.fillStyle = "#c08a8a";
    ctx.fillRect(Math.round(x) - 5 * c.dir, c.y, 3, 1);
    ctx.fillStyle = "#2a2228";
    ctx.fillRect(Math.round(x) - 2 + pata, c.y + 1, 1, 1);
    ctx.fillRect(Math.round(x) + 1 - pata, c.y + 1, 1, 1);
    ctx.fillStyle = "#ff3a3a";
    ctx.fillRect(Math.round(x) + 4 * c.dir, c.y - 1, 1, 1);
  }
};

let vinhetaC: HTMLCanvasElement | null = null;
export const vinheta = (ctx: CanvasRenderingContext2D) => {
  if (!vinhetaC) {
    vinhetaC = novoCanvas(W, H);
    const v = vinhetaC.getContext("2d")!;
    const g = v.createRadialGradient(
      W / 2,
      H * 0.55,
      H * 0.22,
      W / 2,
      H * 0.55,
      H * 0.62,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.75, "rgba(4,6,10,0.22)");
    g.addColorStop(1, "rgba(4,6,10,0.6)");
    v.fillStyle = g;
    v.fillRect(0, 0, W, H);
  }
  ctx.drawImage(vinhetaC, 0, 0);
};
