// Sprites pixel art em vista 3/4 (virados para a direita), no estilo de packs de RPG
// como os da Zerie: cabeça grande, corpo curto, contorno escuro forte, sombreamento
// marcado e armas grandes. Tudo é desenhado por código a partir de PEÇAS:
//   cabeça · cabelo · barba · traços da espécie · chapéu/elmo/capuz · tronco · braços
//   · ombreiras · capa · aljava · pernas/botas · escudo · arma
// A ficha de cada personagem SORTEIA as peças e as cores (com semente, então o mesmo
// personagem sai sempre igual) — a descrição do comentário tem prioridade.
//
// As peças são desenhadas só com a LETRA DO MATERIAL; o sombreamento é automático:
// luz vindo de cima/frente (direita), sombra nas costas (esquerda) e embaixo, brilho
// vertical no metal, malha em xadrez, linha escura onde uma peça encosta na outra.

import type { Ficha } from "../motor/personagem";
import { criarRng, escolher, hash } from "../motor/dados";
import { misturar, tom } from "./cor";

export const LARG = 40;
export const ALT = 40;
export const CHAO = 36; // linha do chão (primeira abaixo das botas)
export const CENTRO_X = 19;

export type Grade = (string | null)[][];
export type Pose = "parado" | "passoA" | "passoB" | "golpe" | "magia" | "dano";

// ---------- materiais ----------
// Letras sombreadas automaticamente:
//   S pele · H cabelo · C roupa · P calça · A capa/capuz/chapéu · R detalhe · M metal
//   N malha (cota) · L couro · B bota · G ouro · W madeira · F pelo · O chifre/osso · V folha
// Letras de detalhe (cor fixa): e olho · Y olho brilhante · w branco · o boca · x linha escura
const SOMBREADAS = "SHCPARMNLBGWFOV";

type Parte = { x: number; y: number; px: string[] };
const P = (x: number, y: number, ...px: string[]): Parte => ({ x, y, px });

// ---------------- CABEÇA (vira para a direita) ----------------
const CABECA = P(12, 7,
  "....SSSSSS....",
  "..SSSSSSSSSS..",
  ".SSSSSSSSSSSS.",
  ".SSSSSSSSSSSSS",
  "SSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSS",
  "SSSSSSSSeSSSeS",
  "SSSSSSSSeSSSeS",
  "SSSSSSSSSSSSSS",
  ".SSSSSSSSSSSo.",
  ".SSSSSSSSSSSS.",
  "..SSSSSSSSSS..",
  "....SSSSSS....",
);
const ORELHA = P(17, 13, "SS", "S.");
const ORELHA_ELFO = P(6, 10, "SS.......", ".SSS.....", "..SSSSS..", "....SSSS.");
const ORELHA_GNOMO = P(15, 12, ".SS", "SSS", "SSS", ".S.");
const PRESAS = P(22, 16, "w.w", "w.w");
const MARCAS_GOLIAS = P(18, 10, "x.....", ".x....", "......", "x...x.");
const CHIFRES_TIEFLING = P(12, 3, "O........O", "OO......OO", ".OO....OO.", "..OO..OO..");

const CABECA_DRAGAO = P(11, 4,
  "OO................",
  ".OOO..............",
  "..OOOSSSSS........",
  "...OSSSSSSSSS.....",
  "...SSSSSSSSSSSS...",
  "..SSSSSSSSSSSSSS..",
  ".SSSSSSSSSxxSSSSS.",
  ".SSSSSSSSSYeSSSSSS",
  "SSSSSSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSSSxSS",
  ".SSSSSSSSwSwSwSwS.",
  ".SSSSSSSSxxxxxxx..",
  "..SSSSSSSwSwSwSw..",
  "...SSSSSSSSSSS....",
  ".....SSSSSSS......",
);
const CRISTA_DRAGAO = P(9, 9, "RR..", "RRR.", ".RR.", ".RRR", "..RR");

