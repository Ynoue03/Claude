// Desenha um quadro da batalha a partir do resultado da simulação.
// Determinístico: o quadro N sempre sai igual (requisito do Remotion).
import type { Ev } from "../motor/batalha";
import { chegadas, INTRO, RAIO_ARENA } from "../motor/batalha";
import { ATRIBUTOS, CLASSES, ESPECIES, MAGIAS } from "../motor/srd";
import { criarRng, mod, sinal } from "../motor/dados";
import { cronograma, CTA, Episodio } from "../motor/episodio";
import { magiasDe, poderesAte, profDe } from "../motor/niveis";
import { animarCenario, corClasse, desenharFundo, iluminar, Luz, paraTela, SALA, TELA_H, TELA_W, PX_POR_PE } from "../pixel/cenario";
import { CENTRO_X, CHAO, Expressao, Grade, MAO, montarArma, montarSprite, Pose, retrato } from "../pixel/sprites";
import { larguraTexto, texto, textoCentro } from "../pixel/fonte";
import { misturar, tom } from "../pixel/cor";

type Ctx = CanvasRenderingContext2D;
type EvK<K extends Ev["k"]> = Extract<Ev, { k: K }>;


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
  poses: Map<string, HTMLCanvasElement>; // pose + expressão + ferido
  arma: { c: HTMLCanvasElement; pega: [number, number]; chave: string };
  pequeno: boolean;
};

export class Cena {
  r: Episodio;
  retratos = new Map<string, HTMLCanvasElement>();
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

  constructor(r: Episodio, titulo = "ARENA D20", perfil = "") {
    this.r = r;
    this.titulo = titulo;
    this.perfil = perfil;
    this.duracao = r.duracao;
    const f = novaTela(TELA_W, TELA_H);
    desenharFundo(f.ctx);
    this.fundo = f.c;
    for (const ficha of r.fichas) {
      const poses = new Map<string, HTMLCanvasElement>();
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
  // quadro do "mundo": a ação congela durante cut-ins e no VS do duelo final
  mundoF(f: number) {
    for (const p of this.r.pausas) if (f >= p.t && f < p.t + p.dur) return p.t;
    return f;
  }

  luzDoEfeito(e: EvK<"fx">, f: number): Luz {
    const k = Math.min(1, (f - e.t) / e.dur);
    const pe = e.de !== undefined ? this.estado(e.de, f) : { x: e.x0, y: e.y0 };
    const pp = e.para !== undefined ? this.estado(e.para, f) : { x: e.x1, y: e.y1 };
    const a = paraTela(pe.x, pe.y), b = paraTela(pp.x, pp.y);
    const fade = 1 - k * 0.6;
    switch (e.tipo) {
      case "explosao":
        return { x: b.x, y: b.y, r: (e.raio ?? 10) * PX_POR_PE + 40, i: 1.5 * fade, cor: e.cor };
      case "coluna":
      case "raioCeu":
        return { x: b.x, y: b.y, r: 46, i: 1.2 * fade, cor: e.cor };
      case "relampago":
      case "raio":
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: 50, i: 0.9 * fade, cor: e.cor };
      case "onda":
      case "cone":
        return { x: a.x, y: a.y, r: 50, i: 0.9 * fade, cor: e.cor };
      default:
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - 12, r: 22, i: 0.7, cor: e.cor };
    }
  }

