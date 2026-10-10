// Monta um quadro completo (360×640) a partir do episódio: mundo + efeitos + interface.
// Função pura do número do quadro: o Remotion pode renderizar fora de ordem e em paralelo.
import { Episodio, montarEpisodio } from "../episodio";
import { Arena, gerarArena, H, mapaLuz, pintarArena, tintaLuz, W } from "../arte/arena";
import { pintarAmbiente } from "../arte/ambiente";
import { anel, Buf, colar, colarEscala, elipse, escurecerPx, linha, novoBuf, px, ret, somar } from "../arte/buffer";
import { hex, misturar, RGB } from "../arte/cor";
import { medir, quebrar, texto, textoCentro } from "../arte/fonte";
import { Expr, gerarMini, gerarRetrato, gerarSprite, Quadro } from "../arte/sprite";
import { Pintura } from "../arte/tela";
import { congelamentoEm, globalDe, mundo, T } from "../linha";
import { GOLPE, P } from "../sim/combate";
import { Lutador, atqArma, cdMagia, modAtr, prof } from "../sim/ficha";
import { ATRIBUTOS, CLASSE, ESPECIE, ESPACOS, PODERES as CLASSE_PODERES } from "../sim/tabelas";
import { mod } from "../sim/rng";
import { desenharFx, luzesFx } from "./efeitos";
import { estadoEm, EstadoLut, MORTE, pvEm } from "./mundo";

export type Cena = ReturnType<typeof prepararCena>;

const TINTA: RGB = [24, 14, 30];
const OURO: RGB = [255, 210, 80];
const VERDE: RGB = [90, 230, 120];
const VERMELHO: RGB = [235, 70, 60];
const CINZA: RGB = [150, 150, 160];

const rnd = (a: number, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const eOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export const prepararCena = (ep: Episodio) => {
  const m = montarEpisodio(ep);
  const arena = gerarArena(ep.seed % 1000);
  const lut = m.fichasIniciais;
  const L = m.linha;
  // ordem de queda na intro = ordem no círculo (de cima, sentido horário)
  const ordem = lut
    .map((l) => l.id)
    .sort((a, b) => {
      const pa = m.resultado.posInicial[a];
      const pb = m.resultado.posInicial[b];
      return Math.atan2(pa.y - 384, pa.x - 180) - Math.atan2(pb.y - 384, pb.x - 180);
    });
  const pousos: Record<number, number> = {};
  ordem.forEach((id, i) => (pousos[id] = 6 + ((i * 5) % 16) * 6));
  // fila de banners "CAIU!"
  const banners: { g: number; alvo: number }[] = [];
  let livre = 0;
  for (const q of L.quedas) {
    const g = Math.max(globalDe(L, q.tw), livre);
    banners.push({ g, alvo: q.alvo });
    livre = g + 40;
  }
  return { ep, ...m, arena, lut, L, pousos, banners, cache: new Map<string, Pintura>() };
};

const sprite = (c: Cena, l: Lutador, q: Quadro, coroa = false) => {
  const k = `${l.id}|${q.anim}|${q.f}|${q.dir}|${q.expr}|${q.rasgado ? 1 : 0}|${coroa ? 1 : 0}`;
  let s = c.cache.get(k);
  if (!s) {
    s = gerarSprite(l, q, coroa);
    c.cache.set(k, s);
  }
  return s;
};
const retrato = (c: Cena, l: Lutador, e: Expr) => {
  const k = `R${l.id}|${e}`;
  let s = c.cache.get(k);
  if (!s) {
    s = gerarRetrato(l, e, l.campeaoAnterior);
    c.cache.set(k, s);
  }
  return s;
};
const mini = (c: Cena, l: Lutador, e: Expr) => {
  const k = `M${l.id}|${e}`;
  let s = c.cache.get(k);
  if (!s) {
    s = gerarMini(l, e, l.campeaoAnterior);
    c.cache.set(k, s);
  }
  return s;
};

// ─────────────────────────── peças de interface ───────────────────────────
const caixa = (b: Buf, x: number, y: number, w: number, h: number, fundo: RGB, a = 1, borda: RGB = TINTA) => {
  ret(b, x - 2, y - 2, w + 4, h + 4, borda, a);
  ret(b, x, y, w, h, fundo, a);
  ret(b, x, y, w, 1, misturar(fundo, [255, 255, 255], 0.35), a);
  ret(b, x, y + h - 1, w, 1, misturar(fundo, [0, 0, 0], 0.35), a);
};

const d20Icone = (b: Buf, cx: number, cy: number, r: number, cor: RGB, valor: string | null) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = Math.abs(x + 0.5 - cx);
      const dy = Math.abs(y + 0.5 - cy);
      if (dx <= r * 0.866 && dy <= r - dx * 0.577) px(b, x, y, misturar(cor, [0, 0, 0], (y - cy + r) / (r * 5)));
    }
  for (let k = 0; k < 6; k++) linha(b, pts[k][0], pts[k][1], pts[(k + 1) % 6][0], pts[(k + 1) % 6][1], TINTA);
  if (valor !== null) textoCentro(b, valor, cx + 0.5, cy - 3, { cor: [255, 255, 255], contorno: TINTA });
};

const corDado = (valor: number, res: string): RGB =>
  valor === 20 ? [240, 190, 40] : valor === 1 ? [210, 50, 50] : res === "acerto" || res === "critico" || res === "falhou" ? [60, 170, 80] : [120, 124, 134];

// ─────────────────────────── mundo ───────────────────────────
const desenharLutador = (b: Buf, c: Cena, l: Lutador, e: EstadoLut, luz: Float32Array, coroa: boolean, alfa = 1) => {
  if (!e.visivel) return;
  const s = sprite(c, l, { anim: e.anim, f: e.f, dir: e.dir, expr: e.expr, rasgado: e.rasgado }, coroa);
  const i = clamp(Math.round(e.y), 0, H - 1) * W + clamp(Math.round(e.x), 0, W - 1);
  const Lp = clamp(luz[i] * 1.05, 0.95, 1.25);
  const t = tintaLuz(Lp);
  // personagens sempre legíveis: luz mínima alta e tom quente das tochas
  colar(b, s, e.x - 24, e.y - 61, { tinta: [t[0] * 0.86, t[1] * 0.88, t[2] * 0.95], branco: e.branco, alfa });
};

