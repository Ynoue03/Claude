// Efeitos visuais dos golpes em pixel art (partículas e brilho determinísticos).
import { hash3 } from "./rng.ts";
import type { Efeito } from "./combate.ts";
import type { Luz } from "./cenario.ts";

type Ctx = CanvasRenderingContext2D;
type P = { x: number; y: number };

const px = (ctx: Ctx, x: number, y: number, cor: string, s = 1) => {
  ctx.fillStyle = cor;
  ctx.fillRect(Math.round(x), Math.round(y), s, s);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 1 - (1 - t) ** 3;

// linha pixelada (Bresenham)
export const linhaPx = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, cor: string, s = 1) => {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0),
    dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = cor;
  for (let n = 0; n < 600; n++) {
    ctx.fillRect(x0 - Math.floor(s / 2), y0 - Math.floor(s / 2), s, s);
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
};

const anelPx = (ctx: Ctx, cx: number, cy: number, r: number, cor: string, achata = 0.55, falhas = 0, seed = 0) => {
  const n = Math.max(12, Math.round(r * 6));
  for (let i = 0; i < n; i++) {
    if (falhas && hash3(i, seed) < falhas) continue;
    const a = (i / n) * Math.PI * 2;
    px(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * achata, cor);
  }
};

const explosao = (ctx: Ctx, c: P, t: number, cores: string[], n: number, raio: number, seed: number) => {
  // t de 0 a 1
  for (let i = 0; i < n; i++) {
    const a = hash3(i, seed) * Math.PI * 2;
    const v = 0.4 + hash3(i, seed + 1) * 0.6;
    const d = ease(t) * raio * v;
    const cor = cores[Math.min(cores.length - 1, Math.floor(t * cores.length + hash3(i, seed + 2) * 1.2))];
    if (t < 0.92) px(ctx, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.7 - t * 4, cor, t < 0.3 && i % 3 === 0 ? 2 : 1);
  }
};

const FOGO = ["#fff6c0", "#ffd050", "#ff8a28", "#d84a1e", "#7a2a20"];
const GELO = ["#ffffff", "#c8f0ff", "#7ad0f8", "#3a8ad8"];
const MAGENTA = ["#ffe0ff", "#ff7ae8", "#d23ab4", "#7a1a7a"];
const OURO = ["#fffbe0", "#ffe27a", "#f0b83a", "#a8741e"];
const VERDE = ["#f0ffd0", "#b8f060", "#6ac03a", "#2a7a2a"];
const ROXO = ["#f0d8ff", "#c07aff", "#8a3cc4", "#4a1a6a"];
const AZUL = ["#e0f0ff", "#8ab8ff", "#3a6fe0", "#1a3a8a"];
const ROSA = ["#ffe8f4", "#ff9ac8", "#ec6aa8", "#9a2a6a"];
const BRANCO = ["#ffffff", "#e8e8f0", "#b8b8c8"];
const CORES_TIPO: Record<string, string[]> = {
  fogo: FOGO,
  frio: GELO,
  eletrico: ["#ffffff", "#fff27a", "#f2d23a", "#a88a1a"],
  trovejante: AZUL,
  radiante: OURO,
  necrotico: ROXO,
  energia: MAGENTA,
  psiquico: ROSA,
  veneno: VERDE,
  acido: VERDE,
  cura: VERDE,
  cortante: BRANCO,
  perfurante: BRANCO,
  concussao: BRANCO,
};

export type EfeitoAtivo = {
  fx: Efeito;
  tipo: string;
  de: P; // mão de quem ataca
  para: P[]; // alvos (centro do corpo)
  t: number; // quadros desde o início do golpe
  tSolta: number; // quando o projétil sai
  tImp: number; // quadros até o impacto
  acertou: boolean[];
  seed: number;
  cor: string;
};

