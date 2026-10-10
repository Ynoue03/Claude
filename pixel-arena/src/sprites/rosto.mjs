// Rosto paramétrico: olhos (íris, pupila, brilho), sobrancelhas, boca e marcas — escala livre
// (1 = sprite de 64×72, ~0,75 = HUD 16×16, ~2,4 = retrato do cut-in).
import { hex, rgba, canal } from '../img.mjs';

export const BRANCO_OLHO = hex('#F6F2FF');
export const BRANCO = hex('#FFFFFF');
const BOCA = hex('#6E1C2E');
const LINGUA = hex('#D4606E');
const DENTE = hex('#FFF8F0');
const SUOR = hex('#9FD8FF');
const SUOR2 = hex('#E8F7FF');
const ARRANHAO = hex('#C2333F');

export const mistura = (a, b, k) => {
  const A = canal(a), B = canal(b);
  return rgba(...[0, 1, 2].map((i) => Math.round(A[i] * (1 - k) + B[i] * k)), 255);
};

/**
 * Desenha o rosto na tela `t` (decals). g = geometria { hx, hy, e (escala), vista ('frente'|'lado') }.
 * cor = { linha, iris (rampa), pele (rampa), sobrancelha }
 * expr: neutra | foco | grito | dor | cansado | derrota | vitoria
 */
export function rosto(t, g, cor, expr, o = {}) {
  const { hx, hy, e } = g;
  const lado = g.vista === 'lado';
  const R = (v) => Math.round(v);
  // ---- geometria dos olhos ----
  const ew = Math.max(2, R(4 * e)), eh = Math.max(2, R(5 * e));
  const desloc = lado ? -2.6 * e : 0;
  const olhos = lado
    ? [{ x: R(hx - 8.4 * e), w: Math.max(2, ew - 1), lado: -1, longe: true }, { x: R(hx - 1.2 * e), w: ew, lado: 1 }]
    : [{ x: R(hx - 7.2 * e), w: ew, lado: -1 }, { x: R(hx + 7.2 * e) - ew + 1, w: ew, lado: 1 }];
  const oy = R(hy + 0.2 * e);
  const linha = cor.linha;
  const sobr = cor.sobrancelha ?? linha;
  const pele = cor.pele.tons;
  const sombraPele = pele[1];

  // ---- marcas sob os olhos / máscaras (antes dos olhos) ----
  if (o.antesOlhos) o.antesOlhos(t, { olhos, oy, ew, eh, e, hx, hy, desloc, lado });

  for (const ol of olhos) {
    const tipo = o.olhoTipo?.(ol) ?? expr;
    desenharOlho(t, ol.x, oy, ol.w, eh, ol.lado, tipo, ol.lado > 0 && cor.iris2 ? { ...cor, iris: cor.iris2 } : cor, e, ol, o);
  }

  // ---- sobrancelhas ----
  if (!o.semSobrancelha) for (const ol of olhos) {
    const by = oy - Math.max(2, R(1.6 * e));
    // inclinação: + = interna mais baixa (raiva)
    const incl = { neutra: 0, foco: 1, grito: 2, dor: -1, cansado: -1, derrota: -1, vitoria: -0.5 }[expr] + (o.raiva ? 1 : 0);
    const n = ol.w + (lado && ol.longe ? 0 : 1);
    for (let i = 0; i < n; i++) {
      const xi = ol.lado < 0 ? ol.x - 1 + i : ol.x + ol.w - i;
      const frac = i / Math.max(1, n - 1); // 0 = externa, 1 = interna
      const yy = by + R(incl * frac * Math.max(1, e * 0.8)) - (incl < 0 ? R(incl * (1 - frac)) : 0) + (expr === 'vitoria' ? -1 : 0);
      for (let k = 0; k < Math.max(1, R(e * 0.7)); k++) t.d(xi, yy + k, sobr);
    }
  }

  // ---- nariz (sombra de 1 px) ----
  const nx = R(hx + desloc - (lado ? 2.5 * e : 0)), ny = R(hy + 5.2 * e);
  t.d(nx, ny, sombraPele);
  if (e >= 1.8) { t.d(nx + 1, ny, sombraPele); t.d(nx, ny - 1, pele[1]); t.d(nx - 1, ny + 1, pele[3]); }

  // ---- bochechas ----
  if (!o.semBlush) {
    const blush = mistura(pele[2], hex('#FF7C8A'), expr === 'vitoria' ? 0.5 : 0.32);
    for (const ol of olhos) {
      if (lado && ol.longe) continue;
      const bx = ol.lado < 0 ? ol.x - 0 : ol.x + ol.w - Math.max(2, R(2 * e));
      const by = oy + eh + Math.max(1, R(0.6 * e));
      for (let i = 0; i < Math.max(2, R(2 * e)); i++) for (let j = 0; j < Math.max(1, R(0.7 * e)); j++) {
        if (e >= 1.8 && (i + j) % 2 === 1 && j > 0) continue;
        t.d(bx + i, by + j, blush);
      }
    }
  }

  // ---- boca ----
  const mx = R(hx + desloc * 1.15 - (lado ? 0.6 * e : 0)), my = R(hy + 7.6 * e);
  boca(t, mx, my, e, expr, cor, o);

  // ---- marcas do personagem ----
  if (o.marcas) o.marcas(t, { olhos, oy, ew, eh, e, hx, hy, desloc, lado, mx, my });

  // ---- suor / arranhões ----
  if (expr === 'dor' || expr === 'cansado') {
    const sx = lado ? R(hx + 6 * e) : R(hx + 9 * e), sy = R(hy - 3 * e);
    gota(t, sx, sy, e);
  }
  if (o.ferido) {
    const ax = lado ? R(hx + 3 * e) : R(hx + 4.5 * e), ay = R(hy + 6.5 * e);
    for (let i = 0; i < Math.max(2, R(3 * e)); i++) t.d(ax + i, ay - i + (i % 2), ARRANHAO);
    t.d(R(hx - 5 * e), R(hy - 4 * e), ARRANHAO); t.d(R(hx - 4 * e), R(hy - 4 * e) + 1, ARRANHAO);
  }
}