const sombra = (b: Buf, x: number, y: number, a = 0.45) => {
  for (let yy = -3; yy <= 3; yy++) for (let xx = -10; xx <= 10; xx++) if ((xx / 10) ** 2 + (yy / 3.2) ** 2 <= 1) escurecerPx(b, x + xx, y + yy, a);
};

const caveira = (b: Buf, x: number, y: number) => {
  const osso: RGB = [214, 206, 188];
  elipse(b, x, y - 3, 3.5, 3, osso);
  ret(b, x - 2, y - 1, 5, 2, osso);
  px(b, x - 1.5, y - 3, [30, 20, 26]);
  px(b, x + 1.5, y - 3, [30, 20, 26]);
  px(b, x, y - 1, [60, 50, 50]);
  linha(b, x - 5, y + 2, x + 5, y - 1, [190, 182, 166]);
};

const barraPV = (b: Buf, x: number, y: number, w: number, pv: number, max: number, h = 2) => {
  const k = clamp(pv / max, 0, 1);
  const cor: RGB = k > 0.5 ? [80, 210, 90] : k > 0.25 ? [235, 200, 60] : [225, 60, 50];
  ret(b, x - 1, y - 1, w + 2, h + 2, TINTA);
  ret(b, x, y, w, h, [60, 40, 46]);
  ret(b, x, y, Math.round(w * k), h, cor);
  if (h >= 3) ret(b, x, y, Math.round(w * k), 1, misturar(cor, [255, 255, 255], 0.4));
};

const ETIQUETA: Record<string, RGB> = {
  ATD: [230, 200, 60],
  MRC: [168, 224, 48],
  LNT: [143, 214, 244],
  "FÚR": [240, 122, 26],
  CNC: [160, 140, 240],
  ESC: [74, 208, 224],
};

const desenharMundo = (b: Buf, c: Cena, g: number) => {
  const { L, lut, arena } = c;
  const w = g < T.batalha ? 0 : mundo(L, g);
  const combate = g >= T.batalha && g < T.vencedor;
  const intro = g < T.batalha;
  const fimLuta = g >= T.vencedor;
  const estados = lut.map((l) => estadoEm(L, l, w, combate));
  const posAtual = (id: number): P | null => ({ x: estados[id].x, y: estados[id].y });

  // vencedor: pose de vitória
  if (fimLuta) {
    const v = estados[L.vencedor];
    v.anim = "vitoria";
    v.f = Math.floor(g / 7) % 4;
    v.dir = "S";
    v.expr = "vitoria";
    v.conds = [];
    v.rasgado = false;
    v.branco = 0;
  }
  // intro: queda em círculo
  if (intro)
    for (const e of estados) {
      const t = g - c.pousos[e.id];
      e.anim = "idle";
      e.f = Math.floor(g / 8) % 4;
      e.dir = "S";
      e.expr = "neutra";
      e.conds = [];
      if (t < -12) e.visivel = false;
      else if (t < 0) e.y -= Math.pow(-t / 12, 2) * 220;
    }

  const fxLuz = luzesFx(L.fx, w, posAtual);
  if (fimLuta) {
    const v = estados[L.vencedor];
    fxLuz.push({ x: v.x, y: v.y - 10, raio: 110, forca: 1.2, cor: [255, 210, 110] });
  }
  const luz = mapaLuz(arena, g, fxLuz);
  pintarArena(arena, b.d, luz, g);
  pintarAmbiente(b, arena, g);

  // caveiras e sombras
  for (const e of estados) if (e.caveira) caveira(b, e.x, e.y);
  for (const e of estados) if (e.visivel && !e.caveira) sombra(b, e.x, intro ? e.y + Math.max(0, 0) : e.y, intro && g - c.pousos[e.id] < 0 ? 0.2 : 0.45);

  // poeira do pouso
  if (intro)
    for (const e of estados) {
      const t = g - c.pousos[e.id];
      if (t >= 0 && t < 14) {
        const p0 = c.resultado.posInicial[e.id];
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          const d = 4 + t * 1.6;
          px(b, p0.x + Math.cos(ang) * d * 1.4, p0.y + Math.sin(ang) * d * 0.5 - t * 0.2, [190, 180, 160], 0.7 * (1 - t / 14));
        }
      }
    }

  // lutadores por profundidade
  const ordem = estados.filter((e) => e.visivel).sort((a, b2) => a.y - b2.y);
  for (const e of ordem) desenharLutador(b, c, lut[e.id], e, luz.L, lut[e.id].campeaoAnterior);

  // fumaça ("poof") de quem caiu
  for (const f of L.faixas) {
    if (f.morte === null) continue;
    const t = w - f.morte - MORTE.piscar + 4;
    if (t < 0 || t > 16) continue;
    const p = f.segs.length ? f.segs[f.segs.length - 1].para : f.pos0;
    const e = estados[f.id];
    for (let i = 0; i < 16; i++) {
      const ang = rnd(f.id, i) * Math.PI * 2;
      const d = t * (0.8 + rnd(i, f.id) * 0.8);
      const r = 2.5 - t * 0.12;
      elipse(b, e.x + Math.cos(ang) * d * 1.3, e.y - 8 + Math.sin(ang) * d - t * 0.6, Math.max(0.6, r), Math.max(0.6, r), [200, 196, 204], 0.8 * (1 - t / 16));
    }
    void p;
  }

  // barras de PV, etiquetas e seta do turno
  if (combate)
    for (const e of ordem) {
      if (e.morto) continue;
      barraPV(b, Math.round(e.x - 8), Math.round(e.y + 4), 16, e.pv, e.pvMax);
      let tx = Math.round(e.x - (e.conds.length * 19 - 2) / 2);
      for (const cd of e.conds) {
        const cor = ETIQUETA[cd] ?? CINZA;
        ret(b, tx - 1, e.y + 8, 19, 9, TINTA);
        ret(b, tx, e.y + 9, 17, 7, misturar(cor, [0, 0, 0], 0.25));
        texto(b, cd, tx + 1, e.y + 9, { cor: [255, 255, 255], escala: 1 });
        tx += 19;
      }
      if (e.noTurno && Math.floor(g / 5) % 3 !== 2) texto(b, "▼", e.x - 2, e.y - 70 + (Math.floor(g / 5) % 2), { cor: OURO, contorno: TINTA });
    }

  // efeitos dos golpes
  desenharFx(b, L.fx, w, posAtual);

  // coluna de luz dourada do vencedor
  if (fimLuta) {
    const v = estados[L.vencedor];
    const t = g - T.vencedor;
    const larg = 12 + Math.sin(t * 0.2) * 2;
    for (let y = 0; y <= v.y + 2; y++)
      for (let x = -larg; x <= larg; x++) somar(b, v.x + x, y, [255, 214, 120], 0.55 * (1 - Math.abs(x) / (larg + 1)) * Math.min(1, t / 10));
  }

  // dados girando, caixas de golpe e números flutuantes
  if (combate) {
    for (const d of L.dados) {
      const t = w - d.t0;
      if (t < 0 || t > 22) continue;
      const e = estados[d.perto];
      const x = e.x + 15;
      const y = e.y - 48;
      if (t < 6) d20Icone(b, x, y, 6, [210, 210, 220], String(1 + Math.floor(rnd(d.t0, t, d.ator) * 20)));
      else d20Icone(b, x, y, 6 + (t < 9 ? 1 : 0), corDado(d.valor, d.res), String(d.valor));
    }
    for (const cx of L.caixas) {
      const t = w - cx.t0;
      if (t < 0 || w > cx.t1) continue;
      const e = estados[cx.ator];
      const tw = medir(cx.texto);
      let x = Math.round(e.x - tw / 2);
      x = clamp(x, 34, 326 - tw);
      const y = Math.max(190, Math.round(e.y - 96 + (t < 3 ? 3 - t : 0)));
      caixa(b, x - 2, y - 2, tw + 4, 11, cx.cor, t < 2 ? 0.6 : 1);
      texto(b, cx.texto, x, y, { cor: [255, 255, 255], contorno: TINTA });
    }
    L.flutuantes.forEach((fl, i) => {
      const t = w - fl.t0;
      if (t < 0 || t > 26) return;
      const e = estados[fl.alvo];
      const esc = fl.grande ? 2 : 1;
      // empilha textos do mesmo alvo que saem juntos
      let pilha = 0;
      for (let j = 0; j < i; j++) {
        const o = L.flutuantes[j];
        if (o.alvo === fl.alvo && fl.t0 - o.t0 < 14) pilha += o.grande ? 16 : 10;
      }
      const y = e.y - 64 - pilha - eOut(t / 14) * 14;
      const al = t < 18 ? 1 : 1 - (t - 18) / 8;
      textoCentro(b, fl.texto, e.x, y, { cor: fl.cor, contorno: TINTA, escala: esc, alfa: al });
    });
  }

  // intro: nome, classe e nível embaixo de quem pousou
  if (intro)
    for (const e of estados) {
      const t = g - c.pousos[e.id];
      if (t < 2 || t > 40) continue;
      const l = lut[e.id];
      const al = t > 34 ? 1 - (t - 34) / 6 : 1;
      textoCentro(b, l.nome, e.x, e.y + 5, { cor: [255, 255, 255], contorno: TINTA, alfa: al });
      textoCentro(b, `${CLASSE[l.classe].nome} NV ${l.nivel}`, e.x, e.y + 15, { cor: hex(CLASSE[l.classe].cor), contorno: TINTA, alfa: al });
    }
  return estados;
};