  desenhar(final: Ctx, f: number) {
    const fm = this.mundoF(f);
    const w = this.mundo.ctx;
    w.imageSmoothingEnabled = false;
    w.drawImage(this.fundo, 0, 0);
    animarCenario(w, fm);

    for (const id of Object.keys(this.porId).map(Number)) for (const a of this.porId[id].auras) if (fm >= a.t0 && fm < a.t1) this.aura(w, id, a, fm);
    for (const fi of this.r.fichas) {
      const m = this.porId[fi.id].morte;
      if (m !== undefined && fm > m + 26) {
        const s = this.estado(fi.id, fm);
        const p = paraTela(s.x, s.y);
        caveira(w, Math.round(p.x), Math.round(p.y));
      }
    }
    const vivos = this.r.fichas
      .map((fi) => ({ id: fi.id, s: this.estado(fi.id, fm) }))
      .filter(({ id, s }) => fm >= this.chegada[id] && (s.morte === undefined || fm < s.morte + 30))
      .sort((a, b) => a.s.y - b.s.y);
    // coluna de luz dourada do campeão (atrás dele)
    const fim = this.r.fimBatalha;
    const venc = this.estado(this.r.vencedor, fm);
    const pVenc = paraTela(venc.x, venc.y);
    if (fm > fim + 6) colunaDourada(w, pVenc.x, pVenc.y, fm - fim);
    for (const { id, s } of vivos) this.personagem(w, id, s, fm);
    for (const e of this.fx) if (fm >= e.t && fm < e.t + e.dur) this.efeito(w, e, fm);

    // luz das tochas + personagens + magias
    const luzes: Luz[] = vivos.map(({ s }) => {
      const p = paraTela(s.x, s.y);
      return { x: p.x, y: p.y - 12, r: 32, i: 0.5 };
    });
    for (const e of this.fx) if (fm >= e.t && fm < e.t + e.dur) luzes.push(this.luzDoEfeito(e, fm));
    if (fm > fim + 6) luzes.push({ x: pVenc.x, y: pVenc.y - 20, r: 70, i: 1.2, cor: "#ffd84a" });
    iluminar(w, fm, luzes);

    for (const { id, s } of vivos) this.barra(w, id, s, fm);
    this.rotulos(w, vivos, fm, 0, 0);
    for (const { id, s } of vivos) this.dadosENumeros(w, id, s, fm, 0, 0);
    this.indicadorTurno(w, fm, 0, 0);

    // ---------- câmera: tremor, zoom 1,2× no duelo, zoom no campeão ----------
    const c = this.comp.ctx;
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#0b0a10";
    c.fillRect(0, 0, TELA_W, TELA_H);
    let ox = 0, oy = 0;
    for (const t of this.tremores) {
      const k = fm - t.t;
      if (k >= 0 && k < 10) {
        const rr = criarRng(t.t * 31 + k);
        const forca = t.forca * (1 - k / 10);
        ox += Math.round((rr() - 0.5) * 2 * forca);
        oy += Math.round((rr() - 0.5) * 2 * forca);
      }
    }
    let z = 1, cx = TELA_W / 2, cy = TELA_H / 2;
    const duelo = this.r.pausas.find((p) => p.tipo === "duelo");
    if (duelo && duelo.ev.k === "duelo" && fm >= duelo.t && fm < fim + 14) {
      const [a, b] = duelo.ev.ids.map((id) => paraTela(this.estado(id, fm).x, this.estado(id, fm).y));
      const k = Math.min(1, (f - duelo.t - duelo.dur) / 20);
      if (k > 0) {
        z = 1 + 0.2 * easeInOut(k);
        cx = (a.x + b.x) / 2;
        cy = (a.y + b.y) / 2 - 10;
      }
    }
    if (fm >= fim + 14) {
      const k = Math.min(1, (fm - fim - 14) / 26);
      z = 1.2 + 0.8 * easeInOut(k);
      cx = pVenc.x;
      cy = pVenc.y - 14;
    }
    if (z > 1.001) {
      const W = TELA_W * z, H = TELA_H * z;
      const dx = Math.min(0, Math.max(TELA_W - W, TELA_W / 2 - cx * z));
      const dy = Math.min(0, Math.max(TELA_H - H, TELA_H / 2 - cy * z));
      c.drawImage(this.mundo.c, Math.round(dx + ox), Math.round(dy + oy), Math.round(W), Math.round(H));
    } else c.drawImage(this.mundo.c, ox, oy);

    // ---------- interface ----------
    this.painel(c, fm);
    this.faixas(c, fm);
    this.intro(c, f);
    this.cutin(c, f);
    this.vs(c, f);
    this.vitoria(c, f);
    this.pergaminho(c, f);
    this.chamada(c, f);

    final.imageSmoothingEnabled = false;
    final.drawImage(this.comp.c, 0, 0, final.canvas.width, final.canvas.height);
  }

