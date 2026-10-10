// Geração dos lutadores: ficha (atributos 4d6, PV, CA, arma) + aparência (peças do sprite).
import { Rng } from "./rng.ts";
import {
  ANCESTRALIDADES,
  ATRIBUTOS,
  CLASSES,
  CLASSE_IDS,
  CORES_CABELO,
  CORES_OLHO,
  CORES_PELE,
  CORES_ROUPA,
  ESPECIES,
  ESPECIE_IDS,
  NOMES,
  PODERES,
  TOTAL_NOMES,
  nomeCompleto,
  TRACOS_ESPECIE,
  espacos,
  mod,
} from "./regras.ts";
import type { Ancestralidade, Atributo, ClasseId, EspecieId, Poder, TipoDano } from "./regras.ts";
import type { ItemId } from "./itens.ts";

export type Cabeca =
  | "nada"
  | "elmoFechado"
  | "elmoAberto"
  | "elmoChifres"
  | "capuz"
  | "chapeu"
  | "boina"
  | "bandana"
  | "diadema"
  | "folhas"
  | "galhada";
export type Corpo = "placas" | "malha" | "couro" | "peito" | "colete" | "manto" | "gi" | "tunica";
export type ArmaId =
  | "espadaLonga"
  | "montante"
  | "machado"
  | "machadoGrande"
  | "martelo"
  | "maca"
  | "rapieira"
  | "adagas"
  | "arcoLongo"
  | "arcoCurto"
  | "cajado"
  | "cimitarra"
  | "alaude"
  | "punhos"
  | "adaga";
export type Cabelo = "curto" | "longo" | "rabo" | "trancas" | "coque" | "moicano" | "careca";

export type Visual = {
  pele: string;
  cabelo: string;
  estiloCabelo: Cabelo;
  barba: "" | "curta" | "longa" | "trancada";
  olho: string;
  marca: "" | "cicatriz" | "sardas" | "tatuagem" | "pintura";
  roupa: string; // cor principal
  roupa2: string; // cor de acento
  couro: string;
  metal: string;
  cabeca: Cabeca;
  pluma: string; // "" = sem pluma
  corpo: Corpo;
  tabardo: boolean;
  ombreiras: boolean;
  capa: string; // "" = sem capa
  peleOmbros: boolean;
  arma: ArmaId;
  escudo: "" | "brasao" | "madeira";
  brasao: string; // cor do brasão
  orbe: string; // "" = sem orbe flutuante
  aljava: boolean;
  mascara: boolean;
  magia: string; // cor de magia / cristal
  altura: number;
};

export type Arma = {
  nome: string;
  n: number;
  d: number;
  tipo: TipoDano;
  atributo: "FOR" | "DES";
  distancia: boolean;
  duasMaos: boolean;
};

export const ARMAS: Record<ArmaId, Arma> = {
  espadaLonga: { nome: "Espada Longa", n: 1, d: 8, tipo: "cortante", atributo: "FOR", distancia: false, duasMaos: false },
  montante: { nome: "Montante", n: 2, d: 6, tipo: "cortante", atributo: "FOR", distancia: false, duasMaos: true },
  machado: { nome: "Machado", n: 1, d: 8, tipo: "cortante", atributo: "FOR", distancia: false, duasMaos: false },
  machadoGrande: { nome: "Machado Grande", n: 1, d: 12, tipo: "cortante", atributo: "FOR", distancia: false, duasMaos: true },
  martelo: { nome: "Martelo de Guerra", n: 1, d: 8, tipo: "concussao", atributo: "FOR", distancia: false, duasMaos: false },
  maca: { nome: "Maça", n: 1, d: 6, tipo: "concussao", atributo: "FOR", distancia: false, duasMaos: false },
  rapieira: { nome: "Rapieira", n: 1, d: 8, tipo: "perfurante", atributo: "DES", distancia: false, duasMaos: false },
  adagas: { nome: "Adagas", n: 1, d: 4, tipo: "perfurante", atributo: "DES", distancia: false, duasMaos: false },
  adaga: { nome: "Adaga", n: 1, d: 4, tipo: "perfurante", atributo: "DES", distancia: false, duasMaos: false },
  arcoLongo: { nome: "Arco Longo", n: 1, d: 8, tipo: "perfurante", atributo: "DES", distancia: true, duasMaos: true },
  arcoCurto: { nome: "Arco Curto", n: 1, d: 6, tipo: "perfurante", atributo: "DES", distancia: true, duasMaos: true },
  cajado: { nome: "Cajado", n: 1, d: 6, tipo: "concussao", atributo: "FOR", distancia: false, duasMaos: false },
  cimitarra: { nome: "Cimitarra", n: 1, d: 6, tipo: "cortante", atributo: "DES", distancia: false, duasMaos: false },
  alaude: { nome: "Adaga", n: 1, d: 4, tipo: "perfurante", atributo: "DES", distancia: false, duasMaos: false },
  punhos: { nome: "Artes Marciais", n: 1, d: 6, tipo: "concussao", atributo: "DES", distancia: false, duasMaos: false },
};

