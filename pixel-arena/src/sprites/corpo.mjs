// Corpo chibi (≈2,5 cabeças) montado por esqueleto + poses. Cada personagem só descreve cores,
// cabelo, roupa e acessórios (ver personagens.mjs); o resto é comum a todos.
import { Tela } from './tela.mjs';
import { rampa } from '../cores.mjs';
import { rosto } from './rosto.mjs';
import { hex } from '../img.mjs';
import { reduzirPaleta, aplicarPaleta } from './paleta.mjs';

export const SW = 64, SH = 72, RAIZ_X = 32, RAIZ_Y = 68;
export const ANIMS = { idle: 4, andar: 6, ataque: 4, especial: 8, dano: 2, derrota: 4, vitoria: 4 };
const R = Math.round;
const rad = (g) => (g * Math.PI) / 180;

export function materiais(def) {
  const mats = [], M = {};
  const add = (nome, h, o) => { M[nome] = mats.length; mats.push(rampa(h, o)); };
  add('pele', def.pele ?? '#F4C9A4', { sombraAlvo: 340 });
  for (const [nome, h] of Object.entries(def.cores)) add(nome, h, def.rampas?.[nome]);
  add('metal', def.cores.metal ?? '#B9C3CF', { contraste: 1.3 });
  add('sola', '#E9E4DA');
  add('preto', '#2A2733');
  add('branco', '#F2F0EA');
  return { mats, M };
}

// ───────────────────────── poses ─────────────────────────
function poseBase(vista) {
  if (vista === 'lado') return {
    hx: 31, hy: 25, cx: 33, ws: 13, wc: 11, wq: 12, ombroY: 38, cinturaY: 48, quadrilY: 51,
    bE: { o: [27.5, 39.5], c: [26.5, 44], m: [27, 48.5] },
    bD: { o: [37.5, 39.5], c: [38.5, 44], m: [38, 48.5] },
    pE: { q: [30, 51], j: [29.5, 58], p: [29.5, 64.5] },
    pD: { q: [35.5, 51], j: [35.5, 58], p: [35.5, 64.5] },
    balanco: 0, arma: null,
  };
  return {
    hx: 32, hy: 25, cx: 32, ws: 16, wc: 13, wq: 14, ombroY: 38, cinturaY: 48, quadrilY: 51,
    bE: { o: [24.5, 39.5], c: [22.5, 44], m: [22, 48.5] },
    bD: { o: [39.5, 39.5], c: [41.5, 44], m: [42, 48.5] },
    pE: { q: [28.5, 51], j: [28, 58], p: [28, 64.5] },
    pD: { q: [35.5, 51], j: [36, 58], p: [36, 64.5] },
    balanco: 0, arma: null,
  };
}
const mover = (p, dx, dy) => { p[0] += dx; p[1] += dy; };
// desloca a parte de cima (cabeça, tronco, braços)
function corpoCima(P, dx, dy) {
  P.hx += dx; P.hy += dy; P.cx += dx; P.ombroY += dy; P.cinturaY += dy;
  for (const b of [P.bE, P.bD]) for (const k of ['o', 'c', 'm']) mover(b[k], dx, dy);
}
const braco = (b, c, m) => { b.c = [...c]; b.m = [...m]; };