// ─────────────────────────── câmera ───────────────────────────
const camera = (dst: Buf, src: Buf, zoom: number, cx: number, cy: number, sx: number, sy: number) => {
  if (zoom === 1 && sx === 0 && sy === 0) {
    dst.d.set(src.d);
    return;
  }
  for (let y = 0; y < H; y++) {
    const yy = Math.floor((y - H / 2) / zoom + cy - sy);
    for (let x = 0; x < W; x++) {
      const xx = Math.floor((x - W / 2) / zoom + cx - sx);
      const i = (y * W + x) * 4;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) {
        dst.d[i] = 8;
        dst.d[i + 1] = 6;
        dst.d[i + 2] = 12;
        dst.d[i + 3] = 255;
        continue;
      }
      const j = (yy * W + xx) * 4;
      dst.d[i] = src.d[j];
      dst.d[i + 1] = src.d[j + 1];
      dst.d[i + 2] = src.d[j + 2];
      dst.d[i + 3] = 255;
    }
  }
};

// ─────────────────────────── HUD ───────────────────────────
const exprMini = (pv: number, max: number, morto: boolean): Expr => (morto ? "derrota" : pv / max < 0.3 ? "pvBaixo" : pv / max < 0.6 ? "concentrada" : "neutra");

const desenharHUD = (b: Buf, c: Cena, g: number) => {
  const { L, lut, ep } = c;
  const w = g < T.batalha ? -1 : mundo(L, g);
  ret(b, 30, 72, 300, 112, [12, 9, 18], 0.82);
  ret(b, 30, 72, 300, 1, [120, 90, 60]);
  ret(b, 30, 183, 300, 1, [120, 90, 60]);
  // título e rodada
  texto(b, `ARENA D20 #${ep.numero}`, 36, 76, { cor: OURO, contorno: TINTA });
  let rodada = 0;
  for (const r of L.rodadas) if (w >= r.tw) rodada = r.n;
  let vivos = 0;
  lut.forEach((l) => {
    const f = L.faixas[l.id];
    if (f.morte === null || w < f.morte) vivos++;
  });
  const info = g < T.batalha ? `VIVOS ${lut.length}` : `RODADA ${Math.max(1, rodada)} · VIVOS ${vivos}`;
  texto(b, info, 324 - medir(info), 76, { cor: [235, 230, 220], contorno: TINTA });
  // grade 4×4
  lut.forEach((l, i) => {
    const col = i % 4;
    const lin = Math.floor(i / 4);
    const x = 34 + col * 73;
    const y = 90 + lin * 23;
    const f = L.faixas[l.id];
    const apareceu = g >= c.pousos[l.id];
    if (!apareceu) {
      ret(b, x, y, 16, 16, [40, 34, 48]);
      return;
    }
    const morto = f.morte !== null && w >= f.morte;
    const pv = w < 0 ? l.pvMax : pvEm(f, w);
    const m = mini(c, l, exprMini(pv, l.pvMax, morto));
    ret(b, x - 1, y - 1, 18, 18, morto ? [60, 30, 30] : hex(CLASSE[l.classe].cor));
    ret(b, x, y, 16, 16, [30, 26, 40]);
    colar(b, m, x, y, { cinza: morto });
    if (morto) {
      linha(b, x + 1, y + 1, x + 14, y + 14, VERMELHO, 1, 2);
      linha(b, x + 14, y + 1, x + 1, y + 14, VERMELHO, 1, 2);
    }
    if (l.campeaoAnterior) {
      ret(b, x + 4, y - 3, 8, 3, OURO);
      px(b, x + 4, y - 4, OURO);
      px(b, x + 8, y - 4, OURO);
      px(b, x + 11, y - 4, OURO);
    }
    const nome = l.nome.length > 9 ? l.nome.slice(0, 9) : l.nome;
    const corNome: RGB = morto ? [110, 104, 112] : [245, 240, 230];
    texto(b, nome, x + 19, y, { cor: corNome });
    if (morto) ret(b, x + 18, y + 3, medir(nome) + 2, 1, VERMELHO);
    const nv = `NV ${l.nivel}`;
    texto(b, nv, x + 19, y + 9, { cor: l.nivel > 1 ? OURO : [170, 164, 176] });
    ret(b, x + 19 + medir(nv) + 2, y + 10, 5, 5, hex(CLASSE[l.classe].cor));
    const bx = x + 19 + medir(nv) + 9;
    barraPV(b, bx, y + 11, 70 - (bx - x) - 1, morto ? 0 : pv, l.pvMax, 3);
  });
};

