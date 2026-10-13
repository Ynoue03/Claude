// Motor de pixel art: desenha formas em um buffer de "material + tom" e só no fim converte em cores,
// com rampas que puxam a sombra para roxo/azul e a luz para amarelo (hue shifting),
// contorno seletivo (sel-out) e rim light. Luz vem do alto à esquerda.

export type Tom = 0 | 1 | 2 | 3 | 4; // 0 brilho · 1 base · 2 sombra · 3 sombra profunda · 4 especular

// ───────────── cores ─────────────
export const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const rgbHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = 0;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
};
const hslRgb = (h: number, s: number, l: number): [number, number, number] => {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};
// gira o matiz em direção a um alvo (graus) por `q` graus
const puxar = (h: number, alvo: number, q: number) => {
  const d = ((alvo - h + 540) % 360) - 180;
  if (Math.abs(d) < q) return alvo;
  return h + Math.sign(d) * q;
};
export const variar = (hex: string, dl: number, dh = 0, ds = 1, alvoH = -1) => {
  const [h, s, l] = rgbHsl(...hexRgb(hex));
  const nh = alvoH >= 0 ? puxar(h, alvoH, dh) : h + dh;
  return rgbHex(...hslRgb(nh, Math.max(0, Math.min(1, s * ds)), Math.max(0.02, Math.min(0.97, l + dl))));
};

// Rampa de 6 cores: [brilho, base, sombra, profunda, especular, contorno]
export type Rampa = [string, string, string, string, string, string];
export const rampa = (base: string, forte = 1): Rampa => {
  const [, s, l] = rgbHsl(...hexRgb(base));
  const k = l > 0.75 ? 0.75 : 1; // tons muito claros escurecem menos para não "lavar"
  return [
    variar(base, 0.11 * forte * (l > 0.85 ? 0.4 : 1), 10, 0.92, 55),
    base,
    variar(base, -0.13 * forte * k, 14, s < 0.15 ? 1 : 1.08, 255),
    variar(base, -0.25 * forte * k, 24, s < 0.15 ? 1 : 1.05, 260),
    variar(base, 0.3, 14, 0.5, 55),
    variar(base, -0.36 * k, 28, 0.9, 265),
  ];
};

// ───────────── tela de desenho ─────────────
export type FnTom = (nx: number, ny: number, x: number, y: number) => Tom;
const LX = -0.62,
  LY = -0.78;
// tom volumétrico: normal aproximada da forma vs. luz do alto à esquerda
export const tomVol =
  (bias = 0): FnTom =>
  (nx, ny) => {
    const b = nx * LX + ny * LY + bias;
    return b > 0.5 ? 0 : b > -0.18 ? 1 : b > -0.62 ? 2 : 3;
  };
export const tomCil =
  (bias = 0): FnTom =>
  (nx) => {
    const b = nx * LX * 1.3 + bias;
    return b > 0.55 ? 0 : b > -0.25 ? 1 : b > -0.7 ? 2 : 3;
  };
export const tomFixo =
  (t: Tom): FnTom =>
  () =>
    t;

export type OpForma = { tom?: FnTom; linha?: boolean; so?: (x: number, y: number) => boolean; padrao?: (x: number, y: number, t: Tom) => Tom };

