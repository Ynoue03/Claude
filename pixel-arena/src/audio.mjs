// Áudio 100% sintetizado (estilo 8/16 bits): trilha chiptune em loop (batalha 144 BPM, duelo 160 BPM),
// jingle de vitória e efeitos por tipo de golpe, sincronizados com os eventos da simulação.
// Sem amostras de terceiros. Determinístico.
import { TEMPO, FPS } from './sim.mjs';
import { rng } from './rng.mjs';

const SR = 48000;
const DUR = TEMPO.total / FPS;
const N = Math.ceil(DUR * SR);
const hz = (n) => {
  if (typeof n === 'number') return 440 * 2 ** ((n - 69) / 12);
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((base + 12 * (+m[3] + 1) - 69) / 12);
};
const midi = (n) => Math.round(69 + 12 * Math.log2(hz(n) / 440));

class Mix {
  constructor() { this.L = new Float32Array(N); this.R = new Float32Array(N); }
  // escreve uma voz: fn(t, i) → amostra; env por ADSR simples
  voz(t0, dur, fn, { vol = 0.3, pan = 0, a = 0.004, d = 0.05, s = 0.7, r = 0.04 } = {}) {
    const i0 = Math.max(0, Math.floor(t0 * SR)), n = Math.floor((dur + r) * SR);
    const gl = vol * Math.min(1, 1 - pan), gr = vol * Math.min(1, 1 + pan);
    for (let k = 0; k < n && i0 + k < N; k++) {
      const t = k / SR;
      let env;
      if (t < a) env = t / a;
      else if (t < a + d) env = 1 - (1 - s) * ((t - a) / d);
      else if (t < dur) env = s;
      else env = s * Math.max(0, 1 - (t - dur) / r);
      const v = fn(t, k) * env;
      this.L[i0 + k] += v * gl; this.R[i0 + k] += v * gr;
    }
  }
}
const pulso = (f, duty = 0.5) => (t) => ((t * f) % 1 < duty ? 1 : -1);
const tri = (f) => (t) => { const p = (t * f) % 1; return p < 0.5 ? 4 * p - 1 : 3 - 4 * p; };
function ruido(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }
// ruído "NES": amostra e segura (tom do ruído)
const ruidoPasso = (seed, taxa) => { const r = ruido(seed); let v = 0, ult = -1; return (t) => { const k = Math.floor(t * taxa); if (k !== ult) { ult = k; v = r(); } return v; }; };

// ───────────────────────── trilha ─────────────────────────
const PROG = [['A2', ['A4', 'C5', 'E5']], ['F2', ['F4', 'A4', 'C5']], ['G2', ['G4', 'B4', 'D5']], ['E2', ['E4', 'G#4', 'B4']]];
const MEL_A = [
  ['A4', null, 'E5', null, 'D5', 'C5', 'D5', 'E5'], ['F5', null, 'E5', 'D5', 'C5', null, 'A4', null],
  ['G4', null, 'B4', 'D5', 'G5', null, 'F5', 'E5'], ['E5', null, 'G#4', null, 'B4', null, 'E5', null],
  ['A4', 'C5', 'E5', 'A5', 'G5', null, 'E5', null], ['F5', 'E5', 'F5', 'A5', 'C6', null, 'A5', null],
  ['B5', null, 'A5', 'G5', 'D5', null, 'G5', null], ['G#5', null, 'E5', null, 'B4', 'G#4', 'E4', null],
];
const MEL_B = [
  ['C5', null, null, 'B4', 'A4', null, 'E4', null], ['A4', null, 'C5', null, 'F5', null, 'E5', 'D5'],
  ['D5', null, null, 'C5', 'B4', null, 'G4', null], ['B4', 'C5', 'D5', 'E5', 'G#5', null, 'B5', null],
  ['C6', null, 'B5', 'A5', 'E5', null, 'A5', null], ['F5', null, 'A5', 'C6', 'F6', null, 'E6', 'D6'],
  ['D6', null, 'B5', 'G5', 'D5', 'G5', 'B5', 'D6'], ['E6', null, 'B5', 'G#5', 'E5', null, null, null],
];

