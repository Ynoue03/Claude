// Desenha um quadro da batalha a partir do resultado da simulação.
// Determinístico: o quadro N sempre sai igual (requisito do Remotion).
import type { Ev, Resultado } from "../motor/batalha";
import { chegadas, INTRO, RAIO_ARENA } from "../motor/batalha";
import { CLASSES, ESPECIES } from "../motor/srd";
import { criarRng } from "../motor/dados";
import { animarCenario, corClasse, desenharFundo, paraTela, TELA_H, TELA_W, PX_POR_PE } from "../pixel/cenario";
import { CENTRO_X, CHAO, Grade, MAO, montarArma, montarSprite, Pose } from "../pixel/sprites";
import { larguraTexto, texto, textoCentro } from "../pixel/fonte";
import { misturar, tom } from "../pixel/cor";

type Ctx = CanvasRenderingContext2D;
type EvK<K extends Ev["k"]> = Extract<Ev, { k: K }>;

export const OUTRO = 180; // quadros depois do último golpe (igual a scripts/constantes.ts)

const novaTela = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
};

const gradeParaTela = (g: Grade) => {
  const h = g.length, w = g[0].length;
  const { c, ctx } = novaTela(w, h);
  g.forEach((l, y) => l.forEach((cor, x) => { if (cor) { ctx.fillStyle = cor; ctx.fillRect(x, y, 1, 1); } }));
  return c;
};

type Recursos = {
  poses: Record<Pose, HTMLCanvasElement>;
  arma: { c: HTMLCanvasElement; pega: [number, number]; chave: string };
  pequeno: boolean;
};

export class Cena {
  r: Resultado;
  fundo: HTMLCanvasElement;
  mundo = novaTela(TELA_W, TELA_H);
  comp = novaTela(TELA_W, TELA_H);
  rec: Recursos[] = [];
  porId: Record<number, { movs: EvK<"mov">[]; pvs: EvK<"pv">[]; anims: EvK<"anim">[]; morte?: number; status: EvK<"status">[]; auras: EvK<"aura">[]; dados: EvK<"dado">[]; numeros: EvK<"numero">[]; rotulos: EvK<"rotulo">[] }> = {};
  turnos: EvK<"turno">[] = [];
  fx: EvK<"fx">[] = [];
  banners: EvK<"banner">[] = [];
  tremores: EvK<"tremor">[] = [];
  chegada: Record<number, number> = {};
  janelas: Record<number, [number, number][]> = {}; // momentos em que o personagem fica na posição exata
  duracao: number;
  titulo: string;
  perfil: string;

  constructor(r: Resultado, titulo = "ARENA D20", perfil = "") {
    this.r = r;
    this.titulo = titulo;
    this.perfil = perfil;
    this.duracao = r.fimBatalha + OUTRO;
    const f = novaTela(TELA_W, TELA_H);
    desenharFundo(f.ctx);
    this.fundo = f.c;
    for (const ficha of r.fichas) {
      const poses = {} as Record<Pose, HTMLCanvasElement>;
      for (const p of ["parado", "passoA", "passoB", "golpe", "magia", "dano"] as Pose[]) poses[p] = gradeParaTela(montarSprite(ficha, p));
      const a = montarArma(ficha);
      this.rec[ficha.id] = {
        poses,
        arma: { c: gradeParaTela(a.grade), pega: a.pega, chave: a.chave },
        pequeno: ficha.especie === "halfling" || ficha.especie === "gnomo" || ficha.especie === "anao",
      };
      this.porId[ficha.id] = { movs: [], pvs: [], anims: [], status: [], auras: [], dados: [], numeros: [], rotulos: [] };
    }
    for (const e of r.eventos) {
      const p = "id" in e ? this.porId[e.id] : undefined;
      if (e.k === "mov") p!.movs.push(e);
      else if (e.k === "pv") p!.pvs.push(e);
      else if (e.k === "anim") p!.anims.push(e);
      else if (e.k === "morte") p!.morte = e.t;
      else if (e.k === "status") p!.status.push(e);
      else if (e.k === "aura") p!.auras.push(e);
      else if (e.k === "dado") p!.dados.push(e);
      else if (e.k === "numero") p!.numeros.push(e);
      else if (e.k === "rotulo") p!.rotulos.push(e);
      else if (e.k === "turno") this.turnos.push(e);
      else if (e.k === "fx") this.fx.push(e);
      else if (e.k === "banner") this.banners.push(e);
      else if (e.k === "tremor") this.tremores.push(e);
    }
    // ordem de chegada na intro = ordem na roda
    this.chegada = chegadas(r);
    for (const fi of r.fichas) {
      const p = this.porId[fi.id];
      this.janelas[fi.id] = [
        ...p.movs.map((m) => [m.t0 - 4, m.t1 + 2] as [number, number]),
        ...p.anims.map((a) => [a.t - 8, a.t + 10] as [number, number]),
      ].sort((a, b) => a[0] - b[0]);
    }
  }

