// Efeitos visuais dos golpes (partículas e brilho) + as luzes que eles jogam no chão.
import { Buf, anel, elipse, linha, px, somar } from "../arte/buffer";
import { misturar, RGB } from "../arte/cor";
import { Luz } from "../arte/arena";
import { Fx } from "../linha";
import { COR_DANO } from "../sim/tabelas";
import { hex } from "../arte/cor";
import { P } from "../sim/combate";

const rnd = (a: number, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const BRANCO: RGB = [255, 255, 255];
const peito = (p: P): P => ({ x: p.x, y: p.y - 26 });

/** posição atual do alvo (se o lutador andou) */
export type PosFn = (id: number) => P | null;

const corDoFx = (f: Fx): RGB => (f.dano && f.dano !== "cortante" && f.dano !== "perfurante" && f.dano !== "concussao" ? hex(COR_DANO[f.dano]) : f.cor);

/** luzes que o efeito projeta no chão (para o mapa de luz) */
export const luzesFx = (fx: Fx[], w: number, pos: PosFn): Luz[] => {
  const out: Luz[] = [];
  for (const f of fx) {
    if (w < f.t0 || w > f.t1) continue;
    const de = pos(f.ator) ?? f.de;
    const para = f.alvos.length ? pos(f.alvos[0]) ?? f.para : f.para;
    const cor = corDoFx(f);
    const forte = ["bolaFogo", "colunaLuz", "raioLuz", "onda", "sopro", "orbe", "dardos", "rajada", "gelo"].indexOf(f.tipo) >= 0;
    if (!forte && f.tipo !== "cura" && f.tipo !== "vapor") continue;
    if (w >= f.tR && w < f.tI) {
      const k = (w - f.tR) / Math.max(1, f.tI - f.tR);
      out.push({ x: de.x + (para.x - de.x) * k, y: de.y + (para.y - de.y) * k - 10, raio: 45, forca: 0.9, cor });
    } else if (w >= f.tI && w < f.tI + 14) {
      const k = 1 - (w - f.tI) / 14;
      const raio = f.tipo === "colunaLuz" || f.tipo === "onda" ? 90 : 70;
      out.push({ x: f.tipo === "onda" ? de.x : para.x, y: f.tipo === "onda" ? de.y : para.y, raio, forca: 1.4 * k, cor });
    } else if (w < f.tR) {
      out.push({ x: de.x, y: de.y - 26, raio: 30, forca: 0.5 * ((w - f.t0) / Math.max(1, f.tR - f.t0)), cor });
    }
  }
  return out;
};

export const desenharFx = (b: Buf, fx: Fx[], w: number, pos: PosFn) => {
  for (const f of fx) {
    if (w < f.t0 || w > f.t1 + 4) continue;
    const de = pos(f.ator) ?? f.de;
    const alvoP = f.alvos.length ? pos(f.alvos[0]) ?? f.para : f.para;
    const cor = corDoFx(f);
    const A = peito(de);
    const B = peito(alvoP);
    const voo = w >= f.tR && w < f.tI;
    const k = (w - f.tR) / Math.max(1, f.tI - f.tR);
    const pi = w - f.tI; // quadros depois do impacto
    const at = { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k };
    // carga nas mãos antes de soltar (magias)
    if (w >= f.t0 && w < f.tR && ["bolaFogo", "dardos", "orbe", "rajada", "gelo", "raioLuz", "notas", "espinhos", "colunaLuz", "onda", "sopro", "cura"].indexOf(f.tipo) >= 0) {
      const c = (w - f.t0) / Math.max(1, f.tR - f.t0);
      for (let i = 0; i < 6; i++) {
        const ang = w * 0.4 + i * 1.05;
        const r = 8 * (1 - c) + 2;
        px(b, A.x + Math.cos(ang) * r, A.y - 6 + Math.sin(ang) * r, misturar(cor, BRANCO, 0.4), 0.9);
      }
      elipse(b, A.x, A.y - 6, 1 + c * 2, 1 + c * 2, misturar(cor, BRANCO, 0.6));
    }
    switch (f.tipo) {
      case "corte":
      case "estocada": {
        if (pi >= -2 && pi < 7) {
          const lado = Math.sign(B.x - A.x) || 1;
          const t = (pi + 2) / 9;
          if (f.tipo === "corte") {
            for (let a = -1.2; a <= 1.2; a += 0.08) {
              const ang = a + (lado > 0 ? 0 : Math.PI) - t * 0.6 * lado;
              const r = 12 + Math.cos(a) * 3;
              const al = (1 - t) * (1 - Math.abs(a) / 1.3);
              px(b, B.x - lado * 4 + Math.cos(ang) * r, B.y + Math.sin(ang) * r * 0.9, misturar(cor, BRANCO, 0.5), al);
              px(b, B.x - lado * 4 + Math.cos(ang) * (r - 1), B.y + Math.sin(ang) * (r - 1) * 0.9, BRANCO, al);
            }
          } else {
            for (let d = -10; d < 8; d++) px(b, B.x - lado * d, B.y - 2, BRANCO, (1 - t) * (1 - Math.abs(d) / 12));
          }
          faiscas(b, B, pi, cor, f.t0);
        }
        break;
      }
      case "impacto":
      case "soco":
        if (pi >= 0 && pi < 8) {
          estrela(b, B, pi, misturar(cor, BRANCO, 0.4));
          anel(b, B.x, B.y, 3 + pi * 1.6, 2 + pi, 1, BRANCO, 1 - pi / 8);
        }
        break;
      case "flecha":
        if (voo) {
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const n = Math.hypot(dx, dy) || 1;
          const ux = dx / n;
          const uy = dy / n;
          const arc = Math.sin(k * Math.PI) * -10;
          const p = { x: at.x, y: at.y + arc };
          linha(b, p.x - ux * 7, p.y - uy * 7, p.x, p.y, [200, 160, 110]);
          px(b, p.x + ux, p.y + uy, [230, 230, 240]);
          px(b, p.x - ux * 7 - uy, p.y - uy * 7 + ux, [220, 220, 220]);
          for (let t = 1; t < 6; t++) px(b, p.x - ux * (7 + t * 2), p.y - uy * (7 + t * 2) - arc * 0.05 * t, [240, 230, 200], 0.35 - t * 0.05);
        }
        if (pi >= 0 && pi < 6) estrela(b, B, pi, [240, 230, 200]);
        break;
      case "bolaFogo":
      case "orbe":
      case "raioLuz":
        if (voo) {
          const r = f.tipo === "orbe" ? 3.5 : 2.5;
          for (let t = 1; t < 9; t++) {
            const tt = Math.max(0, k - t * 0.04);
            const q = { x: A.x + (B.x - A.x) * tt + (rnd(w, t) - 0.5) * 3, y: A.y + (B.y - A.y) * tt + (rnd(t, w) - 0.5) * 3 };
            px(b, q.x, q.y, t < 3 ? misturar(cor, BRANCO, 0.5) : cor, 1 - t / 9);
          }
          elipse(b, at.x, at.y, r + 1, r + 1, cor);
          elipse(b, at.x, at.y, r * 0.6, r * 0.6, misturar(cor, BRANCO, 0.8));
        }
        if (pi >= 0 && pi < 12) explosao(b, B, pi, cor, f.t0, f.tipo === "orbe" ? 1.3 : 1);
        if (f.tipo === "raioLuz" && pi >= 0 && pi < 16) brilhos(b, B, pi, [255, 230, 120], f.t0);
        break;
      case "dardos":
        if (w >= f.tR && w < f.tI + 2) {
          for (let d = 0; d < 3; d++) {
            const kk = Math.min(1, Math.max(0, (w - f.tR - d * 2) / Math.max(1, f.tI - f.tR)));
            if (kk <= 0 || kk >= 1) continue;
            const curva = Math.sin(kk * Math.PI) * (d - 1) * 18;
            const nx = -(B.y - A.y);
            const ny = B.x - A.x;
            const nn = Math.hypot(nx, ny) || 1;
            const q = { x: A.x + (B.x - A.x) * kk + (nx / nn) * curva, y: A.y + (B.y - A.y) * kk + (ny / nn) * curva - Math.sin(kk * Math.PI) * 8 };
            elipse(b, q.x, q.y, 1.6, 1.6, misturar(cor, BRANCO, 0.6));
            for (let t = 1; t < 5; t++) px(b, q.x - (B.x - A.x) * 0.02 * t, q.y - (B.y - A.y) * 0.02 * t + t * 0.6, cor, 1 - t / 5);
          }
        }
        if (pi >= 0 && pi < 10) for (let d = 0; d < 3; d++) estrela(b, { x: B.x + (d - 1) * 3, y: B.y + (d % 2) * 3 }, pi - d * 2, misturar(cor, BRANCO, 0.4));
        break;
      case "gelo":
        if (w >= f.tR && w < f.tI + 6) {
          const al = w < f.tI ? 1 : 1 - (w - f.tI) / 6;
          const ate = w < f.tI ? k : 1;
          const fim = { x: A.x + (B.x - A.x) * ate, y: A.y + (B.y - A.y) * ate };
          linha(b, A.x, A.y, fim.x, fim.y, cor, al, 3);
          linha(b, A.x, A.y, fim.x, fim.y, BRANCO, al);
          for (let i = 0; i < 6; i++) {
            const t = rnd(w, i);
            px(b, A.x + (fim.x - A.x) * t + (rnd(i, w) - 0.5) * 6, A.y + (fim.y - A.y) * t + (rnd(w, i, 2) - 0.5) * 6, BRANCO, al);
          }
        }
        if (pi >= 0 && pi < 14) cristais(b, B, pi, cor);
        break;
      case "rajada":
        if (w >= f.tR && w < f.tI + 4) {
          const ate = w < f.tI ? k : 1;
          const al = w < f.tI ? 1 : 1 - (w - f.tI) / 4;
          let prev = A;
          const n = 8;
          for (let i = 1; i <= n; i++) {
            const t = (i / n) * ate;
            const q = { x: A.x + (B.x - A.x) * t + (i < n ? (rnd(w, i) - 0.5) * 8 : 0), y: A.y + (B.y - A.y) * t + (i < n ? (rnd(i, w) - 0.5) * 8 : 0) };
            linha(b, prev.x, prev.y, q.x, q.y, cor, al, 2);
            linha(b, prev.x, prev.y, q.x, q.y, misturar(cor, BRANCO, 0.7), al);
            prev = q;
          }
        }
        if (pi >= 0 && pi < 10) explosao(b, B, pi, cor, f.t0, 0.8);
        break;
      case "sombra":
      case "marca": {
        const t = w - f.tR;
        if (t >= 0 && t < 24) {
          const al = t < 18 ? 1 : 1 - (t - 18) / 6;
          const r = 12 - Math.min(8, t * 0.6);
          anel(b, B.x, B.y, r, r, 1, cor, al);
          linha(b, B.x - r - 3, B.y, B.x - r + 3, B.y, cor, al);
          linha(b, B.x + r - 3, B.y, B.x + r + 3, B.y, cor, al);
          linha(b, B.x, B.y - r - 3, B.x, B.y - r + 3, cor, al);
          linha(b, B.x, B.y + r - 3, B.x, B.y + r + 3, cor, al);
          if (f.tipo === "sombra")
            for (let i = 0; i < 10; i++) {
              const ang = t * 0.25 + i * 0.63;
              px(b, B.x + Math.cos(ang) * (r + 4), B.y + Math.sin(ang) * (r + 4) * 0.7 - t * 0.3, cor, al * 0.8);
            }
        }
        break;
      }
      case "colunaLuz":
        if (pi >= -4 && pi < 14) {
          const al = pi < 0 ? (pi + 4) / 4 : 1 - pi / 14;
          const base = { x: alvoP.x, y: alvoP.y };
          const larg = pi < 2 ? 4 + (pi + 4) : 10 - pi * 0.4;
          for (let y = base.y - 120; y <= base.y; y++)
            for (let x = -larg; x <= larg; x++) {
              const c = 1 - Math.abs(x) / (larg + 1);
              somar(b, base.x + x, y, [255, 220, 120], al * c * 0.9);
            }
          if (pi >= 0) anel(b, base.x, base.y, 6 + pi * 1.5, 2 + pi * 0.5, 1, [255, 230, 140], al, true);
          brilhos(b, { x: base.x, y: base.y - 30 }, Math.max(0, pi), [255, 240, 170], f.t0);
        }
        break;
      case "onda": {
        if (pi >= -2 && pi < 14) {
          const t = Math.max(0, pi + 2);
          const r = t * 3.4;
          const al = 1 - t / 16;
          anel(b, de.x, de.y - 6, r, r * 0.6, 3, cor, al * 0.8, true);
          anel(b, de.x, de.y - 6, r * 0.8, r * 0.48, 1, BRANCO, al);
          for (let i = 0; i < 14; i++) {
            const ang = i * 0.45 + t * 0.05;
            px(b, de.x + Math.cos(ang) * (r + 3), de.y - 6 + Math.sin(ang) * (r + 3) * 0.6, BRANCO, al);
          }
        }
        break;
      }
      case "cura": {
        const t = w - f.tR;
        if (t >= -4 && t < 26) {
          const al = t < 18 ? 1 : 1 - (t - 18) / 8;
          for (let i = 0; i < 9; i++) {
            const ang = i * 0.7;
            const sub = (t + i * 3) % 24;
            const q = { x: alvoP.x + Math.cos(ang) * 10, y: alvoP.y - 6 - sub * 1.6 };
            px(b, q.x, q.y, [120, 255, 150], al);
            px(b, q.x - 1, q.y, [80, 220, 110], al * 0.8);
            px(b, q.x + 1, q.y, [80, 220, 110], al * 0.8);
            px(b, q.x, q.y - 1, [80, 220, 110], al * 0.8);
            px(b, q.x, q.y + 1, [80, 220, 110], al * 0.8);
          }
          anel(b, alvoP.x, alvoP.y - 2, 12, 4, 1, [120, 255, 150], al * 0.7, true);
        }
        break;
      }
      case "espinhos":
        if (w >= f.tR && w < f.tI + 8) {
          const ate = w < f.tI ? k : 1;
          const fim = { x: A.x + (B.x - A.x) * ate, y: A.y + (B.y - A.y) * ate };
          const n = Math.max(4, Math.round(Math.hypot(fim.x - A.x, fim.y - A.y) / 3));
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const q = { x: A.x + (fim.x - A.x) * t, y: A.y + (fim.y - A.y) * t + Math.sin(t * 12 + w * 0.5) * 2 };
            px(b, q.x, q.y, [70, 150, 60]);
            px(b, q.x, q.y + 1, [40, 100, 40]);
            if (i % 3 === 0) px(b, q.x + 1, q.y - 1, [200, 220, 120]);
          }
        }
        break;
      case "notas":
        if (voo || (pi >= 0 && pi < 14)) {
          for (let d = 0; d < 3; d++) {
            const kk = Math.min(1, Math.max(0, (w - f.tR - d * 2) / Math.max(1, f.tI - f.tR)));
            const q = voo ? { x: A.x + (B.x - A.x) * kk, y: A.y + (B.y - A.y) * kk - Math.sin(kk * Math.PI + d) * 10 } : { x: B.x + Math.cos(w * 0.3 + d * 2) * 9, y: B.y - 22 + Math.sin(w * 0.3 + d * 2) * 3 };
            nota(b, q, cor);
          }
        }
        break;
      case "sopro":
        if (pi >= -4 && pi < 12) {
          const t = pi + 4;
          const ang0 = Math.atan2(B.y - A.y, B.x - A.x);
          for (let i = 0; i < 70; i++) {
            const d = rnd(i, 7) * Math.min(1, t / 6) * 40;
            const a = ang0 + (rnd(i, 3) - 0.5) * 0.9 * (d / 40 + 0.3);
            const c = misturar(cor, BRANCO, d < 12 ? 0.5 : 0);
            px(b, A.x + Math.cos(a) * d, A.y - 8 + Math.sin(a) * d * 0.8 + (rnd(i, w) - 0.5) * 2, c, (1 - t / 16) * (1 - d / 48));
          }
        }
        break;
      case "vapor": {
        const t = w - f.t0;
        if (t >= 0 && t < 36) {
          for (let i = 0; i < 14; i++) {
            const sub = (t + i * 5) % 22;
            const q = { x: de.x + (rnd(i, 1) - 0.5) * 22 + Math.sin(sub * 0.3 + i) * 2, y: de.y - 4 - sub * 2 };
            px(b, q.x, q.y, misturar([220, 60, 40], [255, 160, 120], sub / 22), 0.8 * (1 - sub / 22) * (t < 28 ? 1 : 1 - (t - 28) / 8));
          }
        }
        break;
      }
      case "escudo": {
        const t = w - f.t0;
        if (t >= 0 && t < 18) {
          const al = t < 12 ? 0.9 : 0.9 * (1 - (t - 12) / 6);
          const c = { x: de.x, y: de.y - 26 };
          for (let i = 0; i < 6; i++) {
            const a0 = i * (Math.PI / 3) + Math.PI / 6;
            const a1 = a0 + Math.PI / 3;
            linha(b, c.x + Math.cos(a0) * 18, c.y + Math.sin(a0) * 24, c.x + Math.cos(a1) * 18, c.y + Math.sin(a1) * 24, [120, 240, 255], al, 1);
          }
          for (let i = 0; i < 8; i++) somar(b, c.x + (rnd(i, w) - 0.5) * 30, c.y + (rnd(w, i) - 0.5) * 40, [60, 120, 140], al);
        }
        break;
      }
      case "brilho": {
        const t = w - f.t0;
        if (t >= 0 && t < 24) brilhos(b, { x: de.x, y: de.y - 30 }, t, misturar(cor, BRANCO, 0.4), f.t0);
        break;
      }
      default:
        break;
    }
  }
};

