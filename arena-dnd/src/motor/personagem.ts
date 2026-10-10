// Gera a ficha completa de um personagem nível 5 rolando dados (SRD 5.2).
import { ATRIBUTOS, Atributo, ARMAS, Arma, CLASSES, ClasseId, DRAGOES, ESPECIES, EspecieId, NIVEL, PROFICIENCIA } from "./srd";
import { criarRng, d, escolher, hash, mod, Rng } from "./dados";
import { EstiloCabelo, lerDescricao } from "./descricao";

export type Entrada = {
  nome: string;
  descricao?: string;
  autor?: string; // @ de quem comentou (vai para os créditos e para a ficha)
  classe?: ClasseId; // opcional: força a classe (senão vem da descrição ou é sorteada)
  especie?: EspecieId;
};

export type Aparencia = {
  pele: string;
  cabelo: string;
  olhos: string;
  roupa: string;
  detalhe: string;
  estiloCabelo: EstiloCabelo;
  barba: boolean;
  metal?: string; // cor da armadura de metal (se citada)
};

export type RolagemAtributo = { dados: number[]; descartado: number; soma: number };

export type Ficha = {
  id: number;
  nome: string;
  autor?: string;
  descricao?: string;
  classe: ClasseId;
  especie: EspecieId;
  dragao?: (typeof DRAGOES)[number];
  rolagens: RolagemAtributo[]; // 6 × 4d6 (descarta o menor), na ordem em que saíram
  rerrolou: number; // quantas vezes o conjunto foi rolado de novo (regra da mesa)
  atributos: Record<Atributo, number>;
  bonusAntecedente: Partial<Record<Atributo, number>>;
  pvRolagens: number[]; // d(dado de vida) dos níveis 2–5
  pv: number;
  ca: number;
  arma: Arma;
  armaId: string;
  escudo: boolean;
  deslocamento: number;
  cd?: number; // CD de magia
  ataqueMagia?: number;
  espacos: [number, number, number];
  aparencia: Aparencia;
};

const PELES: Record<EspecieId, string[]> = {
  humano: ["#f2c9a0", "#e3ae84", "#c98d62", "#a06a45", "#74492f", "#f6d9bd"],
  elfo: ["#f3d2b3", "#e8bf98", "#c99572", "#8d6a5a", "#b9c6d6"],
  anao: ["#e8b18a", "#d29a72", "#b57b55", "#8a5a3c"],
  halfling: ["#f2c9a0", "#e0a87c", "#c68a5e", "#9c6644"],
  gnomo: ["#f0c39d", "#d9a27a", "#b8825c"],
  orc: ["#7f9e5c", "#6d8f5e", "#8aa871", "#6a8278", "#94a07a"],
  tiefling: ["#c0504d", "#9b4a8a", "#7d5aa6", "#b5525f", "#cf7a64"],
  draconato: ["#000"], // vem da ancestralidade
  golias: ["#b0aaa0", "#97a3a8", "#bdb19c", "#8f8a86"],
};
const CABELOS_NATURAIS = ["#2b2220", "#4a3121", "#6b4a2f", "#9a5b2e", "#c0532a", "#e2c46a", "#f0e2b0", "#d8d8d8", "#8c8c8c"];
const CABELOS_FANTASIA = ["#c9d4e3", "#7d5aa6", "#3a62b0", "#2fa8a0", "#e07aa5", "#1d1a2b"];
const ROUPAS = ["#9c2b2f", "#2f4f9c", "#2f7a46", "#6a3d9a", "#1f7f7a", "#b8892e", "#6e1f33", "#4a5566", "#7a4a2a", "#c25b2a", "#2c2f3d"];
const DETALHES = ["#d4a437", "#c9ced6", "#e6e2d8", "#b33a32", "#3a62b0", "#3f8a45", "#2a2833"];
const OLHOS = ["#3a62b0", "#3f8a45", "#6b4a2f", "#2a2833", "#8a6a2a", "#7d5aa6"];

