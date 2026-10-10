// Sprites pixel art 48×64 em vista 3/4 (virados para a direita), estilo RPG de GBA/SNES:
// cabeça grande (≈21 px, proporção ~2,5 cabeças), contorno escuro forte, sombreamento por material,
// rosto detalhado (olhos com íris, pupila e brilho, sobrancelhas, nariz, blush, boca) e roupa com dobras.
// Tudo é montado por PEÇAS sorteadas a partir da ficha (com semente: o mesmo personagem sai sempre igual):
//   cabeça · rosto/expressão · cabelo · barba · traços da espécie · chapéu/elmo/capuz · tronco · braços
//   · ombreiras · capa · aljava · pernas/botas · escudo · arma
//
// As peças usam a LETRA DO MATERIAL; o sombreamento é automático (luz de cima/frente, sombra nas costas
// e embaixo, brilho especular no metal, malha em xadrez, linha escura onde uma peça encosta na outra).
// Ajustes finos: "-" escurece e "+" clareia o pixel que já está embaixo (dobras, vincos, reflexos).

import type { Ficha } from "../motor/personagem";
import { criarRng, escolher, hash } from "../motor/dados";
import { misturar, tom } from "./cor";

export const LARG = 48;
export const ALT = 64;
export const CHAO = 60; // linha do chão (primeira abaixo das botas)
export const CENTRO_X = 24;
export const DESC_PEQUENO = 4; // anão, halfling e gnomo: pernas mais curtas

export type Grade = (string | null)[][];
export type Pose = "parado" | "passoA" | "passoB" | "golpe" | "magia" | "dano";
export type Expressao = "neutra" | "concentrada" | "grito" | "dor" | "ofegante" | "derrota" | "vitoria";

// Letras sombreadas: S pele · H cabelo · C roupa · P calça · A capa/capuz/chapéu · R detalhe · M metal
//   N malha · L couro · B bota · G ouro · W madeira · F pelo · O chifre/osso · V folha
// Letras fixas: e pupila/linha · I íris · w branco/brilho · o boca · T língua · U blush · J mecha clara
//   x linha escura · Y brilho mágico · Q suor · X sangue · Z joia
const SOMBREADAS = "SHCPARMNLBGWFOV";

type Parte = { x: number; y: number; px: string[] };
const P = (x: number, y: number, ...px: string[]): Parte => ({ x, y, px });
const forma = (w: number, h: number, f: (x: number, y: number) => string) =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => f(x, y)).join(""));
const dentro = (x: number, y: number, w: number, h: number, exp = 2) => {
  const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2);
  return Math.abs(nx) ** exp + Math.abs(ny) ** exp <= 1;
};

// ---------------- CABEÇA E ROSTO ----------------
const CABECA = P(13, 10, ...forma(22, 20, (x, y) => (dentro(x, y, 22, 20, 2.3) ? "S" : ".")));
const PESCOCO = P(21, 29, "-SSSS-", ".-SS-.");
const ORELHA = P(19, 19, "SS.", "S-S", "SS.", ".S.");
// olhos: esquerdo em x 22–24, direito (mais estreito, 3/4) em x 29–30; linhas 19–21
const OLHOS = P(22, 19, "eee....ee", "wIe....wI", "IIe....II");
const SOBRANCELHAS = P(22, 17, ".HH....HH");
const NARIZ = P(32, 22, "-", "-");
const BLUSH = P(21, 23, "UU......U");
const BOCA = P(27, 25, "oo");
const PELE_ROSTO = P(21, 17, "SSSSSSSSSSS", "SSSSSSSSSSS", "SSSSSSSSSSS", "SSSSSSSSSSS", "SSSSSSSSSSS", "SSSSSSSSSSS", "SSSSSSSSSSS", "SSSSSSSSSSS", "SSSSSSSSSSS", "SSSSSSSSSSS");

