// Cores em pixel art: luz puxa para o amarelo, sombra puxa para o azul/roxo ("hue shifting").
export type RGB = [number, number, number];

export const hexParaRgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbParaHex = ([r, g, b]: RGB) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

const rgbParaHsl = ([r, g, b]: RGB): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const dd = max - min;
  const s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min);
  let h = max === r ? (g - b) / dd + (g < b ? 6 : 0) : max === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
  return [h * 60, s, l];
};
const hslParaRgb = (h: number, s: number, l: number): RGB => {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

// gira o matiz em direção a um alvo (60 = amarelo, 250 = azul-roxo)
const puxar = (h: number, alvo: number, qtd: number) => {
  let df = alvo - h;
  if (df > 180) df -= 360;
  if (df < -180) df += 360;
  return h + Math.sign(df) * Math.min(Math.abs(df), qtd);
};

export const tom = (hex: string, passo: number): string => {
  // passo: +1 luz, -1 sombra, -2 sombra funda
  const [h, s, l] = rgbParaHsl(hexParaRgb(hex));
  if (passo > 0) return rgbParaHex(hslParaRgb(puxar(h, 55, 14 * passo), Math.min(1, s * 1.02), Math.min(0.94, l + 0.13 * passo)));
  const p = -passo;
  return rgbParaHex(hslParaRgb(puxar(h, 255, 16 * p), Math.min(1, s * (1 + 0.08 * p)), Math.max(0.05, l - 0.14 * p)));
};

export const misturar = (a: string, b: string, t: number) => {
  const A = hexParaRgb(a), B = hexParaRgb(b);
  return rgbParaHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
};
