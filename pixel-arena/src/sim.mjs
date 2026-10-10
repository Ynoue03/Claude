// Simulação determinística da luta (FFA). Produz, para cada quadro do vídeo, o estado de todos os
// lutadores + listas de efeitos, textos, caixas de golpe, anúncios, cut-ins e eventos de áudio.
//
// O "diretor" agenda as eliminações (espalhadas de ~10 s a ~68 s; duelo final 70–80 s) e a IA simples
// faz o resto: anda, persegue o inimigo mais próximo, foge com HP baixo e ataca no alcance.
import { rng } from './rng.mjs';
import { CENTRO, LIMITES, PEDRA } from './cenario.mjs';

export const FPS = 30;
export const TEMPO = { luta: 150, duelo: 2100, vitoria: 2400, cta: 2610, total: 2700 };
const CUTIN = 18;             // 0,6 s de congelamento
const VS = 48;                // cut-in duplo do duelo
const INTERVALO_CUTIN = 135;  // ≥ 4,5 s entre cut-ins
const ANIM_TICKS = { ataque: 3, especial: 3, dano: 4 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function simular(dados) {
  const R = rng(dados.seed ?? 1);
  const N = dados.lutadores.length;
  const L = dados.lutadores.map((d, i) => ({
    i, d, id: d.id, nome: d.nome, hpMax: d.hp, hp: d.hp, vel: d.vel ?? 1, dano: d.dano ?? 1,
    x: 0, y: 0, vx: 0, vy: 0, face: 1, vista: 'frente',
    vivo: true, visivel: true, estado: 'idle', t0: 0, cd: 0, alvo: -1, golpe: null, acertou: false,
    status: null, flashAte: -1, kx: 0, ky: 0, D: Infinity, forcado: -1, matou: false, passo: 0,
  }));

  // ── vencedor e ordem das eliminações ──
  const idx = (id) => L.findIndex((f) => f.id === id);
  const vencedor = dados.vencedor && idx(dados.vencedor) >= 0 ? idx(dados.vencedor) : Math.floor(R() * N);
  const ordem = R.embaralha(L.map((f) => f.i).filter((i) => i !== vencedor));
  const vice = ordem.pop();
  const n = ordem.length;
  let t = 0;
  ordem.forEach((i, k) => {
    let D = Math.round(300 + (k * (2030 - 300)) / Math.max(1, n - 1) + R.entre(-22, 22));
    D = Math.max(D, t + 82);
    L[i].D = D; t = D;
  });
  L[vice].D = 2372;
  const agenda = [...ordem, vice].map((i) => ({ i, D: L[i].D, executor: -1, feito: false, especial: false }));

  // piso de HP: a curva que leva cada um ao seu momento de queda
  const piso = (F, f) => {
    if (F.i === vencedor) return F.hpMax * (f < TEMPO.duelo ? 0.5 : 0.5 - 0.25 * clamp((f - TEMPO.duelo) / 270, 0, 1));
    if (F.i === vice) return F.hpMax * (f < TEMPO.duelo ? 0.94 - 0.48 * clamp((f - TEMPO.luta) / (TEMPO.duelo - TEMPO.luta), 0, 1) : 0.46 * clamp((F.D - f) / (F.D - TEMPO.duelo), 0.03, 1));
    const k = clamp((F.D - f) / (F.D - TEMPO.luta), 0, 1);
    return F.hpMax * (0.035 + 0.9 * k);
  };

  // posições iniciais em círculo
  const ordemCirculo = L.map((f) => f.i);
  ordemCirculo.forEach((i, k) => {
    const a = -Math.PI / 2 + (k / N) * Math.PI * 2;
    L[i].x = CENTRO[0] + Math.cos(a) * 122;
    L[i].y = CENTRO[1] + 4 + Math.sin(a) * 112;
  });

  const quadros = [], efeitos = [], textos = [], caixas = [], anuncios = [], cutins = [], audio = [];
  const som = (f, nome, vol = 1, extra = {}) => audio.push({ f, som: nome, vol, ...extra });
  let tick = 0, congeladoAte = -1, ultimoCutin = -999, proxEspecial = TEMPO.luta + 110;
  let tremor = 0, ultimoPasso = -99;
  let cutinPendente = null; // { i, golpe, alvo, letal, ate }

  const vivos = () => L.filter((f) => f.vivo);
  const golpeNormal = (F) => { const gs = F.d.golpes.filter((g) => !g.especial); return gs.length ? R.escolhe(gs) : F.d.golpes[0]; };
  const golpeEspecial = (F) => F.d.golpes.find((g) => g.especial) ?? F.d.golpes[F.d.golpes.length - 1];

  function escolherAlvo(F, f) {
    if (F.forcado >= 0 && L[F.forcado].vivo) return F.forcado;
    let melhor = -1, nota = Infinity;
    for (const G of L) {
      if (G === F || !G.vivo || G.estado === 'derrota') continue;
      const excesso = (G.hp - piso(G, f)) / G.hpMax;
      const s = dist(F, G) - excesso * 90 + (G.alvo === F.i ? -15 : 0);
      if (s < nota) { nota = s; melhor = G.i; }
    }
    return melhor;
  }

  function iniciarAtaque(F, golpe, alvo, especial, letal = false) {
    F.estado = especial ? 'especial' : 'ataque';
    F.t0 = tick; F.golpe = golpe; F.alvo = alvo; F.acertou = false; F.letal = letal;
    const A = L[alvo];
    if (A) F.face = A.x >= F.x ? 1 : -1;
    F.vista = 'lado';
    caixas.push({ t0: tick, dur: 30, i: F.i, nome: golpe.nome, cor: golpe.cor, cor2: golpe.cor2, corTexto: golpe.corTexto, especial });
    const ticksAte = especial ? 12 : 4;
    efeitos.push({ tipo: golpe.efeito, t0: tick, dur: especial ? 34 : 20, de: F.i, para: alvo, impacto: ticksAte, cor: golpe.cor, cor2: golpe.cor2, especial, xa: F.x, ya: F.y, xb: A?.x, yb: A?.y });
    F.cd = tick + (especial ? 70 : R.int(48, 82));
  }

  function aplicarDano(F, A, f) {
    if (!A.vivo || A.estado === 'derrota') return;
    const g = F.golpe;
    let dmg = g.poder * F.dano * R.entre(0.85, 1.15) * (F.estado === 'especial' ? 1.0 : 1);
    const p = piso(A, f);
    const excesso = Math.max(0, (A.hp - p) / A.hpMax);
    dmg *= 1 + excesso * 1.5;
    if (A.escudoAte > tick) dmg *= 0.4;
    let novo = A.hp - dmg;
    const letal = F.letal && A.i === F.forcado;
    if (letal) novo = 0;
    else novo = Math.max(novo, Math.max(1, Math.min(A.hp, p)));
    const real = Math.round(A.hp - novo);
    A.hp = novo;
    A.flashAte = tick + 3;
    const dx = A.x - F.x, dy = A.y - F.y, d = Math.hypot(dx, dy) || 1;
    const forca = F.estado === 'especial' ? 3.2 : 2;
    A.kx = (dx / d) * forca; A.ky = (dy / d) * forca * 0.6;
    textos.push({ t0: tick, x: A.x + R.entre(-6, 6), y: A.y - 60, valor: real, cor: F.estado === 'especial' ? '#FFD84A' : '#FFFFFF', especial: F.estado === 'especial' });
    if (g.status && (F.estado === 'especial' || R() < 0.55)) A.status = { tipo: g.status, ate: tick + (g.status === 'FRZ' ? 40 : g.status === 'PAR' ? 70 : 90) };
    som(f, 'hit', F.estado === 'especial' ? 1 : 0.7);
    if (A.hp <= 0) {
      A.estado = 'derrota'; A.t0 = tick; A.status = null;
      A.morteF = f;
      const plano = agenda.find((a) => a.i === A.i); if (plano) plano.feito = true;
      anuncios.push({ f0: f, i: A.i, por: F.i });
      som(f, 'derrota', 1);
      som(f + 4, 'banner', 0.8);
      for (const G of L) if (G.forcado === A.i) G.forcado = -1;
    } else {
      if (A.estado !== 'ataque' && A.estado !== 'especial') { A.estado = 'dano'; A.t0 = tick; }
      if (A.hp / A.hpMax < 0.3 && !A.avisouBaixo) { A.avisouBaixo = true; som(f, 'hpbaixo', 0.5); }
    }
  }

  for (let f = 0; f < TEMPO.total; f++) {
    const fase = f < TEMPO.luta ? 'intro' : f < TEMPO.duelo ? 'batalha' : f < TEMPO.vitoria ? 'duelo' : 'vitoria';
    const congelado = f < congeladoAte;

    // ── eventos de roteiro ──
    if (f === 0) som(0, 'intro', 1);
    if (f === 84) som(f, 'conta', 1, { n: 3 });
    if (f === 104) som(f, 'conta', 1, { n: 2 });
    if (f === 124) som(f, 'conta', 1, { n: 1 });
    if (f === 144) som(f, 'fight', 1);
    if (f === TEMPO.duelo) {
      const v = vivos();
      cutins.push({ f0: f, f1: f + VS, duplo: v.map((x) => x.i) });
      congeladoAte = f + VS; ultimoCutin = f; proxEspecial = f + 120;
      som(f, 'whoosh', 1); som(f + 6, 'estalo', 1);
    }
    if (f === TEMPO.vitoria) som(f, 'fanfarra', 1);

    if (!congelado && fase !== 'intro') {
      tick++;
      // ── diretor: execuções agendadas ──
      for (const a of agenda) {
        const V = L[a.i];
        if (a.feito || !V.vivo) continue;
        if (f >= a.D - 80 && a.executor < 0) {
          let melhor = -1, dm = Infinity;
          for (const G of L) if (G.vivo && G.i !== a.i && G.estado !== 'derrota') { const d = dist(G, V); if (d < dm) { dm = d; melhor = G.i; } }
          if (melhor >= 0) { a.executor = melhor; L[melhor].forcado = a.i; }
        }
        const E = L[a.executor];
        if (!E || !E.vivo) { a.executor = -1; continue; }
        // golpe especial como golpe final, se o intervalo de cut-in permitir
        if (!a.especial && f >= a.D - 30 && f - ultimoCutin >= (fase === 'duelo' ? 112 : INTERVALO_CUTIN - 10) && !cutinPendente && E.estado !== 'especial') {
          a.especial = true;
          const g = golpeEspecial(E);
          aproximar(E, V, g.alcance);
          cutins.push({ f0: f, f1: f + CUTIN, i: E.i, golpe: g });
          cutinPendente = { i: E.i, golpe: g, alvo: V.i, letal: true };
          congeladoAte = f + CUTIN; ultimoCutin = f; proxEspecial = f + INTERVALO_CUTIN + R.int(0, 25);
          som(f, 'whoosh', 1); som(f + 5, 'estalo', 1);
        } else if (!a.especial && f >= a.D - 6 && E.estado !== 'ataque' && E.estado !== 'especial') {
          const g = golpeNormal(E);
          if (dist(E, V) > g.alcance) { aproximar(E, V, g.alcance); efeitos.push({ tipo: 'dash', t0: tick, dur: 8, de: E.i, xa: E.ox, ya: E.oy, xb: E.x, yb: E.y }); }
          iniciarAtaque(E, g, V.i, false, true);
          som(f, 'golpe', 0.9, { efeito: g.efeito });
          a.especial = 'normal';
        }
      }
      if (congelado) { /* recém-congelado */ }
    }

    // dispara o especial pendente quando o cut-in termina
    if (cutinPendente && f >= congeladoAte) {
      const E = L[cutinPendente.i];
      if (E.vivo && E.estado !== 'derrota') {
        iniciarAtaque(E, cutinPendente.golpe, cutinPendente.alvo, true, cutinPendente.letal);
        som(f, 'especial', 1, { efeito: cutinPendente.golpe.efeito });
      }
      cutinPendente = null;
    }

    // especiais "livres" (não letais), no máximo 1 a cada ~4,5 s
    if (!congelado && (fase === 'batalha' || fase === 'duelo') && f >= proxEspecial && !cutinPendente) {
      const janela = fase === 'duelo' ? 100 : INTERVALO_CUTIN + 10;
      const proxMorte = agenda.find((a) => !a.feito && a.D - 30 >= f && a.D - 30 < f + janela);
      let disparou = false;
      if (!proxMorte) {
        const cand = vivos().filter((F) => F.estado === 'idle' || F.estado === 'andar');
        if (cand.length) {
          const E = fase === 'duelo' ? R.escolhe(cand) : R.escolhe(cand);
          const alvo = escolherAlvo(E, f);
          if (alvo >= 0) {
            const g = golpeEspecial(E);
            aproximar(E, L[alvo], g.alcance);
            cutins.push({ f0: f, f1: f + CUTIN, i: E.i, golpe: g });
            cutinPendente = { i: E.i, golpe: g, alvo, letal: false };
            congeladoAte = f + CUTIN; ultimoCutin = f; disparou = true;
            som(f, 'whoosh', 1); som(f + 5, 'estalo', 1);
          }
        }
      }
      // sem candidato livre agora: tenta de novo no próximo quadro
      if (disparou || proxMorte) proxEspecial = f + (fase === 'duelo' ? 105 : INTERVALO_CUTIN) + R.int(0, 30);
    }

    // ── atualização dos lutadores ──
    if (!congelado && fase !== 'intro') {
      for (const F of L) {
        if (!F.vivo) continue;
        const dt = tick - F.t0;
        if (F.estado === 'derrota') {
          if (dt >= 56) { F.vivo = false; F.visivel = false; efeitos.push({ tipo: 'poof', t0: tick, dur: 16, xa: F.x, ya: F.y }); som(f, 'poof', 0.7); }
          F.x += F.kx; F.y += F.ky; F.kx *= 0.8; F.ky *= 0.8;
          continue;
        }
        if (fase === 'vitoria') { F.estado = F.i === vencedor ? 'vitoria' : 'idle'; F.vista = 'frente'; continue; }
        // status
        if (F.status && tick >= F.status.ate) F.status = null;
        if (F.status?.tipo === 'BRN' && tick % 18 === 0) {
          const p = piso(F, f);
          if (F.hp - 2 > p) { F.hp -= 2; textos.push({ t0: tick, x: F.x, y: F.y - 58, valor: 2, cor: '#FF8A3A', peq: true }); }
        }
        // knockback
        F.x += F.kx; F.y += F.ky; F.kx *= 0.75; F.ky *= 0.75;
        if (F.estado === 'dano' && dt >= 8) F.estado = 'idle';
        if (F.estado === 'ataque' || F.estado === 'especial') {
          const esp = F.estado === 'especial';
          const hitT = esp ? 12 : 4;
          const A = L[F.alvo];
          if (!F.acertou && dt >= hitT) {
            F.acertou = true;
            if (A && A.vivo) aplicarDano(F, A, f);
            if (esp) tremor = fase === 'duelo' ? 9 : 5;
            if (F.golpe.efeito === 'infinito') F.escudoAte = tick + 60;
          }
          if (dt >= (esp ? 24 : 12)) { F.estado = 'idle'; F.letal = false; }
          continue;
        }
        if (F.estado === 'dano') continue;
        if (F.status?.tipo === 'FRZ') { F.estado = 'idle'; continue; }

        // IA: alvo, movimento, ataque
        const ai = escolherAlvo(F, f);
        F.alvo = ai;
        const A = L[ai];
        if (!A) { F.estado = 'idle'; continue; }
        const g = F.proxGolpe ?? (F.proxGolpe = golpeNormal(F));
        const d = dist(F, A);
        let dx = 0, dy = 0;
        const baixo = F.hp / F.hpMax < 0.3 && F.forcado < 0 && fase === 'batalha';
        if (baixo) {
          // foge do inimigo mais próximo
          let perto = null, dp = Infinity;
          for (const G of L) if (G !== F && G.vivo) { const dd = dist(F, G); if (dd < dp) { dp = dd; perto = G; } }
          if (perto && dp < 90) { dx = F.x - perto.x; dy = F.y - perto.y; }
          if (dp < g.alcance && tick >= F.cd) { iniciarAtaque(F, g, perto.i, false); som(f, 'golpe', 0.8, { efeito: g.efeito }); F.proxGolpe = null; continue; }
        } else if (d > g.alcance * 0.85) { dx = A.x - F.x; dy = A.y - F.y; }
        else if (g.alcance > 50 && d < g.alcance * 0.45) { dx = F.x - A.x; dy = F.y - A.y; }
        // ataque
        if (!baixo && d <= g.alcance && tick >= F.cd) {
          iniciarAtaque(F, g, A.i, false);
          som(f, 'golpe', 0.8, { efeito: g.efeito });
          F.proxGolpe = null;
          continue;
        }
        const m = Math.hypot(dx, dy);
        let vel = 0.82 * F.vel * (F.status?.tipo === 'PAR' ? 0.45 : 1) * (F.forcado >= 0 ? 1.5 : 1) * (fase === 'duelo' ? 1.15 : 1);
        let tx = 0, ty = 0;
        if (m > 0.5) { tx = (dx / m) * vel; ty = (dy / m) * vel; }
        // separação
        for (const G of L) {
          if (G === F || !G.vivo) continue;
          const sx = F.x - G.x, sy = F.y - G.y, sd = Math.hypot(sx, sy);
          if (sd < 17 && sd > 0.01) { tx += (sx / sd) * 0.5; ty += (sy / sd) * 0.35; }
        }
        // leve atração para o centro (a luta acontece na areia, não nas bordas)
        const cxp = CENTRO[0] - F.x, cyp = CENTRO[1] - F.y, dc = Math.hypot(cxp, cyp);
        if (dc > 70) { const k = Math.min(0.35, (dc - 70) / 220) * (baixo ? 0.4 : 1); tx += (cxp / dc) * k; ty += (cyp / dc) * k; }
        // pedra central
        const px = F.x - PEDRA.x, py = (F.y - PEDRA.y) * 1.3, pd = Math.hypot(px, py);
        if (pd < PEDRA.r + 8) { tx += (px / pd) * 0.9; ty += (py / pd) * 0.6; }
        F.vx = F.vx * 0.82 + tx * 0.18; F.vy = F.vy * 0.82 + ty * 0.18;
        F.x += F.vx; F.y += F.vy;
        const sp = Math.hypot(F.vx, F.vy);
        if (sp > 0.25) {
          F.estado = 'andar';
          F.passo += sp / 3.2;
          if (Math.abs(F.vx) > Math.abs(F.vy) * 0.85) { F.vista = 'lado'; F.face = F.vx > 0 ? 1 : -1; }
          else F.vista = F.vy > 0 ? 'frente' : 'costas';
          if (Math.floor(F.passo) % 3 === 0 && f - ultimoPasso >= 5) { ultimoPasso = f; som(f, 'passo', 0.35); }
        } else {
          F.estado = 'idle'; F.vista = 'lado'; F.face = A.x >= F.x ? 1 : -1;
        }
      }
      for (const F of L) {
        if (!F.vivo) continue;
        F.x = clamp(F.x, LIMITES.x0, LIMITES.x1); F.y = clamp(F.y, LIMITES.y0, LIMITES.y1);
      }
    }
    if (fase === 'vitoria' && f === TEMPO.vitoria) for (const F of L) if (F.vivo && F.estado !== 'derrota') { F.estado = F.i === vencedor ? 'vitoria' : 'idle'; F.t0 = tick; }

    // ── câmera ──
    let cam = { zoom: 1, cx: 180, cy: 320, sx: 0, sy: 0 };
    if (fase === 'duelo' || fase === 'vitoria') {
      const v = vivos();
      const alvoCam = fase === 'vitoria' ? [L[vencedor]] : v;
      const mx = alvoCam.reduce((s, F) => s + F.x, 0) / alvoCam.length, my = alvoCam.reduce((s, F) => s + F.y, 0) / alvoCam.length - 28;
      const k = clamp((f - TEMPO.duelo) / 18, 0, 1);
      const ease = 1 - (1 - k) ** 3;
      const ant = quadros[f - 1]?.cam ?? cam;
      const z = 1 + 0.2 * ease;
      cam = { zoom: z, cx: ant.cx + (180 + (mx - 180) * ease - ant.cx) * 0.15, cy: ant.cy + (320 + (my - 320) * ease - ant.cy) * 0.15, sx: 0, sy: 0 };
      // mantém o enquadramento dentro do mundo
      const hw = 180 / z, hh = 320 / z;
      cam.cx = clamp(cam.cx, hw, 360 - hw); cam.cy = clamp(cam.cy, hh, 640 - hh);
    }
    if (tremor > 0 && !congelado) { cam.sx = Math.round(R.entre(-1, 1) * tremor * 0.6); cam.sy = Math.round(R.entre(-1, 1) * tremor * 0.6); tremor *= 0.8; if (tremor < 0.5) tremor = 0; }

    // ── snapshot ──
    quadros.push({
      f, tick, fase, congelado,
      cam,
      lut: L.map((F) => ({
        x: F.x, y: F.y, vivo: F.vivo, visivel: F.visivel, estado: F.estado, t0: F.t0, vista: F.vista, face: F.face,
        hp: Math.max(0, F.hp), hpMax: F.hpMax, flash: tick < F.flashAte, status: F.status?.tipo ?? null, passo: F.passo,
        escudo: (F.escudoAte ?? -1) > tick, alvo: F.alvo,
      })),
    });
  }

  function aproximar(E, V, alcance) {
    E.ox = E.x; E.oy = E.y;
    const d = dist(E, V);
    if (d <= alcance * 0.9) return;
    const lado = E.x <= V.x ? -1 : 1;
    E.x = clamp(V.x + lado * Math.min(alcance * 0.75, 40), LIMITES.x0, LIMITES.x1);
    E.y = clamp(V.y + 1, LIMITES.y0, LIMITES.y1);
    efeitos.push({ tipo: 'dash', t0: tick, dur: 10, de: E.i, xa: E.ox, ya: E.oy, xb: E.x, yb: E.y });
  }

  return { quadros, efeitos, textos, caixas, anuncios, cutins, audio, vencedor, vice, ordem: agenda.map((a) => a.i) };
}
