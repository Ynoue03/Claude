// Monta cada quadro do vídeo: mundo (calabouço ou floresta + lutadores + efeitos) e interface (HUD, banners, cut-ins).
import { cena, condicoesEm, posEm, valorEm, video, V, CUTIN, VS as DUR_VS } from "./roteiro.ts";
import type { Golpe, Roteiro } from "./roteiro.ts";
import { ALCANCE, geoDe } from "./combate.ts";
import type { Geo } from "./combate.ts";
import type { P } from "./combate.ts";
import { W, H, fundo, aplicarLuz, luzesTochas, luzEm, desenharTochas, desenharAmbiente, vinheta, AMBIENTE } from "./cenario.ts";
import type { Luz } from "./cenario.ts";
import { PE_Y, quadro, retrato, mini, alturaCabeca, ancora } from "./sprite.ts";
import { CHEFES } from "./chefes.ts";
import { quadroChefe } from "./chefes-arte.ts";
import type { Anim, Dir, Expr } from "./sprite.ts";
import { texto, larguraTexto, quebrar } from "./fonte.ts";
import type { OpTexto } from "./fonte.ts";
import { desenharEfeito, desenharD20, linhaPx } from "./efeitos.ts";
import type { EfeitoAtivo } from "./efeitos.ts";
import { hash3 } from "./rng.ts";
import { ITENS, desenharIcone } from "./itens.ts";
import type { ItemId } from "./itens.ts";
import { novoCanvas } from "./pixel.ts";
import { CLASSES, ESPECIES } from "./regras.ts";
import type { Lutador } from "./personagem.ts";

type Ctx = CanvasRenderingContext2D;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const ease = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 3;
const DOURADO = "#ffd84a";
const TINTA = "#1a1014";

// ───────────── utilidades de pixel ─────────────
const caixa = (ctx: Ctx, x: number, y: number, w: number, h: number, fundoC: string, borda = TINTA, esp = 2) => {
  ctx.fillStyle = borda;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.fillStyle = fundoC;
  ctx.fillRect(Math.round(x + esp), Math.round(y + esp), Math.round(w - esp * 2), Math.round(h - esp * 2));
};
const brilhoCaixa = (ctx: Ctx, x: number, y: number, w: number) => {
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(Math.round(x + 2), Math.round(y + 2), Math.round(w - 4), 1);
};

// silhueta branca (piscar ao levar dano) e contorno de luz (rim light), com cache
const brancos = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
const silhueta = (src: HTMLCanvasElement, cor = "#ffffff") => {
  const m0 = brancos.get(src);
  if (m0 && cor === "#ffffff") return m0;
  const c = novoCanvas(src.width, src.height);
  const x = c.getContext("2d")!;
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = cor;
  x.fillRect(0, 0, c.width, c.height);
  if (cor === "#ffffff") brancos.set(src, c);
  return c;
};
const contornos = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
const contornoLuz = (src: HTMLCanvasElement) => {
  const m0 = contornos.get(src);
  if (m0) return m0;
  const s = silhueta(src, "#ffe0b0");
  const c = novoCanvas(src.width, src.height);
  const x = c.getContext("2d")!;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    x.drawImage(s, dx, dy);
  x.globalCompositeOperation = "destination-out";
  x.drawImage(src, 0, 0);
  contornos.set(src, c);
  return c;
};

// ───────────── dados derivados do roteiro (cache) ─────────────
type Deriv = {
  turnosDe: { t0: number; t1: number }[][];
  golpesDe: Golpe[][];
  danosDe: number[][];
  mortesV: { id: number; v: number }[];
};
const derivados = new WeakMap<Roteiro, Deriv>();
const deriv = (r: Roteiro): Deriv => {
  const d0 = derivados.get(r);
  if (d0) return d0;
  const N = r.lutadores.length;
  const d: Deriv = {
    turnosDe: Array.from({ length: N }, () => []),
    golpesDe: Array.from({ length: N }, () => []),
    danosDe: Array.from({ length: N }, () => []),
    mortesV: [],
  };
  r.turnos.forEach((t) => d.turnosDe[t.ator].push({ t0: t.t0, t1: t.t1 }));
  r.golpes.forEach((g) => d.golpesDe[g.ator].push(g));
  r.danos.forEach((x) => d.danosDe[x.id].push(x.f));
  r.morte.forEach((m, id) => m < Infinity && d.mortesV.push({ id, v: video(r, m) }));
  d.mortesV.sort((a, b) => a.v - b.v);
  derivados.set(r, d);
  return d;
};

// ───────────── estado de um lutador num instante ─────────────
type EstadoL = {
  vis: boolean;
  x: number;
  y: number;
  dir: Dir;
  anim: Anim;
  q: number;
  expr: Expr;
  rasgado: boolean;
  flash: boolean;
  alpha: number;
  pv: number;
  pvMax: number;
  morto: boolean;
  caindo: number; // intro: altura da queda
};

const dirDe = (dx: number, dy: number, atual: Dir = "S"): Dir => {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return atual;
  return Math.abs(dx) > Math.abs(dy) * 0.9 ? (dx > 0 ? "E" : "W") : dy > 0 ? "S" : "N";
};

const POUSO = (i: number) => (i >= 16 ? 4 : 10 + i * 4); // o chefe (17º) chega primeiro
// textos que mudam quando o lutador é o chefe
const classeTxt = (l: Lutador) => (l.boss ? "CHEFE" : CLASSES[l.classe].nome.toUpperCase());
const corDe = (l: Lutador) => (l.boss ? "#e04040" : CLASSES[l.classe].cor);
const VERMELHO = "#ff4a3a";

const ondaOffset = (i: number, s: number) => {
  const w = 0.045 + hash3(i, 41) * 0.02;
  const sg = hash3(i, 42) < 0.5 ? -1 : 1;
  const ph = hash3(i, 43) * Math.PI * 2;
  const R = 5;
  const th = s * w * sg + ph;
  return { x: R * Math.cos(th), y: R * 0.6 * Math.sin(th), vx: -R * Math.sin(th) * w * sg, vy: R * 0.6 * Math.cos(th) * w * sg };
};

export const posViva = (r: Roteiro, i: number, s: number): P & { amp: number; vx: number; vy: number } => {
  const d = deriv(r);
  const base = posEm(r.pos[i], s);
  if (s < V.batalha - 10 || s >= r.morte[i]) return { ...base, amp: 0, vx: 0, vy: 0 };
  let dmin = Infinity;
  for (const t of d.turnosDe[i]) {
    if (s >= t.t0 - 2 && s <= t.t1 + 2) {
      dmin = 0;
      break;
    }
    dmin = Math.min(dmin, Math.abs(s - t.t0), Math.abs(s - t.t1));
  }
  let amp = clamp((dmin - 2) / 10, 0, 1) * clamp((s - V.batalha + 10) / 20, 0, 1);
  if (i === r.vencedor && s > r.sFimDuelo) amp *= clamp(1 - (s - r.sFimDuelo) / 12, 0, 1);
  const o = ondaOffset(i, s);
  return { x: base.x + o.x * amp, y: base.y + o.y * amp, amp, vx: o.vx * amp, vy: o.vy * amp };
};

const estado = (r: Roteiro, i: number, s: number, v: number): EstadoL => {
  const st = estadoBase(r, i, s, v);
  // o chefe só tem lados (E/W): de frente/costas vira para o herói vivo mais perto
  if (r.lutadores[i].boss && (st.dir === "N" || st.dir === "S")) {
    let melhor = Infinity,
      dx = MW / 2 - st.x;
    r.lutadores.forEach((_, j) => {
      if (j === i || s >= r.morte[j]) return;
      const q = posEm(r.pos[j], s);
      const d = Math.hypot(q.x - st.x, q.y - st.y);
      if (d < melhor) {
        melhor = d;
        dx = q.x - st.x;
      }
    });
    st.dir = dx < 0 ? "W" : "E";
  }
  return st;
};
const estadoBase = (r: Roteiro, i: number, s: number, v: number): EstadoL => {
  const l = r.lutadores[i];
  const d = deriv(r);
  const pvK = valorEm(r.pv[i], s);
  const pvMax = valorEm(r.niveis[i], s)?.max ?? l.pvMax;
  const pv = pvK?.pv ?? pvMax;
  const baixo = pv / pvMax < 0.3;
  const p = posViva(r, i, s);
  const st: EstadoL = { vis: true, x: p.x, y: p.y, dir: "S", anim: "idle", q: Math.floor(s / 8) % 4, expr: "foco", rasgado: baixo, flash: false, alpha: 1, pv, pvMax, morto: false, caindo: 0 };
  // intro: cai do alto
  if (v < V.batalha) {
    const tp = v - POUSO(i);
    if (tp < -12) st.vis = false;
    else if (tp < 0) st.caindo = (-tp / 12) ** 2 * 150;
    st.expr = "neutra";
    st.anim = "idle";
    st.q = Math.floor((v + i * 3) / 8) % 4;
    return st;
  }
  const morte = r.morte[i];
  if (s >= morte) {
    const dt = s - morte;
    st.morto = true;
    st.expr = "derrota";
    st.anim = "derrota";
    st.q = Math.min(3, Math.floor(dt / 5));
    st.rasgado = true;
    if (dt > 20) st.alpha = Math.floor(dt / 2) % 2 ? 0.25 : 1;
    if (dt > 30) st.vis = false;
    const g = r.golpes.find((x) => x.tImp === morte && x.resultados.some((y) => y.alvo === i && y.morreu));
    if (g) st.dir = dirDe(g.origem.x - p.x, g.origem.y - p.y);
    return st;
  }
  // vitória
  if (i === r.vencedor && s > r.sFimDuelo + 6) {
    st.anim = "vitoria";
    st.q = Math.floor(s / 6) % 4;
    st.expr = "vitoria";
    st.dir = "S";
    return st;
  }
  // levou dano agora?
  const danos = d.danosDe[i];
  let ultimoDano = -Infinity;
  for (const f of danos) if (f <= s && f > ultimoDano) ultimoDano = f;
  // golpe próprio em andamento?
  const g = d.golpesDe[i].find((x) => s >= x.t0 && s <= Math.max(x.tImp + 9, x.t0 + 14));
  // movimento próprio?
  const m = r.movimentos.find((x) => x.ator === i && s >= x.t0 && s <= x.t1);
  if (g) {
    const alvoP = g.resultados[0] && g.resultados[0].alvo !== i ? posViva(r, g.resultados[0].alvo, s) : null;
    if (alvoP) st.dir = dirDe(alvoP.x - p.x, alvoP.y - p.y, "S");
    else st.dir = "S";
    const magia = g.magia && g.fx !== "flecha";
    if (magia || g.fx === "furia" || g.fx === "brilho") {
      const dur = Math.max(6, g.tImp + 6 - g.t0);
      st.anim = "magia";
      st.q = clamp(Math.floor(((s - g.t0) / dur) * 7), 0, 6);
    } else {
      st.anim = "ataque";
      const meio = g.t0 + (g.tImp - g.t0) * 0.5;
      st.q = s < meio ? 0 : s < g.tImp ? 1 : s < g.tImp + 4 ? 2 : 3;
    }
    st.expr = Math.abs(s - g.tImp) < 6 ? "grito" : baixo ? "pvbaixo" : "foco";
  } else if (m) {
    const L = m.pts;
    const ahead = posEm(r.pos[i], s + 1);
    st.dir = dirDe(ahead.x - p.x, ahead.y - p.y, dirDe(L[L.length - 1].x - L[0].x, L[L.length - 1].y - L[0].y));
    st.anim = "andar";
    st.q = Math.floor(s / (m.corre ? 2 : 3)) % 6;
    st.expr = baixo ? "pvbaixo" : "foco";
  } else if (p.amp > 0.05) {
    st.dir = dirDe(p.vx, p.vy);
    st.anim = "andar";
    st.q = Math.floor((s + i * 2) / 5) % 6;
    st.expr = baixo ? "pvbaixo" : "foco";
  } else {
    st.anim = "idle";
    st.q = Math.floor((s + i * 3) / 8) % 4;
    // olha para o centro da luta
    st.dir = p.y > 380 ? "N" : "S";
    st.expr = baixo ? "pvbaixo" : "foco";
  }
  if (s - ultimoDano < 8 && !g) {
    st.anim = "dano";
    st.q = s - ultimoDano < 4 ? 0 : 1;
    st.expr = "dor";
    st.flash = s - ultimoDano < 3;
    // recua um pouco
    const atk = r.golpes.find((x) => x.tImp === ultimoDano && x.resultados.some((y) => y.alvo === i));
    if (atk) {
      const a = Math.atan2(p.y - atk.origem.y, p.x - atk.origem.x);
      const k = s - ultimoDano < 4 ? 2 : 1;
      st.x += Math.cos(a) * k;
      st.y += Math.sin(a) * k * 0.6;
      st.dir = dirDe(atk.origem.x - p.x, atk.origem.y - p.y);
    }
  }
  return st;
};