  // ---------- estado de um lutador no quadro f ----------
  // Movimento contínuo: enquanto espera a vez, cada personagem fica circulando e trocando de
  // lugar em volta da posição "de regra". Perto de qualquer ação dele (andar no turno, atacar,
  // levar golpe) o desvio vai a zero, então distâncias e acertos seguem o simulador.
  estado(id: number, f: number) {
    const s = this.estadoBase(id, f);
    const off = (q: number) => {
      const e = this.envelope(id, q);
      if (e <= 0) return { x: 0, y: 0 };
      const fase = id * 2.399;
      const A = 11; // pés
      return {
        x: e * A * (Math.sin(q * 0.061 + fase) + 0.45 * Math.sin(q * 0.137 + fase * 3)),
        y: e * A * 0.8 * (Math.cos(q * 0.053 + fase * 1.7) + 0.4 * Math.sin(q * 0.119 + fase)),
      };
    };
    const o0 = off(f), o1 = off(f + 1);
    let x = s.x + o0.x, y = s.y + o0.y;
    const r = Math.hypot(x, y), max = RAIO_ARENA - 1;
    if (r > max) { x = (x / r) * max; y = (y / r) * max; }
    const vx = o1.x - o0.x, vy = o1.y - o0.y;
    const vel = Math.hypot(vx, vy);
    const andando = s.andando || vel > 0.12;
    const dir = !s.anim && !s.andando && Math.abs(vx) > 0.04 ? Math.sign(vx) : s.dir;
    return { ...s, x, y, andando, dir };
  }

  envelope(id: number, f: number) {
    if (f < INTRO + 8 || f > this.r.fimBatalha + 6) return 0;
    const m = this.porId[id].morte;
    if (m !== undefined && f >= m - 12) return 0;
    let d = 99;
    for (const [a, b] of this.janelas[id]) {
      if (a - 12 > f) break;
      if (f >= a && f <= b) return 0;
      d = Math.min(d, f < a ? a - f : f - b);
    }
    const k = Math.min(1, d / 12, (f - INTRO - 8) / 20, (this.r.fimBatalha + 6 - f) / 12);
    return k * k * (3 - 2 * k);
  }

  estadoBase(id: number, f: number) {
    const p = this.porId[id];
    const ini = this.r.posIniciais.find((q) => q.id === id)!;
    let x = ini.x, y = ini.y, andando = false, dir = ini.x < 0 ? 1 : -1, salto = 0;
    for (const m of p.movs) {
      if (m.t0 > f) break;
      if (Math.abs(m.x1 - m.x0) > 0.5) dir = Math.sign(m.x1 - m.x0);
      if (f < m.t1) {
        const k = (f - m.t0) / (m.t1 - m.t0);
        x = m.x0 + (m.x1 - m.x0) * k;
        y = m.y0 + (m.y1 - m.y0) * k;
        andando = true;
        if (m.salto) salto = Math.sin(k * Math.PI) * 6;
      } else {
        x = m.x1;
        y = m.y1;
      }
    }
    let anim: EvK<"anim"> | undefined;
    for (const a of p.anims) {
      if (a.t > f) break;
      const dur = a.tipo === "ataque" ? 12 : a.tipo === "magia" ? 14 : a.tipo === "dano" ? 8 : a.tipo === "esquiva" ? 7 : 12;
      if (f - a.t < dur) anim = a;
      if ((a.tipo === "ataque" || a.tipo === "magia") && a.dx) dir = a.dx;
    }
    // vida (barra anima suavemente)
    const pvMax = this.r.fichas[id].pv;
    let pv = pvMax, pvAntes = pvMax, tPv = -99;
    for (const e of p.pvs) {
      if (e.t > f) break;
      pvAntes = pv;
      pv = e.pv;
      tPv = e.t;
    }
    const k = Math.min(1, (f - tPv) / 8);
    const pvVis = pvAntes + (pv - pvAntes) * k;
    return { x, y, andando, dir, anim, pv, pvVis, pvMax, salto, morte: p.morte, rastro: pvAntes > pv && f - tPv < 20 ? pvAntes : null };
  }

  // ---------- quadro ----------
  desenhar(final: Ctx, f: number) {
    const w = this.mundo.ctx;
    w.imageSmoothingEnabled = false;
    w.drawImage(this.fundo, 0, 0);
    animarCenario(w, f);

    // auras no chão (abaixo dos personagens)
    for (const id of Object.keys(this.porId).map(Number)) {
      for (const a of this.porId[id].auras) if (f >= a.t0 && f < a.t1) this.aura(w, id, a, f);
    }
    // marcas de quem caiu
    for (const fi of this.r.fichas) {
      const m = this.porId[fi.id].morte;
      if (m !== undefined && f > m + 26) {
        const s = this.estado(fi.id, f);
        const p = paraTela(s.x, s.y);
        caveira(w, Math.round(p.x), Math.round(p.y));
      }
    }
    // personagens ordenados pela profundidade (y)
    const vivos = this.r.fichas
      .map((fi) => ({ id: fi.id, s: this.estado(fi.id, f) }))
      .filter(({ id, s }) => f >= this.chegada[id] && (s.morte === undefined || f < s.morte + 26))
      .sort((a, b) => a.s.y - b.s.y);
    for (const { id, s } of vivos) this.personagem(w, id, s, f);

    // efeitos
    for (const e of this.fx) if (f >= e.t && f < e.t + e.dur) this.efeito(w, e, f);

    // barras de vida, status e números por cima do mundo
    for (const { id, s } of vivos) this.barra(w, id, s, f);

    // ---------- câmera (tremor e zoom final) ----------
    const c = this.comp.ctx;
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#2f6fc0";
    c.fillRect(0, 0, TELA_W, TELA_H);
    let ox = 0, oy = 0;
    for (const t of this.tremores) {
      const k = f - t.t;
      if (k >= 0 && k < 10) {
        const rr = criarRng(t.t * 31 + k);
        const forca = t.forca * (1 - k / 10);
        ox += Math.round((rr() - 0.5) * 2 * forca);
        oy += Math.round((rr() - 0.5) * 2 * forca);
      }
    }
    const zoomIni = this.r.fimBatalha + 14;
    const venc = this.estado(this.r.vencedor, f);
    const pv = paraTela(venc.x, venc.y - 6);
    let z = 1;
    if (f > zoomIni) {
      const k = Math.min(1, (f - zoomIni) / 26);
      z = 1 + easeInOut(k);
    }
    if (z > 1) {
      // centraliza no vencedor sem mostrar fora do mapa
      const cx = Math.min(Math.max(pv.x, TELA_W / (2 * z)), TELA_W - TELA_W / (2 * z));
      const cy = Math.min(Math.max(pv.y, TELA_H / (2 * z)), TELA_H - TELA_H / (2 * z));
      const k = z - 1; // 0 → 1 junto com o zoom
      const tx = TELA_W / 2 + (cx - TELA_W / 2) * k, ty = TELA_H / 2 + (cy - TELA_H / 2) * k;
      c.drawImage(this.mundo.c, Math.round(TELA_W / 2 - tx * z), Math.round(TELA_H / 2 - ty * z), Math.round(TELA_W * z), Math.round(TELA_H * z));
    } else c.drawImage(this.mundo.c, ox, oy);

    // ---------- textos sobre o mundo (acompanham a câmera só sem zoom) ----------
    if (z === 1) {
      this.rotulos(c, vivos, f, ox, oy);
      for (const { id, s } of vivos) this.dadosENumeros(c, id, s, f, ox, oy);
      this.indicadorTurno(c, f, ox, oy);
    }
    this.painel(c, f);
    this.faixas(c, f);
    this.intro(c, f);
    this.final(c, f);

    final.imageSmoothingEnabled = false;
    final.drawImage(this.comp.c, 0, 0, final.canvas.width, final.canvas.height);
  }