export type Lutador = {
  id: number;
  nome: string;
  especie: EspecieId;
  classe: ClasseId;
  nivel: number;
  ancestralidade?: Ancestralidade;
  atributos: Record<Atributo, number>;
  rolagens: number[][]; // os 6 conjuntos de 4d6 (sem descartar), na ordem rolada
  tentativas: number; // quantas vezes o conjunto foi rolado (soma dos mods <= 0 => rola de novo)
  antecedente: string; // "+2 FOR / +1 CON"
  pvMax: number;
  pvRolagens: string[]; // histórico dos PV por nível
  ca: number;
  caDesc: string;
  arma: Arma;
  armaDistancia?: Arma; // ladino com arco curto usa as duas
  deslocamento: number;
  visual: Visual;
  autor: string;
  descricao: string;
  campeao: boolean; // veio do episódio anterior (coroa)
  vitorias: number;
  itens?: ItemId[]; // itens mágicos que já carrega
};

// ───────────── leitura simples da descrição de um comentário ─────────────
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tem = (txt: string, ...palavras: string[]) => palavras.some((p) => new RegExp(`\\b${p}`).test(txt));

const lerClasse = (t: string): ClasseId | undefined => {
  if (tem(t, "guerreir", "cavaleir", "soldad")) return "GUERREIRO";
  if (tem(t, "barbar")) return "BARBARO";
  if (tem(t, "paladin")) return "PALADINO";
  if (tem(t, "patrulheir", "arqueir", "cacador", "cacadora")) return "PATRULHEIRO";
  if (tem(t, "ladin", "ladra", "ladrao", "assassin")) return "LADINO";
  if (tem(t, "monge")) return "MONGE";
  if (tem(t, "mago", "maga")) return "MAGO";
  if (tem(t, "feiticeir")) return "FEITICEIRO";
  if (tem(t, "bruxo", "bruxa")) return "BRUXO";
  if (tem(t, "clerig", "sacerdot")) return "CLERIGO";
  if (tem(t, "druid")) return "DRUIDA";
  if (tem(t, "bard", "menestrel")) return "BARDO";
  return undefined;
};
const lerEspecie = (t: string): EspecieId | undefined => {
  if (tem(t, "anao", "ana\\b", "anoes", "anas")) return "ANAO";
  if (tem(t, "elf")) return "ELFO";
  if (tem(t, "halfling", "pequenin")) return "HALFLING";
  if (tem(t, "gnom")) return "GNOMO";
  if (tem(t, "orc", "meio-orc")) return "ORC";
  if (tem(t, "tiefling", "demon", "infernal")) return "TIEFLING";
  if (tem(t, "draconat", "dragao")) return "DRACONATO";
  if (tem(t, "golias", "gigante")) return "GOLIAS";
  if (tem(t, "human")) return "HUMANO";
  return undefined;
};
const CORES_TEXTO: [string, string][] = [
  ["vermelh", "#a82a2a"],
  ["carmesim", "#9c2a2e"],
  ["azul", "#2c4a9a"],
  ["verde", "#2f6a3a"],
  ["roxo", "#5e3488"],
  ["roxa", "#5e3488"],
  ["purpura", "#5e3488"],
  ["pret", "#2a2a30"],
  ["negr", "#2a2a30"],
  ["branc", "#d8d4c8"],
  ["dourad", "#c8a03a"],
  ["amarel", "#c09a2e"],
  ["rosa", "#c84a7a"],
  ["laranja", "#c8682e"],
  ["cinza", "#6a6a72"],
  ["marrom", "#7a4e2e"],
  ["vinho", "#6e2238"],
];
const lerCor = (t: string) => CORES_TEXTO.find(([p]) => tem(t, p))?.[1];
const lerCabeloCor = (t: string) => {
  if (tem(t, "ruiv")) return "#a8401e";
  if (tem(t, "loir")) return "#c8902e";
  if (tem(t, "grisalh")) return "#8a8a92";
  const m = t.match(/cabel\w* (\w+)/);
  if (m) return lerCor(m[1]);
  return undefined;
};
const lerArma = (t: string): ArmaId | undefined => {
  if (tem(t, "montante", "espadao")) return "montante";
  if (tem(t, "machado grande", "machadao")) return "machadoGrande";
  if (tem(t, "machad")) return "machado";
  if (tem(t, "martel")) return "martelo";
  if (tem(t, "maca\\b", "clava")) return "maca";
  if (tem(t, "rapieira", "florete")) return "rapieira";
  if (tem(t, "adaga", "punha")) return "adagas";
  if (tem(t, "arco curto")) return "arcoCurto";
  if (tem(t, "arco")) return "arcoLongo";
  if (tem(t, "cajad")) return "cajado";
  if (tem(t, "cimitarra")) return "cimitarra";
  if (tem(t, "alaude")) return "alaude";
  if (tem(t, "espada")) return "espadaLonga";
  return undefined;
};

