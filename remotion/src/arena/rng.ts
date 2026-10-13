// Gerador pseudoaleatório determinístico (sfc32) + rolagens de dados registradas.
// Mesma seed => mesmas rolagens, sempre. Nada aqui usa Math.random.

export type Rolagem = {
  rotulo: string; // ex.: "Kael · ataque (Montante)"
  expr: string; // ex.: "1d20+5"
  dados: number[]; // faces que saíram
  total: number;
};

const hashSeed = (s: string): [number, number, number, number] => {
  // cyrb128: transforma a seed em 4 inteiros de 32 bits
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0; i < s.length; i++) {
    const k = s.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
};

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  log: Rolagem[] = [];

  constructor(seed: string) {
    [this.a, this.b, this.c, this.d] = hashSeed(seed);
    for (let i = 0; i < 12; i++) this.next();
  }

  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Rola um dado sem registrar (usado para sorteios de aparência).
  die(faces: number): number {
    return this.int(1, faces);
  }

  // Rola NdF e registra no log de conferência.
  roll(rotulo: string, n: number, faces: number, mod = 0): Rolagem {
    const dados: number[] = [];
    for (let i = 0; i < n; i++) dados.push(this.die(faces));
    const total = dados.reduce((s, v) => s + v, 0) + mod;
    const expr = `${n}d${faces}${mod ? (mod > 0 ? `+${mod}` : `${mod}`) : ""}`;
    const r = { rotulo, expr, dados, total };
    this.log.push(r);
    return r;
  }
}

// Ruído determinístico para efeitos visuais (partículas etc.): mesmo (a,b,c) => mesmo valor em [0,1).
export const hash3 = (a: number, b = 0, c = 0): number => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