// cores típicas por classe (tendência, não regra)
const ROUPA_CLASSE: Partial<Record<ClasseId, string[]>> = {
  clerigo: ["#e6e2d8", "#d8cfb8", "#2f4f9c"],
  druida: ["#2f7a46", "#6b7a3a", "#7a4a2a"],
  bruxo: ["#6a3d9a", "#2c2f3d", "#6e1f33"],
  mago: ["#2f4f9c", "#6a3d9a", "#9c2b2f", "#1f7f7a"],
  ladino: ["#2c2f3d", "#4a5566", "#6e1f33"],
  patrulheiro: ["#2f7a46", "#6b7a3a", "#7a4a2a"],
  monge: ["#c25b2a", "#b8892e", "#e6e2d8"],
  paladino: ["#2f4f9c", "#e6e2d8", "#9c2b2f"],
};

const CLASSE_IDS = Object.keys(CLASSES) as ClasseId[];
const ESPECIE_IDS = Object.keys(ESPECIES) as EspecieId[];

// 4d6, descarta o menor (método de rolagem do SRD).
const rolarAtributo = (rng: Rng): RolagemAtributo => {
  const dados = [d(rng, 6), d(rng, 6), d(rng, 6), d(rng, 6)];
  const ordenados = [...dados].sort((a, b) => a - b);
  return { dados, descartado: ordenados[0], soma: ordenados[1] + ordenados[2] + ordenados[3] };
};

