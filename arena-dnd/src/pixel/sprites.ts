// Sprites em pixel art gerados por código: corpo por classe, cabeça/traços por espécie,
// cabelo, chapéus e cores vindos da ficha. Sombreamento em 3–4 tons por material
// (luz amarelada, sombra azulada) + contorno seletivo automático.
//
// Grade: 24 × 30 px. Pés na linha 29. Cabeça nas linhas 5–16, corpo 17–24, pernas 25–29.
// Letras dos desenhos (cada uma = material + tom):
//   S K s   pele (base, luz, sombra)        H h j   cabelo (luz, base, sombra)
//   C c d D roupa (luz, base, sombra, funda) R r q   detalhe/acabamento
//   M m n N metal                           L l k   couro
//   G g     ouro                            B b     madeira
//   e E W   olho escuro, íris, brilho       o       boca
//   x       contorno forçado                F f     pelo/fur (claro, escuro)
//   . transparente

import type { Ficha } from "../motor/personagem";
import { misturar, tom } from "./cor";

export const LARG = 24;
export const ALT = 30;

export type Grade = (string | null)[][]; // cores hex por pixel

type Parte = { y: number; x: number; px: string[] };

// ---------------- CABEÇA ----------------
const CABECA: Parte = {
  x: 6,
  y: 5,
  px: [
    "...SSSSSS...",
    "..SSSSSSSS..",
    ".SSSSSSSSSs.",
    ".SKSSSSSSSs.",
    "SKSSSSSSSSss",
    "SKSSSSSSSSss",
    "SSSWeSSWeSss",
    "SSSeESSeESss",
    "sSSSSSSSSSss",
    ".sSSSSoSSss.",
    "..ssssssss..",
    "....ssss....",
  ],
};

// cabeça de dragão (draconato): focinho, chifres para trás, olhos amarelos
const CABECA_DRAGAO: Parte = {
  x: 5,
  y: 2,
  px: [
    "..N........N..",
    "..nN......Nn..",
    "...nN....Nn...",
    "....nSSSSn....",
    "...SKKSSSSs...",
    "..SKSSSSSSss..",
    ".qSKSSSSSSssq.",
    "qrSSYeSSYesrrq",
    ".qSSSSSSSSssq.",
    "..sSKKKKKKss..",
    "..SSKSSSSKss..",
    "..sSeSSSSess..",
    "...sSSSSSss...",
    "....sWooWs....",
    ".....ssss.....",
  ],
};

// ---------------- CABELO (frente e costas) ----------------
const CABELO_FRENTE: Record<string, Parte> = {
  curto: {
    x: 6,
    y: 4,
    px: [
      "...hhhhhh...",
      "..hHHHhhhh..",
      ".hHHhhhhhhj.",
      ".hHhhhhhhhjj",
      "hhhhhhhhhhjj",
      "hhhhjhhhjhjj",
      "hj........jj",
    ],
  },
  longo: {
    x: 6,
    y: 4,
    px: [
      "...hhhhhh...",
      "..hHHHhhhh..",
      ".hHHhhhhhhj.",
      ".hHhhhhhhhjj",
      "hhhhhhhhhhjj",
      "hhhhhjhhhhjj",
      "hhj......hjj",
      "hj........jj",
      "hj........jj",
    ],
  },
  rabo: {
    x: 6,
    y: 4,
    px: [
      "...hhhhhh...",
      "..hHHHhhhhh.",
      ".hHHhhhhhhjj",
      ".hHhhhhhhhjj",
      "hhhhhhhhhhjj",
      "hhjhhhhjhhjj",
      "hj........j.",
    ],
  },
  coque: {
    x: 6,
    y: 1,
    px: [
      "....hhhh....",
      "...hHHhhj...",
      "....hhjj....",
      "...hhhhhh...",
      "..hHHHhhhh..",
      ".hHhhhhhhhj.",
      ".hhhhhhhhhjj",
      "hhhjhhhhjhjj",
      "hj........jj",
    ],
  },
  trancas: {
    x: 6,
    y: 4,
    px: [
      "...hhhhhh...",
      "..hHHHhhhh..",
      ".hHHhhhhhhj.",
      ".hHhhhhhhhjj",
      "hhhhhhhhhhjj",
      "hhhjhhhhjhjj",
      "hj........jj",
    ],
  },
  moicano: {
    x: 6,
    y: 1,
    px: [
      ".....hh.....",
      "....hHhj....",
      "....hHhj....",
      "....hHhj....",
      "....hhhj....",
      "....hhjj....",
    ],
  },
  careca: { x: 6, y: 4, px: [] },
};