// ---------------- CABELOS ----------------
const CABELO_CURTO = P(11, 5,
  "....HHHHHHH.....",
  "..HHHHHHHHHHH...",
  ".HHHHHHHHHHHHHH.",
  ".HHHHHHHHHHHHHHH",
  "HHHHHHHHHHHHHHHH",
  "HHHHHHHHHHHHHHHH",
  "HHHHHHHHH.HH.H.H",
  "HHHHHHH.........",
  "HHHHHH..........",
  "HHHHH...........",
  ".HHHH...........",
  "..HH............",
);
// [peças da frente, peças de trás]
const CABELOS: Record<string, [Parte[], Parte[]]> = {
  curto: [[CABELO_CURTO], []],
  longo: [[CABELO_CURTO], [P(10, 12, "HHHHHHH", "HHHHHH.", "HHHHH..", "HHHHH..", "HHHH...", "HHHH...", "HHH....", "HHH....", "HH.....", ".H.....")]],
  rabo: [[CABELO_CURTO], [P(6, 9, "...HH", "..HHH", ".HHHR", "HHHH.", "HHH..", "HHH..", "HH...", "HH...", ".H...")]],
  coque: [[CABELO_CURTO, P(11, 2, "..HHHH.", ".HHHHHH", ".HHHHHH", "..HHHH.")], []],
  trancas: [[CABELO_CURTO], [P(10, 12, "HHH....", "RHH....", "HHH....", "HH.....", "RH.....", "HH.....", "HH.....", "R......")]],
  moicano: [[P(13, 2, "...HHH....", "..HHHHH...", ".HHHHHHH..", "HHHHHHHHH.", "HHHHHHHH..")], []],
  espetado: [[CABELO_CURTO, P(11, 1, "...H....H....H..", "..HH...HH...HH..", ".HHH..HHHH.HHH..", "HHHHHHHHHHHHHH..")], []],
  careca: [[], []],
};
const BARBA = P(16, 15,
  "HH.......H",
  "HHH....HHH",
  "HHHHHooHHH",
  ".HHHHHHHHH",
  "..HHHHHHH.",
  "...HHHHH..",
  "....HHH...",
);
const BIGODE = P(21, 15, "HHHHH", "H...H");

// ---------------- CHAPÉUS / ELMOS ----------------
const CHAPEUS: Record<string, Parte[]> = {
  elmoFechado: [P(11, 5,
    "....MMMMMMM.....",
    "..MMMMMMMMMMM...",
    ".MMMMMMMMMMMMMM.",
    ".MMMMMMMMMMMMMMM",
    "MMMMMMMMMMMMMMMM",
    "MMMMMMMMMMMMMMMM",
    "MMMMMMMMMMMMMMMM",
    "MMMMMMMMMxxxxxxx",
    "MMMMMMMMMMMMMMMM",
    "MMMMMMMMMMMMxMxM",
    "MMMMMMMMMMMMMMMM",
    ".MMMMMMMMMMMMMM.",
    "..MMMMMMMMMMMM..",
  )],
  pluma: [P(7, 0,
    ".....RRRRR..",
    "...RRRRRRRR.",
    "..RRRRRRRRR.",
    ".RRRRRR.....",
    "RRRRR.......",
    "RRRR........",
    "RRR.........",
    "RR..........",
  )],
  cruz: [P(23, 8, ".G.", "GGG", ".G.", ".G.")],
  elmoAberto: [P(11, 4,
    ".....MMMMMM.....",
    "...MMMMMMMMMM...",
    "..MMMMMMMMMMMM..",
    ".MMMMMMMMMMMMMM.",
    ".MMMMMMMMMMMMMMM",
    "RRRRRRRRRRRRRRRR",
    "MMMMMMM....M....",
    "MMMMMM.....M....",
    "MMMMM...........",
    "MMMM............",
    ".MMM............",
  )],
  chifres: [P(6, 0,
    "OO..................",
    "OOO...............OO",
    ".OOO.............OOO",
    "..OOOO.........OOOO.",
    "...OOOOO.....OOOOO..",
    ".....OOO.....OOO....",
  )],
  capuz: [P(10, 5,
    ".....AAAAAAA.....",
    "...AAAAAAAAAAA...",
    "..AAAAAAAAAAAAAA.",
    ".AAAAAAAAAAAAAAAA",
    ".AAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAA.",
    "AAAAAAAA.......A.",
    "AAAAAAA..........",
    "AAAAAAA..........",
    "AAAAAAA..........",
    "AAAAAAA..........",
    "AAAAAAAA.........",
    "AAAAAAAAA........",
    "AAAAAAAAAA.......",
    ".AAAAAAAAAAA.....",
    "..AAAAAAAAAAAAA..",
  )],
  chapeuMago: [P(8, 0,
    "AAA.................",
    ".AAAA...............",
    "..AAAAA.............",
    "...AAAAAA...........",
    "....AAAAAAAA........",
    ".....AAAAAAAAA......",
    ".....GGGGGGGGGG.....",
    "..AAAAAAAAAAAAAAAA..",
    "AAAAAAAAAAAAAAAAAAAA",
    "..AAAAAAAAAAAAAAAA..",
  )],
  boinaBardo: [P(10, 2,
    "ww...............",
    ".www.............",
    "..wwAAAAAAA......",
    ".AAAAAAAAAAAA....",
    "AAAAAAAAAAAAAAA..",
    "AAAAAAAAAAAAAAAA.",
    ".RRRRRRRRRRRRRR..",
  )],
  coroaFolhas: [P(11, 5, ".V.V..V..V.V....", "VVVVVVVVVVVVVV..", "WWWWWWWWWWWWWW..")],
  galhada: [P(9, 0, "W.W.........W.W.", ".WW..........WW.", "..W.........W...", "..WW.......WW...", "...W.......W....")],
  diadema: [P(12, 10, "GGGGGGGGGGGGGG", "...........YG.")],
  bandana: [P(11, 8, "AAAAAAAAAAAAAAAA", "AAAAAAAAAAAAAAAA"), P(7, 9, ".AAA", "AAA.", "AA..", "A...")],
  mascara: [P(19, 15, "AAAAAAA", "AAAAAAA", ".AAAAAA", "..AAAA.")],
};