const ROSTO: Record<Expressao, Parte[]> = {
  neutra: [OLHOS, SOBRANCELHAS, NARIZ, BLUSH, BOCA],
  concentrada: [OLHOS, P(22, 17, "HH.....HH", "..H...H.."), NARIZ, BLUSH, P(27, 25, "eo")],
  grito: [PELE_ROSTO, P(22, 17, "HH.....HH", ".HHH.HHH."), P(22, 19, "eee....ee", "Iew....Ie"), NARIZ, BLUSH, P(26, 24, "eeee", "eTTe", ".ee.")],
  dor: [PELE_ROSTO, P(22, 17, "..H...H..", ".H.....H."), P(22, 20, "eee....ee"), P(21, 21, ".e......e"), NARIZ, BLUSH, P(26, 25, "e.e.e"), P(37, 13, "Q", "QQ", "QQ")],
  ofegante: [OLHOS, P(22, 17, "..H...H..", ".H.....H."), NARIZ, P(21, 23, "UUU.....U"), P(27, 24, "ee", "eT"), P(37, 14, "Q", "QQ")],
  derrota: [PELE_ROSTO, P(22, 18, "e.e....e.e", ".e......e.", "e.e....e.e"), NARIZ, P(26, 25, "eeee")],
  vitoria: [PELE_ROSTO, P(22, 17, ".HH....HH"), P(22, 19, ".e.....e.", "e.e...e.e"), NARIZ, P(21, 22, "UUU.....UU"), P(26, 24, "e...e", ".eee.")],
};

// ---------------- CABEÇA DE DRAGÃO (draconato) ----------------
const CABECA_DRAGAO: Parte[] = [
  P(10, 6, ...forma(32, 25, (x, y) => {
    const cranio = dentro(x - 2, y, 22, 22, 2.2);
    const focinho = x >= 14 && x <= 31 && y >= 10 && y <= 21 && dentro(x - 14, y - 10, 18, 12, 3);
    return cranio || focinho ? "S" : ".";
  })),
  P(8, 1, "OO.......", ".OOO.....", "..OOOO...", "...OOOOO.", ".....OOOO", "......OOO"),
  P(14, 3, "..OO....", ".OOO....", "OOOO....", ".OOO....", "..OO...."),
  P(26, 15, "xxx", "YYe", "Yee"),
  P(26, 13, "+++."),
  P(39, 19, "e."),
  P(28, 24, "wxwxwxwxwxw", "xxxxxxxxxxx", "w.w.w.w.w.."),
  P(18, 22, "-...-...-", "..-...-..", "-...-...-"),
];
const CRISTA_DRAGAO = P(9, 12, "RR....", "RRRR..", ".RRRRR", ".RRRRR", "..RRRR", "..RRR.", "...RR.");

// ---------------- CABELOS ----------------
const CABELO_CURTO = P(12, 7,
  "........HHHHHHHH........",
  ".....HHHHHHHHHHHHHH.....",
  "...HHHHHJJHHHHHHHHHHH...",
  "..HHHHHJJHHHHHHJJHHHHH..",
  ".HHHHHHHHHHHHHJJHHHHHHH.",
  ".HHHHHHHHHHHHHHHHHHHHHHH",
  "HHHHHHHHHHHHHHHHHHHHHHHH",
  "HHHHHHHHHHHHHHHHHHHHHHHH",
  "HHHHHHHHHHHHHHHHH.HHH.HH",
  "HHHHHHHHHHHHHH.HH..HH..H",
  "HHHHHHHHHH.HH....H...H..",
  "HHHHHHHH................",
  "HHHHHHH.................",
  "HHHHHHH.................",
  "HHHHHH..................",
  "HHHHHH..................",
  ".HHHHH..................",
  ".HHHH...................",
  "..HH....................",
);
const CABELOS: Record<string, [Parte[], Parte[]]> = {
  curto: [[CABELO_CURTO], []],
  longo: [[CABELO_CURTO], [P(10, 18, "HHHHHHHHH", "HHHHHHHHH", "HHHHHHHH.", "HHHJHHHH.", "HHHJHHH..", "HHHHHHH..", "HHHHHH...", "HHHHHH...", "HHHHH....", "HHHH.....", "HHHH.....", ".HH......", ".H.......")]],
  rabo: [[CABELO_CURTO], [P(5, 12, "....HH", "...HHH", "..HHHR", ".HHHRR", "HHHH..", "HHJH..", "HHH...", "HHH...", "HHH...", "HH....", "HH....", ".H....")]],
  coque: [[CABELO_CURTO, P(14, 2, "...HHHH..", "..HHJJHH.", ".HHHHHHHH", ".HHHHHHHH", "..HHHHHH.", "...RRRR..")], []],
  trancas: [[CABELO_CURTO], [P(10, 18, "HHH.....", "HJH.....", "RRR.....", "HHH.....", "HJH.....", "HHH.....", "RRR.....", "HHH.....", "HH......", "RR......")]],
  moicano: [[P(17, 2, "...HHHH....", "..HHJJHH...", ".HHHJHHHH..", "HHHHHHHHHH.", "HHHHHHHHHH.", "HHHHHHHHH..", ".HHHHHHH...", "..HHHHH....")], []],
  espetado: [[CABELO_CURTO, P(12, 1, "....H.....H.....H.......", "...HH....HH....HH.......", "..HHH...HHHH..HHHH......", ".HHHH..HHHHH.HHHHH......", "HHHHHHHHHHHHHHHHHHH.....", "HHHHHHHHHHHHHHHHHHHH....")], []],
  careca: [[], []],
};
const BARBA = P(21, 24,
  "H.........HH",
  "HH..eoe..HHH",
  ".HHHHHHHHHHH",
  ".HHHHJHHHHH.",
  "..HHHHHHHHH.",
  "...HHJHHHH..",
  "....HHHHH...",
  ".....HHH....",
);
const BIGODE = P(25, 24, "HHHHHHH", "H.....H");