// ───────────── camadas ─────────────
let mundoC: HTMLCanvasElement | null = null;
let uiC: HTMLCanvasElement | null = null;

export type Camadas = { mundo: HTMLCanvasElement; ui: HTMLCanvasElement; zoom: number; foco: P; tremor: P };

const golpeTxt = (r: Roteiro, g: Golpe) => (g.nome === "ATAQUE" || g.nome === "OPORTUNIDADE" ? r.lutadores[g.ator].arma.nome.toUpperCase() : g.nome);

// tamanho do mundo da arena em uso (360×640 nas normais, 720×1280 na caverna dos chefes)
let MW = W,
  MH = H;
let GEOM: Geo = geoDe();
let LARG = W;
let ROT_Y = { y0: 0, y1: H }; // faixa vertical das caixas de golpe (no mesmo espaço de LARG) // largura de onde os rótulos são desenhados (mundo nas arenas normais, tela na caverna)

export const desenharQuadro = (r: Roteiro, v: number): Camadas => {
  const arena = r.ep.arena ?? "calabouco";
  GEOM = geoDe(arena);
  MW = GEOM.w;
  MH = GEOM.h;
  const grande = MW > W; // arena maior que a tela: câmera segue a ação
  if (!mundoC || mundoC.width !== MW || mundoC.height !== MH) mundoC = novoCanvas(MW, MH);
  if (!uiC) uiC = novoCanvas(W, H);
  const ctx = mundoC.getContext("2d")!;
  const ui = uiC.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ui.imageSmoothingEnabled = false;
  ui.clearRect(0, 0, W, H);
  const { s, congelado, dentro } = cena(r, v);
  const N = r.lutadores.length;

  // ── mundo ──
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const comAltar = r.ep.centro !== "livre";
  ctx.drawImage(fundo(arena, comAltar), 0, 0);
  const luzes: Luz[] = luzesTochas(s, arena);
  const estados = r.lutadores.map((_, i) => estado(r, i, s, v));

  // efeitos ativos (calcula luzes antes de iluminar)
  const ativos: { e: EfeitoAtivo; g: Golpe }[] = [];
  for (const g of r.golpes) {
    if (s < g.t0 - 1 || s > g.tImp + 22) continue;
    const a = estados[g.ator];
    const hy = alturaCabeca(r.lutadores[g.ator]) - PE_Y + 16;
    const de = { x: a.x + (a.dir === "E" ? 8 : a.dir === "W" ? -8 : 0), y: a.y + hy };
    const para = g.resultados.map((res) => {
      const b = estados[res.alvo];
      return { x: b.x, y: b.y - (r.lutadores[res.alvo].boss ? Math.round((PE_Y - alturaCabeca(r.lutadores[res.alvo])) * 0.55) : 16) };
    });
    const distanciaFx = ["flecha", "raioFogo", "misseis", "raioGelo", "orbe", "rajada", "chama", "raioGuia", "espinhos", "zombaria", "sussurros"].includes(g.fx);
    const tSolta = distanciaFx ? Math.min(8, (g.tImp - g.t0) * 0.45) : g.tImp - g.t0;
    ativos.push({
      g,
      e: {
        fx: g.fx,
        tipo: g.tipo,
        de: g.fx === "onda" || g.fx === "furia" || g.fx === "brilho" ? { x: a.x, y: a.y - 16 } : de,
        para: g.fx === "furia" || g.fx === "brilho" ? [{ x: a.x, y: a.y - 16 }] : para,
        t: s - g.t0,
        tSolta,
        tImp: g.tImp - g.t0,
        acertou: g.resultados.map((x) => x.dano > 0 || x.r === "cura" || x.r === "buff" || x.r === "falhou"),
        seed: Math.round(g.t0),
        cor: g.cor,
      },
    });
  }
  // desenha efeitos num canvas temporário para coletar as luzes antes da iluminação
  const fxLuzes: Luz[] = [];
  // aura de fúria contínua e brilho de vitória
  r.lutadores.forEach((_, i) => {
    const e = estados[i];
    if (!e.vis || e.morto) return;
    const conds = condicoesEm(r, i, s);
    if (conds.includes("FÚR")) fxLuzes.push({ x: e.x, y: e.y, r: 34, cor: [255, 90, 60], i: 0.35 });
  });
  if (v >= V.vitoria) {
    const e = estados[r.vencedor];
    fxLuzes.push({ x: e.x, y: e.y - 10, r: 110, cor: [255, 220, 120], i: 0.9 });
  }
  // ilumina
  const tmpLuzes: Luz[] = [];
  for (const { e } of ativos) {
    const dummy = efeitoLuzes(e);
    tmpLuzes.push(...dummy);
  }
  aplicarLuz(ctx, [...luzes, ...fxLuzes, ...tmpLuzes], AMBIENTE[arena]);
  desenharAmbiente(ctx, s, arena, comAltar);

  // caveirinhas de quem caiu
  r.morte.forEach((m, i) => {
    if (s < m + 30) return;
    const p = posEm(r.pos[i], m);
    caveirinha(ctx, p.x, p.y - 3);
  });

  // sombras no chão
  const ordem = estados.map((e, i) => ({ e, i })).filter(({ e }) => e.vis);
  for (const { e, i } of ordem) {
    const k = e.caindo > 0 ? clamp(1 - e.caindo / 150, 0.3, 1) : 1;
    const b = r.lutadores[i].boss;
    sombra(ctx, e.x, e.y, k * (b ? CHEFES[b].raio / 7 : 1) * (e.anim === "derrota" && e.q >= 2 ? 1.4 : 1));
  }
  // coluna de luz dourada do vencedor (atrás)
  if (v >= V.vitoria && v < r.fases.pergaminho + 10) colunaLuz(ctx, estados[r.vencedor].x, estados[r.vencedor].y, v - V.vitoria);

  // lutadores por profundidade
  ordem.sort((a, b) => a.e.y - b.e.y);
  for (const { e, i } of ordem) {
    const l = r.lutadores[i];
    const sp = quadro(l, { anim: e.anim, q: e.q, dir: e.dir, expr: e.expr, rasgado: e.rasgado });
    const an = ancora(l);
    const x = Math.round(e.x - an.x),
      y = Math.round(e.y - an.y - e.caindo);
    const lum = luzEm(luzes, e.x, e.y - 20);
    if (!e.morto && condicoesEm(r, i, s).includes("INV")) e.alpha *= Math.floor(v / 3) % 2 ? 0.25 : 0.4;
    ctx.globalAlpha = e.alpha * (0.28 + lum * 0.4);
    ctx.drawImage(contornoLuz(sp), x, y);
    ctx.globalAlpha = e.alpha;
    ctx.filter = `brightness(${(0.8 + lum * 0.3).toFixed(2)})`;
    ctx.drawImage(e.flash ? silhueta(sp) : sp, x, y);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    // coroa do campeão que volta
    if (l.campeao && e.vis) coroa(ctx, Math.round(e.x), Math.round(e.y - PE_Y - e.caindo) + alturaCabeca(l) - 14 - (l.visual.cabeca === "chapeu" ? 10 : 0));
    // aura de escudo
    if (!e.morto && condicoesEm(r, i, s).includes("ESC")) {
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(s * 0.5);
      anelHex(ctx, e.x, e.y - 18, 15, "#7ae8f0");
      ctx.globalAlpha = 1;
    }
  }

  // efeitos dos golpes
  ctx.save();
  for (const { e } of ativos) desenharEfeito(ctx, e);
  ctx.restore();
  // poeira do pouso (intro) e "poof" de fumaça de quem cai
  for (let i = 0; i < N; i++) {
    const tp = v - POUSO(i);
    if (v < V.batalha && tp >= 0 && tp < 12) poeira(ctx, estados[i].x, estados[i].y, tp);
    const m = r.morte[i];
    if (s >= m + 26 && s < m + 42) {
      const p = posEm(r.pos[i], m);
      poof(ctx, p.x, p.y - 12, s - m - 26, i);
    }
  }
  // vapor de fúria contínuo
  r.lutadores.forEach((_, i) => {
    const e = estados[i];
    if (!e.vis || e.morto || !condicoesEm(r, i, s).includes("FÚR")) return;
    for (let k = 0; k < 4; k++) {
      const ph = (s * 0.8 + k * 6 + i * 3) % 24;
      ctx.fillStyle = `rgba(255,${70 + k * 10},60,${0.6 * (1 - ph / 24)})`;
      ctx.fillRect(Math.round(e.x - 8 + hash3(k, i) * 16), Math.round(e.y - 6 - ph * 1.5), 1, 2);
    }
  });
  desenharTochas(ctx, s, arena);
  if (!grande) vinheta(ctx);
  // confete (no mundo, cai sobre todos)

  // ── câmera: zoom 1,2× no duelo e tremor nos especiais ──
  // caverna do chefe: a câmera mostra a arena inteira (zoom 0,5 = 720×1280 na tela de 360×640)
  const z0 = grande ? W / MW : 1;
  let zoom = z0;
  let foco: P = grande ? { x: MW / 2, y: MH / 2 } : { x: W / 2, y: H / 2 };
  const vsC = r.congela.find((c) => c.tipo === "vs")!;
  if (v >= vsC.v0 + DUR_VS && v < r.fases.pergaminho) {
    const k = ease((v - vsC.v0 - DUR_VS) / 20);
    zoom = grande ? z0 + (1 - z0) * k : 1 + 0.2 * k; // no duelo a caverna aproxima até o tamanho normal
    const [a, b] = r.finalistas.map((i) => estados[i]);
    const alvo = v >= V.vitoria || !b ? { x: estados[r.vencedor].x, y: estados[r.vencedor].y - 20 } : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 20 };
    foco = { x: foco.x + (alvo.x - foco.x) * k, y: foco.y + (alvo.y - foco.y) * k };
  }
  {
    const mx = W / (2 * zoom),
      my = H / (2 * zoom);
    foco = { x: clamp(foco.x, mx, MW - mx), y: clamp(foco.y, my, MH - my) };
  }
  // deslocamento mundo → tela (para desenhar rótulos da interface em cima de quem está no mundo)
  const off: P = { x: W / 2 - foco.x * zoom, y: H / 2 - foco.y * zoom };
  let tremor: P = { x: 0, y: 0 };
  for (const g of r.golpes) {
    const pi = s - g.tImp;
    if (pi >= 0 && pi < 7 && (g.especial >= 2 || g.fx === "corteGrande" || g.fx === "onda" || g.fx === "sopro")) {
      const amp = (v > V.duelo ? 3 : 2) * (1 - pi / 7);
      tremor = { x: Math.round((hash3(v, 1) - 0.5) * 2 * amp), y: Math.round((hash3(v, 2) - 0.5) * 2 * amp) };
    }
  }

  // rótulos (vida, ▼, caixas, dados, números): nas arenas normais vão no mundo; na caverna vão na interface, no
  // tamanho normal, na posição de tela de cada lutador (com o zoom 0,5 ficariam ilegíveis)
  if (grande) vinheta(ui);
  const oc = grande ? ui : ctx;
  const zr = grande ? zoom : 1;
  const ov: P = grande ? off : { x: 0, y: 0 };
  const est = grande ? estados.map((e) => ({ ...e, x: e.x * zr + ov.x, y: e.y * zr + ov.y })) : estados;
  const cab = (i: number) => (alturaCabeca(r.lutadores[i]) - PE_Y) * zr; // da sola à cabeça, já no zoom
  LARG = grande ? W : MW;
  ROT_Y = grande ? { y0: 192, y1: H - 90 } : { y0: GEOM.lim.y0 - 32, y1: GEOM.lim.y1 };
  // ── marcadores sobre os lutadores (não escurecem) ──
  if (v >= V.batalha - 20 && v < r.fases.pergaminho) {
    for (const { i } of ordem) {
      const e = est[i];
      if (e.morto) continue;
      const l = r.lutadores[i];
      const by = Math.round(e.y + 3);
      barraPv(oc, Math.round(e.x) - 8, by, 16, e.pv / e.pvMax);
      const conds = condicoesEm(r, i, s).filter((c) => c !== "ZMB");
      conds.slice(0, 3).forEach((c, k) => etiqueta(oc, Math.round(e.x) - 3 * conds.slice(0, 3).length * 2 + k * 12 + 6, by + 5, c));
      void l;
    }
    // seta ▼ de quem está no turno
    // seta ▼ em cada um dos (até 4) lutadores que estão agindo agora
    const noTurno = r.turnos.filter((t) => s >= t.t0 && s < t.t1);
    if (!congelado && Math.floor(v / 4) % 4 !== 3)
      for (const tAtual of noTurno) {
        const e = est[tAtual.ator];
        if (!e.vis || e.morto) continue;
        const hy = e.y + cab(tAtual.ator) - 17 - Math.round(Math.abs(Math.sin(v * 0.25)) * 2);
        texto(oc, "▼", Math.round(e.x), hy, { cor: DOURADO, contorno: TINTA, alinhar: "centro" });
      }
  }
  // caixas dos golpes, dados e números
  caixasUsadas.length = 0;
  for (const { g } of ativos) {
    const a = est[g.ator];
    const dt = s - g.t0;
    if (dt >= 0 && dt < 30 && v < V.vitoria + 10) caixaGolpe(oc, g, a.x, a.y + cab(g.ator) - 30, dt);
    if (g.d20 && dt >= 0 && dt < 26) {
      const sx = a.x + (a.x > LARG * 0.7 ? -20 : 20);
      desenharD20(oc, Math.round(sx), Math.round(a.y + Math.min(-34, cab(g.ator) + 8)), g.d20.v, dt, { acerto: "#5ac85a", erro: "#8a8a96", critico: DOURADO, falha: "#e04040" }[g.d20.cor], (n, x, y) => texto(oc, n, x, y, { fonte: "p", cor: "#ffffff", contorno: TINTA, alinhar: "centro" }));
    }
    const pi = s - g.tImp;
    if (g.subiu && pi >= 8 && pi < 60) {
      const b = est[g.subiu.id];
      const k = pi - 8;
      const a = k > 44 ? 1 - (k - 44) / 8 : 1;
      const yb = b.y + cab(g.subiu.id) - 30 - Math.min(10, k * 0.8);
      if (Math.floor(k / 4) % 4 !== 3) texto(oc, "SUBIU DE NÍVEL!", clamp(b.x, 60, LARG - 60), yb, { cor: DOURADO, contorno: TINTA, alinhar: "centro", alpha: a });
      texto(oc, `NV ${g.subiu.de} → ${g.subiu.para} · +${g.subiu.ganho} PV`, clamp(b.x, 60, LARG - 60), yb + 10, { cor: "#6aff7a", contorno: TINTA, alinhar: "centro", fonte: "p", alpha: a });
      if (k < 30) colunaLuz(ctx, estados[g.subiu.id].x, estados[g.subiu.id].y, k + 20);
    }
    if (g.itensPegos && pi >= 14 && pi < 64) {
      const b = est[g.itensPegos.id];
      const k = pi - 14;
      const a = k > 40 ? 1 - (k - 40) / 10 : 1;
      const yb = b.y + cab(g.itensPegos.id) - 44 - Math.min(8, k * 0.6);
      const n = g.itensPegos.itens.length;
      texto(oc, n > 1 ? `PEGOU ${n} ITENS!` : "PEGOU O ITEM!", clamp(b.x, 60, LARG - 60), yb, { cor: "#ffd84a", contorno: TINTA, alinhar: "centro", alpha: a });
      oc.globalAlpha = a;
      g.itensPegos.itens.forEach((it, j) => desenharIcone(oc, it, Math.round(clamp(b.x, 60, LARG - 60) - (n * 17) / 2 + j * 17), Math.round(yb + 9)));
      oc.globalAlpha = 1;
    }
    if (pi >= 0 && pi < 32) {
      g.resultados.forEach((res, k) => {
        const b = est[res.alvo];
        numerosFlutuantes(oc, b.x, b.y + Math.min(-36, cab(res.alvo) + 5) - pi * 0.6 - k * 4, res, pi, g);
      });
    }
  }

  // ── interface ──
  if (v >= V.vitoria && v < r.fases.pergaminho + 30) confete(ui, v - V.vitoria);
  if (v < (r.fases.bau >= 0 ? r.fases.bau : r.fases.pergaminho)) hud(ui, r, s, v, estados);
  if (v < V.batalha + 10) intro(ui, r, v, estados, off, zoom);
  bannersCaiu(ui, r, v);
  bannerChefe(ui, r, s);
  if (congelado?.tipo === "cutin" && congelado.golpe) cutin(ui, r, congelado.golpe, dentro);
  if (congelado?.tipo === "vs") telaVs(ui, r, dentro, estados);
  if (v >= V.vitoria && v < (r.fases.bau >= 0 ? r.fases.bau + 6 : r.fases.pergaminho + 6)) vitoria(ui, r, v - V.vitoria);
  if (r.fases.bau >= 0 && v >= r.fases.bau && v < r.fases.pergaminho + 4) cenaBau(ui, r, v - r.fases.bau);
  if (v >= r.fases.pergaminho - 4 && v < V.cta + 24) pergaminho(ui, r, v);
  if (v >= V.cta) cta(ui, r, v - V.cta);
  void CUTIN;
  void ALCANCE;
  return { mundo: mundoC, ui: uiC, zoom, foco, tremor };
};

