// Regras do System Reference Document 5.2 (SRD 5.2, Wizards of the Coast, CC-BY-4.0).
// Fontes, simplificações e o que ficou de fora: ver PESQUISA-DND.md.
// Todos os personagens lutam no NÍVEL 5 (bônus de proficiência +3, Ataque Extra,
// truques com 2 dados, magias de 3º círculo como Bola de Fogo).

export type Atributo = "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR";
export const ATRIBUTOS: Atributo[] = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];

export type TipoDano =
  | "cortante"
  | "perfurante"
  | "concussão"
  | "fogo"
  | "frio"
  | "elétrico"
  | "trovejante"
  | "radiante"
  | "necrótico"
  | "energia"
  | "psíquico"
  | "veneno"
  | "ácido";

// Cor do rótulo do golpe na tela (igual ao vídeo modelo: cor = tipo).
export const COR_DANO: Record<TipoDano | "cura", string> = {
  cortante: "#c8ccd4",
  perfurante: "#b8a58a",
  concussão: "#a39a8f",
  fogo: "#e8552e",
  frio: "#5fc4f0",
  elétrico: "#f2d544",
  trovejante: "#7b8ff2",
  radiante: "#f7e28b",
  necrótico: "#6b3fa0",
  energia: "#d062e8",
  psíquico: "#e86fb4",
  veneno: "#79c24a",
  ácido: "#a8d83a",
  cura: "#5fd17a",
};

export const PROFICIENCIA = 3; // nível 5
export const NIVEL = 5;

// ---------- Armas (SRD 5.2, tabela de armas) ----------
export type Arma = {
  nome: string;
  dano: string;
  tipo: TipoDano;
  alcance: number; // pés; 5 = corpo a corpo
  atributo: "FOR" | "DES" | "acuidade"; // acuidade = o maior entre FOR e DES
  duasMaos?: boolean;
  visual: "espada" | "espadona" | "machado" | "machadona" | "rapieira" | "adaga" | "arco" | "cajado" | "maca" | "martelo" | "cimitarra" | "punhos" | "lança" | "alaúde";
};

export const ARMAS: Record<string, Arma> = {
  espadaLonga: { nome: "Espada Longa", dano: "1d8", tipo: "cortante", alcance: 5, atributo: "FOR", visual: "espada" },
  espadaGrande: { nome: "Montante", dano: "2d6", tipo: "cortante", alcance: 5, atributo: "FOR", duasMaos: true, visual: "espadona" },
  machadoGrande: { nome: "Machado Grande", dano: "1d12", tipo: "cortante", alcance: 5, atributo: "FOR", duasMaos: true, visual: "machadona" },
  machadinha: { nome: "Machado de Batalha", dano: "1d8", tipo: "cortante", alcance: 5, atributo: "FOR", visual: "machado" },
  rapieira: { nome: "Rapieira", dano: "1d8", tipo: "perfurante", alcance: 5, atributo: "acuidade", visual: "rapieira" },
  espadaCurta: { nome: "Espada Curta", dano: "1d6", tipo: "perfurante", alcance: 5, atributo: "acuidade", visual: "adaga" },
  arcoLongo: { nome: "Arco Longo", dano: "1d8", tipo: "perfurante", alcance: 150, atributo: "DES", duasMaos: true, visual: "arco" },
  arcoCurto: { nome: "Arco Curto", dano: "1d6", tipo: "perfurante", alcance: 80, atributo: "DES", duasMaos: true, visual: "arco" },
  cajado: { nome: "Bordão", dano: "1d6", tipo: "concussão", alcance: 5, atributo: "FOR", visual: "cajado" },
  maca: { nome: "Maça", dano: "1d6", tipo: "concussão", alcance: 5, atributo: "FOR", visual: "maca" },
  martelo: { nome: "Martelo de Guerra", dano: "1d8", tipo: "concussão", alcance: 5, atributo: "FOR", visual: "martelo" },
  cimitarra: { nome: "Cimitarra", dano: "1d6", tipo: "cortante", alcance: 5, atributo: "acuidade", visual: "cimitarra" },
  lanca: { nome: "Lança", dano: "1d6", tipo: "perfurante", alcance: 5, atributo: "FOR", visual: "lança" },
  // Monge nível 5: Artes Marciais d8
  punhos: { nome: "Golpe Desarmado", dano: "1d8", tipo: "concussão", alcance: 5, atributo: "acuidade", visual: "punhos" },
};

