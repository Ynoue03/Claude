// Tela de rótulos: desenha-se por PARTES (regiões); o sombreamento, as linhas internas coloridas
// e o contorno seletivo (sel-out) são calculados depois, como um pixel artist faria à mão.
import { Img } from '../img.mjs';

const h32 = (a, b, c) => {
  let x = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

export class Tela {
  /** mats: lista de rampas (ver cores.mjs) */
  constructor(w, h, mats) {
    this.w = w; this.h = h; this.mats = mats;
    this.parte_ = new Int16Array(w * h).fill(-1);
    this.mat = new Int16Array(w * h);
    this.tomFixo = new Int8Array(w * h).fill(-1);
    this.decal = new Uint32Array(w * h);
    this.partes = [];
    this.flip = false;
  }
  X(x) { return this.flip ? this.w - 1 - x : x; }
  parte(mat, o = {}) {
    this.partes.push({ mat, ...o });
    return this.partes.length - 1;
  }
  px(id, x, y, mat) {
    x = Math.round(x); y = Math.round(y);
    const fx = this.X(x);
    if (fx < 0 || y < 0 || fx >= this.w || y >= this.h) return;
    const i = y * this.w + fx;
    const p = this.partes[id];
    this.parte_[i] = id;
    this.mat[i] = mat ?? (p.matFn ? p.matFn(x, y) : p.mat);
    this.tomFixo[i] = p.tom ?? -1;
    this.decal[i] = 0;
  }
  limpa(x, y) {
    const fx = this.X(Math.round(x)); y = Math.round(y);
    if (fx < 0 || y < 0 || fx >= this.w || y >= this.h) return;
    this.parte_[y * this.w + fx] = -1; this.decal[y * this.w + fx] = 0;
  }
  // só pinta onde já existe a parte `dentro` (máscara)
  pxEm(id, dentro, x, y, mat) {
    const fx = this.X(Math.round(x)); y = Math.round(y);
    if (fx < 0 || y < 0 || fx >= this.w || y >= this.h) return;
    const q = this.parte_[y * this.w + fx];
    if (Array.isArray(dentro) ? dentro.includes(q) : q === dentro) this.px(id, x, y, mat);
  }
  qual(x, y) {
    const fx = this.X(Math.round(x)); y = Math.round(y);
    if (fx < 0 || y < 0 || fx >= this.w || y >= this.h) return -1;
    return this.parte_[y * this.w + fx];
  }
  elipse(id, cx, cy, rx, ry, mascara) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        if (u * u + v * v <= 1) mascara !== undefined ? this.pxEm(id, mascara, x, y) : this.px(id, x, y);
      }
  }
  poli(id, pts, mascara) {
    let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
    for (const [x, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + 0.5, py = y + 0.5;
        let dentro = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
        }
        if (dentro) mascara !== undefined ? this.pxEm(id, mascara, x, y) : this.px(id, x, y);
      }
  }
  // cápsula (membros): segmento com raio variando de r0 a r1
  capsula(id, x0, y0, x1, y1, r0, r1 = r0, mascara) {
    const minx = Math.floor(Math.min(x0 - r0, x1 - r1) - 1), maxx = Math.ceil(Math.max(x0 + r0, x1 + r1) + 1);
    const miny = Math.floor(Math.min(y0 - r0, y1 - r1) - 1), maxy = Math.ceil(Math.max(y0 + r0, y1 + r1) + 1);
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2));
      const qx = x0 + dx * t, qy = y0 + dy * t, r = r0 + (r1 - r0) * t;
      if ((px - qx) ** 2 + (py - qy) ** 2 <= r * r) mascara !== undefined ? this.pxEm(id, mascara, x, y) : this.px(id, x, y);
    }
  }
  ret(id, x, y, w, h, mascara) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
      mascara !== undefined ? this.pxEm(id, mascara, x + i, y + j) : this.px(id, x + i, y + j);
  }
  // detalhes pintados por cima do sombreado (rosto, símbolos, dobras)
  d(x, y, cor) {
    x = Math.round(x); y = Math.round(y);
    const fx = this.X(x);
    if (fx < 0 || y < 0 || fx >= this.w || y >= this.h || cor === undefined) return;
    if (this.parte_[y * this.w + fx] < 0) return; // decal nunca sai da silhueta
    this.decal[y * this.w + fx] = cor;
  }
  // decal que também cria pixel (ex.: fios soltos, gota de suor fora da cabeça)
  dForte(x, y, cor, id) {
    if (this.qual(x, y) < 0) this.px(id, x, y);
    this.d(x, y, cor);
  }
  tom(mat, t) { return this.mats[mat].tons[t]; }
  // decal no tom `t` do material que já está no pixel (dobras de tecido, vincos)
  dTom(x, y, t) {
    const fx = this.X(Math.round(x)); y = Math.round(y);
    if (fx < 0 || y < 0 || fx >= this.w || y >= this.h) return;
    const i = y * this.w + fx;
    if (this.parte_[i] < 0) return;
    this.decal[i] = this.mats[this.mat[i]].tons[t];
  }
  parteEm(x, y) { return this.qual(x, y); }
  // linha de decal
  dLinha(x0, y0, x1, y1, cor) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.d(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), cor);
  }

  /** rasga roupas: furos mostrando pele + barras desfiadas */
  rasgar(semente, pele) {
    const { w, h } = this;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, p = this.parte_[i];
      if (p < 0 || !this.partes[p].pano) continue;
      const abaixo = y + 1 < h ? this.parte_[i + w] : -1;
      if (abaixo !== p && h32(x, y, semente) < 0.45) { this.parte_[i] = -1; continue; }
      if (h32(x >> 1, (y + 1) >> 1, semente + 7) < 0.075 && h32(x, y, semente + 3) < 0.8) this.mat[i] = pele;
    }
  }

  render() {
    const { w, h } = this;
    const P = this.parte_;
    const out = new Img(w, h);
    const tom = new Int8Array(w * h);
    const em = (x, y, p) => x >= 0 && y >= 0 && x < w && y < h && P[y * w + x] === p;
    const passos = (x, y, p, dx, dy, max) => { let n = 0; while (n < max && em(x + dx * (n + 1), y + dy * (n + 1), p)) n++; return n; };
    // caixas das partes (para faixas de sombra proporcionais)
    const caixa = this.partes.map(() => [1e9, 1e9, -1e9, -1e9]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = P[y * w + x]; if (p < 0) continue;
      const c = caixa[p]; c[0] = Math.min(c[0], x); c[1] = Math.min(c[1], y); c[2] = Math.max(c[2], x); c[3] = Math.max(c[3], y);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, p = P[i];
      if (p < 0) continue;
      const parte = this.partes[p];
      if (this.tomFixo[i] >= 0) { tom[i] = this.tomFixo[i]; continue; }
      const c = caixa[p], grande = Math.min(c[2] - c[0], c[3] - c[1]) >= (parte.limiar ?? 9) * (parte.esc ?? 1);
      const k = parte.esc ?? 1, mx = Math.max(3, Math.round(3 * k));
      const sd = passos(x, y, p, 0, 1, mx), sr = passos(x, y, p, 1, 0, mx), s = passos(x, y, p, 1, 1, mx);
      const lu = passos(x, y, p, 0, -1, mx), ll = passos(x, y, p, -1, 0, mx), l = passos(x, y, p, -1, -1, mx);
      const kd = Math.max(1, Math.round(k * 0.6)), kl = Math.max(1, Math.round(k * 0.7));
      let t = 2;
      const faixa = grande ? Math.max(1, Math.round(k * 1.2)) : 0;
      if ((sd < kd && sr < kd) || (sd < kd && s < kd)) t = 0;
      else if (s <= faixa || sd < kd || (grande && sr < kd)) t = 1;
      else if ((lu < kl || l < kl || (ll < kl && lu <= 2 * k)) && s >= 2 * k) t = 3;
      if (k > 1.5 && t === 3 && lu < kl && l < kl * 2 && (x + y) % 2 === 0) t = 4;
      // vertical: metade de baixo de partes grandes um pouco mais escura (oclusão)
      if (grande && t === 2 && parte.oclusao && y > c[1] + (c[3] - c[1]) * 0.72) t = 1;
      // rim light: borda direita exposta ao vazio, metade de cima
      if (parte.rim !== false && x + 1 < w && P[i + 1] < 0 && t <= 1 && y < c[1] + (c[3] - c[1]) * 0.6 && lu > 0) t = 2;
      tom[i] = t;
    }
    // linhas internas coloridas: a parte de trás ganha sombra profunda onde encosta numa parte da frente
    const linha = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, p = P[i];
      if (p < 0 || this.partes[p].semLinha) continue;
      for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = P[ny * w + nx];
        if (q > p && !this.partes[q].semLinhaSobre) { linha[i] = 1; break; }
      }
      // borda de furo (roupa rasgada)
      if (this.partes[p].pano && this.mat[i] !== this.partes[p].mat) continue;
      if (this.partes[p].pano) for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
        const j = (y + dy) * w + x + dx;
        if (P[j] === p && this.mat[j] !== this.mat[i]) { linha[i] = 2; }
      }
    }
    for (let i = 0; i < w * h; i++) {
      const p = P[i];
      if (p < 0) continue;
      const r = this.mats[this.mat[i]];
      let t = tom[i];
      if (linha[i]) t = 0;
      out.d[i] = this.decal[i] || r.tons[Math.max(0, Math.min(4, t))];
    }
    // contorno seletivo: por fora, cor do material vizinho (mais clara no lado iluminado)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (P[i] >= 0) continue;
      let alvo = -1, lado = 0;
      const viz = [[1, 0, 1], [0, 1, 1], [-1, 0, 0], [0, -1, 0]]; // vizinho à direita/abaixo => este pixel está do lado da luz
      for (const [dx, dy, luz] of viz) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = P[ny * w + nx];
        if (q >= 0 && !this.partes[q].semContorno) {
          if (alvo < 0 || luz === 0) { alvo = ny * w + nx; lado = luz; }
        }
      }
      if (alvo < 0) continue;
      const r = this.mats[this.mat[alvo]];
      out.d[i] = lado ? r.contornoLuz : r.contorno;
    }
    return out;
  }
}