export function pose(def, anim, q, vista) {
  const P = poseBase(vista);
  const estilo = def.estilo ?? 'soco';
  const lado = vista === 'lado';
  if (anim === 'idle') {
    const b = [0, 0, 1, 1][q];
    corpoCima(P, 0, b);
    P.balanco = [0, 1, 1, 0][q] * 0.6;
    if (lado && estilo !== 'nenhum') { // guarda de luta
      braco(P.bD, [36, 43 + b], [31, 41 + b]);
      braco(P.bE, [25.5, 43 + b], [23, 41 + b]);
      mover(P.pE.p, -2, 0); mover(P.pE.j, -1, 0); mover(P.pD.p, 1.5, 0);
      if (estilo === 'espada') P.arma = { mao: 'D', ang: 225 };
    }
  } else if (anim === 'andar') {
    const f = (q / 6) * Math.PI * 2, s = Math.sin(f);
    const b = [0, -1, 0, 0, -1, 0][q];
    corpoCima(P, 0, b);
    P.balanco = -s * 0.8;
    if (lado) {
      mover(P.pE.p, s * 4, -Math.max(0, Math.cos(f)) * 2); mover(P.pE.j, s * 2.5, -Math.max(0, Math.cos(f)));
      mover(P.pD.p, -s * 4, -Math.max(0, -Math.cos(f)) * 2); mover(P.pD.j, -s * 2.5, -Math.max(0, -Math.cos(f)));
      mover(P.bE.m, -s * 3.5, 0); mover(P.bE.c, -s * 1.5, 0);
      mover(P.bD.m, s * 3.5, -Math.abs(s)); mover(P.bD.c, s * 1.5, 0);
      if (estilo === 'espada') P.arma = { mao: 'D', ang: 160 + s * 8, bainha: true };
    } else {
      const lE = Math.max(0, s) * 2.5, lD = Math.max(0, -s) * 2.5;
      mover(P.pE.p, 0, -lE); mover(P.pE.j, 0, -lE * 0.6);
      mover(P.pD.p, 0, -lD); mover(P.pD.j, 0, -lD * 0.6);
      mover(P.bE.m, 0, s * 1.5); mover(P.bD.m, 0, -s * 1.5);
    }
  } else if (anim === 'ataque' || anim === 'especial') {
    const esp = anim === 'especial';
    // fases: 0 antecipação, 1 golpe, 2 sustentação, 3 retorno
    const fase = esp ? [0, 0, 0, 1, 1, 2, 2, 3][q] : q;
    const agach = esp ? [2, 2, 3, 0, 0, 0, 1, 1][q] : [1, 0, 0, 0][q];
    const lean = [2, -3, -2, 0][fase] + (esp && fase === 1 ? -1 : 0);
    corpoCima(P, lean, agach);
    if (fase === 1 || fase === 2) { mover(P.pE.p, -4, 0); mover(P.pE.j, -3, 0); mover(P.pD.p, 3, 0); mover(P.pD.j, 1, 0); }
    if (fase === 0) { mover(P.pE.p, -2, 0); mover(P.pD.p, 2, 0); mover(P.pE.j, -1, 1); mover(P.pD.j, 1, 1); }
    const by = P.hy - 25; // deslocamento vertical já aplicado
    const lx = lean;
    if (estilo === 'espada') {
      const mao = [[38 + lx, 30 + by], [17 + lx, 43 + by], [20 + lx, 48 + by], [27 + lx, 45 + by]][fase];
      const cot = [[40 + lx, 36 + by], [25 + lx, 41 + by], [27 + lx, 45 + by], [33 + lx, 44 + by]][fase];
      braco(P.bD, cot, esp && fase === 0 ? [42 + lx, 47 + by] : mao);
      braco(P.bE, [26 + lx, 44 + by], fase === 1 ? [20 + lx, 45 + by] : [24 + lx, 46 + by]);
      P.arma = { mao: 'D', ang: esp && fase === 0 ? 15 : [300, 190, 140, 165][fase] };
    } else if (estilo === 'energia') {
      const m1 = [[39 + lx, 46 + by], [14 + lx, 41 + by], [15 + lx, 42 + by], [26 + lx, 45 + by]][fase];
      const m2 = [[37 + lx, 48 + by], [15 + lx, 44 + by], [16 + lx, 45 + by], [24 + lx, 47 + by]][fase];
      braco(P.bD, [(P.bD.o[0] + m1[0]) / 2 + 1, (P.bD.o[1] + m1[1]) / 2 + 1], m1);
      braco(P.bE, [(P.bE.o[0] + m2[0]) / 2, (P.bE.o[1] + m2[1]) / 2 + 1], m2);
    } else { // soco / chute
      const m = [[41 + lx, 44 + by], [13 + lx, 40 + by], [14 + lx, 41 + by], [27 + lx, 44 + by]][fase];
      const c = [[41 + lx, 40 + by], [22 + lx, 40 + by], [23 + lx, 41 + by], [33 + lx, 44 + by]][fase];
      braco(P.bD, c, m);
      braco(P.bE, [25 + lx, 42 + by], fase === 1 ? [30 + lx, 43 + by] : [22 + lx, 41 + by]);
    }
    P.fase = fase;
  } else if (anim === 'dano') {
    const l = [3, 1][q];
    corpoCima(P, l, q === 0 ? 1 : 0);
    braco(P.bE, [P.bE.o[0] - 2, P.bE.o[1] - 2], [P.bE.o[0] - 3, P.bE.o[1] - 6]);
    braco(P.bD, [P.bD.o[0] + 3, P.bD.o[1] - 1], [P.bD.o[0] + 5, P.bD.o[1] - 4]);
    mover(P.pD.p, 2, 0);
    if (estilo === 'espada') P.arma = { mao: 'D', ang: 250 };
  } else if (anim === 'derrota') {
    const l = [3, 2, 0, 0][q];
    corpoCima(P, l, [1, 4, 0, 0][q]);
    braco(P.bE, [P.bE.o[0] - 3, P.bE.o[1] - 1], [P.bE.o[0] - 5, P.bE.o[1] - 4]);
    braco(P.bD, [P.bD.o[0] + 3, P.bD.o[1]], [P.bD.o[0] + 6, P.bD.o[1] - 3]);
    if (q === 1) { mover(P.pE.j, -2, -1); mover(P.pD.j, 2, -1); }
  } else if (anim === 'vitoria') {
    const b = [0, -1, -2, -1][q];
    corpoCima(P, 0, b);
    if (def.vitoria) def.vitoria(P, q, b);
    else {
      braco(P.bD, [44, 31 + b], [45.5 + (q % 2) * 0.5, 21 + b - (q === 2 ? 1 : 0)]);
      braco(P.bE, [21, 44 + b], [24, 48 + b]);
    }
    if (q === 2) { for (const pp of [P.pE, P.pD]) { mover(pp.p, 0, -2); mover(pp.j, 0, -1); } }
  }
  return P;
}

