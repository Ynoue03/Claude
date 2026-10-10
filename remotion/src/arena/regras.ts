// Tabelas de regras (SRD 5.2, níveis 1–5) e de aparência usadas pelo ARENA D20.

export type Atributo = "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR";
export const ATRIBUTOS: Atributo[] = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];

export type ClasseId =
  | "GUERREIRO"
  | "BARBARO"
  | "PALADINO"
  | "PATRULHEIRO"
  | "LADINO"
  | "MONGE"
  | "MAGO"
  | "FEITICEIRO"
  | "BRUXO"
  | "CLERIGO"
  | "DRUIDA"
  | "BARDO";

export type EspecieId =
  | "HUMANO"
  | "ELFO"
  | "ANAO"
  | "HALFLING"
  | "GNOMO"
  | "ORC"
  | "TIEFLING"
  | "DRACONATO"
  | "GOLIAS";

export type TipoDano =
  | "fogo"
  | "frio"
  | "eletrico"
  | "trovejante"
  | "radiante"
  | "necrotico"
  | "energia"
  | "psiquico"
  | "veneno"
  | "acido"
  | "cortante"
  | "perfurante"
  | "concussao"
  | "cura";

// Cor da caixa do golpe por tipo de dano (RGB hex).
export const COR_DANO: Record<TipoDano, string> = {
  fogo: "#e8701e",
  frio: "#6cc7f0",
  eletrico: "#f2d23a",
  trovejante: "#3a6fe0",
  radiante: "#e2b13c",
  necrotico: "#7a3fb0",
  energia: "#d23ab4",
  psiquico: "#ec6aa8",
  veneno: "#4fa83c",
  acido: "#a6d62a",
  cortante: "#d8d8d8",
  perfurante: "#d8d8d8",
  concussao: "#d8d8d8",
  cura: "#3fbf5a",
};

export type Classe = {
  id: ClasseId;
  nome: string; // como aparece na tela
  dv: number; // dado de vida
  prioridade: Atributo[]; // ordem de distribuição dos atributos (1º = principal)
  salvaguardas: Atributo[];
  conjuracao?: Atributo;
  cor: string; // quadradinho da classe no HUD
  distancia: boolean; // IA de atirador/conjurador (evita corpo a corpo)
  deslocamento?: number;
};