// ─────────────────────────── banners ───────────────────────────
const bannerCaiu = (b: Buf, c: Cena, g: number) => {
  for (const bn of c.banners) {
    const t = g - bn.g;
    if (t < 0 || t > 40) continue;
    const l = c.lut[bn.alvo];
    const entra = eOut(t / 6);
    const sai = t > 34 ? (t - 34) / 6 : 0;
    const txt = `${l.nome} ${c.ep.textos.caiu}`;
    const tw = medir(txt) + 30;
    const x = Math.round(-tw + (180 - tw / 2 + tw) * entra + sai * 400);
    const y = 190;
    caixa(b, x, y, tw, 20, [120, 20, 28]);
    const m = mini(c, l, "derrota");
    colar(b, m, x + 3, y + 2, { cinza: true });
    linha(b, x + 4, y + 3, x + 17, y + 16, VERMELHO, 1, 2);
    linha(b, x + 17, y + 3, x + 4, y + 16, VERMELHO, 1, 2);
    texto(b, txt, x + 24, y + 7, { cor: [255, 255, 255], contorno: TINTA });
  }
};

const linhasVelocidade = (b: Buf, y0: number, h: number, g: number, cor: RGB, dir = 1) => {
  for (let i = 0; i < 26; i++) {
    const yy = y0 + Math.floor(rnd(i, 3) * h);
    const len = 20 + rnd(i, 5) * 60;
    const x = (((rnd(i, 7) * 500 + g * 34 * dir) % 500) + 500) % 500 - 70;
    linha(b, x, yy, x + len, yy, cor, 0.55);
  }
};

const faixaDiagonal = (b: Buf, y0: number, h: number, cor: RGB, prog: number, incl = 18) => {
  // faixa inclinada que entra da esquerda
  const off = (1 - eOut(prog)) * -420;
  for (let y = y0; y < y0 + h; y++) {
    const desloc = ((y - y0) / h) * incl;
    for (let x = 0; x < W; x++) {
      const xx = x - off - desloc;
      if (xx < -10 || xx > W + 30) continue;
      px(b, x, y, cor, 0.92);
    }
  }
  ret(b, 0, y0, W, 2, [255, 255, 255], 0.8 * prog);
  ret(b, 0, y0 + h - 2, W, 2, [255, 255, 255], 0.8 * prog);
};