// ───────────────────────── cabelo ─────────────────────────
/** mechas: espetos a partir da calota, franja e mechas laterais — cada mecha é uma parte (cluster). */
export function cabelo(t, ctx, camada) {
  const { p, M, vista, e = 1, def } = ctx;
  const C = ctx.cab ?? def.cabelo;
  if (!C) return;
  const hx = ctx.hx ?? p.hx, hy = ctx.hy ?? p.hy;
  const lado = vista === 'lado', costas = vista === 'costas';
  const mat = ctx.matCabelo ?? M[C.mat ?? 'cabelo'];
  const partes = (ctx.partesCabelo ??= []);
  const opts = (extra = {}) => {
    const o = { limiar: 5, oclusao: false, esc: e, ...extra };
    if (C.pontaMat) {
      const raio = (C.pontaRaio ?? 13) * e;
      const pm = M[C.pontaMat];
      o.matFn = (x, y) => (Math.hypot(x + 0.5 - hx, (y + 0.5 - hy) * 1.1) > raio ? pm : mat);
    }
    if (C.metade) { // Todoroki: metade branca / metade vermelha
      const m2 = M[C.metade];
      o.matFn = (x) => (x + 0.5 < hx + (lado ? 1.5 * e : 0) ? mat : m2);
    }
    if (ctx.matFnCabelo) o.matFn = ctx.matFnCabelo;
    return o;
  };
  const nova = (extra) => { const id = t.parte(mat, opts(extra)); partes.push(id); return id; };
  const balanco = (p.balanco ?? 0) * e;
  const giro = lado ? (C.giroLado ?? 14) : 0;

  const desenharEspeto = ([ang, comp, larg, curva = 0, r0b = 7], idAlvo) => {
    const a = rad(ang + giro), b = rad(ang + giro + curva);
    const r0 = r0b * e;
    const bx = hx + Math.sin(a) * r0 + (lado ? e : 0), by = hy - 3 * e - Math.cos(a) * r0;
    const ex = bx + Math.sin(b) * comp * e + balanco * (comp / 8), ey = by - Math.cos(b) * comp * e;
    const nx = Math.cos(a) * larg * e * 0.5, ny = Math.sin(a) * larg * e * 0.5;
    const mx = (bx + ex) / 2, my = (by + ey) / 2;
    t.poli(idAlvo ?? nova(costas ? { semLinhaSobre: true } : {}), [[bx - nx, by - ny], [mx - nx * 0.4 + Math.sin(a) * 0.5, my - ny * 0.4], [ex, ey], [mx + nx * 0.5, my + ny * 0.5], [bx + nx, by + ny]]);
  };
  // espetos laterais/baixos ficam atrás da cabeça (senão cobrem o rosto)
  const deTras = (ang) => Math.abs(ang + giro) >= 92;
  if (camada === 'tras') {
    if (!costas) for (const sp of C.espetos ?? []) if (deTras(sp[0])) desenharEspeto(sp);
    // cabelo atrás da cabeça (mechas longas/nuca)
    for (const [ang, comp, larg, curva = 0] of C.tras ?? []) {
      const a = rad(ang + giro), b = rad(ang + giro + curva);
      const r0 = 7 * e;
      const bx = hx + Math.sin(a) * r0, by = hy - Math.cos(a) * r0;
      const tx = hx + Math.sin(b) * (r0 + comp * e) + balanco, ty = hy - Math.cos(b) * (r0 + comp * e);
      const nx = Math.cos(a) * larg * e * 0.5, ny = Math.sin(a) * larg * e * 0.5;
      t.poli(nova(), [[bx - nx, by - ny], [bx + nx, by + ny], [tx, ty]]);
    }
    return;
  }
  // calota
  const cal = C.calota ?? {};
  const id0 = nova({ limiar: 9 });
  if (costas) {
    t.elipse(id0, hx, hy + 0.5 * e, 11.4 * e, 11.2 * e);
  } else {
    // calota emoldurando o rosto: tudo da cabeça menos a "janela" do rosto abaixo da linha do cabelo
    const fx = hx + (lado ? -2.6 * e : 0), linhaCab = hy + (C.linha ?? -6.5) * e;
    const cxC = hx + (lado ? 1.2 * e : 0), cyC = hy + (cal.dy ?? -1.5) * e, rxC = (cal.rx ?? 11.4) * e, ryC = (cal.ry ?? 10.6) * e;
    const fw = (C.janela ?? 8.6) * e * (lado ? 0.92 : 1);
    for (let y = Math.floor(cyC - ryC - 1); y <= Math.ceil(cyC + ryC); y++)
      for (let x = Math.floor(cxC - rxC - 1); x <= Math.ceil(cxC + rxC + 1); x++) {
        const u = (x + 0.5 - cxC) / rxC, v = (y + 0.5 - cyC) / ryC;
        if (u * u + v * v > 1) continue;
        const a = (x + 0.5 - fx) / fw, b = (y + 0.5 - (hy + 3.4 * e)) / (9.8 * e);
        const bico = C.bico ? Math.max(0, 1 - Math.abs(x + 0.5 - fx) / (C.bico * e)) * 2.5 * e : 0;
        if (a * a + b * b <= 1 && y + 0.5 > linhaCab + bico) continue;
        if (y + 0.5 > hy + (C.nucaY ?? 3) * e && (!lado || x + 0.5 < cxC + 3 * e)) continue;
        t.px(id0, x, y);
      }
    if (C.cachos) for (let i = 0; i < 7; i++) {
      const a = rad(-80 + i * 27);
      t.elipse(nova(), hx + Math.sin(a) * 9.5 * e + (lado ? e : 0), hy - 4 * e - Math.cos(a) * 8 * e, 3.8 * e, 3.4 * e);
    }
  }
  // espetos
  for (const sp of C.espetos ?? []) {
    if (lado && sp[0] < -100) continue;
    if (!costas && deTras(sp[0])) continue;
    desenharEspeto(sp);
  }
  if (costas) {
    // mechas visíveis na nuca: linhas de sombra e brilho curvas
    for (let k = -3; k <= 3; k++) {
      const x0 = hx + k * 3 * e;
      for (let j = 0; j < 7 * e; j++) {
        const xx = x0 + Math.sin(j * 0.35 + k) * e * 0.8, yy = hy - 6 * e + j * 1.2;
        t.dTom(xx, yy, j < 2 ? 3 : 1);
      }
    }
    for (const [dx, comp, larg] of C.nuca ?? [[-7, 5, 5], [-2.5, 6, 5], [2, 6, 5], [6.5, 5, 5]]) {
      const x0 = hx + dx * e, y0 = hy + 2 * e;
      t.poli(id0, [[x0 - larg * e * 0.5, y0], [x0 + larg * e * 0.5, y0], [x0 + e + balanco * 0.3, y0 + comp * e]]);
      t.dTom(x0, y0 + 1, 1); t.dTom(x0, y0 + 2, 1);
    }
    return;
  }
  // franja (sobre a testa) e mechas laterais
  const desl = lado ? -2.4 * e : 0;
  for (const [dx, comp, larg, incl = 0] of C.franja ?? []) {
    if (lado && dx > 6) continue;
    const x0 = hx + dx * e + desl, y0 = hy - 8 * e;
    t.poli(nova(), [[x0 - larg * e * 0.5, y0], [x0 + larg * e * 0.5, y0], [x0 + incl * e + balanco * 0.3, y0 + comp * e]]);
  }
  for (const [ladoX, comp, larg, incl = 0] of C.laterais ?? []) {
    if (lado && ladoX > 0) continue;
    const x0 = hx + ladoX * 9.6 * e + (lado ? -0.6 * e : 0), y0 = hy - 4 * e;
    t.poli(nova(), [[x0 - larg * e * 0.5, y0], [x0 + larg * e * 0.5, y0], [x0 + incl * e * Math.sign(ladoX), y0 + comp * e]]);
  }
}