export type Pedido = { nome?: string; descricao?: string; autor?: string };

// ───────────── aparência por classe (peças sorteadas) ─────────────
const sortearVisual = (rng: Rng, classe: ClasseId, especie: EspecieId, anc: Ancestralidade | undefined, desc: string): Visual => {
  const t = sem(desc);
  const pele = especie === "DRACONATO" ? anc!.cor : rng.pick(CORES_PELE[especie]);
  const roupa = lerCor(t) ?? rng.pick(CORES_ROUPA);
  let roupa2 = rng.pick(CORES_ROUPA);
  if (roupa2 === roupa) roupa2 = "#c8a03a";
  const metais = ["#a8b0bc", "#b8bcc4", "#9aa2ae", "#c0a060"];
  let estilo: Cabelo = rng.pick(["curto", "longo", "rabo", "trancas", "coque", "moicano", "careca"] as Cabelo[]);
  if (tem(t, "careca")) estilo = "careca";
  else if (tem(t, "tranc")) estilo = "trancas";
  else if (tem(t, "moicano")) estilo = "moicano";
  else if (tem(t, "coque")) estilo = "coque";
  else if (tem(t, "rabo")) estilo = "rabo";
  else if (tem(t, "cabelo longo", "cabelos longos")) estilo = "longo";
  else if (tem(t, "cabelo curto")) estilo = "curto";
  if (especie === "DRACONATO") estilo = "careca";
  const barbaPossivel = ["HUMANO", "ANAO", "ORC", "GOLIAS", "GNOMO", "HALFLING", "TIEFLING"].includes(especie);
  let barba: Visual["barba"] = especie === "ANAO" ? rng.pick(["longa", "trancada", "curta"] as const) : barbaPossivel && rng.next() < 0.3 ? rng.pick(["curta", "longa"] as const) : "";
  if (tem(t, "barba")) barba = barba || "curta";
  if (tem(t, "sem barba")) barba = "";
  const marcas: Visual["marca"][] = ["", "", "cicatriz", "sardas", "tatuagem"];
  const v: Visual = {
    pele,
    cabelo: lerCabeloCor(t) ?? rng.pick(CORES_CABELO),
    estiloCabelo: estilo,
    barba,
    olho: especie === "TIEFLING" ? "#e8b830" : especie === "DRACONATO" ? "#e8c040" : rng.pick(CORES_OLHO),
    marca: especie === "GOLIAS" ? "tatuagem" : rng.pick(marcas),
    roupa,
    roupa2,
    couro: rng.pick(["#6a4428", "#5a3a26", "#7a5034", "#3e2e26"]),
    metal: rng.pick(metais),
    cabeca: "nada",
    pluma: "",
    corpo: "tunica",
    tabardo: false,
    ombreiras: false,
    capa: "",
    peleOmbros: false,
    arma: "espadaLonga",
    escudo: "",
    brasao: rng.pick(["#e8c040", "#e8e0d0", "#c83a3a", "#3a5ac8"]),
    orbe: "",
    aljava: false,
    mascara: false,
    magia: "#e8701e",
    altura: ESPECIES[especie].altura,
  };
  const p = <T,>(arr: readonly T[]) => rng.pick(arr);
  switch (classe) {
    case "GUERREIRO":
      v.cabeca = p(["elmoFechado", "elmoFechado", "elmoAberto", "elmoChifres"] as Cabeca[]);
      v.pluma = rng.next() < 0.5 ? p(["#c83a3a", "#e8e0d0", "#3a5ac8"]) : "";
      v.corpo = p(["placas", "malha"] as Corpo[]);
      v.tabardo = v.corpo === "malha" || rng.next() < 0.5;
      v.ombreiras = true;
      v.capa = rng.next() < 0.6 ? roupa : "";
      v.arma = p(["montante", "espadaLonga", "machado"] as ArmaId[]);
      v.escudo = ARMAS[v.arma].duasMaos ? "" : "brasao";
      break;
    case "BARBARO":
      v.corpo = p(["peito", "colete"] as Corpo[]);
      v.peleOmbros = true;
      v.cabeca = p(["elmoChifres", "bandana", "nada"] as Cabeca[]);
      v.marca = "pintura";
      v.arma = p(["machadoGrande", "montante"] as ArmaId[]);
      break;
    case "PALADINO":
      v.corpo = "placas";
      v.tabardo = true;
      v.ombreiras = true;
      v.cabeca = p(["elmoAberto", "elmoFechado", "nada"] as Cabeca[]);
      v.pluma = v.cabeca !== "nada" ? p(["#e8e0d0", "#e8c040", "#c83a3a"]) : "";
      v.capa = p(["#e8e0d0", roupa]);
      v.escudo = "brasao";
      v.arma = p(["espadaLonga", "martelo"] as ArmaId[]);
      v.magia = "#f0d060";
      break;
    case "PATRULHEIRO":
      v.roupa = lerCor(t) ?? p(["#2f6a3a", "#3e5a2e", "#4a6a3a"]);
      v.cabeca = "capuz";
      v.capa = v.roupa;
      v.corpo = "couro";
      v.aljava = true;
      v.arma = "arcoLongo";
      v.magia = "#a6d62a";
      break;
    case "LADINO":
      v.roupa = lerCor(t) ?? p(["#2e2a30", "#3a3440", "#2a3038", "#4a2a2e"]);
      v.cabeca = p(["capuz", "bandana", "nada"] as Cabeca[]);
      v.mascara = v.cabeca !== "capuz" || rng.next() < 0.5;
      v.corpo = "couro";
      v.capa = rng.next() < 0.6 ? v.roupa : "";
      v.arma = p(["rapieira", "adagas", "arcoCurto"] as ArmaId[]);
      v.aljava = v.arma === "arcoCurto";
      break;
    case "MONGE":
      v.corpo = "gi";
      v.roupa = lerCor(t) ?? p(["#c8682e", "#d8cdb4", "#9c2a2e", "#c09a2e", "#2c4a9a"]);
      v.estiloCabelo = tem(t, "cabel") ? v.estiloCabelo : p(["careca", "coque"] as Cabelo[]);
      v.arma = "punhos";
      v.magia = "#9ad8f0";
      break;
    case "MAGO":
      v.cabeca = p(["chapeu", "chapeu", "capuz"] as Cabeca[]);
      v.corpo = "manto";
      v.roupa = lerCor(t) ?? p(["#2c4a9a", "#5e3488", "#6e2238", "#2a6a72", "#4e5a6a"]);
      v.roupa2 = "#c8a03a";
      v.arma = "cajado";
      v.magia = p(["#6ad0f0", "#e8701e", "#d23ab4"]);
      break;
    case "FEITICEIRO":
      v.cabeca = p(["diadema", "capuz", "nada"] as Cabeca[]);
      v.corpo = p(["manto", "tunica"] as Corpo[]);
      v.arma = "adaga";
      v.magia = p(["#e8701e", "#6cc7f0", "#a6d62a"]);
      v.orbe = v.magia;
      v.marca = "";
      break;
    case "BRUXO":
      v.cabeca = p(["capuz", "elmoChifres"] as Cabeca[]);
      v.corpo = p(["couro", "manto"] as Corpo[]);
      v.roupa = lerCor(t) ?? p(["#2e2a36", "#3a2a48", "#4a1e2e"]);
      v.arma = "adaga";
      v.magia = "#a24ae0";
      v.orbe = "#a24ae0";
      break;
    case "CLERIGO":
      v.corpo = p(["manto", "malha"] as Corpo[]);
      v.roupa = lerCor(t) ?? p(["#e8e0d0", "#d8cdb4", "#c8d0dc"]);
      v.tabardo = v.corpo === "malha";
      v.cabeca = p(["diadema", "nada", "elmoAberto"] as Cabeca[]);
      v.escudo = "brasao";
      v.brasao = "#e8c040";
      v.arma = "maca";
      v.magia = "#f0d060";
      break;
    case "DRUIDA":
      v.cabeca = p(["folhas", "galhada", "capuz"] as Cabeca[]);
      v.corpo = p(["manto", "tunica"] as Corpo[]);
      v.roupa = lerCor(t) ?? p(["#2f6a3a", "#4a6a3a", "#5a5a2e", "#3e5a4e"]);
      v.peleOmbros = v.corpo === "tunica";
      v.escudo = "madeira";
      v.arma = "cimitarra";
      v.magia = "#7ad04a";
      break;
    case "BARDO":
      v.cabeca = p(["boina", "boina", "nada"] as Cabeca[]);
      v.pluma = v.cabeca === "boina" ? p(["#e8e0d0", "#e8c040", "#c83a3a", "#3ac8a0"]) : "";
      v.corpo = "tunica";
      v.capa = v.roupa2;
      v.arma = p(["alaude", "rapieira"] as ArmaId[]);
      v.magia = "#ec6aa8";
      break;
  }
  const armaTexto = lerArma(t);
  if (armaTexto && classe !== "MONGE") {
    v.arma = armaTexto;
    if (ARMAS[armaTexto].duasMaos && v.escudo) v.escudo = "";
    v.aljava = armaTexto === "arcoLongo" || armaTexto === "arcoCurto";
  }
  if (tem(t, "capa")) v.capa = v.capa || roupa;
  if (tem(t, "escudo") && !ARMAS[v.arma].duasMaos) v.escudo = v.escudo || "brasao";
  if (tem(t, "cicatriz")) v.marca = "cicatriz";
  if (tem(t, "sarda")) v.marca = "sardas";
  if (tem(t, "tatua")) v.marca = "tatuagem";
  if (tem(t, "capuz")) v.cabeca = "capuz";
  if (tem(t, "chapeu")) v.cabeca = "chapeu";
  if (tem(t, "elmo")) v.cabeca = v.cabeca.startsWith("elmo") ? v.cabeca : "elmoAberto";
  return v;
};