// coleta só as luzes de um efeito (sem desenhar)
let ctxNulo: Ctx | null = null;
const efeitoLuzes = (e: EfeitoAtivo): Luz[] => {
  if (!ctxNulo) ctxNulo = novoCanvas(1, 1).getContext("2d")!;
  return desenharEfeito(ctxNulo, e);
};

// ───────────── peças do mundo ─────────────
const sombra = (ctx: Ctx, x: number, y: number, k: number) => {
  ctx.fillStyle = "rgba(8,6,14,0.42)";
  const rx = Math.round(9 * k),
    ry = Math.max(1, Math.round(3 * k));
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2));
    ctx.fillRect(Math.round(x) - w, Math.round(y) + dy, w * 2, 1);
  }
};
const caveirinha = (ctx: Ctx, x: number, y: number) => {
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = "#2a2226";
  ctx.fillRect(x - 4, y - 3, 9, 8);
  ctx.fillStyle = "#e8e0cc";
  ctx.fillRect(x - 3, y - 3, 7, 5);
  ctx.fillRect(x - 2, y + 2, 5, 2);
  ctx.fillStyle = "#b8ae98";
  ctx.fillRect(x + 2, y - 2, 1, 4);
  ctx.fillStyle = "#1a1418";
  ctx.fillRect(x - 2, y - 1, 2, 2);
  ctx.fillRect(x + 1, y - 1, 2, 2);
  ctx.fillRect(x, y + 2, 1, 1);
};
const coroa = (ctx: Ctx, x: number, y: number) => {
  ctx.fillStyle = TINTA;
  ctx.fillRect(x - 5, y - 4, 11, 7);
  ctx.fillStyle = "#f0c040";
  ctx.fillRect(x - 4, y - 1, 9, 3);
  ctx.fillRect(x - 4, y - 3, 1, 2);
  ctx.fillRect(x, y - 3, 1, 2);
  ctx.fillRect(x + 4, y - 3, 1, 2);
  ctx.fillStyle = "#fff2a0";
  ctx.fillRect(x - 4, y - 1, 9, 1);
  ctx.fillStyle = "#d83a4a";
  ctx.fillRect(x, y, 1, 1);
};
const anelHex = (ctx: Ctx, cx: number, cy: number, r: number, cor: string) => {
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2,
      a1 = ((i + 1) / 6) * Math.PI * 2;
    linhaPx(ctx, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 1.2, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 1.2, cor);
  }
};
const poeira = (ctx: Ctx, x: number, y: number, t: number) => {
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const d = 4 + t * 1.6;
    ctx.fillStyle = `rgba(200,190,170,${0.7 * (1 - t / 12)})`;
    ctx.fillRect(Math.round(x + Math.cos(a) * d * 1.4), Math.round(y + Math.sin(a) * d * 0.4 - t * 0.3), k % 3 === 0 ? 2 : 1, 1);
  }
};
const poof = (ctx: Ctx, x: number, y: number, t: number, seed: number) => {
  const k = t / 16;
  for (let i = 0; i < 7; i++) {
    const a = hash3(i, seed) * Math.PI * 2;
    const d = 3 + k * 12 * (0.6 + hash3(i, seed + 1) * 0.4);
    const r = Math.max(1, Math.round(4 * (1 - k) + 1));
    ctx.fillStyle = i % 2 ? `rgba(220,214,206,${1 - k})` : `rgba(160,154,150,${1 - k})`;
    ctx.fillRect(Math.round(x + Math.cos(a) * d - r), Math.round(y + Math.sin(a) * d * 0.8 - r - k * 6), r * 2, r * 2);
  }
};
const colunaLuz = (ctx: Ctx, x: number, y: number, t: number) => {
  const a = clamp(t / 10, 0, 1) * (t > 110 ? clamp(1 - (t - 110) / 20, 0, 1) : 1);
  const larg = 14 + Math.round(Math.sin(t * 0.3) * 2);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(255,210,90,${0.35 * a})`;
  ctx.fillRect(Math.round(x - larg), 0, larg * 2, Math.round(y + 4));
  ctx.fillStyle = `rgba(255,240,180,${0.5 * a})`;
  ctx.fillRect(Math.round(x - larg / 3), 0, Math.round((larg * 2) / 3), Math.round(y + 4));
  for (let i = 0; i < 16; i++) {
    const yy = y - ((t * 4 + i * 23) % 200);
    ctx.fillStyle = `rgba(255,240,170,${a})`;
    ctx.fillRect(Math.round(x + (hash3(i, 5) - 0.5) * larg * 2), Math.round(yy), 1, 2);
  }
  ctx.restore();
};
const confete = (ctx: Ctx, t: number) => {
  const cores = ["#ffd84a", "#ff5a7a", "#5ad0ff", "#7aff8a", "#ffffff", "#c07aff"];
  for (let i = 0; i < 90; i++) {
    const x0 = hash3(i, 61) * W;
    const vy = 1.2 + hash3(i, 62) * 1.6;
    const y = -10 - hash3(i, 63) * 200 + t * vy;
    if (y < -4 || y > H) continue;
    const x = x0 + Math.sin(t * 0.1 + i) * 6;
    ctx.fillStyle = cores[i % cores.length];
    const flip = Math.floor(t / 4 + i) % 2;
    ctx.fillRect(Math.round(x), Math.round(y), flip ? 2 : 1, flip ? 1 : 2);
  }
};
const barraPv = (ctx: Ctx, x: number, y: number, w: number, frac: number) => {
  ctx.fillStyle = TINTA;
  ctx.fillRect(x - 1, y - 1, w + 2, 4);
  ctx.fillStyle = "#3a2a30";
  ctx.fillRect(x, y, w, 2);
  const cor = frac > 0.6 ? "#5ad05a" : frac > 0.3 ? "#f0d040" : "#e84040";
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, Math.max(0, Math.round(w * clamp(frac, 0, 1))), 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(x, y, Math.max(0, Math.round(w * clamp(frac, 0, 1))), 1);
};
const COR_COND: Record<string, string> = { FÚR: "#ff7a3a", MRC: "#b8f060", CNC: "#ffffff", ESC: "#7ae8f0", LNT: "#9ad8ff", ATD: "#ffd84a", INV: "#c8a0ff" };
const etiqueta = (ctx: Ctx, x: number, y: number, c: string) => {
  const w = larguraTexto(c, "p") + 2;
  ctx.fillStyle = TINTA;
  ctx.fillRect(x - Math.round(w / 2) - 1, y - 1, w + 2, 7);
  texto(ctx, c, x, y, { fonte: "p", cor: COR_COND[c] ?? "#fff", alinhar: "centro" });
};

const caixasUsadas: { x: number; y: number; w: number; h: number }[] = [];
const caixaGolpe = (ctx: Ctx, g: Golpe, x: number, y: number, dt: number) => {
  const nome = g.nome;
  const w = larguraTexto(nome) + 10;
  const h = 13;
  const sobe = dt < 4 ? (4 - dt) * 2 : 0;
  const alpha = dt > 24 ? 1 - (dt - 24) / 6 : 1;
  const bx = clamp(x - w / 2, 30, LARG - 30 - w);
  let by = clamp(y - h - sobe, ROT_Y.y0, ROT_Y.y1);
  // empilha se encostar em outra caixa
  for (let n = 0; n < 4; n++) {
    const bate = caixasUsadas.some((c) => bx < c.x + c.w && bx + w > c.x && by < c.y + c.h && by + h > c.y);
    if (!bate) break;
    by = by - h - 1 < 168 ? by + h + 1 : by - h - 1;
  }
  caixasUsadas.push({ x: bx, y: by, w, h });
  ctx.globalAlpha = alpha;
  caixa(ctx, bx, by, w, h, g.cor);
  brilhoCaixa(ctx, bx, by, w);
  texto(ctx, nome, bx + w / 2, by + 3, { cor: "#ffffff", contorno: TINTA, alinhar: "centro" });
  ctx.globalAlpha = 1;
};

const numerosFlutuantes = (ctx: Ctx, x: number, y: number, res: Golpe["resultados"][number], pi: number, g: Golpe) => {
  const alpha = pi > 22 ? 1 - (pi - 22) / 10 : 1;
  const pop = pi < 3 ? 3 - pi : 0;
  const linhas: { t: string; cor: string; esc: number }[] = [];
  if (res.r === "critico") linhas.push({ t: "CRÍTICO!", cor: DOURADO, esc: 1 });
  if (res.dano > 0) linhas.push({ t: String(res.dano), cor: res.r === "critico" ? "#ff6a4a" : "#ffffff", esc: 2 });
  if (res.cura > 0) linhas.push({ t: `+${res.cura}`, cor: "#6aff7a", esc: 2 });
  for (const t of res.textos) {
    if (t === "CRÍTICO!") continue;
    const cor = t === "REFLETIU!" ? "#d0e0f0" : t === "ESPINHOS" ? "#b8d060" : t === "VAMPIRA" ? "#ff6a9a" : t === "RÚNICA" ? "#8aa0ff" : t === "BLOQUEOU!" ? "#5ad0a0" : t === "ENGANOU A MORTE!" ? DOURADO : t === "INVISÍVEL!" ? "#c8a0ff" : t === "CEIFADOR" ? "#ff9a6a" : t === "ERROU" || t === "FALHA" ? "#c8c8d0" : t === "SALVOU" ? "#9ad8ff" : t === "IMPLACÁVEL!" ? "#ff9a4a" : t.startsWith("PERDEU") ? "#ffb0ff" : "#fff2a0";
    linhas.push({ t: t === "PERDEU CONCENTRAÇÃO" ? "PERDEU CONC." : t, cor, esc: 1 });
  }
  if (res.r === "buff" && g.fx === "marca") linhas.push({ t: "MARCADO", cor: "#b8f060", esc: 1 });
  let yy = y;
  ctx.globalAlpha = alpha;
  for (const ln of linhas) {
    const xx = clamp(x, 40, LARG - 40);
    texto(ctx, ln.t, xx, Math.round(yy - pop), { cor: ln.cor, contorno: TINTA, escala: ln.esc, alinhar: "centro" });
    yy += ln.esc === 2 ? 16 : 10;
  }
  ctx.globalAlpha = 1;
};

// ───────────── HUD ─────────────
const hud = (ui: Ctx, r: Roteiro, s: number, v: number, estados: EstadoL[]) => {
  const y0 = 73;
  ui.fillStyle = "rgba(10,8,16,0.78)";
  ui.fillRect(28, y0, W - 56, 92);
  ui.fillStyle = "#5a4a3a";
  ui.fillRect(28, y0, W - 56, 1);
  ui.fillRect(28, y0 + 91, W - 56, 1);
  ui.fillStyle = "#8a6a3a";
  ui.fillRect(28, y0 + 1, W - 56, 1);
  texto(ui, `ARENA D20 #${r.ep.numero}`, 34, y0 + 5, { cor: DOURADO, contorno: TINTA, escala: 2 });
  const vivos = r.morte.filter((m) => s < m).length;
  const iniciados = r.turnos.filter((t) => s >= t.t0);
  const rodada = v < V.batalha ? 0 : Math.max(1, ...iniciados.map((t) => t.rodada));
  texto(ui, v < V.batalha ? `VIVOS ${r.lutadores.length}` : `RODADA ${rodada} · VIVOS ${vivos}`, W - 34, y0 + 9, { cor: "#ffffff", contorno: TINTA, alinhar: "dir" });
  const ativos = new Set(r.turnos.filter((t) => s >= t.t0 && s < t.t1).map((t) => t.ator));
  r.lutadores.forEach((l, i) => {
    if (l.boss) return barraChefe(ui, l, estados[i], v >= POUSO(i), s >= r.morte[i], ativos.has(i) && Math.floor(v / 3) % 2 === 0);
    const col = i % 4,
      row = Math.floor(i / 4);
    const x = 32 + col * 74,
      y = y0 + 23 + row * 17;
    const e = estados[i];
    const morto = s >= r.morte[i] + 10;
    const visivel = v >= POUSO(i);
    if (!visivel) return;
    const frac = e.pv / e.pvMax;
    const nivel = valorEm(r.niveis[i], s)?.nivel ?? l.nivel;
    const expr: Expr = morto ? "derrota" : frac > 0.6 ? "neutra" : frac > 0.3 ? "foco" : "pvbaixo";
    if (ativos.has(i) && Math.floor(v / 3) % 2 === 0) {
      ui.fillStyle = DOURADO;
      ui.fillRect(x - 1, y - 1, 18, 18);
    }
    ui.fillStyle = "#2a2430";
    ui.fillRect(x, y, 16, 16);
    ui.drawImage(mini(l, expr, morto), x, y);
    if (morto) {
      linhaPx(ui, x + 2, y + 2, x + 13, y + 13, "#e03a3a");
      linhaPx(ui, x + 13, y + 2, x + 2, y + 13, "#e03a3a");
    }
    if (l.campeao) coroa(ui, x + 8, y + 1);
    const nome = l.nome.split(" ")[0].toUpperCase();
    texto(ui, nome.length > 9 ? nome.slice(0, 9) : nome, x + 19, y + 1, { cor: morto ? "#6a6470" : "#ffffff" });
    if (morto) {
      ui.fillStyle = "#c83a3a";
      ui.fillRect(x + 18, y + 4, Math.min(56, larguraTexto(nome.slice(0, 9))) + 2, 1);
    }
    ui.fillStyle = TINTA;
    ui.fillRect(x + 19, y + 10, 5, 5);
    ui.fillStyle = morto ? "#5a5460" : corDe(l);
    ui.fillRect(x + 20, y + 11, 3, 3);
    texto(ui, `NV${nivel}`, x + 26, y + 10, { fonte: "p", cor: nivel > 1 ? DOURADO : "#c8c0b8" });
    barraPv(ui, x + 40, y + 11, 32, morto ? 0 : frac);
  });
};