  sprite(id: number, pose: Pose, expr: Expressao, ferido: boolean) {
    const chave = `${pose}:${expr}:${ferido}`;
    const rec = this.rec[id];
    let c = rec.poses.get(chave);
    if (!c) {
      const fi = this.r.fichas[id];
      c = gradeParaTela(montarSprite(fi, pose, expr, ferido, (fi.vitorias ?? 0) > 0));
      rec.poses.set(chave, c);
    }
    return c;
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
    // rosto conforme o estado
    const fim = this.r.fimBatalha;
    const vencedor = id === this.r.vencedor && f > fim;
    const baixo = s.pv / s.pvMax < 0.3 && s.pv > 0;
    let expr: Expressao = f < INTRO ? "neutra" : baixo ? "ofegante" : "concentrada";
    if (a && (a.tipo === "ataque" || a.tipo === "magia") && f - a.t < 10) expr = "grito";
    if (a && a.tipo === "dano" && f - a.t < 8) expr = "dor";
    if (s.morte !== undefined && f >= s.morte) expr = "derrota";
    if (vencedor) {
      expr = "vitoria";
      pose = "parado";
      armaAng = -0.35 + Math.sin(f * 0.25) * 0.15;
      dy = -Math.abs(Math.round(Math.sin(f * 0.25) * 3));
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
    ctx.drawImage(this.sprite(id, pose, expr, baixo || (s.morte !== undefined && f >= s.morte)), ox, oy);
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
    // "poof" de fumaça quando some
    if (s.morte !== undefined && f >= s.morte + 12 && f < s.morte + 30) {
      const k = (f - s.morte - 12) / 18;
      const rr = criarRng(id * 91);
      for (let i = 0; i < 10; i++) {
        const an = rr() * Math.PI * 2, r = 4 + k * 12 * (0.6 + rr() * 0.6);
        ctx.fillStyle = `rgba(200,195,210,${(0.7 * (1 - k)).toFixed(2)})`;
        const sz = Math.max(1, Math.round(4 * (1 - k)));
        ctx.fillRect(Math.round(X + Math.cos(an) * r), Math.round(Y - 10 + Math.sin(an) * r * 0.7 - k * 6), sz, sz);
      }
    }
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
        if (y < SALA.topo + 2) y = Math.round(p.y + 16 + i * 15) + oy; // sem espaço em cima: vai para baixo
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

  // ---------- retratos ----------
  retratoHud(id: number, expr: Expressao, cinza = false) {
    const chave = `${id}:${expr}:${cinza}`;
    let c = this.retratos.get(chave);
    if (!c) {
      const fi = this.r.fichas[id];
      let g = retrato(montarSprite(fi, "parado", expr, expr === "ofegante", (fi.vitorias ?? 0) > 0));
      if (cinza) g = g.map((l) => l.map((cor) => (cor ? cinzento(cor) : cor)));
      c = gradeParaTela(g);
      this.retratos.set(chave, c);
    }
    return c;
  }
  retratoGrande(id: number, expr: Expressao) {
    const chave = `G${id}:${expr}`;
    let c = this.retratos.get(chave);
    if (!c) {
      const fi = this.r.fichas[id];
      c = gradeParaTela(retrato(montarSprite(fi, "parado", expr, false, false), 24, 20, 8, 3));
      this.retratos.set(chave, c);
    }
    return c;
  }

  // ---------- painel de cima: grade 4×4 ----------
  painel(ctx: Ctx, f: number) {
    const X = 4, Y = 74, W = 352, H = 96;
    ctx.fillStyle = "#07060b";
    ctx.fillRect(X - 1, Y - 1, W + 2, H + 2);
    ctx.fillStyle = "#17141f";
    ctx.fillRect(X, Y, W, H);
    ctx.fillStyle = "#2a2538";
    ctx.fillRect(X + 1, Y + 1, W - 2, 1);
    const vivos = this.r.fichas.filter((fi) => { const m = this.porId[fi.id].morte; return m === undefined || f < m; }).length;
    texto(ctx, this.titulo, X + 4, Y + 3, "#ffd84a", 1, null);
    const rod = [...this.turnos].reverse().find((t) => t.t <= f)?.rodada;
    const dir = `${rod ? `RODADA ${rod} · ` : ""}VIVOS ${vivos}`;
    texto(ctx, dir, X + W - 4 - larguraTexto(dir), Y + 3, "#f4f0e6", 1, null);
    this.r.fichas.forEach((fi, i) => {
      const col = i % 4, lin = Math.floor(i / 4);
      const x = X + 3 + col * 87, y = Y + 13 + lin * 20;
      const s = this.estadoBase(fi.id, f);
      const morto = s.morte !== undefined && f >= s.morte;
      const k = Math.max(0, s.pvVis / s.pvMax);
      const expr: Expressao = morto ? "derrota" : k < 0.3 ? "ofegante" : s.anim?.tipo === "dano" && f - s.anim.t < 8 ? "dor" : "neutra";
      ctx.fillStyle = morto ? "#2a2730" : corClasse[fi.classe];
      ctx.fillRect(x - 1, y - 1, 18, 18);
      ctx.fillStyle = "#0e0c14";
      ctx.fillRect(x, y, 16, 16);
      ctx.drawImage(this.retratoHud(fi.id, expr, morto), x, y);
      if (morto) {
        ctx.fillStyle = "#c0392b";
        for (let q = 0; q < 14; q++) {
          ctx.fillRect(x + 1 + q, y + 1 + q, 1, 1);
          ctx.fillRect(x + 14 - q, y + 1 + q, 1, 1);
        }
      }
      const nome = fi.nome.toUpperCase().slice(0, 7);
      texto(ctx, nome, x + 19, y + 1, morto ? "#5d5874" : "#f4f0e6", 1, null);
      const nv = `NV${fi.nivel}`;
      texto(ctx, nv, x + 83 - larguraTexto(nv), y + 1, fi.nivel > 1 ? "#ffd84a" : morto ? "#4a4660" : "#9a94b0", 1, null);
      if (morto) {
        ctx.fillStyle = "#b04a4a";
        ctx.fillRect(x + 18, y + 4, larguraTexto(nome) + 2, 1);
      }
      const bx = x + 19, by = y + 11, bw = 64;
      ctx.fillStyle = "#07060b";
      ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = "#3b2e3a";
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = k > 0.5 ? "#5fd17a" : k > 0.25 ? "#f2c94c" : "#e5533d";
      ctx.fillRect(bx, by, Math.round(bw * k), 4);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(bx, by, Math.round(bw * k), 1);
    });
  }

  faixas(ctx: Ctx, f: number) {
    let n = 0;
    for (const b of this.banners) {
      const k = f - b.t;
      if (k < 0 || k >= b.dur) continue;
      const t = b.texto;
      const w = larguraTexto(t) + 30;
      const entra = Math.min(1, k / 6);
      const sai = k > b.dur - 6 ? (b.dur - k) / 6 : 1;
      const x = Math.round(TELA_W - 4 - w * easeOut(entra) * sai);
      const y = 176 + n * 22;
      ctx.fillStyle = "#140f1a";
      ctx.fillRect(x - 1, y - 1, w + 8, 21);
      ctx.fillStyle = tom(b.cor, -1);
      ctx.fillRect(x, y, w + 6, 19);
      ctx.fillStyle = b.cor;
      ctx.fillRect(x, y, w + 6, 15);
      // mini retrato de quem caiu
      const quem = this.r.fichas.find((fi) => t.startsWith(fi.nome.toUpperCase()));
      if (quem) ctx.drawImage(this.retratoHud(quem.id, "derrota", false), x + 2, y + 1);
      texto(ctx, t, x + 22, y + 6, "#ffffff", 1, "#140f1a");
      n++;
    }
  }

  // ---------- abertura ----------
  intro(ctx: Ctx, f: number) {
    if (f < INTRO) {
      for (const fi of this.r.fichas) {
        if (f < this.chegada[fi.id] + 9) continue;
        const s = this.estadoBase(fi.id, f);
        const p = paraTela(s.x, s.y);
        textoCentro(ctx, fi.nome.toUpperCase().slice(0, 9), Math.round(p.x), Math.round(p.y) + 6, fi.nivel > 1 ? "#ffd84a" : "#ffffff", 1);
        textoCentro(ctx, CLASSES[fi.classe].nome.toUpperCase(), Math.round(p.x), Math.round(p.y) + 15, corClasse[fi.classe], 1);
      }
    }
    if (f < INTRO - 32) {
      const sai = f > INTRO - 40 ? (INTRO - 32 - f) / 8 : 1;
      const W = 256, H = 58;
      const x = (TELA_W - W) / 2, y = 326 + Math.round((1 - sai) * 10);
      ctx.save();
      ctx.globalAlpha = Math.min(1, f / 6) * sai;
      caixaPergaminho(ctx, x, y, W, H);
      textoCentro(ctx, `${this.titulo} · 16 HERÓIS · NÍVEL 1`, TELA_W / 2, y + 9, "#9a6e50", 1, null);
      textoCentro(ctx, "ESCOLHA SEU", TELA_W / 2, y + 21, "#2a2230", 1, null);
      textoCentro(ctx, "CAMPEÃO!", TELA_W / 2, y + 36, "#2a2230", 2, null);
      ctx.restore();
    }
    const c0 = INTRO - 45;
    if (f >= c0 && f < INTRO + 22) {
      const k = f - c0;
      const t = k < 15 ? "3" : k < 30 ? "2" : k < 45 ? "1" : "LUTEM!";
      const local = k < 45 ? k % 15 : k - 45;
      const esc = t === "LUTEM!" ? 5 : local < 3 ? 9 : 7;
      ctx.save();
      ctx.globalAlpha = t === "LUTEM!" && local > 14 ? (22 - local) / 8 : 1;
      textoCentro(ctx, t, TELA_W / 2, 350 - (esc * 7) / 2, t === "LUTEM!" ? "#ffd84a" : "#ffffff", esc, "#140f1a", true);
      ctx.restore();
    }
  }

  // ---------- cut-in de golpe especial ----------
  cutin(ctx: Ctx, f: number) {
    const p = this.r.pausas.find((q) => q.tipo === "cutin" && f >= q.t && f < q.t + q.dur);
    if (!p || p.ev.k !== "cutin") return;
    const e = p.ev;
    const k = f - p.t;
    const entra = Math.min(1, k / 4), sai = k > p.dur - 4 ? (p.dur - k) / 4 : 1;
    const desl = Math.round((1 - entra) * -TELA_W + (1 - sai) * TELA_W);
    const yc = 330, alt = 92, incl = 34;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, SALA.topo, TELA_W, SALA.base - SALA.topo);
    ctx.translate(desl, 0);
    // faixa diagonal
    const faixa = (pad: number, cor: string) => {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.moveTo(-20, yc - alt / 2 + incl - pad);
      ctx.lineTo(TELA_W + 20, yc - alt / 2 - incl - pad);
      ctx.lineTo(TELA_W + 20, yc + alt / 2 - incl + pad);
      ctx.lineTo(-20, yc + alt / 2 + incl + pad);
      ctx.fill();
    };
    faixa(4, "#140f1a");
    faixa(2, e.cor);
    faixa(0, "#1d1828");
    // linhas de velocidade
    const rr = criarRng(p.t * 7 + k);
    for (let i = 0; i < 26; i++) {
      const y = yc - alt / 2 + rr() * alt;
      const x = ((rr() * TELA_W + k * 40) % (TELA_W + 60)) - 30;
      ctx.fillStyle = i % 3 ? "rgba(255,255,255,0.25)" : tom(e.cor, 1);
      ctx.fillRect(Math.round(x), Math.round(y - (x / TELA_W) * incl * 2 + incl), 18 + Math.round(rr() * 30), 1);
    }
    // rosto em close (grito)
    const rx = 20, ry = yc - 40;
    ctx.fillStyle = "#140f1a";
    ctx.fillRect(rx - 3, ry - 3, 78, 66);
    ctx.fillStyle = e.cor;
    ctx.fillRect(rx - 2, ry - 2, 76, 64);
    ctx.fillStyle = "#2a2238";
    ctx.fillRect(rx, ry, 72, 60);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.retratoGrande(e.id, "grito"), rx, ry, 72, 60);
    const fi = this.r.fichas[e.id];
    texto(ctx, fi.nome.toUpperCase(), 104, yc - 30, "#c9c3d6", 1, "#140f1a");
    const esc = larguraTexto(e.texto, 2) < 240 ? 2 : 1;
    texto(ctx, e.texto, 104, yc - 18, "#ffffff", esc, "#140f1a", true);
    texto(ctx, e.sub, 104, yc + 2, "#ffd84a", 1, "#140f1a");
    ctx.restore();
  }