const CABELO_COSTAS: Record<string, Parte> = {
  longo: {
    x: 5,
    y: 10,
    px: [
      "hh..........jj",
      "hh..........jj",
      "hj..........jj",
      "hj..........jj",
      "jj..........jj",
      "jj..........jj",
      ".j..........j.",
    ],
  },
  rabo: {
    x: 16,
    y: 7,
    px: [
      ".hj.",
      ".hhj",
      "..hj",
      "..hj",
      "..jj",
      "...j",
    ],
  },
  trancas: {
    x: 5,
    y: 11,
    px: [
      "hj..........hj",
      "jh..........jh",
      "hj..........hj",
      "jh..........jh",
      "rr..........rr",
      "hj..........hj",
    ],
  },
};

const BARBA: Parte = {
  x: 6,
  y: 12,
  px: [
    "hh........jj",
    "hhh.hhhh.hjj",
    ".hhhhoohhhj.",
    ".hhhhhhhhjj.",
    "..hhhhhhjj..",
    "...hhhhjj...",
    "....hjj.....",
  ],
};

// ---------------- TRAÇOS DE ESPÉCIE ----------------
const ORELHAS_ELFO: Parte = { x: 3, y: 9, px: ["S................s", "SS..............ss", ".SK............sS.", "..S............s.."] };
const PRESAS_ORC: Parte = { x: 6, y: 13, px: ["...W....W...", "...W....W..."] };
const CHIFRES_TIEFLING: Parte = { x: 4, y: 1, px: ["x..............x", "nx............xn", ".nn..........nn.", "..nnx......xnn..", "...nnx....xnn..."] };
const MARCAS_GOLIAS: Parte = { x: 6, y: 9, px: ["..s.......s.", ".s........s.", "............", "s..........s"] };

// ---------------- CHAPÉUS ----------------
const CHAPEUS: Record<string, Parte> = {
  elmo: {
    x: 5,
    y: 3,
    px: [
      "....MMMMMM....",
      "...MMmmmmmn...",
      "..MMmmmmmmmn..",
      "..Mmmmrrmmmn..",
      "..mmmmrrmmnn..",
      "..mnnnnnnnnn..",
      "..mn......nn..",
      "..mn......nn..",
      "..mn......nn..",
      "..nn......nN..",
      "...n......N...",
    ],
  },
  elmoPluma: {
    x: 5,
    y: 0,
    px: [
      "......RRr.....",
      ".....RRrrq....",
      "......rqq.....",
      "....MMMMMM....",
      "...MMmmmmmn...",
      "..MMmmmmmmmn..",
      "..MmmGggmmmn..",
      "..mmmmggmmnn..",
      "..mnnnnnnnnn..",
      "..mn......nn..",
      "..mn......nn..",
      "..mn......nn..",
      "..nn......nN..",
    ],
  },
  chapeuMago: {
    x: 3,
    y: 0,
    px: [
      "..........Cd......",
      ".........CCd......",
      "........CCcd......",
      ".......CCccd......",
      "......CCcccdd.....",
      ".....CCccccdd.....",
      "....GgGgGgGggg....",
      ".CCCccccccccccddd.",
      "CCcccccccccccddddD",
    ],
  },
  capuz: {
    x: 5,
    y: 3,
    px: [
      ".....CCCC.....",
      "...CCCccccd...",
      "..CCccccccdd..",
      ".CCcccccccddd.",
      ".Ccccccccccdd.",
      ".Cccd.....ddd.",
      "Cccd.......ddD",
      "Ccd........ddD",
      "Ccd........ddD",
      "Ccd........dDD",
      "cd..........DD",
    ],
  },
  capuzBruxo: {
    x: 5,
    y: 3,
    px: [
      ".....DDDD.....",
      "...DDddddD....",
      "..DddddddddD..",
      ".DddddddddddD.",
      ".DddddddddddD.",
      ".DddD.....dDD.",
      "DddD.......DDx",
      "DdD........DDx",
      "DdD........DDx",
      "DdD........DDx",
      "Dd..........Dx",
    ],
  },
  coroaFolhas: {
    x: 4,
    y: 0,
    px: [
      "..B..........B..",
      ".Bb..........bB.",
      "..bB........Bb..",
      "...bB......Bb...",
      "....rRrRrRrRq...",
      "...RrqRrqRrqrq..",
    ],
  },
  diadema: { x: 6, y: 6, px: ["..gGGgGGGg..", "....gEEg...."] },
  chapeuBardo: {
    x: 4,
    y: 1,
    px: [
      "..........WW....",
      ".........WWW....",
      "........WW......",
      ".....RRRRRW.....",
      "....RRrrrrrq....",
      "..RRRrrrrrrqqq..",
      ".RRrrrrrrrrrqqq.",
    ],
  },
  chifresBarbaro: {
    x: 3,
    y: 1,
    px: [
      "WW..............WW",
      ".WW............WW.",
      "..Wn..MMMMMM..nW..",
      "...nnMMmmmmmnnn...",
      "....MmmmmmmmmN....",
      "....mnnnnnnnnN....",
    ],
  },
  mascaraLadino: { x: 6, y: 13, px: ["RRRRRRRRRRqq", ".RRrrrrrrqq.", "..qqqqqqqq.."] },
};