export const CLASSES: Record<ClasseId, Classe> = {
  GUERREIRO: { id: "GUERREIRO", nome: "Guerreiro", dv: 10, prioridade: ["FOR", "CON", "DES", "SAB", "CAR", "INT"], salvaguardas: ["FOR", "CON"], cor: "#b8402e", distancia: false },
  BARBARO: { id: "BARBARO", nome: "Bárbaro", dv: 12, prioridade: ["FOR", "CON", "DES", "SAB", "CAR", "INT"], salvaguardas: ["FOR", "CON"], cor: "#e0742a", distancia: false },
  PALADINO: { id: "PALADINO", nome: "Paladino", dv: 10, prioridade: ["FOR", "CAR", "CON", "SAB", "DES", "INT"], salvaguardas: ["SAB", "CAR"], conjuracao: "CAR", cor: "#f0d060", distancia: false },
  PATRULHEIRO: { id: "PATRULHEIRO", nome: "Patrulheiro", dv: 10, prioridade: ["DES", "SAB", "CON", "FOR", "INT", "CAR"], salvaguardas: ["FOR", "DES"], conjuracao: "SAB", cor: "#4f9a3a", distancia: true },
  LADINO: { id: "LADINO", nome: "Ladino", dv: 8, prioridade: ["DES", "CON", "INT", "SAB", "CAR", "FOR"], salvaguardas: ["DES", "INT"], cor: "#7c8494", distancia: false },
  MONGE: { id: "MONGE", nome: "Monge", dv: 8, prioridade: ["DES", "SAB", "CON", "FOR", "INT", "CAR"], salvaguardas: ["FOR", "DES"], cor: "#5fb6d8", distancia: false },
  MAGO: { id: "MAGO", nome: "Mago", dv: 6, prioridade: ["INT", "CON", "DES", "SAB", "CAR", "FOR"], salvaguardas: ["INT", "SAB"], conjuracao: "INT", cor: "#3d5bd6", distancia: true },
  FEITICEIRO: { id: "FEITICEIRO", nome: "Feiticeiro", dv: 6, prioridade: ["CAR", "CON", "DES", "SAB", "INT", "FOR"], salvaguardas: ["CON", "CAR"], conjuracao: "CAR", cor: "#d0324a", distancia: true },
  BRUXO: { id: "BRUXO", nome: "Bruxo", dv: 8, prioridade: ["CAR", "CON", "DES", "SAB", "INT", "FOR"], salvaguardas: ["SAB", "CAR"], conjuracao: "CAR", cor: "#8a3cc4", distancia: true },
  CLERIGO: { id: "CLERIGO", nome: "Clérigo", dv: 8, prioridade: ["SAB", "CON", "FOR", "DES", "CAR", "INT"], salvaguardas: ["SAB", "CAR"], conjuracao: "SAB", cor: "#e8e0c8", distancia: true },
  DRUIDA: { id: "DRUIDA", nome: "Druida", dv: 8, prioridade: ["SAB", "CON", "DES", "INT", "CAR", "FOR"], salvaguardas: ["INT", "SAB"], conjuracao: "SAB", cor: "#2f7a4a", distancia: true },
  BARDO: { id: "BARDO", nome: "Bardo", dv: 8, prioridade: ["CAR", "DES", "CON", "SAB", "INT", "FOR"], salvaguardas: ["DES", "CAR"], conjuracao: "CAR", cor: "#e46aa8", distancia: true },
};

export const CLASSE_IDS = Object.keys(CLASSES) as ClasseId[];

export type Especie = {
  id: EspecieId;
  nome: string;
  nomeF?: string;
  deslocamento: number;
  altura: number; // escala visual do corpo (1 = humano)
};

export const ESPECIES: Record<EspecieId, Especie> = {
  HUMANO: { id: "HUMANO", nome: "Humano", deslocamento: 30, altura: 1 },
  ELFO: { id: "ELFO", nome: "Elfo", deslocamento: 35, altura: 1 },
  ANAO: { id: "ANAO", nome: "Anão", deslocamento: 30, altura: 0.86 },
  HALFLING: { id: "HALFLING", nome: "Halfling", deslocamento: 30, altura: 0.8 },
  GNOMO: { id: "GNOMO", nome: "Gnomo", deslocamento: 30, altura: 0.8 },
  ORC: { id: "ORC", nome: "Orc", deslocamento: 30, altura: 1.04 },
  TIEFLING: { id: "TIEFLING", nome: "Tiefling", deslocamento: 30, altura: 1 },
  DRACONATO: { id: "DRACONATO", nome: "Draconato", deslocamento: 30, altura: 1.04 },
  GOLIAS: { id: "GOLIAS", nome: "Golias", deslocamento: 35, altura: 1.1 },
};
export const ESPECIE_IDS = Object.keys(ESPECIES) as EspecieId[];

export type Ancestralidade = { nome: string; cor: string; dano: TipoDano };
export const ANCESTRALIDADES: Ancestralidade[] = [
  { nome: "vermelho", cor: "#b8322a", dano: "fogo" },
  { nome: "azul", cor: "#2f5fc0", dano: "eletrico" },
  { nome: "branco", cor: "#d8e2ea", dano: "frio" },
  { nome: "verde", cor: "#3f8f3a", dano: "veneno" },
  { nome: "negro", cor: "#3a3442", dano: "acido" },
  { nome: "dourado", cor: "#d0a030", dano: "fogo" },
  { nome: "prateado", cor: "#a8b4c0", dano: "frio" },
  { nome: "bronze", cor: "#a8703a", dano: "eletrico" },
];