const cutIn = (b: Buf, c: Cena, g: number) => {
  const cg = congelamentoEm(c.L, g);
  if (!cg) return;
  const t = g - cg.g;
  if (cg.tipo === "cutin") {
    const ev = c.L.cutins.filter((x) => Math.abs(globalDe(c.L, x.tw) - (cg.g + cg.dur)) < 2 || Math.abs(globalDe(c.L, x.tw) - cg.g) < 2)[0] ?? c.L.cutins.find((x) => globalDe(c.L, x.tw) >= cg.g);
    if (!ev) return;
    const l = c.lut[ev.ator];
    const info = GOLPE[ev.golpe];
    const prog = t < 4 ? t / 4 : t > cg.dur - 3 ? (cg.dur - t) / 3 : 1;
    // escurece o fundo
    for (let i = 0; i < W * H; i++) {
      b.d[i * 4] *= 0.55;
      b.d[i * 4 + 1] *= 0.55;
      b.d[i * 4 + 2] *= 0.6;
    }
    const claro = info.cor === "#e8e8ec" || info.cor === "#a8aeb8" || info.cor === "#d8c49a";
    const cor: RGB = claro ? [190, 40, 50] : hex(info.cor);
    faixaDiagonal(b, 268, 196, misturar(cor, [20, 10, 30], 0.55), prog);
    linhasVelocidade(b, 272, 188, g, misturar(cor, [255, 255, 255], 0.5));
    const xr = Math.round(84 - (1 - eOut(prog)) * 300);
    ret(b, xr - 3, 279, 198, 134, TINTA);
    ret(b, xr - 1, 281, 194, 130, misturar(cor, [255, 255, 255], 0.3));
    ret(b, xr, 282, 192, 128, misturar(cor, [10, 6, 16], 0.7));
    linhasVelocidade(b, 284, 124, g + 7, misturar(cor, [255, 255, 255], 0.2), -1);
    colarEscala(b, retrato(c, l, "grito"), xr, 282, 2);
    const arma = ["ataque", "oportunidade", "descuidado", "surtoAcao", "furtivo"].indexOf(ev.golpe) >= 0 && l.arma.id !== "punhos" ? l.arma.nome.toUpperCase() : info.nome.replace("!", "");
    const nome = ev.motivo === "critico" ? `CRÍTICO! ${arma}` : arma + "!";
    const s = medir(nome, 2) > 292 ? 1 : 2;
    textoCentro(b, nome, 180, 420, { escala: s, cor: [255, 255, 255], contorno: TINTA, sombra: misturar(cor, [0, 0, 0], 0.3) });
    if (ev.rolagem) textoCentro(b, ev.rolagem, 180, 442, { escala: 2, cor: OURO, contorno: TINTA });
    textoCentro(b, l.nome, 180, 266 - 12, { cor: [255, 255, 255], contorno: TINTA, alfa: prog });
    // flash no fim
    if (t >= cg.dur - 2) for (let i = 0; i < W * H; i++) {
      b.d[i * 4] += 90;
      b.d[i * 4 + 1] += 90;
      b.d[i * 4 + 2] += 90;
    }
  } else if (cg.tipo === "vs" && c.L.finalistas) {
    const [a, d] = c.L.finalistas;
    for (let i = 0; i < W * H; i++) {
      b.d[i * 4] *= 0.4;
      b.d[i * 4 + 1] *= 0.4;
      b.d[i * 4 + 2] *= 0.45;
    }
    const w = mundo(c.L, g);
    const prog = t < 8 ? t / 8 : t > cg.dur - 5 ? (cg.dur - t) / 5 : 1;
    const ficha = (id: number, y: number, espelho: boolean) => {
      const l = c.lut[id];
      const cor = hex(CLASSE[l.classe].cor);
      faixaDiagonal(b, y, 128, misturar(cor, [16, 10, 26], 0.6), prog, espelho ? -18 : 18);
      linhasVelocidade(b, y + 4, 120, g, misturar(cor, [255, 255, 255], 0.4), espelho ? -1 : 1);
      const r = retrato(c, l, "concentrada");
      const rx = espelho ? 360 - 192 - 6 + (1 - eOut(prog)) * 300 : 6 - (1 - eOut(prog)) * 300;
      const rr: Pintura = espelho ? { w: r.w, h: r.h, rgba: espelharRGBA(r) } : r;
      colarEscala(b, rr, rx, y, 2);
      const tx = espelho ? 40 : 206;
      const pv = pvEm(c.L.faixas[id], w);
      texto(b, l.nome, tx, y + 20, { escala: 2, cor: [255, 255, 255], contorno: TINTA });
      texto(b, CLASSE[l.classe].nome, tx, y + 42, { cor: cor, contorno: TINTA });
      texto(b, `PV ${pv}/${l.pvMax}`, tx, y + 56, { cor: VERDE, contorno: TINTA });
      texto(b, `CA ${l.ca}`, tx, y + 68, { cor: [220, 220, 230], contorno: TINTA });
      texto(b, ESPECIE[l.especie].nome, tx, y + 80, { cor: [200, 190, 180], contorno: TINTA });
    };
    ficha(a, 222, false);
    ficha(d, 392, true);
    const pulso = 1 + (t % 10 < 5 ? 0 : 0);
    textoCentro(b, "VS", 180, 356, { escala: 4 + pulso - 1, cor: OURO, contorno: TINTA, sombra: [120, 20, 20] });
    textoCentro(b, "DUELO FINAL", 180, 220 - 14, { escala: 1, cor: [255, 255, 255], contorno: TINTA, alfa: prog });
  }
};

const espelharRGBA = (s: Pintura) => {
  const out = new Uint8ClampedArray(s.rgba.length);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const i = (y * s.w + x) * 4;
      const j = (y * s.w + (s.w - 1 - x)) * 4;
      out[i] = s.rgba[j];
      out[i + 1] = s.rgba[j + 1];
      out[i + 2] = s.rgba[j + 2];
      out[i + 3] = s.rgba[j + 3];
    }
  return out;
};

// ─────────────────────────── intro ───────────────────────────
const desenharIntro = (b: Buf, c: Cena, g: number) => {
  const tx = c.ep.textos;
  if (g >= 24 && g < 132) {
    const t = g - 24;
    const al = t < 6 ? t / 6 : t > 100 ? (108 - t) / 8 : 1;
    const y = 214;
    const tw = medir(tx.intro, 2);
    caixa(b, 180 - tw / 2 - 26, y - 6, tw + 52, 26, [60, 24, 40], al);
    textoCentro(b, tx.intro, 180, y, { escala: 2, cor: OURO, contorno: TINTA, alfa: al });
    d20Icone(b, 180 - tw / 2 - 14, y + 7, 8, [200, 60, 60], "20");
    d20Icone(b, 180 + tw / 2 + 14, y + 7, 8, [200, 60, 60], "20");
  }
  const conta = [
    { g: 66, s: "3" },
    { g: 86, s: "2" },
    { g: 106, s: "1" },
  ];
  for (const k of conta) {
    const t = g - k.g;
    if (t < 0 || t >= 20) continue;
    const esc = t < 4 ? 8 - t : 5;
    textoCentro(b, k.s, 180, 360 - esc * 3, { escala: esc, cor: [255, 255, 255], contorno: TINTA, sombra: [120, 20, 20], alfa: t > 16 ? (20 - t) / 4 : 1 });
  }
  if (g >= 126 && g < 160) {
    const t = g - 126;
    const esc = t < 4 ? 6 - Math.floor(t / 2) : 4;
    textoCentro(b, tx.lutem, 180, 350, { escala: esc, cor: OURO, contorno: TINTA, sombra: [140, 30, 20], alfa: t > 28 ? (34 - t) / 6 : 1 });
    if (t < 8) for (let i = 0; i < W * H; i++) {
      const k = (8 - t) * 14;
      b.d[i * 4] += k;
      b.d[i * 4 + 1] += k;
      b.d[i * 4 + 2] += k;
    }
  }
};