// barra de vida do chefe (embaixo do HUD)
const barraChefe = (ui: Ctx, l: Lutador, e: EstadoL, visivel: boolean, morto: boolean, ativo: boolean) => {
  if (!visivel) return;
  const y = 168;
  ui.fillStyle = "rgba(10,8,16,0.82)";
  ui.fillRect(28, y, W - 56, 20);
  ui.fillStyle = ativo ? DOURADO : "#7a1e22";
  ui.fillRect(28, y, W - 56, 1);
  ui.fillRect(28, y + 19, W - 56, 1);
  ui.fillStyle = "#2a2430";
  ui.fillRect(32, y + 2, 16, 16);
  ui.drawImage(mini(l, "neutra", morto), 32, y + 2);
  texto(ui, l.nome.toUpperCase(), 52, y + 3, { cor: morto ? "#6a6470" : VERMELHO, contorno: TINTA });
  texto(ui, "CHEFE", 52, y + 12, { cor: "#c8c0b8", fonte: "p" });
  const bx = 52 + Math.max(larguraTexto(l.nome.toUpperCase()), 30) + 8,
    bw = W - 34 - bx;
  const frac = morto ? 0 : clamp(e.pv / e.pvMax, 0, 1);
  ui.fillStyle = TINTA;
  ui.fillRect(bx - 1, y + 5, bw + 2, 10);
  ui.fillStyle = "#3a1418";
  ui.fillRect(bx, y + 6, bw, 8);
  ui.fillStyle = "#c82a2a";
  ui.fillRect(bx, y + 6, Math.round(bw * frac), 8);
  ui.fillStyle = "#ff6a5a";
  ui.fillRect(bx, y + 6, Math.round(bw * frac), 2);
  texto(ui, `${morto ? 0 : e.pv}/${e.pvMax}`, bx + bw / 2, y + 7, { fonte: "p", cor: "#ffffff", contorno: TINTA, alinhar: "centro" });
};

