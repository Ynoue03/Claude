// Efeitos visuais dos golpes — partículas, brilho aditivo, feixes, cortes, explosões.
// Cada efeito recebe o tempo local (ticks desde o início) e resolve posições pelos lutadores.
import { hex, rgba, comAlfa } from './img.mjs';
import { hash } from './rng.mjs';

const BR = hex('#FFFFFF');
const lerp = (a, b, k) => a + (b - a) * k;
const C = (h) => hex(h);

// brilho radial aditivo
function brilho(img, x, y, r, cor, k = 1) {
  for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) {
    const d = Math.hypot(i, j) / r;
    if (d > 1) continue;
    const a = (1 - d) * (1 - d) * k;
    // quantiza em 3 níveis (visual pixel art, sem degradê liso)
    const q = a > 0.55 ? 0.8 : a > 0.25 ? 0.45 : a > 0.08 ? 0.2 : 0;
    if (q) img.add(x + i, y + j, cor, q);
  }
}
function disco(img, x, y, r, cor, k = 1) { img.elipse(x, y, r, r, cor, k); }
function anel(img, x, y, r, cor, esp = 1, k = 1) {
  for (let j = -Math.ceil(r + esp); j <= Math.ceil(r + esp); j++) for (let i = -Math.ceil(r + esp); i <= Math.ceil(r + esp); i++) {
    const d = Math.hypot(i + 0.5, j + 0.5);
    if (d >= r && d < r + esp) img.mix(x + i, y + j, cor, k);
  }
}
function linhaGrossa(img, x0, y0, x1, y1, w, cor, k = 1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  for (let s = -w / 2; s <= w / 2; s += 0.5) img.linha(x0 + nx * s, y0 + ny * s, x1 + nx * s, y1 + ny * s, cor, k);
}
function raio(img, x0, y0, x1, y1, semente, cor, segs = 6, amp = 5) {
  let px = x0, py = y0;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let k = 1; k <= segs; k++) {
    const f = k / segs, o = k === segs ? 0 : (hash(semente, k) - 0.5) * 2 * amp;
    const qx = x0 + dx * f + nx * o, qy = y0 + dy * f + ny * o;
    img.linha(px, py, qx, qy, cor); img.linha(px + 1, py, qx + 1, qy, comAlfa(cor, 120));
    px = qx; py = qy;
  }
}
function particulas(img, x, y, lt, semente, n, cor, vel = 1.5, vida = 14, g = 0.08, tam = 1) {
  for (let k = 0; k < n; k++) {
    const a = hash(semente, k, 1) * Math.PI * 2, v = (0.4 + hash(semente, k, 2)) * vel;
    const t = lt - hash(semente, k, 3) * 3;
    if (t < 0 || t > vida) continue;
    const px = x + Math.cos(a) * v * t, py = y + Math.sin(a) * v * t + g * t * t;
    const c = t > vida * 0.6 ? comAlfa(cor, 150) : cor;
    img.mix(px, py, c);
    if (tam > 1) { img.mix(px + 1, py, c); img.mix(px, py + 1, c); }
  }
}
function estrela(img, x, y, r, cor) {
  for (let i = -r; i <= r; i++) { img.mix(x + i, y, cor); img.mix(x, y + i, cor); }
  for (let i = -Math.floor(r / 2); i <= Math.floor(r / 2); i++) { img.mix(x + i, y + i, cor); img.mix(x + i, y - i, cor); }
}
function arco(img, cx, cy, r, a0, a1, cor, esp = 2, k = 1) {
  const passos = Math.ceil(Math.abs(a1 - a0) * r * 1.5);
  for (let s = 0; s <= passos; s++) {
    const a = lerp(a0, a1, s / passos);
    const w = esp * Math.sin((s / passos) * Math.PI);
    for (let e = 0; e <= w; e += 0.5) img.mix(cx + Math.cos(a) * (r - e), cy + Math.sin(a) * (r - e) * 0.7, cor, k);
  }
}
function chama(img, x, y, lt, semente, n, cores, alt = 14, larg = 8) {
  for (let k = 0; k < n; k++) {
    const fase = (lt * 0.9 + hash(semente, k) * alt) % alt;
    const px = x + (hash(semente, k, 2) - 0.5) * larg + Math.sin((lt + k) * 0.7) * 1.5;
    const py = y - fase;
    const r = Math.max(0, 2.5 * (1 - fase / alt));
    const c = fase < alt * 0.3 ? cores[0] : fase < alt * 0.65 ? cores[1] : cores[2];
    img.elipse(px, py, r, r * 1.3, c);
  }
}
function fumaca(img, x, y, lt, semente, n, raioMax = 9) {
  for (let k = 0; k < n; k++) {
    const a = hash(semente, k) * Math.PI * 2;
    const d = lt * (0.6 + hash(semente, k, 4) * 0.6);
    const r = Math.max(0, raioMax * Math.sin(Math.min(1, lt / 14) * Math.PI) * (0.6 + hash(semente, k, 5) * 0.5));
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.6 - lt * 0.3;
    img.elipse(px, py, r, r * 0.85, C('#D8D4E0'), 0.95);
    img.elipse(px - r * 0.25, py - r * 0.25, r * 0.6, r * 0.5, C('#F6F4FA'), 0.95);
  }
}