// ---------------- CORPO ----------------
// tronco: T = material do tronco (trocado pela roupa), K = cinto
const TRONCO = P(14, 19,
  "....SSS....",
  "..TTTTTTT..",
  ".TTTTTTTTT.",
  "TTTTTTTTTTT",
  "TTTTTTTTTTT",
  "TTTTTTTTTTT",
  "TTTTTTTTTTT",
  ".TTTTTTTTT.",
  ".KKKKKKKKG.",
  ".TTTTTTTTT.",
);
const BRACO_TRAS = P(12, 21, ".TT", "TTT", "TTT", "TTT", "TTT", "TTT", "SSS", ".SS");
const BRACO_FRENTE = P(22, 21, "TTT...", "TTTT..", "TTTT..", ".TTT..", ".TTTTS", "..TTSS", "....SS");
export const MAO: [number, number] = [27, 26]; // onde a arma é segura

const PERNA_TRAS = P(15, 28, "PPP", "PPP", "PPP", "PPP", "BBB", "BBB", "BBBB", "BBBB");
const PERNA_FRENTE = P(20, 28, "PPP.", "PPP.", "PPP.", "PPP.", "BBB.", "BBB.", "BBBB", "BBBBB");
const SAIA = P(13, 27,
  ".RRRRRRRRR...",
  ".CCCCCCCCC...",
  "CCCCCCCCCCC..",
  "CCCCCCCCCCC..",
  "CCCCCCCCCCCC.",
  "CCCCCCCCCCCC.",
  "CCCCCCCCCCCCC",
  "CCCCCCCCCCCCC",
  ".BB.....BBBB.",
);
const TABARDO = P(16, 22, "CCCCCCC", "CCCRCCC", "CCRRRCC", "CCCRCCC", "CCCCCCC", ".......", ".CCCCC.", ".CCCCC.", "..CCC..");
const DECOTE_MONGE = P(17, 20, "SSSSS", ".SSS.", "..S..");
const FAIXA_MONGE = P(14, 27, ".RRRRRRRRR.", ".......RR..", "........R..");
const CORREIA = P(15, 21, "L.........", ".L........", "..L.......", "...L......", "....L.....", ".....L....", "......L...");
const OMBREIRA_TRAS = P(11, 20, ".MMMM", "MMMMM", "MMMM.");
const OMBREIRA_FRENTE = P(20, 20, ".MMMMM", "MMMMMM", "MMMMM.");
const PELE_OMBROS = P(12, 19, "..FFFFFFFFFF...", ".FFFFFFFFFFFFF.", "FFFF.FFFF.FFFF.");
const FAIXA_MANTO = P(19, 20, "R", "R", "R", "R", "R", "R", "R");
const CAPA = P(8, 20,
  "..AAAAA",
  ".AAAAAA",
  ".AAAAAA",
  "AAAAAAA",
  "AAAAAAA",
  "AAAAAA.",
  "AAAAAA.",
  "AAAAA..",
  "AAAAA..",
  "AAAA...",
  "AAAA...",
  "AAA....",
  "AAA....",
  ".AA....",
);
const ALJAVA = P(9, 15, "w.w.", "WwWw", ".LLL", ".LLL", ".LLL", ".LLL", ".LLL", "..LL", "..LL");
const CAUDA = P(6, 26, "OO.....", ".O.....", ".OO....", "..OOOO.", "....OOO");
const ESCUDO = P(8, 21,
  ".MMMMMM.",
  "MAAAAAAM",
  "MAAGGAAM",
  "MAGGGGAM",
  "MAAGGAAM",
  "MAAGGAAM",
  ".MAAAAM.",
  "..MAAM..",
  "...MM...",
);