// ---------------- CORPOS (linhas 17–29) ----------------
// 12 colunas (x = 6), braços nas colunas 0–1 e 10–11.
const CORPOS: Record<string, string[]> = {
  armadura: [
    "....nmmn....",
    ".MMMmCCmMMM.",
    "MMMmCCccmMMn",
    "MmnmCcccmnmn",
    "mmnmCcccdnmn",
    "KSnLgLLLLnsS",
    "SS.mCccdm.ss",
    "...mCccdn...",
    "..Mmn..Mmn..",
    "..mmn..mmn..",
    "..mnn..mnn..",
    ".MmnN..MmnN.",
    ".nnNN..nnNN.",
  ],
  couro: [
    "....SSss....",
    "..CCLllkdd..",
    ".CCcLllkcdd.",
    "CCc.LRlkc.dd",
    "Cc..LllkC.dd",
    "SKrLgLLLLqss",
    "SS.dcccccd.s",
    "...Lllkllk..",
    "...lk..lk...",
    "...cd..cd...",
    "...cd..cd...",
    "..LLk..LLk..",
    "..Lkk..Lkk..",
  ],
  robe: [
    "....RssR....",
    "..CCRccRdd..",
    ".CCccRRcddd.",
    "CCcccRRccddD",
    "Ccc.cRRcd.dD",
    "SKclGgggldsS",
    "SS.CccRccd..",
    "...CccRccd..",
    "..CCccRcddd.",
    "..CcccRccdd.",
    ".CCcccRccddD",
    ".CccccRcdddD",
    ".kkk....kkk.",
  ],
  barbaro: [
    "....SSss....",
    ".FfFSKSSsfFf",
    "FFfSKSSSSsfF",
    "SKfSSSsSSsfs",
    "SKsSSssSSsss",
    "SKsLgLLLLkss",
    "SS.FcFcFcF.s",
    "...cFcFcFd..",
    "...Lk..Lk...",
    "...SS..Ss...",
    "...Ss..ss...",
    "..FFf..FFf..",
    "..LLk..LLk..",
  ],
  monge: [
    "....SSss....",
    "..CCSScddd..",
    ".CCcSscdddd.",
    "SCcc.SccddS.",
    "SKcccSccddsS",
    "SKRRRRrrqqss",
    "SS.CccRqdd.s",
    "...Cccdcdd..",
    "...Ccd.cdd..",
    "...Ccd.cdd..",
    "...cdd..dd..",
    "..SSs..SSs..",
    "..Sss..Sss..",
  ],
};