// ─────────────────────────── vitória ───────────────────────────
const desenharVitoria = (b: Buf, c: Cena, g: number) => {
  const t = g - T.vencedor;
  if (t < 0 || g >= T.pergaminho + 30) return;
  const l = c.lut[c.L.vencedor];
  // confete
  const cores: RGB[] = [[255, 210, 80], [235, 70, 90], [90, 200, 240], [120, 230, 120], [240, 140, 220]];
  for (let i = 0; i < 90; i++) {
    const x0 = rnd(i, 1) * 360;
    const vel = 1.2 + rnd(i, 2) * 1.6;
    const y = -10 + ((t * vel + rnd(i, 3) * 200) % 680);
    const x = x0 + Math.sin(t * 0.1 + i) * 6;
    const cor = cores[i % cores.length];
    px(b, x, y, cor);
    if ((t + i) % 6 < 3) px(b, x + 1, y, misturar(cor, [0, 0, 0], 0.3));
    else px(b, x, y + 1, misturar(cor, [0, 0, 0], 0.3));
  }
  const prog = eOut(t / 10);
  const txt = `${c.ep.textos.vitoria} ${l.nome}!`;
  const esc = medir(txt, 2) > 290 ? 1 : 2;
  const tw = medir(txt, esc);
  caixa(b, 180 - tw / 2 - 10, 196 - (1 - prog) * 60, tw + 20, esc * 7 + 12, [110, 70, 20]);
  textoCentro(b, txt, 180, 202 - (1 - prog) * 60, { escala: esc, cor: OURO, contorno: TINTA });
  if (t > 8) {
    const r = retrato(c, l, "vitoria");
    const s = eOut((t - 8) / 10);
    const y = 228 + (1 - s) * 30;
    ret(b, 82, y - 2, 196, 132, OURO, s);
    ret(b, 84, y, 192, 128, [40, 24, 50], s);
    linhasVelocidade(b, y + 2, 124, g, [255, 220, 140], 1);
    colarEscala(b, r, 84, y, 2, { alfa: s });
  }
  if (t > 40 && Math.floor(t / 6) % 3 !== 2) textoCentro(b, c.ep.textos.subiu, 180, 478, { escala: 2, cor: OURO, contorno: TINTA, sombra: [120, 60, 10] });
};

// ─────────────────────────── pergaminho ───────────────────────────
const PAPEL: RGB = [226, 204, 160];
const TINTA_P: RGB = [58, 34, 20];
const ROTULO: RGB = [128, 36, 26];
const VERDE_P: RGB = [24, 120, 46];

