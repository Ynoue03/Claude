// Lê a descrição livre que o seguidor escreveu no comentário e tira dela
// classe, espécie e aparência. O que não estiver na descrição é sorteado.
// Os ATRIBUTOS nunca vêm da descrição: são sempre rolados nos dados.

import type { ClasseId, EspecieId } from "./srd";

export type EstiloCabelo = "curto" | "longo" | "rabo" | "careca" | "moicano" | "coque" | "trancas";

export type Pistas = {
  classe?: ClasseId;
  especie?: EspecieId;
  cores: { cabelo?: string; roupa?: string; detalhe?: string; olhos?: string; pele?: string; metal?: string };
  cabelo?: EstiloCabelo;
  barba?: boolean;
  coresSoltas: string[]; // palavras de cor que não ficaram presas a nenhum objeto
};

const sem = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const CLASSES: [ClasseId, string[]][] = [
  ["guerreiro", ["guerreiro", "guerreira", "fighter", "soldado", "cavaleiro", "cavaleira", "gladiador", "espadachim", "knight", "warrior"]],
  ["barbaro", ["barbaro", "barbara", "barbarian", "viking", "berserker", "furia"]],
  ["paladino", ["paladino", "paladina", "paladin", "templario", "cruzado"]],
  ["patrulheiro", ["patrulheiro", "patrulheira", "ranger", "arqueiro", "arqueira", "cacador", "cacadora"]],
  ["ladino", ["ladino", "ladina", "rogue", "ladrao", "ladra", "assassino", "assassina", "ninja", "gatuno"]],
  ["monge", ["monge", "monk", "lutador", "lutadora", "artes marciais", "kung fu", "shaolin"]],
  ["mago", ["mago", "maga", "wizard", "arcanista", "estudioso", "grimorio"]],
  ["feiticeiro", ["feiticeiro", "feiticeira", "sorcerer", "sorceress"]],
  ["bruxo", ["bruxo", "bruxa", "warlock", "pacto", "demonio", "sombrio", "sombria", "necromante"]],
  ["clerigo", ["clerigo", "cleriga", "cleric", "sacerdote", "sacerdotisa", "padre", "freira", "curandeiro", "curandeira"]],
  ["druida", ["druida", "druid", "natureza", "xama", "floresta"]],
  ["bardo", ["bardo", "barda", "bard", "musico", "musica", "cantor", "cantora", "alaude", "violao"]],
];

const ESPECIES: [EspecieId, string[]][] = [
  ["anao", ["anao", "dwarf", "barbudo baixinho"]],
  ["elfo", ["elfo", "elfa", "elf", "orelha pontuda", "orelhas pontudas"]],
  ["halfling", ["halfling", "hobbit", "pequenino", "pequenina"]],
  ["gnomo", ["gnomo", "gnoma", "gnome"]],
  ["orc", ["orc", "meio-orc", "meio orc", "half-orc", "orque"]],
  ["tiefling", ["tiefling", "chifre", "chifres", "infernal", "diabo", "cauda"]],
  ["draconato", ["draconato", "dragonborn", "dragao", "escamas", "dragonico"]],
  ["golias", ["golias", "goliath", "gigante"]],
  ["humano", ["humano", "humana", "human"]],
];

export const CORES: Record<string, string> = {
  vermelho: "#b33a32", vermelha: "#b33a32", red: "#b33a32", carmesim: "#9c1f2a", escarlate: "#c4302b",
  azul: "#3a62b0", blue: "#3a62b0", "azul-claro": "#6fa8dc", celeste: "#6fa8dc", marinho: "#24356b",
  verde: "#3f8a45", green: "#3f8a45", esmeralda: "#1f8a5a", oliva: "#6b7a3a",
  preto: "#2a2833", preta: "#2a2833", negro: "#2a2833", negra: "#2a2833", black: "#2a2833",
  branco: "#e6e2d8", branca: "#e6e2d8", white: "#e6e2d8", prateado: "#aab3bd", prateada: "#aab3bd", prata: "#aab3bd", silver: "#aab3bd",
  dourado: "#d4a437", dourada: "#d4a437", ouro: "#d4a437", gold: "#d4a437", amarelo: "#e3c23e", amarela: "#e3c23e",
  roxo: "#6a3d9a", roxa: "#6a3d9a", purple: "#6a3d9a", violeta: "#7d4bb3", lilas: "#a68bd1",
  rosa: "#e07aa5", pink: "#e07aa5", laranja: "#e07a2e", orange: "#e07a2e",
  marrom: "#6b4a2f", castanho: "#6b4a2f", castanha: "#6b4a2f", brown: "#6b4a2f",
  cinza: "#7a7f86", grisalho: "#a9a9a9", grisalha: "#a9a9a9", gray: "#7a7f86", grey: "#7a7f86",
  ruivo: "#c0532a", ruiva: "#c0532a", loiro: "#e2c46a", loira: "#e2c46a", blond: "#e2c46a",
  turquesa: "#2fa8a0", vinho: "#6e1f33", bege: "#cdb68f",
};