// ---------------- ARMAS (desenhadas apontando para cima; o "cabo" fica na última linha) ----------------
export const ARMAS_PX: Record<string, { px: string[]; pega: [number, number] }> = {
  espada: { pega: [2, 10], px: ["..W..", ".WMn.", ".WMn.", ".WMn.", ".WMn.", ".WMn.", ".WMn.", ".MMn.", "GgGgg", "..l..", "..l..", "..g.."] },
  espadona: { pega: [3, 14], px: ["...W...", "..WMn..", "..WMn..", "..WMn..", "..WMn..", "..WMn..", "..WMn..", "..WMn..", "..WMn..", "..WMn..", "..MMn..", "GgGgGgg", "...l...", "...l...", "...l...", "...g..."] },
  machado: { pega: [3, 11], px: ["..MMW.", ".MMmnW", "MMmnnW", "MmnBnW", ".nnB..", "...B..", "...B..", "...b..", "...B..", "...b..", "...B..", "...b.."] },
  machadona: { pega: [4, 14], px: ["MMW..MMW", "MmnWWmmW", "MmmnBnnW", "MmnnBnnW", ".nn.B.n.", "....B...", "....b...", "....B...", "....b...", "....B...", "....b...", "....B...", "....b...", "....B...", "....b..."] },
  rapieira: { pega: [2, 11], px: ["..W..", "..W..", "..M..", "..M..", "..M..", "..M..", "..M..", "..M..", ".GgG.", "GgGgG", ".gGg.", "..l..", "..g.."] },
  adaga: { pega: [1, 6], px: [".W.", "WMn", "WMn", "WMn", "GgG", ".l.", ".g."] },
  cimitarra: { pega: [2, 9], px: ["....W", "...WM", "..WMn", ".WMn.", ".WMn.", ".WMn.", ".MMn.", "GgGgg", "..l..", "..g.."] },
  arco: { pega: [2, 7], px: ["..B..", ".Bb..", "Bb.W.", "B..W.", "B..W.", "B..W.", "B..W.", "Bg.W.", "B..W.", "B..W.", "B..W.", "Bb.W.", ".Bb..", "..B.."] },
  cajado: { pega: [2, 13], px: [".EEE.", "EWEEE", "EEEEE", ".EEE.", "..B..", "..b..", "..B..", "..b..", "..B..", "..b..", "..B..", "..b..", "..B..", "..b..", "..B..", "..b..", "..B.."] },
  maca: { pega: [2, 10], px: [".M.M.", "MMmMn", "MmmnN", "MMmnn", ".nnN.", "..g..", "..B..", "..b..", "..B..", "..b..", "..B..", "..g.."] },
  martelo: { pega: [3, 10], px: ["MMMmnnN", "MmmmnnN", "MmmmnnN", ".nnBnN.", "...B...", "...b...", "...B...", "...b...", "...B...", "...b...", "...B...", "...g..."] },
  "lança": { pega: [1, 13], px: [".W.", "WMn", "WMn", ".Mn", ".R.", ".B.", ".b.", ".B.", ".b.", ".B.", ".b.", ".B.", ".b.", ".B.", ".b."] },
  punhos: { pega: [1, 1], px: ["SS", "Ss"] },
  "alaúde": { pega: [2, 8], px: ["..B..", "..b..", "..B..", "..b..", ".BBb.", "BBbbb", "BxBbb", "BBbbb", ".bbb."] },
  escudo: { pega: [3, 4], px: [".MMMMn.", "MCCcCdn", "MCrRrdn", "MCcRcdn", "MCcRcdn", ".nCcdn.", "..ndn..", "...n..."] },
  foco: { pega: [1, 1], px: [".E.", "EWE", ".E."] },
};

const CORPO_DA_CLASSE: Record<string, string> = {
  guerreiro: "armadura",
  paladino: "armadura",
  barbaro: "barbaro",
  monge: "monge",
  ladino: "couro",
  patrulheiro: "couro",
  bardo: "couro",
  bruxo: "couro",
  mago: "robe",
  feiticeiro: "robe",
  clerigo: "robe",
  druida: "robe",
};

