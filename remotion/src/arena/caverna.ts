// Arena 3: caverna escura dos chefes (4× a área das arenas normais: 720×1280), mesmo estilo top-down.
// Paredes de rocha irregulares, estalagmites, cristais que brilham fraco, lago subterrâneo, ossos e poucas tochas.
import { Rng, hash3 } from "./rng.ts";
import { novoCanvas } from "./pixel.ts";

const W = 720,
  H = 1280;
type RGB = [number, number, number];
const esc = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// borda da caverna: distância "irregular" até a parede (0 = no limite da área de luta)
const borda = (x: number, y: number) => {
  // superelipse (retângulo de cantos redondos) que contém toda a área de luta, com borda ondulada
  const nx = (x - 360) / 322,
    ny = (y - 660) / 544;
  const ang = Math.atan2(ny, nx);
  const ond = 0.035 * Math.sin(ang * 5 + 1.3) + 0.025 * Math.sin(ang * 11 + 0.4) + 0.015 * Math.sin(ang * 23);
  return Math.pow(Math.abs(nx) ** 8 + Math.abs(ny) ** 8, 1 / 8) - (1.04 + ond); // < 0 dentro
};
export const dentroDaCaverna = (x: number, y: number) => borda(x, y) < 0;

export type TochaC = { x: number; y: number; tipo: "parede" | "braseiro" | "lateral" };
export const TOCHAS_CAVERNA: TochaC[] = [
  { x: 210, y: 150, tipo: "parede" },
  { x: 510, y: 150, tipo: "parede" },
  { x: 72, y: 470, tipo: "lateral" },
  { x: 648, y: 470, tipo: "lateral" },
  { x: 72, y: 860, tipo: "lateral" },
  { x: 648, y: 860, tipo: "lateral" },
  { x: 250, y: 1170, tipo: "braseiro" },
  { x: 470, y: 1170, tipo: "braseiro" },
];
export const CRISTAIS = [
  { x: 120, y: 300, cor: [90, 150, 255] as RGB },
  { x: 610, y: 330, cor: [180, 100, 255] as RGB },
  { x: 140, y: 1020, cor: [90, 200, 220] as RGB },
  { x: 590, y: 1050, cor: [90, 150, 255] as RGB },
  { x: 360, y: 210, cor: [160, 110, 255] as RGB },
];
export const LAGO = { x: 560, y: 760, rx: 46, ry: 22 };

let cache: HTMLCanvasElement | null = null;

