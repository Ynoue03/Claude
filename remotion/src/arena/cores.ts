// Utilitários de cor (hex) usados por sprites, mapa e efeitos.
const parse = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const fmt = (r: number, g: number, b: number) =>
  "#" +
  [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");

// k > 0 clareia (mistura com branco), k < 0 escurece (mistura com preto)
export const tom = (hex: string, k: number) => {
  const [r, g, b] = parse(hex);
  return k >= 0
    ? fmt(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k)
    : fmt(r * (1 + k), g * (1 + k), b * (1 + k));
};

export const mistura = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return fmt(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};

// luminância relativa simples (0 escuro – 1 claro)
export const luz = (hex: string) => {
  const [r, g, b] = parse(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

export const CONTORNO = "#1A1424";

// Sombreamento com "hue shifting" (técnica clássica de pixel art): a sombra puxa para o roxo/azul
// e a luz puxa para o amarelo, em vez de só escurecer/clarear.
export const sombra = (hex: string, k: number) => mistura(tom(hex, -k), "#3A2470", k * 0.6);
export const brilho = (hex: string, k: number) => mistura(tom(hex, k), "#FFF2B0", k * 0.7);
