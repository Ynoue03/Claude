// Geração das fichas de nível 1 (SRD 5.2), com todas as rolagens gravadas.
import { Dados, hash, mod } from "./rng";
import {
  ANCESTRAIS,
  Ancestral,
  ATRIBUTOS,
  Atributo,
  CABELO_FANTASIA,
  CABELO_NATURAL,
  CLASSE,
  CLASSES,
  ClasseId,
  CORES_ROUPA,
  ESPACOS,
  ESPECIE,
  ESPECIES,
  EspecieId,
  ESTILOS_CABELO,
  EstiloCabelo,
  NOMES,
  PELES,
  TipoDano,
} from "./tabelas";

export type ArmaId =
  | "espadaLonga"
  | "montante"
  | "machado"
  | "machadoGrande"
  | "martelo"
  | "maca"
  | "rapieira"
  | "adagas"
  | "arcoCurto"
  | "arcoLongo"
  | "cimitarra"
  | "cajado"
  | "punhos"
  | "adaga"
  | "alaude";

export type Arma = {
  id: ArmaId;
  nome: string;
  n: number;
  d: number;
  tipo: TipoDano;
  /** atributo do ataque: FOR, DES ou "fin" (o maior entre FOR e DES) */
  atr: "FOR" | "DES" | "fin";
  distancia: boolean;
  alcance: number; // pés
  duasMaos: boolean;
  leve: boolean;
};

const ARMAS: Record<ArmaId, Arma> = {
  espadaLonga: { id: "espadaLonga", nome: "Espada Longa", n: 1, d: 8, tipo: "cortante", atr: "FOR", distancia: false, alcance: 5, duasMaos: false, leve: false },
  montante: { id: "montante", nome: "Montante", n: 2, d: 6, tipo: "cortante", atr: "FOR", distancia: false, alcance: 5, duasMaos: true, leve: false },
  machado: { id: "machado", nome: "Machado de Batalha", n: 1, d: 8, tipo: "cortante", atr: "FOR", distancia: false, alcance: 5, duasMaos: false, leve: false },
  machadoGrande: { id: "machadoGrande", nome: "Machado Grande", n: 1, d: 12, tipo: "cortante", atr: "FOR", distancia: false, alcance: 5, duasMaos: true, leve: false },
  martelo: { id: "martelo", nome: "Martelo de Guerra", n: 1, d: 8, tipo: "concussao", atr: "FOR", distancia: false, alcance: 5, duasMaos: false, leve: false },
  maca: { id: "maca", nome: "Maça", n: 1, d: 6, tipo: "concussao", atr: "FOR", distancia: false, alcance: 5, duasMaos: false, leve: false },
  rapieira: { id: "rapieira", nome: "Rapieira", n: 1, d: 8, tipo: "perfurante", atr: "fin", distancia: false, alcance: 5, duasMaos: false, leve: false },
  adagas: { id: "adagas", nome: "Adagas", n: 1, d: 4, tipo: "perfurante", atr: "fin", distancia: false, alcance: 5, duasMaos: false, leve: true },
  arcoCurto: { id: "arcoCurto", nome: "Arco Curto", n: 1, d: 6, tipo: "perfurante", atr: "DES", distancia: true, alcance: 80, duasMaos: true, leve: false },
  arcoLongo: { id: "arcoLongo", nome: "Arco Longo", n: 1, d: 8, tipo: "perfurante", atr: "DES", distancia: true, alcance: 150, duasMaos: true, leve: false },
  cimitarra: { id: "cimitarra", nome: "Cimitarra", n: 1, d: 6, tipo: "cortante", atr: "fin", distancia: false, alcance: 5, duasMaos: false, leve: true },
  cajado: { id: "cajado", nome: "Cajado", n: 1, d: 6, tipo: "concussao", atr: "FOR", distancia: false, alcance: 5, duasMaos: false, leve: false },
  punhos: { id: "punhos", nome: "Artes Marciais", n: 1, d: 6, tipo: "concussao", atr: "fin", distancia: false, alcance: 5, duasMaos: false, leve: false },
  adaga: { id: "adaga", nome: "Adaga", n: 1, d: 4, tipo: "perfurante", atr: "fin", distancia: false, alcance: 5, duasMaos: false, leve: true },
  alaude: { id: "alaude", nome: "Adaga", n: 1, d: 4, tipo: "perfurante", atr: "fin", distancia: false, alcance: 5, duasMaos: false, leve: true },
};

