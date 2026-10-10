// Rampas de cor com hue shifting: sombras puxam para azul/roxo, luzes para amarelo.
import { rgba } from './img.mjs';

export function hexParaHsv(h) {
  const n = parseInt(h.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d) {
    if (mx === r) hh = ((g - b) / d) % 6;
    else if (mx === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60; if (hh < 0) hh += 360;
  }
  return [hh, mx ? d / mx : 0, mx];
}
export function hsv(h, s, v, a = 255) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); v = Math.max(0, Math.min(1, v));
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgba(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), a);
}
// gira o matiz h em direção a alvo, no máximo `passo` graus
const puxa = (h, alvo, passo) => {
  let d = ((alvo - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), passo);
};

/**
 * Rampa de 5 tons + contornos: [sombraProfunda, sombra, base, luz, brilho], contorno (sel-out), contornoLuz.
 * `sat` reduz a saturação (cenário mais apagado que os personagens).
 */
export function rampa(baseHex, o = {}) {
  const [h, s, v] = hexParaHsv(baseHex);
  const sat = o.sat ?? 1;
  const cinza = s < 0.08; // brancos/cinzas: hue shift menor
  const k = cinza ? 0.5 : 1;
  const sombraAlvo = o.sombraAlvo ?? 255;
  const tom = (dh, ds, dv, alvo) => hsv(puxa(h, alvo, dh * k), (s + ds * (cinza ? 0.6 : 1)) * sat, v + dv);
  const tons = [
    tom(32, 0.16, -0.34 * (o.contraste ?? 1), sombraAlvo),
    tom(16, 0.08, -0.17 * (o.contraste ?? 1), sombraAlvo),
    hsv(h, s * sat, v),
    tom(10, -0.08, 0.1, 55),
    tom(18, -0.2, 0.2, 55),
  ];
  const contorno = hsv(puxa(h, sombraAlvo, 45 * k), Math.min(1, (s + 0.25) * sat + 0.1), Math.max(0.08, v * 0.28));
  const contornoLuz = hsv(puxa(h, sombraAlvo, 30 * k), Math.min(1, (s + 0.2) * sat), Math.max(0.14, v * 0.5));
  return { tons, contorno, contornoLuz, hex: baseHex };
}