// ---------- Magias (SRD 5.2) ----------
export type Efeito = "projetil" | "raio" | "misseis" | "explosao" | "linha" | "cone" | "onda" | "coluna" | "chama" | "cura" | "aura" | "toque" | "palavras" | "espectral";

export type Magia = {
  id: string;
  nome: string; // nome em português (tradução oficial brasileira quando existe)
  nivel: 0 | 1 | 2 | 3;
  modo: "ataque" | "salvaguarda" | "automatico" | "cura" | "bonus";
  dano?: string; // dano no círculo base (truques já escalados para o nível 5)
  porCirculo?: string; // dado extra por círculo acima do base
  tipo?: TipoDano;
  salva?: Atributo;
  metade?: boolean; // metade do dano se passar na salvaguarda
  alcance: number;
  raio?: number; // área (pés)
  feixes?: number; // Raio Ardente, Rajada Mística
  feixesPorCirculo?: number;
  acaoBonus?: boolean;
  concentracao?: boolean;
  efeito: Efeito;
  nota?: string;
};

export const MAGIAS: Record<string, Magia> = {
  // truques: 1 dado nos níveis 1–4 (o simulador multiplica: 2 dados no 5º etc.)
  raioDeFogo: { id: "raioDeFogo", nome: "Raio de Fogo", nivel: 0, modo: "ataque", dano: "1d10", tipo: "fogo", alcance: 120, efeito: "projetil" },
  raioDeGelo: { id: "raioDeGelo", nome: "Raio de Gelo", nivel: 0, modo: "ataque", dano: "1d8", tipo: "frio", alcance: 60, efeito: "raio", nota: "−10 pés de deslocamento" },
  chamaSagrada: { id: "chamaSagrada", nome: "Chama Sagrada", nivel: 0, modo: "salvaguarda", dano: "1d8", tipo: "radiante", salva: "DES", alcance: 60, efeito: "coluna" },
  produzirChama: { id: "produzirChama", nome: "Produzir Chama", nivel: 0, modo: "ataque", dano: "1d8", tipo: "fogo", alcance: 60, efeito: "projetil" },
  chicoteEspinhos: { id: "chicoteEspinhos", nome: "Chicote de Espinhos", nivel: 0, modo: "ataque", dano: "1d6", tipo: "perfurante", alcance: 30, efeito: "raio", nota: "puxa 10 pés" },
  zombaria: { id: "zombaria", nome: "Zombaria Viciosa", nivel: 0, modo: "salvaguarda", dano: "1d6", tipo: "psíquico", salva: "SAB", alcance: 60, efeito: "palavras", nota: "desvantagem no próximo ataque" },
  rajadaMistica: { id: "rajadaMistica", nome: "Rajada Mística", nivel: 0, modo: "ataque", dano: "1d10", tipo: "energia", alcance: 120, feixes: 2, efeito: "raio", nota: "+CAR (Rajada Agonizante)" },
  // 1º círculo
  misseisMagicos: { id: "misseisMagicos", nome: "Mísseis Mágicos", nivel: 1, modo: "automatico", dano: "1d4+1", tipo: "energia", alcance: 120, feixes: 3, feixesPorCirculo: 1, efeito: "misseis" },
  orbeCromatico: { id: "orbeCromatico", nome: "Orbe Cromático", nivel: 1, modo: "ataque", dano: "3d8", porCirculo: "1d8", tipo: "ácido", alcance: 90, efeito: "projetil" },
  ondaTrovejante: { id: "ondaTrovejante", nome: "Onda Trovejante", nivel: 1, modo: "salvaguarda", dano: "2d8", porCirculo: "1d8", tipo: "trovejante", salva: "CON", metade: true, alcance: 0, raio: 15, efeito: "onda", nota: "empurra 10 pés" },
  raioGuia: { id: "raioGuia", nome: "Raio Guia", nivel: 1, modo: "ataque", dano: "4d6", porCirculo: "1d6", tipo: "radiante", alcance: 120, efeito: "projetil", nota: "próximo ataque contra o alvo tem vantagem" },
  sussurros: { id: "sussurros", nome: "Sussurros Dissonantes", nivel: 1, modo: "salvaguarda", dano: "3d6", porCirculo: "1d6", tipo: "psíquico", salva: "SAB", metade: true, alcance: 60, efeito: "palavras", nota: "o alvo foge" },
  curarFerimentos: { id: "curarFerimentos", nome: "Curar Ferimentos", nivel: 1, modo: "cura", dano: "2d8", porCirculo: "2d8", alcance: 5, efeito: "cura" },
  palavraCurativa: { id: "palavraCurativa", nome: "Palavra Curativa", nivel: 1, modo: "cura", dano: "2d4", porCirculo: "2d4", alcance: 60, acaoBonus: true, efeito: "cura" },
  bruxaria: { id: "bruxaria", nome: "Bruxaria", nivel: 1, modo: "bonus", tipo: "necrótico", alcance: 90, acaoBonus: true, concentracao: true, efeito: "espectral", nota: "+1d6 necrótico em cada acerto" },
  marcaCacador: { id: "marcaCacador", nome: "Marca do Caçador", nivel: 1, modo: "bonus", tipo: "energia", alcance: 90, acaoBonus: true, concentracao: true, efeito: "espectral", nota: "+1d6 em cada acerto" },
  // 2º círculo
  raioArdente: { id: "raioArdente", nome: "Raio Ardente", nivel: 2, modo: "ataque", dano: "2d6", tipo: "fogo", alcance: 120, feixes: 3, feixesPorCirculo: 1, efeito: "raio" },
  despedacar: { id: "despedacar", nome: "Despedaçar", nivel: 2, modo: "salvaguarda", dano: "3d8", porCirculo: "1d8", tipo: "trovejante", salva: "CON", metade: true, alcance: 60, raio: 10, efeito: "explosao" },
  raioLunar: { id: "raioLunar", nome: "Raio Lunar", nivel: 2, modo: "salvaguarda", dano: "2d10", porCirculo: "1d10", tipo: "radiante", salva: "CON", metade: true, alcance: 120, raio: 5, concentracao: true, efeito: "coluna" },
  armaEspiritual: { id: "armaEspiritual", nome: "Arma Espiritual", nivel: 2, modo: "ataque", dano: "1d8", porCirculo: "1d8", tipo: "energia", alcance: 60, acaoBonus: true, concentracao: true, efeito: "espectral" },
  // 3º círculo
  bolaDeFogo: { id: "bolaDeFogo", nome: "Bola de Fogo", nivel: 3, modo: "salvaguarda", dano: "8d6", porCirculo: "1d6", tipo: "fogo", salva: "DES", metade: true, alcance: 150, raio: 20, efeito: "explosao" },
  relampago: { id: "relampago", nome: "Relâmpago", nivel: 3, modo: "salvaguarda", dano: "8d6", porCirculo: "1d6", tipo: "elétrico", salva: "DES", metade: true, alcance: 100, efeito: "linha" },
  convocarRelampagos: { id: "convocarRelampagos", nome: "Convocar Relâmpagos", nivel: 3, modo: "salvaguarda", dano: "3d10", porCirculo: "1d10", tipo: "elétrico", salva: "DES", metade: true, alcance: 120, raio: 5, concentracao: true, efeito: "coluna" },
  guardioes: { id: "guardioes", nome: "Guardiões Espirituais", nivel: 3, modo: "salvaguarda", dano: "3d8", porCirculo: "1d8", tipo: "radiante", salva: "SAB", metade: true, alcance: 0, raio: 15, concentracao: true, efeito: "aura" },
  toqueVampirico: { id: "toqueVampirico", nome: "Toque Vampírico", nivel: 3, modo: "ataque", dano: "3d6", porCirculo: "1d6", tipo: "necrótico", alcance: 5, efeito: "toque", nota: "cura metade do dano" },
};

