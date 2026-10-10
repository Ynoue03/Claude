// Dados de RPG com semente: a mesma semente sempre gera a mesma batalha.
// Isso é obrigatório no Remotion (cada quadro é renderizado de forma independente)
// e permite auditar qualquer rolagem depois (a semente fica salva no arquivo da batalha).

export type Rng = () => number;

// mulberry32 — rápido, bom o bastante para dados, 100% determinístico.
export const criarRng = (semente: number): Rng => {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Texto → número (para semear pelo nome do personagem, data etc.)
export const hash = (texto: string): number => {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const d = (rng: Rng, lados: number) => 1 + Math.floor(rng() * lados);

export const escolher = <T,>(rng: Rng, lista: readonly T[]): T => lista[Math.floor(rng() * lista.length)];

export const embaralhar = <T,>(rng: Rng, lista: T[]): T[] => {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

export type Rolagem = { expr: string; dados: number[]; bonus: number; total: number };

// "2d6+3", "8d6", "1d10-1". `critico` dobra a quantidade de dados (regra do SRD).
export const rolar = (rng: Rng, expr: string, critico = false): Rolagem => {
  const m = expr.replace(/\s/g, "").match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) throw new Error(`Expressão de dado inválida: ${expr}`);
  const qtd = Number(m[1]) * (critico ? 2 : 1);
  const lados = Number(m[2]);
  const bonus = m[3] ? Number(m[3]) : 0;
  const dados = Array.from({ length: qtd }, () => d(rng, lados));
  const total = Math.max(0, dados.reduce((a, b) => a + b, 0) + bonus);
  return { expr: critico ? `${qtd}d${lados}${m[3] ?? ""}` : expr, dados, bonus, total };
};

// d20 com vantagem / desvantagem: rola dois e fica com o maior / menor.
export const d20 = (rng: Rng, modo: "normal" | "vantagem" | "desvantagem" = "normal") => {
  const a = d(rng, 20);
  if (modo === "normal") return { valor: a, dados: [a] };
  const b = d(rng, 20);
  return { valor: modo === "vantagem" ? Math.max(a, b) : Math.min(a, b), dados: [a, b] };
};

// Modificador de atributo: (valor − 10) / 2, arredondado para baixo.
export const mod = (valor: number) => Math.floor((valor - 10) / 2);

export const sinal = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