  // ---------- personagem ----------
  personagem(ctx: Ctx, id: number, s: ReturnType<Cena["estado"]>, f: number) {
    const rec = this.rec[id];
    const p = paraTela(s.x, s.y);
    let X = Math.round(p.x), Y = Math.round(p.y);
    let alpha = 1;
    // queda na intro
    const ch = this.chegada[id];
    let queda = 0;
    if (f < ch + 9) {
      const k = (f - ch) / 9;
      queda = Math.round((1 - easeOutBounce(k)) * -60);
    }
    // sombra
    ctx.fillStyle = "rgba(60,40,20,0.35)";
    const sw = queda < -10 ? 6 : 9;
    for (let i = -sw; i <= sw; i++) ctx.fillRect(X + i, Y - 1, 1, Math.abs(i) < sw - 2 ? 3 : 2);

    let pose: Pose = "parado";
    let dx = 0, dy = 0, ang = 0;
    const bob = Math.floor((f + id * 5) / 14) % 2;
    if (s.andando) pose = Math.floor(f / 4) % 2 ? "passoA" : "passoB";
    else dy = bob;
    const a = s.anim;
    let armaAng = 0.5, armaDy = 0;
    if (a) {
      const k = f - a.t;
      if (a.tipo === "ataque") {
        dx = k >= 2 && k < 7 ? (a.dx ?? 1) * (k < 5 ? 3 : 2) : 0;
        armaAng = k < 3 ? 0.5 - k * 0.45 : k < 7 ? -0.85 + (k - 3) * 0.7 : 1.95 - (k - 7) * 0.29;
      } else if (a.tipo === "magia") {
        armaAng = -0.2;
        armaDy = -3;
        dy = -1;
        // faíscas nas mãos
        const rr = criarRng(id * 1000 + f);
        ctx.fillStyle = corClasse[this.r.fichas[id].classe];
        for (let i = 0; i < 4; i++) ctx.fillRect(X + 6 + Math.round((rr() - 0.5) * 10), Y - 22 + Math.round((rr() - 0.5) * 10), 1, 1);
      } else if (a.tipo === "dano") {
        pose = k < 3 ? "dano" : pose;
        dx = k < 5 ? (a.dx ?? 0) * (k % 2 ? 2 : 1) : 0;
      } else if (a.tipo === "esquiva") {
        dx = (k < 4 ? -2 : -1) * (a.dx ?? 1);
        dy = k < 4 ? -2 : 0;
      }
    }
    if (s.morte !== undefined && f >= s.morte) {
      const k = f - s.morte;
      pose = k < 4 ? "dano" : "parado";
      ang = Math.min(1, k / 8) * (Math.PI / 2) * -s.dir;
      alpha = k < 14 ? 1 : 1 - (k - 14) / 12;
      dy = Math.min(k, 8) * 0.5;
    }
    X += dx;
    Y += dy + queda - Math.round(s.salto);
    const flip = s.dir < 0;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(X, Y);
    if (ang) ctx.rotate(ang);
    if (flip) ctx.scale(-1, 1);
    const ox = -CENTRO_X, oy = -CHAO;
    const desc = rec.pequeno ? 2 : 0;
    ctx.drawImage(rec.poses[pose], ox, oy);
    // arma na mão direita
    if (rec.arma.chave !== "punhos" && (s.morte === undefined || f < s.morte + 4)) {
      ctx.save();
      const hx = ox + MAO[0], hy = oy + MAO[1] + desc + armaDy;
      ctx.translate(hx, hy);
      if (rec.arma.chave === "foco") {
        ctx.translate(2, -6 + (Math.floor(f / 8) % 2));
      } else if (rec.arma.chave === "arco") {
        ctx.rotate(a?.tipo === "ataque" ? 0.15 : 0.05);
      } else ctx.rotate(armaAng);
      ctx.drawImage(rec.arma.c, -rec.arma.pega[0], -rec.arma.pega[1]);
      ctx.restore();
    }
    ctx.restore();
  }