export const fundoCaverna = (): HTMLCanvasElement => {
  if (cache) return cache;
  const rng = new Rng("caverna-arena-d20");
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
  const elip = (cx: number, cy: number, rx: number, ry: number, c: RGB | ((nx: number, ny: number, x: number, y: number) => RGB | null), a = 1) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx,
          ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        const cor = typeof c === "function" ? c(nx, ny, x, y) : c;
        if (cor) set(x, y, cor, a);
      }
  };

  // chão de rocha (placas irregulares em blocos de 4 px) e paredes
  const CHAO: RGB = [104, 96, 92];
  const PAREDE: RGB = [52, 46, 50];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const b = borda(x, y);
      const n = hash3(x >> 2, y >> 2, 3);
      const m = hash3(x >> 4, y >> 4, 4);
      if (b > 0.06) {
        // parede: rocha em camadas, mais escura longe da borda, com veios
        const k = Math.max(0.35, 1 - (b - 0.06) * 2.4);
        let c = esc(PAREDE, k * (0.85 + n * 0.25));
        if ((x + Math.floor(y / 3)) % 9 === 0 && n > 0.5) c = esc(c, 1.25);
        set(x, y, c);
      } else if (b > 0) {
        // pé da parede: borda iluminada de cima + sombra
        set(x, y, esc(mix(PAREDE, CHAO, 0.4), 0.9 + n * 0.2 - b * 3));
      } else {
        let c = esc(CHAO, 0.82 + m * 0.18 + (n - 0.5) * 0.1);
        // fendas entre placas
        if (hash3(x >> 3, y >> 3, 9) > 0.86 && (x % 8 === 0 || y % 8 === 0)) c = esc(c, 0.7);
        // sombra junto à parede
        if (b > -0.05) c = esc(c, 0.75 + (-b / 0.05) * 0.25);
        set(x, y, c);
      }
    }
  // rachaduras e pedrinhas
  for (let k = 0; k < 90; k++) {
    let x = rng.int(100, 620),
      y = rng.int(200, 1120);
    if (borda(x, y) > -0.02) continue;
    for (let j = 0; j < rng.int(6, 18); j++) {
      set(x, y, [44, 40, 42]);
      if (rng.next() < 0.5) set(x + 1, y, [104, 98, 96]);
      x += rng.int(-1, 1);
      y += rng.int(0, 1);
    }
  }
  for (let k = 0; k < 500; k++) {
    const x = rng.int(80, 640),
      y = rng.int(180, 1150);
    if (borda(x, y) > -0.01) continue;
    const c: RGB = esc([120, 112, 106], 0.8 + rng.next() * 0.3);
    set(x, y, c);
    if (rng.next() < 0.4) set(x + 1, y + 1, esc(c, 0.6));
  }
  // lago subterrâneo
  elip(LAGO.x, LAGO.y + 2, LAGO.rx + 4, LAGO.ry + 4, [50, 46, 48]);
  elip(LAGO.x, LAGO.y, LAGO.rx + 1, LAGO.ry + 1, [70, 66, 68]);
  elip(LAGO.x, LAGO.y, LAGO.rx, LAGO.ry, (nx, ny) => (ny < -0.5 ? [36, 56, 80] : [22, 36, 56]));
  // estalagmites (cones vistos de cima com sombra) — junto às paredes, fora do meio da luta
  const estalagmite = (x: number, y: number, r: number) => {
    elip(x + r * 0.5, y + r * 0.4, r * 1.2, r * 0.55, [30, 26, 30], 0.6);
    elip(x, y, r, r * 0.8, (nx, ny) => {
      const b = nx * -0.6 + ny * -0.8;
      return b > 0.45 ? [138, 128, 124] : b > -0.1 ? [104, 96, 94] : b > -0.55 ? [76, 70, 72] : [56, 50, 54];
    });
    elip(x - r * 0.15, y - r * 0.2, r * 0.3, r * 0.25, [160, 150, 144]);
  };
  for (let k = 0; k < 70; k++) {
    const a = rng.next() * Math.PI * 2;
    const x = 360 + Math.cos(a) * 330 * (0.9 + rng.next() * 0.12);
    const y = 660 + Math.sin(a) * 560 * (0.9 + rng.next() * 0.12);
    if (borda(x, y) > 0.08) continue;
    estalagmite(x, y, rng.int(4, 11));
  }
  // cristais nas paredes (o brilho é animado depois)
  for (const c of CRISTAIS) {
    for (let j = 0; j < 5; j++) {
      const dx = (j - 2) * 4,
        h = 7 + ((j * 3) % 5) * 2;
      for (let t = 0; t < h; t++)
        for (let w = -1; w <= 1; w++) {
          const shade = w < 0 ? 1.25 : w > 0 ? 0.7 : 1;
          set(c.x + dx + w + Math.round(t * (j - 2) * 0.12), c.y - t, esc(esc(c.cor, 0.55), shade));
        }
      set(c.x + dx, c.y - h, esc(c.cor, 1.1));
    }
  }
  // ossos, crânios e restos de aventureiros
  const osso = (x: number, y: number, ang: number) => {
    const c: RGB = [186, 176, 152];
    for (let t = -4; t <= 4; t++) set(x + Math.cos(ang) * t, y + Math.sin(ang) * t, c);
    for (const s of [-1, 1]) {
      set(x + Math.cos(ang) * 5 * s, y + Math.sin(ang) * 5 * s - 1, c);
      set(x + Math.cos(ang) * 5 * s, y + Math.sin(ang) * 5 * s + 1, c);
    }
  };
  const cranio = (x: number, y: number) => {
    elip(x, y, 3, 2.6, [190, 180, 158]);
    set(x - 1, y, [30, 26, 30]);
    set(x + 1, y, [30, 26, 30]);
  };
  for (let k = 0; k < 26; k++) {
    const x = rng.int(110, 610),
      y = rng.int(210, 1110);
    if (borda(x, y) > -0.03) continue;
    if (rng.next() < 0.3) cranio(x, y);
    else osso(x, y, rng.next() * Math.PI);
  }
  // escudo e espada quebrados de quem não voltou
  for (let t = 0; t < 12; t++) set(206 + t, 942 - t * 0.4, [150, 154, 164]);
  elip(196, 948, 6, 6, [110, 70, 50]);
  elip(196, 948, 4, 4, [140, 96, 64]);

  const c = novoCanvas(W, H);
  c.getContext("2d")!.putImageData(img, 0, 0);
  cache = c;
  return c;
};