export type Cabeca =
  | "nada"
  | "elmoFechadoPluma"
  | "elmoFechadoCruz"
  | "elmoAberto"
  | "elmoChifres"
  | "elmoPluma"
  | "bandana"
  | "capuz"
  | "mascara"
  | "chapeuPontudo"
  | "diadema"
  | "coroaFolhas"
  | "galhada"
  | "boina";

export type Torso =
  | "placas"
  | "malha"
  | "peitoNu"
  | "coleteCouro"
  | "couro"
  | "couroEscuro"
  | "gi"
  | "manto"
  | "tunica"
  | "mantoClaro";

export type Aparencia = {
  pele: string;
  cabelo: string;
  estilo: EstiloCabelo;
  barba: boolean;
  olhos: string;
  roupa1: string;
  roupa1Nome: string;
  roupa2: string;
  dourado: boolean; // detalhes em ouro (senão, latão/aço)
  cabeca: Cabeca;
  torso: Torso;
  tabardo: boolean;
  capa: boolean;
  capaCurta: boolean;
  ombreiras: boolean;
  pelePeles: boolean; // pele de animal nos ombros
  escudo: "nenhum" | "brasao" | "madeira";
  arma: ArmaId;
  aljava: boolean;
  orbe: string | null; // cor do orbe flutuante
  faixa: string; // faixa do monge / mago
  pintura: boolean;
  marca: "nada" | "cicatriz" | "tatuagem" | "sardas" | "escamas";
  pluma: string;
};

export type Recursos = {
  espacos: number[]; // [1º, 2º, 3º]
  furia: number;
  folego: number;
  curaMaos: number;
  marcaGratis: number;
  inata: number;
  sopro: number;
  implacavel: number;
  surto: number; // surto de adrenalina (orc)
  heroica: number;
  pedra: number;
  surtoAcao: number;
  centelha: number;
  foco: number;
};

export type ConjuntoAtributos = { dados: number[][]; totais: number[] };

export type Lutador = {
  id: number;
  nome: string;
  autor: string;
  descricao: string;
  especie: EspecieId;
  ancestral: Ancestral | null;
  sopro: TipoDano | null;
  classe: ClasseId;
  nivel: number;
  campeaoAnterior: boolean;
  /** rolagens dos atributos: cada tentativa tem 6 conjuntos de 4d6 */
  tentativas: ConjuntoAtributos[];
  atrib: Record<Atributo, number>;
  antecedente: [Atributo, Atributo];
  pvMax: number;
  pvTexto: string;
  ca: number;
  caTexto: string;
  desloc: number;
  arma: Arma;
  armadura: string;
  estilo: "" | "Defesa" | "Duelo" | "Armas Grandes" | "Arquearia";
  armaduraArcana: boolean;
  recursos: Recursos;
  poderesExtras: string[];
  aparencia: Aparencia;
  historicoPV: string[];
};

export const modAtr = (l: Lutador, a: Atributo) => mod(l.atrib[a]);
export const prof = (l: Lutador) => (l.nivel >= 5 ? 3 : 2);
export const modConj = (l: Lutador) => {
  const c = CLASSE[l.classe].conjura;
  if (c) return modAtr(l, c);
  // legado infernal: usa o maior entre INT, SAB, CAR
  return Math.max(modAtr(l, "INT"), modAtr(l, "SAB"), modAtr(l, "CAR"));
};
export const cdMagia = (l: Lutador) => 8 + prof(l) + modConj(l);
export const atqMagia = (l: Lutador) => prof(l) + modConj(l);
export const modArma = (l: Lutador, a: Arma) =>
  a.atr === "fin" ? Math.max(modAtr(l, "FOR"), modAtr(l, "DES")) : modAtr(l, a.atr);
export const atqArma = (l: Lutador) =>
  prof(l) + modArma(l, l.arma) + (l.estilo === "Arquearia" && l.arma.distancia ? 2 : 0);

// ─────────────────────────── entrada (JSON do episódio) ───────────────────────────
export type EntradaLutador = { nome?: string; descricao?: string; autor?: string };