// ───────────── ficha ─────────────
const ANTECEDENTE_2 = (c: ClasseId): [Atributo, Atributo] => [CLASSES[c].prioridade[0], CLASSES[c].prioridade[1] === "CON" ? "CON" : CLASSES[c].prioridade[2] === "CON" ? "CON" : CLASSES[c].prioridade[1]];

export const calcularCA = (classe: ClasseId, v: Visual, at: Record<Atributo, number>): [number, string] => {
  const des = mod(at.DES);
  const escudo = v.escudo ? 2 : 0;
  const esc = escudo ? " + escudo" : "";
  switch (classe) {
    case "BARBARO":
      return [10 + des + mod(at.CON) + escudo, "sem armadura (10 + DES + CON)" + esc];
    case "MONGE":
      return [10 + des + mod(at.SAB), "sem armadura (10 + DES + SAB)"];
    case "MAGO":
      return [13 + des, "armadura arcana (13 + DES)"];
    case "FEITICEIRO":
      return [10 + des, "sem armadura (10 + DES)"];
  }
  if (v.corpo === "placas") return [18 + escudo, "placas" + esc];
  if (v.corpo === "malha") return [16 + escudo, "cota de malha" + esc];
  if (classe === "CLERIGO") return [14 + Math.min(2, des) + escudo, "brunea (14 + DES máx. 2)" + esc];
  if (classe === "PATRULHEIRO" || classe === "BARDO" || classe === "LADINO") return [12 + des + escudo, "couro batido (12 + DES)" + esc];
  return [11 + des + escudo, "couro (11 + DES)" + esc];
};