// dois brilhos em arco na calota
export function brilhoCabelo(t, ctx) {
  const { p, M, e = 1, def, vista } = ctx;
  const C = ctx.cab ?? def.cabelo;
  if (!C || C.semBrilho || vista === 'costas') return;
  const hx = ctx.hx ?? p.hx, hy = ctx.hy ?? p.hy;
  const partes = new Set(ctx.partesCabelo ?? []);
  const lado = vista === 'lado';
  const pinta = (x, y) => {
    const q = t.qual(x, y);
    if (!partes.has(q)) return;
    const fx = t.X(Math.round(x));
    const mi = t.mat[Math.round(y) * t.w + fx];
    t.d(x, y, t.mats[mi].tons[4]);
  };
  const arcos = C.brilhos ?? [[-5.5, -9.5], [0.5, -11]];
  for (const [bx, by] of arcos) {
    const x0 = hx + (bx + (lado ? 0.5 : 0)) * e, y0 = hy + by * e;
    const n = Math.max(2, R(3 * e));
    for (let i = 0; i < n; i++) {
      pinta(R(x0 + i), R(y0 + (i === 0 || i === n - 1 ? 1 : 0) * Math.max(1, R(e * 0.6))));
      if (e >= 1.8) pinta(R(x0 + i), R(y0 + 1 + (i === 0 || i === n - 1 ? 1 : 0)));
    }
  }
}