// ---------------- paleta da ficha ----------------
export const paletaDe = (f: Ficha): Record<string, string> => {
  const a = f.aparencia;
  const metal = a.metal ?? (f.classe === "paladino" ? "#c9ced6" : f.classe === "guerreiro" ? "#a8b0ba" : "#9aa3ad");
  const couro = f.classe === "bruxo" ? "#4a3a48" : "#7a4f30";
  const madeira = "#8a5a32";
  const olhos = f.especie === "tiefling" ? "#f2d544" : a.olhos;
  return {
    K: tom(a.pele, 1), S: a.pele, s: tom(a.pele, -1),
    H: tom(a.cabelo, 1), h: a.cabelo, j: tom(a.cabelo, -1),
    C: tom(a.roupa, 1), c: a.roupa, d: tom(a.roupa, -1), D: tom(a.roupa, -2),
    R: tom(a.detalhe, 1), r: a.detalhe, q: tom(a.detalhe, -1),
    M: tom(metal, 1), m: metal, n: tom(metal, -1), N: tom(metal, -2),
    L: tom(couro, 1), l: couro, k: tom(couro, -1),
    G: "#f4d27a", g: "#c8962e",
    B: tom(madeira, 1), b: madeira,
    e: "#1d1820", E: olhos, W: "#fbf7ee", Y: "#ffd84a",
    o: tom(a.pele, -2),
    x: "#1d1820",
    F: "#d8c9a8", f: "#9c8566",
  };
};

const vazia = (): Grade => Array.from({ length: ALT }, () => Array<string | null>(LARG).fill(null));

const carimbar = (g: Grade, p: Parte, pal: Record<string, string>, espelhar = false) => {
  p.px.forEach((linha, dy) => {
    [...linha].forEach((ch, dx) => {
      if (ch === "." || ch === " ") return;
      const cor = pal[ch];
      if (!cor) return;
      const x = espelhar ? p.x + linha.length - 1 - dx : p.x + dx;
      const y = p.y + dy;
      if (x >= 0 && x < LARG && y >= 0 && y < ALT) g[y][x] = cor;
    });
  });
};

// Contorno seletivo: escurece a cor vizinha em vez de usar preto puro (fica mais "pintado").
const contornar = (g: Grade): Grade => {
  const out = g.map((l) => [...l]);
  for (let y = 0; y < ALT; y++)
    for (let x = 0; x < LARG; x++) {
      if (g[y][x]) continue;
      const viz = [g[y - 1]?.[x], g[y + 1]?.[x], g[y]?.[x - 1], g[y]?.[x + 1]].filter(Boolean) as string[];
      if (viz.length) out[y][x] = misturar(viz[0], "#140f1a", 0.82);
    }
  return out;
};

export type Pose = "parado" | "passoA" | "passoB" | "golpe" | "magia" | "dano";

// Monta o corpo inteiro (sem a arma, que é desenhada à parte para poder girar).
export const montarSprite = (f: Ficha, pose: Pose = "parado"): Grade => {
  const pal = paletaDe(f);
  const g = vazia();
  const a = f.aparencia;
  const pequeno = f.especie === "halfling" || f.especie === "gnomo" || f.especie === "anao";
  const corpo = [...CORPOS[CORPO_DA_CLASSE[f.classe]]];
  // espécies pequenas: pernas mais curtas (o corpo desce 2 px)
  const desc = pequeno ? 2 : 0;
  const pernas = pequeno ? [...corpo.slice(0, 8), ...corpo.slice(10)] : corpo;

  const chapeu = chapeuDe(f);
  const cobreCabelo = chapeu && ["elmo", "elmoPluma", "capuz", "capuzBruxo", "chifresBarbaro"].includes(chapeu);

  // 1) cabelo de trás
  if (!cobreCabelo && CABELO_COSTAS[a.estiloCabelo] && f.especie !== "draconato") carimbar(g, { ...CABELO_COSTAS[a.estiloCabelo], y: CABELO_COSTAS[a.estiloCabelo].y + desc }, pal);
  // 2) corpo
  carimbar(g, { x: 6, y: 17 + desc, px: pernas }, pal);
  // 3) cabeça
  if (f.especie === "draconato") carimbar(g, { ...CABECA_DRAGAO, y: CABECA_DRAGAO.y + desc }, pal);
  else {
    carimbar(g, { ...CABECA, y: CABECA.y + desc }, pal);
    if (f.especie === "elfo") carimbar(g, { ...ORELHAS_ELFO, y: ORELHAS_ELFO.y + desc }, pal);
    if (f.especie === "golias") carimbar(g, { ...MARCAS_GOLIAS, y: MARCAS_GOLIAS.y + desc }, pal);
    if (f.especie === "orc") carimbar(g, { ...PRESAS_ORC, y: PRESAS_ORC.y + desc }, pal);
  }
  // 4) cabelo da frente, barba, chapéu
  if (!cobreCabelo && f.especie !== "draconato") {
    const cab = CABELO_FRENTE[a.estiloCabelo] ?? CABELO_FRENTE.curto;
    carimbar(g, { ...cab, y: cab.y + desc }, pal);
  }
  if (a.barba && f.especie !== "draconato") carimbar(g, { ...BARBA, y: BARBA.y + desc }, pal);
  if (f.especie === "tiefling" && !(chapeu === "elmo" || chapeu === "elmoPluma")) carimbar(g, { ...CHIFRES_TIEFLING, y: CHIFRES_TIEFLING.y + desc }, pal);
  if (chapeu) carimbar(g, { ...CHAPEUS[chapeu], y: CHAPEUS[chapeu].y + desc }, pal);

  // poses: passo levanta uma perna; golpe/magia inclinam o tronco
  let out = g;
  if (pose === "passoA" || pose === "passoB") out = levantarPerna(g, pose === "passoA" ? [6, 11] : [12, 17], 25 + desc);
  if (pose === "dano") out = g.map((l) => l.map((c) => (c ? misturar(c, "#ffffff", 0.75) : c)));
  return contornar(out);
};