function gota(t, x, y, e) {
  const s = Math.max(1, Math.round(e));
  for (let j = 0; j < 3 * s; j++) for (let i = 0; i < 2 * s; i++) {
    if (j < s && i !== s - 1 + (s > 1 ? 0 : 0)) continue;
    t.d(x + i, y + j, i === 0 && j > s ? SUOR2 : SUOR);
  }
}

function desenharOlho(t, x, y, w, h, lado, tipo, cor, e, ol, o) {
  const L = cor.linha;
  const ir = cor.iris.tons;
  const R = Math.round;
  const ext = lado < 0 ? x - 1 : x + w; // canto externo (cílio)
  if (tipo === 'fechado' || tipo === 'vitoria' || tipo === 'dor' || tipo === 'derrota') {
    if (tipo === 'derrota') {
      // espiral (escala grande) ou X
      if (o.derrotaX || w < 4) {
        for (let i = 0; i < w; i++) { t.d(x + i, y + 1 + R((i * (h - 2)) / Math.max(1, w - 1)), L); t.d(x + i, y + h - 1 - R((i * (h - 2)) / Math.max(1, w - 1)), L); }
      } else {
        const cx = x + (w - 1) / 2, cy = y + h / 2;
        for (let a = 0; a < Math.PI * 5; a += 0.12) {
          const r = (a / (Math.PI * 5)) * (w / 2 + 0.2);
          t.d(R(cx + Math.cos(a) * r), R(cy + Math.sin(a) * r * (h / w)), L);
        }
      }
      return;
    }
    if (tipo === 'dor') {
      // > <  (olhos apertados)
      const meio = y + R(h / 2);
      for (let i = 0; i < w; i++) {
        const d = lado < 0 ? i : w - 1 - i; // 0 = externo
        const dy = R(((w - 1 - d) * (h / 2 - 0.5)) / Math.max(1, w - 1));
        t.d(x + i, meio - dy, L); t.d(x + i, meio + dy, L);
      }
      return;
    }
    // ^ ^ (feliz) ou fechado (linha curva para baixo)
    const feliz = tipo === 'vitoria';
    for (let i = 0; i < w + 1; i++) {
      const xi = x + i - (lado < 0 ? 1 : 0);
      const c = (i - w / 2) / (w / 2);
      const yy = y + R(h * 0.55) + (feliz ? R(c * c * Math.max(1, h * 0.4)) : -R(c * c * Math.max(1, h * 0.25)) + 1);
      for (let k = 0; k < Math.max(1, R(e * 0.6)); k++) t.d(xi, yy + k, L);
    }
    return;
  }
  // olho aberto: pálpebra superior (cílio grosso), esclera, íris com degradê, pupila e brilho
  let topo = 0;
  if (tipo === 'foco') topo = Math.max(1, R(h * 0.2));
  if (tipo === 'cansado') topo = Math.max(1, R(h * 0.45));
  const brilhoForte = tipo === 'brilho';
  const grito = tipo === 'grito';
  // esclera
  for (let j = topo + 1; j < h; j++) for (let i = 0; i < w; i++) t.d(x + i, y + j, BRANCO_OLHO);
  // íris
  const iw = grito ? Math.max(2, w - 2 + (w <= 3 ? 1 : 0)) : Math.max(2, w - (w >= 4 ? 1 : 0));
  const ix = lado < 0 ? x + w - iw : x; // íris puxada para dentro (olhar à frente)
  const ixx = ol?.longe ? x : ix;
  const ih = grito ? h - 2 : h - 1;
  const iy = y + h - ih;
  for (let j = 0; j < ih; j++) for (let i = 0; i < iw; i++) {
    const yy = iy + j;
    if (yy <= y + topo) continue;
    if (e >= 1.8 && (i === 0 || i === iw - 1) && (j === 0 || j === ih - 1)) continue; // íris arredondada
    const f = j / Math.max(1, ih - 1);
    const c = brilhoForte ? (f < 0.4 ? ir[3] : ir[4]) : f < 0.34 ? ir[0] : f < 0.7 ? ir[1] : ir[2];
    t.d(ixx + i, yy, c);
  }
  // pupila
  if (!brilhoForte) {
    const pw = Math.max(1, R(iw * 0.4)), ph = Math.max(1, R(ih * (grito ? 0.3 : 0.45)));
    const px = ixx + R((iw - pw) / 2), py = iy + R((ih - ph) / 2) + (grito ? 0 : 0);
    for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) if (py + j > y + topo) t.d(px + i, py + j, o.pupila ?? cor.iris.contorno);
  }
  if (o.sharingan && tipo !== 'brilho') {
    // tomoe: anel escuro + 3 pontos
    const cx = ixx + (iw - 1) / 2, cy = iy + (ih - 1) / 2;
    if (e >= 1.6) for (let a = 0; a < 3; a++) {
      const ang = a * 2.094 + 0.6;
      t.d(R(cx + Math.cos(ang) * iw * 0.33), R(cy + Math.sin(ang) * ih * 0.33), cor.iris.contorno);
    }
  }
  // brilho (1 px no sprite, 2 no retrato) — sempre no alto à esquerda
  const bx = ixx + (iw >= 3 ? 0 : 0) + (e >= 1.8 ? 1 : 0), by = iy + (e >= 1.8 ? 1 : 0) + (topo > 0 && iy <= y + topo ? topo : 0);
  t.d(bx, Math.max(by, y + topo + 1), BRANCO);
  if (e >= 1.8) { t.d(bx + 1, Math.max(by, y + topo + 1), BRANCO); t.d(bx, Math.max(by, y + topo + 1) + 1, BRANCO); t.d(ixx + iw - 2, iy + ih - 2, mistura(ir[2], BRANCO, 0.6)); }
  // cílio/pálpebra superior (mais grosso, com rabinho no canto externo)
  const grossura = Math.max(1, R(e * 0.75));
  for (let k = 0; k < grossura; k++) for (let i = -1; i <= w; i++) {
    if (i === -1 && lado > 0) continue;
    if (i === w && lado < 0) continue;
    t.d(x + i, y + topo + k - (i === (lado < 0 ? -1 : w) ? -1 : 0), L);
  }
  t.d(ext, y + topo + grossura, L);
  // pálpebra inferior discreta
  if (e >= 1.5) for (let i = 1; i < w - 1; i++) t.d(x + i, y + h, cor.pele.tons[1]);
  else if (!ol?.longe) t.d(lado < 0 ? x + w - 1 : x, y + h, cor.pele.tons[1]);
}