// ───────────────────────── cabeça + rosto ─────────────────────────
export function cabeca(t, ctx, expr) {
  const { p, M, vista, e = 1, def, estado = {} } = ctx;
  const hx = ctx.hx ?? p.hx, hy = ctx.hy ?? p.hy;
  const lado = vista === 'lado', costas = vista === 'costas';
  const pele = M.pele;
  ctx.partesCabelo = [];
  if (estado.especial && def.cabeloEspecial && !ctx.cab) ctx.cab = def.cabeloEspecial;
  if (ctx.cab?.mat) ctx.matCabelo = M[ctx.cab.mat];
  cabelo(t, ctx, 'tras');
  def.acessorios?.(t, ctx, 'atrasCabeca');
  // orelhas
  const or = t.parte(pele, { limiar: 99, esc: e });
  if (!lado && !costas) { t.elipse(or, hx - 10.3 * e, hy + 1.6 * e, 1.7 * e, 2.4 * e); t.elipse(or, hx + 10.3 * e, hy + 1.6 * e, 1.7 * e, 2.4 * e); }
  // crânio + mandíbula (mesma parte, sombreado único)
  const cab = t.parte(pele, { limiar: 9, esc: e });
  ctx.parteCabeca = cab;
  const jx = lado ? -1.6 * e : 0;
  t.elipse(cab, hx + (lado ? 0.4 * e : 0), hy, 10.4 * e, 9.6 * e);
  t.elipse(cab, hx + jx, hy + 4.3 * e, (lado ? 8.4 : 8.2) * e, 6.1 * e);
  if (lado) {
    t.elipse(cab, hx - 6.5 * e, hy + 5.5 * e, 3.4 * e, 3.6 * e); // bochecha
    const oo = t.parte(pele, { limiar: 99 });
    t.elipse(oo, hx + 5.8 * e, hy + 1.6 * e, 1.8 * e, 2.5 * e);
    t.d(R(hx + 5.8 * e), R(hy + 1.6 * e), t.tom(pele, 1));
  }
  if (!costas) {
    const cor = {
      linha: ctx.corLinha ?? hex(def.linhaOlho ?? '#2B1B2A'),
      iris: t.mats[M[estado.olhoEspecial ?? 'olho']],
      iris2: M.olho2 !== undefined && !estado.olhoEspecial ? t.mats[M.olho2] : undefined,
      pele: t.mats[pele],
      sobrancelha: t.mats[M[def.cabelo?.sobrancelha ?? def.cabelo?.mat ?? 'cabelo']].tons[0],
    };
    rosto(t, { hx, hy, e, vista }, cor, expr, { ...(def.rosto?.(ctx, expr) ?? {}), ferido: estado.ferido });
  }
  cabelo(t, ctx, 'frente');
  def.acessorios?.(t, ctx, 'cabeca');
  brilhoCabelo(t, ctx);
  def.acessorios?.(t, ctx, 'topo');
}

// ───────────────────────── corpo ─────────────────────────
function tronco(t, ctx) {
  const { p, M, def, vista } = ctx;
  const T = def.tronco ?? {};
  const { cx, ws, wc, wq, ombroY: oy, cinturaY: cy, quadrilY: qy } = p;
  // pélvis / calça
  const pel = t.parte(M[def.perna?.mat ?? 'calca'], { pano: true, limiar: 99 });
  t.poli(pel, [[cx - wc / 2, cy - 1], [cx + wc / 2, cy - 1], [cx + wq / 2 + 0.5, qy + 3], [cx - wq / 2 - 0.5, qy + 3]]);
  const id = t.parte(M[T.mat ?? 'roupa'], { pano: true, oclusao: true, matFn: T.matFn?.(ctx), limiar: 7 });
  ctx.parteTronco = id;
  t.poli(id, [
    [cx - ws / 2 + 2, oy - 2], [cx + ws / 2 - 2, oy - 2], [cx + ws / 2, oy + 0.5], [cx + wc / 2 + 0.3, cy],
    [cx + wc / 2 + (T.barra ?? 0), cy + (T.compr ?? 1.5)], [cx - wc / 2 - (T.barra ?? 0), cy + (T.compr ?? 1.5)], [cx - wc / 2 - 0.3, cy], [cx - ws / 2, oy + 0.5],
  ]);
  // dobras do tecido (vincos em tom de sombra, um brilho de dobra)
  if (!T.semDobras) {
    t.dTom(cx - wc / 2 + 1.5, cy - 2, 1); t.dTom(cx - wc / 2 + 2.5, cy - 3, 1);
    t.dTom(cx + wc / 2 - 2, cy - 1.5, 1); t.dTom(cx + wc / 2 - 3, cy - 2.5, 1); t.dTom(cx + wc / 2 - 4, cy - 2.5, 0);
    t.dTom(cx - ws / 2 + 2.5, oy + 2.5, 1); t.dTom(cx + 1, cy - 4, 3); t.dTom(cx + 2, cy - 4, 3);
  }
  if (T.cinto) {
    const c = t.parte(M[T.cinto], { limiar: 99, pano: false });
    t.ret(c, R(cx - wc / 2 - 1), R(cy - 1), R(wc + 2), T.cintoAlt ?? 2, [id, pel]);
  }
  // decote / gola
  if (vista !== 'costas' && T.gola) {
    const g = T.gola;
    if (g === 'v') {
      const gp = t.parte(M[T.golaMat ?? 'pele'], { limiar: 99 });
      t.poli(gp, [[cx - 3, oy - 2.5], [cx + 3, oy - 2.5], [cx + (vista === 'lado' ? -1 : 0), oy + (T.golaFundo ?? 5)]], id);
    } else if (g === 'redonda') {
      const gp = t.parte(M[T.golaMat ?? 'pele'], { limiar: 99 });
      t.elipse(gp, cx + (vista === 'lado' ? -1.5 : 0), oy - 2, 3.2, 2.6, id);
    }
  }
  def.acessorios?.(t, ctx, 'roupa');
}

