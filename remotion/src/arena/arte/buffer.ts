// Operações no buffer RGBA do quadro (360×640): pixels, mistura, sprites com luz, retângulos.
import { RGB } from "./cor";
import { Pintura } from "./tela";

export type Buf = { w: number; h: number; d: Uint8ClampedArray };

export const novoBuf = (w: number, h: number): Buf => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });

export const px = (b: Buf, x: number, y: number, c: RGB, a = 1) => {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const i = (y * b.w + x) * 4;
  if (a >= 1) {
    b.d[i] = c[0];
    b.d[i + 1] = c[1];
    b.d[i + 2] = c[2];
  } else if (a > 0) {
    b.d[i] += (c[0] - b.d[i]) * a;
    b.d[i + 1] += (c[1] - b.d[i + 1]) * a;
    b.d[i + 2] += (c[2] - b.d[i + 2]) * a;
  }
  b.d[i + 3] = 255;
};

/** soma de luz (modo "adicionar") */
export const somar = (b: Buf, x: number, y: number, c: RGB, a = 1) => {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const i = (y * b.w + x) * 4;
  b.d[i] += c[0] * a;
  b.d[i + 1] += c[1] * a;
  b.d[i + 2] += c[2] * a;
};

export const escurecerPx = (b: Buf, x: number, y: number, a: number) => {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const i = (y * b.w + x) * 4;
  b.d[i] *= 1 - a;
  b.d[i + 1] *= 1 - a;
  b.d[i + 2] *= 1 - a;
};

export const ret = (b: Buf, x: number, y: number, w: number, h: number, c: RGB, a = 1) => {
  for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) px(b, xx, yy, c, a);
};

export const elipse = (b: Buf, cx: number, cy: number, rx: number, ry: number, c: RGB, a = 1) => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx;
      const v = (y + 0.5 - cy) / ry;
      if (u * u + v * v <= 1) px(b, x, y, c, a);
    }
};

export const anel = (b: Buf, cx: number, cy: number, rx: number, ry: number, esp: number, c: RGB, a = 1, add = false) => {
  for (let y = Math.floor(cy - ry - esp); y <= Math.ceil(cy + ry + esp); y++)
    for (let x = Math.floor(cx - rx - esp); x <= Math.ceil(cx + rx + esp); x++) {
      const u = (x + 0.5 - cx) / rx;
      const v = (y + 0.5 - cy) / ry;
      const d = Math.abs(Math.sqrt(u * u + v * v) - 1) * Math.min(rx, ry);
      if (d <= esp / 2) (add ? somar : px)(b, x, y, c, a);
    }
};

export const linha = (b: Buf, x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1, esp = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    const y = y0 + ((y1 - y0) * k) / n;
    if (esp <= 1) px(b, x, y, c, a);
    else ret(b, x - esp / 2, y - esp / 2, esp, esp, c, a);
  }
};

export type OptSprite = {
  tinta?: RGB; // multiplicador de luz
  branco?: number; // pisca em branco 0..1
  alfa?: number;
  cinza?: boolean;
  silhueta?: RGB; // pinta tudo com uma cor (sombra/fantasma)
};

/** cola um sprite com luz; pixels emissivos (alfa 254) ignoram a luz */
export const colar = (b: Buf, s: Pintura, x: number, y: number, o: OptSprite = {}) => {
  x = Math.round(x);
  y = Math.round(y);
  const t = o.tinta ?? [1, 1, 1];
  const br = o.branco ?? 0;
  const al = o.alfa ?? 1;
  for (let sy = 0; sy < s.h; sy++) {
    const dy = y + sy;
    if (dy < 0 || dy >= b.h) continue;
    for (let sx = 0; sx < s.w; sx++) {
      const dx = x + sx;
      if (dx < 0 || dx >= b.w) continue;
      const j = (sy * s.w + sx) * 4;
      const sa = s.rgba[j + 3];
      if (sa === 0) continue;
      let r = s.rgba[j];
      let g = s.rgba[j + 1];
      let bl = s.rgba[j + 2];
      if (sa !== 254) {
        r *= t[0];
        g *= t[1];
        bl *= t[2];
      }
      if (o.cinza) {
        const m = r * 0.3 + g * 0.55 + bl * 0.15;
        r = g = bl = m * 0.8;
      }
      if (o.silhueta) [r, g, bl] = o.silhueta;
      if (br > 0) {
        r += (255 - r) * br;
        g += (255 - g) * br;
        bl += (255 - bl) * br;
      }
      const i = (dy * b.w + dx) * 4;
      if (al >= 1) {
        b.d[i] = r;
        b.d[i + 1] = g;
        b.d[i + 2] = bl;
      } else {
        b.d[i] += (r - b.d[i]) * al;
        b.d[i + 1] += (g - b.d[i + 1]) * al;
        b.d[i + 2] += (bl - b.d[i + 2]) * al;
      }
      b.d[i + 3] = 255;
    }
  }
};

/** cola ampliado (vizinho mais próximo) */
export const colarEscala = (b: Buf, s: Pintura, x: number, y: number, k: number, o: OptSprite = {}) => {
  const big: Pintura = { w: s.w * k, h: s.h * k, rgba: new Uint8ClampedArray(s.w * k * s.h * k * 4) };
  for (let yy = 0; yy < big.h; yy++)
    for (let xx = 0; xx < big.w; xx++) {
      const j = (Math.floor(yy / k) * s.w + Math.floor(xx / k)) * 4;
      const i = (yy * big.w + xx) * 4;
      big.rgba[i] = s.rgba[j];
      big.rgba[i + 1] = s.rgba[j + 1];
      big.rgba[i + 2] = s.rgba[j + 2];
      big.rgba[i + 3] = s.rgba[j + 3];
    }
  colar(b, big, x, y, o);
};