// ───────────── intro ─────────────
const intro = (ui: Ctx, r: Roteiro, v: number, estados: EstadoL[], off: P = { x: 0, y: 0 }, zoom = 1) => {
  // nomes embaixo de cada um
  if (v < V.batalha) {
    r.lutadores.forEach((l, i) => {
      if (v < POUSO(i) + 2) return;
      const e = estados[i];
      const x = Math.round(e.x * zoom + off.x),
        y = Math.round(e.y * zoom + 4 + off.y);
      const nome = l.nome.toUpperCase();
      const sub = l.boss ? "CHEFE" : `${CLASSES[l.classe].nome.toUpperCase()} NV${l.nivel}`;
      const w = Math.max(larguraTexto(nome, "p"), larguraTexto(sub, "p")) + 4;
      ui.fillStyle = l.boss ? "rgba(60,8,12,0.85)" : "rgba(10,8,16,0.75)";
      ui.fillRect(x - Math.round(w / 2), y, w, 14);
      texto(ui, nome, x, y + 1, { fonte: "p", cor: l.boss ? VERMELHO : "#ffffff", alinhar: "centro" });
      texto(ui, sub, x, y + 8, { fonte: "p", cor: corDe(l), alinhar: "centro" });
    });
  }
  // banner do chefe: "CUIDADO: O MINOTAURO!" antes da escolha
  const chefe = r.lutadores.find((l) => l.boss);
  if (chefe && v >= 16 && v < 66) {
    const t = v - 16;
    const k = ease(t / 6) * (v > 60 ? (66 - v) / 6 : 1);
    const txt = `CUIDADO: ${chefe.nome.toUpperCase()}!`;
    const esc = larguraTexto(txt, "g", 2) + 30 > W - 48 ? 1 : 2;
    const w = larguraTexto(txt, "g", esc) + 30;
    const y = 318;
    caixa(ui, W / 2 - (w / 2) * k, y, w * k, 26, "#5a0e16", "#ff6a4a", 2);
    if (k > 0.95) texto(ui, txt, W / 2, y + (esc === 2 ? 6 : 9), { cor: "#ffd0a0", contorno: TINTA, escala: esc, alinhar: "centro" });
  }
  // banner "ESCOLHA SEU CAMPEÃO!"
  if (v >= 72 && v < V.batalha) {
    const k = ease((v - 72) / 8);
    const txt = r.ep.textos.escolha;
    const w = Math.min(W - 64, larguraTexto(txt, "g", 2) + 44);
    const x = W / 2 - (w / 2) * k;
    const y = 318;
    caixa(ui, x, y, w * k, 26, "#3a1e2a", "#e8c060", 2);
    if (k > 0.95) {
      texto(ui, txt, W / 2, y + 6, { cor: DOURADO, contorno: TINTA, escala: 2, alinhar: "centro" });
      d20Icone(ui, x + 12, y + 13, v);
      d20Icone(ui, x + w - 12, y + 13, v);
    }
  }
  // contagem 3, 2, 1, LUTEM!
  const marcas = [
    [100, "3"],
    [115, "2"],
    [130, "1"],
    [145, r.ep.textos.lutem],
  ] as [number, string][];
  for (const [v0, t] of marcas) {
    const dt = v - v0;
    const dur = t.length > 1 ? 24 : 15;
    if (dt < 0 || dt >= dur) continue;
    const esc = dt < 3 ? 7 - dt : 4;
    const cor = t.length > 1 ? "#ff5a3a" : "#ffffff";
    texto(ui, t, W / 2, 420 - esc * 3.5, { cor, contorno: TINTA, escala: esc, alinhar: "centro", alpha: dt > dur - 4 ? (dur - dt) / 4 : 1 });
  }
};
const d20Icone = (ui: Ctx, x: number, y: number, v: number) => {
  desenharD20(ui, Math.round(x), Math.round(y), 20, 6 + (Math.floor(v / 30) % 2), DOURADO, (n, xx, yy) => texto(ui, n, xx, yy, { fonte: "p", cor: TINTA, alinhar: "centro" }));
};

// ───────────── "[NOME] CAIU!" ─────────────
const bannersCaiu = (ui: Ctx, r: Roteiro, v: number) => {
  const d = deriv(r);
  let pilha = 0;
  for (const m of d.mortesV) {
    const dt = v - (m.v + 8);
    if (dt < 0 || dt > 46) continue;
    if (v >= V.vitoria) continue;
    const l = r.lutadores[m.id];
    const txt = `${l.nome.toUpperCase()} CAIU!`;
    const escB = larguraTexto(txt, "g", 2) + 30 > W - 40 ? 1 : 2;
    const w = larguraTexto(txt, "g", escB) + 30;
    const entra = dt < 6 ? (1 - dt / 6) * -w : dt > 40 ? ((dt - 40) / 6) * (W + 20) : 0;
    const x = Math.round(W / 2 - w / 2 + entra);
    const y = 478 - pilha * 24;
    caixa(ui, x, y, w, 22, "#5a1a22", "#e8c060", 2);
    brilhoCaixa(ui, x, y, w);
    ui.drawImage(mini(l, "derrota", true), x + 4, y + 3);
    linhaPx(ui, x + 6, y + 5, x + 17, y + 16, "#e03a3a");
    linhaPx(ui, x + 17, y + 5, x + 6, y + 16, "#e03a3a");
    texto(ui, txt, x + 24, y + (escB === 2 ? 5 : 8), { cor: "#ffffff", contorno: TINTA, escala: escB });
    pilha++;
  }
};

// ───────────── "CHEFE DERROTADO!" ─────────────
const bannerChefe = (ui: Ctx, r: Roteiro, s: number) => {
  const g = r.golpes.find((x) => x.chefeDerrotado);
  if (!g) return;
  const t = s - g.tImp - 2;
  if (t < 0 || t > 50) return;
  const chefe = r.lutadores.find((l) => l.boss)!;
  const k = ease(t / 6) * (t > 44 ? (50 - t) / 6 : 1);
  const w = 280,
    y = 236;
  caixa(ui, W / 2 - (w / 2) * k, y, w * k, 44, "#3a1e2a", "#e8c060", 2);
  if (k > 0.95) {
    brilhoCaixa(ui, W / 2 - w / 2, y, w);
    ui.drawImage(retrato(chefe, "derrota"), 0, 8, 96, 48, W / 2 - w / 2 + 4, y + 4, 48, 24);
    if (Math.floor(t / 4) % 4 !== 3) texto(ui, "CHEFE DERROTADO!", W / 2 + 22, y + 7, { cor: DOURADO, contorno: TINTA, escala: 2, alinhar: "centro" });
    texto(ui, `${r.lutadores[g.ator].nome.toUpperCase()} DERRUBOU O ${chefe.nome.toUpperCase()}`, W / 2, y + 31, { cor: "#ffffff", contorno: TINTA, alinhar: "centro" });
  }
};