export type FichaSalva = Lutador; // a ficha nova do campeão é gravada inteira

const sem = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** lê a descrição de um comentário: classe, espécie, cor, arma */
export const interpretar = (descricao: string) => {
  const t = sem(descricao);
  const achar = <T,>(pares: [string, T][]): T | null => {
    for (const [k, v] of pares) if (t.indexOf(k) >= 0) return v;
    return null;
  };
  const classe = achar<ClasseId>([
    ["guerreir", "guerreiro"], ["cavaleir", "guerreiro"], ["barbar", "barbaro"], ["paladin", "paladino"],
    ["patrulheir", "patrulheiro"], ["arqueir", "patrulheiro"], ["cacador", "patrulheiro"], ["ladin", "ladino"],
    ["ladra", "ladino"], ["ladrao", "ladino"], ["assassin", "ladino"], ["monge", "monge"], ["mago", "mago"],
    ["maga", "mago"], ["feiticeir", "feiticeiro"], ["bruxa", "bruxo"], ["bruxo", "bruxo"], ["clerig", "clerigo"],
    ["sacerdot", "clerigo"], ["druid", "druida"], ["bard", "bardo"], ["musico", "bardo"],
  ]);
  const especie = achar<EspecieId>([
    ["humano", "humano"], ["humana", "humano"], ["elfa", "elfo"], ["elfo", "elfo"], ["ana ", "anao"], ["anao", "anao"],
    ["halfling", "halfling"], ["hobbit", "halfling"], ["gnom", "gnomo"], ["orc", "orc"], ["tiefling", "tiefling"],
    ["demon", "tiefling"], ["draconat", "draconato"], ["dragao", "draconato"], ["golias", "golias"], ["gigante", "golias"],
  ]);
  const cor = achar<string>(
    CORES_ROUPA.map(([nome, hex]) => [sem(nome), hex] as [string, string]).concat([
      ["vermelh", "#9e1f33"], ["azul", "#2b4c9e"], ["verde", "#2f5f37"], ["roxo", "#5f2b7c"], ["amarel", "#c39a2c"],
      ["preto", "#2a2a30"], ["negr", "#2a2a30"], ["branc", "#d8d4c8"], ["rosa", "#c05a8a"], ["laranja", "#c0602a"],
    ]),
  );
  const arma = achar<ArmaId>([
    ["montante", "montante"], ["espadao", "montante"], ["espada", "espadaLonga"], ["machado grande", "machadoGrande"],
    ["machado", "machado"], ["martelo", "martelo"], ["maca", "maca"], ["rapieira", "rapieira"], ["florete", "rapieira"],
    ["adaga", "adagas"], ["arco longo", "arcoLongo"], ["arco", "arcoCurto"], ["cimitarra", "cimitarra"],
    ["cajado", "cajado"], ["alaude", "alaude"],
  ]);
  const ancestral = achar<Ancestral>([
    ["dourad", "dourado"], ["ouro", "dourado"], ["prata", "prateado"], ["bronze", "bronze"], ["vermelh", "vermelho"],
    ["azul", "azul"], ["branc", "branco"], ["verde", "verde"], ["negr", "negro"], ["preto", "negro"],
  ]);
  return { classe, especie, cor, arma, ancestral };
};

// ─────────────────────────── geração ───────────────────────────
const ARMAS_CLASSE: Record<ClasseId, ArmaId[]> = {
  guerreiro: ["montante", "espadaLonga", "machado"],
  barbaro: ["machadoGrande", "montante"],
  paladino: ["espadaLonga", "martelo"],
  patrulheiro: ["arcoLongo"],
  ladino: ["rapieira", "adagas", "arcoCurto"],
  monge: ["punhos"],
  mago: ["cajado"],
  feiticeiro: ["adaga"],
  bruxo: ["adaga"],
  clerigo: ["maca"],
  druida: ["cimitarra"],
  bardo: ["alaude", "rapieira"],
};

const ehMarcial = (c: ClasseId) =>
  c === "guerreiro" || c === "barbaro" || c === "paladino" || c === "patrulheiro" || c === "ladino" || c === "monge";

