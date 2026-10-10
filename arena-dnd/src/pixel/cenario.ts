// Cenário: ilha com arena octogonal de areia, anel de pedra, tochas, árvores e água animada.
// Tudo desenhado pixel a pixel numa tela de 360 × 640 (escala 3× → 1080 × 1920).
import { criarRng } from "../motor/dados";
import { tom } from "./cor";

export const TELA_W = 270;
export const TELA_H = 480;
export const CENTRO = { x: 135, y: 268 };
export const PX_POR_PE = 2.15;
export const RAIO_OCT = 126; // px até o vértice do octógono de areia

export const paraTela = (x: number, y: number) => ({ x: CENTRO.x + x * PX_POR_PE, y: CENTRO.y + y * PX_POR_PE });

// distância "octogonal" normalizada (1 = borda)
const oct = (dx: number, dy: number) => {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  return Math.max(ax, ay, (ax + ay) * 0.7071) / (RAIO_OCT * 0.9239);
};

const ILHA = { x0: 3, y0: 124, x1: 267, y1: 412, r: 20 };
const dentroIlha = (x: number, y: number) => {
  const { x0, y0, x1, y1, r } = ILHA;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

export const TOCHAS = [0.125, 0.375, 0.625, 0.875].map((f) => {
  const a = f * Math.PI * 2;
  const r = RAIO_OCT + 4;
  return { x: Math.round(CENTRO.x + Math.cos(a) * r * 0.97), y: Math.round(CENTRO.y + Math.sin(a) * r * 0.97) };
});
const ARVORES = [
  { x: 18, y: 152 }, { x: 252, y: 154 }, { x: 16, y: 398 }, { x: 254, y: 396 }, { x: 46, y: 136 }, { x: 226, y: 138 },
];

// Desenha o fundo estático uma vez (o resto é animado por cima)
export const desenharFundo = (ctx: CanvasRenderingContext2D) => {
  const rng = criarRng(20260101);
  const img = ctx.createImageData(TELA_W, TELA_H);
  const put = (x: number, y: number, hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const i = (y * TELA_W + x) * 4;
    img.data[i] = (n >> 16) & 255;
    img.data[i + 1] = (n >> 8) & 255;
    img.data[i + 2] = n & 255;
    img.data[i + 3] = 255;
  };
  const AGUA = ["#2f6fc0", "#3478c8", "#2b67b5"];
  const GRAMA = ["#5fae5a", "#58a554", "#66b561", "#5aa857"];
  const AREIA = ["#e2c48e", "#ddbd86", "#e6ca96", "#d9b880"];
  const AREIA2 = ["#d8b67e", "#d2ae76", "#dcbb84"];
  for (let y = 0; y < TELA_H; y++)
    for (let x = 0; x < TELA_W; x++) {
      const dx = x - CENTRO.x, dy = y - CENTRO.y;
      const o = oct(dx, dy);
      const r = rng();
      if (!dentroIlha(x, y)) {
        // borda de terra/areia molhada em volta da ilha
        const perto = dentroIlha(x - 3, y - 3) || dentroIlha(x + 3, y + 3) || dentroIlha(x, y - 4) || dentroIlha(x, y + 5);
        put(x, y, perto ? (dentroIlha(x, y - 4) ? "#7a5a3a" : "#c9b07a") : AGUA[Math.floor(r * 3)]);
        continue;
      }
      if (o > 1.06) {
        // grama com tufos
        put(x, y, r < 0.04 ? "#4c9449" : r < 0.06 ? "#7cc46f" : GRAMA[Math.floor(r * 4)]);
      } else if (o > 1.0) {
        // anel de pedra (blocos)
        const ang = Math.atan2(dy, dx);
        const bloco = Math.floor((ang + Math.PI) * 14) % 2;
        const borda = o > 1.055 || o < 1.006;
        put(x, y, borda ? "#5e5a5a" : bloco ? (r < 0.3 ? "#9a948c" : "#8d877f") : r < 0.3 ? "#a8a299" : "#b1aba1");
      } else {
        // areia com anéis concêntricos (como a arena do vídeo modelo)
        const anel = o > 0.66 ? 0 : o > 0.36 ? 1 : 2;
        const lista = anel === 1 ? AREIA2 : AREIA;
        let c = lista[Math.floor(r * lista.length)];
        if (r < 0.025) c = "#c9a46c";
        if (r > 0.985) c = "#f0dcae";
        if (Math.abs(o - 0.66) < 0.008 || Math.abs(o - 0.36) < 0.008) c = "#c6a26c";
        if (o > 0.975) c = "#b89466"; // sombra junto à pedra
        put(x, y, c);
      }
    }
  ctx.putImageData(img, 0, 0);

  // runa do d20 no centro (gravada no chão)
  ctx.fillStyle = "#c6a26c";
  const hex = (raio: number) => Array.from({ length: 6 }, (_, i) => ({ x: CENTRO.x + Math.cos(-Math.PI / 2 + (i * Math.PI) / 3) * raio, y: CENTRO.y + Math.sin(-Math.PI / 2 + (i * Math.PI) / 3) * raio }));
  const linha = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(a.x + ((b.x - a.x) * i) / n), Math.round(a.y + ((b.y - a.y) * i) / n), 1, 1);
  };
  const H = hex(17);
  for (let i = 0; i < 6; i++) linha(H[i], H[(i + 1) % 6]);
  // triângulo central + raios (faces do d20)
  const T = [0, 2, 4].map((i) => ({ x: CENTRO.x + (H[i].x - CENTRO.x) * 0.5, y: CENTRO.y + (H[i].y - CENTRO.y) * 0.5 }));
  const Tinv = [1, 3, 5].map((i) => H[i]);
  for (let i = 0; i < 3; i++) {
    linha(T[i], T[(i + 1) % 3]);
    linha(T[i], H[[0, 2, 4][i]]);
    linha(T[i], Tinv[i]);
    linha(T[(i + 1) % 3], Tinv[i]);
  }

  // flores e pedrinhas na grama
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rng() * TELA_W), y = 126 + Math.floor(rng() * 286);
    if (!dentroIlha(x, y) || oct(x - CENTRO.x, y - CENTRO.y) < 1.1) continue;
    const c = ["#f4f0e6", "#f2d544", "#e07aa5", "#9fc8ff"][Math.floor(rng() * 4)];
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = "#3f7d3c";
    ctx.fillRect(x, y + 1, 1, 1);
  }
  for (const a of ARVORES) arvore(ctx, a.x, a.y, rng);
};