export const NOMES = [
  "Thorin", "Lyra", "Kael", "Mirela", "Bruk", "Seraphine", "Doran", "Vex", "Elowen", "Garruk",
  "Isolde", "Nyx", "Zara", "Ulric", "Wren", "Tamsin", "Orrin", "Rhea", "Borin", "Cassia",
  "Faelan", "Grom", "Liora", "Marek", "Quill", "Sable", "Tobias", "Yara", "Azura", "Brann",
  "Edda", "Fenris", "Hale", "Ivo", "Juno", "Korrin", "Lorcan", "Maeve", "Nessa", "Pike",
  "Runa", "Soren", "Talia", "Vesna", "Ash", "Kira", "Dax", "Oona",
];

// Sobrenomes (episódios versão 2+: todo lutador tem nome e sobrenome, e a combinação nunca se repete)
export const SOBRENOMES = [
  "Pedraforte", "Valeclaro", "Corvonegro", "Brasaviva", "Martelo", "Ventolargo", "Lunasombra", "Espinhadouro",
  "Rocharrubra", "Galhoverde", "Fogaréu", "Cinzafria", "Dentelobo", "Asaprata", "Montanegra", "Sombralonga",
  "Marévoa", "Trovão", "Estrelagris", "Raizfunda", "Lâminarrubra", "Folhaseca", "Penhasco", "Ouroverde",
  "Brumaclara", "Ossovelho", "Pedranegra", "Rubrafonte", "Corvalho", "Gelomanto", "Solposto", "Chamaviva",
  "Serrabrava", "Lagofundo", "Águaclara", "Ventobravo", "Mantonegro", "Ferrocinza", "Torrealta", "Pontavento",
];

// Nome completo número `p` da série. Para p < NOMES × SOBRENOMES, cada p dá uma combinação diferente
// (o resto de p escolhe o nome; o quociente desloca o sobrenome) e 16 valores seguidos de p têm 16 nomes
// diferentes. Embaralhado com uma permutação fixa para não ficar em ordem alfabética.
const perm = (n: number, salto: number) => Array.from({ length: n }, (_, i) => (i * salto) % n);
const PERM_N = perm(48, 29);
const PERM_S = perm(40, 23);
export const nomeCompleto = (p: number) => {
  const F = NOMES.length,
    L = SOBRENOMES.length;
  const r = p % F,
    q = Math.floor(p / F);
  return `${NOMES[PERM_N[r % PERM_N.length] % F]} ${SOBRENOMES[PERM_S[(q + r) % L]]}`;
};
export const TOTAL_NOMES = () => NOMES.length * SOBRENOMES.length;

// Espaços de magia por nível [1º, 2º, 3º]
const SLOTS_COMPLETO = [[2], [3], [4, 2], [4, 3], [4, 3, 2]];
const SLOTS_MEIO = [[2], [2], [3], [3], [4, 2]];
export const espacos = (c: ClasseId, nivel: number): number[] => {
  const n = Math.max(1, Math.min(5, nivel)) - 1;
  if (["BARDO", "CLERIGO", "DRUIDA", "FEITICEIRO", "MAGO"].includes(c)) return [...SLOTS_COMPLETO[n]];
  if (c === "PALADINO" || c === "PATRULHEIRO") return [...SLOTS_MEIO[n]];
  if (c === "BRUXO") return [[1], [2], [0, 2], [0, 2], [0, 0, 2]][n];
  return [];
};

export const proficiencia = (nivel: number) => (nivel >= 5 ? 3 : 2);
export const mod = (v: number) => Math.floor((v - 10) / 2);