const gerarAtributos = (rng: Rng, nome: string, classe: ClasseId) => {
  let tentativas = 0;
  for (;;) {
    tentativas++;
    const rolagens: number[][] = [];
    const valores: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = rng.roll(`${nome} · atributo ${i + 1} (4d6, descarta o menor)`, 4, 6);
      rolagens.push(r.dados);
      const ord = [...r.dados].sort((a, b) => b - a);
      valores.push(ord[0] + ord[1] + ord[2]);
    }
    const somaMods = valores.reduce((s, v) => s + mod(v), 0);
    if (somaMods <= 0) continue;
    const ordenados = [...valores].sort((a, b) => b - a);
    const at = {} as Record<Atributo, number>;
    CLASSES[classe].prioridade.forEach((a, i) => (at[a] = ordenados[i]));
    const [a2, a1] = ANTECEDENTE_2(classe);
    at[a2] = Math.min(20, at[a2] + 2);
    at[a1] = Math.min(20, at[a1] + 1);
    return { at, rolagens, tentativas, antecedente: `+2 ${a2} / +1 ${a1}` };
  }
};

const armaDe = (v: Visual): Arma => ARMAS[v.arma];

export type FichaCampeao = {
  nome: string;
  especie: EspecieId;
  classe: ClasseId;
  nivel: number;
  atributos: Record<Atributo, number>;
  pvMax: number;
  pvRolagens?: string[];
  ancestralidade?: string;
  visual: Visual;
  vitorias: number;
  itens?: ItemId[];
  autor?: string;
  descricao?: string;
  rolagens?: number[][];
  antecedente?: string;
};

