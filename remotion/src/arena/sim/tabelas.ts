// Tabelas do jogo (regras do SRD 5.2, níveis 1 a 5) e listas para sorteio.
// Todo o texto exibido fica aqui, em português.

export type Atributo = "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR";
export const ATRIBUTOS: Atributo[] = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];

export type ClasseId =
  | "guerreiro"
  | "barbaro"
  | "paladino"
  | "patrulheiro"
  | "ladino"
  | "monge"
  | "mago"
  | "feiticeiro"
  | "bruxo"
  | "clerigo"
  | "druida"
  | "bardo";

export const CLASSES: ClasseId[] = [
  "guerreiro",
  "barbaro",
  "paladino",
  "patrulheiro",
  "ladino",
  "monge",
  "mago",
  "feiticeiro",
  "bruxo",
  "clerigo",
  "druida",
  "bardo",
];

export type InfoClasse = {
  nome: string;
  dadoVida: number;
  /** ordem de prioridade dos atributos (o 1º recebe o maior valor) */
  prioridade: Atributo[];
  /** atributo de conjuração (se tiver) */
  conjura?: Atributo;
  cor: string; // cor da classe (quadradinho do HUD)
  conjurador: "completo" | "meio" | "bruxo" | "nenhum";
};

export const CLASSE: Record<ClasseId, InfoClasse> = {
  guerreiro: { nome: "Guerreiro", dadoVida: 10, prioridade: ["FOR", "CON", "DES", "SAB", "CAR", "INT"], cor: "#c8c8d0", conjurador: "nenhum" },
  barbaro: { nome: "Bárbaro", dadoVida: 12, prioridade: ["FOR", "CON", "DES", "SAB", "CAR", "INT"], cor: "#e0742c", conjurador: "nenhum" },
  paladino: { nome: "Paladino", dadoVida: 10, prioridade: ["FOR", "CAR", "CON", "SAB", "DES", "INT"], conjura: "CAR", cor: "#f2d36b", conjurador: "meio" },
  patrulheiro: { nome: "Patrulheiro", dadoVida: 10, prioridade: ["DES", "SAB", "CON", "FOR", "INT", "CAR"], conjura: "SAB", cor: "#5c9a3c", conjurador: "meio" },
  ladino: { nome: "Ladino", dadoVida: 8, prioridade: ["DES", "CON", "INT", "SAB", "CAR", "FOR"], cor: "#8a8f9c", conjurador: "nenhum" },
  monge: { nome: "Monge", dadoVida: 8, prioridade: ["DES", "SAB", "CON", "FOR", "INT", "CAR"], cor: "#7cc4e4", conjurador: "nenhum" },
  mago: { nome: "Mago", dadoVida: 6, prioridade: ["INT", "CON", "DES", "SAB", "CAR", "FOR"], conjura: "INT", cor: "#4a6ee0", conjurador: "completo" },
  feiticeiro: { nome: "Feiticeiro", dadoVida: 6, prioridade: ["CAR", "CON", "DES", "SAB", "INT", "FOR"], conjura: "CAR", cor: "#e04a4a", conjurador: "completo" },
  bruxo: { nome: "Bruxo", dadoVida: 8, prioridade: ["CAR", "CON", "DES", "SAB", "INT", "FOR"], conjura: "CAR", cor: "#9a4ae0", conjurador: "bruxo" },
  clerigo: { nome: "Clérigo", dadoVida: 8, prioridade: ["SAB", "CON", "FOR", "CAR", "DES", "INT"], conjura: "SAB", cor: "#f4f0e0", conjurador: "completo" },
  druida: { nome: "Druida", dadoVida: 8, prioridade: ["SAB", "CON", "DES", "INT", "CAR", "FOR"], conjura: "SAB", cor: "#3c8a5a", conjurador: "completo" },
  bardo: { nome: "Bardo", dadoVida: 8, prioridade: ["CAR", "DES", "CON", "SAB", "INT", "FOR"], conjura: "CAR", cor: "#e46ab4", conjurador: "completo" },
};