/** contexto: pos(i) → {x,y,face}, sprite(i, anim, quadro) → Img */
export function desenharEfeito(img, e, lt, ctx) {
  const A = e.de !== undefined ? ctx.pos(e.de) : null;
  const B = e.para !== undefined && e.para >= 0 ? ctx.pos(e.para) : null;
  const sem = e.t0 * 7 + (e.de ?? 0);
  const imp = e.impacto ?? 4;
  const g = e.especial ? 1.6 : 1;
  const cor = e.cor ? C(e.cor) : BR, cor2 = e.cor2 ? C(e.cor2) : cor;
  const mao = A ? { x: A.x + A.face * 15, y: A.y - 25 } : null;
  const alvo = B ? { x: B.x, y: B.y - 24 } : e.xb !== undefined ? { x: e.xb, y: e.yb - 24 } : null;
  const ti = lt - imp; // tempo desde o impacto
  switch (e.tipo) {
    case 'rasengan': {
      const p = ti < 0 ? mao : alvo;
      if (!p) break;
      const r = ti < 0 ? 4 + lt * 0.4 * g : (6 + ti * 1.3) * g;
      const k = ti < 0 ? 1 : Math.max(0, 1 - ti / 14);
      brilho(img, p.x, p.y, r * 2, C('#58B8FF'), k);
      disco(img, p.x, p.y, r * 0.75, C('#7CC8FF'), 0.85 * k);
      disco(img, p.x, p.y, r * 0.4, BR, k);
      for (let a = 0; a < 4; a++) arco(img, p.x, p.y, r, lt * 0.6 + a * 1.57, lt * 0.6 + a * 1.57 + 1.2, C('#DDF2FF'), 1, k);
      if (ti >= 0) { anel(img, p.x, p.y, ti * 2.2 * g, C('#9AD6FF'), 2, k); particulas(img, p.x, p.y, ti, sem, 16, C('#BDE6FF'), 2.2); }
      break;
    }
    case 'clones': {
      if (!alvo || !A) break;
      const s = ctx.sprite(e.de, ti < 0 ? 'ataque' : 'ataque', ti < 0 ? 0 : Math.min(3, 1 + Math.floor(ti / 3)));
      for (const lado of [-1, 1]) {
        const x = alvo.x + lado * 20, y = alvo.y + 24;
        if (lt < 4) fumaca(img, x, y - 20, lt + 2, sem + lado, 4, 7);
        else if (lt < imp + 10) img.blit(s.img, x - 32, y - 68, { flip: lado > 0 ? false : true, k: 0.85 });
        else fumaca(img, x, y - 20, lt - imp - 8, sem + lado + 5, 4, 7);
      }
      if (ti >= 0 && ti < 6) { estrela(img, alvo.x, alvo.y, 5, BR); particulas(img, alvo.x, alvo.y, ti, sem, 10, C('#FFB050'), 2); }
      break;
    }
    case 'chidori': case 'godspeed': case 'relampago': {
      const azul = e.tipo === 'godspeed';
      const c1 = azul ? C('#7FC8FF') : C('#FFF2A0'), c2 = azul ? C('#2F7FE8') : C('#E8C21E');
      if (ti < 0 && mao) {
        brilho(img, mao.x, mao.y, 9 * g, c2, 1);
        for (let k = 0; k < 4; k++) raio(img, mao.x, mao.y, mao.x + (hash(sem, k, lt) - 0.5) * 22, mao.y + (hash(sem, k + 9, lt) - 0.5) * 18, sem + k * 13 + lt, c1, 3, 3);
      }
      if (ti >= 0 && ti < 10 && alvo && A) {
        const k = 1 - ti / 10;
        const x0 = e.xa ?? A.x, y0 = (e.ya ?? A.y) - 24;
        if (e.tipo !== 'chidori' || ti < 3) {
          raio(img, x0, y0, alvo.x, alvo.y, sem + (ti >> 1), c1, 7, 6 * g);
          raio(img, x0, y0 + 3, alvo.x, alvo.y + 2, sem + 5 + (ti >> 1), c2, 6, 8 * g);
        }
        brilho(img, alvo.x, alvo.y, 14 * g * k, c2, k);
        for (let j = 0; j < 5; j++) raio(img, alvo.x, alvo.y, alvo.x + (hash(sem, j) - 0.5) * 36 * g, alvo.y + (hash(sem, j + 3) - 0.5) * 30 * g, sem + j + ti, c1, 3, 4);
        particulas(img, alvo.x, alvo.y, ti, sem, 14, c1, 2.4, 10, 0);
      }
      if (azul && A) for (let j = 0; j < 3; j++) raio(img, A.x - 8 + j * 8, A.y - 50, A.x - 6 + j * 6, A.y - 10, sem + j + (lt >> 1), C('#BFE4FF'), 4, 4);
      break;
    }
    case 'amaterasu': {
      if (!alvo) break;
      if (ti < 0 && A) { brilho(img, A.x - A.face * 2, A.y - 34, 5, C('#E0303A'), 1); break; }
      const k = Math.min(1, ti / 4);
      chama(img, alvo.x, alvo.y + 22, ti, sem, Math.round(14 * g * k), [C('#120A18'), C('#2A1838'), C('#9B4DDB')], 26, 18);
      for (let j = 0; j < 6; j++) { const t = (ti + j * 3) % 18; img.mix(alvo.x + (hash(sem, j) - 0.5) * 16, alvo.y + 20 - t * 1.6, C('#C07CFF')); }
      break;
    }
    case 'feixe': case 'feixeGrande': {
      if (!mao || !alvo) break;
      const grande = e.tipo === 'feixeGrande' || e.especial;
      const largura = (grande ? 11 : 6) * (e.especial ? 1.2 : 1);
      if (ti < 0) { const r = 3 + lt * 0.8; brilho(img, mao.x, mao.y, r * 2.4, cor, 1); disco(img, mao.x, mao.y, r * 0.8, cor2 === cor ? C('#E8F4FF') : cor2, 0.9); disco(img, mao.x, mao.y, r * 0.4, BR); particulas(img, mao.x, mao.y, lt, sem, 8, BR, -1.2, 8, 0); break; }
      if (ti > 16) break;
      const k = ti < 10 ? 1 : 1 - (ti - 10) / 6;
      const w = largura * (ti < 2 ? 0.6 : k) + Math.sin(ti * 1.7) * 1;
      const dx = alvo.x - mao.x, dy = alvo.y - mao.y, L = Math.hypot(dx, dy) || 1;
      const fx = alvo.x + (dx / L) * 10, fy = alvo.y + (dy / L) * 10;
      linhaGrossa(img, mao.x, mao.y, fx, fy, w + 3, comAlfa(cor, 200));
      linhaGrossa(img, mao.x, mao.y, fx, fy, w, cor);
      linhaGrossa(img, mao.x, mao.y, fx, fy, w * 0.45, BR);
      brilho(img, mao.x, mao.y, w * 1.6, cor, k);
      brilho(img, fx, fy, w * 2.4, cor, k); disco(img, fx, fy, w * 0.9, BR, k);
      particulas(img, fx, fy, ti, sem, 18, BR, 2.6, 12, 0.05);
      break;
    }
    case 'genki': {
      if (!A || !alvo) break;
      const topo = { x: A.x, y: A.y - 78 };
      if (ti < 0) {
        const r = 5 + lt * 0.9;
        brilho(img, topo.x, topo.y, r * 2, C('#68C8F5'), 1); disco(img, topo.x, topo.y, r, C('#A8E2FF'), 0.9); disco(img, topo.x - r * 0.3, topo.y - r * 0.3, r * 0.45, BR, 0.9);
        particulas(img, topo.x, topo.y, lt, sem, 12, C('#DDF4FF'), -2, 10, 0);
        break;
      }
      const v = Math.min(1, ti / 5);
      const x = lerp(topo.x, alvo.x, v), y = lerp(topo.y, alvo.y, v), r = 15 + (ti > 5 ? (ti - 5) * 2.5 : 0);
      const k = ti > 5 ? Math.max(0, 1 - (ti - 5) / 14) : 1;
      brilho(img, x, y, r * 2, C('#68C8F5'), k); disco(img, x, y, r * 0.7, C('#A8E2FF'), 0.8 * k); disco(img, x, y, r * 0.35, BR, k);
      if (ti > 5) { anel(img, x, y, (ti - 5) * 3.5, C('#C8EEFF'), 2, k); particulas(img, x, y, ti - 5, sem, 24, BR, 3, 14); }
      break;
    }
    case 'pistol': {
      if (!mao || !alvo || !A) break;
      if (ti < -1) break;
      const k = ti < 4 ? 1 : Math.max(0, 1 - (ti - 4) / 4);
      if (k <= 0) break;
      const ext = Math.min(1, (ti + 2) / 3);
      const x = lerp(mao.x, alvo.x, ext * k), y = lerp(mao.y, alvo.y, ext * k);
      linhaGrossa(img, mao.x, mao.y + 1, x, y + 1, 3, C('#B0603C'));
      linhaGrossa(img, mao.x, mao.y, x, y, 2, C('#F1C39A'));
      disco(img, x, y, 3.2, C('#F1C39A')); anel(img, x, y, 3.2, C('#8A4A2C'), 1);
      if (ti >= 0 && ti < 6) { estrela(img, alvo.x, alvo.y, 6, BR); particulas(img, alvo.x, alvo.y, ti, sem, 10, C('#FF6050'), 2); }
      break;
    }
    case 'gear': {
      if (!A) break;
      for (let j = 0; j < 8; j++) {
        const t = (lt * 0.8 + j * 4) % 20;
        img.elipse(A.x + (hash(sem, j) - 0.5) * 24, A.y - 10 - t * 2, 2.5 - t * 0.1, 2.5 - t * 0.1, C('#F6C8D8'), 0.8);
      }
      if (ti >= 0 && ti < 14 && alvo) {
        for (let j = 0; j < 5; j++) { const ox = (hash(sem, j, ti >> 1) - 0.5) * 20, oy = (hash(sem, j + 7, ti >> 1) - 0.5) * 20; disco(img, alvo.x + ox, alvo.y + oy, 3.2, C('#F49A9A')); estrela(img, alvo.x + ox, alvo.y + oy, 3, BR); }
        particulas(img, alvo.x, alvo.y, ti, sem, 12, C('#FFB0C8'), 2);
      }
      break;
    }
    case 'cortes': case 'cortesGrandes': {
      if (!alvo) break;
      const grande = e.tipo === 'cortesGrandes';
      const n = grande ? 6 : 3;
      for (let j = 0; j < n; j++) {
        const t = ti - j * 1.5;
        if (t < 0 || t > 9) continue;
        const k = 1 - t / 9;
        const a = (j * 2.1 + 0.4) % Math.PI;
        const r = (grande ? 26 : 18) * g * 0.7;
        const dx = Math.cos(a) * r, dy = Math.sin(a) * r * 0.8;
        const cc = grande ? BR : j % 2 ? C('#9BF0A8') : BR;
        linhaGrossa(img, alvo.x - dx, alvo.y - dy, alvo.x + dx, alvo.y + dy, 3 * k + 0.5, cc, k);
        linhaGrossa(img, alvo.x - dx, alvo.y - dy + 1, alvo.x + dx, alvo.y + dy + 1, 1, grande ? C('#B8C8E0') : C('#2F9B4A'), k);
      }
      if (ti >= 0 && ti < 10) particulas(img, alvo.x, alvo.y, ti, sem, grande ? 18 : 10, grande ? BR : C('#9BF0A8'), 2.2);
      if (grande && ti >= 0 && ti < 12) for (let j = 0; j < 3; j++) arco(img, alvo.x, alvo.y, 14 + j * 5 + ti, ti * 0.4 + j * 2, ti * 0.4 + j * 2 + 2.2, C('#E6F0FF'), 1.5);
      break;
    }
    case 'getsuga': {
      if (!mao || !alvo) break;
      if (ti < -3) break;
      const v = Math.min(1, (ti + 3) / 6);
      const x = lerp(mao.x, alvo.x, v), y = lerp(mao.y, alvo.y, v);
      const k = ti > 6 ? Math.max(0, 1 - (ti - 6) / 8) : 1;
      const dir = Math.sign(alvo.x - mao.x) || 1;
      const R = 12 * g;
      for (let s = 0; s < 3; s++) {
        const cc = s === 0 ? C('#D8262B') : s === 1 ? C('#1C1822') : C('#3A2030');
        arco(img, x - dir * s * 2, y, R - s, dir > 0 ? -1.3 : Math.PI - 1.3 + 0.0, dir > 0 ? 1.3 : Math.PI + 1.3, cc, 4 - s, k);
      }
      if (v < 1) for (let s = 1; s < 5; s++) arco(img, x - dir * s * 5, y, R - 2, dir > 0 ? -1 : Math.PI - 1, dir > 0 ? 1 : Math.PI + 1, comAlfa(C('#D8262B'), 110 - s * 20), 1, k);
      if (ti >= 3 && ti < 12) { brilho(img, alvo.x, alvo.y, 14, C('#D8262B'), k); particulas(img, alvo.x, alvo.y, ti - 3, sem, 14, C('#FF5050'), 2); }
      break;
    }
    case 'agua': {
      if (!alvo) break;
      if (ti < -2 || ti > 12) break;
      const k = ti < 6 ? 1 : 1 - (ti - 6) / 6;
      const R = 20 * g * 0.8;
      for (let s = 0; s < 3; s++) arco(img, alvo.x, alvo.y, R - s * 3, -2.6 + ti * 0.35, -2.6 + ti * 0.35 + 3.6, s === 0 ? C('#E8F8FF') : s === 1 ? C('#7FD0F5') : C('#2F8FD8'), 3 - s * 0.5, k);
      particulas(img, alvo.x, alvo.y, Math.max(0, ti), sem, 14, C('#A8E4FF'), 2, 12, 0.15);
      break;
    }
    case 'fogoCorte': case 'fogo': {
      if (!alvo) break;
      if (e.tipo === 'fogo' && mao) {
        if (ti < 0) { chama(img, mao.x, mao.y + 4, lt, sem, 6, [BR, C('#FFC040'), C('#E8401E')], 10, 6); break; }
        if (ti < 12) {
          const v = Math.min(1, ti / 4);
          for (let s = 0; s <= 10; s++) {
            const f = (s / 10) * v;
            const x = lerp(mao.x, alvo.x, f), y = lerp(mao.y + 8, alvo.y + 20, f);
            chama(img, x, y + 4, ti + s, sem + s, 3, [C('#FFF0A0'), C('#FF8A1E'), C('#C8201E')], 16 * g, 8);
          }
        }
      }
      if (ti >= 0 && ti < 16) {
        const k = 1 - ti / 16;
        if (e.tipo === 'fogoCorte') for (let s = 0; s < 3; s++) arco(img, alvo.x, alvo.y, (18 - s * 3) * g * 0.85, -2.4 + ti * 0.3, -2.4 + ti * 0.3 + 3.4, s === 0 ? C('#FFF0A0') : s === 1 ? C('#FF9A1E') : C('#D8301E'), 3, k);
        chama(img, alvo.x, alvo.y + 20, ti, sem, Math.round(10 * g), [C('#FFF0A0'), C('#FF8A1E'), C('#C8201E')], 24, 16);
        brilho(img, alvo.x, alvo.y, 14 * g, C('#FF8A1E'), k);
      }
      break;
    }
    case 'infinito': {
      if (!A) break;
      const k = lt < 26 ? 1 : 0;
      if (!k) break;
      const r = 20 + Math.sin(lt * 0.5) * 1.5;
      anel(img, A.x, A.y - 26, r, comAlfa(C('#7FF0FF'), 180), 1);
      anel(img, A.x, A.y - 26, r - 3, comAlfa(C('#2FC9D8'), 90), 1);
      for (let j = 0; j < 6; j++) { const a = j * 1.05 + lt * 0.15; img.mix(A.x + Math.cos(a) * r, A.y - 26 + Math.sin(a) * r, BR); }
      if (ti >= 0 && ti < 8 && alvo) anel(img, A.x, A.y - 26, r + ti * 4, comAlfa(C('#BFFAFF'), 160), 2);
      break;
    }
    case 'roxo': {
      if (!mao || !alvo) break;
      if (ti < 0) {
        const s = Math.max(0, 1 - lt / imp);
        disco(img, mao.x - 6 * s, mao.y - 4, 4, C('#3A7FFF')); disco(img, mao.x + 6 * s, mao.y + 4, 4, C('#FF3A4A'));
        brilho(img, mao.x, mao.y, 12, C('#8A3FD8'), 1 - s);
        break;
      }
      const v = Math.min(1, ti / 7);
      const x = lerp(mao.x, alvo.x, v), y = lerp(mao.y, alvo.y, v);
      const k = ti > 7 ? Math.max(0, 1 - (ti - 7) / 14) : 1;
      const R = 13 * g;
      brilho(img, x, y, R * 2.2, C('#8A3FD8'), k);
      disco(img, x, y, R, C('#5A1F9A'), 0.85 * k); disco(img, x, y, R * 0.7, C('#B57CFF'), 0.9 * k); disco(img, x, y, R * 0.3, BR, k);
      anel(img, x, y, R + 2 + Math.sin(ti) * 1.5, comAlfa(C('#E0C8FF'), 160), 1, k);
      if (ti > 7) { anel(img, x, y, (ti - 7) * 4, C('#C8A0FF'), 2, k); particulas(img, x, y, ti - 7, sem, 22, C('#D8B8FF'), 3, 14); }
      break;
    }
    case 'divergente': case 'smash': case 'jajanken': case 'blackflash': {
      if (!alvo) break;
      const c1 = e.tipo === 'divergente' ? C('#7FB0FF') : e.tipo === 'smash' ? C('#8BFF9A') : e.tipo === 'jajanken' ? C('#FFE060') : C('#D8262B');
      if (ti < 0 && mao) {
        brilho(img, mao.x, mao.y, 8 * g, c1, 0.9);
        if (e.tipo === 'smash') for (let k = 0; k < 2; k++) raio(img, A.x - 6, A.y - 40 + k * 12, A.x + 8, A.y - 30 + k * 10, sem + k + lt, C('#8BFF9A'), 3, 3);
        break;
      }
      if (ti > 14) break;
      const k = 1 - ti / 14;
      if (e.tipo === 'blackflash') {
        if (ti < 3) img.rect(alvo.x - 30, alvo.y - 30, 60, 60, comAlfa(C('#000000'), 90));
        for (let j = 0; j < 6; j++) {
          const a = hash(sem, j) * Math.PI * 2, L = 18 + hash(sem, j, 2) * 20;
          raio(img, alvo.x, alvo.y, alvo.x + Math.cos(a) * L * g, alvo.y + Math.sin(a) * L * g, sem + j, C('#D8262B'), 4, 4);
          raio(img, alvo.x, alvo.y, alvo.x + Math.cos(a) * L * g * 0.8, alvo.y + Math.sin(a) * L * g * 0.8, sem + j + 30, C('#0A0A10'), 4, 3);
        }
        brilho(img, alvo.x, alvo.y, 10, C('#FF2030'), k);
      } else {
        anel(img, alvo.x, alvo.y, ti * 2.5 * g, c1, 2, k);
        if (e.tipo === 'divergente' && ti > 4) anel(img, alvo.x, alvo.y, (ti - 4) * 2.8 * g, C('#3A7FE0'), 2, k);
        if (e.tipo === 'smash' && A) for (let j = 0; j < 7; j++) { const oy = (hash(sem, j) - 0.5) * 24; const d = Math.sign(alvo.x - A.x) || 1; img.linha(alvo.x - d * 4 + d * ti * 3, alvo.y + oy, alvo.x + d * 14 + d * ti * 3, alvo.y + oy, comAlfa(BR, 200)); }
        estrela(img, alvo.x, alvo.y, Math.round(6 * g * k + 1), BR);
        brilho(img, alvo.x, alvo.y, 12 * g, c1, k);
      }
      particulas(img, alvo.x, alvo.y, ti, sem, 14, c1, 2.2);
      break;
    }
    case 'explosao': {
      if (!alvo || !A) break;
      if (ti < 0 && mao) { for (let j = 0; j < 3; j++) { const t = lt + j * 2; disco(img, A.x + Math.cos(t) * 10, A.y - 24 + Math.sin(t) * 6, 2.5, C('#FFB040')); } break; }
      for (let j = 0; j < 4; j++) {
        const t = ti - j * 2;
        if (t < 0 || t > 12) continue;
        const k = 1 - t / 12;
        const x = alvo.x + (hash(sem, j) - 0.5) * 18, y = alvo.y + (hash(sem, j, 2) - 0.5) * 14;
        const r = (6 + t * 1.2) * g * 0.8;
        disco(img, x, y, r, t < 3 ? BR : t < 6 ? C('#FFD24A') : C('#F07C1E'), k);
        disco(img, x, y, r * 0.6, t < 6 ? BR : C('#FFB040'), k);
        if (t > 6) disco(img, x, y - t * 0.6, r * 0.8, C('#5A5058'), 0.6 * k);
      }
      particulas(img, alvo.x, alvo.y, Math.max(0, ti), sem, 20, C('#FFB040'), 2.6, 12);
      break;
    }
    case 'gelo': {
      if (!mao || !alvo || !A) break;
      if (ti < 0) { brilho(img, mao.x, mao.y + 6, 8, C('#7FF0FF'), 1); break; }
      const v = Math.min(1, ti / 5);
      for (let s = 1; s <= 7; s++) {
        const f = s / 7;
        if (f > v) break;
        const x = lerp(A.x, alvo.x, f), y = lerp(A.y, B ? B.y : alvo.y + 24, f);
        const h = (6 + s * 2 + hash(sem, s) * 4) * (ti > 14 ? Math.max(0, 1 - (ti - 14) / 6) : 1);
        for (let j = 0; j < h; j++) {
          const w = Math.max(0, Math.round((1 - j / h) * 4));
          for (let i = -w; i <= w; i++) img.set(Math.round(x + i), Math.round(y - j), i < 0 ? hex('#BFF6FF') : i === 0 ? hex('#FFFFFF') : hex('#4FC8E0'));
        }
      }
      if (ti < 10) particulas(img, alvo.x, alvo.y, ti, sem, 12, C('#DFFAFF'), 1.8);
      break;
    }
    case 'dash': {
      if (lt > 8) break;
      const k = 1 - lt / 8;
      for (let s = 0; s < 6; s++) { const f = s / 6; img.linha(lerp(e.xa, e.xb, f), lerp(e.ya, e.yb, f) - 20 - s, lerp(e.xa, e.xb, f + 0.15), lerp(e.ya, e.yb, f + 0.15) - 20 - s, comAlfa(BR, Math.round(200 * k))); img.linha(lerp(e.xa, e.xb, f), lerp(e.ya, e.yb, f) - 34 + s, lerp(e.xa, e.xb, f + 0.12), lerp(e.ya, e.yb, f + 0.12) - 34 + s, comAlfa(BR, Math.round(140 * k))); }
      break;
    }
    case 'poof': {
      fumaca(img, e.xa, e.ya - 20, lt, sem, 7, 11);
      for (let j = 0; j < 4; j++) { const a = j * 1.57 + 0.7; estrela(img, e.xa + Math.cos(a) * (6 + lt * 1.4), e.ya - 22 + Math.sin(a) * (5 + lt), lt < 8 ? 2 : 1, BR); }
      break;
    }
  }
}

// efeitos de status ao redor do lutador
export function desenharStatus(img, x, y, tipo, t) {
  if (tipo === 'BRN') chama(img, x, y - 4, t, 991, 4, [C('#FFF0A0'), C('#FF8A1E'), C('#C8201E')], 16, 18);
  if (tipo === 'PAR' && t % 6 < 3) raio(img, x - 10 + (t % 4) * 5, y - 50, x - 6 + (t % 3) * 4, y - 20, t, C('#FFF2A0'), 3, 3);
  if (tipo === 'FRZ') for (let j = 0; j < 4; j++) { const xx = x - 9 + j * 6, yy = y - 8 - (j % 2) * 6; estrela(img, xx, yy, 1, C('#DFFAFF')); }
}
export { rgba };
