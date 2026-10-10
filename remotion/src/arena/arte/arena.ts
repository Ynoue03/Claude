// Cenário: calabouço de pedra visto de cima (360×640), com tochas, poças, tablado de degraus e altar d20.
// `gerarArena` cria a base (cores "sem luz"); `luzBase` e `quadroArena` aplicam iluminação animada.
import { apagado, hex, misturar, RGB } from "./cor";

export const W = 360;
export const H = 640;

export type Tocha = { x: number; y: number; raio: number; tipo: "parede" | "braseiro"; fase: number };
export type Poca = { x: number; y: number; rx: number; ry: number };

export type Arena = {
  base: Uint8ClampedArray; // RGB por pixel (alfa ignorado)
  emissivo: Uint8Array; // 1 = runa/brilho próprio (não escurece)
  tochas: Tocha[];
  pocas: Poca[];
  runas: [number, number][];
  falloff: Float32Array[]; // luz de cada tocha por pixel
  vinheta: Float32Array;
};

// ruído determinístico
const rnd = (x: number, y: number, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
class Rnd {
  s: number;
  constructor(s: number) {
    this.s = s >>> 0;
  }
  f() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  i(a: number, b: number) {
    return a + Math.floor(this.f() * (b - a + 1));
  }
}

export const LIMITES = { paredeTopo: 206, paredeBase: 552, lateral: 22 };
export const CENTRO = { x: 180, y: 384 };

export const gerarArena = (semente = 7): Arena => {
  const base = new Uint8ClampedArray(W * H * 4);
  const emissivo = new Uint8Array(W * H);
  const r = new Rnd(semente);
  const put = (x: number, y: number, c: RGB) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    base[i] = c[0];
    base[i + 1] = c[1];
    base[i + 2] = c[2];
    base[i + 3] = 255;
  };
  const get = (x: number, y: number): RGB => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [base[i], base[i + 1], base[i + 2]];
  };
  const mix = (x: number, y: number, c: RGB, t: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    put(x, y, misturar(get(x, y), c, t));
  };
  const rect = (x: number, y: number, w: number, h: number, c: RGB) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
  };
  const S = (h: string): RGB => apagado(hex(h), 0.75, 1);

  const pedra: RGB = apagado(hex("#5a5f68"), 0.6, 0.86);
  const junta = S("#24242c");
  const topoParede = S("#3a3c46");

  // ── chão de lajotas irregulares ──
  const yTopo = LIMITES.paredeTopo;
  const yBase = LIMITES.paredeBase;
  const lat = LIMITES.lateral;
  let y = yTopo;
  let linha = 0;
  while (y < yBase) {
    const hgt = r.i(9, 17);
    let x = lat - r.i(0, 14);
    while (x < W - lat) {
      const w = r.i(10, 28);
      const tom = 0.7 + r.f() * 0.38;
      const tinta: RGB = misturar(pedra, r.f() < 0.25 ? S("#6a6458") : S("#566070"), r.f() * 0.6);
      for (let yy = y; yy < Math.min(y + hgt, yBase); yy++)
        for (let xx = Math.max(lat, x); xx < Math.min(x + w, W - lat); xx++) {
          let c: RGB = [tinta[0] * tom, tinta[1] * tom, tinta[2] * tom];
          const n = rnd(xx, yy, 1);
          if (n < 0.12) c = misturar(c, [20, 20, 28], 0.25);
          else if (n > 0.93) c = misturar(c, [200, 200, 210], 0.12);
          const borda = yy === y || xx === x || xx === Math.max(lat, x);
          const bordaB = yy === y + hgt - 1 || xx === x + w - 1;
          if (yy === y + 1 || xx === x + 1) c = misturar(c, [210, 205, 190], 0.14);
          if (yy === y + hgt - 2 || xx === x + w - 2) c = misturar(c, [10, 10, 20], 0.18);
          if (borda || bordaB) c = junta;
          put(xx, yy, c);
        }
      // rachadura
      if (r.f() < 0.22) {
        let cx = x + r.i(3, w - 3);
        let cy = y + 2;
        for (let k = 0; k < hgt + 3; k++) {
          mix(cx, cy, [22, 22, 30], 0.7);
          cx += r.i(-1, 1);
          cy += 1;
          if (cy >= y + hgt - 1) break;
        }
      }
      x += w;
    }
    y += hgt;
    linha++;
  }
  void linha;

  // musgo nas juntas (mais perto das paredes)
  for (let yy = yTopo; yy < yBase; yy++)
    for (let xx = lat; xx < W - lat; xx++) {
      const c = get(xx, yy);
      if (c[0] > 50) continue; // só nas juntas escuras
      const perto = Math.min(xx - lat, W - lat - xx, yy - yTopo, yBase - yy);
      const p = 0.5 * Math.exp(-perto / 30) + 0.06;
      if (rnd(xx, yy, 3) < p) put(xx, yy, misturar(S("#3e5a32"), S("#5a7a3a"), rnd(xx, yy, 4)));
    }

  // manchas de sangue antigo
  for (let k = 0; k < 4; k++) {
    const bx = r.i(70, 290);
    const by = r.i(250, 520);
    if (Math.hypot(bx - CENTRO.x, (by - CENTRO.y) * 1.3) < 80) continue;
    for (let j = 0; j < 40; j++) {
      const a = r.f() * Math.PI * 2;
      const d = r.f() * 7;
      const x = Math.round(bx + Math.cos(a) * d * 1.4);
      const yy = Math.round(by + Math.sin(a) * d * 0.8);
      mix(x, yy, [70, 18, 20], 0.45);
    }
  }

  // ── tablado de pirâmide de degraus ──
  const runas: [number, number][] = [];
  const nivel = (w: number, h: number, dy: number, claro: number) => {
    const x0 = Math.round(CENTRO.x - w / 2);
    const y0 = Math.round(CENTRO.y - h / 2 + dy);
    const pedraT = misturar(S("#6c6e74"), [230, 225, 210], claro);
    for (let yy = y0; yy < y0 + h; yy++)
      for (let xx = x0; xx < x0 + w; xx++) {
        let c: RGB = pedraT;
        const n = rnd(xx, yy, 11);
        if (n < 0.1) c = misturar(c, [20, 20, 30], 0.2);
        // blocos
        if ((xx - x0) % 16 === 0 || (yy - y0) % 10 === 0) c = misturar(c, junta, 0.6);
        if (yy === y0) c = misturar(c, [240, 235, 220], 0.2);
        if (xx === x0) c = misturar(c, [240, 235, 220], 0.12);
        if (xx === x0 + w - 1) c = misturar(c, [10, 10, 20], 0.25);
        put(xx, yy, c);
      }
    // face do degrau (frente, sul) e sombra lateral
    for (let yy = y0 + h; yy < y0 + h + 4; yy++)
      for (let xx = x0; xx < x0 + w; xx++) {
        const c = misturar(S("#3c3e46"), [0, 0, 0], (yy - y0 - h) * 0.08);
        put(xx, yy, (xx - x0) % 8 === 0 ? junta : c);
      }
    for (let yy = y0 + 2; yy < y0 + h + 4; yy++) mix(x0 + w, yy, [0, 0, 0], 0.4);
    // runas gravadas na face
    for (let xx = x0 + 6; xx < x0 + w - 6; xx += 9) {
      const tipo = Math.floor(rnd(xx, y0, 13) * 4);
      const ry = y0 + h + 1;
      const pts: [number, number][] =
        tipo === 0 ? [[0, 0], [1, 1], [2, 0], [1, 2]] : tipo === 1 ? [[0, 0], [0, 1], [0, 2], [1, 1], [2, 0]] : tipo === 2 ? [[0, 2], [1, 1], [2, 2], [1, 0]] : [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]];
      for (const [a, b] of pts) runas.push([xx + a, ry + b]);
    }
    return { x0, y0, w, h };
  };
  nivel(150, 98, 2, 0);
  nivel(110, 70, 0, 0.05);
  const topo = nivel(70, 44, -2, 0.1);
  // círculo de runas no topo
  for (let a = 0; a < 48; a++) {
    if (a % 6 === 5) continue;
    const ang = (a / 48) * Math.PI * 2;
    runas.push([Math.round(CENTRO.x + Math.cos(ang) * 30), Math.round(CENTRO.y - 2 + Math.sin(ang) * 18)]);
  }
  void topo;

  // ── altar em forma de d20 (icosaedro) ──
  const ax = CENTRO.x;
  const ay = CENTRO.y - 8;
  const R = 13;
  const hexPts: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const ang = -Math.PI / 2 + (k * Math.PI) / 3;
    hexPts.push([ax + Math.cos(ang) * R, ay + Math.sin(ang) * R * 1.05]);
  }
  // sombra do altar no chão
  for (let yy = -4; yy <= 4; yy++) for (let xx = -16; xx <= 16; xx++) if ((xx / 16) ** 2 + (yy / 4) ** 2 <= 1) mix(ax + xx + 3, ay + R + 3 + yy, [0, 0, 0], 0.45);
  // faces: triângulo central (claro), seis em volta com tons diferentes
  const tri = (a: [number, number], b: [number, number], c: [number, number], cor: RGB) => {
    const minx = Math.floor(Math.min(a[0], b[0], c[0]));
    const maxx = Math.ceil(Math.max(a[0], b[0], c[0]));
    const miny = Math.floor(Math.min(a[1], b[1], c[1]));
    const maxy = Math.ceil(Math.max(a[1], b[1], c[1]));
    const s = (p: [number, number], q: [number, number], rr: [number, number]) => (p[0] - rr[0]) * (q[1] - rr[1]) - (q[0] - rr[0]) * (p[1] - rr[1]);
    for (let yy = miny; yy <= maxy; yy++)
      for (let xx = minx; xx <= maxx; xx++) {
        const p: [number, number] = [xx + 0.5, yy + 0.5];
        const d1 = s(p, a, b);
        const d2 = s(p, b, c);
        const d3 = s(p, c, a);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) put(xx, yy, misturar(cor, [20, 20, 30], rnd(xx, yy, 21) < 0.1 ? 0.2 : 0));
      }
  };
  const inner: [number, number][] = [
    [ax, ay - R * 0.5],
    [ax + R * 0.48, ay + R * 0.32],
    [ax - R * 0.48, ay + R * 0.32],
  ];
  const tons = [S("#b4b4bc"), S("#8c8c96"), S("#6a6a76"), S("#55555f"), S("#727280"), S("#9a9aa6")];
  for (let k = 0; k < 6; k++) {
    const a = hexPts[k];
    const b = hexPts[(k + 1) % 6];
    const near = k % 2 === 0 ? inner[0] : k === 1 ? inner[1] : k === 3 ? inner[1] : inner[2];
    tri(a, b, near, tons[k]);
  }
  tri(hexPts[1], hexPts[3], inner[1], S("#7a7a86"));
  tri(hexPts[3], hexPts[5], inner[2], S("#62626e"));
  tri(inner[0], inner[1], inner[2], S("#cfcfd6"));
  // arestas
  const linhaB = (a: [number, number], b: [number, number], c: RGB, t = 0.7) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let k = 0; k <= n; k++) mix(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, c, t);
  };
  for (let k = 0; k < 6; k++) linhaB(hexPts[k], hexPts[(k + 1) % 6], [18, 16, 24], 0.85);
  linhaB(inner[0], inner[1], [40, 40, 50], 0.5);
  linhaB(inner[1], inner[2], [40, 40, 50], 0.5);
  linhaB(inner[2], inner[0], [40, 40, 50], 0.5);
  // "20" gravado (runa brilhante)
  const vinte = ["111 111", "  1 1 1", "111 1 1", "1   1 1", "111 111"];
  vinte.forEach((s, j) => s.split("").forEach((ch, i) => ch === "1" && runas.push([ax - 3 + i, ay - 2 + j])));

  // ── paredes ──
  const bloco = (x0: number, y0: number, w: number, h: number, tom: RGB, sem: number) => {
    let yy = y0;
    let ln = 0;
    while (yy < y0 + h) {
      const bh = 7;
      let xx = x0 - (ln % 2) * 8;
      while (xx < x0 + w) {
        const bw = 16;
        const t = 0.85 + rnd(xx, yy, sem) * 0.25;
        for (let j = 0; j < bh && yy + j < y0 + h; j++)
          for (let i = 0; i < bw; i++) {
            const px = xx + i;
            if (px < x0 || px >= x0 + w) continue;
            let c: RGB = [tom[0] * t, tom[1] * t, tom[2] * t];
            if (j === 0 || i === 0) c = junta;
            else if (j === 1) c = misturar(c, [220, 215, 200], 0.15);
            else if (j === bh - 1) c = misturar(c, [0, 0, 10], 0.25);
            if (rnd(px, yy + j, sem + 1) < 0.08) c = misturar(c, [15, 15, 20], 0.3);
            put(px, yy + j, c);
          }
        xx += bw;
      }
      yy += bh;
      ln++;
    }
  };
  // topo das paredes (visto de cima) — fica atrás do HUD
  for (let yy = 0; yy < 150; yy++) for (let xx = 0; xx < W; xx++) put(xx, yy, misturar(topoParede, [8, 8, 14], 0.45 + rnd(xx, yy, 31) * 0.1));
  bloco(0, 132, W, 18, S("#4a4c56"), 41);
  // face da parede de cima (aparece embaixo do topo)
  bloco(0, 150, W, yTopo - 150, S("#555862"), 43);
  for (let xx = 0; xx < W; xx++) for (let j = 0; j < 4; j++) mix(xx, yTopo - 4 + j, [0, 0, 0], 0.15 + j * 0.12); // sombra no pé da parede
  for (let xx = 0; xx < W; xx++) for (let j = 0; j < 6; j++) mix(xx, yTopo + j, [0, 0, 0], 0.4 - j * 0.06);
  // laterais
  bloco(0, yTopo, lat, yBase - yTopo, S("#4a4c56"), 47);
  bloco(W - lat, yTopo, lat, yBase - yTopo, S("#4a4c56"), 49);
  for (let yy = yTopo; yy < yBase; yy++)
    for (let j = 0; j < 5; j++) {
      mix(lat + j, yy, [0, 0, 0], 0.35 - j * 0.06);
      mix(W - lat - 1 - j, yy, [0, 0, 0], 0.35 - j * 0.06);
    }
  // parede de baixo (topo visto de cima, dentro da área segura inferior)
  bloco(0, yBase, W, H - yBase, S("#4a4c56"), 53);
  for (let xx = 0; xx < W; xx++) for (let j = 0; j < 3; j++) mix(xx, yBase - 1 - j, [0, 0, 0], 0.3 - j * 0.08);

  // arcos com grade levadiça na parede de cima
  const arco = (cx: number, larg: number, grade: boolean) => {
    const yb = yTopo;
    const alt = 40;
    for (let yy = yb - alt; yy < yb; yy++)
      for (let xx = cx - larg / 2; xx < cx + larg / 2; xx++) {
        const u = (xx - cx) / (larg / 2);
        const topoArco = yb - alt + 12 * (1 - Math.sqrt(Math.max(0, 1 - u * u)));
        if (yy < topoArco) continue;
        put(xx, yy, misturar([10, 9, 14], [30, 26, 34], (yy - (yb - alt)) / alt));
        if (grade) {
          const gx = (Math.round(xx - cx + larg) % 6) === 0;
          const gy = (yy - (yb - alt)) % 7 === 0;
          if (gx || gy) put(xx, yy, gx ? S("#4a4c58") : S("#3a3c46"));
          if (gx && (yy - (yb - alt)) % 7 === 1) put(xx, yy, S("#7a7c88"));
        }
      }
    // aduelas do arco
    for (let k = 0; k <= 16; k++) {
      const ang = Math.PI + (k / 16) * Math.PI;
      const ex = cx + Math.cos(ang) * (larg / 2 + 2);
      const ey = yb - alt + 12 + Math.sin(ang) * 14;
      for (let j = 0; j < 3; j++) put(ex + Math.cos(ang) * j, ey + Math.sin(ang) * j, k % 2 ? S("#6a6c76") : S("#5a5c66"));
    }
  };
  arco(180, 46, true);
  arco(78, 30, true);
  arco(282, 30, true);

  // nichos com crânios
  const cranio = (x: number, yy: number) => {
    rect(x - 5, yy - 5, 10, 9, [18, 16, 22]);
    const osso = S("#d8d0bc");
    for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) if ((i - 2.5) ** 2 / 9 + (j - 2) ** 2 / 6 <= 1) put(x - 3 + i, yy - 3 + j, misturar(osso, [60, 50, 50], i > 3 ? 0.3 : 0));
    put(x - 2, yy - 1, [20, 14, 18]);
    put(x + 1, yy - 1, [20, 14, 18]);
    put(x - 1, yy + 2, S("#a8a090"));
    put(x, yy + 2, [20, 14, 18]);
    put(x + 1, yy + 2, S("#a8a090"));
  };
  cranio(126, 172);
  cranio(234, 172);
  cranio(30, 176);
  cranio(330, 176);

  // correntes penduradas
  const corrente = (x: number, y0: number, comp: number) => {
    for (let j = 0; j < comp; j++) {
      const c = j % 3 === 0 ? S("#8a8c96") : S("#5a5c66");
      put(x + (j % 3 === 1 ? 1 : 0), y0 + j, c);
      if (j % 3 === 0) put(x + 1, y0 + j, S("#3a3c46"));
    }
  };
  corrente(104, 152, 26);
  corrente(256, 152, 30);
  corrente(160, 150, 12);
  corrente(200, 150, 12);

  // estandartes rasgados
  const estandarte = (x: number, cor: string) => {
    const c = S(cor);
    for (let yy = 152; yy < 196; yy++)
      for (let xx = x - 6; xx <= x + 6; xx++) {
        const corte = 190 + Math.round(4 * Math.sin(xx * 1.7)) - (Math.abs(xx - x) < 2 ? 4 : 0);
        if (yy > corte) continue;
        let cc = misturar(c, [0, 0, 0], (xx - x + 6) / 26);
        if (xx === x - 6) cc = misturar(c, [255, 240, 200], 0.15);
        if (rnd(xx, yy, 61) < 0.05) cc = [12, 10, 14];
        put(xx, yy, cc);
      }
    for (let xx = x - 7; xx <= x + 7; xx++) put(xx, 151, S("#6a4a30"));
    // emblema: d20 dourado
    const ou = S("#b89a4a");
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (Math.abs(i) + Math.abs(j) * 0.8 <= 3.2) put(x + i, 166 + j, j === 0 || i === 0 ? misturar(ou, [60, 40, 10], 0.3) : ou);
  };
  estandarte(52, "#7a1e2a");
  estandarte(308, "#1e3a7a");

  // teias nos cantos
  const teia = (x: number, yy: number, sx: number) => {
    const c: RGB = [200, 200, 210];
    for (let k = 0; k < 5; k++) {
      const ang = (k / 4) * (Math.PI / 2);
      for (let d = 0; d < 16; d++) mix(x + sx * Math.cos(ang) * d, yy + Math.sin(ang) * d, c, 0.25);
    }
    for (let d = 5; d < 16; d += 5)
      for (let a = 0; a <= 20; a++) {
        const ang = (a / 20) * (Math.PI / 2);
        mix(x + sx * Math.cos(ang) * d, yy + Math.sin(ang) * d, c, 0.2);
      }
  };
  teia(lat, yTopo, 1);
  teia(W - lat - 1, yTopo, -1);

  // ossos, barris e caixotes nos cantos
  const osso = (x: number, yy: number, ang: number) => {
    const c = S("#cfc6b0");
    for (let d = -4; d <= 4; d++) put(x + Math.cos(ang) * d, yy + Math.sin(ang) * d, c);
    for (const e of [-4, 4]) {
      put(x + Math.cos(ang) * e - Math.sin(ang), yy + Math.sin(ang) * e + Math.cos(ang), c);
      put(x + Math.cos(ang) * e + Math.sin(ang), yy + Math.sin(ang) * e - Math.cos(ang), c);
    }
  };
  osso(60, 236, 0.4);
  osso(296, 248, -0.6);
  osso(120, 530, 1.2);
  osso(250, 290, 2.3);
  osso(84, 470, 0.1);
  const barril = (x: number, yy: number) => {
    for (let j = -6; j <= 6; j++)
      for (let i = -6; i <= 6; i++) {
        const d = Math.hypot(i, j);
        if (d > 6.5) continue;
        let c = misturar(S("#7a5232"), [0, 0, 0], (i + j) / 30 + 0.1);
        if (Math.abs(d - 4) < 0.6 || d > 5.8) c = S("#4a4c56");
        if (i === 0 || i === -3 || i === 3) c = misturar(c, [0, 0, 0], 0.2);
        put(x + i, yy + j, c);
      }
  };
  const caixote = (x: number, yy: number, quebrado: boolean) => {
    for (let j = 0; j < 12; j++)
      for (let i = 0; i < 12; i++) {
        if (quebrado && i + j > 16) continue;
        let c = misturar(S("#8a6a40"), [0, 0, 0], (i + j) / 40);
        if (i === 0 || j === 0 || i === 11 || j === 11 || i === j) c = S("#5a4028");
        put(x + i, yy + j, c);
      }
    if (quebrado) for (let k = 0; k < 4; k++) put(x + 13 + k, yy + 10 - k, S("#8a6a40"));
  };
  barril(36, 222);
  barril(48, 232);
  caixote(300, 214, false);
  caixote(312, 228, true);
  barril(324, 534 - 6);
  caixote(28, 524, true);

  // ── tochas ──
  const tochas: Tocha[] = [
    { x: 40, y: 168, raio: 96, tipo: "parede", fase: 0.1 },
    { x: 140, y: 168, raio: 104, tipo: "parede", fase: 1.7 },
    { x: 220, y: 168, raio: 104, tipo: "parede", fase: 3.1 },
    { x: 320, y: 168, raio: 96, tipo: "parede", fase: 4.6 },
    { x: 11, y: 300, raio: 92, tipo: "parede", fase: 2.2 },
    { x: 11, y: 450, raio: 92, tipo: "parede", fase: 5.3 },
    { x: W - 11, y: 300, raio: 92, tipo: "parede", fase: 0.9 },
    { x: W - 11, y: 450, raio: 92, tipo: "parede", fase: 3.9 },
    { x: 54, y: 532, raio: 98, tipo: "braseiro", fase: 1.3 },
    { x: 306, y: 532, raio: 98, tipo: "braseiro", fase: 4.1 },
  ];
  for (const t of tochas) {
    if (t.tipo === "parede") {
      // suporte de ferro
      for (let j = 0; j < 9; j++) put(t.x, t.y + 2 + j, S("#4a3a2a"));
      for (let i = -2; i <= 2; i++) put(t.x + i, t.y + 2, S("#6a6c76"));
      put(t.x - 1, t.y + 8, S("#3a3c46"));
      put(t.x + 1, t.y + 8, S("#3a3c46"));
    } else {
      // braseiro: tigela de ferro sobre pés
      for (let j = -4; j <= 4; j++)
        for (let i = -8; i <= 8; i++)
          if ((i / 8) ** 2 + (j / 4) ** 2 <= 1) put(t.x + i, t.y + j, misturar(S("#4a4c56"), [0, 0, 0], (j + 4) / 12 + (i > 4 ? 0.2 : 0)));
      for (let i = -6; i <= 6; i++) put(t.x + i, t.y - 3, S("#2a1a14"));
      for (const i of [-6, 0, 6]) for (let j = 4; j < 9; j++) put(t.x + i, t.y + j, S("#3a3c46"));
    }
  }

  // ── poças d'água ──
  const pocas: Poca[] = [
    { x: 96, y: 300, rx: 12, ry: 5 },
    { x: 272, y: 470, rx: 14, ry: 5 },
    { x: 250, y: 262, rx: 9, ry: 4 },
    { x: 104, y: 492, rx: 10, ry: 4 },
  ];
  for (const p of pocas) {
    for (let j = -p.ry; j <= p.ry; j++)
      for (let i = -p.rx; i <= p.rx; i++) {
        const d = (i / p.rx) ** 2 + (j / p.ry) ** 2 + rnd(p.x + i, p.y + j, 71) * 0.15;
        if (d > 1) continue;
        let c: RGB = misturar(get(p.x + i, p.y + j), S("#1e3440"), 0.65);
        if (d > 0.75) c = misturar(c, S("#5a7a8a"), 0.25);
        put(p.x + i, p.y + j, c);
      }
  }

  // ── luz: falloff de cada tocha ──
  const falloff = tochas.map((t) => {
    const f = new Float32Array(W * H);
    for (let yy = 0; yy < H; yy++)
      for (let xx = 0; xx < W; xx++) {
        const d = Math.hypot(xx - t.x, (yy - t.y) * 1.1) / (t.raio * 1.22);
        f[yy * W + xx] = d >= 1 ? 0 : Math.pow(1 - d, 2.1) * 1.55;
      }
    return f;
  });
  const vinheta = new Float32Array(W * H);
  for (let yy = 0; yy < H; yy++)
    for (let xx = 0; xx < W; xx++) {
      const u = (xx - W / 2) / (W / 2);
      const v = (yy - (H / 2 + 20)) / (H / 2);
      vinheta[yy * W + xx] = Math.max(0.45, 1 - 0.45 * Math.pow(Math.max(0, u * u * 0.9 + v * v * 0.85 - 0.15), 1.1));
    }
  for (const [x, yy] of runas) emissivo[yy * W + x] = 1;

  return { base, emissivo, tochas, pocas, runas, falloff, vinheta };
};