export type Episodio = {
  numero: number;
  seed: string;
  perfil: string;
  lutadores: Pedido[]; // até 16; vazio = aleatório
  campeaoAnterior: FichaCampeao | null;
  textos: {
    escolha: string;
    lutem: string;
    subiu: string;
    defende: string;
    cta: string;
  };
  audio: string; // arquivo em public/ (vazio = sem áudio)
  // 1 = regras dos episódios 1–3 (nome único, sem foco no campeão).
  // 2 = nome e sobrenome que nunca se repetem, leve foco no campeão e +1 nível para quem derrubá-lo.
  versao?: number;
  // força do foco dos lutadores no campeão (versão 2+): 1 = leve (padrão), 5 = forte, 0 = nenhum,
  // "auto" = cresce com o nível do campeão (2,5 por nível acima do 2)
  focoCampeao?: number | "auto";
  arena?: "calabouco" | "floresta"; // cenário (padrão: calabouço)
  centro?: "altar" | "livre"; // "livre" = sem tablado de degraus e sem pedra d20 no meio (nem obstáculo)
};

export const gerarLutadores = (ep: Episodio): { lutadores: Lutador[]; rng: Rng } => {
  const rng = new Rng(ep.seed);
  const camp = ep.campeaoAnterior;
  const total = 16;
  const pedidos: Pedido[] = ep.lutadores.slice(0, camp ? 15 : 16);

  // classes: as 12 aparecem (se possível) + repetidas, máx. 2 de cada
  const contClasse: Record<string, number> = {};
  const contEspecie: Record<string, number> = {};
  const usados = new Set<string>();
  // campeão que veio de antes de existir sobrenome ganha um (fixo e único) na primeira luta da versão 2
  const nomeCampeao = camp ? ((ep.versao ?? 1) >= 2 && !camp.nome.includes(" ") ? `${camp.nome} ${nomeCompleto(TOTAL_NOMES() - 1 - ep.numero * 16).split(" ")[1]}` : camp.nome) : "";
  if (camp) {
    contClasse[camp.classe] = 1;
    contEspecie[camp.especie] = 1;
    usados.add(nomeCampeao);
  }
  const fixas = pedidos.map((p) => (p.descricao ? lerClasse(sem(p.descricao)) : undefined));
  fixas.forEach((c) => c && (contClasse[c] = (contClasse[c] ?? 0) + 1));
  const vagas = total - (camp ? 1 : 0);
  const fila: ClasseId[] = [];
  const faltam = rng.shuffle(CLASSE_IDS.filter((c) => !contClasse[c]));
  fila.push(...faltam);
  const extras = rng.shuffle(CLASSE_IDS.filter((c) => (contClasse[c] ?? 0) + (faltam.includes(c) ? 1 : 0) < 2));
  fila.push(...extras);

  const lutadores: Lutador[] = [];
  let filaI = 0;
  for (let i = 0; i < vagas; i++) {
    const ped = pedidos[i] ?? {};
    const desc = ped.descricao ?? "";
    const t = sem(desc);
    let classe = fixas[i];
    if (!classe) {
      while (filaI < fila.length && (contClasse[fila[filaI]] ?? 0) >= 2) filaI++;
      classe = fila[filaI++] ?? rng.pick(CLASSE_IDS);
      contClasse[classe] = (contClasse[classe] ?? 0) + 1;
    }
    let especie = lerEspecie(t);
    if (!especie) {
      const livres = ESPECIE_IDS.filter((e) => (contEspecie[e] ?? 0) < 3);
      especie = rng.pick(livres);
    }
    contEspecie[especie] = (contEspecie[especie] ?? 0) + 1;
    let nome = ped.nome?.trim();
    if (!nome && (ep.versao ?? 1) >= 2) nome = nomeLivre(ep.numero, i, usados);
    else if (!nome) {
      const livres = NOMES.filter((n) => !usados.has(n));
      nome = rng.pick(livres);
    }
    usados.add(nome);
    const anc = especie === "DRACONATO" ? ANCESTRALIDADES.find((a) => tem(t, a.nome.slice(0, 5))) ?? rng.pick(ANCESTRALIDADES) : undefined;
    const visual = sortearVisual(rng, classe, especie, anc, desc);
    const { at, rolagens, tentativas, antecedente } = gerarAtributos(rng, nome, classe);
    const dv = CLASSES[classe].dv;
    const anao = especie === "ANAO" ? 1 : 0;
    const pv = dv + mod(at.CON) + anao;
    const [ca, caDesc] = calcularCA(classe, visual, at);
    const arma = armaDe(visual);
    lutadores.push({
      id: 0,
      nome,
      especie,
      classe,
      nivel: 1,
      ancestralidade: anc,
      atributos: at,
      rolagens,
      tentativas,
      antecedente,
      pvMax: Math.max(1, pv),
      pvRolagens: [`NV 1: d${dv} máximo = ${dv} ${fmt(mod(at.CON))} CON${anao ? " +1 Robustez Anã" : ""} = ${pv} PV`],
      ca,
      caDesc,
      arma,
      armaDistancia: arma.distancia ? undefined : classe === "PATRULHEIRO" ? ARMAS.arcoLongo : undefined,
      deslocamento: ESPECIES[especie].deslocamento,
      visual,
      autor: ped.autor ?? "",
      descricao: desc,
      campeao: false,
      vitorias: 0,
    });
  }
  if (camp) {
    const anc = camp.ancestralidade ? ANCESTRALIDADES.find((a) => a.nome === camp.ancestralidade) : undefined;
    const [ca, caDesc] = calcularCA(camp.classe, camp.visual, camp.atributos);
    const pos = rng.int(0, lutadores.length);
    lutadores.splice(pos, 0, {
      id: 0,
      nome: nomeCampeao,
      especie: camp.especie,
      classe: camp.classe,
      nivel: camp.nivel,
      ancestralidade: anc,
      atributos: { ...camp.atributos },
      rolagens: camp.rolagens ?? [],
      tentativas: 0,
      antecedente: camp.antecedente ?? "",
      pvMax: camp.pvMax,
      pvRolagens: camp.pvRolagens ?? [],
      ca,
      caDesc,
      arma: ARMAS[camp.visual.arma],
      deslocamento: ESPECIES[camp.especie].deslocamento,
      visual: camp.visual,
      autor: camp.autor ?? "",
      descricao: camp.descricao ?? "",
      campeao: true,
      vitorias: camp.vitorias,
      itens: camp.itens ?? [],
    });
  }
  lutadores.forEach((l, i) => (l.id = i));
  return { lutadores, rng };
};