const rolarAtributos = (r: Dados): ConjuntoAtributos => {
  const dados: number[][] = [];
  const totais: number[] = [];
  for (let i = 0; i < 6; i++) {
    const q = r.rolar(4, 6).dados;
    dados.push(q);
    const ord = q.slice().sort((a, b) => a - b);
    totais.push(ord[1] + ord[2] + ord[3]);
  }
  return { dados, totais };
};

const aparencia = (
  r: Dados,
  classe: ClasseId,
  especie: EspecieId,
  ancestralCor: string | null,
  corPedida: string | null,
  armaPedida: ArmaId | null,
): Aparencia => {
  const pele = especie === "draconato" ? (ancestralCor as string) : r.pick(PELES[especie]);
  const [roupa1Nome, roupa1Base] = r.pick(CORES_ROUPA);
  const roupa1 = corPedida ?? roupa1Base;
  let roupa2 = r.pick(CORES_ROUPA)[1];
  if (roupa2 === roupa1) roupa2 = "#d8ccb0";
  const fantasia = especie === "tiefling" || especie === "elfo" || especie === "gnomo" ? 0.45 : 0.15;
  const cabelo = r.float() < fantasia ? r.pick(CABELO_FANTASIA) : r.pick(CABELO_NATURAL);
  let estilo: EstiloCabelo = r.pick(ESTILOS_CABELO);
  if (especie === "draconato") estilo = "careca";
  if (estilo === "careca" && r.float() < 0.5 && especie !== "draconato") estilo = "curto";
  const barba =
    especie === "anao" ? r.float() < 0.9 : especie === "humano" || especie === "golias" || especie === "orc" ? r.float() < 0.3 : false;
  const olhos =
    especie === "tiefling" ? "#f2c43a" : especie === "draconato" ? "#f2d040" : r.pick(["#3a6ac0", "#4a8a4a", "#6a4a2a", "#7a8a9a", "#9a6a2a", "#5a3a8a"]);

  const ap: Aparencia = {
    pele,
    cabelo,
    estilo,
    barba,
    olhos,
    roupa1,
    roupa1Nome,
    roupa2,
    dourado: r.float() < 0.5,
    cabeca: "nada",
    torso: "tunica",
    tabardo: false,
    capa: false,
    capaCurta: false,
    ombreiras: false,
    pelePeles: false,
    escudo: "nenhum",
    arma: armaPedida && ARMAS_CLASSE[classe].indexOf(armaPedida) >= 0 ? armaPedida : r.pick(ARMAS_CLASSE[classe]),
    aljava: false,
    orbe: null,
    faixa: r.pick(["#c43a3a", "#3a6ac4", "#2a2a2a", "#e0c040", "#e8e0d0", "#7a4ac0"]),
    pintura: false,
    marca: r.pick(["nada", "nada", "cicatriz", "tatuagem", "sardas"] as const),
    pluma: r.pick(["#c43a3a", "#e8e0d0", "#3a6ac4", "#e0c040"]),
  };

  switch (classe) {
    case "guerreiro":
      ap.cabeca = r.pick(["elmoFechadoPluma", "elmoFechadoCruz", "elmoAberto", "elmoChifres"] as const);
      ap.torso = r.float() < 0.2 ? "placas" : "malha";
      ap.tabardo = ap.torso === "malha" || r.float() < 0.5;
      ap.ombreiras = true;
      ap.capa = r.float() < 0.6;
      ap.escudo = ap.arma === "montante" ? "nenhum" : "brasao";
      break;
    case "barbaro":
      ap.torso = r.float() < 0.5 ? "peitoNu" : "coleteCouro";
      ap.pelePeles = true;
      ap.cabeca = r.pick(["elmoChifres", "bandana", "nada"] as const);
      ap.pintura = r.float() < 0.6;
      if (ap.marca === "nada") ap.marca = "cicatriz";
      break;
    case "paladino":
      ap.torso = r.float() < 0.2 ? "placas" : "malha";
      ap.tabardo = true;
      ap.cabeca = r.pick(["elmoPluma", "nada"] as const);
      ap.capa = true;
      ap.escudo = "brasao";
      ap.dourado = true;
      break;
    case "patrulheiro":
      ap.cabeca = "capuz";
      ap.capa = true;
      ap.torso = "couro";
      ap.aljava = true;
      ap.roupa1 = corPedida ?? r.pick(["#2f5f37", "#3e5a2a", "#4a6a3a"]);
      break;
    case "ladino":
      ap.cabeca = r.pick(["capuz", "mascara", "bandana"] as const);
      ap.torso = "couroEscuro";
      ap.capaCurta = true;
      ap.aljava = ap.arma === "arcoCurto";
      ap.roupa1 = corPedida ?? r.pick(["#2a2a34", "#3a2a2a", "#2a3234", "#4b5b6c"]);
      break;
    case "monge":
      ap.torso = "gi";
      ap.estilo = r.float() < 0.5 ? "careca" : "coque";
      if (especie === "draconato") ap.estilo = "careca";
      ap.roupa1 = corPedida ?? r.pick(["#c39a2c", "#a8662a", "#d8ccb0", "#9e1f33", "#2b4c9e"]);
      break;
    case "mago":
      ap.cabeca = r.float() < 0.65 ? "chapeuPontudo" : "capuz";
      ap.torso = "manto";
      ap.faixa = ap.dourado ? "#e0c040" : ap.faixa;
      break;
    case "feiticeiro":
      ap.cabeca = r.float() < 0.5 ? "diadema" : "capuz";
      ap.torso = r.float() < 0.5 ? "manto" : "tunica";
      ap.orbe = r.pick(["#f07a1a", "#8fd6f4", "#a8e030", "#e03aa8"]);
      if (r.float() < 0.5 && especie !== "draconato") ap.marca = "escamas";
      break;
    case "bruxo":
      ap.cabeca = r.float() < 0.7 ? "capuz" : "elmoChifres";
      ap.torso = r.float() < 0.5 ? "couro" : "manto";
      ap.orbe = "#9a4ae0";
      ap.roupa1 = corPedida ?? r.pick(["#2a2a34", "#5f2b7c", "#6c2140", "#3e3e46"]);
      break;
    case "clerigo":
      ap.torso = r.float() < 0.5 ? "mantoClaro" : "malha";
      ap.tabardo = ap.torso === "malha";
      ap.cabeca = r.float() < 0.6 ? "diadema" : "nada";
      ap.escudo = "brasao";
      ap.roupa1 = corPedida ?? r.pick(["#e8e0d0", "#d8ccb0", "#c39a2c", "#2b4c9e"]);
      break;
    case "druida":
      ap.cabeca = r.pick(["coroaFolhas", "galhada", "capuz"] as const);
      ap.torso = r.float() < 0.5 ? "manto" : "tunica";
      ap.pelePeles = ap.torso === "tunica";
      ap.escudo = "madeira";
      ap.roupa1 = corPedida ?? r.pick(["#2f5f37", "#3e5a2a", "#6a4a32", "#1f5e66"]);
      break;
    case "bardo":
      ap.cabeca = "boina";
      ap.torso = "tunica";
      ap.capa = true;
      break;
  }
  if (ap.cabeca === "elmoFechadoPluma" || ap.cabeca === "elmoFechadoCruz") ap.barba = false;
  return ap;
};