// gotas pingando no lago, brilho pulsante dos cristais, poeira e morcegos
export const desenharVidaCaverna = (ctx: CanvasRenderingContext2D, f: number) => {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  CRISTAIS.forEach((c, i) => {
    const a = 0.25 + 0.15 * Math.sin(f * 0.05 + i * 1.7);
    const [r, g, b] = c.cor;
    const grad = ctx.createRadialGradient(c.x, c.y - 6, 0, c.x, c.y - 6, 34);
    grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(c.x - 34, c.y - 40, 68, 68);
  });
  // reflexo no lago
  const a = 0.18 + 0.1 * Math.sin(f * 0.2);
  ctx.fillStyle = `rgba(140,180,255,${a})`;
  ctx.fillRect(LAGO.x - 20 + Math.round(Math.sin(f * 0.1) * 4), LAGO.y - 6, 12, 1);
  ctx.fillRect(LAGO.x + 6, LAGO.y + 4, 8, 1);
  ctx.restore();
  // gotas no lago
  for (let i = 0; i < 2; i++) {
    const per = 64 + i * 29;
    const ph = (f + i * 31) % per;
    const x = LAGO.x - 12 + i * 22,
      y = LAGO.y - 2 + i * 6;
    if (ph < 10) {
      ctx.fillStyle = "rgba(170,200,230,0.8)";
      ctx.fillRect(x, y - 20 + ph * 2, 1, 2);
    } else if (ph < 28) {
      const r = (ph - 10) * 0.7;
      ctx.strokeStyle = `rgba(170,200,230,${0.6 * (1 - (ph - 10) / 18)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x + 0.5, y + 0.5, r + 1, (r + 1) * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // poeira
  for (let k = 0; k < 60; k++) {
    const x = (hash3(k, 1) * W + f * (0.08 + hash3(k, 2) * 0.15)) % W;
    const y = (hash3(k, 3) * H + Math.sin(f * 0.02 + k) * 10) % H;
    const al = 0.12 + 0.15 * Math.sin(f * 0.05 + k * 2);
    if (al > 0) {
      ctx.fillStyle = `rgba(220,210,200,${al})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  // morcegos cruzando de vez em quando
  const voos = [
    { v0: 300, y: 260, dir: 1 },
    { v0: 900, y: 520, dir: -1 },
    { v0: 1400, y: 980, dir: 1 },
    { v0: 2000, y: 400, dir: -1 },
  ];
  for (const v of voos) {
    const t = f - v.v0;
    if (t < 0 || t > 120) continue;
    for (let k = 0; k < 3; k++) {
      const x = Math.round(v.dir > 0 ? 60 + t * 5.4 - k * 14 : W - 60 - t * 5.4 + k * 14);
      const y = Math.round(v.y + Math.sin(t * 0.3 + k) * 8 + k * 6);
      const asa = Math.floor(t / 3 + k) % 2;
      ctx.fillStyle = "#1a1418";
      ctx.fillRect(x - 1, y, 3, 2);
      ctx.fillRect(x - 4, y - asa, 3, 1);
      ctx.fillRect(x + 2, y - asa, 3, 1);
      ctx.fillStyle = "#ff3a3a";
      ctx.fillRect(x, y, 1, 1);
    }
  }
};