function membro(t, ctx, b, ehBraco, perto) {
  const { M, def } = ctx;
  if (ehBraco) {
    const B = def.braco ?? {};
    const L1 = Math.hypot(b.c[0] - b.o[0], b.c[1] - b.o[1]);
    const manga = B.manga ?? 'curta';
    const roupa = M[B.mat ?? def.tronco?.mat ?? 'roupa'];
    const matFn = (x, y) => {
      const d = Math.hypot(x + 0.5 - b.o[0], y + 0.5 - b.o[1]);
      const dm = Math.hypot(x + 0.5 - b.m[0], y + 0.5 - b.m[1]);
      if (B.punho && dm < 3.2 && dm > 1.2) return M[B.punho];
      if (B.padrao && (manga === 'longa' || d < L1 * (B.comprManga ?? 0.75))) { const m = B.padrao(ctx, x, y); if (m !== undefined && !(dm < 2 && !B.luva)) return m; }
      if (manga === 'longa') return dm < 2 && !B.luva ? M.pele : roupa;
      if (manga === 'curta') return d < L1 * (B.comprManga ?? 0.75) ? roupa : M.pele;
      if (manga === 'tres4') return d < L1 + 2.5 ? roupa : M.pele;
      return M.pele;
    };
    const id = t.parte(roupa, { matFn, limiar: 99, pano: manga !== 'nenhuma' });
    t.capsula(id, b.o[0], b.o[1], b.c[0], b.c[1], 2.7, 2.4);
    t.capsula(id, b.c[0], b.c[1], b.m[0], b.m[1], 2.4, 2.2);
    if (manga !== 'nenhuma') { t.dTom(b.c[0] + 0.5, b.c[1] - 0.5, 1); t.dTom(b.c[0] - 0.5, b.c[1] + 0.5, 1); }
    const mao = t.parte(B.luva ? M[B.luva] : M.pele, { limiar: 99 });
    t.elipse(mao, b.m[0], b.m[1] + 0.5, 2.6, 2.6);
    ctx.ultimaMao = mao;
    if (B.manopla) def.acessorios?.(t, { ...ctx, b, perto }, 'manopla');
    return id;
  }
  const Pn = def.perna ?? {};
  const calca = M[Pn.mat ?? 'calca'];
  const curta = Pn.tipo === 'curta';
  const matFn = (x, y) => (curta && y + 0.5 > b.j[1] - (Pn.acimaJoelho ?? 0) ? M.pele : Pn.meia && y + 0.5 > b.p[1] - (Pn.meia ?? 0) ? M[Pn.meiaMat ?? 'branco'] : calca);
  const id = t.parte(calca, { matFn, limiar: 99, pano: true });
  const larga = Pn.larga ?? 0;
  t.capsula(id, b.q[0], b.q[1], b.j[0], b.j[1], 3.3 + larga, 3.1 + larga);
  t.capsula(id, b.j[0], b.j[1], b.p[0], b.p[1], 3.0 + larga, 2.6 + larga * (Pn.boca ?? 1.2));
  t.dTom(b.j[0] - 0.5, b.j[1] - 0.5, 1); t.dTom(b.j[0] + 0.5, b.j[1] + 0.5, 1); t.dTom(b.q[0] - 1, b.q[1] + 3, 3);
  // pé
  const pe = t.parte(M[Pn.sapato ?? 'sapato'], { limiar: 99 });
  const ladoV = ctx.vista === 'lado';
  t.elipse(pe, b.p[0] - (ladoV ? 1.6 : 0) + (ctx.vista === 'frente' ? (b.p[0] < 32 ? -0.4 : 0.4) : 0), b.p[1] + 1.6, ladoV ? 4 : 3.3, 2.2);
  if (Pn.sola !== false) {
    const sola = t.parte(M[Pn.solaMat ?? 'sola'], { limiar: 99, semLinha: true });
    for (let x = -5; x <= 5; x++) {
      const xx = b.p[0] + x;
      const yy = R(b.p[1] + 3.2);
      if (t.qual(xx, yy) === pe) t.px(sola, xx, yy);
    }
  }
  def.acessorios?.(t, { ...ctx, b, perto }, 'pe');
  return id;
}