// Nome e sobrenome do lutador `i` do episódio `numero`: sai de uma sequência única para a série inteira,
// então nunca se repete entre episódios. Também não repete o primeiro nome de ninguém da mesma luta.
const nomeLivre = (numero: number, i: number, usados: Set<string>): string => {
  const primeiros = new Set([...usados].map((n) => n.split(" ")[0]));
  const testa = (p: number) => {
    const n = nomeCompleto(p);
    return !usados.has(n) && !primeiros.has(n.split(" ")[0]) ? n : "";
  };
  const n0 = testa((numero - 1) * 16 + i);
  if (n0) return n0;
  // colidiu com um nome vindo de comentário/campeão: usa a reserva no fim da sequência
  for (let k = 0; k < 400; k++) {
    const n = testa(TOTAL_NOMES() - 1 - numero * 16 - 8 - k * 97);
    if (n) return n;
  }
  return nomeCompleto((numero - 1) * 16 + i);
};

export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

// ───────────── poderes e subida de nível ─────────────
export const poderesAte = (l: Pick<Lutador, "classe" | "especie" | "nivel">): Poder[] => {
  const out: Poder[] = [...TRACOS_ESPECIE[l.especie]];
  for (let n = 1; n <= Math.min(5, l.nivel); n++) out.push(...PODERES[l.classe][n - 1]);
  return out;
};

