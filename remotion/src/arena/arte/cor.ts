// Cores: conversões e rampas com hue shifting (sombra puxa para roxo/azul, luz para amarelo).

export type RGB = [number, number, number];

export const hex = (h: string): RGB => {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

export const paraHex = (c: RGB) =>
  "#" + c.map((v) => ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2)).join("");

export const misturar = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const rgbHsl = ([r, g, b]: RGB): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = 0;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
};

const hslRgb = (h: number, s: number, l: number): RGB => {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

/** gira o matiz `h` em direção a `alvo` por no máximo `graus` */
const puxar = (h: number, alvo: number, graus: number) => {
  let d = ((alvo - h + 540) % 360) - 180;
  if (Math.abs(d) < graus) return alvo;
  d = Math.sign(d) * graus;
  return h + d;
};

/**
 * Rampa de 5 tons: [sombra profunda, sombra, base, luz, brilho].
 * Sombras puxam para 255° (azul-roxo), luzes para 50° (amarelo).
 */
export const rampa = (base: string, opts: { brilho?: number; contraste?: number } = {}): RGB[] => {
  const [h, s, l] = rgbHsl(hex(base));
  const k = opts.contraste ?? 1;
  const cinza = s < 0.08;
  const sh = (graus: number) => (cinza ? h : graus);
  const tons: RGB[] = [
    hslRgb(cinza ? 250 : puxar(h, 255, sh(32)), Math.min(1, s * 0.9 + (cinza ? 0.12 : 0.08)), l - 0.3 * k),
    hslRgb(cinza ? 240 : puxar(h, 255, sh(16)), Math.min(1, s * 0.95 + (cinza ? 0.08 : 0.04)), l - 0.15 * k),
    hslRgb(h, s, l),
    hslRgb(cinza ? 45 : puxar(h, 50, sh(10)), cinza ? 0.08 : s * 0.95, l + 0.12 * k),
    hslRgb(cinza ? 50 : puxar(h, 55, sh(20)), cinza ? 0.12 : s * 0.75, l + 0.24 * k + (opts.brilho ?? 0)),
  ];
  return tons;
};

export const escurecer = (c: RGB, t: number): RGB => misturar(c, [16, 10, 24], t);
export const clarear = (c: RGB, t: number): RGB => misturar(c, [255, 250, 230], t);

/** dessatura e escurece (cenário fica atrás dos personagens) */
export const apagado = (c: RGB, sat: number, luz: number): RGB => {
  const m = (c[0] + c[1] + c[2]) / 3;
  return [(m + (c[0] - m) * sat) * luz, (m + (c[1] - m) * sat) * luz, (m + (c[2] - m) * sat) * luz];
};
