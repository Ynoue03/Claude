// Efeitos visuais de cada golpe, desenhados a partir da tabela da simulação.
import { CONTORNO, tom } from "./cores";
import { anel, disco, linha, px, zigue, type Ctx } from "./pixel";
import { hash } from "./rng";
import type { Ataque, Sim } from "./sim";
import { SH, SW, sprite } from "./sprites";
import type { EpisodioPronto as Episodio } from "./tipos";

type P = { x: number; y: number };

const mao = (q: { x: number; y: number; dir: number }): P => {
  const d = [[0, 3], [0, -6], [-9, 0], [9, 0]][q.dir];
  return { x: q.x + d[0], y: q.y - 13 + d[1] };
};
const peito = (q: P): P => ({ x: q.x, y: q.y - 14 });
const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// estrela de impacto (raios + anel)
export const estrela = (ctx: Ctx, c: P, t: number, cor: string, cor2: string, tam = 10) => {
  if (t < 0 || t > 9) return;
  const r = 3 + t * (tam / 8);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    const r0 = r * 0.4;
    linha(ctx, c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, k % 2 ? cor : cor2, t < 4 ? 2 : 1);
  }
  if (t < 3) disco(ctx, c.x, c.y, 4 - t, "#FFFFFF");
  anel(ctx, c.x, c.y, r + 2, cor, 1);
};

export const poeira = (ctx: Ctx, c: P, t: number, semente: number, cor = "#E8E0D0", n = 7) => {
  if (t < 0 || t > 16) return;
  for (let k = 0; k < n; k++) {
    const a = hash(semente, k) * Math.PI * 2;
    const v = 0.5 + hash(semente, k + 20) * 0.8;
    const r = Math.max(0, 3 - t / 5);
    disco(ctx, c.x + Math.cos(a) * t * v, c.y + Math.sin(a) * t * v * 0.6 - t * 0.3, r, t > 10 ? tom(cor, -0.25) : cor);
  }
};

const chama = (ctx: Ctx, x: number, y: number, h: number, cor: string, cor2: string) => {
  for (let k = 0; k < h; k++) {
    const w = Math.max(0, Math.round((h - k) / 3));
    ctx.fillStyle = k < h / 2 ? cor : cor2;
    ctx.fillRect(Math.round(x - w), Math.round(y - k), w * 2 + 1, 1);
  }
};