  barra(ctx: Ctx, id: number, s: ReturnType<Cena["estado"]>, f: number) {
    if (s.morte !== undefined && f >= s.morte) return;
    if (f < this.chegada[id] + 9) return;
    const p = paraTela(s.x, s.y);
    const X = Math.round(p.x) - 10, Y = Math.round(p.y) + 3;
    ctx.fillStyle = "#1a1420";
    ctx.fillRect(X - 1, Y - 1, 22, 4);
    ctx.fillStyle = "#4a3a44";
    ctx.fillRect(X, Y, 20, 2);
    if (s.rastro !== null) {
      ctx.fillStyle = "#f4f0e6";
      ctx.fillRect(X, Y, Math.round((20 * s.rastro) / s.pvMax), 2);
    }
    const k = Math.max(0, s.pvVis / s.pvMax);
    ctx.fillStyle = k > 0.5 ? "#5fd17a" : k > 0.25 ? "#f2c94c" : "#e5533d";
    ctx.fillRect(X, Y, Math.round(20 * k), 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(X, Y, Math.round(20 * k), 1);
    // status (MARCA, ATORD)
    let sy = Y + 4;
    for (const st of this.porId[id].status) {
      if (f < st.t0 || f >= st.t1) continue;
      const t = st.texto === "MARCA" ? "MRC" : st.texto === "ATORD" ? "ATD" : st.texto.slice(0, 3);
      const wv = larguraTexto(t) + 4;
      ctx.fillStyle = "#1a1420";
      ctx.fillRect(X + 10 - wv / 2 - 1, sy - 1, wv + 2, 11);
      ctx.fillStyle = tom(st.cor, -1);
      ctx.fillRect(X + 10 - wv / 2, sy, wv, 9);
      texto(ctx, t, X + 10 - wv / 2 + 2, sy + 1, "#ffffff", 1, null);
      sy += 11;
    }
  }

  aura(ctx: Ctx, id: number, a: EvK<"aura">, f: number) {
    const s = this.estado(id, f);
    if (s.morte !== undefined && f >= s.morte) return;
    const p = paraTela(s.x, s.y);
    if (a.tipo === "guardioes") {
      const R = a.raio * PX_POR_PE;
      ctx.fillStyle = "rgba(247,226,139,0.13)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R, R, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,240,180,0.55)";
      for (let i = 0; i < 64; i++) {
        if ((i + Math.floor(f / 3)) % 4 === 0) continue;
        const an = (i / 64) * Math.PI * 2;
        ctx.fillRect(Math.round(p.x + Math.cos(an) * R), Math.round(p.y + Math.sin(an) * R), 1, 1);
      }
      for (let i = 0; i < 6; i++) {
        const an = f * 0.06 + (i / 6) * Math.PI * 2;
        const x = Math.round(p.x + Math.cos(an) * R * 0.8), y = Math.round(p.y + Math.sin(an) * R * 0.8) - 6;
        ctx.fillStyle = "#fff6c8";
        ctx.fillRect(x, y, 2, 3);
        ctx.fillStyle = "rgba(247,226,139,0.7)";
        ctx.fillRect(x - 1, y + 3, 4, 2);
      }
    } else if (a.tipo === "furia") {
      const rr = criarRng(id * 777 + f);
      for (let i = 0; i < 3; i++) {
        const fase = (f + i * 7) % 18;
        ctx.fillStyle = fase < 9 ? "#ff6a3d" : "#ffb347";
        ctx.fillRect(Math.round(p.x + (rr() - 0.5) * 18), Math.round(p.y - 4 - fase * 1.6), 1, 2);
      }
    }
  }

  // ---------- efeitos ----------
  efeito(ctx: Ctx, e: EvK<"fx">, f: number) {
    const k = (f - e.t) / e.dur;
    const pe = e.de !== undefined ? this.estado(e.de, f) : { x: e.x0, y: e.y0 };
    const pp = e.para !== undefined ? this.estado(e.para, f) : { x: e.x1, y: e.y1 };
    const a = paraTela(pe.x, pe.y), b = paraTela(pp.x, pp.y);
    const alt = 14; // altura do peito/mãos
    const ax = a.x, ay = a.y - alt, bx = b.x, by = b.y - alt;
    const claro = tom(e.cor, 1);
    const px = (x: number, y: number, c: string, s = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), s, s); };
    const linha = (x0: number, y0: number, x1: number, y1: number, c: string, s = 1) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let i = 0; i <= n; i++) px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, s);
    };
    const rr = criarRng(e.t * 13 + Math.floor(f / 2));
    switch (e.tipo) {
      case "projetil": {
        const x = ax + (bx - ax) * k, y = ay + (by - ay) * k - Math.sin(k * Math.PI) * 6;
        for (let i = 1; i <= 4; i++) {
          const kk = Math.max(0, k - i * 0.06);
          px(ax + (bx - ax) * kk + (rr() - 0.5) * 2, ay + (by - ay) * kk - Math.sin(kk * Math.PI) * 6, i < 3 ? e.cor : tom(e.cor, -1));
        }
        px(x - 2, y - 2, e.cor, 5);
        px(x - 1, y - 1, claro, 3);
        px(x, y, "#ffffff", 1);
        break;
      }
      case "flecha": {
        const x = ax + (bx - ax) * k, y = ay + (by - ay) * k - Math.sin(k * Math.PI) * 4;
        const ang = Math.atan2(by - ay, bx - ax);
        linha(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6, x, y, "#8a5a32");
        px(x, y, "#e8eef4");
        px(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6 - 1, "#f4f0e6");
        break;
      }
      case "raio": {
        const ext = Math.min(1, k * 3);
        const ex = ax + (bx - ax) * ext, ey = ay + (by - ay) * ext;
        if (k < 0.8) {
          linha(ax, ay, ex, ey, e.cor, 2);
          if (Math.floor(f / 2) % 2 === 0) linha(ax, ay, ex, ey, "#ffffff", 1);
        }
        for (let i = 0; i < 4; i++) px(ex + (rr() - 0.5) * 6, ey + (rr() - 0.5) * 6, claro);
        break;
      }
      case "misseis": {
        const n = e.n ?? 3;
        for (let i = 0; i < n; i++) {
          const kk = Math.min(1, Math.max(0, k * 1.4 - i * 0.12));
          if (kk <= 0 || kk >= 1) continue;
          const lado = (i - (n - 1) / 2) * 10;
          const nx = -(by - ay), ny = bx - ax;
          const nl = Math.hypot(nx, ny) || 1;
          const curva = Math.sin(kk * Math.PI) * lado;
          const x = ax + (bx - ax) * kk + (nx / nl) * curva, y = ay + (by - ay) * kk + (ny / nl) * curva;
          px(x - 1, y - 1, e.cor, 3);
          px(x, y, "#ffffff");
        }
        break;
      }
      case "explosao": {
        const R = (e.raio ?? 10) * PX_POR_PE * Math.min(1, easeOut(k * 1.6));
        const fade = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        for (let yy = -R; yy <= R; yy++)
          for (let xx = -R; xx <= R; xx++) {
            const dd = Math.hypot(xx, yy * 1.1);
            if (dd > R) continue;
            const r = rr();
            const t = dd / Math.max(R, 1);
            let c = t > 0.85 ? tom(e.cor, -1) : t > 0.55 ? e.cor : t > 0.25 ? claro : k < 0.3 ? "#ffffff" : claro;
            if (r < 0.12) c = tom(e.cor, -2);
            if (k > 0.4 && r < (k - 0.4) * 1.6) continue; // dissolve em pixels
            px(b.x + xx, b.y - 4 + yy, c);
          }
        ctx.restore();
        break;
      }
      case "relampago": {
        if (k > 0.85) break;
        const n = 10;
        let px0 = ax, py0 = ay;
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const x = ax + (bx - ax) * t + (i < n ? (rr() - 0.5) * 12 : 0), y = ay + (by - ay) * t + (i < n ? (rr() - 0.5) * 12 : 0);
          linha(px0, py0, x, y, e.cor, 2);
          linha(px0, py0, x, y, "#ffffff", 1);
          px0 = x;
          py0 = y;
        }
        break;
      }
      case "onda": {
        const R = (e.raio ?? 15) * PX_POR_PE * easeOut(k);
        ctx.save();
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 80; i++) {
          const an = (i / 80) * Math.PI * 2;
          px(a.x + Math.cos(an) * R, a.y - 6 + Math.sin(an) * R * 0.9, i % 2 ? e.cor : claro, 2);
        }
        ctx.restore();
        break;
      }
      case "cone": {
        const R = (e.raio ?? 15) * PX_POR_PE * easeOut(Math.min(1, k * 1.5));
        const base = Math.atan2(by - ay, bx - ax);
        ctx.save();
        ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        for (let i = 0; i < 70; i++) {
          const an = base + (rr() - 0.5) * 1.1;
          const d = rr() * R;
          px(ax + Math.cos(an) * d, ay + Math.sin(an) * d, d / R > 0.6 ? e.cor : claro, 2);
        }
        ctx.restore();
        break;
      }
      case "coluna":
      case "raioCeu": {
        const largura = Math.max(6, (e.raio ?? 5) * PX_POR_PE);
        ctx.save();
        ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        if (e.tipo === "raioCeu") {
          if (k < 0.6) {
            let x0 = b.x, y0 = b.y - 110;
            for (let i = 1; i <= 8; i++) {
              const x = b.x + (i < 8 ? (rr() - 0.5) * 14 : 0), y = b.y - 110 + (110 * i) / 8;
              linha(x0, y0, x, y, e.cor, 2);
              linha(x0, y0, x, y, "#ffffff");
              x0 = x;
              y0 = y;
            }
          }
        } else {
          const lw = Math.round(largura * (1 - k * 0.6));
          ctx.fillStyle = e.cor;
          ctx.globalAlpha *= 0.55;
          ctx.fillRect(Math.round(b.x - lw / 2), b.y - 110, lw, 110);
          ctx.globalAlpha /= 0.55;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(Math.round(b.x - lw / 6), b.y - 110, Math.max(1, Math.round(lw / 3)), 110);
        }
        for (let i = 0; i < 24; i++) {
          const an = (i / 24) * Math.PI * 2;
          px(b.x + Math.cos(an) * largura * 0.7 * (0.6 + k), b.y + Math.sin(an) * largura * 0.35 * (0.6 + k), claro);
        }
        ctx.restore();
        break;
      }
      case "cura": {
        for (let i = 0; i < 6; i++) {
          const fase = (k + i / 6) % 1;
          const x = b.x - 9 + ((i * 7) % 18), y = b.y - 6 - fase * 26;
          ctx.fillStyle = i % 2 ? "#5fd17a" : "#b8f5c4";
          ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
          ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
        }
        break;
      }
      case "corte": {
        const ang = Math.atan2(by - ay, bx - ax);
        const cx = bx - Math.cos(ang) * 2, cy = by + 2;
        for (let i = 0; i < 9; i++) {
          const an = ang - 1.2 + (i / 8) * 2.4 * Math.min(1, k * 2);
          const r = 9;
          px(cx + Math.cos(an + Math.PI / 2) * r * 0.3 + Math.cos(an) * 2, cy + Math.sin(an) * r - 4, i > 5 ? "#ffffff" : "#e8eef4");
        }
        break;
      }
      case "espectral": {
        const x = ax + (bx - ax) * Math.min(1, k * 1.2), y = ay - 8 + (by - ay) * Math.min(1, k * 1.2);
        const giro = k * 6;
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(giro);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = e.cor;
        ctx.fillRect(-1, -7, 3, 11);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, -7, 1, 10);
        ctx.fillStyle = tom(e.cor, -1);
        ctx.fillRect(-3, 3, 7, 1);
        ctx.restore();
        break;
      }
      case "palavras": {
        const x = ax + (bx - ax) * k, y = ay - 6 + (by - ay) * k + Math.sin(k * 12) * 3;
        texto(ctx, Math.floor(f / 4) % 2 ? "!" : "#", x, y, e.cor, 1);
        texto(ctx, "?", x - 6, y + 4, claro, 1);
        break;
      }
      case "escudo": {
        ctx.save();
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 6; i++) {
          const a0 = (i / 6) * Math.PI * 2, a1 = ((i + 1) / 6) * Math.PI * 2;
          linha(b.x + Math.cos(a0) * 12, b.y - 14 + Math.sin(a0) * 15, b.x + Math.cos(a1) * 12, b.y - 14 + Math.sin(a1) * 15, i % 2 ? e.cor : "#ffffff");
        }
        ctx.restore();
        break;
      }
      case "toque": {
        for (let i = 0; i < 8; i++) {
          const an = (i / 8) * Math.PI * 2 + k * 3;
          const r = 4 + k * 8;
          px(b.x + Math.cos(an) * r, b.y - 12 + Math.sin(an) * r, i % 2 ? e.cor : "#2a1838", 2);
        }
        break;
      }
    }
  }

  // ---------- rótulos dos golpes (estilo do vídeo modelo) ----------
  rotulos(ctx: Ctx, vivos: { id: number; s: ReturnType<Cena["estado"]> }[], f: number, ox: number, oy: number) {
    const ocupados: { x: number; y: number; w: number; h: number }[] = [];
    for (const fi of this.r.fichas) {
      const s = this.estado(fi.id, f);
      const ativos = this.porId[fi.id].rotulos.filter((r) => f >= r.t && f < r.t + r.dur);
      ativos.forEach((r, i) => {
        void vivos;
        const p = paraTela(s.x, s.y);
        const t = r.texto.toUpperCase();
        const w = larguraTexto(t) + 8, h = 13;
        let x = Math.round(Math.min(Math.max(p.x - w / 2, 2), TELA_W - w - 2)) + ox;
        let y = Math.round(p.y - 52 - i * 15) + oy;
        const subida = f - r.t < 3 ? 3 - (f - r.t) : 0;
        y += subida;
        // evita sobrepor outro rótulo
        for (let tent = 0; tent < 6; tent++) {
          const bate = ocupados.find((o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y);
          if (!bate) break;
          y = bate.y - h - 1;
        }
        if (y < 130) y = Math.round(p.y + 16 + i * 15) + oy; // sem espaço em cima: vai para baixo
        ocupados.push({ x, y, w, h });
        const fim = r.t + r.dur - f;
        ctx.save();
        ctx.globalAlpha = fim < 5 ? fim / 5 : 1;
        ctx.fillStyle = "#140f1a";
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = tom(r.cor, -1);
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = r.cor;
        ctx.fillRect(x + 1, y + 1, w - 2, h - 3);
        ctx.fillStyle = tom(r.cor, 1);
        ctx.fillRect(x + 1, y + 1, w - 2, 1);
        texto(ctx, t, x + 4, y + 3, "#ffffff", 1, "#140f1a");
        ctx.restore();
      });
    }
  }

  dadosENumeros(ctx: Ctx, id: number, s: ReturnType<Cena["estado"]>, f: number, ox: number, oy: number) {
    const p = paraTela(s.x, s.y);
    // d20 rolando ao lado da cabeça
    for (const dd of this.porId[id].dados) {
      const k = f - dd.t;
      if (k < 0 || k >= 26) continue;
      const lado = s.dir > 0 ? -1 : 1;
      const x = Math.round(p.x + lado * 20) + ox, y = Math.round(p.y - 24 - Math.min(k, 5)) + oy;
      const rolando = k < 7;
      const valor = rolando ? 1 + Math.floor(criarRng(dd.t * 7 + k)() * 20) : dd.valor;
      const cor = rolando ? "#c9ced6" : dd.cor;
      ctx.save();
      ctx.globalAlpha = k > 21 ? (26 - k) / 5 : 1;
      d20Icone(ctx, x, y, cor, rolando ? k : 0);
      textoCentro(ctx, String(valor), x + 1, y - 3, "#ffffff", 1, "#140f1a");
      ctx.restore();
    }
    // números de dano/cura subindo
    const nums = this.porId[id].numeros.filter((n) => f >= n.t && f < n.t + 30);
    nums.forEach((n, i) => {
      const k = f - n.t;
      const esc = n.grande ? 2 : 1;
      const y = Math.round(p.y - 36 - Math.min(k, 14) * 1.2 - i * 9) + oy;
      const pulo = k < 4 ? -2 + k : 0;
      ctx.save();
      ctx.globalAlpha = k > 24 ? (30 - k) / 6 : 1;
      textoCentro(ctx, n.texto, Math.round(p.x) + ox, y + pulo, n.cor, esc, "#140f1a");
      ctx.restore();
    });
  }

  indicadorTurno(ctx: Ctx, f: number, ox: number, oy: number) {
    if (f < INTRO || f > this.r.fimBatalha) return;
    let atual: EvK<"turno"> | undefined;
    for (const t of this.turnos) if (t.t <= f) atual = t; else break;
    if (!atual) return;
    const s = this.estado(atual.id, f);
    if (s.morte !== undefined && f >= s.morte) return;
    const p = paraTela(s.x, s.y);
    const y = Math.round(p.y - 46 + (Math.floor(f / 6) % 2)) + oy;
    texto(ctx, "▼", Math.round(p.x) - 2 + ox, y, "#ffffff", 1, "#140f1a");
  }

  // ---------- painel de cima (como o vídeo modelo) ----------
  painel(ctx: Ctx, f: number) {
    const X = 5, Y = 56, W = 260, H = 70;
    ctx.fillStyle = "#0c0a14";
    ctx.fillRect(X - 1, Y - 1, W + 2, H + 2);
    ctx.fillStyle = "#1b1830";
    ctx.fillRect(X, Y, W, H);
    ctx.fillStyle = "#2a2648";
    ctx.fillRect(X + 1, Y + 1, W - 2, 1);
    const vivos = this.r.fichas.filter((fi) => { const m = this.porId[fi.id].morte; return m === undefined || f < m; }).length;
    texto(ctx, this.titulo, X + 4, Y + 3, "#ffd84a", 1, null);
    const rod = [...this.turnos].reverse().find((t) => t.t <= f)?.rodada;
    const dir = `${rod ? `RODADA ${rod} · ` : ""}VIVOS ${vivos}`;
    texto(ctx, dir, X + W - 4 - larguraTexto(dir), Y + 3, "#f4f0e6", 1, null);
    ctx.fillStyle = "#3a3560";
    ctx.fillRect(X + 3, Y + 12, W - 6, 1);
    this.r.fichas.forEach((fi, i) => {
      const col = i % 2, lin = Math.floor(i / 2);
      const x = X + 4 + col * 130, y = Y + 15 + lin * 11;
      const s = this.estado(fi.id, f);
      const morto = s.morte !== undefined && f >= s.morte;
      ctx.fillStyle = morto ? "#4a4660" : corClasse[fi.classe];
      ctx.fillRect(x, y + 1, 3, 5);
      const nome = fi.nome.toUpperCase().slice(0, 10);
      texto(ctx, nome, x + 6, y, morto ? "#5d5874" : "#f4f0e6", 1, null);
      if (morto) {
        ctx.fillStyle = "#b04a4a";
        ctx.fillRect(x + 5, y + 3, larguraTexto(nome) + 2, 1);
      }
      const bx = x + 70, bw = 52;
      ctx.fillStyle = "#0c0a14";
      ctx.fillRect(bx - 1, y, bw + 2, 7);
      ctx.fillStyle = "#3b2e3a";
      ctx.fillRect(bx, y + 1, bw, 5);
      const k = Math.max(0, s.pvVis / s.pvMax);
      ctx.fillStyle = k > 0.5 ? "#5fd17a" : k > 0.25 ? "#f2c94c" : "#e5533d";
      ctx.fillRect(bx, y + 1, Math.round(bw * k), 5);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(bx, y + 1, Math.round(bw * k), 1);
    });
  }

  faixas(ctx: Ctx, f: number) {
    let n = 0;
    for (const b of this.banners) {
      const k = f - b.t;
      if (k < 0 || k >= b.dur) continue;
      const t = b.texto;
      const w = larguraTexto(t) + 12;
      const entra = Math.min(1, k / 6);
      const sai = k > b.dur - 6 ? (b.dur - k) / 6 : 1;
      const x = Math.round(TELA_W - 6 - w * easeOut(entra) * sai - (1 - sai) * 0);
      const y = 131 + n * 16;
      ctx.fillStyle = "#140f1a";
      ctx.fillRect(x - 1, y - 1, w + 8, 15);
      ctx.fillStyle = tom(b.cor, -1);
      ctx.fillRect(x, y, w + 6, 13);
      ctx.fillStyle = b.cor;
      ctx.fillRect(x, y, w + 6, 10);
      texto(ctx, t, x + 6, y + 3, "#ffffff", 1, "#140f1a");
      n++;
    }
  }

  // ---------- abertura ----------
  intro(ctx: Ctx, f: number) {
    // nomes embaixo de cada um durante a apresentação
    if (f < INTRO) {
      for (const fi of this.r.fichas) {
        if (f < this.chegada[fi.id] + 9) continue;
        const s = this.estado(fi.id, f);
        const p = paraTela(s.x, s.y);
        const nome = fi.nome.toUpperCase().slice(0, 10);
        textoCentro(ctx, nome, Math.round(p.x), Math.round(p.y) + 8, "#ffffff", 1);
        textoCentro(ctx, CLASSES[fi.classe].nome.toUpperCase(), Math.round(p.x), Math.round(p.y) + 17, corClasse[fi.classe], 1);
      }
    }
    // caixa "ESCOLHA SEU CAMPEÃO"
    if (f < INTRO - 32) {
      const sai = f > INTRO - 40 ? (INTRO - 32 - f) / 8 : 1;
      const W = 236, H = 56;
      const x = (TELA_W - W) / 2, y = 244 + Math.round((1 - sai) * 10);
      ctx.save();
      ctx.globalAlpha = Math.min(1, f / 6) * sai;
      caixaPergaminho(ctx, x, y, W, H);
      textoCentro(ctx, this.titulo, TELA_W / 2, y + 9, "#9a6e50", 1, null);
      textoCentro(ctx, "ESCOLHA SEU", TELA_W / 2, y + 19, "#2a2230", 1, null);
      textoCentro(ctx, "CAMPEÃO!", TELA_W / 2, y + 34, "#2a2230", 2, null);
      ctx.restore();
    }
    // contagem 3, 2, 1, LUTEM!
    const c0 = INTRO - 45;
    if (f >= c0 && f < INTRO + 22) {
      const k = f - c0;
      const t = k < 15 ? "3" : k < 30 ? "2" : k < 45 ? "1" : "LUTEM!";
      const local = k < 45 ? k % 15 : k - 45;
      const esc = t === "LUTEM!" ? 4 : local < 3 ? 8 : 6;
      ctx.save();
      ctx.globalAlpha = t === "LUTEM!" && local > 14 ? (22 - local) / 8 : 1;
      textoCentro(ctx, t, TELA_W / 2, 262 - (esc * 7) / 2, t === "LUTEM!" ? "#ffd84a" : "#ffffff", esc, "#140f1a", true);
      ctx.restore();
    }
  }

  // ---------- fechamento: vencedor + chamada para comentar ----------
  final(ctx: Ctx, f: number) {
    const t0 = this.r.fimBatalha + 30;
    if (f < t0) return;
    const k = f - t0;
    const fi = this.r.fichas[this.r.vencedor];
    const W = 250, H = 70;
    const x = (TELA_W - W) / 2, y = 134;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k / 6);
    caixaPergaminho(ctx, x, y, W, H);
    textoCentro(ctx, "VITÓRIA DE", TELA_W / 2, y + 9, "#9a6e50", 1, null);
    const nome = `${fi.nome.toUpperCase()}!`;
    const esc = larguraTexto(nome, 3) < W - 20 ? 3 : 2;
    textoCentro(ctx, nome, TELA_W / 2, y + 22, "#2a2230", esc, null);
    const ab = this.r.abates[fi.id] ?? 0;
    const dano = this.r.danoCausado[fi.id] ?? 0;
    textoCentro(ctx, `${ESPECIES[fi.especie].nome} ${CLASSES[fi.classe].nome}`.toUpperCase(), TELA_W / 2, y + 22 + esc * 7 + 5, "#6e5a4a", 1, null);
    textoCentro(ctx, `${ab} ABATE${ab === 1 ? "" : "S"} · ${dano} DE DANO`, TELA_W / 2, y + 22 + esc * 7 + 15, "#6e5a4a", 1, null);
    ctx.restore();
    if (fi.autor && k > 20) textoCentro(ctx, `CRIADO POR ${fi.autor.toUpperCase()}`, TELA_W / 2, y + H + 8, "#ffd84a", 1);
    if (k > 50) {
      const W2 = 250, H2 = 46, y2 = 330;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (k - 50) / 6);
      ctx.fillStyle = "#140f1a";
      ctx.fillRect(x - 1, y2 - 1, W2 + 2, H2 + 2);
      ctx.fillStyle = "#3b2a5a";
      ctx.fillRect(x, y2, W2, H2);
      ctx.fillStyle = "#4e3a75";
      ctx.fillRect(x, y2, W2, 2);
      textoCentro(ctx, "COMENTE NOME + DESCRIÇÃO", TELA_W / 2, y2 + 8, "#ffffff", 1, null);
      textoCentro(ctx, "DO SEU PERSONAGEM", TELA_W / 2, y2 + 18, "#ffffff", 1, null);
      textoCentro(ctx, "OS DADOS DECIDEM O RESTO!", TELA_W / 2, y2 + 31, "#ffd84a", 1, null);
      ctx.restore();
      if (this.perfil) textoCentro(ctx, this.perfil.toUpperCase(), TELA_W / 2, y2 + H2 + 8, "#f4f0e6", 1);
    }
  }
}

