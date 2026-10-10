// Arena 2: clareira na floresta ao entardecer, no mesmo estilo do calabouço (top-down GBA/SNES).
// Usa as mesmas posições do calabouço para luzes, tablado e altar: só o desenho muda.
import { Rng, hash3 } from "./rng.ts";
import { novoCanvas } from "./pixel.ts";

const W = 360,
  H = 640;
const TOPO = 182; // fim da linha de árvores de cima
const BASE = 534;
const LADO = 26;
const ALTAR = { x: 180, y: 352 };
export const LAGOS = [
  { x: 74, y: 226, rx: 22, ry: 8 },
  { x: 292, y: 474, rx: 18, ry: 7 },
];

type RGB = [number, number, number];
const esc = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

// folhagem (menos saturada que os personagens)
const F0: RGB = [24, 44, 34];
const F1: RGB = [38, 68, 44];
const F2: RGB = [56, 92, 52];
const F3: RGB = [84, 120, 62];
const F4: RGB = [122, 152, 80];
const GRAMA: RGB = [80, 106, 60];
const TERRA: RGB = [130, 106, 76];
const CASCA: RGB = [78, 56, 40];

const cache = new Map<string, HTMLCanvasElement>();

export const fundoFloresta = (comAltar = true): HTMLCanvasElement => {
  const chave = comAltar ? "altar" : "livre";
  const c0 = cache.get(chave);
  if (c0) return c0;
  const rng = new Rng("floresta-arena-d20");
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
    c: RGB | ((nx: number, ny: number, x: number, y: number) => RGB | null),
    a = 1,
  ) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx,
          ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        const cor = typeof c === "function" ? c(nx, ny, x, y) : c;
        if (cor) set(x, y, cor, a);
      }
  };

  // ── chão: grama com tufos e flores, terra batida no meio da clareira ──
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = hash3(x >> 1, y >> 1, 5);
      const m = hash3(x >> 3, y >> 3, 6);
      let c = esc(GRAMA, 0.9 + m * 0.14 + (n - 0.5) * 0.06);
      // terra batida (onde mais se luta) com borda irregular
      const dx = (x - 180) / 128,
        dy = (y - 362) / 146;
      const r = dx * dx + dy * dy + (hash3(x >> 2, y >> 2, 7) - 0.5) * 0.18;
      if (r < 0.62)
        c = mix(c, esc(TERRA, 0.92 + n * 0.12), Math.min(1, (0.62 - r) * 4));
      set(x, y, c);
    }
  // tufos de grama (^ com ponta clara) e flores
  for (let k = 0; k < 900; k++) {
    const x = rng.int(LADO, W - LADO),
      y = rng.int(TOPO, BASE);
    const dx = (x - 180) / 128,
      dy = (y - 362) / 146;
    if (dx * dx + dy * dy < 0.5 && rng.next() < 0.8) continue;
    const g = esc(GRAMA, 0.8 + rng.next() * 0.3);
    set(x, y, esc(g, 0.75));
    set(x - 1, y - 1, g);
    set(x + 1, y - 1, g);
    set(x - 1, y - 2, esc(g, 1.25));
    set(x + 1, y - 2, esc(g, 1.18));
    if (rng.next() < 0.12)
      set(
        x,
        y - 3,
        rng.pick([
          [230, 226, 210],
          [232, 200, 90],
          [214, 130, 160],
          [170, 170, 230],
        ] as RGB[]),
      );
  }
  // pedrinhas na terra
  for (let k = 0; k < 140; k++) {
    const x = rng.int(70, 290),
      y = rng.int(230, 500);
    const c: RGB = esc([138, 128, 114], 0.85 + rng.next() * 0.25);
    set(x, y, c);
    if (rng.next() < 0.5) set(x + 1, y, esc(c, 0.75));
  }

  if (comAltar) {
    // ── monte de terra em degraus (mesma planta do tablado do calabouço) com pedras rúnicas ──
    const niveis = [
      { w: 136, h: 86, face: 6 },
      { w: 102, h: 64, face: 6 },
      { w: 70, h: 44, face: 5 },
    ];
    niveis.forEach((n, i) => {
      const x0 = ALTAR.x - n.w / 2,
        y0 = ALTAR.y - n.h / 2 - i * 4;
      // sombra do degrau
      rect(
        x0 + 2,
        y0 + n.h + n.face,
        x0 + n.w + 1,
        y0 + n.h + n.face + 2,
        [40, 50, 34],
        0.45,
      );
      // tampo de grama com bordas arredondadas
      for (let yy = y0; yy < y0 + n.h; yy++)
        for (let xx = x0; xx < x0 + n.w; xx++) {
          const canto =
            Math.min(xx - x0, x0 + n.w - 1 - xx) < 3 &&
            Math.min(yy - y0, y0 + n.h - 1 - yy) < 3 &&
            Math.hypot(
              Math.min(xx - x0, x0 + n.w - 1 - xx) - 3,
              Math.min(yy - y0, y0 + n.h - 1 - yy) - 3,
            ) > 3;
          if (canto) continue;
          let c = esc(
            mix(GRAMA, F4, 0.3 + i * 0.12),
            0.98 + hash3(xx >> 1, yy >> 1, 20 + i) * 0.1,
          );
          const borda = Math.min(
            xx - x0,
            x0 + n.w - 1 - xx,
            yy - y0,
            y0 + n.h - 1 - yy,
          );
          if (borda === 0) c = [30, 46, 30];
          else if (yy === y0 + 1 || xx === x0 + 1) c = esc(c, 1.2);
          else if (xx === x0 + n.w - 2) c = esc(c, 0.78);
          set(xx, yy, c);
        }
      // face de terra com raízes
      for (let yy = y0 + n.h; yy < y0 + n.h + n.face; yy++)
        for (let xx = x0; xx < x0 + n.w; xx++) {
          let c = esc(
            TERRA,
            yy === y0 + n.h ? 1.05 : 0.86 - (yy - y0 - n.h) * 0.04,
          );
          if (hash3(xx, yy, 30 + i) < 0.1) c = esc(c, 0.75);
          set(xx, yy, c);
        }
      // franja de grama caindo na borda
      for (let xx = x0 + 1; xx < x0 + n.w - 1; xx += 2)
        if (hash3(xx, i, 33) < 0.6) set(xx, y0 + n.h, esc(F3, 0.9));
      // pedras rúnicas encaixadas na face (o brilho azul é animado depois, nas mesmas posições do calabouço)
      for (let k = 6; k < n.w - 6; k += 9) {
        const rx = x0 + k,
          ry = y0 + n.h + 1;
        rect(rx - 1, ry - 1, rx + 3, ry + 3, [104, 106, 112]);
        rect(rx - 1, ry - 1, rx + 3, ry - 1, [134, 136, 140]);
        const g: RGB = [40, 56, 84];
        const tipo = Math.floor(hash3(k, i, 11) * 4);
        const pts = [
          [
            [0, 0],
            [0, 1],
            [0, 2],
            [1, 0],
          ],
          [
            [0, 0],
            [1, 1],
            [2, 0],
            [1, 2],
          ],
          [
            [0, 2],
            [1, 1],
            [2, 2],
            [1, 0],
          ],
          [
            [0, 0],
            [2, 0],
            [1, 1],
            [1, 2],
          ],
        ][tipo];
        for (const [a, b] of pts) set(rx + a, ry + b, g);
      }
    });

    // ── pedra d20 coberta de musgo no centro ──
    {
      const cx = ALTAR.x,
        cy = ALTAR.y - 12;
      const R = 13;
      elip(cx + 3, ALTAR.y + 2, 15, 5, [24, 32, 22], 0.5);
      const hex: [number, number][] = [];
      for (let k = 0; k < 6; k++)
        hex.push([
          cx + Math.cos(-Math.PI / 2 + (k * Math.PI) / 3) * R,
          cy + Math.sin(-Math.PI / 2 + (k * Math.PI) / 3) * R,
        ]);
      const tri = (
        a: [number, number],
        b: [number, number],
        c: [number, number],
        cor: RGB,
      ) => {
        for (
          let yy = Math.floor(Math.min(a[1], b[1], c[1]));
          yy <= Math.ceil(Math.max(a[1], b[1], c[1]));
          yy++
        )
          for (
            let xx = Math.floor(Math.min(a[0], b[0], c[0]));
            xx <= Math.ceil(Math.max(a[0], b[0], c[0]));
            xx++
          ) {
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
      const tons: RGB[] = [
        [146, 150, 150],
        [118, 122, 124],
        [94, 98, 102],
        [72, 76, 82],
        [84, 88, 94],
        [130, 134, 136],
      ];
      for (let k = 0; k < 6; k++) tri(hex[k], hex[(k + 1) % 6], c0, tons[k]);
      for (let k = 0; k < 6; k++) {
        const a = hex[k],
          b = hex[(k + 1) % 6];
        for (let t = 0; t <= 1; t += 0.05)
          set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, [40, 44, 46]);
        for (let t = 0; t <= 1; t += 0.1)
          set(
            c0[0] + (a[0] - c0[0]) * t,
            c0[1] + (a[1] - c0[1]) * t,
            [70, 74, 80],
          );
      }
      // musgo no topo e nas laterais de baixo
      for (let k = 0; k < 60; k++) {
        const a = rng.next() * Math.PI * 2;
        const rr = rng.next() * R;
        const x = cx + Math.cos(a) * rr,
          y = cy + Math.sin(a) * rr;
        if (y < cy - 4 || y > cy + 7)
          set(x, y, rng.next() < 0.5 ? [72, 110, 56] : [96, 134, 66]);
      }
      const dig = ["###.###", "..#.#.#", "###.#.#", "#...#.#", "###.###"];
      dig.forEach((row, ry) =>
        [...row].forEach(
          (ch, rx) => ch === "#" && set(cx - 3 + rx, cy - 1 + ry, [40, 52, 82]),
        ),
      );
      // anel de cogumelos em volta
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + 0.3;
        const x = cx + Math.cos(a) * 22,
          y = ALTAR.y - 4 + Math.sin(a) * 9;
        set(x, y + 1, [220, 210, 190]);
        set(x - 1, y, [200, 60, 50]);
        set(x, y, [230, 80, 64]);
        set(x + 1, y, [170, 50, 44]);
        set(x, y - 1, [240, 120, 100]);
      }
    }
  }

  // ── lagos com vitórias-régias ──
  for (const p of LAGOS) {
    elip(p.x, p.y + 1, p.rx + 2, p.ry + 2, [62, 70, 48]);
    elip(p.x, p.y, p.rx + 1, p.ry + 1, [96, 84, 60]);
    elip(p.x, p.y, p.rx, p.ry, (nx, ny) =>
      ny < -0.45 ? [58, 82, 104] : [40, 60, 82],
    );
    for (let k = 0; k < 3; k++) {
      const x = p.x - p.rx * 0.5 + k * p.rx * 0.45,
        y = p.y + (k % 2 ? 2 : -1);
      elip(x, y, 2.4, 1.4, [70, 120, 60]);
      set(x + 1, y - 1, [40, 60, 82]);
      if (k === 1) set(x - 1, y - 1, [236, 180, 200]);
    }
  }

  // ── tronco caído, tocos, pedras ──
  const toco = (x: number, y: number) => {
    elip(x + 2, y + 3, 9, 3, [36, 44, 30], 0.5);
    rect(x - 7, y - 2, x + 7, y + 3, CASCA);
    rect(x + 4, y - 2, x + 7, y + 3, esc(CASCA, 0.75));
    elip(x, y - 3, 7, 3, (nx, ny) =>
      Math.hypot(nx, ny) > 0.8
        ? esc(CASCA, 0.9)
        : Math.round(Math.hypot(nx * 7, ny * 3)) % 2
          ? [176, 140, 96]
          : [150, 116, 78],
    );
  };
  toco(312, 208);
  toco(46, 318);
  // tronco caído (de lado)
  rect(30, 494, 78, 502, CASCA);
  rect(30, 494, 78, 495, esc(CASCA, 1.3));
  rect(30, 501, 78, 502, esc(CASCA, 0.7));
  for (let x = 34; x < 76; x += 5) set(x, 497 + (x % 3), esc(CASCA, 0.6));
  elip(78, 498, 3, 4.5, [170, 134, 92]);
  elip(78, 498, 1.5, 2.5, [140, 104, 70]);
  for (let k = 0; k < 6; k++) set(40 + k * 6, 493, [84, 126, 60]);
  const pedra = (x: number, y: number, r: number) => {
    elip(x + 1, y + 2, r + 1, r * 0.5 + 1, [34, 44, 30], 0.5);
    elip(x, y, r, r * 0.7, (nx, ny) =>
      nx * -0.6 + ny * -0.8 > 0.4
        ? [150, 150, 146]
        : nx * -0.6 + ny * -0.8 < -0.4
          ? [86, 88, 90]
          : [118, 118, 118],
    );
    set(x - r * 0.4, y - r * 0.3, [96, 134, 66]);
  };
  pedra(300, 300, 5);
  pedra(60, 420, 4);
  pedra(318, 390, 3);
  pedra(250, 512, 4);
  // ossos esquecidos de outras lutas
  const osso = (x: number, y: number, ang: number) => {
    const c: RGB = [196, 186, 162];
    for (let t = -4; t <= 4; t++)
      set(x + Math.cos(ang) * t, y + Math.sin(ang) * t, c);
    for (const s of [-1, 1]) {
      set(x + Math.cos(ang) * 5 * s, y + Math.sin(ang) * 5 * s - 1, c);
      set(x + Math.cos(ang) * 5 * s, y + Math.sin(ang) * 5 * s + 1, c);
    }
  };
  osso(118, 508, 1.2);
  osso(276, 214, 2.4);

  // ── bordas: árvores e arbustos (no lugar das paredes) ──
  const copa = (cx: number, cy: number, r: number, seed: number) => {
    elip(cx + 3, cy + 4, r, r * 0.92, [16, 26, 20], 0.55); // sombra
    elip(cx, cy, r, r * 0.92, (nx, ny, x, y) => {
      // aglomerados de folhas: ruído em blocos de 2 px e luz do alto à esquerda
      const b =
        nx * -0.62 + ny * -0.78 + (hash3(x >> 1, y >> 1, seed) - 0.5) * 0.7;
      return b > 0.75 ? F4 : b > 0.3 ? F3 : b > -0.2 ? F2 : b > -0.65 ? F1 : F0;
    });
    // contorno escuro
    for (let a = 0; a < Math.PI * 2; a += 0.04)
      set(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92, F0);
  };
  const arbusto = (cx: number, cy: number, r: number, seed: number) => {
    copa(cx, cy, r, seed);
    if (hash3(cx, cy, 3) < 0.35)
      for (let k = 0; k < 4; k++)
        set(cx - r * 0.4 + k * 3, cy - r * 0.2 + (k % 2) * 2, [200, 50, 60]); // frutinhas
  };
  // faixa de cima: troncos e raízes aparecendo sob as copas (como a face da parede)
  rect(0, 140, W - 1, TOPO - 1, [34, 46, 32]);
  for (let x = 14; x < W; x += 30) {
    const tx = x + Math.round((hash3(x, 1) - 0.5) * 10);
    rect(tx - 4, 128, tx + 4, TOPO - 2, CASCA);
    rect(tx - 4, 128, tx - 3, TOPO - 2, esc(CASCA, 1.3));
    rect(tx + 3, 128, tx + 4, TOPO - 2, esc(CASCA, 0.65));
    for (let y = 132; y < TOPO - 2; y += 4)
      set(tx + (y % 3) - 1, y, esc(CASCA, 0.6));
    // raízes
    for (const s of [-1, 1])
      for (let k = 0; k < 6; k++)
        set(tx + s * (4 + k), TOPO - 2 - Math.floor(k / 2), esc(CASCA, 0.8));
  }
  for (let x = 0; x < W; x += 14)
    arbusto(
      x + Math.round(hash3(x, 2) * 6),
      TOPO - 8 + Math.round(hash3(x, 3) * 5),
      9,
      x,
    );
  for (let x = -10; x < W + 20; x += 34)
    copa(
      x + Math.round(hash3(x, 4) * 10),
      60 + Math.round(hash3(x, 5) * 30),
      30,
      x + 7,
    );
  for (let x = 6; x < W; x += 28)
    copa(
      x + Math.round(hash3(x, 6) * 8),
      118 + Math.round(hash3(x, 7) * 10),
      20,
      x + 11,
    );
  // sombra das árvores na grama
  for (let x = 0; x < W; x++)
    for (let y = TOPO; y < TOPO + 10; y++)
      set(
        x,
        y,
        [20, 30, 20],
        0.4 * (1 - (y - TOPO) / 10) * (0.7 + hash3(x >> 3, 0, 8) * 0.3),
      );
  // laterais
  for (let y = 150; y < BASE + 10; y += 16) {
    arbusto(10 + Math.round(hash3(y, 9) * 6), y, 13, y);
    arbusto(W - 10 - Math.round(hash3(y, 10) * 6), y + 6, 13, y + 3);
  }
  // base
  for (let x = -6; x < W + 10; x += 18)
    arbusto(x + Math.round(hash3(x, 11) * 6), BASE + 8, 12, x + 21);
  for (let x = -10; x < W + 20; x += 34)
    copa(
      x + Math.round(hash3(x, 12) * 10),
      BASE + 50 + Math.round(hash3(x, 13) * 30),
      30,
      x + 31,
    );
  for (let x = 0; x < W; x += 40) copa(x + 16, H + 6, 34, x + 41);
  // trepadeiras e estandartes em postes (no lugar das correntes e estandartes rasgados)
  for (const [bx, cor] of [
    [158, [120, 34, 40]],
    [202, [40, 54, 110]],
  ] as [number, RGB][]) {
    rect(bx - 1, 136, bx + 1, TOPO + 2, [94, 70, 46]);
    rect(bx - 1, 136, bx - 1, TOPO + 2, [124, 94, 62]);
    for (let yy = 140; yy < 172; yy++)
      for (let xx = bx + 2; xx <= bx + 14; xx++) {
        if (yy > 164 && hash3(xx, 77) < 0.5 + (yy - 164) * 0.07) continue;
        let c = cor;
        if (xx === bx + 2) c = esc(cor, 1.2);
        if (xx === bx + 14) c = esc(cor, 0.6);
        set(xx, yy, c);
      }
    for (let k = -3; k <= 3; k++) {
      set(bx + 8 + k, 151 - (3 - Math.abs(k)), [200, 170, 80]);
      set(bx + 8 + k, 151 + (3 - Math.abs(k)), [200, 170, 80]);
    }
  }
  // arco de pedra em ruínas (dos dois lados) com trepadeira
  for (const ax of [96, 264]) {
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.03) {
      for (let k = 0; k < 4; k++)
        set(
          ax + Math.cos(a) * (14 + k),
          168 + Math.sin(a) * (14 + k),
          k === 0 ? [140, 140, 146] : [110, 110, 118],
        );
    }
    rect(ax - 18, 168, ax - 14, TOPO, [110, 110, 118]);
    rect(ax + 14, 168, ax + 18, TOPO, [96, 96, 104]);
    for (let k = 0; k < 20; k++)
      set(
        ax - 16 + Math.sin(k) * 2,
        154 + k,
        k % 3 ? [72, 116, 56] : [100, 140, 66],
      );
  }

  const c = novoCanvas(W, H);
  c.getContext("2d")!.putImageData(img, 0, 0);
  cache.set(chave, c);
  return c;
};