function boca(t, x, y, e, expr, cor, o) {
  const R = Math.round;
  const L = cor.pele.contorno;
  const mw = Math.max(2, R(3 * e));
  const fala = (w, h, dentes) => {
    const x0 = x - R(w / 2);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const borda = (i === 0 || i === w - 1) && (j === 0 || j === h - 1);
      if (borda && w > 2) continue;
      let c = BOCA;
      if (dentes && j === 0) c = DENTE;
      if (j === h - 1 && h >= 3 && i > 0 && i < w - 1) c = LINGUA;
      t.d(x0 + i, y + j, c);
    }
  };
  switch (expr) {
    case 'grito': {
      if (e < 1.5) { fala(Math.max(3, R(4 * e)), Math.max(3, R(4 * e)), true); break; }
      // boca de grito em trapézio, dentes em cima, língua embaixo
      const w = R(5.4 * e), h = R(4.6 * e), x0 = x - R(w / 2);
      for (let j = 0; j < h; j++) {
        const enc = R((j / h) * 0.9 * e);
        for (let i = enc; i < w - enc; i++) {
          let c = BOCA;
          if (j < R(0.7 * e)) c = DENTE;
          else if (j > h * 0.62 && i > enc + 1 && i < w - enc - 2) c = LINGUA;
          if (i === enc || i === w - enc - 1 || j === h - 1) c = cor.pele.contorno;
          t.d(x0 + i, y + j - R(e), c);
        }
      }
      break;
    }
    case 'vitoria': {
      const w = Math.max(3, R(4.4 * e)), h = Math.max(2, R(2.6 * e));
      const x0 = x - R(w / 2);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const r = j / h;
        if (i < r * w * 0.35 || i > w - 1 - r * w * 0.35) continue;
        t.d(x0 + i, y + j, j === 0 ? DENTE : j === h - 1 && h > 2 ? LINGUA : BOCA);
      }
      break;
    }
    case 'cansado': fala(Math.max(2, R(2.4 * e)), Math.max(2, R(2.4 * e)), false); break;
    case 'derrota': {
      for (let i = 0; i < mw + 1; i++) t.d(x - R(mw / 2) + i, y + (i % 2), L);
      if (e >= 1.5) fala(R(2 * e), R(1.5 * e), false);
      break;
    }
    case 'dor': {
      const w = Math.max(3, R(3.6 * e)), h = Math.max(2, R(2 * e));
      const x0 = x - R(w / 2);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) t.d(x0 + i, y + j, DENTE);
      for (let i = 0; i < w; i++) t.d(x0 + i, y + R(h / 2) - (i % 2 && h > 2 ? 1 : 0), L);
      if (e >= 1.5) for (let i = 0; i < w; i++) { t.d(x0 + i, y - 1, L); t.d(x0 + i, y + h, L); }
      break;
    }
    case 'foco':
      for (let i = 0; i < Math.max(2, mw - 1); i++) t.d(x - R(mw / 2) + i + 1, y, L);
      break;
    default: // neutra: linha com cantinho
      for (let i = 0; i < mw; i++) t.d(x - R(mw / 2) + i, y, L);
      if (e >= 1.5) t.d(x + R(mw / 2), y - 1, L);
  }
  if (o.bocaExtra) o.bocaExtra(t, x, y, e, expr);
}
