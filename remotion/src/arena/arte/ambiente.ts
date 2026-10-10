// Vida do calabouço: chamas de 4 quadros, fagulhas, fumaça, gotas nas poças, ratos e poeira.
import { Arena, tremor } from "./arena";
import { Buf, px, somar } from "./buffer";
import { RGB } from "./cor";

const rnd = (a: number, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// chama: 4 quadros desenhados à mão (n = núcleo, a = amarelo, l = laranja, v = vermelho)
const CHAMA = [
  ["..v..", ".vl..", ".lav.", "vlanl", "lanal", ".lnl.", "..l.."],
  ["...v.", "..lv.", ".vla.", "vlnal", "lanal", ".lnl.", "..l.."],
  [".v...", ".lv..", ".alv.", "lanlv", "lanal", ".lnl.", "..l.."],
  ["..v..", "..lv.", ".vlav", "vlnal", "lanal", ".lal.", "..l.."],
];
const COR_CHAMA: Record<string, RGB> = {
  n: [255, 250, 220],
  a: [255, 214, 90],
  l: [250, 140, 40],
  v: [200, 60, 30],
};

export const pintarAmbiente = (b: Buf, a: Arena, f: number) => {
  // chamas, fagulhas e fumaça
  a.tochas.forEach((t, k) => {
    const q = CHAMA[(Math.floor(f / 4) + k) % 4];
    const grande = t.tipo === "braseiro";
    const esc = grande ? 2 : 1;
    const ox = t.x - Math.floor((5 * esc) / 2);
    const oy = t.y - 7 * esc + (grande ? -2 : 1);
    q.forEach((linha, j) =>
      linha.split("").forEach((c, i) => {
        if (c === ".") return;
        for (let yy = 0; yy < esc; yy++) for (let xx = 0; xx < esc; xx++) px(b, ox + i * esc + xx, oy + j * esc + yy, COR_CHAMA[c]);
      }),
    );
    // halo
    const amp = tremor(t, f);
    for (let yy = -6 * esc; yy <= 3 * esc; yy++)
      for (let xx = -5 * esc; xx <= 5 * esc; xx++) {
        const d = Math.hypot(xx, yy * 0.9) / (6 * esc);
        if (d < 1) somar(b, t.x + xx, oy + 4 * esc + yy, [70, 36, 10], (1 - d) * 0.35 * amp);
      }
    // fagulhas subindo
    for (let s = 0; s < (grande ? 5 : 3); s++) {
      const vida = 26;
      const nasc = Math.floor((f + s * 9 + k * 5) / vida);
      const idade = (f + s * 9 + k * 5) % vida;
      const dx = (rnd(nasc, k, s) - 0.5) * 8 + Math.sin(idade * 0.4 + s) * 1.5;
      const dy = -idade * (0.7 + rnd(nasc, s, k) * 0.5);
      const al = 1 - idade / vida;
      px(b, t.x + dx, oy + dy, idade < 8 ? [255, 230, 120] : [255, 140, 50], al);
    }
    // fumaça leve
    for (let s = 0; s < 3; s++) {
      const vida = 60;
      const idade = (f + s * 20 + k * 11) % vida;
      const dx = Math.sin((idade + s * 10) * 0.12) * 3;
      const dy = -idade * 0.45 - 6;
      const al = 0.22 * (1 - idade / vida);
      for (const [ex, ey] of [[0, 0], [1, 0], [0, 1], [1, 1]]) px(b, t.x + dx + ex, oy + dy + ey, [120, 116, 124], al);
    }
  });

  // gotas pingando nas poças
  a.pocas.forEach((p, k) => {
    const ciclo = 70 + k * 13;
    const t = (f + k * 31) % ciclo;
    const queda = 14;
    if (t < queda) {
      const y = p.y - 30 + (t / queda) * 30;
      px(b, p.x + 2, y, [170, 200, 220], 0.8);
      px(b, p.x + 2, y - 1, [170, 200, 220], 0.4);
    } else if (t < queda + 22) {
      const r = (t - queda) * 0.5;
      const al = 0.6 * (1 - (t - queda) / 22);
      for (let ang = 0; ang < Math.PI * 2; ang += 0.35) px(b, p.x + 2 + Math.cos(ang) * r * 1.6, p.y + Math.sin(ang) * r * 0.6, [190, 215, 230], al);
    }
    // reflexo do fogo tremulando
    const ref = 0.5 + 0.5 * Math.sin(f * 0.3 + k);
    px(b, p.x - 3, p.y - 1, [255, 170, 80], 0.35 * ref);
    px(b, p.x - 2, p.y - 1, [255, 200, 110], 0.25 * ref);
  });

  // ratos correndo pela base das paredes de vez em quando
  const rato = (inicio: number, dur: number, y: number, x0: number, x1: number) => {
    const t = f - inicio;
    if (t < 0 || t > dur) return;
    const x = x0 + ((x1 - x0) * t) / dur;
    const dir = Math.sign(x1 - x0);
    const pata = Math.floor(t / 2) % 2;
    const corpo: RGB = [70, 62, 60];
    for (let i = 0; i < 5; i++) px(b, x - dir * i, y, corpo);
    for (let i = 1; i < 4; i++) px(b, x - dir * i, y - 1, [90, 80, 76]);
    px(b, x + dir, y, [200, 150, 150]);
    px(b, x, y - 1, [20, 10, 10]);
    for (let i = 5; i < 9; i++) px(b, x - dir * i, y + (i > 6 ? 1 : 0), [150, 110, 110], 0.8);
    px(b, x - dir * (1 + pata), y + 1, [40, 34, 34]);
    px(b, x - dir * (3 + pata), y + 1, [40, 34, 34]);
  };
  rato(300, 70, 210, 30, 140);
  rato(900, 80, 548, 330, 200);
  rato(1500, 60, 210, 340, 250);
  rato(2150, 70, 548, 40, 160);

  // poeira no ar
  for (let s = 0; s < 22; s++) {
    const x = (rnd(s, 1) * 360 + f * (0.08 + rnd(s, 2) * 0.1) + Math.sin(f * 0.02 + s) * 6) % 360;
    const y = 200 + ((rnd(s, 3) * 360 + f * 0.05 * (s % 3 === 0 ? -1 : 1) + 360) % 360);
    px(b, x, y, [200, 190, 170], 0.18 + 0.1 * Math.sin(f * 0.1 + s));
  }
};