// ───────────── lanternas em postes e fogueiras (mesmas posições das tochas) ─────────────
const CHAMA = [
  ["..y..", ".yoy.", ".oyo.", "orroo", ".rr.."],
  [".y...", ".yo..", "yoyo.", "oroo.", ".rr.."],
  ["...y.", "..oy.", ".oyoy", ".oorr", "..rr."],
  ["..y..", ".oy..", ".oyo.", "oryo.", ".rro."],
];
const COR: Record<string, string> = {
  y: "#fff2a8",
  o: "#ffb03a",
  r: "#e0501e",
};

export const desenharLanternas = (
  ctx: CanvasRenderingContext2D,
  f: number,
  tochas: { x: number; y: number; tipo: string }[],
) => {
  tochas.forEach((t, i) => {
    const q = Math.floor(f / 4 + i) % 4;
    if (t.tipo === "braseiro") {
      // fogueira: pedras em roda + lenha cruzada + chama dupla
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.fillStyle = k % 2 ? "#6a6a70" : "#8a8a90";
        ctx.fillRect(
          Math.round(t.x + Math.cos(a) * 7) - 1,
          Math.round(t.y + Math.sin(a) * 3) - 1,
          3,
          2,
        );
      }
      ctx.fillStyle = "#5a3a24";
      ctx.fillRect(t.x - 5, t.y - 1, 11, 2);
      ctx.fillStyle = "#7a5032";
      ctx.fillRect(t.x - 3, t.y - 2, 2, 4);
      ctx.fillRect(t.x + 2, t.y - 2, 2, 4);
      const rows = CHAMA[q];
      rows.forEach((row, ry) =>
        [...row].forEach((ch, rx) => {
          if (ch === ".") return;
          ctx.fillStyle = COR[ch];
          ctx.fillRect(t.x - 4 + rx * 2, t.y - 12 + ry * 2, 2, 2);
        }),
      );
    } else {
      // poste de madeira com lanterna pendurada
      const lado = t.tipo === "lateral" ? (t.x < 180 ? 1 : -1) : 0;
      const px = t.x,
        py = t.y + 8;
      ctx.fillStyle = "#3e2a1c";
      ctx.fillRect(px - 1, py - 18, 3, 20);
      ctx.fillStyle = "#6a4a30";
      ctx.fillRect(px - 1, py - 18, 1, 20);
      ctx.fillStyle = "#3e2a1c";
      ctx.fillRect(px - 1 + Math.min(0, lado * 5), py - 18, 6, 2);
      const lx = px + 2 + lado * 3,
        ly = py - 15;
      const bal = Math.round(Math.sin(f * 0.08 + i) * 1);
      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(lx - 2 + bal, ly, 5, 7);
      ctx.fillStyle = q % 2 ? "#ffd060" : "#ffb03a";
      ctx.fillRect(lx - 1 + bal, ly + 1, 3, 5);
      ctx.fillStyle = "#fff2a8";
      ctx.fillRect(lx + bal, ly + 2 + (q % 2), 1, 2);
      ctx.fillStyle = "#4a4a52";
      ctx.fillRect(lx - 2 + bal, ly - 1, 5, 1);
    }
    // fagulhas / mariposas em volta da luz
    for (let k = 0; k < 3; k++) {
      const per = 26 + k * 7;
      const ph = (f + i * 13 + k * 9) % per;
      const a = 1 - ph / per;
      if (t.tipo === "braseiro") {
        ctx.fillStyle = `rgba(255,${180 + k * 20},90,${a})`;
        ctx.fillRect(
          t.x + Math.round(Math.sin((f + k * 20) * 0.2 + i) * 3),
          Math.round(t.y - 12 - ph * 0.9),
          1,
          1,
        );
      } else {
        const ang = (f + k * 40) * 0.12 + i;
        ctx.fillStyle = `rgba(240,230,200,${0.6 + 0.4 * Math.sin(f * 0.5 + k)})`;
        ctx.fillRect(
          Math.round(t.x + 3 + Math.cos(ang) * 6),
          Math.round(t.y - 6 + Math.sin(ang * 1.3) * 4),
          1,
          1,
        );
      }
    }
    if (t.tipo === "braseiro")
      for (let k = 0; k < 2; k++) {
        const ph = (f + i * 17 + k * 30) % 60;
        ctx.fillStyle = `rgba(150,150,160,${0.2 * (1 - ph / 60)})`;
        ctx.fillRect(
          t.x + Math.round(Math.sin((f + k * 30) * 0.05 + i) * 3) - 1,
          Math.round(t.y - 18 - ph * 0.5),
          3,
          2,
        );
      }
  });
};