// ───────────── cut-in de golpe especial ─────────────
const linhasVelocidade = (ui: Ctx, y0: number, y1: number, t: number, cor: string) => {
  for (let i = 0; i < 26; i++) {
    const y = y0 + hash3(i, 81) * (y1 - y0);
    const L = 20 + hash3(i, 82) * 60;
    const x = ((hash3(i, 83) * (W + 100) - t * 26 * (1 + hash3(i, 84))) % (W + 100) + W + 100) % (W + 100) - 50;
    ui.fillStyle = cor;
    ui.fillRect(Math.round(x), Math.round(y), Math.round(L), 1);
  }
};
const cutin = (ui: Ctx, r: Roteiro, g: Golpe, k: number) => {
  const l = r.lutadores[g.ator];
  const entra = k < 4 ? (1 - k / 4) * -W : k > 14 ? ((k - 14) / 4) * W : 0;
  ui.fillStyle = `rgba(0,0,0,${0.45 * (k < 3 ? k / 3 : k > 15 ? (18 - k) / 3 : 1)})`;
  ui.fillRect(0, 0, W, H);
  ui.save();
  ui.translate(Math.round(entra), 0);
  // faixa diagonal
  const y0 = 236,
    y1 = 412;
  ui.fillStyle = TINTA;
  ui.beginPath();
  ui.moveTo(-40, y0 + 30);
  ui.lineTo(W + 40, y0 - 10);
  ui.lineTo(W + 40, y1 - 30);
  ui.lineTo(-40, y1 + 10);
  ui.closePath();
  ui.fill();
  ui.fillStyle = g.cor;
  ui.beginPath();
  ui.moveTo(-40, y0 + 34);
  ui.lineTo(W + 40, y0 - 6);
  ui.lineTo(W + 40, y1 - 34);
  ui.lineTo(-40, y1 + 6);
  ui.closePath();
  ui.fill();
  ui.fillStyle = "rgba(10,8,16,0.55)";
  ui.beginPath();
  ui.moveTo(-40, y0 + 38);
  ui.lineTo(W + 40, y0 - 2);
  ui.lineTo(W + 40, y1 - 38);
  ui.lineTo(-40, y1 + 2);
  ui.closePath();
  ui.fill();
  linhasVelocidade(ui, y0 + 10, y1 - 10, k, "rgba(255,255,255,0.55)");
  // rosto em close (retrato 96×64 ampliado 2×)
  const rt = retrato(l, "grito");
  ui.drawImage(rt, 14, 262, 192, 128);
  // textos
  const x = 212;
  texto(ui, l.nome.toUpperCase(), x, 270, { cor: "#ffffff", contorno: TINTA });
  const nome = golpeTxt(r, g);
  const linhasN = quebrar(nome, 130, "g", 1);
  linhasN.forEach((ln, i) => texto(ui, ln, x, 284 + i * 10, { cor: DOURADO, contorno: TINTA }));
  const crit = g.resultados.some((x2) => x2.r === "critico");
  const rol = g.rolagem || (g.d20 ? `d20 = ${g.d20.v}` : "");
  const [a, b] = rol.split(" = ");
  const yR = 290 + linhasN.length * 10;
  texto(ui, a ?? "", x, yR, { cor: "#ffffff", contorno: TINTA, escala: 2 });
  if (b) texto(ui, `= ${b}`, x, yR + 18, { cor: crit ? "#ff6a4a" : DOURADO, contorno: TINTA, escala: 2 });
  if (crit) texto(ui, "CRÍTICO!", x, yR + 40, { cor: DOURADO, contorno: TINTA, escala: 2 });
  else if (g.resultados.some((x2) => x2.morreu)) texto(ui, "GOLPE FINAL!", x, yR + 40, { cor: "#ff9a6a", contorno: TINTA });
  ui.restore();
  if (k >= 2 && k < 4) {
    ui.fillStyle = "rgba(255,255,255,0.5)";
    ui.fillRect(0, 0, W, H);
  }
};

// ───────────── VS do duelo final ─────────────
const telaVs = (ui: Ctx, r: Roteiro, k: number, estados: EstadoL[]) => {
  const [ia, ib] = r.finalistas;
  if (ib === undefined) return;
  const fade = k < 4 ? k / 4 : k > DUR_VS - 5 ? (DUR_VS - k) / 5 : 1;
  ui.fillStyle = `rgba(6,4,10,${0.82 * fade})`;
  ui.fillRect(0, 0, W, H);
  const ficha = (i: number, y: number, lado: number) => {
    const l = r.lutadores[i];
    const e = estados[i];
    const desliza = k < 8 ? (1 - ease(k / 8)) * W * lado : 0;
    ui.save();
    ui.translate(Math.round(desliza), 0);
    const y0 = y,
      y1 = y + 132;
    ui.fillStyle = corDe(l);
    ui.beginPath();
    ui.moveTo(0, y0 + (lado < 0 ? 16 : 0));
    ui.lineTo(W, y0 + (lado < 0 ? 0 : 16));
    ui.lineTo(W, y1 - (lado < 0 ? 16 : 0));
    ui.lineTo(0, y1 - (lado < 0 ? 0 : 16));
    ui.closePath();
    ui.fill();
    ui.fillStyle = "rgba(10,8,16,0.6)";
    ui.fillRect(0, y0 + 18, W, y1 - y0 - 36);
    linhasVelocidade(ui, y0 + 20, y1 - 20, k + i * 7, "rgba(255,255,255,0.35)");
    const rt = retrato(l, "grito");
    const px0 = lado < 0 ? 24 : W - 24 - 192;
    if (lado > 0) {
      ui.save();
      ui.translate(px0 + 192, y0 + 4);
      ui.scale(-1, 1);
      ui.drawImage(rt, 0, 0, 192, 128);
      ui.restore();
    } else ui.drawImage(rt, px0, y0 + 4, 192, 128);
    const tx = lado < 0 ? 222 : 32;
    const [prim, ...resto] = l.nome.toUpperCase().split(" ");
    texto(ui, prim, tx, y0 + 26, { cor: "#ffffff", contorno: TINTA, escala: 2 });
    if (resto.length) texto(ui, resto.join(" "), tx, y0 + 43, { cor: "#ffffff", contorno: TINTA });
    const nvAgora = valorEm(r.niveis[i], r.sDuelo)?.nivel ?? l.nivel;
    texto(ui, l.boss ? "CHEFE" : `${classeTxt(l)} NV${nvAgora}`, tx, y0 + 54, { cor: l.boss ? VERMELHO : DOURADO, contorno: TINTA });
    texto(ui, l.boss ? "CRIATURA LENDÁRIA" : ESPECIES[l.especie].nome.toUpperCase(), tx, y0 + 65, { cor: "#c8c0b8", contorno: TINTA });
    texto(ui, `PV ${e.pv}/${e.pvMax}`, tx, y0 + 78, { cor: "#6aff7a", contorno: TINTA });
    texto(ui, `CA ${l.ca}`, tx, y0 + 90, { cor: "#9ad8ff", contorno: TINTA });
    texto(ui, `ABATES ${r.sim.stats[i].abates}`, tx, y0 + 102, { cor: "#ff9a6a", contorno: TINTA });
    itensEm(r, i, r.sDuelo).forEach((it, j) => desenharIcone(ui, it, tx + j * 17, y0 + 112));
    ui.restore();
  };
  ficha(ia, 188, -1);
  ficha(ib, 360, 1);
  if (k >= 6) {
    const esc = k < 9 ? 9 - (k - 6) : 6;
    texto(ui, "VS", W / 2, 334 - esc * 3.5, { cor: DOURADO, contorno: TINTA, escala: esc, alinhar: "centro" });
  }
  texto(ui, "DUELO FINAL", W / 2, 500, { cor: "#ffffff", contorno: TINTA, escala: 2, alinhar: "centro", alpha: fade });
  if (k >= 6 && k < 8) {
    ui.fillStyle = "rgba(255,255,255,0.6)";
    ui.fillRect(0, 0, W, H);
  }
};

// ───────────── vitória ─────────────
const vitoria = (ui: Ctx, r: Roteiro, t: number) => {
  const l = r.lutadores[r.vencedor];
  const txt = l.boss ? `O ${l.nome.toUpperCase()} VENCEU!` : `VITÓRIA DE ${l.nome.toUpperCase()}!`;
  const esc = larguraTexto(txt, "g", 2) + 24 > W - 64 ? 1 : 2;
  const w = larguraTexto(txt, "g", esc) + 24;
  const k = ease(t / 10);
  const y = 176;
  caixa(ui, W / 2 - (w / 2) * k, y, w * k, esc === 2 ? 26 : 18, "#3a1e2a", "#e8c060", 2);
  if (k > 0.95) texto(ui, txt, W / 2, y + 6, { cor: DOURADO, contorno: TINTA, escala: esc, alinhar: "centro" });
  if (t >= 12) {
    const k2 = ease((t - 12) / 10);
    const ry = 210 + (1 - k2) * 30;
    ui.globalAlpha = k2;
    caixa(ui, W / 2 - 100, ry, 200, 136, "#2a1e2e", "#e8c060", 2);
    ui.drawImage(retrato(l, "vitoria"), W / 2 - 96, ry + 4, 192, 128);
    ui.globalAlpha = 1;
  }
  if (l.boss && t >= 38 && Math.floor(t / 5) % 3 !== 2) texto(ui, "NENHUM HERÓI SOBREVIVEU", W / 2, 474, { cor: VERMELHO, contorno: TINTA, escala: 2, alinhar: "centro" });
  if (!l.boss && t >= 38 && Math.floor(t / 5) % 3 !== 2) {
    texto(ui, r.ep.textos.subiu, W / 2, 474, { cor: DOURADO, contorno: TINTA, escala: 2, alinhar: "centro" });
    texto(ui, `NÍVEL ${r.subida.de} → ${r.subida.para}`, W / 2, 494, { cor: "#ffffff", contorno: TINTA, alinhar: "centro" });
  }
};