function bateria(m, t, beat, kick, snare, hat, vol = 1) {
  const rn = ruidoPasso(Math.floor(t * 1000), 22000);
  if (kick) m.voz(t, 0.12, (x) => Math.sin(2 * Math.PI * (55 + 120 * Math.exp(-x * 40)) * x) * 1.0 + rn(x) * 0.15 * Math.exp(-x * 60), { vol: 0.42 * vol, a: 0.001, d: 0.1, s: 0, r: 0.02 });
  if (snare) m.voz(t, 0.14, (x) => rn(x) * 0.8 + Math.sin(2 * Math.PI * 190 * x) * 0.4 * Math.exp(-x * 30), { vol: 0.2 * vol, a: 0.001, d: 0.13, s: 0, r: 0.02 });
  if (hat) { const rh = ruidoPasso(Math.floor(t * 777) + 3, 44000); m.voz(t, 0.03, (x) => rh(x), { vol: 0.07 * vol, a: 0.001, d: 0.03, s: 0, r: 0.01, pan: 0.2 }); }
  void beat;
}

function frase(m, t0, bpm, mel, o = {}) {
  const beat = 60 / bpm, colc = beat / 2, sem = beat / 4;
  const comp = beat * 4;
  const vol = o.vol ?? 1;
  for (let b = 0; b < mel.length; b++) {
    const tb = t0 + b * comp;
    if (o.ate && tb >= o.ate) break;
    const [baixo, acorde] = PROG[b % 4];
    const transp = o.transp ?? 0;
    const T = (n) => hz(midi(n) + transp);
    // baixo (triângulo) em colcheias com oitava
    for (let k = 0; k < 8; k++) {
      const t = tb + k * colc;
      if (o.ate && t >= o.ate) break;
      const f = T(baixo) * (k % 2 ? 2 : 1);
      m.voz(t, colc * 0.85, tri(f), { vol: 0.34 * vol, a: 0.003, d: 0.02, s: 0.9, r: 0.02 });
    }
    // arpejo (pulso 12,5%) em semicolcheias
    for (let k = 0; k < 16; k++) {
      const t = tb + k * sem;
      if (o.ate && t >= o.ate) break;
      const n = acorde[(k + (o.arpInv ? 2 : 0)) % 3];
      m.voz(t, sem * 0.7, pulso(T(n) * (o.arpOitava ? 2 : 1), 0.125), { vol: 0.055 * vol, pan: 0.35, a: 0.002, d: 0.04, s: 0.5, r: 0.02 });
    }
    // melodia (pulso 25%) com vibrato leve
    const linha = mel[b];
    for (let k = 0; k < 8; k++) {
      const n = linha[k];
      if (!n) continue;
      let dur = colc;
      for (let j = k + 1; j < 8 && !linha[j]; j++) dur += colc;
      const t = tb + k * colc;
      if (o.ate && t >= o.ate) break;
      const f = T(n) * (o.leadOitava ? 2 : 1);
      m.voz(t, dur * 0.92, (x) => pulso(f * (1 + (x > 0.15 ? Math.sin(x * 34) * 0.006 : 0)), 0.25)(x), { vol: 0.085 * vol, pan: -0.25, a: 0.003, d: 0.08, s: 0.75, r: 0.05 });
      // eco (harmonia uma terça abaixo, mais baixa)
      if (o.harmonia) m.voz(t + colc * 0.5, dur * 0.8, pulso(f * 0.794, 0.5), { vol: 0.03 * vol, pan: 0.3, a: 0.003, d: 0.05, s: 0.6, r: 0.04 });
    }
    // bateria
    const passos = o.intenso ? 16 : 8;
    for (let k = 0; k < passos; k++) {
      const t = tb + k * (comp / passos);
      if (o.ate && t >= o.ate) break;
      const pos = k / passos;
      const kick = o.intenso ? k % 4 === 0 || k === 10 : pos === 0 || pos === 0.5 || k === 5;
      const snare = o.intenso ? k % 8 === 4 || (b % 4 === 3 && k >= 12) : pos === 0.25 || pos === 0.75;
      bateria(m, t, k, kick, snare, true, vol);
    }
  }
}