// ---------------- TRAÇOS DE ESPÉCIE ----------------
const ORELHA_ELFO = P(6, 15, "S...............", ".SS.............", "..SSSS..........", "...SSSSSSS......", ".....SSSSSSSSS..", "........SSSSSS..");
const ORELHA_GNOMO = P(16, 17, ".SSS.", "SSSSS", "SS-SS", "SSSSS", ".SSS.");
const PRESAS = P(26, 24, "w...w", "w...w");
const MARCAS_GOLIAS = P(23, 12, "-......-", ".-......", "........", "-......-", "........", "..-...-.");
const CHIFRES_TIEFLING = P(14, 1, "O..............O", "OO............OO", ".OO..........OO.", "..OOO......OOO..", "...OOO....OOO...", "....OO....OO....");
const SARDAS = P(22, 22, "x.x....x");

// ---------------- CHAPÉUS / ELMOS ----------------
const ELMO_FECHADO = P(11, 5, ...forma(26, 22, (x, y) => (dentro(x, y, 26, 24, 2.4) || (y > 11 && x > 1 && x < 25) ? "M" : ".")));
const CHAPEUS: Record<string, Parte[]> = {
  elmoFechado: [ELMO_FECHADO, P(23, 18, "xxxxxxxxxxxxx", "+++++++++++++"), P(31, 22, "x.x.x", "x.x.x"), P(24, 6, "++", "++", "++", "++", "++", "++", "++", "++", "++"), P(12, 23, "------------------------")],
  pluma: [P(5, 0, ".......RRRRRR..", ".....RRRRRRRRR.", "...RRRRRRRRR...", "..RRRRRR.......", ".RRRRR.........", "RRRRR..........", "RRRR...........", "RRR............", ".RR............")],
  cruz: [P(30, 9, ".GG.", "GGGG", ".GG.", ".GG.", ".GG.")],
  elmoAberto: [
    P(11, 4, ...forma(26, 11, (x, y) => (dentro(x, y + 10, 26, 22, 2.2) ? "M" : "."))),
    P(10, 14, "RRRRRRRRRRRRRRRRRRRRRRRRRRR"),
    P(11, 15, "MMMMMMMMM.....M..", "MMMMMMMM......M..", "MMMMMMM.......M..", "MMMMMMM...........", "MMMMMM............", "-MMMM-...........", ".MMM.............."),
    P(13, 6, "....++++++........"),
  ],
  chifres: [P(3, 0,
    "OO....................................",
    "OOO................................OO.",
    ".OOO..............................OOO.",
    "..OOOO..........................OOOO..",
    "...OOOOO......................OOOOO...",
    ".....OOOOO..................OOOOO.....",
    ".......OOO..................OOO.......",
  )],
  capuz: [P(10, 5, ...forma(28, 28, (x, y) => {
    const capa = dentro(x, y, 28, 30, 2.2) || (y > 20 && x > 2 && x < 26);
    const rosto = x >= 12 && x <= 27 && y >= 10 && y <= 23 && dentro(x - 10, y - 8, 22, 18, 2.4);
    return capa && !rosto ? "A" : ".";
  })), P(14, 10, "-....-....-", ".-....-....", "..-........")],
  chapeuMago: [P(5, 0, ...forma(36, 16, (x, y) => {
    const ponta = y < 10 && x >= 4 + y * 0.2 && x <= 4 + y * 1.6 + 2 && x > y * 1.2 - 1;
    const aba = y >= 10 && dentro(x, y - 10, 36, 7, 2);
    return ponta || aba ? "A" : ".";
  })), P(11, 9, "GGGGGGGGGGGGGGGGG"), P(8, 3, "+..", ".+.", "..+")],
  boinaBardo: [P(10, 4, ...forma(28, 10, (x, y) => (dentro(x, y, 28, 14, 2.2) && y < 9 ? "A" : "."))), P(11, 12, "RRRRRRRRRRRRRRRRRRRRRRRRR"), P(8, 0, "ww.....", ".www...", "..wwww.", "....www", ".....ww")],
  coroaFolhas: [P(12, 9, "..V..V..V...V..V..V....", ".VVV.VVV.VVV.VVV.VVV.VV.", "WWWWWWWWWWWWWWWWWWWWWWWW", "VV.V..V..V..V...V..V..V.")],
  galhada: [P(8, 0, "W.W....................W.W", ".WW.W................W.WW.", "..WW..W............W..WW..", "...WWW..............WWW...", "....WWW............WWW....", ".....WW............WW.....")],
  diadema: [P(14, 15, "GGGGGGGGGGGGGGGGGGGG", "...............ZYZ.."), P(29, 14, "GZG")],
  bandana: [P(12, 13, "AAAAAAAAAAAAAAAAAAAAAAAA", "AAAAAAAAAAAAAAAAAAAAAAAA", "-AAAAAAAAAAAAAAAAAAAAAA-"), P(5, 14, "..AAA", ".AAA.", "AAA..", "AA...", "A....", "AA...")],
  mascara: [P(26, 22, "AAAAAAAAAA", "AAAAAAAAAA", "AAAAAAAAAA", ".AAAAAAAAA", "..AAAAAA..")],
};