export function arma(t, ctx, mao, ang, tipo) {
  const { M } = ctx;
  const A = tipo ?? ctx.def.arma;
  if (!A) return;
  const a = rad(ang);
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const [mx, my] = mao;
  const cabo = A.cabo ?? 4, lam = A.lamina ?? 17, larg = A.largura ?? 1.6;
  // cabo (atrás da mão)
  const c = t.parte(M[A.caboMat ?? 'preto'], { limiar: 99 });
  t.capsula(c, mx - dx * cabo * 0.5, my - dy * cabo * 0.5, mx + dx * cabo * 0.6, my + dy * cabo * 0.6, 1.2);
  // guarda
  const gx = mx + dx * (cabo * 0.6 + 1), gy = my + dy * (cabo * 0.6 + 1);
  const g = t.parte(M[A.guardaMat ?? 'metal'], { limiar: 99 });
  t.capsula(g, gx - nx * 1.8, gy - ny * 1.8, gx + nx * 1.8, gy + ny * 1.8, 0.9);
  // lâmina
  const l = t.parte(M[A.mat ?? 'metal'], { limiar: 99, rim: false });
  const bx = gx + dx, by = gy + dy, tx = gx + dx * lam, ty = gy + dy * lam;
  if (A.cutelo) {
    const w = A.cutelo;
    t.poli(l, [[bx - nx * 1, by - ny * 1], [bx + nx * w, by + ny * w], [tx + nx * (w - 1) - dx * 2, ty + ny * (w - 1) - dy * 2], [tx - nx, ty - ny]]);
  } else {
    t.capsula(l, bx, by, tx - dx, ty - dy, larg * 0.5 + 0.35, larg * 0.5);
    t.px(l, tx, ty);
  }
  // fio com brilho especular de 1 px
  const brilho = t.mats[M[A.mat ?? 'metal']].tons[4];
  for (let i = 2; i < lam - 1; i += 1) if (i % 5 !== 0) t.d(R(bx + dx * i - nx * 0.4), R(by + dy * i - ny * 0.4), i < lam * 0.5 ? brilho : undefined);
  t.d(R(bx + dx * 3 - nx * 0.4), R(by + dy * 3 - ny * 0.4), 0xffffffff);
  if (A.faixa) {
    const f = t.parte(M[A.faixa], { limiar: 99 });
    t.capsula(f, mx - dx * cabo * 0.6, my - dy * cabo * 0.6, mx - dx * (cabo + 4) + nx * 2, my - dy * (cabo + 4) + ny * 2 + 2, 0.8);
  }
}

// ───────────────────────── sprite completo ─────────────────────────
// paleta limitada por personagem (calculada uma vez a partir de quadros de amostra)
export const CORES_POR_PERSONAGEM = 20;
const PALETAS = new Map();
export function paletaDe(def, mats, M) {
  let p = PALETAS.get(def.id);
  if (!p) {
    const am = [];
    for (const [anim, q, vista, expr, ferido, especial] of [['idle', 0, 'frente', 'neutra'], ['idle', 2, 'lado', 'foco'], ['ataque', 1, 'lado', 'grito'], ['especial', 4, 'lado', 'grito', false, true], ['dano', 0, 'lado', 'dor'], ['andar', 2, 'costas', 'foco'], ['idle', 0, 'frente', 'cansado', true], ['vitoria', 0, 'frente', 'vitoria'], ['derrota', 2, 'lado', 'derrota', true]])
      am.push(montarBruto(def, mats, M, { anim, quadro: q, vista, expr, ferido, especial }));
    p = reduzirPaleta(am, CORES_POR_PERSONAGEM);
    PALETAS.set(def.id, p);
  }
  return p;
}
export function montar(def, mats, M, o) {
  const img = montarBruto(def, mats, M, o);
  return o.paletaLivre ? img : aplicarPaleta(img, paletaDe(def, mats, M).mapa);
}
function montarBruto(def, mats, M, o) {
  const { anim = 'idle', quadro = 0, vista = 'frente', flip = false } = o;
  const estado = { ferido: !!o.ferido, especial: !!o.especial, anim, quadro, olhoEspecial: o.especial && def.olhoEspecial ? def.olhoEspecial : null };
  const t = new Tela(SW, SH, mats);
  t.flip = flip;
  const p = pose(def, anim, quadro, vista);
  if (o.especial && def.poseEspecial) def.poseEspecial(p, quadro, vista);
  const Mx = o.especial && def.peleEspecial ? { ...M, pele: M[def.peleEspecial] } : M;
  const ctx = { t, p, M: Mx, vista, def, estado, e: 1 };
  const expr = o.expr ?? 'neutra';
  const lado = vista === 'lado', costas = vista === 'costas';

  if (!costas) def.acessorios?.(t, ctx, 'fundo');
  if (lado) {
    membro(t, ctx, p.bE, true, false);
    if (p.arma && p.arma.mao === 'E') arma(t, ctx, p.bE.m, p.arma.ang);
    def.acessorios?.(t, ctx, 'maoLonge');
  }
  membro(t, ctx, p.pE, false, false);
  membro(t, ctx, p.pD, false, true);
  def.acessorios?.(t, ctx, 'casaco');
  // pescoço
  const pes = t.parte(M.pele, { limiar: 99 });
  t.ret(pes, R(p.cx - 2.5 + (lado ? -1 : 0)), R(p.hy + 7), 5, R(p.ombroY - p.hy - 6));
  tronco(t, ctx);
  if (costas) def.acessorios?.(t, ctx, 'fundo');
  if (!lado) { membro(t, ctx, p.bE, true, false); def.acessorios?.(t, ctx, 'maoLonge'); }
  const armaAtras = p.arma && costas;
  if (armaAtras) arma(t, ctx, p.bD.m, p.arma.ang);
  if (!lado) membro(t, ctx, p.bD, true, true);
  cabeca(t, ctx, expr);
  if (lado) membro(t, ctx, p.bD, true, true);
  if (p.arma && p.arma.mao === 'D' && !armaAtras && !p.arma.bainha) arma(t, ctx, p.bD.m, p.arma.ang);
  def.acessorios?.(t, ctx, 'frente');
  if (estado.ferido) t.rasgar(def.id.length * 17 + 3, Mx.pele);

  if (anim === 'derrota' && quadro >= 2) return deitar(t, quadro === 3 ? 1 : 0).render();
  return t.render();
}