const desenharPergaminho = (b: Buf, c: Cena, g: number) => {
  const s = g - T.pergaminho;
  if (s < 0 || g >= T.cta + 12) return;
  const { subida } = c;
  const l = subida.depois;
  const a = subida.antes;
  // escurece o fundo
  const esc = Math.min(1, s / 12) * 0.65;
  for (let i = 0; i < W * H; i++) {
    b.d[i * 4] *= 1 - esc;
    b.d[i * 4 + 1] *= 1 - esc;
    b.d[i * 4 + 2] *= 1 - esc;
  }
  const x0 = 32;
  const x1 = 328;
  const y0 = 80;
  const yMax = 528;
  const abre = eOut(s / 30);
  const yb = Math.round(y0 + (yMax - y0) * abre);
  // papel envelhecido com bordas queimadas
  for (let y = y0; y < yb; y++)
    for (let x = x0; x < x1; x++) {
      const borda = Math.min(x - x0, x1 - 1 - x);
      const queima = 3 + Math.floor(rnd(Math.floor(y / 3), x < 180 ? 1 : 2) * 4);
      if (borda < queima - 2) continue;
      let cor: RGB = misturar(PAPEL, [196, 166, 118], rnd(x >> 2, y >> 2, 9) * 0.5);
      if (rnd(x, y, 4) < 0.05) cor = misturar(cor, [150, 110, 70], 0.4);
      if (borda < queima) cor = misturar(cor, [60, 30, 14], 0.7);
      else if (borda < queima + 3) cor = misturar(cor, [120, 70, 30], 0.35);
      px(b, x, y, cor);
    }
  // varetas de madeira
  const vareta = (y: number) => {
    ret(b, x0 - 8, y - 4, x1 - x0 + 16, 8, [90, 56, 30]);
    ret(b, x0 - 8, y - 4, x1 - x0 + 16, 2, [140, 96, 56]);
    ret(b, x0 - 8, y + 2, x1 - x0 + 16, 2, [56, 32, 18]);
    elipse(b, x0 - 10, y, 4, 5, [190, 150, 60]);
    elipse(b, x1 + 10, y, 4, 5, [190, 150, 60]);
  };
  vareta(y0);
  vareta(yb);
  // fitas vermelhas
  for (const fx of [x0 + 18, x1 - 18]) {
    ret(b, fx - 3, yb + 4, 6, 18, [170, 30, 40]);
    px(b, fx - 3, yb + 22, [170, 30, 40]);
    px(b, fx + 2, yb + 22, [170, 30, 40]);
  }
  if (s < 30) return;
  const q = s - 30; // conteúdo
  const ap = (t: number) => q >= t;
  const brilho = (x: number, y: number, t: number) => {
    const d = q - t;
    if (d < 0 || d > 10) return;
    for (let k = -4; k <= 4; k++) {
      px(b, x + k, y, [255, 255, 220], (1 - Math.abs(k) / 5) * (1 - d / 10));
      px(b, x, y + k, [255, 255, 220], (1 - Math.abs(k) / 5) * (1 - d / 10));
    }
  };
  // topo: retrato, nome, espécie e classe, nível
  const r = retrato(c, a, "vitoria");
  ret(b, 41, 89, 98, 66, [120, 80, 30]);
  ret(b, 42, 90, 96, 64, [60, 36, 50]);
  colar(b, r, 42, 90);
  texto(b, l.nome, 146, 94, { escala: medir(l.nome, 2) > 170 ? 1 : 2, cor: TINTA_P });
  texto(b, `${ESPECIE[l.especie].nome} · ${CLASSE[l.classe].nome}`, 146, 114, { cor: ROTULO });
  const nvTxt = `NÍVEL ${a.nivel} → `;
  texto(b, nvTxt, 146, 128, { cor: TINTA_P });
  if (Math.floor(q / 6) % 2 === 0 || q > 120) texto(b, String(l.nivel), 146 + medir(nvTxt) + 6, 126, { escala: 2, cor: [200, 140, 20], contorno: [90, 50, 10] });
  if (l.autor) texto(b, `CRIADO POR ${l.autor}`, 146, 142, { cor: ROTULO });
  // atributos
  let y = 162;
  texto(b, "ATRIBUTOS", 42, y, { cor: ROTULO });
  ret(b, 42, y + 9, 276, 1, [150, 110, 70]);
  ATRIBUTOS.forEach((at, i) => {
    const t = 12 + i * 7;
    if (!ap(t)) return;
    const col = i % 3;
    const lin = Math.floor(i / 3);
    const x = 42 + col * 94;
    const yy = y + 14 + lin * 11;
    const v = l.atrib[at];
    const m = mod(v);
    const txt = `${at} ${v} (${m >= 0 ? "+" : ""}${m})`;
    texto(b, txt, x, yy, { cor: TINTA_P });
    const ganho = subida.aumentos[at];
    if (ganho) texto(b, `+${ganho}`, x + medir(txt) + 4, yy, { cor: VERDE_P });
    brilho(x + 10, yy + 3, t);
  });
  // combate
  y = 202;
  if (ap(60)) {
    texto(b, "COMBATE", 42, y, { cor: ROTULO });
    ret(b, 42, y + 9, 276, 1, [150, 110, 70]);
  }
  if (ap(62)) {
    const txt = `PV ${a.pvMax} → ${l.pvMax}`;
    texto(b, txt, 42, y + 14, { cor: TINTA_P });
    const dx = 42 + medir(txt) + 16;
    const rp = subida.rolagemPV;
    if (q < 80) d20Icone(b, dx, y + 17, 6, [200, 200, 210], String(1 + Math.floor(rnd(q, 5) * rp.dado)));
    else {
      d20Icone(b, dx, y + 17, 6, [60, 160, 80], String(rp.valor));
      texto(b, `+${rp.ganho}`, dx + 10, y + 14, { cor: VERDE_P });
      texto(b, `(D${rp.dado} = ${rp.valor} ${rp.con >= 0 ? "+" : "-"} ${Math.abs(rp.con)} CON)`, dx + 10 + medir(`+${rp.ganho}`) + 5, y + 14, { cor: [110, 80, 50] });
      brilho(dx + 14, y + 17, 80);
    }
  }
  if (ap(92)) {
    const atq = atqArma(l);
    const pbA = prof(a);
    const pbD = prof(l);
    let txt = `CA ${l.ca} · ATAQUE +${atq}`;
    if (CLASSE[l.classe].conjura) txt += ` · CD MAGIA ${cdMagia(l)}`;
    texto(b, txt, 42, y + 26, { cor: TINTA_P });
    if (pbD > pbA) texto(b, `+${pbD - pbA}`, 42 + medir(txt) + 4, y + 26, { cor: VERDE_P });
  }
  if (ap(100)) {
    const info = CLASSE[l.classe];
    if (info.conjurador !== "nenhum") {
      const ea = ESPACOS[info.conjurador][Math.min(5, a.nivel)];
      const ed = ESPACOS[info.conjurador][Math.min(5, l.nivel)];
      let x = 42 + texto(b, "ESPAÇOS DE MAGIA ", 42, y + 38, { cor: TINTA_P }) + 6;
      ed.forEach((n, ci) => {
        if (!n) return;
        x += texto(b, `${ci + 1}:`, x, y + 38, { cor: TINTA_P }) + 3;
        for (let k = 0; k < n; k++) {
          const novo = k >= (ea[ci] ?? 0);
          texto(b, "●", x, y + 38, { cor: novo ? VERDE_P : TINTA_P });
          if (novo) brilho(x + 2, y + 41, 104);
          x += 7;
        }
        x += 6;
      });
    } else texto(b, `PROFICIÊNCIA +${prof(l)} · DESLOCAMENTO ${l.desloc} PÉS`, 42, y + 38, { cor: TINTA_P });
  }
  // poderes
  y = 256;
  if (ap(116)) {
    texto(b, "PODERES", 42, y, { cor: ROTULO });
    ret(b, 42, y + 9, 276, 1, [150, 110, 70]);
  }
  const antigos = poderesAntigos(a);
  let yy = y + 14;
  antigos.forEach((p, i) => {
    if (!ap(120 + i * 6)) return;
    const linhas = quebrar(`· ${p}`, 276);
    texto(b, linhas[0], 42, yy, { cor: TINTA_P });
    yy += 10;
  });
  if (!ap(120)) yy += antigos.length * 10;
  subida.novosPoderes.forEach(([nome, desc], i) => {
    const t = 120 + antigos.length * 6 + 6 + i * 14;
    if (!ap(t)) return;
    const w0 = texto(b, "NOVO!", 42, yy, { cor: [255, 255, 255], contorno: VERDE_P });
    texto(b, nome, 42 + w0 + 6, yy, { cor: VERDE_P });
    brilho(42 + w0 + 10, yy + 3, t);
    yy += 10;
    for (const ln of quebrar(desc, 260)) {
      texto(b, ln, 54, yy, { cor: [90, 110, 70] });
      yy += 10;
    }
  });
  // história letra por letra
  const tH = 120 + antigos.length * 6 + 6 + subida.novosPoderes.length * 14 + 10;
  y = Math.max(yy + 4, 340);
  if (ap(tH)) {
    texto(b, "HISTÓRIA", 42, y, { cor: ROTULO });
    ret(b, 42, y + 9, 276, 1, [150, 110, 70]);
    const linhas = quebrar(subida.historia, 276);
    let resto = Math.floor((q - tH - 4) * 1.6);
    linhas.forEach((ln, i) => {
      if (resto <= 0) return;
      texto(b, ln, 42, y + 14 + i * 10, { cor: TINTA_P, max: resto });
      resto -= ln.length + 1;
    });
    const fimH = tH + 4 + Math.ceil(subida.historia.length / 1.6);
    // rodapé
    if (ap(fimH + 8)) {
      const yr = Math.min(486, y + 14 + linhas.length * 10 + 8);
      textoCentro(b, c.ep.textos.defende, 180, yr, { cor: ROTULO });
      if (l.autor) textoCentro(b, `CRIADO POR ${l.autor}`, 180, yr + 11, { cor: TINTA_P });
    }
    // selo de cera com d20
    if (ap(fimH + 16)) {
      const d = q - fimH - 16;
      const sc = d < 4 ? 1.6 - d * 0.15 : 1;
      elipse(b, 180, 508, 13 * sc, 12 * sc, [150, 24, 34]);
      elipse(b, 180, 508, 10 * sc, 9 * sc, [176, 36, 46]);
      d20Icone(b, 180, 508, 6 * sc, [200, 60, 70], null);
    }
  }
};