// ───────────── pergaminho do campeão ─────────────
const TINTA_P = "#3a2418";
const VERDE = "#2e8a2e";
let papelC: HTMLCanvasElement | null = null;
const papel = () => {
  if (papelC) return papelC;
  const w = 300,
    h = 440;
  papelC = novoCanvas(w, h);
  const c = papelC.getContext("2d")!;
  const img = c.createImageData(w, h);
  const base = [232, 212, 164];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = hash3(x, y, 91);
      const manchas = hash3(Math.floor(x / 9), Math.floor(y / 9), 92) * 0.08;
      // bordas queimadas e irregulares
      const borda = Math.min(x, w - 1 - x, y, h - 1 - y);
      const irreg = 3 + hash3(Math.floor(x / 3), Math.floor(y / 3), 93) * 5;
      let k = 1 - manchas - (n < 0.1 ? 0.04 : 0);
      if (borda < irreg) k *= 0.55 + (borda / irreg) * 0.3;
      if (borda < irreg * 0.45) {
        img.data[i + 3] = hash3(x, y, 94) < 0.5 ? 0 : 255;
        img.data[i] = 60;
        img.data[i + 1] = 34;
        img.data[i + 2] = 20;
        continue;
      }
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k * 0.96;
      img.data[i + 3] = 255;
    }
  c.putImageData(img, 0, 0);
  return papelC;
};
const rolo = (ui: Ctx, y: number) => {
  ui.fillStyle = TINTA;
  ui.fillRect(22, y - 5, W - 44, 11);
  ui.fillStyle = "#8a5a32";
  ui.fillRect(24, y - 4, W - 48, 9);
  ui.fillStyle = "#b07a46";
  ui.fillRect(24, y - 3, W - 48, 2);
  ui.fillStyle = "#5a3a22";
  ui.fillRect(24, y + 3, W - 48, 2);
  for (const x of [18, W - 26]) {
    ui.fillStyle = TINTA;
    ui.fillRect(x, y - 6, 8, 13);
    ui.fillStyle = "#c8a03a";
    ui.fillRect(x + 1, y - 5, 6, 11);
    ui.fillStyle = "#fff0a0";
    ui.fillRect(x + 2, y - 4, 1, 8);
  }
};
const selo = (ui: Ctx, x: number, y: number) => {
  for (let dy = -9; dy <= 9; dy++)
    for (let dx = -9; dx <= 9; dx++) {
      const d = Math.hypot(dx, dy) + hash3(dx, dy, 7) * 1.2;
      if (d > 9.5) continue;
      ui.fillStyle = d > 8 ? "#5a0e16" : d > 6.5 ? "#9a1e28" : "#b82a34";
      ui.fillRect(x + dx, y + dy, 1, 1);
    }
  desenharD20(ui, x, y, 20, 6, "#d8404a", (n, xx, yy) => texto(ui, n, xx, yy, { fonte: "p", cor: "#ffd0d0", alinhar: "centro" }));
};
const fita = (ui: Ctx, x: number, y: number, h: number) => {
  ui.fillStyle = TINTA;
  ui.fillRect(x - 1, y, 9, h + 1);
  ui.fillStyle = "#b82a34";
  ui.fillRect(x, y, 7, h);
  ui.fillStyle = "#e05a5a";
  ui.fillRect(x + 1, y, 1, h);
  ui.fillStyle = TINTA;
  ui.fillRect(x, y + h - 3, 3, 4);
  ui.fillRect(x + 4, y + h - 3, 3, 4);
};

const pergaminho = (ui: Ctx, r: Roteiro, v: number) => {
  const l = r.lutadores[r.vencedor];
  const sub = r.subida;
  const t = v - r.fases.pergaminho;
  // escurece o fundo
  ui.fillStyle = `rgba(6,4,10,${0.7 * clamp((t + 4) / 8, 0, 1) * (v > V.cta ? clamp(1 - (v - V.cta) / 20, 0, 1) : 1)})`;
  ui.fillRect(0, 0, W, H);
  const topo = 82;
  const fundoMax = 522;
  let abre = ease(t / 30);
  if (v > V.cta) abre = 1 - ease((v - V.cta) / 20);
  const baixo = topo + (fundoMax - topo) * abre;
  // papel revelado
  ui.save();
  ui.beginPath();
  ui.rect(0, topo, W, Math.max(0, baixo - topo));
  ui.clip();
  ui.drawImage(papel(), 30, topo);
  fita(ui, 40, topo + 2, 46);
  fita(ui, 50, topo + 2, 38);
  if (t > 30) {
    const itens = r.pergaminho;
    const vis = (i: (typeof itens)[number]) => v >= i.v;
    const brilho = (i: (typeof itens)[number]) => v - i.v < 6;
    // topo: retrato, nome, espécie/classe, nível
    const tit = itens.find((i) => i.tipo === "titulo")!;
    if (vis(tit)) {
      caixa(ui, 38, 92, 100, 68, "#c8b080", TINTA_P, 2);
      ui.drawImage(retrato(l, "vitoria"), 40, 94);
      const esc = larguraTexto(l.nome.toUpperCase(), "g", 2) > 180 ? 1 : 2;
      texto(ui, l.nome.toUpperCase(), 146, 98, { cor: TINTA_P, escala: esc });
      if (l.boss) {
        texto(ui, "CHEFE · CRIATURA LENDÁRIA", 146, 118, { cor: "#8a1e1e" });
        texto(ui, "INVICTO NA ARENA", 146, 134, { cor: TINTA_P });
        texto(ui, CHEFES[l.boss].fonte.toUpperCase(), 146, 148, { cor: "#6a4428", fonte: "p" });
      } else {
        texto(ui, `${ESPECIES[l.especie].nome.toUpperCase()} · ${CLASSES[l.classe].nome.toUpperCase()}`, 146, 118, { cor: "#6a4428" });
        texto(ui, `NÍVEL ${sub.de} →`, 146, 134, { cor: TINTA_P });
        const pisca = Math.floor(v / 6) % 2 === 0;
        texto(ui, String(sub.para), 146 + larguraTexto(`NÍVEL ${sub.de} →`) + 6, 130, { cor: pisca ? "#d8a020" : "#a87010", contorno: pisca ? "#fff2b0" : "", escala: 2 });
        texto(ui, `VITÓRIAS ${sub.ficha.vitorias}`, 146, 148, { cor: "#6a4428", fonte: "p" });
      }
      if (l.autor) texto(ui, `CRIADO POR ${l.autor}`, 146, 156, { cor: "#6a4428", fonte: "p" });
    }
    ui.fillStyle = "#a88a5a";
    ui.fillRect(40, 166, W - 80, 1);
    // atributos (2 linhas × 3)
    const ats = itens.filter((i) => i.tipo === "atributo");
    ats.forEach((it, k) => {
      if (!vis(it)) return;
      const x = 42 + (k % 3) * 94,
        y = 172 + Math.floor(k / 3) * 12;
      texto(ui, it.texto, x, y, { cor: TINTA_P });
      if (it.extra) texto(ui, it.extra, x + larguraTexto(it.texto) + 4, y, { cor: VERDE, contorno: brilho(it) ? "#c8ffb0" : "" });
    });
    ui.fillStyle = "#a88a5a";
    ui.fillRect(40, 198, W - 80, 1);
    // combate: PV numa linha própria (com o dado girando), o resto em duas colunas
    const cbs = itens.filter((i) => i.tipo === "combate");
    cbs.forEach((it, k) => {
      if (!vis(it)) return;
      const x = k === 0 ? 42 : 42 + ((k - 1) % 2) * 140,
        y = k === 0 ? 204 : 218 + Math.floor((k - 1) / 2) * 12;
      texto(ui, it.texto, x, y, { cor: TINTA_P });
      let xx = x + larguraTexto(it.texto) + 4;
      if (k === 0 && it.desc) {
        const dt = v - it.v;
        desenharD20(ui, xx + 8, y + 3, sub.rolagem, dt < 14 ? Math.floor(dt / 2.4) : 6, "#5ac85a", (n, a, b) => texto(ui, n, a, b, { fonte: "p", cor: "#fff", contorno: TINTA, alinhar: "centro" }));
        xx += 20;
        if (dt >= 14 && it.extra) {
          texto(ui, it.extra, xx, y, { cor: VERDE, contorno: dt < 20 ? "#c8ffb0" : "" });
          texto(ui, `(${it.desc})`.toUpperCase(), xx + larguraTexto(it.extra) + 6, y + 1, { cor: "#6a4428", fonte: "p" });
        }
      } else if (it.extra) texto(ui, it.extra, xx, y, { cor: VERDE, contorno: brilho(it) ? "#c8ffb0" : "" });
    });
    const yPod0 = 218 + Math.ceil((cbs.length - 1) / 2) * 12 + 6;
    ui.fillStyle = "#a88a5a";
    ui.fillRect(40, yPod0 - 2, W - 80, 1);
    // poderes: antigos em duas colunas, os novos por último em verde com NOVO!
    const pods = itens.filter((i) => i.tipo === "poder");
    const antigos = pods.filter((p) => !p.novo);
    const novos = pods.filter((p) => p.novo);
    texto(ui, "PODERES", 42, yPod0 + 2, { cor: "#6a4428", fonte: "p" });
    antigos.forEach((it, k) => {
      if (!vis(it)) return;
      const x = 42 + (k % 2) * 140,
        y = yPod0 + 10 + Math.floor(k / 2) * 10;
      const nome = it.texto.toUpperCase();
      texto(ui, larguraTexto(nome) > 136 ? nome.slice(0, 21) + "." : nome, x, y, { cor: TINTA_P });
    });
    let y = yPod0 + 12 + Math.ceil(antigos.length / 2) * 10;
    novos.forEach((it) => {
      if (!vis(it)) return;
      const nb = brilho(it);
      texto(ui, "NOVO!", 42, y, { cor: "#ffffff", contorno: VERDE });
      texto(ui, it.texto.toUpperCase(), 80, y, { cor: VERDE, contorno: nb ? "#c8ffb0" : "" });
      quebrar(`- ${it.desc ?? ""}`.toUpperCase(), 236, "p").forEach((ln, i) => texto(ui, ln, 80, y + 9 + i * 7, { cor: "#3a6a2a", fonte: "p" }));
      y += 18 + (quebrar(`- ${it.desc ?? ""}`.toUpperCase(), 236, "p").length - 1) * 7;
    });
    // itens mágicos: ícones lado a lado; o do baú com NOVO! e o poder
    const its = itens.filter((i) => i.tipo === "item");
    if (its.some(vis)) {
      texto(ui, "ITENS", 42, y + 2, { cor: "#6a4428", fonte: "p" });
      its.forEach((it, j) => vis(it) && desenharIcone(ui, it.texto as ItemId, 70 + j * 18, y - 2));
      y += 18;
      const novo = its.find((i) => i.novo && vis(i));
      if (novo) {
        const item = ITENS[novo.texto as ItemId];
        texto(ui, "NOVO!", 42, y, { cor: "#ffffff", contorno: VERDE });
        texto(ui, item.nome.toUpperCase(), 80, y, { cor: VERDE, contorno: brilho(novo) ? "#c8ffb0" : "" });
        const lns = quebrar(`- ${item.poder}`.toUpperCase(), 236, "p");
        lns.forEach((ln, k2) => texto(ui, ln, 80, y + 9 + k2 * 7, { cor: "#3a6a2a", fonte: "p" }));
        y += 18 + (lns.length - 1) * 7;
      }
    }
    // história letra por letra
    const hist = itens.find((i) => i.tipo === "historia")!;
    if (vis(hist)) {
      ui.fillStyle = "#a88a5a";
      ui.fillRect(40, y, W - 80, 1);
      const nLetras = Math.floor((v - hist.v) * r.fases.digitacao);
      const linhas = quebrar(r.historia.toUpperCase(), W - 84, "g");
      let resta = nLetras;
      linhas.forEach((ln, i) => {
        if (resta <= 0) return;
        texto(ui, ln.slice(0, resta), 42, y + 6 + i * 10, { cor: TINTA_P });
        resta -= ln.length + 1;
      });
      y += 8 + linhas.length * 10;
      if (resta > 0) {
        texto(ui, l.boss ? "A ARENA ESPERA UM NOVO CAMPEÃO" : r.ep.textos.defende, W / 2, Math.min(y + 4, 482), { cor: "#8a1e1e", alinhar: "centro" });
        if (l.autor) texto(ui, `CRIADO POR ${l.autor}`, W / 2, Math.min(y + 16, 494), { cor: "#6a4428", alinhar: "centro", fonte: "p" });
      }
    }
  }
  ui.restore();
  rolo(ui, topo);
  rolo(ui, baixo);
  if (abre > 0.98) selo(ui, W / 2, baixo - 14);
};