// ---------------- CORPO ----------------
// tronco: T = material (trocado pela roupa), K = cinto
const TRONCO = P(16, 31,
  "......SSSS......",
  "....TTTTTTTT....",
  "..TTTTTTTTTTTT..",
  ".TTTTTTTTTTTTTT.",
  "TTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTT",
  ".TTTTTTTTTTTTTT.",
  ".TTTTTTTTTTTTTT.",
  ".KKKKKKKKKKGGKK.",
  ".TTTTTTTTTTTTTT.",
  "..TTTTTTTTTTTT..",
);
const DOBRAS = P(18, 35, "-.......-...", ".-.....-....", "..-...-.....", "............", "..-.....-...", ".-.......-..");
const PLACAS = P(16, 36, "----------------", "........+.......", "........+.......", "----------------", "........+.......");
const BRACO_TRAS = P(12, 32, "..TT", ".TTT", "TTTT", "TTTT", "TTTT", "TTTT", "TTTT", "TTTT", "TTTT", "-TT-", "SSSS", "SSS.", ".SS.");
const BRACO_FRENTE = P(29, 32, "TTTT.....", "TTTTT....", "TTTTT....", "TTTTT....", ".TTTT....", ".TTTT....", ".TTTTT...", "..TTTTTT.", "..TTTTT-S", "....-TSSS", ".....SSSS", "......SS.");
export const MAO: [number, number] = [37, 41]; // onde a arma é segura