export const desenharAtaque = (ctx: Ctx, atq: Ataque, f: number, sim: Sim, ep: Episodio) => {
  const g = atq.golpe;
  const cor = g.cor;
  const cor2 = g.cor2 ?? "#FFFFFF";
  const t = f - atq.ini;
  const ti = f - atq.impacto;
  const qa = sim.quadros[f][atq.atk];
  const qv = sim.quadros[f][atq.alvo];
  const alvoP = qv.vivo ? peito(qv) : peito(atq.para);
  const fonte = mao(qa);
  const s = atq.ini * 7 + atq.atk;
  const viagem = Math.max(1, atq.impacto - atq.ini - atq.carga);
  const tv = (f - atq.ini - atq.carga) / viagem; // 0→1 durante a viagem

  switch (g.efeito) {
    case "esfera": {
      const c = ti < 0 ? fonte : alvoP;
      if (ti < 4) {
        const r = Math.min(5, 2 + t / 3);
        disco(ctx, c.x, c.y, r + 1, tom(cor, -0.3));
        disco(ctx, c.x, c.y, r, cor);
        disco(ctx, c.x, c.y, r - 2, cor2);
        for (let k = 0; k < 4; k++) {
          const a = t * 0.9 + (k * Math.PI) / 2;
          px(ctx, c.x + Math.cos(a) * (r + 1), c.y + Math.sin(a) * (r + 1) * 0.7, "#FFFFFF");
        }
      }
      if (ti >= 0) {
        anel(ctx, alvoP.x, alvoP.y, 4 + ti * 1.6, cor2, 2);
        anel(ctx, alvoP.x, alvoP.y, 2 + ti * 1.2, cor, 1);
        estrela(ctx, alvoP, ti, cor, cor2, 9);
      }
      break;
    }
    case "clones": {
      if (ti < 0) {
        const L = ep.lutadores[atq.atk];
        const de = peito(sim.quadros[atq.ini][atq.atk]);
        const k = Math.min(1, t / atq.carga);
        const dx = alvoP.x - de.x;
        const dy = alvoP.y - de.y;
        const d = Math.hypot(dx, dy) || 1;
        for (const lado of [-1, 1]) {
          const p0 = { x: de.x + (-dy / d) * 14 * lado, y: de.y + (dx / d) * 10 * lado };
          const p1 = { x: alvoP.x + (-dy / d) * 7 * lado, y: alvoP.y + (dx / d) * 5 * lado };
          const p = lerp(p0, p1, k * k);
          ctx.globalAlpha = 0.85;
          ctx.drawImage(sprite(L, qa.dir, Math.floor(t / 3) % 2 ? "passo1" : "passo2", false, ep.k), Math.round(p.x - 13), Math.round(p.y - 19), SW, SH);
          ctx.globalAlpha = 1;
          if (t < 6) poeira(ctx, p0, t, s + lado, "#FFFFFF", 5);
        }
      } else {
        estrela(ctx, alvoP, ti, cor, cor2, 12);
        poeira(ctx, alvoP, ti + 2, s + 3, "#FFFFFF", 8);
      }
      break;
    }
    case "raio": {
      const de = peito(sim.quadros[atq.ini][atq.atk]);
      if (ti < 0) {
        for (let k = 0; k < 3; k++) zigue(ctx, fonte.x, fonte.y, fonte.x + (hash(s + t, k) - 0.5) * 16, fonte.y + (hash(s + t, k + 9) - 0.5) * 12, k % 2 ? cor : cor2, s + t * 3 + k, 2, 1, hash);
        if (t > atq.carga / 2) zigue(ctx, de.x, de.y, qa.x, qa.y - 14, cor, s + t, 4, 2, hash);
      }
      if (ti >= 0 && ti < 8) {
        zigue(ctx, de.x, de.y, alvoP.x, alvoP.y, ti % 2 ? cor : cor2, s + ti, 5, ti < 3 ? 2 : 1, hash);
        for (let k = 0; k < 6; k++) {
          const a = hash(s, k) * Math.PI * 2;
          zigue(ctx, alvoP.x, alvoP.y, alvoP.x + Math.cos(a) * (8 + ti), alvoP.y + Math.sin(a) * (8 + ti), cor, s + k + ti, 2, 1, hash);
        }
      }
      if (ti >= 0) estrela(ctx, alvoP, ti, cor, cor2, 8);
      break;
    }
    case "chamas": {
      if (ti < 0 && f >= atq.impacto - 6) {
        const k = 1 - -ti / 6;
        for (let j = 0; j < 8; j++) {
          const p = lerp(fonte, alvoP, Math.min(1, k * (0.5 + j / 14)));
          chama(ctx, p.x + (hash(s + f, j) - 0.5) * 4, p.y + 3, 4 + (j % 3), cor, cor2);
        }
      }
      if (ti >= 0) {
        for (let j = 0; j < 7; j++) {
          const ox = (hash(s, j) - 0.5) * 16;
          const h = 5 + Math.floor(hash(s + f, j) * 7);
          chama(ctx, alvoP.x + ox, alvoP.y + 12 - (j % 2) * 3, h, cor, cor2);
        }
      }
      break;
    }
    case "feixe": {
      if (ti < -1) {
        const r = Math.min(5, 1 + t / 3);
        disco(ctx, fonte.x, fonte.y, r + 1, cor);
        disco(ctx, fonte.x, fonte.y, r - 1, cor2);
        for (let k = 0; k < 5; k++) {
          const a = hash(s + t, k) * Math.PI * 2;
          const rr = 12 - (t % 6) * 2;
          px(ctx, fonte.x + Math.cos(a) * rr, fonte.y + Math.sin(a) * rr, cor2);
        }
      } else if (f <= atq.fim) {
        const ext = Math.min(1, (ti + 2) / 3);
        const fim = lerp(fonte, alvoP, ext);
        const rest = atq.fim - f;
        const esp = rest < 4 ? 2 + rest : 7 + (f % 2);
        linha(ctx, fonte.x, fonte.y, fim.x, fim.y, tom(cor, -0.2), esp + 2);
        linha(ctx, fonte.x, fonte.y, fim.x, fim.y, cor, esp);
        linha(ctx, fonte.x, fonte.y, fim.x, fim.y, cor2, Math.max(1, esp - 4));
        disco(ctx, fonte.x, fonte.y, esp / 2 + 2, cor2);
        disco(ctx, fim.x, fim.y, esp / 2 + 3, cor);
        disco(ctx, fim.x, fim.y, esp / 2, "#FFFFFF");
        if (ti >= 0) estrela(ctx, alvoP, ti, cor, cor2, 12);
      }
      break;
    }
    case "bomba": {
      const topo = { x: qa.x, y: qa.y - 44 };
      if (ti < 0) {
        const r = Math.min(12, 2 + t / 2);
        const c = tv > 0 ? lerp(topo, alvoP, Math.max(0, tv)) : topo;
        disco(ctx, c.x, c.y, r + 1, tom(cor, -0.3));
        disco(ctx, c.x, c.y, r, cor);
        disco(ctx, c.x - r / 3, c.y - r / 3, r / 2, cor2);
        if (tv <= 0)
          for (let k = 0; k < 4; k++) {
            const a = hash(s + t, k) * Math.PI * 2;
            linha(ctx, c.x + Math.cos(a) * 26, c.y + Math.sin(a) * 26, c.x + Math.cos(a) * 18, c.y + Math.sin(a) * 18, cor2);
          }
      } else if (ti < 14) {
        disco(ctx, alvoP.x, alvoP.y, Math.max(0, 16 - ti), cor);
        anel(ctx, alvoP.x, alvoP.y, 6 + ti * 2.2, cor2, 2);
        anel(ctx, alvoP.x, alvoP.y, 3 + ti * 1.6, cor, 1);
        if (ti < 4) disco(ctx, alvoP.x, alvoP.y, 8 - ti, "#FFFFFF");
      }
      break;
    }
    case "elastico": {
      const L = ep.lutadores[atq.atk];
      const k = ti < 0 ? Math.max(0, tv) : Math.max(0, 1 - ti / 6);
      if (f >= atq.ini + atq.carga - 2 && k > 0) {
        const p = lerp(fonte, alvoP, k);
        linha(ctx, fonte.x, fonte.y, p.x, p.y, CONTORNO, 3);
        const braco = g.linha ?? L.visual.pele;
        linha(ctx, fonte.x, fonte.y, p.x, p.y, braco, 1);
        disco(ctx, p.x, p.y, 3, CONTORNO);
        disco(ctx, p.x, p.y, 2, g.linha ? cor : L.visual.pele);
        for (let j = 1; j < 4; j++) {
          const q = lerp(fonte, p, j / 4);
          px(ctx, q.x, q.y - 3, cor2);
        }
      }
      if (ti >= 0) estrela(ctx, alvoP, ti, cor, cor2, 9);
      break;
    }
    case "aura": {
      if (ti < 0) {
        for (let k = 0; k < 8; k++) {
          const ox = (hash(s, k) - 0.5) * 18;
          const sub = ((t * 1.5 + hash(s, k + 9) * 20) % 20);
          px(ctx, qa.x + ox, qa.y - 4 - sub, k % 2 ? cor : cor2, 2);
        }
        const de = peito(sim.quadros[atq.ini][atq.atk]);
        if (t > atq.carga / 2)
          for (let k = -1; k <= 1; k++) linha(ctx, de.x, de.y + k * 4, qa.x, qa.y - 14 + k * 4, cor2);
      } else {
        estrela(ctx, alvoP, ti, cor, cor2, 11);
        poeira(ctx, alvoP, ti, s, cor2, 6);
      }
      break;
    }
    case "corte": {
      if (ti < 0) {
        if (t % 4 < 2) px(ctx, fonte.x + 2, fonte.y - 4, "#FFFFFF", 2);
        break;
      }
      const n = g.especial ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const a = -0.8 + k * (Math.PI / n) + hash(s, k) * 0.3;
        const len = Math.min(13, 4 + ti * 4);
        const ax = Math.cos(a) * len;
        const ay = Math.sin(a) * len;
        if (ti < 8) {
          linha(ctx, alvoP.x - ax, alvoP.y - ay, alvoP.x + ax, alvoP.y + ay, cor, ti < 5 ? 3 : 1);
          linha(ctx, alvoP.x - ax, alvoP.y - ay, alvoP.x + ax, alvoP.y + ay, "#FFFFFF", 1);
        }
      }
      if (ti < 6) estrela(ctx, alvoP, ti + 2, cor, cor2, 6);
      break;
    }
    case "arco": {
      if (ti < -3) break;
      const k = Math.min(1, (ti + 3) / 6);
      const a0 = -2.4 + hash(s, 1);
      if (ti < 9) {
        anel(ctx, alvoP.x, alvoP.y, 14, cor, 4, a0, a0 + k * 4.4);
        anel(ctx, alvoP.x, alvoP.y, 12, cor2, 1, a0, a0 + k * 4.4);
      }
      for (let j = 0; j < 9; j++) {
        const a = a0 + (j / 9) * 4.4;
        const r = 14 + Math.max(0, ti) * 1.2;
        if (ti > 0 && ti < 14) px(ctx, alvoP.x + Math.cos(a) * r, alvoP.y + Math.sin(a) * r - ti * 0.3, j % 2 ? cor : cor2, 2);
      }
      break;
    }
    case "onda": {
      if (ti < 0) {
        if (tv <= 0) {
          px(ctx, fonte.x, fonte.y - 6, cor, 2);
          linha(ctx, fonte.x - 2, fonte.y - 8, fonte.x + 3, fonte.y + 2, cor2, 1);
          break;
        }
        const c = lerp(fonte, alvoP, tv);
        const dx = alvoP.x - fonte.x;
        const dy = alvoP.y - fonte.y;
        const a = Math.atan2(dy, dx);
        anel(ctx, c.x - Math.cos(a) * 6, c.y - Math.sin(a) * 6, 11, cor, 4, a - 1.2, a + 1.2);
        anel(ctx, c.x - Math.cos(a) * 6, c.y - Math.sin(a) * 6, 9, cor2, 2, a - 1.0, a + 1.0);
        for (let j = 1; j < 4; j++) {
          const q = lerp(fonte, c, 1 - j * 0.12);
          px(ctx, q.x + (hash(s + f, j) - 0.5) * 8, q.y + (hash(s + f, j + 5) - 0.5) * 8, cor);
        }
      } else {
        estrela(ctx, alvoP, ti, cor, cor2, 12);
      }
      break;
    }
    case "projetil": {
      if (ti < 0) {
        if (tv <= 0) {
          const k = Math.min(1, t / atq.carga);
          const sep = (1 - k) * 9;
          disco(ctx, fonte.x - sep, fonte.y, 3, "#3A7AFF");
          disco(ctx, fonte.x + sep, fonte.y, 3, "#E8302A");
          if (k > 0.7) disco(ctx, fonte.x, fonte.y, 3 + k * 2, cor);
        } else {
          const c = lerp(fonte, alvoP, tv);
          for (let j = 1; j < 6; j++) {
            const q = lerp(fonte, c, 1 - j * 0.06);
            disco(ctx, q.x, q.y, Math.max(1, 6 - j), tom(cor, -0.15 * j));
          }
          disco(ctx, c.x, c.y, 8, tom(cor, -0.35));
          disco(ctx, c.x, c.y, 7, cor);
          disco(ctx, c.x - 1, c.y - 1, 3, cor2);
        }
      } else if (ti < 14) {
        disco(ctx, alvoP.x, alvoP.y, Math.max(0, 14 - ti), cor);
        anel(ctx, alvoP.x, alvoP.y, 8 + ti * 2, cor2, 2);
        if (ti < 3) disco(ctx, alvoP.x, alvoP.y, 6, "#FFFFFF");
      }
      break;
    }
    case "escudo": {
      if (t < 12) anel(ctx, qa.x, qa.y - 15, 4 + t * 1.2, cor2, 1);
      break;
    }
    case "soco": {
      if (ti < 0) {
        const r = Math.min(4, 1 + t / 3);
        disco(ctx, fonte.x, fonte.y, r + 1, cor);
        disco(ctx, fonte.x, fonte.y, r - 1, cor2);
        const de = peito(sim.quadros[atq.ini][atq.atk]);
        if (t > atq.carga / 2) for (let k = -1; k <= 1; k++) linha(ctx, de.x, de.y + k * 5, qa.x, qa.y - 14 + k * 5, tom(cor2, 0.3));
      } else {
        estrela(ctx, alvoP, ti, cor, cor2, g.area ? 14 : 10);
        if (g.area && ti < 12) anel(ctx, alvoP.x, alvoP.y + 8, 6 + ti * 2.2, cor, 1);
        if (ti < 7)
          for (let k = 0; k < 5; k++) {
            const a = hash(s, k) * Math.PI * 2;
            zigue(ctx, alvoP.x, alvoP.y, alvoP.x + Math.cos(a) * (10 + ti * 2), alvoP.y + Math.sin(a) * (10 + ti * 2), k % 2 ? cor : cor2, s + k + ti, 2, 1, hash);
          }
      }
      break;
    }
    case "explosao": {
      if (ti < 0) {
        for (let k = 0; k < 6; k++) {
          const a = t * 0.8 + k;
          px(ctx, qa.x + Math.cos(a) * 12, qa.y - 12 + Math.sin(a) * 8, k % 2 ? cor : cor2, 2);
        }
      } else if (ti < 16) {
        const r = Math.min(18, 4 + ti * 2.2);
        if (ti < 10) {
          disco(ctx, alvoP.x, alvoP.y, r, cor);
          disco(ctx, alvoP.x, alvoP.y, r * 0.65, cor2);
          if (ti < 4) disco(ctx, alvoP.x, alvoP.y, r * 0.35, "#FFFFFF");
        }
        poeira(ctx, alvoP, ti, s, "#6A6460", 9);
      }
      break;
    }
    case "gelo": {
      const fim = ti < 0 ? Math.max(0, tv) : 1;
      if (f >= atq.ini + atq.carga) {
        const n = Math.max(1, Math.floor(Math.hypot(alvoP.x - fonte.x, alvoP.y - fonte.y) / 8));
        for (let j = 1; j <= n; j++) {
          if (j / n > fim) break;
          const p = lerp({ x: fonte.x, y: qa.y }, { x: alvoP.x, y: alvoP.y + 14 }, j / n);
          const h = 4 + Math.floor(hash(s, j) * 5);
          if (ti > 14) continue;
          for (let k = 0; k < h; k++) {
            const w = Math.max(0, Math.round((h - k) / 2.5));
            ctx.fillStyle = k > h / 2 ? cor2 : cor;
            ctx.fillRect(Math.round(p.x - w), Math.round(p.y - k), w * 2 + 1, 1);
          }
        }
      }
      if (ti >= 0 && ti < 14) estrela(ctx, alvoP, ti, cor, cor2, 9);
      break;
    }
  }
};