// ───────────── CTA ─────────────
const cta = (ui: Ctx, r: Roteiro, t: number) => {
  const a = clamp((t - 14) / 8, 0, 1);
  if (a <= 0) return;
  ui.fillStyle = `rgba(8,6,14,${0.86 * a})`;
  ui.fillRect(0, 0, W, H);
  ui.globalAlpha = a;
  const l = r.lutadores[r.vencedor];
  const sp = quadro(l, { anim: "vitoria", q: Math.floor(t / 6) % 4, dir: "S", expr: "vitoria", rasgado: false });
  if (l.boss) ui.drawImage(quadroChefe(l.boss, "vitoria", Math.floor(t / 6) % 4, "E"), W / 2 - 112, 248 - 212, 224, 224);
  else {
    ui.drawImage(sp, W / 2 - 48, 120, 96, 128);
    coroa(ui, W / 2, 120 + (alturaCabeca(l) - 14) * 2);
  }
  const partes = r.ep.textos.cta.split(" · ");
  const linhas: { t: string; dourado: boolean }[] = [];
  partes.forEach((pt, k) => quebrar(pt, W - 72, "g", 2).forEach((t) => linhas.push({ t, dourado: k === partes.length - 1 && partes.length > 1 })));
  linhas.forEach((ln, i) => texto(ui, ln.t, W / 2, 268 + i * 20, { cor: ln.dourado ? DOURADO : "#ffffff", contorno: TINTA, escala: 2, alinhar: "centro" }));
  const yb = 268 + linhas.length * 20 + 18;
  d20Icone(ui, W / 2, yb + 10, t * 3);
  texto(ui, r.ep.perfil, W / 2, yb + 30, { cor: "#ffffff", contorno: TINTA, escala: 2, alinhar: "centro" });
  ui.globalAlpha = 1;
};

export const _interno = { estado, golpeTxt } as { estado: typeof estado; golpeTxt: typeof golpeTxt };
export type { Lutador, OpTexto };

// itens que o lutador `i` carrega no instante de cena `s` (os do início + os que pegou de quem derrubou)
const itensEm = (r: Roteiro, i: number, s: number): ItemId[] => {
  const l = r.lutadores[i];
  let lista: ItemId[] = [...(l.itens ?? [])];
  for (const g of r.golpes) {
    if (g.tImp > s) continue;
    if (g.resultados.some((x) => x.alvo === i && x.morreu)) lista = [];
    if (g.itensPegos?.id === i) lista = [...lista, ...g.itensPegos.itens];
  }
  return lista;
};

// ───────────── cena do baú (episódios 5, 10, 15…) ─────────────
const desenharBau = (ui: Ctx, cx: number, cy: number, abre: number, esc: number) => {
  // baú 22×16 com tampa que abre (abre 0..1), madeira, faixas e fecho dourados
  const P = (x: number, y: number, w: number, h: number, cor: string) => {
    ui.fillStyle = cor;
    ui.fillRect(Math.round(cx + x * esc), Math.round(cy + y * esc), Math.round(w * esc), Math.round(h * esc));
  };
  P(-12, -1, 24, 11, TINTA);
  P(-11, 0, 22, 9, "#8a5a32");
  P(-11, 0, 22, 2, "#a8743e");
  P(-11, 7, 22, 2, "#6a4426");
  for (const x of [-11, -4, 3]) P(x, 0, 1, 9, "#5a3a22");
  P(-9, 0, 2, 9, "#c8a03a");
  P(7, 0, 2, 9, "#c8a03a");
  // tampa: fechada (por cima) ou aberta (para trás)
  const h = Math.round(6 * (1 - abre));
  if (abre < 0.5) {
    P(-12, -1 - h - 1, 24, h + 2, TINTA);
    P(-11, -1 - h, 22, h, "#a8743e");
    P(-11, -1 - h, 22, 1, "#c8905a");
    P(-9, -1 - h, 2, h, "#e8c040");
    P(7, -1 - h, 2, h, "#e8c040");
    P(-2, -2, 4, 3, "#e8c040");
    P(-1, -1, 2, 1, TINTA);
  } else {
    P(-12, -9, 24, 8, TINTA);
    P(-11, -8, 22, 6, "#6a4426");
    P(-11, -8, 22, 1, "#8a5a32");
    P(-9, -8, 2, 6, "#c8a03a");
    P(7, -8, 2, 6, "#c8a03a");
    P(-10, -1, 20, 2, "#2a1a10"); // interior escuro
  }
};
const cenaBau = (ui: Ctx, r: Roteiro, t: number) => {
  const l = r.lutadores[r.vencedor];
  const fade = clamp(t / 8, 0, 1) * (t > BAU_DUR - 4 ? clamp((BAU_DUR + 4 - t) / 8, 0, 1) : 1);
  ui.fillStyle = `rgba(6,4,10,${0.93 * fade})`;
  ui.fillRect(0, 0, W, H);
  ui.globalAlpha = fade;
  texto(ui, "BAÚ DO CAMPEÃO", W / 2, 96, { cor: DOURADO, contorno: TINTA, escala: 2, alinhar: "centro" });
  texto(ui, `EPISÓDIO ${r.ep.numero}`, W / 2, 116, { cor: "#c8c0b8", contorno: TINTA, alinhar: "centro" });
  // o campeão (2×) ao lado do baú
  const sp = quadro(l, { anim: t < 34 ? "andar" : t < 50 ? "ataque" : "vitoria", q: t < 34 ? Math.floor(t / 3) % 6 : t < 50 ? Math.min(3, Math.floor((t - 34) / 4)) : Math.floor(t / 6) % 4, dir: t < 50 ? "E" : "S", expr: t < 46 ? "foco" : "vitoria", rasgado: false });
  const px = 64 + Math.min(34, t) * 1.2;
  ui.drawImage(sp, Math.round(px - 48), 300, 96, 128);
  {
    // baú: cai e quica, treme, abre
    const cy = t < 10 ? 300 + (t / 10) ** 2 * 100 : t < 16 ? 400 - Math.sin(((t - 10) / 6) * Math.PI) * 8 : 400;
    const treme = t >= 30 && t < 40 ? Math.round(Math.sin(t * 2.5) * 2) : 0;
    const abre = clamp((t - 40) / 6, 0, 1);
    // raios de luz saindo do baú
    if (abre > 0) {
      ui.save();
      ui.globalCompositeOperation = "lighter";
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + (k - 4) * 0.22 + Math.sin(t * 0.05 + k) * 0.03;
        const L = 70 + (k % 3) * 20;
        ui.strokeStyle = `rgba(255,220,120,${0.22 * abre})`;
        ui.lineWidth = 4;
        ui.beginPath();
        ui.moveTo(232, cy - 2);
        ui.lineTo(232 + Math.cos(a) * L, cy - 2 + Math.sin(a) * L);
        ui.stroke();
      }
      ui.restore();
    }
    desenharBau(ui, 232 + treme, cy, abre, 3);
    // item sobe do baú
    if (r.itemBau && t >= 46) {
      const k = clamp((t - 46) / 16, 0, 1);
      const iy = cy - 20 - ease(k) * 90;
      const flut = Math.round(Math.sin(t * 0.15) * 2);
      ui.save();
      ui.globalCompositeOperation = "lighter";
      ui.fillStyle = `rgba(255,230,140,${0.35 * k})`;
      ui.beginPath();
      ui.arc(232, iy + 24 + flut, 30, 0, Math.PI * 2);
      ui.fill();
      ui.restore();
      desenharIcone(ui, r.itemBau, 232 - 24, Math.round(iy + flut), 3);
      // brilhinhos
      for (let j = 0; j < 8; j++) {
        const a = t * 0.1 + j * 0.8;
        ui.fillStyle = j % 2 ? "#fff2a0" : "#ffffff";
        ui.fillRect(Math.round(232 + Math.cos(a) * 36), Math.round(iy + 24 + Math.sin(a) * 28), 1, 1);
      }
    }
    // painel com o nome e o poder do item
    if (t >= 60) {
      const k = ease((t - 60) / 10);
      const item = r.itemBau ? ITENS[r.itemBau] : null;
      ui.globalAlpha = fade * k;
      caixa(ui, 40, 448, W - 80, 64, "#2a1e2e", "#e8c060", 2);
      if (item) {
        texto(ui, "ITEM ENCONTRADO!", W / 2, 454, { cor: DOURADO, contorno: TINTA, alinhar: "centro" });
        texto(ui, item.nome.toUpperCase(), W / 2, 466, { cor: item.cor, contorno: TINTA, alinhar: "centro" });
        quebrar(item.poder.toUpperCase(), W - 100, "p").forEach((ln, j) => texto(ui, ln, W / 2, 480 + j * 7, { cor: "#ffffff", fonte: "p", alinhar: "centro" }));
      } else {
        texto(ui, "O BAÚ ESTÁ VAZIO...", W / 2, 466, { cor: "#c8c0b8", contorno: TINTA, alinhar: "centro" });
        texto(ui, "JÁ TEM TODOS OS ITENS!", W / 2, 480, { cor: DOURADO, contorno: TINTA, alinhar: "centro", fonte: "p" });
      }
    }
  }
  ui.globalAlpha = 1;
};
const BAU_DUR = 120;