// devolve luzes extras (magia ilumina o chão)
export const desenharEfeito = (ctx: Ctx, e: EfeitoAtivo): Luz[] => {
  const luzes: Luz[] = [];
  const { t, tImp, tSolta, de, para, seed } = e;
  const voo = Math.max(1, tImp - tSolta);
  const k = (t - tSolta) / voo; // progresso do projétil
  const pos = t - tImp; // quadros depois do impacto
  const alvo = para[0] ?? de;
  const cores = CORES_TIPO[e.tipo] ?? BRANCO;
  const luz = (p: P, r: number, cor: [number, number, number], i: number) => luzes.push({ x: p.x, y: p.y + 10, r, cor, i });

  // brilho de conjuração nas mãos
  if (["raioFogo", "misseis", "raioGelo", "orbe", "rajada", "chama", "raioGuia", "onda", "chamaSagrada", "zombaria", "sussurros", "bruxaria", "marca", "brilho", "cura", "bolaFogo", "relampago", "despedacar", "raioCeu"].includes(e.fx) && t < tSolta + 2) {
    const r = 1 + (t / Math.max(1, tSolta)) * 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 0.4;
      px(ctx, de.x + Math.cos(a) * r * 1.6, de.y + Math.sin(a) * r, cores[i % 2]);
    }
    px(ctx, de.x - 1, de.y - 1, cores[0], 2);
  }

  const voando = t >= tSolta && t <= tImp;
  switch (e.fx) {
    case "corte":
    case "corteGrande":
    case "espinhos": {
      if (e.fx === "espinhos") {
        // chicote de espinhos: cipó em zigue-zague que puxa
        if (t >= tSolta && pos < 8) {
          const kk = Math.min(1, k * 1.4);
          const n = 14;
          let prev = de;
          for (let i = 1; i <= n * kk; i++) {
            const u = i / n;
            const q = { x: lerp(de.x, alvo.x, u) + Math.sin(u * 12 + t) * 2, y: lerp(de.y, alvo.y, u) + Math.cos(u * 10) * 2 };
            linhaPx(ctx, prev.x, prev.y, q.x, q.y, i % 2 ? "#4fa83c" : "#2f6a2a");
            if (i % 3 === 0) px(ctx, q.x + 1, q.y - 1, "#d8f0a0");
            prev = q;
          }
        }
        if (pos >= 0 && pos < 10 && e.acertou[0]) explosao(ctx, alvo, pos / 10, VERDE, 10, 9, seed);
        break;
      }
      // arco do golpe (meia-lua branca) no alvo
      if (pos >= -2 && pos < 7) {
        const grande = e.fx === "corteGrande";
        const r = grande ? 15 : 11;
        const ang0 = Math.atan2(alvo.y - de.y, alvo.x - de.x) - 1.3;
        const prog = Math.min(1, (pos + 2) / 4);
        for (let i = 0; i < 18 * prog; i++) {
          const a = ang0 + (i / 18) * 2.6;
          const fade = pos > 3 ? 1 - (pos - 3) / 4 : 1;
          if (hash3(i, seed, pos) > fade + 0.2) continue;
          const cx = alvo.x - Math.cos(ang0 + 1.3) * 6,
            cy = alvo.y - Math.sin(ang0 + 1.3) * 6;
          px(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, "#ffffff", grande ? 2 : 1);
          px(ctx, cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2) * 0.8, "#c8e0ff");
        }
      }
      if (pos >= 0 && pos < 8 && e.acertou[0]) explosao(ctx, alvo, pos / 8, ["#ffffff", "#ffe0a0", "#c8c8d8"], 8, 10, seed);
      break;
    }
    case "estocada": {
      if (pos >= -2 && pos < 5) {
        const ang = Math.atan2(alvo.y - de.y, alvo.x - de.x);
        for (let i = 0; i < 12; i++) px(ctx, alvo.x - Math.cos(ang) * (14 - i), alvo.y - Math.sin(ang) * (14 - i), i > 8 ? "#ffffff" : "#c8d0e0");
      }
      if (pos >= 0 && pos < 7 && e.acertou[0]) explosao(ctx, alvo, pos / 7, ["#ffffff", "#e0e0f0"], 6, 7, seed);
      break;
    }
    case "impacto":
    case "soco": {
      if (pos >= 0 && pos < 8 && e.acertou[0]) {
        const r = 3 + pos * 1.4;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          linhaPx(ctx, alvo.x + Math.cos(a) * r, alvo.y + Math.sin(a) * r * 0.8, alvo.x + Math.cos(a) * (r + 3), alvo.y + Math.sin(a) * (r + 3) * 0.8, i % 2 ? "#ffffff" : "#ffe27a");
        }
        if (pos < 3) px(ctx, alvo.x - 2, alvo.y - 2, "#ffffff", 4);
      } else if (pos >= 0 && pos < 5) anelPx(ctx, alvo.x, alvo.y, 4 + pos * 2, "#c8c8d8", 0.7, 0.5, seed);
      break;
    }
    case "flecha": {
      if (voando) {
        const p = { x: lerp(de.x, alvo.x, k), y: lerp(de.y, alvo.y, k) - Math.sin(k * Math.PI) * 6 };
        const ang = Math.atan2(alvo.y - de.y, alvo.x - de.x);
        linhaPx(ctx, p.x - Math.cos(ang) * 6, p.y - Math.sin(ang) * 6, p.x, p.y, "#8a5c36");
        px(ctx, p.x, p.y, "#e8e8f0", 2);
        px(ctx, p.x - Math.cos(ang) * 6, p.y - Math.sin(ang) * 6 - 1, "#f4f0e4");
        px(ctx, p.x - Math.cos(ang) * 6, p.y - Math.sin(ang) * 6 + 1, "#c83a3a");
        for (let i = 1; i < 6; i++) {
          const kk = Math.max(0, k - i * 0.05);
          px(ctx, lerp(de.x, alvo.x, kk), lerp(de.y, alvo.y, kk) - Math.sin(kk * Math.PI) * 6, `rgba(255,240,200,${0.5 - i * 0.08})`);
        }
      }
      if (pos >= 0 && pos < 6) {
        if (e.acertou[0]) explosao(ctx, alvo, pos / 6, ["#ffffff", "#e8dcc0"], 6, 7, seed);
        else px(ctx, alvo.x + 8 + pos * 3, alvo.y + 6, "#8a5c36", 2);
      }
      break;
    }
    case "raioFogo":
    case "chama":
    case "orbe":
    case "rajada":
    case "raioGuia": {
      const corP = e.fx === "orbe" ? cores : e.fx === "rajada" ? MAGENTA : e.fx === "raioGuia" ? OURO : FOGO;
      if (voando) {
        const arco = e.fx === "chama" ? 14 : e.fx === "orbe" ? 4 : 0;
        const p = { x: lerp(de.x, alvo.x, k), y: lerp(de.y, alvo.y, k) - Math.sin(k * Math.PI) * arco };
        // rastro
        for (let i = 1; i < 8; i++) {
          const kk = Math.max(0, k - i * 0.045);
          const q = { x: lerp(de.x, alvo.x, kk), y: lerp(de.y, alvo.y, kk) - Math.sin(kk * Math.PI) * arco };
          px(ctx, q.x + (hash3(i, t, seed) - 0.5) * 3, q.y + (hash3(i, t, seed + 1) - 0.5) * 3, corP[Math.min(corP.length - 1, 1 + Math.floor(i / 2))]);
        }
        const r = e.fx === "orbe" ? 3 : 2;
        ctx.fillStyle = corP[1];
        ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r + 1), r * 2, r * 2 - 2);
        ctx.fillRect(Math.round(p.x - r + 1), Math.round(p.y - r), r * 2 - 2, r * 2);
        px(ctx, p.x - 1, p.y - 1, corP[0], 2);
        if (e.fx === "rajada") {
          // estalos de energia em volta
          for (let i = 0; i < 3; i++) px(ctx, p.x + (hash3(i, t) - 0.5) * 8, p.y + (hash3(i, t + 7) - 0.5) * 8, corP[0]);
        }
        luz(p, 46, e.fx === "rajada" ? [220, 90, 220] : e.fx === "raioGuia" ? [255, 220, 120] : e.fx === "orbe" ? [160, 230, 90] : [255, 140, 50], 0.7);
      }
      if (pos >= 0 && pos < 12) {
        const ok = e.acertou[0];
        explosao(ctx, ok ? alvo : { x: alvo.x + 12, y: alvo.y + 6 }, pos / 12, corP, ok ? 22 : 8, ok ? 16 : 7, seed);
        if (ok && pos < 4) {
          ctx.fillStyle = corP[0];
          ctx.fillRect(Math.round(alvo.x - 3), Math.round(alvo.y - 3), 6, 6);
        }
        if (ok) luz(alvo, 90 - pos * 4, e.fx === "rajada" ? [220, 90, 220] : e.fx === "raioGuia" ? [255, 220, 120] : e.fx === "orbe" ? [160, 230, 90] : [255, 150, 60], 1 - pos / 12);
      }
      break;
    }
    case "misseis": {
      if (voando) {
        for (let m = 0; m < 3; m++) {
          const curva = (m - 1) * 26;
          const cx = (de.x + alvo.x) / 2 + curva,
            cy = Math.min(de.y, alvo.y) - 22 - m * 6;
          const kk = Math.min(1, k * (1 + m * 0.08));
          const bx = (1 - kk) ** 2 * de.x + 2 * (1 - kk) * kk * cx + kk * kk * alvo.x;
          const by = (1 - kk) ** 2 * de.y + 2 * (1 - kk) * kk * cy + kk * kk * alvo.y;
          for (let i = 1; i < 6; i++) {
            const k2 = Math.max(0, kk - i * 0.05);
            const qx = (1 - k2) ** 2 * de.x + 2 * (1 - k2) * k2 * cx + k2 * k2 * alvo.x;
            const qy = (1 - k2) ** 2 * de.y + 2 * (1 - k2) * k2 * cy + k2 * k2 * alvo.y;
            px(ctx, qx, qy, MAGENTA[Math.min(3, Math.floor(i / 2) + 1)]);
          }
          px(ctx, bx - 1, by - 1, MAGENTA[0], 3);
          px(ctx, bx, by, "#ffffff");
        }
        luz({ x: (de.x + alvo.x) / 2, y: (de.y + alvo.y) / 2 }, 60, [230, 90, 220], 0.6);
      }
      if (pos >= 0 && pos < 10) {
        explosao(ctx, alvo, pos / 10, MAGENTA, 18, 12, seed);
        luz(alvo, 70, [230, 90, 220], 1 - pos / 10);
      }
      break;
    }
    case "raioGelo": {
      if (t >= tSolta && pos < 5) {
        const ang = Math.atan2(alvo.y - de.y, alvo.x - de.x);
        const L = Math.hypot(alvo.x - de.x, alvo.y - de.y) * Math.min(1, k * 1.5 + 0.2);
        const fim = { x: de.x + Math.cos(ang) * L, y: de.y + Math.sin(ang) * L };
        linhaPx(ctx, de.x, de.y, fim.x, fim.y, "#7ad0f8", 3);
        linhaPx(ctx, de.x, de.y, fim.x, fim.y, "#ffffff", 1);
        for (let i = 0; i < 10; i++) {
          const u = hash3(i, t, seed);
          px(ctx, lerp(de.x, fim.x, u) + (hash3(i, t + 1) - 0.5) * 6, lerp(de.y, fim.y, u) + (hash3(i, t + 2) - 0.5) * 6, GELO[i % 3]);
        }
        luz(fim, 70, [150, 220, 255], 0.9);
      }
      if (pos >= 0 && pos < 12 && e.acertou[0]) {
        explosao(ctx, alvo, pos / 12, GELO, 16, 12, seed);
        // cristais de gelo
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          linhaPx(ctx, alvo.x, alvo.y + 4, alvo.x + Math.cos(a) * 6, alvo.y + 4 + Math.sin(a) * 4, "#c8f0ff");
        }
      }
      break;
    }
    case "bolaFogo": {
      // conta de fogo voa até o centro dos alvos e explode numa esfera de 20 pés
      const c = { x: para.reduce((t, q) => t + q.x, 0) / Math.max(1, para.length), y: para.reduce((t, q) => t + q.y, 0) / Math.max(1, para.length) };
      if (voando) {
        const p = { x: lerp(de.x, c.x, k), y: lerp(de.y, c.y, k) - Math.sin(k * Math.PI) * 18 };
        for (let i = 1; i < 6; i++) {
          const kk = Math.max(0, k - i * 0.05);
          px(ctx, lerp(de.x, c.x, kk), lerp(de.y, c.y, kk) - Math.sin(kk * Math.PI) * 18, FOGO[Math.min(4, i)]);
        }
        px(ctx, p.x - 1, p.y - 1, FOGO[0], 3);
        luz(p, 40, [255, 150, 60], 0.7);
      }
      if (pos >= 0 && pos < 18) {
        const tt = pos / 18;
        const r = 10 + ease(Math.min(1, pos / 7)) * 70;
        const a = 1 - tt;
        // núcleo e bordas da esfera (achatada, vista de cima)
        for (let i = 0; i < 140; i++) {
          const ang = hash3(i, seed) * Math.PI * 2;
          const d = Math.sqrt(hash3(i, seed + 1)) * r;
          if (hash3(i, t, seed) > a + 0.15) continue;
          px(ctx, c.x + Math.cos(ang) * d, c.y + Math.sin(ang) * d * 0.6 - tt * 6, FOGO[Math.min(4, Math.floor((d / r) * 3 + tt * 2))], i % 6 === 0 ? 2 : 1);
        }
        anelPx(ctx, c.x, c.y, r, `rgba(255,208,80,${a})`, 0.6, 0.2, seed);
        if (pos < 4) {
          ctx.fillStyle = `rgba(255,246,192,${0.8 - pos * 0.2})`;
          ctx.fillRect(Math.round(c.x - r * 0.4), Math.round(c.y - r * 0.25), Math.round(r * 0.8), Math.round(r * 0.5));
        }
        luz(c, 160, [255, 140, 50], a * 1.4);
      }
      break;
    }
    case "relampago": {
      // linha de 100 pés: raio em zigue-zague de quem lança até depois do último alvo
      if (pos >= -2 && pos < 9) {
        const ult = para.reduce((m, q) => (Math.hypot(q.x - de.x, q.y - de.y) > Math.hypot(m.x - de.x, m.y - de.y) ? q : m), alvo);
        const ang = Math.atan2(ult.y - de.y, ult.x - de.x);
        const L = Math.hypot(ult.x - de.x, ult.y - de.y) + 40;
        const a = pos < 4 ? 1 : 1 - (pos - 4) / 5;
        if (Math.floor(t / 2) % 3 !== 2 || pos < 3) {
          let x0 = de.x,
            y0 = de.y;
          const passos = Math.max(4, Math.round(L / 12));
          for (let i = 1; i <= passos; i++) {
            const d = (i / passos) * L;
            const desvio = (hash3(i, Math.floor(t / 2), seed) - 0.5) * 10;
            const x1 = de.x + Math.cos(ang) * d - Math.sin(ang) * desvio,
              y1 = de.y + Math.sin(ang) * d + Math.cos(ang) * desvio;
            linhaPx(ctx, x0, y0, x1, y1, `rgba(255,242,122,${a})`, 3);
            linhaPx(ctx, x0, y0, x1, y1, `rgba(255,255,255,${a})`, 1);
            x0 = x1;
            y0 = y1;
          }
        }
        luz({ x: de.x + Math.cos(ang) * L * 0.5, y: de.y + Math.sin(ang) * L * 0.5 }, 140, [255, 250, 200], a * 1.3);
      }
      if (pos >= 0 && pos < 10) para.forEach((q, i) => e.acertou[i] && explosao(ctx, q, pos / 10, ["#ffffff", "#fff27a", "#f2d23a"], 12, 10, seed + i));
      break;
    }
    case "despedacar": {
      // estrondo numa esfera de 10 pés: anéis e estilhaços
      const c = { x: para.reduce((t, q) => t + q.x, 0) / Math.max(1, para.length), y: para.reduce((t, q) => t + q.y, 0) / Math.max(1, para.length) };
      if (pos >= -2 && pos < 12) {
        const tt = (pos + 2) / 14;
        const a = 1 - tt;
        for (let k2 = 0; k2 < 3; k2++) anelPx(ctx, c.x, c.y, 6 + ease(Math.max(0, tt - k2 * 0.12)) * 40, `rgba(${k2 === 1 ? "255,255,255" : "140,190,255"},${a})`, 0.6, 0.25, seed + k2);
        explosao(ctx, c, tt, AZUL, 26, 38, seed);
        luz(c, 110, [170, 200, 255], a * 1.2);
      }
      break;
    }
    case "raioCeu": {
      // relâmpago caindo do céu em cada alvo
      if (pos >= -3 && pos < 9) {
        const a = pos < 3 ? 1 : 1 - (pos - 3) / 6;
        para.forEach((q, i) => {
          if (Math.floor(t / 2 + i) % 3 === 2 && pos > 1) return;
          let x0 = q.x + (hash3(i, seed) - 0.5) * 20,
            y0 = q.y - 150;
          for (let j = 1; j <= 10; j++) {
            const x1 = q.x + (hash3(i, j, Math.floor(t / 2)) - 0.5) * (12 - j),
              y1 = q.y - 150 + j * 15;
            linhaPx(ctx, x0, y0, x1, y1, `rgba(255,242,122,${a})`, 3);
            linhaPx(ctx, x0, y0, x1, y1, `rgba(255,255,255,${a})`, 1);
            x0 = x1;
            y0 = y1;
          }
          luz(q, 120, [255, 250, 200], a * 1.3);
        });
      }
      if (pos >= 0 && pos < 10) para.forEach((q, i) => explosao(ctx, q, pos / 10, ["#ffffff", "#fff27a", "#f2d23a", "#a88a1a"], 16, 14, seed + i));
      break;
    }
    case "onda": {
      if (pos >= -3 && pos < 12) {
        const tt = (pos + 3) / 15;
        const r = 6 + ease(tt) * 46;
        const a = 1 - tt;
        anelPx(ctx, de.x, de.y + 8, r, `rgba(140,190,255,${a})`, 0.6);
        anelPx(ctx, de.x, de.y + 8, r - 3, `rgba(255,255,255,${a * 0.9})`, 0.6, 0.3, seed);
        anelPx(ctx, de.x, de.y + 8, r - 7, `rgba(58,111,224,${a * 0.8})`, 0.6, 0.5, seed + 3);
        luz(de, 100, [170, 200, 255], a * 1.1);
      }
      break;
    }
    case "chamaSagrada":
    case "fulgor": {
      // coluna de luz dourada caindo no alvo
      if (pos >= -6 && pos < 10) {
        const a = pos < 0 ? (pos + 6) / 6 : 1 - pos / 10;
        const larg = e.fx === "fulgor" ? 9 : 7;
        ctx.fillStyle = `rgba(255,226,122,${a * 0.55})`;
        ctx.fillRect(Math.round(alvo.x - larg / 2), alvo.y - 120, larg, 124);
        ctx.fillStyle = `rgba(255,251,224,${a * 0.9})`;
        ctx.fillRect(Math.round(alvo.x - 1), alvo.y - 120, 3, 124);
        for (let i = 0; i < 10; i++) px(ctx, alvo.x + (hash3(i, seed) - 0.5) * 14, alvo.y - ((t * 3 + i * 13) % 60), OURO[i % 3]);
        luz(alvo, 90, [255, 220, 120], a * 1.1);
      }
      if (pos >= 0 && pos < 10) explosao(ctx, alvo, pos / 10, OURO, 14, 12, seed);
      break;
    }
    case "zombaria":
    case "sussurros": {
      if (voando || (pos >= 0 && pos < 6)) {
        const n = e.fx === "zombaria" ? 4 : 6;
        for (let i = 0; i < n; i++) {
          const kk = Math.min(1, Math.max(0, k - i * 0.1));
          const p = { x: lerp(de.x, alvo.x, kk) + Math.sin(kk * 9 + i) * 5, y: lerp(de.y, alvo.y, kk) - 10 + Math.cos(kk * 7 + i) * 4 };
          if (e.fx === "zombaria") {
            // nota musical
            px(ctx, p.x, p.y, "#ff9ac8", 2);
            linhaPx(ctx, p.x + 1, p.y, p.x + 1, p.y - 4, "#ffe8f4");
            px(ctx, p.x + 2, p.y - 4, "#ffe8f4");
          } else {
            // ondas dissonantes
            for (let j = 0; j < 5; j++) px(ctx, p.x + j - 2, p.y + Math.sin(j + t) * 1.5, ROSA[(i + j) % 3]);
          }
        }
        luz(alvo, 50, [255, 140, 200], 0.6);
      }
      if (pos >= 0 && pos < 10 && e.acertou[0]) explosao(ctx, alvo, pos / 10, ROSA, 12, 10, seed);
      break;
    }
    case "sopro": {
      // cone de sopro do draconato
      if (pos >= -6 && pos < 8) {
        const ang = Math.atan2(alvo.y - de.y, alvo.x - de.x);
        const prog = Math.min(1, (pos + 6) / 6);
        const a = pos > 2 ? 1 - (pos - 2) / 6 : 1;
        for (let i = 0; i < 70; i++) {
          const d = hash3(i, seed) * 64 * prog;
          const ab = ang + (hash3(i, seed + 1) - 0.5) * (Math.PI / 2) * (d / 64);
          if (hash3(i, t) > a + 0.1) continue;
          px(ctx, de.x + Math.cos(ab) * d, de.y + Math.sin(ab) * d * 0.8, cores[Math.min(cores.length - 1, Math.floor((d / 64) * cores.length))], i % 5 === 0 ? 2 : 1);
        }
        const meio = { x: de.x + Math.cos(ang) * 30, y: de.y + Math.sin(ang) * 24 };
        luz(meio, 100, e.tipo === "fogo" ? [255, 140, 50] : e.tipo === "frio" ? [150, 220, 255] : e.tipo === "eletrico" ? [255, 255, 200] : [170, 240, 90], a);
      }
      break;
    }
    case "furia": {
      // vapor vermelho subindo
      if (t < 24) {
        for (let i = 0; i < 14; i++) {
          const ph = (t * 1.3 + i * 5) % 20;
          px(ctx, de.x + (hash3(i, seed) - 0.5) * 18, de.y + 10 - ph * 1.6, ph < 10 ? "#ff6a4a" : "rgba(200,60,50,0.5)", ph < 6 ? 2 : 1);
        }
        if (t < 6) anelPx(ctx, de.x, de.y + 10, 6 + t * 3, "#ffb03a", 0.6);
        luz(de, 70, [255, 90, 60], 0.8 * (1 - t / 24));
      }
      break;
    }
    case "marca": {
      if (pos >= -4 && pos < 14) {
        const r = Math.max(5, 12 - (pos + 4));
        anelPx(ctx, alvo.x, alvo.y, r, "#b8f060", 1);
        linhaPx(ctx, alvo.x - r - 3, alvo.y, alvo.x - r + 2, alvo.y, "#b8f060");
        linhaPx(ctx, alvo.x + r - 2, alvo.y, alvo.x + r + 3, alvo.y, "#b8f060");
        linhaPx(ctx, alvo.x, alvo.y - r - 3, alvo.x, alvo.y - r + 2, "#b8f060");
        linhaPx(ctx, alvo.x, alvo.y + r - 2, alvo.x, alvo.y + r + 3, "#b8f060");
      }
      break;
    }
    case "bruxaria": {
      if (pos >= -4 && pos < 14) {
        const a = pos < 6 ? 1 : 1 - (pos - 6) / 8;
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + t * 0.2;
          px(ctx, alvo.x + Math.cos(ang) * 9, alvo.y - 6 + Math.sin(ang) * 5, `rgba(192,122,255,${a})`);
        }
        // caveirinha roxa
        ctx.fillStyle = `rgba(192,122,255,${a})`;
        ctx.fillRect(Math.round(alvo.x - 2), Math.round(alvo.y - 22), 5, 4);
        ctx.fillRect(Math.round(alvo.x - 1), Math.round(alvo.y - 18), 3, 1);
        ctx.fillStyle = `rgba(40,10,60,${a})`;
        ctx.fillRect(Math.round(alvo.x - 1), Math.round(alvo.y - 21), 1, 1);
        ctx.fillRect(Math.round(alvo.x + 1), Math.round(alvo.y - 21), 1, 1);
        luz(alvo, 50, [170, 90, 230], a * 0.7);
      }
      break;
    }
    case "cura":
    case "brilho":
    case "escudo": {
      const cor = e.fx === "cura" ? VERDE : e.fx === "escudo" ? ["#e0ffff", "#7ae8f0", "#3ab8c8"] : [e.cor, "#ffffff", e.cor];
      const c = para[0] ?? de;
      if (pos >= -6 && pos < 18) {
        for (let i = 0; i < 12; i++) {
          const ph = (t * 1.2 + i * 7) % 24;
          const x = c.x + (hash3(i, seed) - 0.5) * 20;
          const y = c.y + 12 - ph * 1.4;
          if (e.fx === "cura") {
            // cruzinhas verdes subindo
            px(ctx, x, y, cor[i % 2]);
            px(ctx, x - 1, y, cor[1]);
            px(ctx, x + 1, y, cor[1]);
            px(ctx, x, y - 1, cor[1]);
            px(ctx, x, y + 1, cor[1]);
          } else px(ctx, x, y, cor[i % 3], i % 4 === 0 ? 2 : 1);
        }
        if (pos >= 0 && pos < 8) anelPx(ctx, c.x, c.y + 12, 4 + pos * 2, cor[1], 0.5, 0.2, seed);
        luz(c, 60, e.fx === "cura" ? [140, 255, 140] : [255, 240, 180], 0.6);
      }
      break;
    }
    default:
      break;
  }
  return luzes;
};