const PERNA_TRAS = P(18, 45, "PPPPP", "PPPPP", "PPPPP", "PPPPP", "PPPPP", "PPPPP", "PPPPP", "-PPP-", "LLLLL", "BBBBB", "BBBBB", "BBBBB", "BBBBBB", "BBBBBB", "-BBBB-");
const PERNA_FRENTE = P(25, 45, "PPPPP.", "PPPPP.", "PPPPP.", "PPPPP.", "PPPPP.", "PPPPP.", "PPPPP.", "-PPP-.", "LLLLL.", "BBBBB.", "BBBBB.", "BBBBBB", "BBBBBBB", "BBBBBBB", "-BBBBB-");
const SAIA = P(15, 42,
  ".RRRRRRRRRRRRRRR....",
  ".CCCCCCCCCCCCCCC....",
  "CCCCCCCCCCCCCCCCC...",
  "CCCCCCCCCCCCCCCCC...",
  "CCCCCC-CCCCC-CCCCC..",
  "CCCCCC-CCCCC-CCCCC..",
  "CCCCC-CCCCCCC-CCCCC.",
  "CCCCC-CCCCCCC-CCCCC.",
  "CCCC-CCCCCCCCC-CCCCC",
  "CCCC-CCCCCCCCC-CCCCC",
  "CCCCCCCCCCCCCCCCCCCC",
  "CCCCCCCCCCCCCCCCCCCC",
  "CCCCCCCCCCCCCCCCCCCC",
  "RRRRRRRRRRRRRRRRRRRR",
  "..BBBB......BBBBBB..",
  "..BBBB......BBBBBBB.",
  "..BBBB......BBBBBBB.",
);
const TABARDO = P(19, 33, "CCCCCCCCCC", "CCCCRRCCCC", "CCCRRRRCCC", "CCCCRRCCCC", "CCCCRRCCCC", "CCCCCCCCCC", "CCCCCCCCCC", "CCCCCCCCCC", "..........", ".CCCCCCCC.", ".CCCCCCCC.", "..CC-CCC..", "..CCCCCC..", "...CCCC...");
const DECOTE_MONGE = P(21, 32, "SSSSSS", ".SSSS.", "..SS..", "..S...");
const FAIXA_MONGE = P(16, 42, ".RRRRRRRRRRRRRR.", "..........RR....", "..........RRR...", "...........R....");
const CORREIA = P(17, 32, ...Array.from({ length: 11 }, (_, i) => ".".repeat(i) + (i === 5 ? "GG" : "LL")));
const OMBREIRA_TRAS = P(11, 31, "..MMMM.", ".MMMMMM", "MMMMMMM", "-MMMMM-", ".MMMM..");
const OMBREIRA_FRENTE = P(27, 30, "..MMMMM..", ".MMMM+MMM", "MMMMMMMMM", "MMMMMMMM-", "-MMMMMM-.", ".-MMMM-..");
const PELE_OMBROS = P(13, 29, "...FFFFFFFFFFFFFFF...", "..FFFFFFFFFFFFFFFFFF.", ".FFFFF-FFFFF-FFFFFFF.", "FFF.FFF.FFF.FFF.FFF..");
const FAIXA_MANTO = P(24, 32, "R", "R", "R", "R", "R", "R", "R", "R", "R", "R");
const CAPA = P(7, 31, ...Array.from({ length: 26 }, (_, i) => ".".repeat(Math.max(0, 4 - Math.floor(i / 2))) + "A".repeat(Math.min(11, 7 + Math.floor(i / 3))).slice(0, 11)));
const ALJAVA = P(9, 20, "wR.wR.", ".w..w.", "WWWWWW", ".LLLLL", ".LLLLL", ".LLGLL", ".LLLLL", ".LLLLL", ".LLLLL", "..LLLL", "..LLLL", "..LLLL", "..LLL.", "..LLL.");
const CAUDA = P(2, 44, "OO........", ".OO.......", "..O.......", "..OO......", "...OOOOO..", "......OOOO");
const ESCUDO = P(8, 33, ...forma(13, 17, (x, y) => {
  const ok = y < 9 ? x >= 0 && x < 13 : Math.abs(x - 6) <= 6 - (y - 9) * 0.75;
  if (!ok) return ".";
  const borda = x === 0 || x === 12 || y === 0 || Math.abs(Math.abs(x - 6) - (6 - Math.max(0, y - 9) * 0.75)) < 1;
  const cruz = (x === 6 || x === 5) && y > 2 && y < 13 || (y === 6 || y === 5) && x > 2 && x < 10;
  return borda ? "M" : cruz ? "G" : "A";
}));
const FERIDO = [P(32, 23, "X.", ".X"), P(18, 34, "x.....", ".x....", "..x.X.", "......", "....x."), P(21, 37, "X.x"), P(19, 49, "x.", ".x"), P(27, 51, "x")];
const COROA = P(18, 0, "G..G..G..G", "GGGGGGGGGG", "GZGGZGGZGG");