export class Tela {
  w: number;
  h: number;
  m: Int16Array;
  t: Int8Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.m = new Int16Array(w * h).fill(-1);
    this.t = new Int8Array(w * h);
  }
  dentro(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  px(x: number, y: number, mat: number, tom: Tom) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.dentro(x, y)) return;
    const i = y * this.w + x;
    this.m[i] = mat;
    this.t[i] = tom;
  }
  get(x: number, y: number) {
    if (!this.dentro(x, y)) return -1;
    return this.m[y * this.w + x];
  }
  tom(x: number, y: number) {
    return this.t[y * this.w + x] as Tom;
  }
  setTom(x: number, y: number, t: Tom) {
    if (this.dentro(x, y) && this.m[y * this.w + x] >= 0) this.t[y * this.w + x] = t;
  }
  apagar(x: number, y: number) {
    if (this.dentro(x, y)) this.m[y * this.w + x] = -1;
  }

  // pinta uma máscara de pixels com normais
  private pintar(px: [number, number, number, number][], mat: number, op: OpForma, tomPadrao: FnTom) {
    const fn = op.tom ?? tomPadrao;
    const set = op.linha ? new Set(px.map(([x, y]) => y * this.w + x)) : null;
    for (const [x, y, nx, ny] of px) {
      if (!this.dentro(x, y)) continue;
      if (op.so && !op.so(x, y)) continue;
      let t = fn(nx, ny, x, y);
      if (op.padrao) t = op.padrao(x, y, t);
      this.m[y * this.w + x] = mat;
      this.t[y * this.w + x] = t;
    }
    if (set) {
      // linha interna colorida: borda da peça que encosta em outra peça já pintada
      for (const [x, y] of px) {
        if (!this.dentro(x, y) || (op.so && !op.so(x, y))) continue;
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
          [-1, 0],
          [0, -1],
        ]) {
          const k = (y + dy) * this.w + (x + dx);
          if (!this.dentro(x + dx, y + dy) || set.has(k)) continue;
          if (this.m[k] >= 0 && this.m[k] !== mat) {
            const i = y * this.w + x;
            if (dy > 0 || dx > 0) this.t[i] = 3;
            else this.t[i] = Math.max(this.t[i], 2) as Tom;
            break;
          }
        }
      }
    }
  }

  elipse(cx: number, cy: number, rx: number, ry: number, mat: number, op: OpForma = {}) {
    const px: [number, number, number, number][] = [];
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + 0.5 - cx) / Math.max(0.5, rx),
          ny = (y + 0.5 - cy) / Math.max(0.5, ry);
        if (nx * nx + ny * ny <= 1.0) px.push([x, y, nx, ny]);
      }
    this.pintar(px, mat, op, tomVol());
  }

  ret(x0: number, y0: number, x1: number, y1: number, mat: number, op: OpForma = {}) {
    const px: [number, number, number, number][] = [];
    const cx = (x0 + x1 + 1) / 2,
      cy = (y0 + y1 + 1) / 2;
    const hw = Math.max(1, (x1 - x0 + 1) / 2),
      hh = Math.max(1, (y1 - y0 + 1) / 2);
    for (let y = Math.round(y0); y <= Math.round(y1); y++)
      for (let x = Math.round(x0); x <= Math.round(x1); x++) px.push([x, y, (x + 0.5 - cx) / hw, (y + 0.5 - cy) / hh]);
    this.pintar(px, mat, op, tomCil());
  }

  poli(pts: [number, number][], mat: number, op: OpForma = {}) {
    const xs = pts.map((p) => p[0]),
      ys = pts.map((p) => p[1]);
    const x0 = Math.floor(Math.min(...xs)),
      x1 = Math.ceil(Math.max(...xs));
    const y0 = Math.floor(Math.min(...ys)),
      y1 = Math.ceil(Math.max(...ys));
    const cx = (x0 + x1) / 2,
      cy = (y0 + y1) / 2,
      hw = Math.max(1, (x1 - x0) / 2),
      hh = Math.max(1, (y1 - y0) / 2);
    const px: [number, number, number, number][] = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const X = x + 0.5,
          Y = y + 0.5;
        let dentro = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i],
            [xj, yj] = pts[j];
          if (yi > Y !== yj > Y && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) dentro = !dentro;
        }
        if (dentro) px.push([x, y, (X - cx) / hw, (Y - cy) / hh]);
      }
    this.pintar(px, mat, op, tomVol());
  }

  // traço grosso com pontas redondas; sombreado atravessando a largura (cilindro)
  capsula(x0: number, y0: number, x1: number, y1: number, r: number, mat: number, op: OpForma = {}) {
    const dx = x1 - x0,
      dy = y1 - y0;
    const L2 = dx * dx + dy * dy || 1;
    const L = Math.sqrt(L2);
    const px: [number, number, number, number][] = [];
    for (let y = Math.floor(Math.min(y0, y1) - r - 1); y <= Math.ceil(Math.max(y0, y1) + r + 1); y++)
      for (let x = Math.floor(Math.min(x0, x1) - r - 1); x <= Math.ceil(Math.max(x0, x1) + r + 1); x++) {
        const X = x + 0.5,
          Y = y + 0.5;
        const t = Math.max(0, Math.min(1, ((X - x0) * dx + (Y - y0) * dy) / L2));
        const qx = x0 + dx * t,
          qy = y0 + dy * t;
        const d = Math.hypot(X - qx, Y - qy);
        if (d <= r + 0.02) {
          // normal perpendicular ao eixo
          const pxn = (X - qx) / Math.max(0.5, r),
            pyn = (Y - qy) / Math.max(0.5, r);
          px.push([x, y, pxn - (dy / L) * 0, pyn]);
        }
      }
    this.pintar(px, mat, op, tomVol(0.1));
  }

  linha(x0: number, y0: number, x1: number, y1: number, mat: number, tom: Tom, so?: (x: number, y: number) => boolean) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (!so || so(x0, y0)) this.px(x0, y0, mat, tom);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // escurece/clareia os pixels já pintados de um material numa região
  tonalizar(fn: (x: number, y: number, mat: number, t: Tom) => Tom | -1) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.m[i] < 0) continue;
        const r = fn(x, y, this.m[i], this.t[i] as Tom);
        if (r === -1) this.m[i] = -1;
        else this.t[i] = r;
      }
  }

  // converte para ImageData com contorno seletivo e rim light
  cores(rampas: Rampa[], op: { contorno?: boolean; rim?: boolean } = {}): ImageData {
    const { w, h, m, t } = this;
    const img = new ImageData(w, h);
    const d = img.data;
    const rgb = rampas.map((r) => r.map((c) => hexRgb(c)));
    const tt = new Int8Array(t);
    if (op.rim !== false) {
      for (let y = 0; y < h; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (m[i] < 0) continue;
          if (m[i + 1] < 0 && m[i - 1] >= 0 && tt[i] >= 2 && tt[i] !== 4) tt[i] = (tt[i] - 1) as Tom;
        }
    }
    for (let i = 0; i < w * h; i++) {
      if (m[i] < 0) continue;
      const c = rgb[m[i]][tt[i]];
      d[i * 4] = c[0];
      d[i * 4 + 1] = c[1];
      d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = 255;
    }
    if (op.contorno !== false) {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (m[i] >= 0) continue;
          // vizinho à direita/abaixo => lado iluminado do sprite: contorno mais claro (sel-out)
          let viz = -1,
            claro = false;
          if (x + 1 < w && m[i + 1] >= 0) {
            viz = m[i + 1];
            claro = y > 0 && m[i - w + 1] < 0;
          } else if (y + 1 < h && m[i + w] >= 0) {
            viz = m[i + w];
            claro = true;
          } else if (x > 0 && m[i - 1] >= 0) viz = m[i - 1];
          else if (y > 0 && m[i - w] >= 0) viz = m[i - w];
          if (viz < 0) continue;
          const c = rgb[viz][claro ? 3 : 5];
          d[i * 4] = c[0];
          d[i * 4 + 1] = c[1];
          d[i * 4 + 2] = c[2];
          d[i * 4 + 3] = 255;
        }
    }
    return img;
  }
}

export const novoCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