const levantarPerna = (g: Grade, [x0, x1]: [number, number], yIni: number): Grade => {
  const out = g.map((l) => [...l]);
  for (let y = yIni; y < ALT; y++)
    for (let x = x0; x <= x1; x++) {
      out[y - 1][x] = g[y][x] ?? (y - 1 >= yIni ? null : out[y - 1][x]);
      if (y === ALT - 1) out[y][x] = null;
    }
  return out;
};

// chapéu escolhido de forma estável a partir da ficha (mesmo personagem = mesmo visual)
export const chapeuDe = (f: Ficha): string | null => {
  const sorte = (f.nome.length * 7 + f.id * 13 + f.aparencia.roupa.charCodeAt(2)) % 10;
  switch (f.classe) {
    case "guerreiro":
      return sorte < 6 ? "elmo" : null;
    case "paladino":
      return sorte < 8 ? "elmoPluma" : null;
    case "mago":
      return "chapeuMago";
    case "feiticeiro":
      return "diadema";
    case "bruxo":
      return sorte < 7 ? "capuzBruxo" : null;
    case "druida":
      return "coroaFolhas";
    case "ladino":
      return sorte < 5 ? "capuz" : "mascaraLadino";
    case "patrulheiro":
      return sorte < 7 ? "capuz" : null;
    case "bardo":
      return "chapeuBardo";
    case "barbaro":
      return sorte < 4 ? "chifresBarbaro" : null;
    default:
      return null;
  }
};

// Arma (grade própria) para desenhar girada na mão
export const montarArma = (f: Ficha, qual: "principal" | "escudo" = "principal") => {
  const pal = paletaDe(f);
  const chave = qual === "escudo" ? "escudo" : f.classe === "bardo" && f.id % 2 === 0 ? "alaúde" : f.classe === "feiticeiro" || f.classe === "bruxo" ? "foco" : f.arma.visual;
  const def = ARMAS_PX[chave] ?? ARMAS_PX.espada;
  // foco de magia brilha na cor do tipo da classe
  const palArma = { ...pal };
  if (chave === "foco") {
    palArma.E = f.classe === "bruxo" ? "#9b5de5" : "#ff7a3d";
    palArma.W = "#fff2c8";
  }
  if (chave === "cajado") palArma.E = f.aparencia.detalhe === "#2a2833" ? "#7fd3ff" : tom(f.aparencia.detalhe, 1);
  // 1 px de margem para o contorno
  const w = Math.max(...def.px.map((l) => l.length)) + 2;
  const h = def.px.length + 2;
  const g: Grade = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  def.px.forEach((linha, y) => [...linha].forEach((ch, x) => { if (ch !== "." && palArma[ch]) g[y + 1][x + 1] = palArma[ch]; }));
  // contorno da arma
  const out = g.map((l) => [...l]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (g[y][x]) continue;
      const viz = [g[y - 1]?.[x], g[y + 1]?.[x], g[y]?.[x - 1], g[y]?.[x + 1]].filter(Boolean) as string[];
      if (viz.length) out[y][x] = "#1a1420";
    }
  return { grade: out, pega: [def.pega[0] + 1, def.pega[1] + 1] as [number, number], largura: w, altura: h, chave };
};