  // ---------- duelo final: VS ----------
  vs(ctx: Ctx, f: number) {
    const p = this.r.pausas.find((q) => q.tipo === "duelo" && f >= q.t && f < q.t + q.dur);
    if (!p || p.ev.k !== "duelo") return;
    const k = f - p.t;
    const entra = easeOut(Math.min(1, k / 8)), sai = k > p.dur - 6 ? (p.dur - k) / 6 : 1;
    ctx.save();
    ctx.globalAlpha = sai;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, SALA.topo, TELA_W, SALA.base - SALA.topo);
    textoCentro(ctx, "DUELO FINAL", TELA_W / 2, 214, "#ffd84a", 2, "#140f1a", true);
    p.ev.ids.forEach((id, i) => {
      const fi = this.r.fichas[id];
      const s = this.estadoBase(id, p.t);
      const lado = i === 0 ? -1 : 1;
      const x = Math.round(TELA_W / 2 + lado * 80 - 36 + (1 - entra) * lado * 200), y = 262;
      ctx.fillStyle = "#140f1a";
      ctx.fillRect(x - 3, y - 3, 78, 66);
      ctx.fillStyle = corClasse[fi.classe];
      ctx.fillRect(x - 2, y - 2, 76, 64);
      ctx.fillStyle = "#2a2238";
      ctx.fillRect(x, y, 72, 60);
      ctx.drawImage(this.retratoGrande(id, "concentrada"), x, y, 72, 60);
      textoCentro(ctx, fi.nome.toUpperCase(), x + 36, y + 70, "#ffffff", 1, "#140f1a");
      textoCentro(ctx, `${ESPECIES[fi.especie].nome} ${CLASSES[fi.classe].nome}`.toUpperCase(), x + 36, y + 80, corClasse[fi.classe], 1, "#140f1a");
      textoCentro(ctx, `PV ${s.pv}/${s.pvMax} · CA ${fi.ca} · NV${fi.nivel}`, x + 36, y + 90, "#c9c3d6", 1, "#140f1a");
    });
    const esc = k < 10 ? 7 - Math.floor(k / 4) : 5;
    textoCentro(ctx, "VS", TELA_W / 2, 280, k % 6 < 3 ? "#ffd84a" : "#e8452e", esc, "#140f1a", true);
    ctx.restore();
  }

  // ---------- vitória + subida de nível ----------
  vitoria(ctx: Ctx, f: number) {
    const fim = this.r.fimBatalha;
    if (f < fim + 30 || f >= this.r.inicioPergaminho + 20) return;
    const k = f - fim - 30;
    const fi = this.r.fichas[this.r.vencedor];
    const a = Math.min(1, k / 6) * (f > this.r.inicioPergaminho ? 1 - (f - this.r.inicioPergaminho) / 20 : 1);
    ctx.save();
    ctx.globalAlpha = a;
    const W = 280, H = 48, x = (TELA_W - W) / 2, y = 184;
    caixaPergaminho(ctx, x, y, W, H);
    textoCentro(ctx, "VITÓRIA DE", TELA_W / 2, y + 8, "#9a6e50", 1, null);
    const nome = `${fi.nome.toUpperCase()}!`;
    textoCentro(ctx, nome, TELA_W / 2, y + 20, "#2a2230", larguraTexto(nome, 3) < W - 20 ? 3 : 2, null);
    if (k > 24 && Math.floor(k / 8) % 4 !== 3) textoCentro(ctx, `SUBIU PARA O NÍVEL ${this.r.subida.depois.nivel}!`, TELA_W / 2, 440, "#ffd84a", 2, "#140f1a", true);
    ctx.restore();
    // confetes
    const rr = criarRng(77);
    for (let i = 0; i < 60; i++) {
      const x0 = rr() * TELA_W, vel = 1.2 + rr() * 1.6, fase = rr() * 200;
      const y = ((k * vel + fase) % 380) + SALA.topo;
      ctx.fillStyle = ["#ffd84a", "#e8452e", "#5fd17a", "#5a8ff0", "#f4f0e6"][i % 5];
      ctx.fillRect(Math.round(x0 + Math.sin((k + i * 7) * 0.1) * 6), Math.round(y), i % 2 ? 2 : 1, i % 3 ? 2 : 3);
    }
  }

  // ---------- pergaminho do campeão ----------
  pergaminho(ctx: Ctx, f: number) {
    const cr = cronograma(this.r);
    if (f < cr.t0) return;
    const u = f - cr.t0;
    const sub = this.r.subida;
    const A = sub.antes, D = sub.depois;
    const X = 24, W = 312, Y0 = 96, Y1 = 428;
    const abre = easeOut(Math.min(1, u / 26));
    const yb = Math.round(Y0 + 10 + (Y1 - Y0 - 10) * abre);
    ctx.save();
    ctx.fillStyle = `rgba(6,4,12,${Math.min(0.65, u / 20).toFixed(2)})`;
    ctx.fillRect(0, SALA.topo - 34, TELA_W, TELA_H);
    // papel
    ctx.fillStyle = "#140f1a";
    ctx.fillRect(X - 1, Y0 - 1, W + 2, yb - Y0 + 2);
    for (let y = Y0; y < yb; y++) {
      const borda = (x: number) => Math.round(2 + Math.sin(y * 0.7) * 1.5 + Math.sin(y * 0.23 + x) * 1);
      const e = borda(1), d = borda(2);
      ctx.fillStyle = "#e9d9b0";
      ctx.fillRect(X + e, y, W - e - d, 1);
      ctx.fillStyle = "#6a4a2a"; // bordas queimadas
      ctx.fillRect(X + e - 1, y, 2, 1);
      ctx.fillRect(X + W - d - 1, y, 2, 1);
      if (y % 7 === 0) {
        ctx.fillStyle = "#dccaa0";
        ctx.fillRect(X + 6 + ((y * 37) % (W - 20)), y, 6, 1);
      }
    }
    // rolos de madeira em cima e embaixo + fitas
    const rolo = (y: number) => {
      ctx.fillStyle = "#140f1a";
      ctx.fillRect(X - 8, y - 5, W + 16, 10);
      ctx.fillStyle = "#8a5a32";
      ctx.fillRect(X - 7, y - 4, W + 14, 8);
      ctx.fillStyle = "#b07a46";
      ctx.fillRect(X - 7, y - 4, W + 14, 2);
      ctx.fillStyle = "#5a3a22";
      ctx.fillRect(X - 7, y + 2, W + 14, 2);
      ctx.fillStyle = "#c9a24a";
      ctx.fillRect(X - 10, y - 3, 4, 6);
      ctx.fillRect(X + W + 6, y - 3, 4, 6);
    };
    rolo(Y0);
    rolo(yb);
    ctx.fillStyle = "#a8242c";
    ctx.fillRect(X + 30, Y0 + 4, 6, 18);
    ctx.fillRect(X + W - 36, Y0 + 4, 6, 18);
    ctx.restore();
    if (u < 24) return;

    const tinta = "#2a2230", suave = "#6e5a4a", verde = "#2f9a46", ouro = "#b8862a";
    const aparece = (t: number) => f >= t;
    let y = Y0 + 14;
    // topo: retrato, nome, espécie/classe, nível
    if (aparece(cr.topo)) {
      ctx.fillStyle = "#6a4a2a";
      ctx.fillRect(X + 12, y - 2, 52, 44);
      ctx.fillStyle = "#2a2238";
      ctx.fillRect(X + 14, y, 48, 40);
      ctx.drawImage(this.retratoGrande(this.r.vencedor, "vitoria"), X + 14, y, 48, 40);
      texto(ctx, A.nome.toUpperCase(), X + 72, y + 1, tinta, larguraTexto(A.nome.toUpperCase(), 2) < 220 ? 2 : 1, null);
      texto(ctx, `${ESPECIES[A.especie].nome}${A.dragao ? ` (${A.dragao.nome})` : ""} ${CLASSES[A.classe].nome}`.toUpperCase(), X + 72, y + 19, suave, 1, null);
      const pisca = Math.floor(f / 10) % 2 === 0;
      texto(ctx, `NÍVEL ${A.nivel} →`, X + 72, y + 31, tinta, 1, null);
      texto(ctx, `${D.nivel}`, X + 72 + larguraTexto(`NÍVEL ${A.nivel} → `), y + 29, pisca ? "#e8a22a" : ouro, 2, "#3a2a10");
    }
    y += 50;
    // atributos
    if (aparece(cr.atributos)) {
      texto(ctx, "ATRIBUTOS", X + 12, y, ouro, 1, null);
      ctx.fillStyle = "#b8a07a";
      ctx.fillRect(X + 12, y + 9, W - 24, 1);
      ATRIBUTOS.forEach((at, i) => {
        if (!aparece(cr.atributos + i * cr.passoAtrib)) return;
        const col = i % 3, lin = Math.floor(i / 3);
        const x = X + 12 + col * 98, yy = y + 14 + lin * 11;
        const v = D.atributos[at];
        const t = `${at} ${v} (${sinal(mod(v))})`;
        texto(ctx, t, x, yy, tinta, 1, null);
        const g = sub.atributos[at];
        if (g) texto(ctx, `+${g}`, x + larguraTexto(t) + 4, yy, verde, 1, null);
      });
    }
    y += 40;
    // combate
    if (aparece(cr.combate)) {
      texto(ctx, "COMBATE", X + 12, y, ouro, 1, null);
      ctx.fillStyle = "#b8a07a";
      ctx.fillRect(X + 12, y + 9, W - 24, 1);
      const conMod = mod(D.atributos.CON);
      const lado = CLASSES[A.classe].dadoVida;
      if (aparece(cr.pv)) {
        const rolando = f < cr.pv + 14;
        const dado = rolando ? 1 + Math.floor(criarRng(f)() * lado) : sub.dadoPv;
        const t = `PV ${A.pv} → ${rolando ? "?" : D.pv}`;
        texto(ctx, t, X + 12, y + 14, tinta, 1, null);
        texto(ctx, `+${rolando ? "?" : D.pv - A.pv} (d${lado} = ${dado} ${sinal(conMod)} CON${A.especie === "anao" ? " +1" : A.especie === "humano" ? " +2" : ""})`, X + 18 + larguraTexto(t), y + 14, rolando ? suave : verde, 1, null);
      }
      if (aparece(cr.magia)) {
        const prof = D.ataqueMagia !== undefined ? `MAGIA +${D.ataqueMagia} · CD ${D.cd}` : `PROFICIÊNCIA +${profDe(D.nivel)}`;
        const t = `CA ${D.ca}${D.ca > A.ca ? "" : ""} · ${prof}`;
        texto(ctx, t, X + 12, y + 25, tinta, 1, null);
        if (D.ca > A.ca) texto(ctx, `CA +${D.ca - A.ca}`, X + 18 + larguraTexto(t), y + 25, verde, 1, null);
        const esp = D.espacos.map((q, i) => (q ? `${i + 1}º×${q}` : "")).filter(Boolean).join(" ");
        if (esp) {
          const ant = A.espacos.reduce((s, q) => s + q, 0), dep = D.espacos.reduce((s, q) => s + q, 0);
          const t2 = `ESPAÇOS DE MAGIA ${esp}`;
          texto(ctx, t2, X + 12, y + 36, tinta, 1, null);
          if (dep !== ant || D.espacos.some((q, i) => q > A.espacos[i])) texto(ctx, "NOVO", X + 18 + larguraTexto(t2), y + 36, verde, 1, null);
        }
      }
    }
    y += 50;
    // poderes
    if (aparece(cr.poderes)) {
      texto(ctx, "PODERES", X + 12, y, ouro, 1, null);
      ctx.fillStyle = "#b8a07a";
      ctx.fillRect(X + 12, y + 9, W - 24, 1);
      const antigos = poderesAte(A.classe, A.especie, A.nivel).map((p) => p.nome);
      const magiasAnt = magiasDe(A.classe, A.nivel).map((m) => MAGIAS[m].nome);
      const linhaAnt = quebrar([...antigos, ...magiasAnt].join(" · ").toUpperCase(), 50).slice(0, 3);
      linhaAnt.forEach((l, i) => texto(ctx, l, X + 12, y + 14 + i * 10, suave, 1, null));
      let yy = y + 14 + linhaAnt.length * 10 + 2;
      const novos = [...sub.poderes.map((p) => `${p.nome} — ${p.desc}`), ...sub.magias.map((m) => `${MAGIAS[m].nome} — magia nova`)];
      novos.forEach((n, i) => {
        if (!aparece(cr.novos + i * cr.passoNovo)) return;
        const brilho = f - (cr.novos + i * cr.passoNovo) < 8;
        texto(ctx, "NOVO!", X + 12, yy, brilho ? "#5fd17a" : verde, 1, brilho ? "#e8ffe8" : null);
        quebrar(n.toUpperCase(), 41).slice(0, 2).forEach((l, j) => texto(ctx, l, X + 48, yy + j * 10, verde, 1, null));
        yy += novos.length > 2 ? 10 : 20;
      });
      if (!novos.length && aparece(cr.novos)) texto(ctx, "MAIS RESISTENTE: SÓ PV NESTE NÍVEL", X + 12, yy, verde, 1, null);
    }
    y += 82;
    // história (letra por letra)
    if (aparece(cr.historia)) {
      texto(ctx, "HISTÓRIA", X + 12, y, ouro, 1, null);
      ctx.fillStyle = "#b8a07a";
      ctx.fillRect(X + 12, y + 9, W - 24, 1);
      const n = Math.floor((f - cr.historia) * cr.charsPorQuadro);
      const linhas = quebrar(this.r.historia.toUpperCase(), 48);
      let resto = n;
      linhas.slice(0, 6).forEach((l, i) => {
        if (resto <= 0) return;
        texto(ctx, l.slice(0, resto), X + 12, y + 14 + i * 10, tinta, 1, null);
        resto -= l.length;
      });
    }
    // rodapé + selo
    if (aparece(cr.rodape)) {
      textoCentro(ctx, "DEFENDE O TÍTULO NA PRÓXIMA BATALHA!", TELA_W / 2, Y1 - 26, "#a8242c", 1, null);
      if (A.autor) textoCentro(ctx, `CRIADO POR ${A.autor.toUpperCase()}`, TELA_W / 2, Y1 - 15, suave, 1, null);
      d20Icone(ctx, X + W - 22, Y1 - 12, "#a8242c", 0, false);
    }
  }

  // ---------- chamada final ----------
  chamada(ctx: Ctx, f: number) {
    if (f < CTA) return;
    const k = f - CTA;
    const W = 300, H = 56, x = (TELA_W - W) / 2, y = 446;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k / 6);
    ctx.fillStyle = "#140f1a";
    ctx.fillRect(x - 1, y - 1, W + 2, H + 2);
    ctx.fillStyle = "#3b2a5a";
    ctx.fillRect(x, y, W, H);
    ctx.fillStyle = "#4e3a75";
    ctx.fillRect(x, y, W, 2);
    textoCentro(ctx, "COMENTE NOME + DESCRIÇÃO", TELA_W / 2, y + 8, "#ffffff", 1, null);
    textoCentro(ctx, "DO SEU PERSONAGEM", TELA_W / 2, y + 19, "#ffffff", 1, null);
    textoCentro(ctx, "OS DADOS DECIDEM O RESTO!", TELA_W / 2, y + 33, "#ffd84a", 1, null);
    if (this.perfil) textoCentro(ctx, this.perfil.toUpperCase(), TELA_W / 2, y + 45, "#c9c3d6", 1, null);
    ctx.restore();
  }
}