const faiscas = (b: Buf, p: P, t: number, cor: RGB, s: number) => {
  for (let i = 0; i < 6; i++) {
    const ang = rnd(s, i) * Math.PI * 2;
    const d = (t + 2) * (1 + rnd(i, s));
    px(b, p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, misturar(cor, BRANCO, 0.6), 1 - (t + 2) / 9);
  }
};

const estrela = (b: Buf, p: P, t: number, cor: RGB) => {
  if (t < 0) return;
  const r = 2 + t * 1.2;
  const al = 1 - t / 8;
  for (let d = -r; d <= r; d++) {
    px(b, p.x + d, p.y, cor, al * (1 - Math.abs(d) / (r + 1)));
    px(b, p.x, p.y + d, cor, al * (1 - Math.abs(d) / (r + 1)));
  }
  for (let d = -r * 0.6; d <= r * 0.6; d++) {
    px(b, p.x + d, p.y + d, BRANCO, al * 0.6);
    px(b, p.x + d, p.y - d, BRANCO, al * 0.6);
  }
};

const explosao = (b: Buf, p: P, t: number, cor: RGB, s: number, esc: number) => {
  const r = (3 + t * 1.5) * esc;
  const al = 1 - t / 12;
  elipse(b, p.x, p.y, Math.max(1, r * 0.6 * (1 - t / 12)), Math.max(1, r * 0.6 * (1 - t / 12)), misturar(cor, BRANCO, 0.7), al);
  anel(b, p.x, p.y, r, r * 0.8, 2, cor, al, true);
  for (let i = 0; i < 12; i++) {
    const ang = rnd(s, i) * Math.PI * 2;
    const d = r * (0.8 + rnd(i, s) * 0.8);
    px(b, p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d - t * 0.5, i % 3 ? cor : [80, 70, 70], al);
  }
};

