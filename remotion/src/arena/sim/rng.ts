// Gerador determinístico (mulberry32) + rolagens de dados com registro para conferência.

export type Rolagem = {
  expr: string; // ex.: "1d20+5", "4d6↓"
  dados: number[]; // valores de cada dado, na ordem em que saíram
  total: number;
  nota?: string;
};

export class Dados {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** número em [0, 1) */
  float(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** um dado de `lados` faces: 1..lados */
  d(lados: number): number {
    return 1 + Math.floor(this.float() * lados);
  }

  /** inteiro em [a, b] */
  int(a: number, b: number): number {
    return a + Math.floor(this.float() * (b - a + 1));
  }

  pick<T>(lista: readonly T[]): T {
    return lista[Math.floor(this.float() * lista.length)];
  }

  /** escolha com pesos */
  peso<T>(lista: readonly (readonly [T, number])[]): T {
    let total = 0;
    for (const [, p] of lista) total += p;
    let r = this.float() * total;
    for (const [v, p] of lista) {
      r -= p;
      if (r < 0) return v;
    }
    return lista[lista.length - 1][0];
  }

  embaralhar<T>(lista: T[]): T[] {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /** rola NdX(+mod) e devolve a rolagem completa */
  rolar(n: number, lados: number, mod = 0): Rolagem {
    const dados: number[] = [];
    for (let i = 0; i < n; i++) dados.push(this.d(lados));
    let total = mod;
    for (const v of dados) total += v;
    const m = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : "";
    return { expr: `${n}d${lados}${m}`, dados, total };
  }
}

/** hash inteiro estável (para sementes derivadas: arte, nomes, etc.) */
export const hash = (...partes: (string | number)[]): number => {
  let h = 2166136261 >>> 0;
  for (const p of partes) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= 0x9e3779b9;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

export const mod = (valor: number) => Math.floor((valor - 10) / 2);
export const sinal = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