// ---------- peças de interface ----------
const quebrar = (t: string, max: number) => {
  const linhas: string[] = [];
  let atual = "";
  for (const p of t.split(" ")) {
    if ((atual + " " + p).trim().length > max) {
      linhas.push(atual.trim());
      atual = p;
    } else atual += " " + p;
  }
  if (atual.trim()) linhas.push(atual.trim());
  return linhas;
};
const cinzento = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const g = Math.round(((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) * 0.7;
  const v = Math.round(g).toString(16).padStart(2, "0");
  return `#${v}${v}${v}`;
};
const colunaDourada = (ctx: Ctx, x: number, y: number, k: number) => {
  const a = Math.min(1, k / 10);
  ctx.save();
  ctx.globalAlpha = 0.35 * a;
  ctx.fillStyle = "#ffd84a";
  ctx.fillRect(Math.round(x - 12), 0, 24, Math.round(y));
  ctx.globalAlpha = 0.6 * a;
  ctx.fillStyle = "#fff4c0";
  ctx.fillRect(Math.round(x - 4), 0, 8, Math.round(y));
  ctx.globalAlpha = a;
  for (let i = 0; i < 10; i++) {
    const fase = (k * 1.5 + i * 17) % 60;
    ctx.fillStyle = i % 2 ? "#ffd84a" : "#fff4c0";
    ctx.fillRect(Math.round(x - 14 + ((i * 11) % 28)), Math.round(y - fase), 1, 2);
  }
  ctx.restore();
};

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