// Poderes por nível (o que aparece no pergaminho). desc = descrição curta para "NOVO!".
export type Poder = { nome: string; desc: string };
export const PODERES: Record<ClasseId, Poder[][]> = {
  BARBARO: [
    [{ nome: "Fúria (2×)", desc: "+2 de dano e resiste a golpes" }, { nome: "Defesa sem Armadura", desc: "CA 10 + DES + CON" }],
    [{ nome: "Ataque Descuidado", desc: "vantagem ao atacar, mas fica exposto" }, { nome: "Sentido de Perigo", desc: "vantagem em salvaguardas de DES" }],
    [{ nome: "Frenesi", desc: "ataque extra de bônus em fúria" }, { nome: "Fúria 3×", desc: "uma fúria a mais por dia" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em FOR" }],
    [{ nome: "Ataque Extra", desc: "dois ataques por ação" }, { nome: "Movimento Rápido", desc: "+10 pés de deslocamento" }],
  ],
  BARDO: [
    [{ nome: "Inspiração de Bardo (d6)", desc: "um dado extra para quem inspira" }, { nome: "Zombaria Viciosa", desc: "dano psíquico e desvantagem" }, { nome: "Sussurros Dissonantes", desc: "3d6 psíquico, o alvo foge" }, { nome: "Palavra Curativa", desc: "cura à distância" }, { nome: "Onda Trovejante", desc: "2d8 trovejante em volta" }],
    [{ nome: "Pau pra Toda Obra", desc: "meia proficiência em tudo" }],
    [{ nome: "Colégio do Bardo", desc: "escolhe a sua tradição" }, { nome: "Despedaçar", desc: "3d8 trovejante em área (2º)" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em CAR" }],
    [{ nome: "Inspiração d8", desc: "o dado de inspiração cresce" }],
  ],
  CLERIGO: [
    [{ nome: "Chama Sagrada", desc: "1d8 radiante, salvaguarda de DES" }, { nome: "Raio Guia", desc: "4d6 radiante e dá vantagem" }, { nome: "Palavra Curativa", desc: "cura à distância" }, { nome: "Curar Ferimentos", desc: "cura pelo toque" }],
    [{ nome: "Centelha Divina", desc: "1d8 + SAB de luz ou cura" }],
    [{ nome: "Arma Espiritual", desc: "uma arma de luz luta junto (2º)" }, { nome: "Domínio Divino", desc: "escolhe o seu domínio" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em SAB" }],
    [{ nome: "Guardiões Espirituais", desc: "espíritos ferem quem chega perto (3º)" }],
  ],
  DRUIDA: [
    [{ nome: "Produzir Chama", desc: "1d8 de fogo à distância" }, { nome: "Chicote de Espinhos", desc: "1d6 e puxa o alvo" }, { nome: "Onda Trovejante", desc: "2d8 trovejante em volta" }, { nome: "Palavra Curativa", desc: "cura à distância" }],
    [{ nome: "Forma Selvagem", desc: "assume a forma das feras" }],
    [{ nome: "Raio Lunar", desc: "coluna de luz prateada (2º)" }, { nome: "Círculo Druídico", desc: "escolhe o seu círculo" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em SAB" }],
    [{ nome: "Convocar Relâmpagos", desc: "raios caem do céu (3º)" }],
  ],
  GUERREIRO: [
    [{ nome: "Estilo de Luta", desc: "técnica de combate preferida" }, { nome: "Retomar o Fôlego", desc: "cura 1d10 + nível" }],
    [{ nome: "Surto de Ação", desc: "uma ação extra por descanso" }],
    [{ nome: "Crítico Aprimorado", desc: "crítico com 19 ou 20" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em FOR" }],
    [{ nome: "Ataque Extra", desc: "dois ataques por ação" }],
  ],
  MONGE: [
    [{ nome: "Artes Marciais (d6)", desc: "golpe extra desarmado" }, { nome: "Defesa sem Armadura", desc: "CA 10 + DES + SAB" }],
    [{ nome: "Rajada de Golpes", desc: "dois golpes extras com foco" }, { nome: "Defesa Paciente", desc: "esquiva como ação bônus" }, { nome: "Passo do Vento", desc: "corre ou desengaja rápido" }],
    [{ nome: "Defletir Ataques", desc: "reduz o dano recebido" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em DES" }],
    [{ nome: "Golpe Atordoante", desc: "atordoa com um golpe" }, { nome: "Ataque Extra", desc: "dois ataques por ação" }, { nome: "Artes Marciais d8", desc: "golpes mais fortes" }],
  ],
  PALADINO: [
    [{ nome: "Cura pelas Mãos", desc: "reserva de cura (5 × nível)" }, { nome: "Magias de 1º círculo", desc: "dois espaços de magia" }],
    [{ nome: "Estilo de Luta", desc: "técnica de combate preferida" }, { nome: "Destruição Divina", desc: "+2d8 radiante ao acertar" }],
    [{ nome: "Canalizar Divindade", desc: "poder sagrado do juramento" }, { nome: "Juramento Sagrado", desc: "escolhe o seu juramento" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em FOR" }],
    [{ nome: "Ataque Extra", desc: "dois ataques por ação" }],
  ],
  PATRULHEIRO: [
    [{ nome: "Marca do Caçador", desc: "+1d6 no alvo marcado" }, { nome: "Magias de 1º círculo", desc: "dois espaços de magia" }],
    [{ nome: "Arquearia", desc: "+2 nos ataques à distância" }],
    [{ nome: "Presa do Caçador", desc: "dano extra em quem já está ferido" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em DES" }],
    [{ nome: "Ataque Extra", desc: "dois ataques por ação" }],
  ],
  LADINO: [
    [{ nome: "Ataque Furtivo 1d6", desc: "dano extra com vantagem" }],
    [{ nome: "Ação Ardilosa", desc: "desengaja sem provocar ataques" }],
    [{ nome: "Ataque Furtivo 2d6", desc: "o furtivo dobra" }, { nome: "Mira Firme", desc: "vantagem parado no lugar" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em DES" }],
    [{ nome: "Ataque Furtivo 3d6", desc: "o furtivo cresce de novo" }, { nome: "Esquiva Sobrenatural", desc: "corta pela metade um golpe" }],
  ],
  FEITICEIRO: [
    [{ nome: "Raio de Fogo", desc: "1d10 de fogo" }, { nome: "Raio de Gelo", desc: "1d8 de frio e deixa lento" }, { nome: "Orbe Cromático", desc: "3d8 do elemento escolhido" }, { nome: "Feitiçaria Inata", desc: "vantagem nas magias por 1 min" }],
    [{ nome: "Fonte de Magia", desc: "pontos de feitiçaria" }, { nome: "Metamagia", desc: "molda as próprias magias" }],
    [{ nome: "Raio Ardente", desc: "três raios de fogo (2º)" }, { nome: "Feitiçaria Dracônica", desc: "escamas e resistência" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em CAR" }],
    [{ nome: "Bola de Fogo", desc: "8d6 de fogo em área (3º)" }],
  ],
  BRUXO: [
    [{ nome: "Rajada Mística", desc: "1d10 de energia" }, { nome: "Bruxaria", desc: "+1d6 necrótico no alvo" }],
    [{ nome: "Rajada Agonizante", desc: "soma CAR na Rajada Mística" }],
    [{ nome: "Pacto", desc: "dádiva do patrono" }, { nome: "Magias de 2º círculo", desc: "espaços de pacto mais fortes" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em CAR" }],
    [{ nome: "Toque Vampírico", desc: "rouba vida pelo toque (3º)" }],
  ],
  MAGO: [
    [{ nome: "Raio de Fogo", desc: "1d10 de fogo" }, { nome: "Mísseis Mágicos", desc: "três dardos que nunca erram" }, { nome: "Onda Trovejante", desc: "2d8 trovejante em volta" }, { nome: "Escudo", desc: "+5 de CA como reação" }, { nome: "Armadura Arcana", desc: "CA 13 + DES" }],
    [{ nome: "Erudito", desc: "especialista em um saber" }],
    [{ nome: "Raio Ardente", desc: "três raios de fogo (2º)" }, { nome: "Escola de Evocação", desc: "magias de dano mais seguras" }],
    [{ nome: "Aumento de Atributo", desc: "+2 em INT" }],
    [{ nome: "Bola de Fogo e Relâmpago", desc: "8d6 em área (3º)" }],
  ],
};

export const TRACOS_ESPECIE: Record<EspecieId, Poder[]> = {
  HUMANO: [{ nome: "Inspiração Heroica", desc: "rerrola um ataque" }],
  ELFO: [{ nome: "Passo Élfico", desc: "35 pés de deslocamento" }],
  ANAO: [{ nome: "Robustez Anã", desc: "+1 PV por nível" }],
  HALFLING: [{ nome: "Sortudo", desc: "rerrola o 1 natural" }],
  GNOMO: [{ nome: "Astúcia Gnômica", desc: "vantagem em salvaguardas mentais" }],
  ORC: [{ nome: "Resistência Implacável", desc: "fica com 1 PV uma vez" }, { nome: "Surto de Adrenalina", desc: "dispara e ganha PV temporários" }],
  TIEFLING: [{ nome: "Legado Infernal", desc: "resiste a fogo, Raio de Fogo" }],
  DRACONATO: [{ nome: "Arma de Sopro", desc: "1d10 em cone" }],
  GOLIAS: [{ nome: "Resistência da Pedra", desc: "reduz o dano 1d12 + CON" }],
};

// Paletas medievais para roupas
export const CORES_ROUPA = [
  "#9c2a2e", // carmesim
  "#2c4a9a", // azul real
  "#2f6a3a", // verde-floresta
  "#5e3488", // púrpura
  "#c09a2e", // mostarda
  "#6e2238", // vinho
  "#4e5a6a", // ardósia
  "#8a5a32", // marrom
  "#2a6a72", // petróleo
  "#d8cdb4", // linho
];

export const CORES_PELE: Record<EspecieId, string[]> = {
  HUMANO: ["#f2c9a0", "#e0a878", "#c08458", "#8e5a3a", "#6a4028"],
  ELFO: ["#f6dcc0", "#e8c09a", "#c79a78", "#9a7a9e"],
  ANAO: ["#eab890", "#d49870", "#b07850", "#7e5236"],
  HALFLING: ["#f2c9a0", "#e0a878", "#c08458", "#946042"],
  GNOMO: ["#f4cca8", "#e2a980", "#bc8a62", "#8c6040"],
  ORC: ["#8a9a78", "#7a8e6a", "#9aa486", "#6e7e60"],
  TIEFLING: ["#c0443e", "#a03a5a", "#8a3e86", "#c86a58"],
  DRACONATO: ["#000000"], // usa a cor da ancestralidade
  GOLIAS: ["#a8a8a4", "#9aa0a6", "#b4aca0", "#8e9096"],
};

export const CORES_CABELO = [
  "#2a1e18", // preto
  "#5a3420", // castanho
  "#8a5a2e", // castanho claro
  "#c8902e", // loiro
  "#e6d08a", // loiro claro
  "#a8401e", // ruivo
  "#d8d8d8", // branco
  "#8a8a92", // grisalho
  "#3a5ab0", // azul (fantasia)
  "#9a3ab0", // roxo (fantasia)
  "#2e8a6a", // verde (fantasia)
  "#c84a7a", // rosa (fantasia)
];

export const CORES_OLHO = ["#3a6a9a", "#4a7a3a", "#6a4a2a", "#5a5a6a", "#2a2a3a", "#8a5ab0"];
