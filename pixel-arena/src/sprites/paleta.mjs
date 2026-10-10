// Limita cada personagem a uma paleta própria de até N cores (k-means em espaço Lab, ponderado
// pela frequência). Garante a regra "14–20 cores por personagem" sem perder as rampas principais.
import { canal, rgba } from '../img.mjs';

function lab(c) {
  const [r, g, b] = canal(c).map((v) => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; });
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** imgs: lista de Img de amostra → { paleta: [cores], mapa: Map(cor→cor) } */
export function reduzirPaleta(imgs, n = 20) {
  const hist = new Map();
  for (const im of imgs) for (const c of im.d) if (c >>> 24) hist.set(c, (hist.get(c) ?? 0) + 1);
  const cores = [...hist.keys()];
  if (cores.length <= n) return { paleta: cores, mapa: new Map(cores.map((c) => [c, c])) };
  const L = cores.map(lab), w = cores.map((c) => hist.get(c));
  // inicialização k-means++ determinística: começa pela cor mais frequente, depois a mais distante ponderada
  const cent = [L[w.indexOf(Math.max(...w))].slice()];
  while (cent.length < n) {
    let melhor = -1, nota = -1;
    for (let i = 0; i < L.length; i++) {
      const dm = Math.min(...cent.map((c) => d2(c, L[i])));
      const s = dm * Math.sqrt(w[i]);
      if (s > nota) { nota = s; melhor = i; }
    }
    cent.push(L[melhor].slice());
  }
  const atrib = new Int32Array(L.length);
  for (let it = 0; it < 25; it++) {
    for (let i = 0; i < L.length; i++) { let b = 0, bd = Infinity; cent.forEach((c, k) => { const d = d2(c, L[i]); if (d < bd) { bd = d; b = k; } }); atrib[i] = b; }
    const soma = cent.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < L.length; i++) { const s = soma[atrib[i]]; const ww = Math.sqrt(w[i]); s[0] += L[i][0] * ww; s[1] += L[i][1] * ww; s[2] += L[i][2] * ww; s[3] += ww; }
    soma.forEach((s, k) => { if (s[3]) cent[k] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  // cada centro vira a cor real mais próxima dele (mantém cores "desenhadas", sem médias lavadas)
  const paleta = cent.map((c) => { let b = 0, bd = Infinity; L.forEach((l, i) => { const d = d2(c, l); if (d < bd) { bd = d; b = i; } }); return cores[b]; });
  const PL = paleta.map(lab);
  const mapa = new Map();
  const mapear = (c) => { const l = lab(c); let b = 0, bd = Infinity; PL.forEach((p, k) => { const d = d2(p, l); if (d < bd) { bd = d; b = k; } }); return paleta[b]; };
  for (const c of cores) mapa.set(c, mapear(c));
  mapa.mapear = mapear;
  return { paleta, mapa };
}

export function aplicarPaleta(img, mapa) {
  for (let i = 0; i < img.d.length; i++) {
    const c = img.d[i];
    if (!(c >>> 24)) continue;
    let m = mapa.get(c);
    if (m === undefined) { m = mapa.mapear(c); mapa.set(c, m); }
    img.d[i] = m;
  }
  return img;
}
export { rgba };