function trilha(m) {
  // INTRO (0–5 s): arpejo subindo + virada de caixa; silencia na contagem
  for (let k = 0; k < 20; k++) {
    const t = 0.15 + k * 0.13;
    const n = ['A3', 'C4', 'E4', 'A4'][k % 4];
    m.voz(t, 0.11, pulso(hz(midi(n) + 12 * Math.floor(k / 8)), 0.25), { vol: 0.06 + k * 0.003, pan: -0.2, s: 0.6 });
  }
  m.voz(0.15, 2.6, tri(hz('A2')), { vol: 0.25, a: 0.5, s: 0.8, r: 0.3 });
  for (let k = 0; k < 12; k++) bateria(m, 1.9 + k * 0.07, k, false, true, false, 0.4 + k * 0.05);
  for (const t of [2.8, 3.47, 4.13]) m.voz(t, 0.35, tri(hz('A1')), { vol: 0.3, a: 0.002, d: 0.3, s: 0, r: 0.05 });
  // BATALHA (5–70 s) — 144 BPM
  const bpm = 144, comp = (60 / bpm) * 4;
  let t = TEMPO.luta / FPS;
  const fim = TEMPO.duelo / FPS;
  let k = 0;
  while (t < fim) {
    const mel = k % 3 === 2 ? MEL_B : MEL_A;
    frase(m, t, bpm, mel, { ate: fim, harmonia: k > 0, arpInv: k % 2 === 1 });
    t += comp * 8; k++;
  }
  // DUELO (70–80 s) — 160 BPM, mais intenso, meio tom acima
  const t1 = TEMPO.duelo / FPS, t2 = TEMPO.vitoria / FPS;
  m.voz(t1, 1.4, (x) => pulso(220 * (1 + x * 2.5), 0.5)(x), { vol: 0.06, a: 0.01, s: 0.8, r: 0.1 }); // riser do VS
  frase(m, t1 + 1.6, 160, [...MEL_B, ...MEL_A], { ate: t2 - 0.05, intenso: true, transp: 1, leadOitava: false, harmonia: true, arpOitava: true });
  // VITÓRIA (80–87 s): jingle + loop calmo em dó maior
  const tv = t2 + 0.05;
  const jingle = [['G4', 0, 0.1], ['C5', 0.1, 0.1], ['E5', 0.2, 0.1], ['G5', 0.3, 0.1], ['C6', 0.42, 0.55], ['A5', 1.0, 0.14], ['B5', 1.16, 0.14], ['C6', 1.32, 0.14], ['D6', 1.48, 0.3], ['C6', 1.82, 0.7]];
  for (const [n, dt, d] of jingle) {
    m.voz(tv + dt, d, pulso(hz(n), 0.25), { vol: 0.12, pan: -0.15, s: 0.8, r: 0.08 });
    m.voz(tv + dt, d, pulso(hz(midi(n) - 4), 0.5), { vol: 0.045, pan: 0.25, s: 0.7, r: 0.08 });
  }
  for (const [n, dt, d] of [['C3', 0.42, 0.55], ['F3', 1.0, 0.45], ['G3', 1.48, 0.3], ['C3', 1.82, 0.9]]) m.voz(tv + dt, d, tri(hz(n)), { vol: 0.32, s: 0.9, r: 0.1 });
  bateria(m, tv + 0.42, 0, true, true, false, 1); bateria(m, tv + 1.82, 0, true, true, false, 1);
  const prog2 = [['C3', ['C5', 'E5', 'G5']], ['A2', ['A4', 'C5', 'E5']], ['F2', ['F4', 'A4', 'C5']], ['G2', ['G4', 'B4', 'D5']]];
  const tl = tv + 2.8, bpm2 = 120, cb = 60 / bpm2;
  for (let b = 0; tl + b * cb * 4 < DUR; b++) {
    const [bx, ac] = prog2[b % 4];
    const tb = tl + b * cb * 4;
    const fade = tb > TEMPO.cta / FPS ? 0.6 : 1;
    for (let q = 0; q < 4; q++) m.voz(tb + q * cb, cb * 0.9, tri(hz(bx) * (q % 2 ? 2 : 1)), { vol: 0.24 * fade, s: 0.85, r: 0.05 });
    for (let q = 0; q < 8; q++) m.voz(tb + q * cb / 2, cb * 0.4, pulso(hz(ac[q % 3]), 0.125), { vol: 0.05 * fade, pan: 0.3, s: 0.5, r: 0.03 });
    for (let q = 0; q < 4; q++) bateria(m, tb + q * cb, q, q % 2 === 0, q % 2 === 1, true, 0.6 * fade);
  }
}