// ---------- peças de interface ----------
const caixaPergaminho = (ctx: Ctx, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = "#140f1a";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = "#7a5a3a";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = "#f3e7c9";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#e6d6b0";
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(x, y, w, 1);
  // d20 nos cantos (no lugar das pokébolas do modelo)
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) d20Icone(ctx, cx, cy + 3, "#c0392b", 0, true);
};

export const d20Icone = (ctx: Ctx, cx: number, cy: number, cor: string, giro = 0, pequeno = false) => {
  const r = pequeno ? 5 : 8;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3 + giro * 0.5;
    return [Math.round(cx + Math.cos(a) * r), Math.round(cy - 3 + Math.sin(a) * r)];
  });
  ctx.fillStyle = "#140f1a";
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = cor;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const xx = x + Math.sign(cx - x), yy = y + Math.sign(cy - 3 - y);
    i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
  });
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = misturar(cor, "#ffffff", 0.45);
  ctx.fillRect(pts[5][0] + 1, pts[5][1], 2, 1);
};

const caveira = (ctx: Ctx, x: number, y: number) => {
  const px = [".###.", "#.#.#", "#####", ".#.#."];
  ctx.fillStyle = "rgba(240,232,214,0.75)";
  px.forEach((l, yy) => [...l].forEach((c, xx) => c === "#" && ctx.fillRect(x - 2 + xx, y - 5 + yy, 1, 1)));
};

const easeOut = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutBounce = (k: number) => {
  k = Math.min(1, Math.max(0, k));
  const n1 = 7.5625, d1 = 2.75;
  if (k < 1 / d1) return n1 * k * k;
  if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75;
  if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375;
  return n1 * (k -= 2.625 / d1) * k + 0.984375;
};