// ─────────────────────────── luz por quadro ───────────────────────────
export type Luz = { x: number; y: number; raio: number; forca: number; cor: RGB };

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export const tremor = (t: Tocha, f: number) =>
  0.82 + 0.1 * Math.sin(f * 0.37 + t.fase * 3) + 0.06 * Math.sin(f * 1.13 + t.fase * 7) + 0.04 * Math.sin(f * 2.9 + t.fase);

/** mapa de luz do quadro (0 = penumbra, 1 = luz de tocha cheia) */
export const mapaLuz = (a: Arena, f: number, extras: Luz[]): { L: Float32Array; cor: Float32Array } => {
  const n = W * H;
  const L = new Float32Array(n).fill(0.2);
  const cor = new Float32Array(n * 3);
  const amps = a.tochas.map((t) => tremor(t, f));
  for (let k = 0; k < a.tochas.length; k++) {
    const fo = a.falloff[k];
    const amp = amps[k];
    for (let i = 0; i < n; i++) if (fo[i] > 0) L[i] += fo[i] * amp;
  }
  // luzes de magia (coloridas)
  for (const e of extras) {
    const x0 = Math.max(0, Math.floor(e.x - e.raio));
    const x1 = Math.min(W - 1, Math.ceil(e.x + e.raio));
    const y0 = Math.max(0, Math.floor(e.y - e.raio));
    const y1 = Math.min(H - 1, Math.ceil(e.y + e.raio));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - e.x, (y - e.y) * 1.1) / e.raio;
        if (d >= 1) continue;
        const v = (1 - d) * (1 - d) * e.forca;
        const i = y * W + x;
        L[i] += v * 0.5;
        cor[i * 3] += (e.cor[0] / 255) * v;
        cor[i * 3 + 1] += (e.cor[1] / 255) * v;
        cor[i * 3 + 2] += (e.cor[2] / 255) * v;
      }
  }
  return { L, cor };
};