// ---------- Classes (nível 5) ----------
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

export type Classe = {
  id: ClasseId;
  nome: string;
  dadoVida: number;
  prioridade: Atributo[]; // ordem para distribuir as rolagens (maior → primeiro)
  salvaguardas: Atributo[];
  armadura: { base: number; maxDes?: number; nome: string; somaCon?: boolean; somaSab?: boolean };
  escudo?: boolean;
  armas: string[]; // uma é sorteada
  ataquesPorAcao: number;
  conjuracao?: { atributo: Atributo; espacos: [number, number, number]; magias: string[] }; // espaços 1º,2º,3º
  papel: "linha de frente" | "atirador" | "conjurador" | "suporte";
  recursos: string[]; // texto da ficha
};

export const CLASSES: Record<ClasseId, Classe> = {
  guerreiro: {
    id: "guerreiro",
    nome: "Guerreiro",
    dadoVida: 10,
    prioridade: ["FOR", "CON", "DES", "SAB", "CAR", "INT"],
    salvaguardas: ["FOR", "CON"],
    armadura: { base: 16, maxDes: 0, nome: "Cota de Malha" },
    armas: ["espadaGrande", "espadaLonga+escudo", "machadinha+escudo"],
    ataquesPorAcao: 2,
    papel: "linha de frente",
    recursos: ["Ataque Extra", "Surto de Ação (1×)", "Retomar o Fôlego (1d10+5, 2×)", "Estilo: Arma Grande (1 e 2 nos dados viram 3)"],
  },
  barbaro: {
    id: "barbaro",
    nome: "Bárbaro",
    dadoVida: 12,
    prioridade: ["FOR", "CON", "DES", "SAB", "CAR", "INT"],
    salvaguardas: ["FOR", "CON"],
    armadura: { base: 10, nome: "Defesa sem Armadura (10+DES+CON)", somaCon: true },
    armas: ["machadoGrande", "espadaGrande"],
    ataquesPorAcao: 2,
    papel: "linha de frente",
    recursos: ["Fúria (+2 dano, resistência a cortante/perfurante/concussão)", "Ataque Descuidado (vantagem)", "Ataque Extra", "Movimento Rápido (40 pés)"],
  },
  paladino: {
    id: "paladino",
    nome: "Paladino",
    dadoVida: 10,
    prioridade: ["FOR", "CAR", "CON", "SAB", "DES", "INT"],
    salvaguardas: ["SAB", "CAR"],
    armadura: { base: 18, maxDes: 0, nome: "Placas" },
    escudo: true,
    armas: ["espadaLonga", "martelo"],
    ataquesPorAcao: 2,
    conjuracao: { atributo: "CAR", espacos: [4, 2, 0], magias: ["curarFerimentos"] },
    papel: "linha de frente",
    recursos: ["Ataque Extra", "Destruição Divina (2d8 radiante +1d8/círculo)", "Cura pelas Mãos (25 PV)"],
  },
  patrulheiro: {
    id: "patrulheiro",
    nome: "Patrulheiro",
    dadoVida: 10,
    prioridade: ["DES", "SAB", "CON", "FOR", "INT", "CAR"],
    salvaguardas: ["FOR", "DES"],
    armadura: { base: 12, nome: "Couro Batido" },
    armas: ["arcoLongo"],
    ataquesPorAcao: 2,
    conjuracao: { atributo: "SAB", espacos: [4, 2, 0], magias: ["marcaCacador", "curarFerimentos"] },
    papel: "atirador",
    recursos: ["Ataque Extra", "Marca do Caçador (+1d6)", "Estilo: Arquearia (+2 no ataque à distância)"],
  },
  ladino: {
    id: "ladino",
    nome: "Ladino",
    dadoVida: 8,
    prioridade: ["DES", "CON", "SAB", "INT", "CAR", "FOR"],
    salvaguardas: ["DES", "INT"],
    armadura: { base: 11, nome: "Couro" },
    armas: ["rapieira", "espadaCurta", "arcoCurto"],
    ataquesPorAcao: 1,
    papel: "atirador",
    recursos: ["Ataque Furtivo (3d6)", "Ação Ardilosa", "Mira Firme (vantagem se não se mover)", "Esquiva Sobrenatural (metade do dano 1×/rodada)"],
  },
  monge: {
    id: "monge",
    nome: "Monge",
    dadoVida: 8,
    prioridade: ["DES", "SAB", "CON", "FOR", "INT", "CAR"],
    salvaguardas: ["FOR", "DES"],
    armadura: { base: 10, nome: "Defesa sem Armadura (10+DES+SAB)", somaSab: true },
    armas: ["punhos"],
    ataquesPorAcao: 2,
    papel: "linha de frente",
    recursos: ["Artes Marciais (d8)", "Defletir Ataques (−1d10+DES+5)", "Rajada de Golpes (2 golpes extras)", "Golpe Atordoante (CON)", "5 Pontos de Foco", "Movimento sem Armadura (40 pés)"],
  },
  mago: {
    id: "mago",
    nome: "Mago",
    dadoVida: 6,
    prioridade: ["INT", "CON", "DES", "SAB", "CAR", "FOR"],
    salvaguardas: ["INT", "SAB"],
    armadura: { base: 13, nome: "Armadura Arcana (13+DES)" },
    armas: ["cajado"],
    ataquesPorAcao: 1,
    conjuracao: { atributo: "INT", espacos: [4, 3, 2], magias: ["raioDeFogo", "misseisMagicos", "raioArdente", "bolaDeFogo", "relampago", "ondaTrovejante"] },
    papel: "conjurador",
    recursos: ["Espaços de magia 4/3/2", "Escudo (+5 CA como reação)"],
  },
  feiticeiro: {
    id: "feiticeiro",
    nome: "Feiticeiro",
    dadoVida: 6,
    prioridade: ["CAR", "CON", "DES", "SAB", "INT", "FOR"],
    salvaguardas: ["CON", "CAR"],
    armadura: { base: 13, nome: "Resiliência Dracônica (13+DES)" },
    armas: ["adagaFeiticeiro"],
    ataquesPorAcao: 1,
    conjuracao: { atributo: "CAR", espacos: [4, 3, 2], magias: ["raioDeGelo", "raioDeFogo", "orbeCromatico", "raioArdente", "despedacar", "bolaDeFogo"] },
    papel: "conjurador",
    recursos: ["Espaços de magia 4/3/2", "Escudo (+5 CA como reação)"],
  },
  bruxo: {
    id: "bruxo",
    nome: "Bruxo",
    dadoVida: 8,
    prioridade: ["CAR", "CON", "DES", "SAB", "INT", "FOR"],
    salvaguardas: ["SAB", "CAR"],
    armadura: { base: 11, nome: "Couro" },
    armas: ["adagaFeiticeiro"],
    ataquesPorAcao: 1,
    conjuracao: { atributo: "CAR", espacos: [0, 0, 2], magias: ["rajadaMistica", "bruxaria", "toqueVampirico", "despedacar"] },
    papel: "conjurador",
    recursos: ["Magia de Pacto (2 espaços de 3º círculo)", "Rajada Agonizante (+CAR)"],
  },
  clerigo: {
    id: "clerigo",
    nome: "Clérigo",
    dadoVida: 8,
    prioridade: ["SAB", "CON", "FOR", "DES", "CAR", "INT"],
    salvaguardas: ["SAB", "CAR"],
    armadura: { base: 14, maxDes: 2, nome: "Brunea" },
    escudo: true,
    armas: ["maca"],
    ataquesPorAcao: 1,
    conjuracao: { atributo: "SAB", espacos: [4, 3, 2], magias: ["chamaSagrada", "raioGuia", "armaEspiritual", "guardioes", "palavraCurativa", "curarFerimentos"] },
    papel: "suporte",
    recursos: ["Espaços de magia 4/3/2", "Guardiões Espirituais", "Arma Espiritual"],
  },
  druida: {
    id: "druida",
    nome: "Druida",
    dadoVida: 8,
    prioridade: ["SAB", "CON", "DES", "INT", "CAR", "FOR"],
    salvaguardas: ["INT", "SAB"],
    armadura: { base: 11, nome: "Couro" },
    escudo: true,
    armas: ["cimitarraDruida"],
    ataquesPorAcao: 1,
    conjuracao: { atributo: "SAB", espacos: [4, 3, 2], magias: ["produzirChama", "chicoteEspinhos", "ondaTrovejante", "raioLunar", "convocarRelampagos", "palavraCurativa"] },
    papel: "conjurador",
    recursos: ["Espaços de magia 4/3/2", "Convocar Relâmpagos", "Raio Lunar"],
  },
  bardo: {
    id: "bardo",
    nome: "Bardo",
    dadoVida: 8,
    prioridade: ["CAR", "DES", "CON", "SAB", "INT", "FOR"],
    salvaguardas: ["DES", "CAR"],
    armadura: { base: 11, nome: "Couro" },
    armas: ["rapieira"],
    ataquesPorAcao: 1,
    conjuracao: { atributo: "CAR", espacos: [4, 3, 2], magias: ["zombaria", "sussurros", "despedacar", "ondaTrovejante", "palavraCurativa"] },
    papel: "suporte",
    recursos: ["Espaços de magia 4/3/2", "Inspiração de Bardo", "Zombaria Viciosa"],
  },
};