export const criarFicha = (entrada: Entrada, id: number, sementeBatalha: number): Ficha => {
  // semente própria por personagem: mesmo nome na mesma batalha = mesmas rolagens
  const rng = criarRng(hash(`${sementeBatalha}:${id}:${entrada.nome}`));
  const pistas = lerDescricao(entrada.descricao ?? "");
  const classeId = entrada.classe ?? pistas.classe ?? escolher(rng, CLASSE_IDS);
  const especieId = entrada.especie ?? pistas.especie ?? escolher(rng, ESPECIE_IDS);
  const classe = CLASSES[classeId];
  const especie = ESPECIES[especieId];

  // 1) atributos: 6 × 4d6 descartando o menor. Regra da mesa (comum e citada na ficha):
  //    se a soma dos modificadores ficar ≤ 0, rola o conjunto inteiro de novo.
  let rolagens: RolagemAtributo[] = [];
  let rerrolou = -1;
  do {
    rolagens = Array.from({ length: 6 }, () => rolarAtributo(rng));
    rerrolou++;
  } while (rolagens.reduce((s, r) => s + mod(r.soma), 0) <= 0 && rerrolou < 5);

  // 2) distribui: maior valor no atributo principal da classe (como um jogador faria)
  const valores = rolagens.map((r) => r.soma).sort((a, b) => b - a);
  const atributos = {} as Record<Atributo, number>;
  classe.prioridade.forEach((a, i) => (atributos[a] = valores[i]));
  // 3) antecedente (SRD 5.2): +2 em um atributo e +1 em outro, máximo 20
  const bonusAntecedente: Partial<Record<Atributo, number>> = {};
  const [p1, p2] = classe.prioridade;
  bonusAntecedente[p1] = Math.min(2, 20 - atributos[p1]);
  bonusAntecedente[p2] = Math.min(1, 20 - atributos[p2]);
  for (const a of ATRIBUTOS) atributos[a] += bonusAntecedente[a] ?? 0;

  const m = (a: Atributo) => mod(atributos[a]);

  // 4) pontos de vida: máximo do dado no 1º nível, rola o dado nos níveis 2–5, + CON por nível
  const pvRolagens = Array.from({ length: NIVEL - 1 }, () => d(rng, classe.dadoVida));
  let pv = classe.dadoVida + pvRolagens.reduce((a, b) => a + b, 0) + m("CON") * NIVEL;
  if (especieId === "anao") pv += NIVEL; // Robustez Anã
  if (especieId === "humano") pv += 2 * NIVEL; // talento Vigoroso (origem versátil)
  pv = Math.max(pv, NIVEL * 2);

  // 5) arma e escudo
  // arma citada na descrição ("com machado", "arqueiro") tem preferência, se a classe usa
  const sorteada = escolher(rng, classe.armas);
  const desc = (entrada.descricao ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const PISTA_ARMA: [RegExp, string][] = [
    [/machad|axe/, "machad"], [/arco|bow|flecha/, "arco"], [/montante|espadao|greatsword/, "espadagrande"],
    [/rapieira|florete/, "rapieira"], [/adaga|punhal/, "espadacurta"], [/espada|sword/, "espada"],
  ];
  const pista = PISTA_ARMA.find(([re]) => re.test(desc))?.[1];
  const escolhaArma = (pista && classe.armas.find((a) => a.toLowerCase().includes(pista))) || sorteada;
  const [armaId, comEscudo] = escolhaArma.split("+");
  const arma = ARMAS[armaId];
  const escudo = Boolean(classe.escudo || comEscudo);

  // 6) classe de armadura
  const a = classe.armadura;
  let ca = a.base + Math.min(m("DES"), a.maxDes ?? 99);
  if (a.somaCon) ca += m("CON");
  if (a.somaSab) ca += m("SAB");
  if (escudo) ca += 2;

  const conj = classe.conjuracao;
  // draconato: "vermelho", "azul", "dourado"… na descrição escolhe a ancestralidade
  const COR_DRAGAO: Record<string, string> = { vermelh: "Vermelho", azul: "Azul", branc: "Branco", verde: "Verde", negr: "Negro", pret: "Negro", dourad: "Dourado", ouro: "Dourado", prat: "Prateado", bronze: "Bronze" };
  const dragaoCitado = pistas.coresSoltas
    .map((c) => Object.entries(COR_DRAGAO).find(([k]) => c.startsWith(k))?.[1])
    .find(Boolean);
  const sorteioDragao = escolher(rng, DRAGOES);
  const dragao = especieId === "draconato" ? DRAGOES.find((g) => g.nome === dragaoCitado) ?? sorteioDragao : undefined;

  // 7) aparência: descrição primeiro, sorteio no resto
  const pele = pistas.cores.pele ?? (dragao ? dragao.cor : escolher(rng, PELES[especieId]));
  const fantasia = especieId === "elfo" || especieId === "tiefling" || especieId === "gnomo";
  const cabelo = pistas.cores.cabelo ?? escolher(rng, fantasia && rng() < 0.4 ? CABELOS_FANTASIA : CABELOS_NATURAIS);
  const roupa = pistas.cores.roupa ?? escolher(rng, rng() < 0.6 && ROUPA_CLASSE[classeId] ? ROUPA_CLASSE[classeId]! : ROUPAS);
  let detalhe = pistas.cores.detalhe ?? escolher(rng, DETALHES);
  if (detalhe === roupa) detalhe = "#d4a437";
  const estilos: EstiloCabelo[] = ["curto", "longo", "rabo", "coque", "trancas", "moicano", "careca"];
  const estiloCabelo =
    pistas.cabelo ?? (especieId === "draconato" ? "careca" : escolher(rng, classeId === "monge" ? ["careca", "coque", "curto"] : estilos.slice(0, 6)));
  const barba = pistas.barba ?? (especieId === "anao" ? true : especieId === "draconato" || especieId === "elfo" ? false : rng() < 0.25);

  return {
    id,
    nome: entrada.nome,
    autor: entrada.autor,
    descricao: entrada.descricao,
    classe: classeId,
    especie: especieId,
    dragao,
    rolagens,
    rerrolou,
    atributos,
    bonusAntecedente,
    pvRolagens,
    pv,
    ca,
    arma,
    armaId,
    escudo,
    deslocamento: classeId === "barbaro" || classeId === "monge" ? especie.deslocamento + 10 : especie.deslocamento,
    cd: conj ? 8 + PROFICIENCIA + m(conj.atributo) : undefined,
    ataqueMagia: conj ? PROFICIENCIA + m(conj.atributo) : undefined,
    espacos: conj ? [...conj.espacos] : [0, 0, 0],
    aparencia: { pele, cabelo, olhos: pistas.cores.olhos ?? escolher(rng, OLHOS), roupa, detalhe, estiloCabelo, barba, metal: pistas.cores.metal },
  };
};

// Nomes para personagens aleatórios (enquanto não há comentários suficientes)
export const NOMES = [
  "Thorin", "Lyra", "Kael", "Mirela", "Bruk", "Seraphine", "Doran", "Vex", "Elowen", "Garruk",
  "Isolde", "Tamsin", "Orrin", "Zara", "Fenwick", "Nyx", "Bramm", "Celeste", "Darius", "Ingrid",
  "Rook", "Sable", "Tobias", "Yara", "Grom", "Liora", "Marek", "Quill", "Rhea", "Ulric",
  "Vesper", "Wren", "Azura", "Borin", "Cassia", "Drake", "Eira", "Faelan", "Gwyn", "Hask",
];