export type Contexto = { semente: number; usadosNomes: Set<string> };

export const criarLutador = (
  r: Dados,
  id: number,
  classe: ClasseId,
  especieSorteada: EspecieId,
  entrada: EntradaLutador,
  nome: string,
): Lutador => {
  const pedido = interpretar(entrada.descricao ?? "");
  const especie = pedido.especie ?? especieSorteada;
  let ancestral: Ancestral | null = null;
  let sopro: TipoDano | null = null;
  let ancestralCor: string | null = null;
  if (especie === "draconato") {
    const a = pedido.ancestral ? ANCESTRAIS.filter((x) => x[0] === pedido.ancestral)[0] : r.pick(ANCESTRAIS);
    ancestral = a[0];
    sopro = a[1];
    ancestralCor = a[2];
  }

  // atributos: 4d6 descartando o menor; rola de novo se a soma dos modificadores for ≤ 0
  const tentativas: ConjuntoAtributos[] = [];
  let conjunto: ConjuntoAtributos;
  for (;;) {
    conjunto = rolarAtributos(r);
    tentativas.push(conjunto);
    let soma = 0;
    for (const t of conjunto.totais) soma += mod(t);
    if (soma > 0) break;
  }
  const info = CLASSE[classe];
  const ordenados = conjunto.totais.slice().sort((a, b) => b - a);
  const atrib = {} as Record<Atributo, number>;
  info.prioridade.forEach((a, i) => (atrib[a] = ordenados[i]));
  const antecedente: [Atributo, Atributo] = [info.prioridade[0], info.prioridade[1]];
  atrib[antecedente[0]] = Math.min(20, atrib[antecedente[0]] + 2);
  atrib[antecedente[1]] = Math.min(20, atrib[antecedente[1]] + 1);

  const ap = aparencia(r, classe, especie, ancestralCor, pedido.cor, pedido.arma);
  const arma = ARMAS[ap.arma];
  const dDES = mod(atrib.DES);
  const dCON = mod(atrib.CON);

  // estilo de luta (guerreiro no nível 1)
  let estilo: Lutador["estilo"] = "";
  if (classe === "guerreiro") estilo = arma.duasMaos ? "Armas Grandes" : r.float() < 0.5 ? "Defesa" : "Duelo";

  // classe de armadura
  let ca = 10 + dDES;
  let caTexto = `10 + DES ${dDES}`;
  let armadura = "sem armadura";
  let armaduraArcana = false;
  const t = ap.torso;
  if (classe === "barbaro") {
    ca = 10 + dDES + dCON;
    caTexto = `Defesa sem Armadura: 10 + DES ${dDES} + CON ${dCON}`;
    armadura = "defesa sem armadura";
  } else if (classe === "monge") {
    const s = mod(atrib.SAB);
    ca = 10 + dDES + s;
    caTexto = `Defesa sem Armadura: 10 + DES ${dDES} + SAB ${s}`;
    armadura = "defesa sem armadura";
  } else if (t === "placas") {
    ca = 18;
    caTexto = "placas 18";
    armadura = "placas";
  } else if (t === "malha" && (classe === "guerreiro" || classe === "paladino")) {
    ca = 16;
    caTexto = "cota de malha 16";
    armadura = "cota de malha";
  } else if (classe === "clerigo") {
    const b = Math.min(2, dDES);
    ca = 14 + b;
    caTexto = `brunea 14 + DES ${b}`;
    armadura = "brunea";
  } else if (classe === "patrulheiro") {
    ca = 12 + dDES;
    caTexto = `couro batido 12 + DES ${dDES}`;
    armadura = "couro batido";
  } else if (classe === "ladino" || classe === "bruxo" || classe === "bardo" || classe === "druida") {
    ca = 11 + dDES;
    caTexto = `couro 11 + DES ${dDES}`;
    armadura = "couro";
  } else if (classe === "mago") {
    ca = 13 + dDES;
    caTexto = `Armadura Arcana 13 + DES ${dDES}`;
    armadura = "armadura arcana";
    armaduraArcana = true;
  }
  if (ap.escudo !== "nenhum") {
    ca += 2;
    caTexto += " + escudo 2";
  }
  if (estilo === "Defesa") {
    ca += 1;
    caTexto += " + Defesa 1";
  }

  const extraAnao = especie === "anao" ? 1 : 0;
  const pvMax = Math.max(1, info.dadoVida + dCON + extraAnao);
  const pvTexto = `d${info.dadoVida} máx ${info.dadoVida} + CON ${dCON}${extraAnao ? " + Robustez Anã 1" : ""} = ${pvMax}`;

  const esp = ESPACOS[info.conjurador][1].slice();
  if (armaduraArcana) esp[0] -= 1; // conjurada antes da luta

  const recursos: Recursos = {
    espacos: esp,
    furia: classe === "barbaro" ? 2 : 0,
    folego: classe === "guerreiro" ? 2 : 0,
    curaMaos: classe === "paladino" ? 5 : 0,
    marcaGratis: classe === "patrulheiro" ? 2 : 0,
    inata: classe === "feiticeiro" ? 2 : 0,
    sopro: especie === "draconato" ? 2 : 0,
    implacavel: especie === "orc" ? 1 : 0,
    surto: especie === "orc" ? 2 : 0,
    heroica: especie === "humano" ? 1 : 0,
    pedra: especie === "golias" ? 2 : 0,
    surtoAcao: 0,
    centelha: 0,
    foco: 0,
  };

  return {
    id,
    nome,
    autor: entrada.autor ?? "",
    descricao: entrada.descricao ?? "",
    especie,
    ancestral,
    sopro,
    classe,
    nivel: 1,
    campeaoAnterior: false,
    tentativas,
    atrib,
    antecedente,
    pvMax,
    pvTexto,
    ca,
    caTexto,
    desloc: ESPECIE[especie].desloc,
    arma,
    armadura,
    estilo,
    armaduraArcana,
    recursos,
    poderesExtras: [],
    aparencia: ap,
    historicoPV: [pvTexto],
  };
};

