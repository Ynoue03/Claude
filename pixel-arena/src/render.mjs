// Renderização de um quadro: mundo (cenário + lutadores + efeitos) e interface (HUD, banners, cut-ins),
// compostos em 1080×1920 (pixels 3×, vizinho mais próximo; zoom e tremor de câmera no mundo).
import { Img, hex, rgba, comAlfa } from './img.mjs';
import { texto, larguraTexto } from './fonte.mjs';
import { cenarioEstatico, desenharAgua, W, H } from './cenario.mjs';
import { PERSONAGENS } from './sprites/personagens.mjs';
import { materiais, montar, retrato } from './sprites/corpo.mjs';
import { desenharEfeito, desenharStatus } from './efeitos.mjs';
import { TEMPO } from './sim.mjs';
import { hash } from './rng.mjs';

export const SAIDA_W = 1080, SAIDA_H = 1920, ESC = 3;
const PRETO = hex('#0E0C18'), BRANCO = hex('#FFFFFF'), AMARELO = hex('#FFD84A'), CONTORNO = hex('#1A1424');
const HUD = { x: 32, y: 75, cw: 74, ch: 22 };

export function criarRenderizador(dados, sim) {
  const L = dados.lutadores;
  const defs = L.map((l) => PERSONAGENS[l.id]);
  const pal = defs.map((d) => materiais(d));
  const cacheS = new Map(), cacheR = new Map();
  const cen = cenarioEstatico();
  const mundo = new Img(W, H), ui = new Img(W, H);

  function sprite(i, o) {
    const k = `${i}|${o.anim}|${o.quadro}|${o.vista}|${o.flip ? 1 : 0}|${o.expr}|${o.ferido ? 1 : 0}|${o.especial ? 1 : 0}`;
    let s = cacheS.get(k);
    if (!s) { s = montar(defs[i], pal[i].mats, pal[i].M, o); cacheS.set(k, s); }
    return s;
  }
  function ret(i, o) {
    const k = `${i}|${JSON.stringify(o)}`;
    let r = cacheR.get(k);
    if (!r) { r = retrato(defs[i], pal[i].mats, pal[i].M, o); cacheR.set(k, r); }
    return r;
  }
  const mini = (i, expr, ferido) => ret(i, { w: 16, h: 16, e: 0.7, hx: 8, hy: 9.5, expr, ferido });

  // estado visual (animação, quadro, vista, expressão) a partir do snapshot
  function visual(i, s, q) {
    const tick = q.tick, dt = tick - s.t0;
    const baixo = s.hp / s.hpMax < 0.3;
    let o = { anim: 'idle', quadro: 0, vista: s.vista, flip: s.vista === 'lado' && s.face > 0, expr: baixo ? 'cansado' : 'foco', ferido: baixo, especial: false };
    if (q.fase === 'intro') return { ...o, vista: 'frente', flip: false, quadro: Math.floor(q.f / 8 + i * 1.3) % 4, expr: 'neutra', ferido: false };
    switch (s.estado) {
      case 'idle': o.quadro = Math.floor((tick + i * 5) / 8) % 4; break;
      case 'andar': o.anim = 'andar'; o.quadro = Math.floor(s.passo) % 6; break;
      case 'ataque': o.anim = 'ataque'; o.quadro = Math.min(3, Math.floor(dt / 3)); o.expr = o.quadro === 1 || o.quadro === 2 ? 'grito' : 'foco'; break;
      case 'especial': o.anim = 'especial'; o.quadro = Math.min(7, Math.floor(dt / 3)); o.expr = 'grito'; o.especial = true; break;
      case 'dano': o.anim = 'dano'; o.quadro = Math.min(1, Math.floor(dt / 4)); o.expr = 'dor'; break;
      case 'derrota': o.anim = 'derrota'; o.quadro = dt < 5 ? 0 : dt < 10 ? 1 : dt < 13 ? 3 : 2; o.expr = 'derrota'; o.ferido = true; break;
      case 'vitoria': o = { ...o, anim: 'vitoria', vista: 'frente', flip: false, quadro: Math.floor(dt / 6) % 4, expr: 'vitoria' }; break;
    }
    return o;
  }

  // ───────── mundo ─────────
  function desenharMundo(f) {
    const q = sim.quadros[f];
    desenharAgua(mundo, f, cen.ilha);
    mundo.blit(cen.img, 0, 0);
    const lut = q.lut.map((s, i) => ({ s, i })).filter(({ s }) => s.visivel).sort((a, b) => a.s.y - b.s.y);
    const pos = (i) => { const s = q.lut[i]; return { x: s.x, y: s.y, face: s.face }; };
    // sombras no chão
    for (const { s } of lut) mundo.elipse(s.x, s.y + 1, 11, 3.6, rgba(18, 30, 24, 105));
    for (const { s, i } of lut) {
      const v = visual(i, s, q);
      const sp = sprite(i, v);
      let dx = 0;
      if (s.estado === 'dano') dx = (q.tick - s.t0) < 4 ? (s.face > 0 ? -1 : 1) : 0;
      const dt = q.tick - s.t0;
      if (s.estado === 'derrota' && dt > 34 && Math.floor(dt / 2) % 2 === 0) continue; // pisca antes de sumir
      const o = {};
      if (s.flash) { o.tinta = BRANCO; o.tintaK = 0.85; }
      else if (s.status === 'FRZ') { o.tinta = hex('#9FEFFF'); o.tintaK = 0.45; }
      else if (s.status === 'PAR' && q.tick % 8 < 2) { o.tinta = hex('#FFF2A0'); o.tintaK = 0.5; }
      else if (s.status === 'BRN' && q.tick % 10 < 2) { o.tinta = hex('#FF7A3A'); o.tintaK = 0.35; }
      mundo.blit(sp, Math.round(s.x) - 32 + dx, Math.round(s.y) - 68, o);
      if (s.status) desenharStatus(mundo, Math.round(s.x), Math.round(s.y), s.status, q.tick);
    }
    // efeitos
    for (const e of sim.efeitos) {
      const lt = q.tick - e.t0;
      if (lt < 0 || lt > e.dur) continue;
      desenharEfeito(mundo, e, lt, { pos, sprite: (i, anim, quadro) => ({ img: sprite(i, { anim, quadro, vista: 'lado', flip: false, expr: 'grito', ferido: false, especial: false }) }) });
    }
    // barras de HP + status
    if (q.fase !== 'intro' && q.fase !== 'vitoria') for (const { s } of lut) {
      if (s.estado === 'derrota') continue;
      const x = Math.round(s.x) - 11, y = Math.round(s.y) + 4;
      const r = s.hp / s.hpMax;
      mundo.rect(x, y, 22, 4, PRETO);
      const cor = r > 0.5 ? hex('#4BD86A') : r > 0.25 ? hex('#F2D04A') : hex('#E8463E');
      const w = Math.max(1, Math.round(20 * r));
      mundo.rect(x + 1, y + 1, w, 2, cor);
      mundo.rect(x + 1, y + 2, w, 1, comAlfa(0, 70));
      if (s.status) {
        const c = s.status === 'BRN' ? hex('#E8601E') : s.status === 'PAR' ? hex('#E8C21E') : hex('#3FB8E0');
        mundo.rect(x + 3, y + 5, 15, 7, PRETO);
        mundo.rect(x + 4, y + 6, 13, 5, c);
        texto(mundo, s.status, x + 5, y + 6, { pequena: true, cor: BRANCO });
      }
    }
    // números de dano
    for (const t of sim.textos) {
      const lt = q.tick - t.t0;
      if (lt < 0 || lt > 26) continue;
      const k = lt < 18 ? 1 : 1 - (lt - 18) / 8;
      const y = Math.round(t.y - Math.min(lt, 10) * 1.2 - lt * 0.3);
      const str = String(t.valor);
      if (t.peq) texto(mundo, str, Math.round(t.x), y + 10, { pequena: true, centro: true, cor: hex(t.cor), contorno: CONTORNO, k });
      else texto(mundo, str, Math.round(t.x), y, { centro: true, escala: t.especial && lt < 4 ? 2 : 1, cor: hex(t.cor), contorno: CONTORNO, k });
    }
    // caixas com o nome do golpe
    for (const c of sim.caixas) {
      const lt = q.tick - c.t0;
      if (lt < 0 || lt > c.dur) continue;
      const s = q.lut[c.i];
      if (!s.visivel) continue;
      caixaGolpe(mundo, c, Math.round(s.x), Math.round(s.y) - 74 + (lt < 3 ? 3 - lt : 0));
    }
    // nomes na intro
    if (q.fase === 'intro') for (const { s, i } of lut) {
      const t0 = 18 + i * 4;
      if (f < t0) continue;
      const pop = f - t0 < 3 ? 1 : 0;
      etiqueta(mundo, L[i].nome, Math.round(s.x), Math.round(s.y) - 72 - pop);
    }
  }

  function caixaGolpe(img, c, cx, y) {
    const w = larguraTexto(c.nome) + 8, h = 13;
    let x = Math.round(cx - w / 2);
    x = Math.max(4, Math.min(W - 4 - w, x));
    img.rect(x, y, w, h, PRETO);
    img.rect(x + 1, y + 1, w - 2, h - 2, PRETO);
    const cor = hex(c.cor);
    img.rect(x + 2, y + 2, w - 4, h - 4, cor);
    if (c.cor2) img.rect(x + 2, y + h - 4, w - 4, 2, hex(c.cor2));
    img.rect(x + 2, y + 2, w - 4, 1, comAlfa(BRANCO, 90));
    texto(img, c.nome, x + 4, y + 3, { cor: c.corTexto ? hex(c.corTexto) : BRANCO, sombra: c.corTexto ? undefined : comAlfa(0, 150) });
  }
  function etiqueta(img, nome, cx, y) {
    const w = larguraTexto(nome, { pequena: true }) + 6;
    const x = Math.round(cx - w / 2);
    img.rect(x, y, w, 9, PRETO);
    img.rect(x + 1, y + 1, w - 2, 7, hex('#2A2340'));
    texto(img, nome, x + 3, y + 2, { pequena: true, cor: BRANCO });
  }

  // ───────── interface ─────────
  function desenharHUD(f, q) {
    const nVis = q.fase === 'intro' ? Math.min(16, Math.max(0, Math.floor((f - 18) / 4) + 1)) : 16;
    if (nVis <= 0) return;
    ui.rect(HUD.x - 4, HUD.y - 3, HUD.cw * 4 + 8, HUD.ch * 4 + 5, comAlfa(hex('#120F22'), 215));
    ui.moldura(HUD.x - 4, HUD.y - 3, HUD.cw * 4 + 8, HUD.ch * 4 + 5, hex('#4A4070'));
    for (let i = 0; i < nVis; i++) {
      const s = q.lut[i];
      const c = i % 4, r = Math.floor(i / 4);
      const x = HUD.x + c * HUD.cw, y = HUD.y + r * HUD.ch;
      const morto = !s.vivo || s.estado === 'derrota';
      const rr = s.hp / s.hpMax;
      const expr = morto ? 'derrota' : rr > 0.6 ? 'neutra' : rr > 0.3 ? 'foco' : 'cansado';
      const destaque = sim.cutins.some((k) => k.i === i && f >= k.f0 && f < k.f1 + 20);
      ui.rect(x + 1, y + 2, 18, 18, destaque && f % 4 < 2 ? AMARELO : morto ? hex('#3A3448') : hex('#6A5E98'));
      ui.rect(x + 2, y + 3, 16, 16, hex('#221C36'));
      ui.blit(mini(i, expr, rr < 0.3 || morto), x + 2, y + 3, { cinza: morto });
      if (morto) { for (let k = 0; k < 14; k++) { ui.set(x + 3 + k, y + 4 + k, hex('#E8363E')); ui.set(x + 4 + k, y + 4 + k, hex('#E8363E')); ui.set(x + 16 - k, y + 4 + k, hex('#E8363E')); ui.set(x + 17 - k, y + 4 + k, hex('#E8363E')); } }
      texto(ui, L[i].nome, x + 21, y + 4, { pequena: true, cor: morto ? hex('#6E6680') : BRANCO });
      // barra de HP
      ui.rect(x + 21, y + 12, 50, 5, PRETO);
      const cor = rr > 0.5 ? hex('#4BD86A') : rr > 0.25 ? hex('#F2D04A') : hex('#E8463E');
      const w = morto ? 0 : Math.max(1, Math.round(48 * rr));
      if (w) { ui.rect(x + 22, y + 13, w, 3, cor); ui.rect(x + 22, y + 13, w, 1, comAlfa(BRANCO, 80)); ui.rect(x + 22, y + 15, w, 1, comAlfa(0, 80)); }
    }
  }

  function bandaCutin(f0, f, i, golpe, yc, dir, o = {}) {
    const lt = f - f0, dur = o.dur ?? 18;
    const entra = Math.min(1, lt / 4), sai = lt > dur - 3 ? (lt - (dur - 3)) / 3 : 0;
    const off = Math.round((1 - (1 - (1 - entra) ** 3)) * -W * dir + sai * W * dir);
    const alt = 70, incl = 0.1 * dir;
    const cor = hex(golpe?.cor ?? '#E8463E');
    for (let x = -4; x < W + 4; x++) {
      const top = Math.round(yc - alt / 2 - (x - W / 2) * incl);
      for (let y = top - 4; y < top + alt + 4; y++) {
        const xx = x + off;
        if (y < top - 3 || y >= top + alt + 3) continue;
        if (y < top || y >= top + alt) { ui.set(xx, y, y === top - 1 || y === top + alt ? BRANCO : PRETO); continue; }
        const lin = hash(y >> 1, 3) < 0.35 ? (((x + lt * 22 + Math.floor(hash(y >> 1, 7) * 300)) % 90) < 30 ? 1 : 0) : 0;
        const base = ((y - top) / alt) < 0.5 ? cor : comAlfa(cor, 255);
        ui.set(xx, y, lin ? comAlfa(BRANCO, 255) : base);
        if (!lin && (y - top) / alt > 0.55) ui.mix(xx, y, rgba(0, 0, 0, 70));
      }
    }
    // retrato com moldura
    const r = ret(i, { expr: 'grito', especial: true, flip: dir < 0 });
    const px = (dir > 0 ? 34 : W - 34 - 96) + off, py = Math.round(yc - 32 - (px + 48 - W / 2) * incl);
    ui.rect(px - 2, py - 2, 100, 68, PRETO);
    ui.rect(px - 1, py - 1, 98, 66, BRANCO);
    ui.rect(px, py, 96, 64, hex('#1A1428'));
    // linhas de velocidade atrás do rosto
    for (let k = 0; k < 14; k++) { const yy = py + Math.floor(hash(k, 11) * 64); const xx = px + ((Math.floor(hash(k, 5) * 96) + lt * 9) % 96); ui.rect(xx, yy, 14, 1, comAlfa(cor, 200)); }
    ui.blit(r, px, py);
    return { px, py, off };
  }

  function textoCutin(nome, golpe, x, y, alinha) {
    const longo = larguraTexto(golpe.nome, { escala: 2 }) > 180;
    const partes = longo ? golpe.nome.split(' ').reduce((acc, p) => { const l = acc[acc.length - 1]; if (l && larguraTexto(l + ' ' + p, { escala: 2 }) <= 180) acc[acc.length - 1] = l + ' ' + p; else acc.push(p); return acc; }, []) : [golpe.nome];
    texto(ui, nome, x, y, { cor: AMARELO, contorno: PRETO });
    partes.forEach((p, k) => texto(ui, p, x, y + 11 + k * 17, { escala: 2, cor: BRANCO, contorno: PRETO, sombra2: hex(golpe.cor) }));
    void alinha;
  }

  function desenharUI(f) {
    ui.fill(0);
    const q = sim.quadros[f];
    // HUD
    if (f < TEMPO.vitoria) desenharHUD(f, q);
    // anúncios de derrota
    for (const a of sim.anuncios) {
      const lt = f - a.f0;
      if (lt < 0 || lt > 54) continue;
      const nome = (dados.banner?.derrota ?? '{NOME} DEFEATED!').replace('{NOME}', L[a.i].nome);
      const w = larguraTexto(nome) + 30;
      const k = lt < 5 ? lt / 5 : lt > 48 ? 1 - (lt - 48) / 6 : 1;
      const x = Math.round(W / 2 - w / 2 + (1 - k) * (lt < 5 ? 120 : -120)), y = 172;
      ui.rect(x - 2, y - 2, w + 4, 24, PRETO);
      ui.rect(x, y, w, 20, hex('#B8262E'));
      ui.rect(x, y, w, 2, hex('#E8565E'));
      ui.rect(x, y + 17, w, 3, hex('#7E1A24'));
      ui.rect(x + 3, y + 2, 16, 16, hex('#221C36'));
      ui.blit(mini(a.i, 'derrota', true), x + 3, y + 2);
      texto(ui, nome, x + 23, y + 7, { cor: BRANCO, sombra: hex('#5A0E16') });
    }
    // intro
    if (q.fase === 'intro' || f < TEMPO.luta + 20) intro(f);
    // cut-ins
    for (const c of sim.cutins) {
      if (f < c.f0 || f >= c.f1) continue;
      if (c.duplo) cutinDuplo(c, f);
      else {
        const { px, py, off } = bandaCutin(c.f0, f, c.i, c.golpe, 318, 1);
        textoCutin(L[c.i].nome, c.golpe, px + 106 - off * 0 + 0, py + 8, 'esq');
        if (f - c.f0 < 2) ui.rect(0, 0, W, H, comAlfa(BRANCO, 150));
      }
    }
    // vitória e CTA
    if (f >= TEMPO.vitoria) vitoria(f);
    if (f >= TEMPO.cta) cta(f);
  }

  function intro(f) {
    const tit = dados.titulo ?? 'ANIME PIXEL ARENA';
    if (f < 96) {
      const k = Math.min(1, f / 8) * (f > 86 ? Math.max(0, 1 - (f - 86) / 10) : 1);
      const y = 318 - Math.round((1 - Math.min(1, f / 8)) * 20);
      const [a, b] = tit.split(' PIXEL ').length === 2 ? [tit.split(' PIXEL ')[0], 'PIXEL ' + tit.split(' PIXEL ')[1]] : [tit, ''];
      texto(ui, a, W / 2, y, { escala: 3, centro: true, cor: AMARELO, contorno: PRETO, sombra2: hex('#E8463E'), k });
      if (b) texto(ui, b, W / 2, y + 26, { escala: 3, centro: true, cor: BRANCO, contorno: PRETO, sombra2: hex('#2F7FE8'), k });
    }
    if (f >= 30 && f < 84) {
      const lt = f - 30, k = Math.min(1, lt / 5);
      const txt = dados.banner?.escolha ?? 'CHOOSE YOUR FIGHTER!';
      const w = larguraTexto(txt, { escala: 2 }) + 16;
      const x = Math.round(W / 2 - w / 2 - (1 - k) * 200);
      ui.rect(x - 2, 498, w + 4, 26, PRETO);
      ui.rect(x, 500, w, 22, hex('#2F57C8'));
      ui.rect(x, 500, w, 3, hex('#6F97FF'));
      if (f % 16 < 12) texto(ui, txt, x + 8, 504, { escala: 2, cor: BRANCO, sombra: hex('#14205A') });
    }
    const conta = [[84, '3'], [104, '2'], [124, '1'], [144, dados.banner?.luta ?? 'FIGHT!']];
    for (const [t0, s] of conta) {
      const lt = f - t0;
      if (lt < 0 || lt >= (s.length > 1 ? 30 : 20)) continue;
      const esc = s.length > 1 ? (lt < 3 ? 7 : 5) : lt < 3 ? 10 - lt : 7;
      const k = lt > 14 ? Math.max(0, 1 - (lt - 14) / 8) : 1;
      texto(ui, s, W / 2, 300 - esc * 3, { escala: esc, centro: true, cor: s.length > 1 ? AMARELO : BRANCO, contorno: PRETO, sombra2: hex('#E8463E'), k });
    }
  }

  function cutinDuplo(c, f) {
    const [a, b] = c.duplo;
    const lt = f - c.f0;
    ui.rect(0, 0, W, H, comAlfa(PRETO, 120));
    const A = bandaCutin(c.f0, f, a, L[a].golpes.find((g) => g.especial) ?? L[a].golpes[0], 252, 1, { dur: c.f1 - c.f0 });
    const B = bandaCutin(c.f0 + 3, f, b, L[b].golpes.find((g) => g.especial) ?? L[b].golpes[0], 402, -1, { dur: c.f1 - c.f0 - 3 });
    texto(ui, L[a].nome, A.px + 108, A.py + 20, { escala: 2, cor: BRANCO, contorno: PRETO });
    texto(ui, L[b].nome, B.px - 12 - larguraTexto(L[b].nome, { escala: 2 }), B.py + 30, { escala: 2, cor: BRANCO, contorno: PRETO });
    if (lt >= 6) {
      const esc = lt < 9 ? 8 : 6;
      texto(ui, 'VS', W / 2, 327 - esc * 3, { escala: esc, centro: true, cor: AMARELO, contorno: PRETO, sombra2: hex('#E8463E') });
    }
    const txt = dados.banner?.duelo ?? 'FINAL DUEL';
    texto(ui, txt, W / 2, 180, { escala: 2, centro: true, cor: BRANCO, contorno: PRETO, sombra2: hex('#E8463E') });
    if (lt < 2) ui.rect(0, 0, W, H, comAlfa(BRANCO, 160));
  }

  function vitoria(f) {
    const lt = f - TEMPO.vitoria;
    const v = sim.vencedor;
    // confetes
    const cores = ['#FFD84A', '#E8463E', '#4BD86A', '#2F8FE8', '#F28CC8', '#FFFFFF'].map((c) => hex(c));
    for (let k = 0; k < 90; k++) {
      const t = lt - hash(k, 1) * 40;
      if (t < 0) continue;
      const x = (hash(k, 2) * W + Math.sin(t * 0.12 + k) * 8) % W;
      const y = -10 + ((t * (1.2 + hash(k, 3) * 1.4) + hash(k, 4) * 120) % (H + 20));
      const c = cores[k % cores.length];
      const vira = Math.floor(t / 4 + k) % 3;
      ui.rect(Math.round(x), Math.round(y), vira === 1 ? 1 : 3, vira === 2 ? 1 : 2, c);
    }
    if (f >= TEMPO.cta) return;
    const k = Math.min(1, lt / 6);
    const txt = (dados.banner?.vencedor ?? 'WINNER: {NOME}!').replace('{NOME}', L[v].nome);
    const w = larguraTexto(txt, { escala: 2 }) + 20;
    const x = Math.round(W / 2 - w / 2), y = 176 - Math.round((1 - k) * 16);
    ui.rect(x - 3, y - 3, w + 6, 30, PRETO);
    ui.rect(x, y, w, 24, hex('#D8A21E'));
    ui.rect(x, y, w, 3, hex('#FFE27A'));
    ui.rect(x, y + 20, w, 4, hex('#9A6A10'));
    texto(ui, txt, W / 2, y + 5, { escala: 2, centro: true, cor: BRANCO, sombra: hex('#6A4208') });
    // retrato grande sorrindo
    if (lt >= 8) {
      const r = ret(v, { w: 150, h: 104, e: 3.1, hx: 75, hy: 50, expr: 'vitoria' });
      const ky = Math.min(1, (lt - 8) / 6);
      const px = Math.round(W / 2 - 75), py = 410 + Math.round((1 - ky) * 30);
      ui.rect(px - 3, py - 3, 156, 110, PRETO);
      ui.rect(px - 2, py - 2, 154, 108, AMARELO);
      ui.rect(px, py, 150, 104, hex('#2A2148'));
      for (let j = 0; j < 12; j++) { const a = j * 0.52 + lt * 0.03; for (let s = 10; s < 90; s += 2) ui.mix(Math.round(px + 75 + Math.cos(a) * s), Math.round(py + 52 + Math.sin(a) * s * 0.7), comAlfa(hex('#4A3A80'), 255)); }
      ui.blit(r, px, py);
    }
  }

  function cta(f) {
    const lt = f - TEMPO.cta, k = Math.min(1, lt / 6);
    ui.rect(0, 0, W, H, comAlfa(PRETO, Math.round(150 * k)));
    const [l1, l2] = dados.banner?.cta ?? ['Quem ganha na próxima?', 'Comente seu favorito!'];
    const y0 = 262 + Math.round((1 - k) * 14);
    const w = 300;
    ui.rect(W / 2 - w / 2 - 3, y0 - 3, w + 6, 122, PRETO);
    ui.rect(W / 2 - w / 2, y0, w, 116, hex('#221C40'));
    ui.moldura(W / 2 - w / 2 + 2, y0 + 2, w - 4, 112, hex('#6A5EB0'));
    texto(ui, l1, W / 2, y0 + 16, { escala: 2, centro: true, cor: BRANCO, contorno: PRETO, k });
    texto(ui, l2, W / 2, y0 + 44, { escala: 2, centro: true, cor: AMARELO, contorno: PRETO, k });
    // balão de comentário + @perfil
    const perfil = dados.perfil ?? '@perfil';
    const pw = larguraTexto(perfil, { escala: 2 }) + 30;
    const px = Math.round(W / 2 - pw / 2), py = y0 + 78;
    ui.rect(px, py, pw, 24, hex('#E8463E'));
    ui.rect(px, py, pw, 3, hex('#FF8A8A'));
    ui.rect(px + 5, py + 6, 12, 9, BRANCO); ui.rect(px + 7, py + 15, 3, 2, BRANCO);
    texto(ui, perfil, px + 22, py + 5, { escala: 2, cor: BRANCO, sombra: hex('#7A1A20') });
  }

  // ───────── composição final em 1080×1920 ─────────
  const saida = new Uint32Array(SAIDA_W * SAIDA_H);
  const mapX = new Int32Array(SAIDA_W), mapY = new Int32Array(SAIDA_H);
  function quadro(f) {
    const q = sim.quadros[f];
    desenharMundo(f);
    desenharUI(f);
    const { zoom, cx, cy, sx, sy } = q.cam;
    for (let X = 0; X < SAIDA_W; X++) mapX[X] = Math.max(0, Math.min(W - 1, Math.floor(cx + (X / ESC - W / 2) / zoom + sx)));
    for (let Y = 0; Y < SAIDA_H; Y++) mapY[Y] = Math.max(0, Math.min(H - 1, Math.floor(cy + (Y / ESC - H / 2) / zoom + sy)));
    // escurece o mundo durante cut-ins
    const cut = sim.cutins.find((c) => f >= c.f0 && f < c.f1);
    const escurece = cut ? 0.45 : 1;
    const md = mundo.d, ud = ui.d;
    for (let Y = 0; Y < SAIDA_H; Y++) {
      const linM = mapY[Y] * W, linU = Math.floor(Y / ESC) * W, o = Y * SAIDA_W;
      for (let X = 0; X < SAIDA_W; X++) {
        let c = md[linM + mapX[X]];
        if (escurece < 1) c = (((c & 255) * escurece) | ((((c >>> 8) & 255) * escurece) << 8) | ((((c >>> 16) & 255) * escurece) << 16) | 0xff000000) >>> 0;
        const u = ud[linU + Math.floor(X / ESC)];
        const a = u >>> 24;
        if (a === 255) c = u;
        else if (a) {
          const k = a / 255, ik = 1 - k;
          c = ((((c & 255) * ik + (u & 255) * k) | 0) | (((((c >>> 8) & 255) * ik + ((u >>> 8) & 255) * k) | 0) << 8) | (((((c >>> 16) & 255) * ik + ((u >>> 16) & 255) * k) | 0) << 16) | 0xff000000) >>> 0;
        }
        saida[o + X] = c | 0xff000000;
      }
    }
    return saida;
  }
  return { quadro, mundo, ui, sprite, ret };
}