// ───────────────────────── efeitos ─────────────────────────
const TIPO_SOM = {
  feixe: 'feixe', feixeGrande: 'feixe', roxo: 'feixe', genki: 'feixe', rasengan: 'feixe',
  explosao: 'explosao', smash: 'impacto', jajanken: 'impacto', divergente: 'impacto', blackflash: 'impacto', gear: 'impacto', pistol: 'impacto',
  cortes: 'corte', cortesGrandes: 'corte', getsuga: 'corte', fogoCorte: 'fogo', agua: 'agua',
  relampago: 'raio', chidori: 'raio', godspeed: 'raio', gelo: 'gelo', fogo: 'fogo', amaterasu: 'fogo', clones: 'poof', infinito: 'brilho',
};
function sfx(m, nome, t, vol, extra, R) {
  const pan = (R() - 0.5) * 0.5;
  const rn = ruidoPasso(Math.floor(t * 991) + 7, 30000);
  const rnB = ruidoPasso(Math.floor(t * 313) + 11, 6000);
  switch (nome) {
    case 'passo': m.voz(t, 0.03, (x) => rnB(x) * 0.6, { vol: 0.1 * vol, pan, a: 0.001, d: 0.03, s: 0, r: 0.01 }); break;
    case 'hit':
      m.voz(t, 0.09, (x) => pulso(440 * Math.exp(-x * 25), 0.5)(x) * 0.6 + rn(x) * 0.5, { vol: 0.32 * vol, pan, a: 0.001, d: 0.09, s: 0, r: 0.02 });
      m.voz(t, 0.1, (x) => Math.sin(2 * Math.PI * (90 + 160 * Math.exp(-x * 50)) * x), { vol: 0.35 * vol, a: 0.001, d: 0.1, s: 0, r: 0.02 });
      break;
    case 'feixe':
      m.voz(t, 0.25, (x) => pulso(330 + x * 1500, 0.5)(x) * 0.4, { vol: 0.22 * vol, pan, a: 0.01, s: 0.8, r: 0.04 });
      m.voz(t + 0.13, 0.5, (x) => rn(x) * 0.6 + pulso(110 + Math.sin(x * 90) * 10, 0.5)(x) * 0.4, { vol: 0.26 * vol, pan, a: 0.01, d: 0.1, s: 0.7, r: 0.25 });
      break;
    case 'explosao':
      m.voz(t + 0.1, 0.5, (x) => rnB(x) * (1 - x) + Math.sin(2 * Math.PI * (60 + 40 * Math.exp(-x * 8)) * x) * 0.6, { vol: 0.42 * vol, pan, a: 0.002, d: 0.4, s: 0.2, r: 0.2 });
      break;
    case 'impacto':
      m.voz(t, 0.08, (x) => rn(x) * 0.5, { vol: 0.15 * vol, pan, a: 0.001, d: 0.06, s: 0, r: 0.02 });
      m.voz(t + 0.1, 0.22, (x) => Math.sin(2 * Math.PI * (70 + 200 * Math.exp(-x * 30)) * x) + rnB(x) * 0.4, { vol: 0.4 * vol, pan, a: 0.001, d: 0.2, s: 0.1, r: 0.05 });
      break;
    case 'corte':
      m.voz(t, 0.14, (x) => ruidoPasso(Math.floor(t * 71), 9000 + x * 60000)(x) * 0.8, { vol: 0.24 * vol, pan, a: 0.004, d: 0.12, s: 0.1, r: 0.05 });
      m.voz(t + 0.1, 0.06, (x) => pulso(1800 - x * 8000, 0.5)(x), { vol: 0.06 * vol, pan, a: 0.001, d: 0.06, s: 0, r: 0.01 });
      break;
    case 'agua':
      for (let k = 0; k < 5; k++) m.voz(t + k * 0.045, 0.05, (x) => Math.sin(2 * Math.PI * (900 - k * 90 + 600 * Math.exp(-x * 60)) * x), { vol: 0.12 * vol, pan, a: 0.001, d: 0.05, s: 0, r: 0.02 });
      m.voz(t, 0.3, (x) => rnB(x) * 0.5, { vol: 0.12 * vol, pan, a: 0.02, d: 0.2, s: 0.3, r: 0.1 });
      break;
    case 'raio':
      m.voz(t, 0.35, (x) => pulso(180 + (rnB(x) > 0 ? 400 : 60), 0.5)(x) * 0.5 + rn(x) * 0.5, { vol: 0.22 * vol, pan, a: 0.002, d: 0.1, s: 0.6, r: 0.15 });
      break;
    case 'gelo':
      for (let k = 0; k < 6; k++) m.voz(t + k * 0.04, 0.08, tri(hz(84 + [0, 4, 7, 12, 16, 19][k])), { vol: 0.08 * vol, pan, a: 0.001, d: 0.07, s: 0.2, r: 0.05 });
      m.voz(t + 0.12, 0.2, (x) => rn(x) * 0.6, { vol: 0.12 * vol, pan, a: 0.001, d: 0.2, s: 0, r: 0.02 });
      break;
    case 'fogo':
      m.voz(t, 0.55, (x) => rnB(x) * 0.8 * (0.6 + 0.4 * Math.sin(x * 40)), { vol: 0.24 * vol, pan, a: 0.05, d: 0.2, s: 0.6, r: 0.2 });
      break;
    case 'poof':
      m.voz(t, 0.18, (x) => ruidoPasso(Math.floor(t * 37), 4000)(x) * 0.8, { vol: 0.16 * vol, pan, a: 0.01, d: 0.15, s: 0, r: 0.05 });
      break;
    case 'brilho':
      for (const n of [88, 92, 95, 100]) m.voz(t, 0.35, (x) => Math.sin(2 * Math.PI * hz(n) * x), { vol: 0.045 * vol, pan, a: 0.01, d: 0.1, s: 0.5, r: 0.2 });
      break;
    case 'whoosh':
      m.voz(t, 0.28, (x) => ruidoPasso(Math.floor(t * 59), 2000 + x * 40000)(x) * 0.7, { vol: 0.3 * vol, a: 0.05, d: 0.1, s: 0.8, r: 0.1 });
      break;
    case 'estalo':
      m.voz(t, 0.05, (x) => rn(x) + pulso(2400, 0.5)(x) * 0.3, { vol: 0.34 * vol, a: 0.0005, d: 0.05, s: 0, r: 0.01 });
      m.voz(t, 0.18, (x) => Math.sin(2 * Math.PI * (120 * Math.exp(-x * 10)) * x), { vol: 0.35 * vol, a: 0.001, d: 0.15, s: 0, r: 0.03 });
      break;
    case 'hpbaixo':
      for (const dt of [0, 0.14]) m.voz(t + dt, 0.07, pulso(1046, 0.5), { vol: 0.07 * vol, a: 0.001, d: 0.02, s: 0.8, r: 0.01 });
      break;
    case 'derrota':
      ['E5', 'C5', 'A4', 'F4', 'D4', 'A3'].forEach((n, k) => m.voz(t + k * 0.06, 0.07, pulso(hz(n), 0.25), { vol: 0.11 * vol, pan, a: 0.001, d: 0.03, s: 0.7, r: 0.03 }));
      m.voz(t + 0.36, 0.25, (x) => Math.sin(2 * Math.PI * (80 * Math.exp(-x * 4)) * x), { vol: 0.3 * vol, a: 0.002, d: 0.2, s: 0, r: 0.05 });
      break;
    case 'banner':
      m.voz(t, 0.05, pulso(1318, 0.5), { vol: 0.07 * vol, a: 0.001, d: 0.02, s: 0.8, r: 0.01 });
      m.voz(t + 0.06, 0.08, pulso(1760, 0.5), { vol: 0.07 * vol, a: 0.001, d: 0.02, s: 0.8, r: 0.02 });
      break;
    case 'blip':
      m.voz(t, 0.04, pulso(hz(72 + (extra.n ?? 0)), 0.25), { vol: 0.06 * vol, pan, a: 0.001, d: 0.02, s: 0.7, r: 0.01 });
      break;
    case 'conta':
      m.voz(t, 0.18, pulso(extra.n === 1 ? 880 : 660, 0.5), { vol: 0.15 * vol, a: 0.001, d: 0.05, s: 0.8, r: 0.05 });
      break;
    case 'fight':
      for (const n of ['A4', 'E5', 'A5', 'C#6']) m.voz(t, 0.45, pulso(hz(n), 0.25), { vol: 0.07 * vol, a: 0.002, d: 0.1, s: 0.7, r: 0.2 });
      m.voz(t, 0.4, (x) => rnB(x) * (1 - x * 2), { vol: 0.25 * vol, a: 0.001, d: 0.3, s: 0, r: 0.1 });
      m.voz(t, 0.3, (x) => Math.sin(2 * Math.PI * (60 + 100 * Math.exp(-x * 20)) * x), { vol: 0.4 * vol, a: 0.001, d: 0.3, s: 0, r: 0.05 });
      break;
    case 'fanfarra':
      for (let k = 0; k < 12; k++) m.voz(t + 0.4 + k * 0.05, 0.06, (x) => Math.sin(2 * Math.PI * hz(96 + (k * 5) % 12) * x), { vol: 0.03 * vol, pan: (k % 2 ? 0.4 : -0.4), a: 0.001, d: 0.05, s: 0.3, r: 0.05 });
      break;
  }
}