/** cor multiplicadora da luz: penumbra azul-esverdeada → âmbar quente */
export const tintaLuz = (L: number): RGB => {
  const k = Math.min(1.35, L);
  return [0.26 + 0.98 * k, 0.34 + 0.72 * k, 0.42 + 0.4 * k];
};

/** pinta o cenário iluminado no buffer do quadro */
export const pintarArena = (a: Arena, dst: Uint8ClampedArray, luz: { L: Float32Array; cor: Float32Array }, f: number) => {
  const { base, emissivo, vinheta } = a;
  const pulso = 0.55 + 0.25 * Math.sin(f * 0.08);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // quantiza a luz em faixas com pontilhado ordenado (pixel art)
      const q = luz.L[i] * 6 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9;
      const Lq = Math.max(0, Math.round(q)) / 6;
      const t = tintaLuz(Lq);
      const v = vinheta[i];
      const j = i * 4;
      if (emissivo[i]) {
        dst[j] = 70 + 60 * pulso;
        dst[j + 1] = 130 + 80 * pulso;
        dst[j + 2] = 230 + 25 * pulso;
        dst[j + 3] = 255;
        continue;
      }
      const cr = luz.cor[i * 3];
      const cg = luz.cor[i * 3 + 1];
      const cb = luz.cor[i * 3 + 2];
      dst[j] = base[j] * (t[0] * v + cr);
      dst[j + 1] = base[j + 1] * (t[1] * v + cg);
      dst[j + 2] = base[j + 2] * (t[2] * v + cb);
      dst[j + 3] = 255;
    }
  // brilho fraco em volta das runas
  for (const [x, y] of a.runas)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx;
      const yy = y + dy;
      if (emissivo[yy * W + xx]) continue;
      const j = (yy * W + xx) * 4;
      dst[j] = dst[j] * 0.7 + 40 * pulso;
      dst[j + 1] = dst[j + 1] * 0.7 + 70 * pulso;
      dst[j + 2] = dst[j + 2] * 0.7 + 120 * pulso;
    }
};