const brilhos = (b: Buf, p: P, t: number, cor: RGB, s: number) => {
  for (let i = 0; i < 8; i++) {
    const fase = (t + i * 3) % 12;
    if (fase > 6) continue;
    const x = p.x + (rnd(s, i, Math.floor((t + i * 3) / 12)) - 0.5) * 30;
    const y = p.y + (rnd(i, s, Math.floor((t + i * 3) / 12)) - 0.5) * 30;
    const r = fase < 3 ? fase : 6 - fase;
    for (let d = -r; d <= r; d++) {
      px(b, x + d, y, cor);
      px(b, x, y + d, cor);
    }
    px(b, x, y, BRANCO);
  }
};

const cristais = (b: Buf, p: P, t: number, cor: RGB) => {
  const al = 1 - t / 14;
  for (let i = 0; i < 6; i++) {
    const ang = i * (Math.PI / 3);
    const d = 4 + Math.min(t, 6);
    linha(b, p.x, p.y, p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, misturar(cor, BRANCO, 0.4), al);
  }
};

const nota = (b: Buf, p: P, cor: RGB) => {
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  for (let j = 0; j < 6; j++) px(b, x + 2, y - j, cor);
  px(b, x + 3, y - 5, cor);
  px(b, x + 4, y - 4, cor);
  elipse(b, x + 0.5, y + 0.5, 2, 1.5, cor);
};