/** espaços de magia por nível (índice 1..5) → [1º, 2º, 3º] */
export const ESPACOS: Record<InfoClasse["conjurador"], number[][]> = {
  completo: [[], [2, 0, 0], [3, 0, 0], [4, 2, 0], [4, 3, 0], [4, 3, 2]],
  meio: [[], [2, 0, 0], [2, 0, 0], [3, 0, 0], [3, 0, 0], [4, 2, 0]],
  bruxo: [[], [1, 0, 0], [2, 0, 0], [0, 2, 0], [0, 2, 0], [0, 0, 2]],
  nenhum: [[], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
};

export const proficiencia = (nivel: number) => (nivel >= 5 ? 3 : 2);

/** poderes por nível (exibidos no pergaminho; descrição curta para os novos) */
export const PODERES: Record<ClasseId, [string, string][][]> = {
  barbaro: [
    [],
    [["FÚRIA (2×)", "dano extra e resiste a golpes físicos"], ["DEFESA SEM ARMADURA", "CA soma DES e CON"]],
    [["ATAQUE DESCUIDADO", "vantagem no ataque, guarda aberta"], ["SENTIDO DE PERIGO", "vantagem para esquivar de efeitos"]],
    [["FRENESI", "ataque extra na fúria"], ["FÚRIA 3×", "uma fúria a mais por descanso"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["ATAQUE EXTRA", "dois ataques por ação"], ["MOVIMENTO RÁPIDO", "+10 pés de deslocamento"]],
  ],
  bardo: [
    [],
    [["INSPIRAÇÃO DE BARDO (d6)", "dado extra para um aliado"], ["ZOMBARIA VICIOSA", "insulto mágico psíquico"], ["SUSSURROS DISSONANTES", "melodia que fere a mente"], ["PALAVRA CURATIVA", "cura à distância"], ["ONDA TROVEJANTE", "onda de trovão em volta"]],
    [["PAU PRA TODA OBRA", "meia proficiência em tudo"]],
    [["COLÉGIO DE BARDO", "especialização do bardo"], ["DESPEDAÇAR (2º)", "estrondo que racha a pedra"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["INSPIRAÇÃO d8", "o dado de inspiração cresce"]],
  ],
  clerigo: [
    [],
    [["CHAMA SAGRADA", "fogo divino cai do alto"], ["RAIO GUIA", "luz que marca o alvo"], ["PALAVRA CURATIVA", "cura à distância"], ["CURAR FERIMENTOS", "cura pelo toque"]],
    [["CENTELHA DIVINA (1d8)", "canaliza luz que fere ou cura"]],
    [["ARMA ESPIRITUAL (2º)", "arma de luz que ataca sozinha"], ["DOMÍNIO DIVINO", "dons do seu deus"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["GUARDIÕES ESPIRITUAIS (3º)", "espíritos ferem quem chega perto"]],
  ],
  druida: [
    [],
    [["PRODUZIR CHAMA", "chama na palma da mão"], ["CHICOTE DE ESPINHOS", "vinha que fere e puxa"], ["ONDA TROVEJANTE", "onda de trovão em volta"], ["PALAVRA CURATIVA", "cura à distância"]],
    [["FORMA SELVAGEM", "assume a forma das feras"]],
    [["RAIO LUNAR (2º)", "coluna de luz da lua"], ["CÍRCULO DRUÍDICO", "laço com a natureza"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["CONVOCAR RELÂMPAGOS (3º)", "nuvem que lança raios"]],
  ],
  guerreiro: [
    [],
    [["ESTILO DE LUTA", "técnica de combate preferida"], ["RETOMAR O FÔLEGO", "cura 1d10 + nível"]],
    [["SURTO DE AÇÃO", "uma ação extra por descanso"]],
    [["CRÍTICO APRIMORADO", "crítico com 19 ou 20"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["ATAQUE EXTRA", "dois ataques por ação"]],
  ],
  monge: [
    [],
    [["ARTES MARCIAIS (d6)", "golpe desarmado extra"], ["DEFESA SEM ARMADURA", "CA soma DES e SAB"]],
    [["RAJADA DE GOLPES", "dois socos rápidos"], ["DEFESA PACIENTE", "esquiva como ação bônus"], ["PASSO DO VENTO", "corre e salta como o vento"]],
    [["DEFLETIR ATAQUES", "desvia golpes e flechas"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["GOLPE ATORDOANTE", "soco que atordoa"], ["ATAQUE EXTRA", "dois ataques por ação"], ["ARTES MARCIAIS d8", "golpes mais pesados"]],
  ],
  paladino: [
    [],
    [["CURA PELAS MÃOS", "reserva de 5 PV por nível"], ["MAGIAS DE 1º CÍRCULO", "bênçãos e curas"]],
    [["ESTILO DE LUTA", "técnica de combate preferida"], ["DESTRUIÇÃO DIVINA", "golpe com luz sagrada"]],
    [["CANALIZAR DIVINDADE", "poder do juramento"], ["JURAMENTO SAGRADO", "o voto do paladino"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["ATAQUE EXTRA", "dois ataques por ação"]],
  ],
  patrulheiro: [
    [],
    [["MARCA DO CAÇADOR", "+1d6 de dano no alvo marcado"], ["MAGIAS DE 1º CÍRCULO", "magias da natureza"]],
    [["ARQUEARIA", "+2 nos ataques à distância"]],
    [["PRESA DO CAÇADOR", "dano extra em quem está ferido"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["ATAQUE EXTRA", "dois ataques por ação"]],
  ],
  ladino: [
    [],
    [["ATAQUE FURTIVO 1d6", "dano extra na brecha"]],
    [["AÇÃO ARDILOSA", "corre, esconde ou recua de bônus"]],
    [["ATAQUE FURTIVO 2d6", "brecha mais letal"], ["MIRA FIRME", "vantagem parado no lugar"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["ATAQUE FURTIVO 3d6", "brecha mais letal"], ["ESQUIVA SOBRENATURAL", "corta o dano à metade"]],
  ],
  feiticeiro: [
    [],
    [["RAIO DE FOGO", "dardo de fogo"], ["RAIO DE GELO", "feixe que congela"], ["ORBE CROMÁTICO", "orbe de energia escolhida"], ["FEITIÇARIA INATA", "vantagem nas magias"]],
    [["FONTE DE MAGIA", "pontos de feitiçaria"], ["METAMAGIA", "molda as próprias magias"]],
    [["RAIO ARDENTE (2º)", "três raios de fogo"], ["FEITIÇARIA DRACÔNICA", "sangue de dragão"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["BOLA DE FOGO (3º)", "explosão de fogo"]],
  ],
  bruxo: [
    [],
    [["RAJADA MÍSTICA", "raio de energia sombria"], ["RAJADA AGONIZANTE", "soma CAR ao dano da rajada"], ["BRUXARIA", "+1d6 necrótico no alvo"]],
    [["+2 INVOCAÇÕES", "segredos do patrono"]],
    [["DÁDIVA DO PACTO", "pacto com o patrono"], ["MAGIAS DE 2º CÍRCULO", "espaços mais fortes"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["TOQUE VAMPÍRICO (3º)", "rouba vida com a mão"]],
  ],
  mago: [
    [],
    [["RAIO DE FOGO", "dardo de fogo"], ["MÍSSEIS MÁGICOS", "três dardos que nunca erram"], ["ONDA TROVEJANTE", "onda de trovão em volta"], ["ESCUDO", "+5 na CA como reação"], ["ARMADURA ARCANA", "CA 13 + DES"]],
    [["ERUDITO", "especialista em um saber"]],
    [["RAIO ARDENTE (2º)", "três raios de fogo"], ["ESCOLA DE EVOCAÇÃO", "magias de dano mais seguras"]],
    [["AUMENTO DE ATRIBUTO", "+2 no atributo principal"]],
    [["BOLA DE FOGO (3º)", "explosão de fogo"], ["RELÂMPAGO (3º)", "linha de raio"]],
  ],
};

// ─────────────────────────── espécies ───────────────────────────
export type EspecieId =
  | "humano"
  | "elfo"
  | "anao"
  | "halfling"
  | "gnomo"
  | "orc"
  | "tiefling"
  | "draconato"
  | "golias";

export const ESPECIES: EspecieId[] = ["humano", "elfo", "anao", "halfling", "gnomo", "orc", "tiefling", "draconato", "golias"];

export const ESPECIE: Record<
  EspecieId,
  { nome: string; desloc: number; porte: "baixo" | "medio" | "alto"; tracos: string[]; origem: string[] }
> = {
  humano: { nome: "Humano", desloc: 30, porte: "medio", tracos: ["INSPIRAÇÃO HEROICA"], origem: ["das cidades do porto", "dos vales do sul", "das muralhas da capital"] },
  elfo: { nome: "Elfo", desloc: 35, porte: "medio", tracos: ["ANCESTRALIDADE FEÉRICA"], origem: ["das florestas do norte", "das torres de prata", "dos bosques antigos"] },
  anao: { nome: "Anão", desloc: 30, porte: "baixo", tracos: ["ROBUSTEZ ANÃ", "RESISTÊNCIA A VENENO"], origem: ["das minas da montanha", "das forjas profundas", "dos salões de pedra"] },
  halfling: { nome: "Halfling", desloc: 30, porte: "baixo", tracos: ["SORTUDO"], origem: ["das colinas verdes", "das estradas do interior", "de uma vila de moinhos"] },
  gnomo: { nome: "Gnomo", desloc: 30, porte: "baixo", tracos: ["ASTÚCIA GNÔMICA"], origem: ["das oficinas subterrâneas", "das tocas do bosque", "de uma torre de engenhocas"] },
  orc: { nome: "Orc", desloc: 30, porte: "medio", tracos: ["RESISTÊNCIA IMPLACÁVEL", "SURTO DE ADRENALINA"], origem: ["das estepes geladas", "dos clãs da fronteira", "das ruínas do leste"] },
  tiefling: { nome: "Tiefling", desloc: 30, porte: "medio", tracos: ["LEGADO INFERNAL", "RESISTÊNCIA A FOGO"], origem: ["dos becos da cidade baixa", "de um culto esquecido", "das terras de cinza"] },
  draconato: { nome: "Draconato", desloc: 30, porte: "medio", tracos: ["ARMA DE SOPRO", "RESISTÊNCIA DRACÔNICA"], origem: ["dos ninhos do vulcão", "dos picos das tempestades", "das ilhas de basalto"] },
  golias: { nome: "Golias", desloc: 35, porte: "alto", tracos: ["RESISTÊNCIA DA PEDRA"], origem: ["dos cumes das montanhas", "dos gigantes do norte", "das geleiras eternas"] },
};

export type Ancestral = "vermelho" | "azul" | "branco" | "verde" | "negro" | "dourado" | "prateado" | "bronze";
export const ANCESTRAIS: [Ancestral, TipoDano, string][] = [
  ["vermelho", "fogo", "#b8322a"],
  ["azul", "eletrico", "#3a64c8"],
  ["branco", "frio", "#d8dfe6"],
  ["verde", "veneno", "#3f8a3a"],
  ["negro", "acido", "#2d2a33"],
  ["dourado", "fogo", "#d6a32e"],
  ["prateado", "frio", "#a9b2bd"],
  ["bronze", "eletrico", "#a8682e"],
];

// ─────────────────────────── dano ───────────────────────────
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

export const COR_DANO: Record<TipoDano, string> = {
  fogo: "#f07a1a",
  frio: "#8fd6f4",
  eletrico: "#f4e04a",
  trovejante: "#3a6ae0",
  radiante: "#f2c43a",
  necrotico: "#7a3ab0",
  energia: "#e03aa8",
  psiquico: "#f07ab8",
  veneno: "#4ab040",
  acido: "#a8e030",
  cortante: "#e8e8ec",
  perfurante: "#e8e8ec",
  concussao: "#e8e8ec",
  cura: "#4ad070",
};

// ─────────────────────────── nomes e cores ───────────────────────────
export const NOMES = [
  "Thorin", "Lyra", "Kael", "Mirela", "Bruk", "Seraphine", "Doran", "Vex", "Elowen", "Garruk",
  "Isolde", "Nyx", "Zara", "Ulric", "Wren", "Tamsin", "Orrin", "Rhea", "Borin", "Cassia",
  "Faelan", "Grom", "Liora", "Marek", "Quill", "Sable", "Tobias", "Yara", "Azura", "Bram",
  "Corin", "Dagna", "Eris", "Fenn", "Hilda", "Ivo", "Juno", "Kira", "Lorcan", "Maeve",
  "Nim", "Oona", "Pike", "Rook", "Sorin", "Thea", "Varn", "Ysolde",
];

export const CORES_ROUPA: [string, string][] = [
  ["carmesim", "#9e1f33"],
  ["azul real", "#2b4c9e"],
  ["verde-floresta", "#2f5f37"],
  ["púrpura", "#5f2b7c"],
  ["mostarda", "#c39a2c"],
  ["vinho", "#6c2140"],
  ["ardósia", "#4b5b6c"],
  ["ocre", "#a8662a"],
  ["azul-petróleo", "#1f5e66"],
  ["castanho", "#6a4a32"],
  ["cinza-chumbo", "#3e3e46"],
  ["linho", "#d8ccb0"],
];

export const CABELO_NATURAL = ["#1e1a1c", "#4a2e1e", "#7a4e2a", "#b05a2a", "#d8b060", "#9a9aa0", "#e8e4dc"];
export const CABELO_FANTASIA = ["#3a5ad8", "#3ab0a0", "#e07ab0", "#c0c8d8", "#8a4ad0", "#d83a3a"];
export const ESTILOS_CABELO = ["curto", "longo", "rabo", "trancas", "coque", "moicano", "careca"] as const;
export type EstiloCabelo = (typeof ESTILOS_CABELO)[number];

export const PELES: Record<EspecieId, string[]> = {
  humano: ["#f2c6a0", "#e0a882", "#c08060", "#8e5a3e", "#5e3a28"],
  elfo: ["#f4d4b8", "#e8bc98", "#a87858", "#6a4a5a"],
  anao: ["#e8b490", "#c88a68", "#9a6448"],
  halfling: ["#f2c6a0", "#d8a07a", "#a8704e"],
  gnomo: ["#f0c0a0", "#d8a088", "#b08068"],
  orc: ["#7a9a6a", "#6a8a6e", "#8a9a7a", "#5e7a5a"],
  tiefling: ["#c0484a", "#a83a5a", "#8a4a8e", "#6e3a7a"],
  draconato: [],
  golias: ["#a8aab0", "#9098a0", "#b8b4ac"],
};
