// "Tela" de rasterização de pixel art: cada pixel guarda um material e uma luz (normal · direção da luz).
// No fim, `pintar` quantiza a luz em tons da rampa do material, aplica texturas, linhas internas
// coloridas, contorno seletivo (sel-out) e rim light. Luz vem do alto à esquerda.
import { escurecer, misturar, RGB } from "./cor";

export type Textura = "liso" | "malha" | "madeira" | "tecido" | "cabelo" | "escama" | "pelo" | "couro" | "metal" | "pedra";

export type Material = {
  rampa: RGB[]; // 5 tons
  textura: Textura;
  brilhante?: boolean; // permite o tom de brilho especular
  emissivo?: boolean; // não escurece com a penumbra (cristal, orbe, olhos no elmo)
  semLinha?: boolean; // não recebe linha interna (olhos, detalhes pequenos)
};

const L = (() => {
  const v = [-0.5, -0.62, 0.6];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
})();

export const VAZIO = -1;

export class Tela {
  w: number;
  h: number;
  mat: Int16Array;
  luz: Float32Array;
  tom: Int8Array; // tom forçado (-1 = automático)
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.mat = new Int16Array(w * h).fill(VAZIO);
    this.luz = new Float32Array(w * h);
    this.tom = new Int8Array(w * h).fill(-1);
  }

  dentro(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number) {
    return this.dentro(x, y) ? this.mat[y * this.w + x] : VAZIO;
  }

  set(x: number, y: number, m: number, luz: number, tom = -1) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.dentro(x, y)) return;
    const i = y * this.w + x;
    this.mat[i] = m;
    this.luz[i] = luz;
    this.tom[i] = tom;
  }

  apagar(x: number, y: number) {
    if (!this.dentro(x, y)) return;
    this.mat[y * this.w + x] = VAZIO;
  }

  /** pixel com tom explícito (0..4) */
  px(x: number, y: number, m: number, tom = 2) {
    this.set(x, y, m, 0, tom);
  }

  /** muda só o tom de um pixel já pintado */
  tonalizar(x: number, y: number, delta: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.dentro(x, y)) return;
    const i = y * this.w + x;
    if (this.mat[i] === VAZIO) return;
    const base = this.tom[i] >= 0 ? this.tom[i] : quantizar(this.luz[i], false);
    this.tom[i] = Math.max(0, Math.min(4, base + delta));
  }

  /** elipse sombreada como esfera */
  elipse(cx: number, cy: number, rx: number, ry: number, m: number, extra = 0, clip?: (x: number, y: number) => boolean) {
    const x0 = Math.floor(cx - rx - 1);
    const x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1);
    const y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const u = (x + 0.5 - cx) / rx;
        const v = (y + 0.5 - cy) / ry;
        const r2 = u * u + v * v;
        if (r2 > 1) continue;
        if (clip && !clip(x, y)) continue;
        const nz = Math.sqrt(1 - r2);
        this.set(x, y, m, u * L[0] + v * L[1] + nz * L[2] + extra);
      }
  }

  /** traço grosso com pontas arredondadas, sombreado como cilindro */
  capsula(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, m: number, extra = 0) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1e-6;
    const len = Math.sqrt(len2);
    const px = -dy / len;
    const py = dx / len;
    const rmax = Math.max(r0, r1);
    const bx0 = Math.floor(Math.min(x0, x1) - rmax - 1);
    const bx1 = Math.ceil(Math.max(x0, x1) + rmax + 1);
    const by0 = Math.floor(Math.min(y0, y1) - rmax - 1);
    const by1 = Math.ceil(Math.max(y0, y1) + rmax + 1);
    for (let y = by0; y <= by1; y++)
      for (let x = bx0; x <= bx1; x++) {
        const qx = x + 0.5 - x0;
        const qy = y + 0.5 - y0;
        let t = (qx * dx + qy * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const r = r0 + (r1 - r0) * t;
        const ex = qx - dx * t;
        const ey = qy - dy * t;
        const d = Math.hypot(ex, ey);
        if (d > r) continue;
        const s = Math.max(-1, Math.min(1, (ex * px + ey * py) / Math.max(0.5, r)));
        const nz = Math.sqrt(Math.max(0, 1 - s * s));
        this.set(x, y, m, px * s * L[0] + py * s * L[1] + nz * L[2] + extra);
      }
  }

  /** polígono preenchido; modelo "cil" = cilindro vertical (tronco, mantos), "plano" = superfície reta */
  poli(pts: number[], m: number, modelo: "cil" | "plano" = "cil", extra = 0) {
    let ymin = Infinity;
    let ymax = -Infinity;
    for (let i = 1; i < pts.length; i += 2) {
      ymin = Math.min(ymin, pts[i]);
      ymax = Math.max(ymax, pts[i]);
    }
    const n = pts.length / 2;
    for (let y = Math.floor(ymin); y <= Math.ceil(ymax); y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < n; i++) {
        const ax = pts[i * 2];
        const ay = pts[i * 2 + 1];
        const bx = pts[((i + 1) % n) * 2];
        const by = pts[((i + 1) % n) * 2 + 1];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = xs[k];
        const xb = xs[k + 1];
        const mid = (xa + xb) / 2;
        const half = Math.max(0.5, (xb - xa) / 2);
        const vy = ((yc - ymin) / Math.max(1, ymax - ymin)) * 2 - 1;
        for (let x = Math.round(xa); x < Math.round(xb); x++) {
          let luz: number;
          if (modelo === "cil") {
            const u = Math.max(-1, Math.min(1, (x + 0.5 - mid) / half));
            const nz = Math.sqrt(1 - u * u);
            luz = u * L[0] + vy * 0.25 * L[1] + nz * L[2];
          } else luz = 0.45 - vy * 0.15;
          this.set(x, y, m, luz + extra);
        }
      }
    }
  }

  /** linha de 1 px (Bresenham) com tom fixo */
  linha(x0: number, y0: number, x1: number, y1: number, m: number, tom = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, m, tom);
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

  /** desenha um gabarito ASCII: cada letra → [material, tom] */
  gabarito(x: number, y: number, linhas: string[], mapa: Record<string, [number, number]>, espelhar = false) {
    for (let j = 0; j < linhas.length; j++) {
      const s = linhas[j];
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        const e = mapa[c];
        if (!e) continue;
        const xx = espelhar ? x + (s.length - 1 - i) : x + i;
        if (e[0] === VAZIO) this.apagar(xx, y + j);
        else this.px(xx, y + j, e[0], e[1]);
      }
    }
  }

  /** espelha horizontalmente */
  espelhar() {
    const { w, h } = this;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w / 2; x++) {
        const a = y * w + x;
        const b = y * w + (w - 1 - x);
        const tm = this.mat[a];
        this.mat[a] = this.mat[b];
        this.mat[b] = tm;
        const tl = this.luz[a];
        // a luz espelhada inverteria o lado iluminado; mantemos a luz do alto à esquerda
        this.luz[a] = this.luz[b];
        this.luz[b] = tl;
        const tt = this.tom[a];
        this.tom[a] = this.tom[b];
        this.tom[b] = tt;
      }
  }
}