export function gerarAudio(sim, dados, o = {}) {
  const musica = new Mix(), fx = new Mix();
  trilha(musica);
  const R = rng((dados.seed ?? 1) + 99);
  // blips dos nomes na intro
  const evs = [...sim.audio];
  dados.lutadores.forEach((_, i) => evs.push({ f: 18 + i * 4, som: 'blip', vol: 0.8, n: i % 8 === 0 ? 0 : [0, 2, 4, 5, 7, 9, 11, 12][i % 8] }));
  evs.sort((a, b) => a.f - b.f);
  // limite de efeitos simultâneos e de repetição
  const PRIORIDADE = new Set(['especial', 'derrota', 'conta', 'fight', 'whoosh', 'estalo', 'banner', 'fanfarra']);
  const ativos = [];
  const ultimo = {};
  for (const e of evs) {
    const t = e.f / FPS;
    let nome = e.som;
    if (nome === 'golpe' || nome === 'especial') nome = TIPO_SOM[e.efeito] ?? 'impacto';
    const chave = e.som === 'golpe' ? 'golpe' : nome;
    const intervalo = { passo: 0.16, hit: 0.1, golpe: 0.13, hpbaixo: 0.5 }[chave] ?? 0;
    if (ultimo[chave] !== undefined && t - ultimo[chave] < intervalo) continue;
    while (ativos.length && ativos[0] < t) ativos.shift();
    const prio = PRIORIDADE.has(e.som);
    if (!prio && ativos.length >= 4) continue;
    ultimo[chave] = t;
    ativos.push(t + 0.35); ativos.sort((a, b) => a - b);
    const vol = (e.vol ?? 1) * (e.som === 'especial' ? 1.35 : 1);
    sfx(fx, nome, t, vol, e, R);
    if (e.som === 'especial') sfx(fx, 'impacto', t + 0.4, 0.8, e, R);
  }
  // mixagem: trilha recua durante cut-ins e no CTA; efeitos ~5 dB acima
  const out = new Float32Array(N * 2);
  const duck = new Float32Array(N).fill(1);
  for (const c of sim.cutins) { const i0 = Math.floor((c.f0 / FPS) * SR), i1 = Math.floor((c.f1 / FPS + 0.2) * SR); for (let i = i0; i < i1 && i < N; i++) duck[i] = Math.min(duck[i], 0.6); }
  let suave = 1, lpL = 0, lpR = 0;
  const G_MUS = o.semMusica ? 0 : 0.5, G_FX = o.semFx ? 0 : 1.0;
  for (let i = 0; i < N; i++) {
    suave += (duck[i] - suave) * 0.0006;
    let l = musica.L[i] * G_MUS * suave + fx.L[i] * G_FX;
    let r = musica.R[i] * G_MUS * suave + fx.R[i] * G_FX;
    // passa-baixas suave (tira a aspereza do pulso) + saturação leve
    lpL += (l - lpL) * 0.55; lpR += (r - lpR) * 0.55;
    out[i * 2] = Math.tanh(lpL * 1.1); out[i * 2 + 1] = Math.tanh(lpR * 1.1);
  }
  const i0 = Math.floor(((o.de ?? 0) / FPS) * SR), i1 = Math.floor(((o.ate ?? TEMPO.total) / FPS) * SR);
  return wav(out.subarray(i0 * 2, i1 * 2));
}

function wav(dados) {
  const n = dados.length / 2;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < dados.length; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(dados[i] * 32767))), 44 + i * 2);
  return buf;
}
export { SR };