// gira 90° (horário) — corpo caído, cabeça para a direita
function deitar(t, dy) {
  const n = new Tela(SW, SH, t.mats);
  n.partes = t.partes;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const i = y * SW + x;
    if (t.parte_[i] < 0) continue;
    const X = SH - 1 - y - 4, Y = x + 22 + dy;
    if (X < 0 || Y < 0 || X >= SW || Y >= SH) continue;
    const j = Y * SW + X;
    n.parte_[j] = t.parte_[i]; n.mat[j] = t.mat[i]; n.tomFixo[j] = t.tomFixo[i]; n.decal[j] = t.decal[i];
  }
  return n;
}

// ───────────────────────── retratos (cut-in 96×64, HUD 16×16, vencedor) ─────────────────────────
export function retrato(def, mats, M, o = {}) {
  const { w = 96, h = 64, e = 2.4, expr = "grito", especial = false, hx = w * 0.5, hy = h * 0.5 } = o;
  const t = new Tela(w, h, mats);
  t.flip = !!o.flip;
  const estado = { especial, ferido: !!o.ferido, anim: especial ? 'especial' : 'idle', quadro: 4, olhoEspecial: especial && def.olhoEspecial ? def.olhoEspecial : null };
  const Mx = especial && def.peleEspecial ? { ...M, pele: M[def.peleEspecial] } : M;
  const p = { hx, hy, cx: hx, ombroY: hy + 11 * e, cinturaY: hy + 30 * e, balanco: 0, ws: 16 * e, wc: 13 * e, wq: 14 * e, bE: { o: [0, 0], c: [0, 0], m: [0, 0] }, bD: { o: [0, 0], c: [0, 0], m: [0, 0] } };
  const ctx = { t, p, M: Mx, vista: 'frente', def, estado, e, hx, hy };
  if (!o.semCorpo) {
    // ombros e pescoço
    const T = def.tronco ?? {};
    const pes = t.parte(Mx.pele, { limiar: 99 });
    t.ret(pes, Math.round(hx - 2.6 * e), Math.round(hy + 6 * e), Math.round(5.2 * e), Math.round(8 * e));
    const id = t.parte(Mx[T.mat ?? 'roupa'], { limiar: 6, matFn: T.matFn ? T.matFn({ ...ctx, p: { ...p, ombroY: hy + 12.5 * e } }) : undefined });
    t.poli(id, [[hx - 7 * e, hy + 10.5 * e], [hx + 7 * e, hy + 10.5 * e], [hx + 13 * e, hy + 14 * e], [hx + 15 * e, hy + 40 * e], [hx - 15 * e, hy + 40 * e], [hx - 13 * e, hy + 14 * e]]);
    if (T.gola === 'v') { const g = t.parte(Mx[T.golaMat ?? 'pele'], { limiar: 99 }); t.poli(g, [[hx - 3.2 * e, hy + 10 * e], [hx + 3.2 * e, hy + 10 * e], [hx, hy + 10 * e + (T.golaFundo ?? 5) * e]], id); }
    if (T.gola === 'redonda') { const g = t.parte(Mx[T.golaMat ?? 'pele'], { limiar: 99 }); t.elipse(g, hx, hy + 10.5 * e, 3.6 * e, 2.4 * e, id); }
    def.acessorios?.(t, ctx, 'retrato');
  }
  cabeca(t, ctx, expr);
  if (estado.ferido) t.rasgar(def.id.length * 13 + 5, Mx.pele);
  return t.render();
}
