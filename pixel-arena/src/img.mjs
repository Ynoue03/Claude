// Buffer RGBA simples (Uint32, little-endian: 0xAABBGGRR) — toda a arte é desenhada aqui, pixel a pixel.
export const rgba = (r, g, b, a = 255) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
export const canal = (c) => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24];
export const hex = (h, a = 255) => {
  const n = parseInt(h.replace('#', ''), 16);
  return rgba((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
};
export const comAlfa = (c, a) => ((c & 0xffffff) | ((a & 255) << 24)) >>> 0;

export class Img {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint32Array(w * h);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }
  set(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = c;
  }
  // mistura alfa (c com alfa próprio, multiplicado por k)
  mix(x, y, c, k = 1) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const a = ((c >>> 24) / 255) * k;
    if (a <= 0) return;
    const i = y * this.w + x;
    if (a >= 1) { this.d[i] = c | 0xff000000; return; }
    const o = this.d[i];
    const oa = (o >>> 24) / 255;
    const na = a + oa * (1 - a);
    const f = (s, sh) => {
      const cs = (c >>> sh) & 255, os = (o >>> sh) & 255;
      return na > 0 ? Math.round((cs * a + os * oa * (1 - a)) / na) : 0;
    };
    this.d[i] = rgba(f(0, 0), f(0, 8), f(0, 16), Math.round(na * 255));
  }
  // soma de luz (brilhos, efeitos)
  add(x, y, c, k = 1) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    const o = this.d[i];
    const a = ((c >>> 24) / 255) * k;
    const s = (sh) => Math.min(255, ((o >>> sh) & 255) + Math.round(((c >>> sh) & 255) * a));
    this.d[i] = rgba(s(0), s(8), s(16), Math.max(o >>> 24, Math.round(a * 255)));
  }
  fill(c) { this.d.fill(c); return this; }
  rect(x, y, w, h, c, k = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (k >= 1 && (c >>> 24) === 255) this.set(x + i, y + j, c); else this.mix(x + i, y + j, c, k);
    }
  }
  // borda de 1 px
  moldura(x, y, w, h, c) {
    for (let i = 0; i < w; i++) { this.set(x + i, y, c); this.set(x + i, y + h - 1, c); }
    for (let j = 0; j < h; j++) { this.set(x, y + j, c); this.set(x + w - 1, y + j, c); }
  }
  linha(x0, y0, x1, y1, c, k = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.mix(x0, y0, c, k);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  elipse(cx, cy, rx, ry, c, k = 1, aditivo = false) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        if (u * u + v * v <= 1) aditivo ? this.add(x, y, c, k) : this.mix(x, y, c, k);
      }
  }
  // copia src em (dx,dy); opções: flip, k (opacidade), tinta (cor sólida p/ piscar), cinza
  blit(src, dx, dy, o = {}) {
    dx = Math.round(dx); dy = Math.round(dy);
    const k = o.k ?? 1;
    for (let y = 0; y < src.h; y++) {
      const ty = dy + y;
      if (ty < 0 || ty >= this.h) continue;
      for (let x = 0; x < src.w; x++) {
        let c = src.d[y * src.w + (o.flip ? src.w - 1 - x : x)];
        if ((c >>> 24) === 0) continue;
        if (o.tinta !== undefined) {
          const t = o.tinta, f = o.tintaK ?? 1;
          const m = (sh) => Math.round(((c >>> sh) & 255) * (1 - f) + ((t >>> sh) & 255) * f);
          c = rgba(m(0), m(8), m(16), c >>> 24);
        }
        if (o.cinza) {
          const [r, g, b, a] = canal(c);
          const l = Math.round((r * 0.3 + g * 0.59 + b * 0.11) * 0.8 + 20);
          c = rgba(l, l, l, a);
        }
        if (k >= 1 && (c >>> 24) === 255) this.set(dx + x, ty, c); else this.mix(dx + x, ty, c, k);
      }
    }
  }
  // cópia escalada (vizinho mais próximo) — só para retratos grandes
  blitEscala(src, dx, dy, s, o = {}) {
    const w = Math.round(src.w * s), h = Math.round(src.h * s);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = src.d[Math.floor(y / s) * src.w + Math.floor((o.flip ? w - 1 - x : x) / s)];
      if ((c >>> 24) === 0) continue;
      this.mix(dx + x, dy + y, c, o.k ?? 1);
    }
  }
  clone() { const n = new Img(this.w, this.h); n.d.set(this.d); return n; }
}