// armas "de estilo" (mesmo dano do SRD, só muda o desenho)
ARMAS.adagaFeiticeiro = { nome: "Adaga", dano: "1d4", tipo: "perfurante", alcance: 5, atributo: "acuidade", visual: "adaga" };
ARMAS.cimitarraDruida = { ...ARMAS.cimitarra };

// ---------- Espécies (SRD 5.2) ----------
export type EspecieId = "humano" | "elfo" | "anao" | "halfling" | "gnomo" | "orc" | "tiefling" | "draconato" | "golias";

export type Especie = {
  id: EspecieId;
  nome: string;
  deslocamento: number;
  tracos: string[];
};

export const ESPECIES: Record<EspecieId, Especie> = {
  humano: { id: "humano", nome: "Humano", deslocamento: 30, tracos: ["Inspiração Heroica (rerrola 1 ataque)", "Talento: Vigoroso (+2 PV/nível)"] },
  elfo: { id: "elfo", nome: "Elfo", deslocamento: 35, tracos: ["Linhagem da Floresta (35 pés)", "Ancestral Feérico"] },
  anao: { id: "anao", nome: "Anão", deslocamento: 30, tracos: ["Robustez Anã (+1 PV/nível)", "Resiliência Anã (resiste a veneno)"] },
  halfling: { id: "halfling", nome: "Halfling", deslocamento: 30, tracos: ["Sortudo (rerrola 1 no d20)", "Corajoso"] },
  gnomo: { id: "gnomo", nome: "Gnomo", deslocamento: 30, tracos: ["Astúcia Gnômica (vantagem em salvaguardas de INT/SAB/CAR)"] },
  orc: { id: "orc", nome: "Orc", deslocamento: 30, tracos: ["Resistência Implacável (fica com 1 PV, 1×)", "Surto de Adrenalina"] },
  tiefling: { id: "tiefling", nome: "Tiefling", deslocamento: 30, tracos: ["Legado Infernal (resiste a fogo)", "Repreensão Infernal (2d10 fogo, 1×)"] },
  draconato: { id: "draconato", nome: "Draconato", deslocamento: 30, tracos: ["Arma de Sopro (2d10, 3×)", "Resistência Dracônica"] },
  golias: { id: "golias", nome: "Golias", deslocamento: 35, tracos: ["Resistência da Pedra (reduz 1d12+CON, 3×)", "Constituição Poderosa"] },
};

// Ancestralidade dracônica → tipo do sopro e cor das escamas
export const DRAGOES = [
  { nome: "Vermelho", tipo: "fogo" as TipoDano, cor: "#b8352b" },
  { nome: "Azul", tipo: "elétrico" as TipoDano, cor: "#3a6fc4" },
  { nome: "Branco", tipo: "frio" as TipoDano, cor: "#d9e4ea" },
  { nome: "Verde", tipo: "veneno" as TipoDano, cor: "#3f8c4a" },
  { nome: "Negro", tipo: "ácido" as TipoDano, cor: "#3b3a4a" },
  { nome: "Dourado", tipo: "fogo" as TipoDano, cor: "#d4a437" },
  { nome: "Prateado", tipo: "frio" as TipoDano, cor: "#a9b4bf" },
  { nome: "Bronze", tipo: "elétrico" as TipoDano, cor: "#a8703a" },
];

export const ATRIBUICAO_SRD =
  "This work includes material from the System Reference Document 5.2 (\"SRD 5.2\") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.";
