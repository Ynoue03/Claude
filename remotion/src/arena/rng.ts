// Gerador pseudoaleatório determinístico (mulberry32): mesma seed → mesma luta.
export const criarRng = (seed: number) => {
  let a = seed >>> 0;
  const prox = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    prox,
    entre: (a0: number, b0: number) => a0 + (b0 - a0) * prox(),
    int: (n: number) => Math.floor(prox() * n),
    chance: (p: number) => prox() < p,
    embaralhar: <T>(lista: T[]) => {
      const l = lista.slice();
      for (let i = l.length - 1; i > 0; i--) {
        const j = Math.floor(prox() * (i + 1));
        [l[i], l[j]] = [l[j], l[i]];
      }
      return l;
    },
  };
};

// ruído determinístico por (a, b) — para efeitos visuais sem estado
export const hash = (a: number, b = 0) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