// ---------------- ARMAS (apontando para cima; pega = ponto da mão) ----------------
export const ARMAS_PX: Record<string, { px: string[]; pega: [number, number] }> = {
  espada: { pega: [3, 17], px: ["...w...", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..MMM..", "GGGGGGG", ".GGGGG.", "...L...", "...L...", "...L...", "..GGG.."] },
  espadona: { pega: [4, 23], px: ["....w....", "...wMM...", "...wMM...", "...wMM...", "...wMMM..", "...wMMM..", "...wMMM..", "...wMMM..", "...wMMM..", "...wMMM..", "...wMMM..", "...wMMM..", "...wMMM..", "...wMMM..", "...wMMM..", "...wMMM..", "...MMMM..", "GGGGGGGGG", ".GG...GG.", "....L....", "....L....", "....L....", "....L....", "....L....", "...GGG..."] },
  machado: { pega: [3, 16], px: ["...WMM..", "..MMMMM.", ".MMMMMMw", ".MMMWMMw", ".MMMWMMw", "..MMWMM.", "...WMM..", "...W....", "...W....", "...W....", "...W....", "...W....", "...W....", "...W....", "...W....", "...W....", "...L....", "...G...."] },
  machadona: { pega: [5, 21], px: ["....MM.....", ".MMMWWMMM..", "MMMMWWMMMMw", "MMMMWWMMMMw", "MMMMWWMMMMw", "MMMMWWMMMMw", ".MMMWWMMM..", "....WW.....", "....WW.....", "....WW.....", "....WW.....", "....WW.....", "....WW.....", "....WW.....", "....WW.....", "....LL.....", "....WW.....", "....WW.....", "....WW.....", "....WW.....", "....LL.....", "....GG....."] },
  rapieira: { pega: [3, 17], px: ["...w...", "...w...", "...M...", "...M...", "...M...", "...M...", "...M...", "...M...", "...M...", "...M...", "...M...", "..wM...", "..GGG..", ".G.G.G.", "GGGGGGG", ".GGGGG.", "...L...", "...L...", "..GGG.."] },
  adaga: { pega: [2, 9], px: ["..w..", ".wMM.", ".wMM.", ".wMM.", ".wMM.", ".MMM.", "GGGGG", "..L..", "..L..", "..L..", ".GGG."] },
  cimitarra: { pega: [3, 14], px: [".....wM", "....wMM", "...wMM.", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..wMM..", "..MMM..", "GGGGGG.", "...L...", "...L...", "...L...", "..GGG.."] },
  arco: { pega: [3, 11], px: ["..WW...", ".WW.w..", ".W..w..", "WW..w..", "W...w..", "W...w..", "W...w..", "W...w..", "W...w..", "WL..w..", "WL..w..", "WL..w..", "W...w..", "W...w..", "W...w..", "W...w..", "W...w..", "WW..w..", ".W..w..", ".WW.w..", "..WW..."] },
  cajado: { pega: [3, 18], px: ["..YYY..", ".YYwYY.", ".YYYYY.", "..YYY..", ".G.W.G.", "..GWG..", "...W...", "...W...", "...W...", "...W...", "...W...", "...W...", "...W...", "...L...", "...L...", "...W...", "...W...", "...W...", "...W...", "...W...", "...W...", "...W...", "...W...", "...W..."] },
  maca: { pega: [3, 15], px: ["..M.M..", ".MMMMM.", "MMMMMMM", "MMMwMMM", "MMMMMMM", ".MMMMM.", "..M.M..", "...W...", "...W...", "...W...", "...W...", "...W...", "...W...", "...L...", "...L...", "...L...", "...G..."] },
  martelo: { pega: [4, 15], px: ["MMMMMMMMM", "MMMwMMMMM", "MMMwMMMMM", "MMMMMMMMM", "....W....", "....W....", "....W....", "....W....", "....W....", "....W....", "....W....", "....W....", "....W....", "....L....", "....L....", "....L....", "....G...."] },
  "lança": { pega: [2, 18], px: ["..w..", ".wMM.", ".wMM.", ".wMM.", "..M..", ".RRR.", "..W..", "..W..", "..W..", "..W..", "..W..", "..W..", "..W..", "..W..", "..W..", "..W..", "..W..", "..W..", "..L..", "..W..", "..W..", "..W..", "..W.."] },
  punhos: { pega: [1, 1], px: ["..", ".."] },
  "alaúde": { pega: [3, 12], px: ["..WW...", "..W....", "..W....", "..W....", "..W....", "..W....", "..W....", "..WW...", ".WWWW..", "WWWWWW.", "WWxxWW.", "WWxxWW.", "WWWWWW.", ".WWWW..", "..WW..."] },
  foco: { pega: [2, 2], px: [".YYY.", "YYwYY", "YYYYY", ".YYY."] },
};

// ---------------- vestimenta sorteada ----------------
export type Vestimenta = {
  chapeu: string[]; // peças de cabeça (pode ser vazio)
  tronco: "placas" | "malha" | "couro" | "tunica" | "manto" | "nu" | "gi";
  ombreiras: boolean;
  pele: boolean; // pelo nos ombros
  capa: boolean;
  calca: "calca" | "grevas" | "saia";
  cores: Record<string, string>; // base de cada material
};

type Pool = { chapeu: string[][]; tronco: Vestimenta["tronco"][]; ombreiras: number; capa: number; pele?: number };
const POOL: Record<string, Pool> = {
  guerreiro: { chapeu: [["elmoFechado"], ["elmoFechado", "pluma"], ["elmoAberto"], ["elmoAberto", "chifres"], [], ["bandana"]], tronco: ["placas", "malha", "couro"], ombreiras: 0.65, capa: 0.35 },
  paladino: { chapeu: [["elmoFechado", "pluma"], ["elmoFechado", "cruz"], ["elmoAberto"], ["diadema"], []], tronco: ["placas", "malha"], ombreiras: 0.85, capa: 0.6 },
  barbaro: { chapeu: [[], [], ["elmoAberto", "chifres"], ["bandana"]], tronco: ["nu", "nu", "couro"], ombreiras: 0.15, capa: 0.15, pele: 0.75 },
  patrulheiro: { chapeu: [["capuz"], ["capuz"], [], ["bandana"]], tronco: ["couro", "tunica"], ombreiras: 0.1, capa: 0.55 },
  ladino: { chapeu: [["capuz"], ["capuz", "mascara"], ["mascara"], ["bandana"], []], tronco: ["couro", "couro", "tunica"], ombreiras: 0.05, capa: 0.35 },
  monge: { chapeu: [[], [], ["bandana"]], tronco: ["gi"], ombreiras: 0, capa: 0 },
  mago: { chapeu: [["chapeuMago"], ["chapeuMago"], ["capuz"], []], tronco: ["manto"], ombreiras: 0, capa: 0.3 },
  feiticeiro: { chapeu: [["diadema"], [], ["capuz"], ["chapeuMago"]], tronco: ["manto", "tunica"], ombreiras: 0.1, capa: 0.5 },
  bruxo: { chapeu: [["capuz"], ["capuz"], [], ["elmoAberto", "chifres"]], tronco: ["manto", "couro"], ombreiras: 0.25, capa: 0.55 },
  clerigo: { chapeu: [[], ["diadema"], ["elmoAberto"], ["capuz"]], tronco: ["manto", "malha"], ombreiras: 0.3, capa: 0.4 },
  druida: { chapeu: [["coroaFolhas"], ["coroaFolhas", "galhada"], ["capuz"], ["galhada"]], tronco: ["manto", "tunica", "couro"], ombreiras: 0, capa: 0.4, pele: 0.4 },
  bardo: { chapeu: [["boinaBardo"], ["boinaBardo"], []], tronco: ["tunica", "couro"], ombreiras: 0, capa: 0.55 },
};

const METAIS = ["#9aa6b2", "#8a94a0", "#b4bcc4", "#6f7884", "#a08060", "#c9b27a"];
const COUROS = ["#7a4f30", "#6a4430", "#8a5a36", "#5a3a2a", "#4a3a48"];
const CALCAS = ["#4a4038", "#3e4656", "#5a4a3a", "#3a3a44", "#56503e", "#6a3a32"];
const CAPAS = ["#8c2f32", "#2f4f8c", "#2f6a46", "#5a3a7a", "#7a5a2a", "#2c2f3d", "#6e1f33", "#1f6a6a"];

export const vestimenta = (f: Ficha): Vestimenta => {
  const rng = criarRng(hash(`roupa:${f.nome}:${f.id}:${f.aparencia.roupa}:${f.aparencia.cabelo}`));
  const pool = POOL[f.classe];
  let chapeu = escolher(rng, pool.chapeu);
  // espécie que não combina com o chapéu sorteado
  if (f.especie === "draconato") chapeu = chapeu.filter((c) => !["capuz", "chapeuMago", "boinaBardo", "elmoFechado", "pluma", "cruz", "bandana"].includes(c));
  let tronco = escolher(rng, pool.tronco);
  if (f.aparencia.metal && (f.classe === "guerreiro" || f.classe === "paladino")) tronco = "placas";
  const capa = rng() < pool.capa;
  return {
    chapeu,
    tronco,
    ombreiras: rng() < pool.ombreiras,
    pele: rng() < (pool.pele ?? 0),
    capa,
    calca: tronco === "manto" ? "saia" : tronco === "placas" ? "grevas" : "calca",
    cores: {
      S: f.aparencia.pele,
      H: f.aparencia.cabelo,
      C: f.aparencia.roupa,
      R: f.aparencia.detalhe,
      A: f.aparencia.detalhe !== f.aparencia.roupa && rng() < 0.5 ? f.aparencia.detalhe : escolher(rng, CAPAS),
      P: escolher(rng, CALCAS),
      M: f.aparencia.metal ?? escolher(rng, METAIS),
      N: "#8a929c",
      L: escolher(rng, COUROS),
      B: tom(escolher(rng, COUROS), -1),
      G: "#d9a93a",
      W: "#8a5a32",
      F: escolher(rng, ["#c9b48e", "#8a6a4a", "#d8d2c4", "#5a4a3a"]),
      O: f.especie === "tiefling" ? "#3a2a3a" : f.especie === "draconato" ? tom(f.aparencia.pele, -1) : "#e8dcc0",
      V: "#4f8a3a",
    },
  };
};

// ---------------- montagem ----------------
type Px = { mat: string; parte: number } | null;

export const montarSprite = (f: Ficha, pose: Pose = "parado"): Grade => {
  const v = vestimenta(f);
  const pequeno = f.especie === "halfling" || f.especie === "gnomo" || f.especie === "anao";
  const sobe = pequeno ? 2 : 0; // espécies pequenas: pernas mais curtas (o corpo desce)
  const camadas: Parte[] = [];
  const add = (p: Parte, dy = sobe) => camadas.push({ ...p, y: p.y + dy });
  const troca = (p: Parte, de: string, para: string): Parte => ({ ...p, px: p.px.map((l) => l.split(de).join(para)) });
  const cobreCabeca = v.chapeu.some((c) => c === "elmoFechado" || c === "capuz");
  const draconato = f.especie === "draconato";
  const [cabeloFrente, cabeloTras] = CABELOS[f.aparencia.estiloCabelo] ?? CABELOS.curto;

  // 1) atrás de tudo
  if (v.capa) add(CAPA);
  if (f.classe === "patrulheiro") add(ALJAVA);
  if (f.especie === "tiefling") add(CAUDA);
  if (!cobreCabeca && !draconato) for (const c of cabeloTras) add(c);

  // 2) pernas (passo: uma vai para frente, a outra para trás)
  const passo = pose === "passoA" ? 1 : pose === "passoB" ? -1 : 0;
  const curtas = (p: Parte): Parte => (pequeno ? { ...p, y: p.y + 2, px: [p.px[0], ...p.px.slice(3)] } : p);
  const matPerna = v.calca === "grevas" ? "M" : f.classe === "monge" ? "C" : "P";
  if (v.calca !== "saia") {
    add(troca(curtas({ ...PERNA_TRAS, x: PERNA_TRAS.x - passo }), "P", matPerna), 0);
    add(troca(curtas({ ...PERNA_FRENTE, x: PERNA_FRENTE.x + passo }), "P", matPerna), 0);
  }

  // 3) braço de trás e tronco
  const matTronco = { placas: "M", malha: "N", couro: "L", tunica: "C", manto: "C", nu: "S", gi: "C" }[v.tronco];
  const matManga = { placas: "M", malha: "N", couro: "C", tunica: "C", manto: "C", nu: "S", gi: "C" }[v.tronco];
  add(troca(BRACO_TRAS, "T", matManga));
  if (v.calca === "saia") add(SAIA);
  add(troca(troca(TRONCO, "T", matTronco), "K", v.tronco === "gi" ? "R" : "L"));
  if (v.tronco === "malha" || (v.tronco === "placas" && (f.classe === "paladino" || f.id % 2 === 0))) add(TABARDO);
  if (v.tronco === "couro") add(CORREIA);
  if (v.tronco === "gi") {
    add(DECOTE_MONGE);
    add(FAIXA_MONGE);
  }
  if (v.tronco === "manto") add(FAIXA_MANTO);
  if (v.pele) add(PELE_OMBROS);
  if (v.ombreiras) add(OMBREIRA_TRAS);
  if (f.escudo) add(ESCUDO);

  // 4) cabeça
  if (draconato) {
    add(CRISTA_DRAGAO);
    add(CABECA_DRAGAO);
  } else {
    add(CABECA);
    if (!cobreCabeca) for (const c of cabeloFrente) add(c);
    if (!cobreCabeca) add(f.especie === "gnomo" ? ORELHA_GNOMO : ORELHA);
    if (f.especie === "elfo" && !v.chapeu.includes("elmoFechado")) add(ORELHA_ELFO);
    if (f.especie === "golias") add(MARCAS_GOLIAS);
    if (f.especie === "orc") add(PRESAS);
    if (f.aparencia.barba && !v.chapeu.includes("elmoFechado")) add(f.especie === "anao" || f.id % 3 ? BARBA : BIGODE);
  }
  for (const c of v.chapeu) for (const p of CHAPEUS[c]) add(p);
  if (f.especie === "tiefling" && !v.chapeu.includes("chifres") && !v.chapeu.includes("elmoFechado")) add(CHIFRES_TIEFLING);

  // 5) braço da frente por cima
  if (v.ombreiras) add(OMBREIRA_FRENTE);
  add(troca(BRACO_FRENTE, "T", matManga));

  // ---------- rasteriza ----------
  const g: Px[][] = Array.from({ length: ALT }, () => Array<Px>(LARG).fill(null));
  camadas.forEach((c, i) =>
    c.px.forEach((linha, dy) =>
      [...linha].forEach((ch, dx) => {
        if (ch === ".") return;
        const x = c.x + dx, y = c.y + dy;
        if (x >= 0 && x < LARG && y >= 0 && y < ALT) g[y][x] = { mat: ch, parte: i };
      }),
    ),
  );
  let out = sombrear(g, v.cores, f);
  if (pose === "dano") out = out.map((l) => l.map((c) => (c ? misturar(c, "#ffffff", 0.7) : c)));
  return out;
};

// ---------- sombreamento automático ----------
const CORES_FIXAS: Record<string, string> = { e: "#1a1219", w: "#f4f0e6", x: "#1a1219", o: "#5a2a2a" };

const sombrear = (g: Px[][], cores: Record<string, string>, f: Ficha): Grade => {
  const out: Grade = Array.from({ length: ALT }, () => Array<string | null>(LARG).fill(null));
  const mesma = (x: number, y: number, p: Px) => {
    const q = g[y]?.[x];
    return !!q && !!p && q.parte === p.parte && q.mat === p.mat;
  };
  const corOlho = f.especie === "tiefling" || f.especie === "draconato" ? "#ffd84a" : "#ffe08a";
  for (let y = 0; y < ALT; y++)
    for (let x = 0; x < LARG; x++) {
      const p = g[y][x];
      if (!p) continue;
      if (p.mat === "Y") { out[y][x] = corOlho; continue; }
      if (!SOMBREADAS.includes(p.mat)) { out[y][x] = CORES_FIXAS[p.mat] ?? "#ff00ff"; continue; }
      const base = cores[p.mat] ?? "#ff00ff";
      // extensão da linha dentro da mesma peça/material
      let l = x, r = x;
      while (mesma(l - 1, y, p)) l--;
      while (mesma(r + 1, y, p)) r++;
      const fx = r > l ? (x - l) / (r - l) : 0.5;
      const topo = !mesma(x, y - 1, p);
      const baixo = !mesma(x, y + 1, p);
      let t = 0; // 1 luz, 0 base, -1 sombra, -2 funda
      if (fx < 0.3 && r - l >= 3) t = -1;
      if (fx < 0.12 && r - l >= 5) t = -2;
      if (baixo && t > -1) t = -1;
      if (topo && fx > 0.3) t = 1;
      if (p.mat === "M" && fx > 0.55 && fx < 0.75 && !baixo) t = 1; // brilho do metal
      if (p.mat === "N") t = (x + y) % 2 ? -1 : 0; // malha
      if (p.mat === "H" && topo && fx > 0.2) t = 1;
      if (p.mat === "S" && t < -1) t = -1; // pele: sombra suave (a funda puxa demais para o vermelho)
      out[y][x] = t === 0 ? base : tom(base, t);
      if (p.mat === "M" && t === 1 && topo && fx > 0.6) out[y][x] = "#eef2f6";
    }
  // linha escura onde uma peça de cima encosta numa de baixo (separa as peças)
  const final = out.map((l) => [...l]);
  for (let y = 0; y < ALT; y++)
    for (let x = 0; x < LARG; x++) {
      const p = g[y][x];
      if (!p || !SOMBREADAS.includes(p.mat)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) {
        const q = g[y + dy]?.[x + dx];
        if (q && q.parte > p.parte && SOMBREADAS.includes(q.mat) && (q.mat !== p.mat || (dx === -1 || dy === 1))) {
          final[y][x] = p.mat === "S" ? misturar(tom(cores.S, -1), "#2a1a1a", 0.35) : tom(cores[p.mat] ?? "#888888", -2);
          break;
        }
      }
    }
  return contornar(final);
};

// contorno escuro de 1 px em volta de tudo
const contornar = (g: Grade): Grade => {
  const out = g.map((l) => [...l]);
  const h = g.length, w = g[0].length;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (g[y][x]) continue;
      if ([g[y - 1]?.[x], g[y + 1]?.[x], g[y]?.[x - 1], g[y]?.[x + 1]].some(Boolean)) out[y][x] = "#1a1219";
    }
  return out;
};

// ---------- arma ----------
export const montarArma = (f: Ficha) => {
  const v = vestimenta(f);
  const chave = f.classe === "bardo" && f.id % 2 === 0 ? "alaúde" : f.classe === "feiticeiro" || f.classe === "bruxo" ? "foco" : f.arma.visual;
  const def = ARMAS_PX[chave] ?? ARMAS_PX.espada;
  const w = Math.max(...def.px.map((l) => l.length)) + 2;
  const h = def.px.length + 2;
  const g: Px[][] = Array.from({ length: h }, () => Array<Px>(w).fill(null));
  def.px.forEach((linha, y) => [...linha].forEach((ch, x) => { if (ch !== ".") g[y + 1][x + 1] = { mat: ch, parte: 0 }; }));
  const foco = f.classe === "bruxo" ? "#b07ae8" : f.classe === "feiticeiro" ? "#ff8a4a" : "#8fd8ff";
  const grade: Grade = g.map((l, y) =>
    l.map((p, x) => {
      if (!p) return null;
      if (p.mat === "Y") return (x + y) % 3 === 0 ? tom(foco, 1) : foco;
      if (p.mat === "w") return "#f4f0e6";
      if (p.mat === "x") return "#1a1219";
      const base = v.cores[p.mat] ?? "#888";
      const esq = !g[y][x - 1] || g[y][x - 1]!.mat !== p.mat;
      return esq ? base : tom(base, -1);
    }),
  );
  return { grade: contornar(grade), pega: [def.pega[0] + 1, def.pega[1] + 1] as [number, number], largura: w, altura: h, chave };
};

// descrição curta da roupa sorteada (vai para a ficha)
export const descreverVestimenta = (f: Ficha) => {
  const v = vestimenta(f);
  const nomes: Record<string, string> = {
    elmoFechado: "elmo fechado", pluma: "pluma", cruz: "cruz no elmo", elmoAberto: "elmo aberto", chifres: "chifres no elmo",
    capuz: "capuz", chapeuMago: "chapéu de mago", boinaBardo: "boina com pena", coroaFolhas: "coroa de folhas", galhada: "galhada",
    diadema: "diadema", bandana: "bandana", mascara: "máscara",
  };
  const tronco = { placas: "armadura de placas", malha: "cota de malha com tabardo", couro: "colete de couro", tunica: "túnica", manto: "manto longo", nu: "peito nu", gi: "gi de monge" }[v.tronco];
  return [...v.chapeu.map((c) => nomes[c]), tronco, v.ombreiras ? "ombreiras" : "", v.pele ? "pele nos ombros" : "", v.capa ? "capa" : "", f.escudo ? "escudo" : ""].filter(Boolean).join(", ");
};
