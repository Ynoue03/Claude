// Estado de cada lutador num quadro de mundo: posição, animação, direção, expressão, PV, condições.
import { P } from "../sim/combate";
import { Lutador } from "../sim/ficha";
import { Anim, Dir, Expr } from "../arte/sprite";
import { Faixa, Linha, Papel } from "../linha";

export type EstadoLut = {
  id: number;
  x: number;
  y: number;
  anim: Anim;
  f: number;
  dir: Dir;
  expr: Expr;
  rasgado: boolean;
  pv: number;
  pvMax: number;
  conds: string[];
  branco: number;
  visivel: boolean;
  morto: boolean;
  caveira: boolean;
  noTurno: boolean;
};

const suave = (t: number) => t * t * (3 - 2 * t);

const amortecer = (f: Faixa, w: number) => {
  // 0 = parado no lugar (está em ação), 1 = circulando
  let a = 1;
  for (const [t0, t1] of f.ocupado) {
    if (w >= t0 && w <= t1) return 0;
    if (w < t0 && t0 - w < 10) a = Math.min(a, (t0 - w) / 10);
    if (w > t1 && w - t1 < 10) a = Math.min(a, (w - t1) / 10);
  }
  return suave(Math.max(0, a));
};

const vaguear = (id: number, w: number): P => {
  const fase = id * 1.7;
  return { x: Math.cos(w * 0.04 + fase) * 6, y: Math.sin(w * 0.055 + fase * 1.3) * 4 };
};

export const posLogica = (f: Faixa, w: number): { p: P; andando: boolean; v: P } => {
  let p = f.pos0;
  for (const s of f.segs) {
    if (w < s.t0) break;
    if (w < s.t1) {
      const k = (w - s.t0) / Math.max(1, s.t1 - s.t0);
      const e = s.empurrao ? 1 - (1 - k) * (1 - k) : k;
      return {
        p: { x: s.de.x + (s.para.x - s.de.x) * e, y: s.de.y + (s.para.y - s.de.y) * e },
        andando: !s.empurrao,
        v: { x: s.para.x - s.de.x, y: s.para.y - s.de.y },
      };
    }
    p = s.para;
  }
  return { p, andando: false, v: { x: 0, y: 0 } };
};

const dirDe = (v: P, lateral = false): Dir => {
  if (lateral || Math.abs(v.x) >= Math.abs(v.y) * 0.8) return v.x >= 0 ? "E" : "W";
  return v.y >= 0 ? "S" : "N";
};

const papelEm = (f: Faixa, w: number): Papel | null => {
  let melhor: Papel | null = null;
  for (const p of f.papeis) if (w >= p.t0 && w < p.t1 && (!melhor || p.t0 >= melhor.t0)) melhor = p;
  return melhor;
};

export const pvEm = (f: Faixa, w: number) => {
  let v = f.pv[0].v;
  for (const e of f.pv) if (e.t <= w) v = e.v;
  return v;
};

export const condsEm = (f: Faixa, w: number) => {
  const on = new Set<string>();
  for (const c of f.conds) {
    if (c.t > w) continue;
    if (c.on) on.add(c.cond);
    else on.delete(c.cond);
  }
  const ordem = ["FÚR", "CNC", "MRC", "ESC", "LNT", "ATD"];
  return ordem.filter((c) => on.has(c));
};

export const MORTE = { cair: 16, deitado: 40, piscar: 56 };

export const estadoEm = (L: Linha, l: Lutador, w: number, combate: boolean): EstadoLut => {
  const f = L.faixas[l.id];
  const pv = pvEm(f, w);
  const base = posLogica(f, w);
  const amp = combate ? amortecer(f, w) : 0;
  const vg = vaguear(l.id, w);
  let x = base.p.x + vg.x * amp;
  let y = base.p.y + vg.y * amp;
  // recuo ao levar golpe
  for (const r of f.recuo) {
    const d = w - r.t;
    if (d >= 0 && d < 8) {
      const dx = base.p.x - r.de.x;
      const dy = base.p.y - r.de.y;
      const n = Math.hypot(dx, dy) || 1;
      const k = (1 - d / 8) * 3;
      x += (dx / n) * k;
      y += (dy / n) * k * 0.5;
    }
  }
  let branco = 0;
  for (const t of f.golpes) if (w >= t && w < t + 4) branco = 0.85 - (w - t) * 0.18;

  const e: EstadoLut = {
    id: l.id,
    x,
    y,
    anim: "idle",
    f: 0,
    dir: "S",
    expr: "neutra",
    rasgado: pv / l.pvMax < 0.3,
    pv,
    pvMax: l.pvMax,
    conds: condsEm(f, w),
    branco: Math.max(0, branco),
    visivel: true,
    morto: false,
    caveira: false,
    noTurno: f.turnos.some(([a, b]) => w >= a && w <= b),
  };

  if (f.morte !== null && w >= f.morte) {
    const d = w - f.morte;
    e.morto = true;
    e.anim = "derrota";
    e.expr = "derrota";
    e.f = Math.min(3, Math.floor(d / 4));
    e.dir = "S";
    e.conds = [];
    if (d >= MORTE.deitado) e.visivel = Math.floor(d / 2) % 2 === 0;
    if (d >= MORTE.piscar) {
      e.visivel = false;
      e.caveira = true;
    }
    return e;
  }

  const papel = papelEm(f, w);
  if (papel) {
    e.anim = papel.anim;
    const olha = papel.olha;
    e.dir = olha ? dirDe({ x: olha.x - base.p.x, y: olha.y - base.p.y }, papel.anim !== "dano") : "S";
    if (papel.anim === "ataque") {
      const ti = papel.tImpacto;
      e.f = w < ti - 3 ? (w - papel.t0 < (ti - 3 - papel.t0) / 2 ? 0 : 1) : w < ti + 3 ? 2 : 3;
      e.expr = w >= ti - 4 && w < ti + 6 ? "grito" : "concentrada";
    } else if (papel.anim === "magia") {
      const ti = papel.tImpacto;
      if (w < ti) e.f = Math.min(3, Math.floor(((w - papel.t0) / Math.max(1, ti - papel.t0)) * 4));
      else e.f = Math.min(6, 4 + Math.floor((w - ti) / 3));
      e.expr = papel.grito && e.f >= 3 && e.f <= 5 ? "grito" : "concentrada";
    } else if (papel.anim === "dano") {
      e.f = w - papel.t0 < 4 ? 0 : 1;
      e.expr = "dor";
    }
  } else if (base.andando) {
    e.anim = "andar";
    e.f = Math.floor(w / 3) % 6;
    e.dir = dirDe(base.v);
    e.expr = "concentrada";
  } else if (amp > 0.5 && combate) {
    // circulando enquanto espera a vez
    const vx = -Math.sin(w * 0.04 + l.id * 1.7) * 0.24;
    const vy = Math.cos(w * 0.055 + l.id * 1.7 * 1.3) * 0.22;
    e.anim = "andar";
    e.f = Math.floor(w / 5) % 6;
    e.dir = dirDe({ x: vx, y: vy });
  } else {
    e.anim = "idle";
    e.f = Math.floor(w / 8) % 4;
  }
  if (e.expr === "neutra" || e.expr === "concentrada") {
    if (pv / l.pvMax < 0.3) e.expr = "pvBaixo";
    else if (e.noTurno) e.expr = "concentrada";
  }
  return e;
};