const arvore = (ctx: CanvasRenderingContext2D, x: number, y: number, rng: () => number) => {
  // sombra
  ctx.fillStyle = "#4a8a47";
  for (let i = -9; i <= 9; i++) ctx.fillRect(x + i, y + 2, 1, Math.abs(i) < 7 ? 2 : 1);
  // tronco
  ctx.fillStyle = "#5a3a22";
  ctx.fillRect(x - 2, y - 6, 4, 8);
  ctx.fillStyle = "#7a5232";
  ctx.fillRect(x - 2, y - 6, 2, 8);
  // copa (círculos com sombra e luz)
  const copa = (cx: number, cy: number, r: number) => {
    for (let yy = -r - 1; yy <= r + 1; yy++)
      for (let xx = -r - 1; xx <= r + 1; xx++) {
        const dd = Math.hypot(xx, yy);
        if (dd > r + 0.6) continue;
        let c = "#3f8a3e";
        if (dd > r - 0.6) c = "#24502a";
        else if (xx + yy < -r * 0.6) c = rng() < 0.5 ? "#5fae4f" : "#6cbd5a";
        else if (xx + yy > r * 0.5) c = "#2f6b33";
        else if (rng() < 0.08) c = "#4f9e45";
        ctx.fillStyle = c;
        ctx.fillRect(cx + xx, cy + yy, 1, 1);
      }
  };
  copa(x, y - 14, 9);
  copa(x - 5, y - 9, 6);
  copa(x + 5, y - 9, 6);
};

// Animações do cenário: brilho da água e chamas das tochas
export const animarCenario = (ctx: CanvasRenderingContext2D, f: number) => {
  // ondinhas na água (determinístico por quadro)
  ctx.fillStyle = "#6fa6e6";
  for (let i = 0; i < 70; i++) {
    const bx = (i * 97) % TELA_W;
    const by = (i * 53) % TELA_H;
    const x = Math.round((bx + f * 0.25 + Math.sin(i) * 9) % TELA_W);
    const y = by;
    if (dentroIlha(x, y) || dentroIlha(x + 4, y)) continue;
    const fase = (f + i * 7) % 60;
    if (fase < 40) ctx.fillRect(x, y, fase < 20 ? 3 : 2, 1);
  }
  // tochas
  for (const [i, t] of TOCHAS.entries()) {
    ctx.fillStyle = "#3a2a1e";
    ctx.fillRect(t.x - 1, t.y - 10, 3, 12);
    ctx.fillStyle = "#6b4a2f";
    ctx.fillRect(t.x - 2, t.y - 11, 5, 2);
    const fl = Math.floor((f + i * 5) / 4) % 3;
    const chama = [
      ["..y..", ".yoy.", "yoRoy", ".oRo."],
      ["...y.", "..yo.", ".yoRy", ".oRo."],
      [".y...", ".oy..", "yRoy.", ".oRo."],
    ][fl];
    const cores: Record<string, string> = { y: "#ffe066", o: "#ff9a2e", R: "#e8452e" };
    chama.forEach((l, yy) => [...l].forEach((c, xx) => { if (cores[c]) { ctx.fillStyle = cores[c]; ctx.fillRect(t.x - 2 + xx, t.y - 15 + yy, 1, 1); } }));
    // luz no chão
    ctx.fillStyle = "rgba(255,190,90,0.10)";
    ctx.beginPath();
    ctx.arc(t.x + 0.5, t.y, 10 + (fl === 1 ? 1 : 0), 0, Math.PI * 2);
    ctx.fill();
  }
};

export const corClasse: Record<string, string> = {
  barbaro: "#e7623e",
  bardo: "#ab6dac",
  clerigo: "#c9d2dc",
  druida: "#8a9a3b",
  guerreiro: "#b0764f",
  monge: "#51a5c5",
  paladino: "#e0c35a",
  patrulheiro: "#4f9a6a",
  ladino: "#8a8c86",
  feiticeiro: "#d0453f",
  bruxo: "#9b5de5",
  mago: "#4a7fe0",
};
export const siglaClasse: Record<string, string> = {
  barbaro: "BAR",
  bardo: "BRD",
  clerigo: "CLE",
  druida: "DRU",
  guerreiro: "GUE",
  monge: "MON",
  paladino: "PAL",
  patrulheiro: "PAT",
  ladino: "LAD",
  feiticeiro: "FEI",
  bruxo: "BRX",
  mago: "MAG",
};

export { tom };