export type SubidaNivel = {
  de: number;
  para: number;
  dado: number;
  rolagem: number;
  conMod: number;
  anao: number;
  pvGanho: number;
  pvAntes: number;
  pvDepois: number;
  atributosAntes: Record<Atributo, number>;
  atributosDepois: Record<Atributo, number>;
  poderesNovos: Poder[];
  espacosAntes: number[];
  espacosDepois: number[];
  rolagensTxt: string[]; // uma linha por nível ganho: "d10 = 6 +3 CON"
  ficha: FichaCampeao;
};

// Junta várias subidas seguidas (ex.: +1 por derrubar o campeão e +1 por vencer) numa só, para o pergaminho.
export const combinarSubidas = (lista: SubidaNivel[]): SubidaNivel => {
  const a = lista[0],
    z = lista[lista.length - 1];
  return {
    ...z,
    de: a.de,
    pvAntes: a.pvAntes,
    pvGanho: lista.reduce((s, x) => s + x.pvGanho, 0),
    atributosAntes: a.atributosAntes,
    espacosAntes: a.espacosAntes,
    poderesNovos: lista.flatMap((x) => x.poderesNovos),
    rolagensTxt: lista.flatMap((x) => x.rolagensTxt),
  };
};

export const subirNivel = (l: Lutador, rng: Rng): SubidaNivel => {
  const de = l.nivel;
  const para = Math.min(20, de + 1);
  const dv = CLASSES[l.classe].dv;
  const r = rng.roll(`${l.nome} · PV do nível ${para} (d${dv})`, 1, dv);
  const atributosDepois = { ...l.atributos };
  if (para === 4 || para === 8 || para === 12 || para === 16 || para === 19) {
    const [p1, p2] = CLASSES[l.classe].prioridade;
    if (atributosDepois[p1] <= 18) atributosDepois[p1] += 2;
    else {
      atributosDepois[p1] = Math.min(20, atributosDepois[p1] + 1);
      atributosDepois[p2] = Math.min(20, atributosDepois[p2] + 1);
    }
  }
  // CON nova vale para o PV do nível (e retroativamente, como no SRD)
  const conAntes = mod(l.atributos.CON);
  const conDepois = mod(atributosDepois.CON);
  const anao = l.especie === "ANAO" ? 1 : 0;
  const ganho = Math.max(1, r.total + conDepois) + anao + (conDepois - conAntes) * de;
  const pvDepois = l.pvMax + ganho;
  // o Aumento de Atributo mostra o que foi aplicado de fato (+2 no principal, ou +1/+1 se ele já estava no máximo)
  const ganhos = ATRIBUTOS.filter((a) => atributosDepois[a] > l.atributos[a]).map((a) => `+${atributosDepois[a] - l.atributos[a]} em ${a}`);
  const poderesNovos = (para <= 5 ? PODERES[l.classe][para - 1] : []).map((p) => (p.nome === "Aumento de Atributo" ? { ...p, desc: ganhos.length ? ganhos.join(", ") : "atributos já no máximo" } : p));
  const linha = `NV ${para}: d${dv} = ${r.total} ${fmt(conDepois)} CON${anao ? " +1 Robustez Anã" : ""} = +${ganho} PV`;
  const ficha: FichaCampeao = {
    nome: l.nome,
    especie: l.especie,
    classe: l.classe,
    nivel: para,
    atributos: atributosDepois,
    pvMax: pvDepois,
    pvRolagens: [...l.pvRolagens, linha],
    ancestralidade: l.ancestralidade?.nome,
    visual: l.visual,
    vitorias: l.vitorias + 1,
    itens: l.itens ?? [],
    autor: l.autor,
    descricao: l.descricao,
    rolagens: l.rolagens,
    antecedente: l.antecedente,
  };
  return {
    de,
    para,
    dado: dv,
    rolagem: r.total,
    conMod: conDepois,
    anao,
    pvGanho: ganho,
    pvAntes: l.pvMax,
    pvDepois,
    atributosAntes: { ...l.atributos },
    atributosDepois,
    poderesNovos,
    espacosAntes: espacos(l.classe, de),
    espacosDepois: espacos(l.classe, para),
    rolagensTxt: [`d${dv} = ${r.total} ${fmt(conDepois)} CON${anao ? " +1" : ""}`],
    ficha,
  };
};

export const ATRIBUTOS_ORDEM = ATRIBUTOS;