const OBJETOS: [keyof Pistas["cores"], string[]][] = [
  ["cabelo", ["cabelo", "cabelos", "cabeleira", "hair", "barba", "ruivo", "ruiva", "loiro", "loira", "grisalho", "grisalha"]],
  ["olhos", ["olho", "olhos", "eyes"]],
  ["pele", ["pele", "skin", "escamas", "escama"]],
  ["metal", ["armadura", "elmo", "armor", "helmet", "escudo"]],
  ["detalhe", ["detalhe", "detalhes", "capuz", "faixa", "cinto", "luvas", "botas", "lenco", "cachecol"]],
  ["roupa", ["capa", "manto", "roupa", "roupas", "tunica", "veste", "vestes", "tunica", "robe", "cape", "cloak", "chapeu"]],
];

export const lerDescricao = (texto: string): Pistas => {
  const t = ` ${sem(texto)} `;
  const pistas: Pistas = { cores: {}, coresSoltas: [] };

  for (const [id, chaves] of CLASSES) if (chaves.some((c) => t.includes(c))) { pistas.classe = id; break; }
  for (const [id, chaves] of ESPECIES) if (chaves.some((c) => t.includes(c))) { pistas.especie = id; break; }
  if (!pistas.especie && / ana /.test(t)) pistas.especie = "anao"; // "anã"

  // cor perto do objeto: "capa vermelha", "cabelo azul", "olhos verdes", "armadura de ouro"
  const palavras = t.split(/[^a-z-]+/).filter(Boolean);
  palavras.forEach((p, i) => {
    for (const [campo, chaves] of OBJETOS) {
      if (!chaves.includes(p)) continue;
      // "ruivo"/"loiro" já é a própria cor do cabelo
      if (CORES[p] && campo === "cabelo") pistas.cores.cabelo ??= CORES[p];
      // em português a cor costuma vir depois ("capa vermelha"); depois olha antes ("dourada armadura")
      for (const j of [i + 1, i + 2, i + 3, i - 1, i - 2]) {
        if (j < 0 || j >= palavras.length || j === i) continue;
        if (OBJETOS.some(([, ch]) => ch.includes(palavras[j]) && !CORES[palavras[j]])) break; // outro objeto no meio
        const cor = CORES[palavras[j]] ?? CORES[palavras[j].replace(/s$/, "")];
        if (cor) { pistas.cores[campo] ??= cor; break; }
      }
    }
  });
  // sem objeto explícito: a primeira cor citada vira a cor da roupa
  if (!pistas.cores.roupa) {
    const usadas = Object.values(pistas.cores);
    const primeira = palavras.find((p) => CORES[p] && !usadas.includes(CORES[p]) && !["ruivo", "ruiva", "loiro", "loira", "grisalho", "grisalha"].includes(p));
    if (primeira) pistas.cores.roupa = CORES[primeira];
  }

  const usadasFim = Object.values(pistas.cores);
  pistas.coresSoltas = palavras.filter((p) => CORES[p] && !usadasFim.includes(CORES[p]));

  if (/careca|calvo|sem cabelo|bald/.test(t)) pistas.cabelo = "careca";
  else if (/moicano|mohawk/.test(t)) pistas.cabelo = "moicano";
  else if (/tranca|trancas|braid/.test(t)) pistas.cabelo = "trancas";
  else if (/rabo de cavalo|ponytail/.test(t)) pistas.cabelo = "rabo";
  else if (/coque|bun/.test(t)) pistas.cabelo = "coque";
  else if (/cabelo longo|cabelos longos|cabelo comprido|long hair/.test(t)) pistas.cabelo = "longo";
  else if (/cabelo curto|short hair/.test(t)) pistas.cabelo = "curto";

  if (/barba|barbudo|barbuda|beard/.test(t)) pistas.barba = true;
  if (/sem barba|imberbe/.test(t)) pistas.barba = false;
  return pistas;
};