// ───────────── vida da floresta: runas, lagos, vaga-lumes, folhas caindo, coelhos ─────────────
export const desenharVidaFloresta = (
  ctx: CanvasRenderingContext2D,
  f: number,
  comAltar = true,
) => {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (comAltar) {
    const pulso = 0.45 + 0.35 * Math.sin(f * 0.06);
    const niveis = [
      { w: 136, h: 86 },
      { w: 102, h: 64 },
      { w: 70, h: 44 },
    ];
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
    ctx.fillStyle = `rgba(80,150,255,${pulso * 0.5})`;
    ctx.fillRect(ALTAR.x - 4, ALTAR.y - 14, 9, 7);
  }
  // reflexo da luz nos lagos
  for (const p of LAGOS) {
    const a = 0.22 + 0.14 * Math.sin(f * 0.3 + p.x);
    ctx.fillStyle = `rgba(255,200,130,${a})`;
    ctx.fillRect(
      p.x - 6 + Math.round(Math.sin(f * 0.15 + p.y) * 3),
      p.y - 2,
      6,
      1,
    );
    ctx.fillRect(p.x + 4, p.y + 2, 3, 1);
  }
  // vaga-lumes piscando
  for (let k = 0; k < 26; k++) {
    const bx = hash3(k, 51) * W,
      by = 190 + hash3(k, 52) * 340;
    const x = bx + Math.sin(f * 0.02 + k) * 14 + Math.sin(f * 0.07 + k * 3) * 4;
    const y = by + Math.cos(f * 0.025 + k * 2) * 10;
    const a = Math.max(0, Math.sin(f * 0.09 + k * 1.7));
    if (a < 0.15) continue;
    ctx.fillStyle = `rgba(200,255,120,${a})`;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    ctx.fillStyle = `rgba(200,255,120,${a * 0.25})`;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
  }
  ctx.restore();
  // ondinhas nos lagos (peixes)
  LAGOS.forEach((p, i) => {
    const per = 80 + i * 31;
    const ph = (f + i * 23) % per;
    if (ph < 18) {
      const r = ph * 0.5;
      ctx.strokeStyle = `rgba(170,210,230,${0.6 * (1 - ph / 18)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x + 5, p.y + 1, r + 1, (r + 1) * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  // folhas caindo das copas
  for (let k = 0; k < 10; k++) {
    const per = 160 + Math.floor(hash3(k, 61) * 120);
    const ph = (f + Math.floor(hash3(k, 62) * per)) % per;
    const x = hash3(k, 63) * W + Math.sin(ph * 0.08 + k) * 10;
    const y = 120 + ph * 2.2;
    if (y > BASE) continue;
    ctx.fillStyle = k % 3 ? "#8aa850" : "#c89a40";
    ctx.fillRect(
      Math.round(x),
      Math.round(y),
      Math.floor(ph / 6) % 2 ? 2 : 1,
      1,
    );
  }
  // coelhos correndo de vez em quando (rente às moitas)
  const corridas = [
    { v0: 260, y: 528, dir: 1 },
    { v0: 980, y: 192, dir: -1 },
    { v0: 1500, y: 528, dir: -1 },
    { v0: 2120, y: 528, dir: 1 },
  ];
  for (const c of corridas) {
    const t = f - c.v0;
    if (t < 0 || t > 90) continue;
    const x = Math.round(c.dir > 0 ? LADO + t * 3.4 : W - LADO - t * 3.4);
    const pulo = Math.floor(t / 3) % 3 === 0 ? 1 : 0;
    const y = c.y - pulo;
    ctx.fillStyle = "#8a7a6a";
    ctx.fillRect(x - 3, y - 2, 6, 3);
    ctx.fillRect(x + 2 * c.dir, y - 4, 2, 3);
    ctx.fillStyle = "#b0a090";
    ctx.fillRect(x + 2 * c.dir, y - 6, 1, 2);
    ctx.fillRect(x + 3 * c.dir, y - 6, 1, 2);
    ctx.fillStyle = "#f0ece0";
    ctx.fillRect(x - 4 * c.dir, y - 2, 2, 2);
    ctx.fillStyle = "#1a1418";
    ctx.fillRect(x + 3 * c.dir, y - 3, 1, 1);
  }
};