// ---------------- ARMAS (apontando para cima; pega = ponto da mão) ----------------
const lamina = (comp: number, larg: number, guarda: number, cabo: number) => {
  const w = Math.max(larg + 2, guarda);
  const c = Math.floor(w / 2);
  const linhas: string[] = [];
  linhas.push(".".repeat(c) + "w" + ".".repeat(w - c - 1));
  for (let i = 0; i < comp; i++) {
    const l = Array(w).fill(".");
    const ini = c - Math.floor(larg / 2);
    for (let k = 0; k < larg; k++) l[ini + k] = k === 0 ? "w" : k === larg - 1 && larg > 2 ? "N" : "M";
    if (i === comp - 1) for (let k = 0; k < larg; k++) l[ini + k] = "M";
    linhas.push(l.join(""));
  }
  const g0 = c - Math.floor(guarda / 2);
  linhas.push(Array.from({ length: w }, (_, k) => (k >= g0 && k < g0 + guarda ? "G" : ".")).join(""));
  for (let i = 0; i < cabo; i++) linhas.push(".".repeat(c) + "L" + ".".repeat(w - c - 1));
  linhas.push(".".repeat(c - 1) + "GGG" + ".".repeat(Math.max(0, w - c - 2)));
  return { px: linhas, pega: [c, comp + 3] as [number, number] };
};
const haste = (cabeca: string[], comp: number, w: number) => {
  const c = Math.floor(w / 2);
  return { px: [...cabeca, ...Array.from({ length: comp }, (_, i) => ".".repeat(c) + (i === comp - 4 || i === comp - 3 ? "L" : "W") + ".".repeat(w - c - 1))], pega: [c, cabeca.length + comp - 4] as [number, number] };
};
export const ARMAS_PX: Record<string, { px: string[]; pega: [number, number] }> = {
  espada: lamina(17, 3, 9, 4),
  espadona: lamina(25, 4, 11, 6),
  rapieira: { ...lamina(20, 1, 5, 3), px: [...lamina(20, 1, 5, 3).px.slice(0, -5), "..GGG..", ".G.G.G.", "GGGGGGG", "...L...", "...L...", "...L...", "..GGG.."].map((l) => l.padEnd(7, ".")) },
  adaga: lamina(8, 3, 7, 3),
  cimitarra: { px: ["......wM", ".....wMM", "....wMM.", "...wMM..", "...wMM..", "..wMM...", "..wMM...", "..wMM...", "..wMM...", "..wMM...", "..wMM...", "..wMM...", "..MMM...", "GGGGGGG.", "...L....", "...L....", "...L....", "..GGG..."], pega: [3, 15] },
  machado: haste([".....MMw.", "...MMMMMw", "..MMMMMMw", "..MMMWMMw", "..MMMWMMw", "...MMWMM.", ".....WM..", ".....W...."], 14, 9),
  machadona: haste(["......MM......", "..MMMMWWMMMM..", ".MMMMMWWMMMMMw", "MMMMMMWWMMMMMw", "MMMMMMWWMMMMMw", "MMMMMMWWMMMMMw", ".MMMMMWWMMMMM.", "..MMM.WW.MMM..", "......WW......"], 20, 14),
  maca: haste(["..M.M.M..", ".MMMMMMM.", "MMMMwMMMM", "MMMMMMMMM", "MMMMMMMMM", ".MMMMMMM.", "..M.M.M..", "....G...."], 14, 9),
  martelo: haste(["MMMMMMMMMMM", "MMMwMMMMMMM", "MMMwMMMMMMM", "MMMMMMMMMMM", ".....G....."], 15, 11),
  "lança": haste(["..w..", ".wMM.", ".wMM.", ".wMM.", ".wMM.", "..M..", ".RRR.", "..R.."], 22, 5),
  cajado: haste(["..YYYY..", ".YYwYYY.", "YYYwYYYY", "YYYYYYYY", ".YYYYYY.", "..YYYY..", ".G.WW.G.", "..GWWG..", "...WW..."], 22, 8),
  arco: { px: ["..WW....", ".WW.w...", ".W..w...", "WW..w...", "W...w...", "W...w...", "W...w...", "W...w...", "W...w...", "W...w...", "WL..w...", "WL..w...", "WL..w...", "WL..w...", "W...w...", "W...w...", "W...w...", "W...w...", "W...w...", "W...w...", "WW..w...", ".W..w...", ".WW.w...", "..WW...."], pega: [1, 12] },
  punhos: { px: ["..", ".."], pega: [1, 1] },
  "alaúde": { px: ["..WWW...", "..xW....", "..W.....", "..W.....", "..W.....", "..W.....", "..W.....", "..W.....", "..WW....", ".WWWWW..", "WWWWWWW.", "WWWxxWW.", "WWWxxWW.", "WWWWWWW.", "WWWWWWW.", ".WWWWW..", "..WWW..."], pega: [3, 13] },
  foco: { px: ["..YYY..", ".YYwYY.", "YYwYYYY", "YYYYYYY", "YYYYYYY", ".YYYYY.", "..YYY.."], pega: [3, 3] },
};