// d20 girando ao lado de quem ataca: 0,2 s girando e para no resultado
export const desenharD20 = (ctx: Ctx, x: number, y: number, valor: number, t: number, cor: string, desenharNumero: (n: string, x: number, y: number) => void) => {
  const girando = t < 6;
  const ang = girando ? t * 1.1 : 0;
  const R = 7;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) pts.push([x + Math.cos(-Math.PI / 2 + (i * Math.PI) / 3 + ang) * R, y + Math.sin(-Math.PI / 2 + (i * Math.PI) / 3 + ang) * R]);
  // preenche hexágono
  ctx.fillStyle = "#1a1418";
  ctx.beginPath();
  pts.forEach(([a, b], i) => (i ? ctx.lineTo(Math.round(a), Math.round(b)) : ctx.moveTo(Math.round(a), Math.round(b))));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = girando ? "#d8d4e0" : cor;
  ctx.beginPath();
  pts.forEach(([a, b], i) => {
    const xx = x + (a - x) * 0.8,
      yy = y + (b - y) * 0.8;
    if (i) ctx.lineTo(Math.round(xx), Math.round(yy));
    else ctx.moveTo(Math.round(xx), Math.round(yy));
  });
  ctx.closePath();
  ctx.fill();
  // facetas
  for (let i = 0; i < 6; i += 2) linhaPx(ctx, x, y, pts[i][0] * 0.8 + x * 0.2, pts[i][1] * 0.8 + y * 0.2, "rgba(0,0,0,0.25)");
  const n = girando ? String(1 + Math.floor(hash3(t, 99) * 20)) : String(valor);
  desenharNumero(n, x, y - 3);
};