const poderesAntigos = (l: Lutador) => {
  const lista: string[] = [];
  const tab = CLASSE_PODERES[l.classe];
  for (let n = 1; n <= l.nivel; n++) for (const p of tab[n] ?? []) lista.push(p[0]);
  for (const t of ESPECIE[l.especie].tracos) lista.push(t);
  if (l.estilo) lista.push(`ESTILO DE LUTA: ${l.estilo.toUpperCase()}`);
  return lista.slice(0, 8);
};

// ─────────────────────────── CTA ───────────────────────────
const desenharCTA = (b: Buf, c: Cena, g: number) => {
  const t = g - T.cta;
  if (t < 0) return;
  const al = Math.min(1, t / 10);
  for (let i = 0; i < W * H; i++) {
    b.d[i * 4] *= 1 - 0.7 * al;
    b.d[i * 4 + 1] *= 1 - 0.7 * al;
    b.d[i * 4 + 2] *= 1 - 0.65 * al;
  }
  const tx = c.ep.textos;
  const l = c.subida.depois;
  const s = sprite(c, l, { anim: "vitoria", f: Math.floor(g / 7) % 4, dir: "S", expr: "vitoria", rasgado: false }, true);
  colarEscala(b, s, 180 - 48, 214, 2, { alfa: al });
  const linhas: [string, number, RGB, number][] = [
    [tx.cta1, 352, [255, 255, 255], 2],
    [tx.cta2, 372, [255, 255, 255], 2],
    [tx.cta3, 400, OURO, 2],
  ];
  linhas.forEach(([s2, y, cor, e], i) => {
    const tt = t - 6 - i * 8;
    if (tt < 0) return;
    const esc = medir(s2, e) > 292 ? 1 : e;
    textoCentro(b, s2, 180, y + (1 - eOut(tt / 8)) * 10, { escala: esc, cor, contorno: TINTA, alfa: Math.min(1, tt / 6) });
  });
  if (t > 34) {
    const tt = t - 34;
    caixa(b, 180 - medir(c.ep.perfil, 2) / 2 - 12, 440, medir(c.ep.perfil, 2) + 24, 24, [120, 30, 40], Math.min(1, tt / 6));
    textoCentro(b, c.ep.perfil, 180, 446, { escala: 2, cor: [255, 255, 255], contorno: TINTA, alfa: Math.min(1, tt / 6) });
    d20Icone(b, 180 - medir(c.ep.perfil, 2) / 2 - 26, 452, 8, [200, 60, 60], "20");
    d20Icone(b, 180 + medir(c.ep.perfil, 2) / 2 + 26, 452, 8, [200, 60, 60], "20");
  }
};

// ─────────────────────────── quadro completo ───────────────────────────
const bufMundo = novoBuf(W, H);
const bufFinal = novoBuf(W, H);

export const desenharQuadro = (c: Cena, g: number): Buf => {
  const { L } = c;
  ret(bufMundo, 0, 0, W, H, [0, 0, 0]);
  const estados = desenharMundo(bufMundo, c, g);
  // câmera: zoom no duelo e na vitória, tremor nos golpes fortes
  let zoom = 1;
  let cx = W / 2;
  let cy = H / 2;
  let sx = 0;
  let sy = 0;
  const g0 = T.duelo;
  if (L.temDuelo && L.finalistas && g >= g0 && g < T.vencedor) {
    const [a, d] = L.finalistas;
    const k = eOut((g - g0) / 20);
    zoom = 1 + 0.2 * k;
    cx = W / 2 + ((estados[a].x + estados[d].x) / 2 - W / 2) * k;
    cy = H / 2 + ((estados[a].y + estados[d].y) / 2 - 20 - H / 2) * k;
  }
  if (g >= T.vencedor && g < T.pergaminho + 30) {
    const v = estados[L.vencedor];
    const k = eOut((g - T.vencedor) / 20);
    zoom = 1.2 + 0.05 * k;
    cx = W / 2 + (v.x - W / 2) * k;
    cy = H / 2 + (v.y - 110 - H / 2) * k;
  }
  // limita para não mostrar fora do cenário
  const meiaW = W / 2 / zoom;
  const meiaH = H / 2 / zoom;
  cx = clamp(cx, meiaW, W - meiaW);
  cy = clamp(cy, meiaH, H - meiaH);
  if (g >= T.batalha && g < T.vencedor && !congelamentoEm(L, g)) {
    const w = mundo(L, g);
    for (const tr of L.tremores) {
      const d = w - tr.tw;
      if (d < 0 || d > 8) continue;
      const f = tr.forca * (1 - d / 8) * (L.temDuelo && g >= T.duelo ? 1.6 : 1);
      sx += Math.round((rnd(g, 1) - 0.5) * 2 * f);
      sy += Math.round((rnd(g, 2) - 0.5) * 2 * f);
    }
  }
  camera(bufFinal, bufMundo, zoom, cx, cy, sx, sy);
  // interface (fora da câmera)
  if (g < T.pergaminho + 20) desenharHUD(bufFinal, c, g);
  if (g < T.batalha + 10) desenharIntro(bufFinal, c, g);
  if (g >= T.batalha && g < T.vencedor) bannerCaiu(bufFinal, c, g);
  cutIn(bufFinal, c, g);
  desenharVitoria(bufFinal, c, g);
  desenharPergaminho(bufFinal, c, g);
  desenharCTA(bufFinal, c, g);
  void anel;
  void modAtr;
  return bufFinal;
};

export type { Arena };