// ---------------- vestimenta sorteada ----------------
export type Vestimenta = {
  chapeu: string[]; // peças de cabeça (pode ser vazio)
  tronco: "placas" | "malha" | "couro" | "tunica" | "manto" | "nu" | "gi";
  ombreiras: boolean;
  pele: boolean; // pelo nos ombros
  capa: boolean;
  calca: "calca" | "grevas" | "saia";
  sardas: boolean;
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
  if (f.especie === "draconato") chapeu = chapeu.filter((c) => !["capuz", "chapeuMago", "boinaBardo", "elmoFechado", "pluma", "cruz", "bandana", "mascara"].includes(c));
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
    sardas: rng() < 0.25,
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
type Px = { mat: string; parte: number; ajuste: number } | null;

export const montarSprite = (f: Ficha, pose: Pose = "parado", expr: Expressao = "neutra", ferido = false, coroa = false): Grade => {
  const v = vestimenta(f);
  const pequeno = f.especie === "halfling" || f.especie === "gnomo" || f.especie === "anao";
  const sobe = pequeno ? DESC_PEQUENO : 0;
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
  const passo = pose === "passoA" ? 2 : pose === "passoB" ? -2 : 0;
  const curtas = (p: Parte): Parte => (pequeno ? { ...p, y: p.y + DESC_PEQUENO, px: [p.px[0], ...p.px.slice(1 + DESC_PEQUENO)] } : p);
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
  if (v.tronco === "tunica" || v.tronco === "manto" || v.tronco === "gi" || v.tronco === "couro") add(DOBRAS);
  if (v.tronco === "placas") add(PLACAS);
  if (v.tronco === "nu") add(P(19, 35, "-....-", "......", ".-..-.", "......", "..--.."));
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

  // 4) cabeça e rosto
  add(PESCOCO);
  if (draconato) {
    add(CRISTA_DRAGAO);
    for (const p of CABECA_DRAGAO) add(p);
  } else {
    add(CABECA);
    for (const p of ROSTO[expr]) add(p);
    if (v.sardas && expr !== "derrota") add(SARDAS);
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
  if (ferido) for (const p of FERIDO) add(p);
  if (coroa) add(COROA, 0);

  // ---------- rasteriza ----------
  const g: Px[][] = Array.from({ length: ALT }, () => Array<Px>(LARG).fill(null));
  camadas.forEach((c, i) =>
    c.px.forEach((linha, dy) =>
      [...linha].forEach((ch, dx) => {
        if (ch === ".") return;
        const x = c.x + dx, y = c.y + dy;
        if (x < 0 || x >= LARG || y < 0 || y >= ALT) return;
        if (ch === "-" || ch === "+") {
          if (g[y][x]) g[y][x] = { ...g[y][x]!, ajuste: g[y][x]!.ajuste + (ch === "-" ? -1 : 1) };
          return;
        }
        g[y][x] = { mat: ch, parte: i, ajuste: 0 };
      }),
    ),
  );
  let out = sombrear(g, v.cores, f);
  if (pose === "dano") out = out.map((l) => l.map((c) => (c ? misturar(c, "#ffffff", 0.7) : c)));
  return out;
};

// ---------- sombreamento automático ----------
const sombrear = (g: Px[][], cores: Record<string, string>, f: Ficha): Grade => {
  const out: Grade = Array.from({ length: ALT }, () => Array<string | null>(LARG).fill(null));
  const mesma = (x: number, y: number, p: Px) => {
    const q = g[y]?.[x];
    return !!q && !!p && q.parte === p.parte && q.mat === p.mat;
  };
  const corOlho = f.especie === "tiefling" || f.especie === "draconato" ? "#ffd84a" : "#ffe08a";
  const fixas: Record<string, string> = {
    e: "#1a1219",
    w: "#f8f4ea",
    x: "#1a1219",
    o: "#7a3a3a",
    T: "#c84a5a",
    I: f.aparencia.olhos,
    U: misturar(f.aparencia.pele, "#e0606a", 0.38),
    J: misturar(f.aparencia.cabelo, "#fff4dc", 0.38),
    Q: "#8fd8ff",
    X: "#b0302a",
    Z: "#e0303a",
    Y: corOlho,
  };
  for (let y = 0; y < ALT; y++)
    for (let x = 0; x < LARG; x++) {
      const p = g[y][x];
      if (!p) continue;
      if (!SOMBREADAS.includes(p.mat)) {
        const c = fixas[p.mat] ?? "#ff00ff";
        out[y][x] = p.ajuste ? tom(c, p.ajuste) : c;
        continue;
      }
      const base = cores[p.mat] ?? "#ff00ff";
      let l = x, r = x;
      while (mesma(l - 1, y, p)) l--;
      while (mesma(r + 1, y, p)) r++;
      const fx = r > l ? (x - l) / (r - l) : 0.5;
      const topo = !mesma(x, y - 1, p);
      const baixo = !mesma(x, y + 1, p);
      let t = 0; // 1 luz, 0 base, -1 sombra, -2 funda
      if (fx < 0.28 && r - l >= 3) t = -1;
      if (fx < 0.1 && r - l >= 6) t = -2;
      if (baixo && t > -1) t = -1;
      if (topo && fx > 0.3) t = 1;
      if (!topo && !baixo && fx > 0.92 && r - l >= 6) t = Math.max(t, 1); // luz de recorte do lado oposto
      if (p.mat === "M" && fx > 0.55 && fx < 0.72 && !baixo) t = 1; // brilho do metal
      if (p.mat === "N") t = (x + y) % 2 ? -1 : 0;
      if (p.mat === "H" && topo && fx > 0.2) t = 1;
      t += p.ajuste;
      if (p.mat === "S" && t < -1) t = -1;
      t = Math.max(-2, Math.min(2, t));
      out[y][x] = t === 0 ? base : tom(base, t);
      if (p.mat === "M" && t >= 1 && topo && fx > 0.6) out[y][x] = "#eef2f6"; // ponto especular
    }
  // linha escura onde uma peça de cima encosta numa de baixo
  const final = out.map((l) => [...l]);
  for (let y = 0; y < ALT; y++)
    for (let x = 0; x < LARG; x++) {
      const p = g[y][x];
      if (!p || !SOMBREADAS.includes(p.mat)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) {
        const q = g[y + dy]?.[x + dx];
        if (q && q.parte > p.parte && SOMBREADAS.includes(q.mat) && (q.mat !== p.mat || dx === -1 || dy === 1)) {
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
  def.px.forEach((linha, y) => [...linha].forEach((ch, x) => { if (ch !== ".") g[y + 1][x + 1] = { mat: ch, parte: 0, ajuste: 0 }; }));
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

// recorte do rosto: painel (20×20) e cut-in/pergaminho (32×26, ampliado 2×)
export const retrato = (g: Grade, w = 20, h = 20, x0 = 14, y0 = 8): Grade =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => g[y0 + y]?.[x0 + x] ?? null));