const quantizar = (luz: number, brilhante: boolean) => {
  if (brilhante && luz > 0.93) return 4;
  if (luz > 0.74) return 3;
  if (luz > 0.18) return 2;
  if (luz > -0.3) return 1;
  return 0;
};

const ruido = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export type Pintura = {
  w: number;
  h: number;
  rgba: Uint8ClampedArray; // alfa 255 = normal, 254 = emissivo (não escurece)
};

/**
 * Converte a tela em RGBA: tons, texturas, linhas internas, contorno seletivo e rim light.
 * `semente` varia as texturas entre personagens.
 */
export const pintar = (t: Tela, mats: Material[], semente = 1, opts: { contorno?: boolean; rim?: boolean } = {}): Pintura => {
  const { w, h } = t;
  const tons = new Int8Array(w * h).fill(-1);
  // 1) tom de cada pixel
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const m = t.mat[i];
      if (m === VAZIO) continue;
      const M = mats[m];
      let tom = t.tom[i] >= 0 ? t.tom[i] : quantizar(t.luz[i], !!M.brilhante);
      if (t.tom[i] < 0) {
        switch (M.textura) {
          case "malha":
            if ((x + (y >> 1)) % 2 === 0 && y % 2 === 0) tom -= 1;
            else if ((x + y) % 2 === 1 && tom < 3) tom += y % 2 === 1 ? 1 : 0;
            break;
          case "madeira":
            if (ruido(x >> 0, y >> 2, semente) < 0.28) tom -= 1;
            break;
          case "tecido":
            if (ruido(x, 0, semente + 3) < 0.18 && tom > 0) tom -= 1;
            break;
          case "cabelo": {
            const mecha = (x + (y >> 2) + semente) % 4;
            if (mecha === 0 && tom > 0) tom -= 1;
            break;
          }
          case "escama":
            if (y % 2 === 0 && (x + (y % 4 === 0 ? 0 : 2)) % 4 === 0) tom -= 1;
            else if (y % 2 === 1 && (x + (y % 4 === 1 ? 1 : 3)) % 4 === 0 && tom < 3) tom += 1;
            break;
          case "pelo":
            if (ruido(x, y, semente + 7) < 0.3) tom += ruido(x, y, semente) < 0.5 ? -1 : 1;
            break;
          case "pedra":
            if (ruido(x, y, semente + 9) < 0.15) tom -= 1;
            break;
          default:
            break;
        }
        // linha interna colorida: borda inferior/direita de cada peça escurece
        if (!M.semLinha) {
          const b = t.get(x, y + 1);
          const d = t.get(x + 1, y);
          if ((b !== VAZIO && b !== m && !mats[b].semLinha) || (d !== VAZIO && d !== m && !mats[d].semLinha)) tom -= 1;
        }
      }
      tons[i] = Math.max(0, Math.min(4, tom));
    }

  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const m = t.mat[i];
    if (m === VAZIO) continue;
    const M = mats[m];
    let c = M.rampa[tons[i]];
    const x = i % w;
    const y = (i / w) | 0;
    // rim light frio do lado oposto à luz (direita)
    if (opts.rim !== false && t.get(x + 1, y) === VAZIO && tons[i] <= 2 && !M.emissivo) c = misturar(c, [150, 200, 255], 0.28);
    rgba[i * 4] = c[0];
    rgba[i * 4 + 1] = c[1];
    rgba[i * 4 + 2] = c[2];
    rgba[i * 4 + 3] = M.emissivo ? 254 : 255;
  }

  // 2) contorno seletivo: escuro por fora, puxado para a cor de dentro do lado da luz
  if (opts.contorno !== false) {
    const out = new Uint8ClampedArray(rgba);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (t.mat[i] !== VAZIO) continue;
        let viz = -1;
        let ladoLuz = false;
        const cand: [number, number, boolean][] = [
          [x + 1, y, true],
          [x, y + 1, true],
          [x - 1, y, false],
          [x, y - 1, false],
        ];
        for (const [xx, yy, luz] of cand) {
          const m = t.get(xx, yy);
          if (m !== VAZIO) {
            viz = m;
            ladoLuz = luz;
            break;
          }
        }
        if (viz < 0) continue;
        const base = mats[viz].rampa[0];
        const c = escurecer(base, ladoLuz ? 0.45 : 0.72);
        out[i * 4] = c[0];
        out[i * 4 + 1] = c[1];
        out[i * 4 + 2] = c[2];
        out[i * 4 + 3] = 255;
      }
    return { w, h, rgba: out };
  }
  return { w, h, rgba };
};