/** recursos cheios para o nível atual (campeão que volta descansou) */
export const recursosDoNivel = (l: Lutador): Recursos => {
  const n = l.nivel;
  const info = CLASSE[l.classe];
  const esp = ESPACOS[info.conjurador][Math.min(5, n)].slice();
  if (l.armaduraArcana) esp[0] = Math.max(0, esp[0] - 1);
  const pb = n >= 5 ? 3 : 2;
  return {
    espacos: esp,
    furia: l.classe === "barbaro" ? (n >= 3 ? 3 : 2) : 0,
    folego: l.classe === "guerreiro" ? (n >= 4 ? 3 : 2) : 0,
    curaMaos: l.classe === "paladino" ? 5 * n : 0,
    marcaGratis: l.classe === "patrulheiro" ? 2 : 0,
    inata: l.classe === "feiticeiro" ? 2 : 0,
    sopro: l.especie === "draconato" ? pb : 0,
    implacavel: l.especie === "orc" ? 1 : 0,
    surto: l.especie === "orc" ? pb : 0,
    heroica: l.especie === "humano" ? 1 : 0,
    pedra: l.especie === "golias" ? pb : 0,
    surtoAcao: l.classe === "guerreiro" && n >= 2 ? 1 : 0,
    centelha: l.classe === "clerigo" && n >= 2 ? 1 : 0,
    foco: l.classe === "monge" && n >= 2 ? n : 0,
  };
};

/** sorteia os 16 do episódio (ou usa os comentários / o campeão anterior) */
export const sortearElenco = (
  seed: number,
  entradas: EntradaLutador[],
  campeao: FichaSalva | null,
): { lutadores: Lutador[]; dados: Dados } => {
  const r = new Dados(seed);
  const total = 16;

  // classes: as 12 + 4 repetidas (no máximo 2 de cada)
  const extras = r.embaralhar(CLASSES.slice()).slice(0, 4);
  let classes = r.embaralhar(CLASSES.concat(extras));
  // espécies: variadas, no máximo 3 iguais
  const contagem: Record<string, number> = {};
  const especies: EspecieId[] = [];
  while (especies.length < total) {
    const e = r.pick(ESPECIES);
    if ((contagem[e] ?? 0) >= 3) continue;
    contagem[e] = (contagem[e] ?? 0) + 1;
    especies.push(e);
  }

  const usados = new Set<string>();
  const lutadores: Lutador[] = [];
  let inicio = 0;
  if (campeao) {
    const c: Lutador = JSON.parse(JSON.stringify(campeao));
    c.id = 0;
    c.campeaoAnterior = true;
    c.recursos = recursosDoNivel(c);
    lutadores.push(c);
    usados.add(c.nome);
    inicio = 1;
    // tira uma ocorrência da classe do campeão da lista
    const i = classes.indexOf(c.classe);
    if (i >= 0) classes = classes.slice(0, i).concat(classes.slice(i + 1));
  }

  for (let i = inicio; i < total; i++) {
    const entrada = entradas[i - inicio] ?? {};
    const pedido = interpretar(entrada.descricao ?? "");
    let classe = classes[i - inicio];
    if (pedido.classe) classe = pedido.classe;
    let nome = (entrada.nome ?? "").trim();
    if (!nome) {
      do nome = r.pick(NOMES);
      while (usados.has(nome));
    }
    usados.add(nome);
    lutadores.push(criarLutador(r, i, classe, especies[i], entrada, nome));
  }
  return { lutadores, dados: r };
};

export const ehClasseMarcial = ehMarcial;
export const tabelaArmas = ARMAS;
export const semente = (texto: string) => hash(texto);
export { ATRIBUTOS };
