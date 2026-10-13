// Itens mágicos do baú (episódios 5, 10, 15…): 9 tipos × 3 versões, cada uma com um poder na luta.
// O campeão guarda os itens enquanto vencer; quem derrubar o portador pega os itens dele.
export type TipoItem = "espada" | "armadura" | "elmo" | "botas" | "luvas" | "capa" | "arco" | "machado" | "escudo" | "cajado";
export const TIPOS: TipoItem[] = ["espada", "armadura", "elmo", "botas", "luvas", "capa", "arco", "machado", "escudo", "cajado"];

// Cada estilo de luta só pega equipamento do seu jeito de lutar:
// quem luta à distância (conjuradores, patrulheiro, ladino com arco) não usa espada, machado nem escudo;
// quem luta corpo a corpo não usa cajado nem arco. Armadura, elmo, botas, luvas e capa servem para todos.
const SO_CORPO: TipoItem[] = ["espada", "machado", "escudo"];
const SO_DISTANCIA: TipoItem[] = ["cajado", "arco"];
export const podeUsar = (id: ItemId, distancia: boolean) => !(distancia ? SO_CORPO : SO_DISTANCIA).includes(ITENS[id].tipo);

// 3 versões de cada tipo, cada uma com um poder diferente (o campeão só carrega 1 item de cada tipo)
export type ItemId =
  | "espadaRubra"
  | "espadaVampira"
  | "espadaGelo"
  | "armaduraBastiao"
  | "armaduraEspinhos"
  | "armaduraRunica"
  | "elmoUltimaChance"
  | "elmoVigia"
  | "elmoMente"
  | "botasLigeiras"
  | "botasFirmes"
  | "botasEsquiva"
  | "luvasCerteiras"
  | "luvasPrecisas"
  | "luvasTrovao"
  | "capaSombras"
  | "capaDeslocamento"
  | "capaCurativa"
  | "arcoSussurrante"
  | "arcoChamas"
  | "arcoCacador"
  | "machadoCeifador"
  | "machadoBerserker"
  | "machadoFendedor"
  | "escudoPrimeiroGolpe"
  | "escudoEspelhado"
  | "escudoGuardiao"
  | "cajadoArcano"
  | "cajadoSabedoria"
  | "cajadoRenovacao";

export type Item = { id: ItemId; tipo: TipoItem; nome: string; poder: string; cor: string };

const I = (id: ItemId, tipo: TipoItem, nome: string, poder: string, cor: string): Item => ({ id, tipo, nome, poder, cor });
export const ITENS: Record<ItemId, Item> = {
  espadaRubra: I("espadaRubra", "espada", "Lâmina Rubra", "o primeiro acerto de cada turno causa +1d6 de dano", "#e04a4a"),
  espadaVampira: I("espadaVampira", "espada", "Lâmina Vampira", "cada acerto recupera 1d4 PV", "#8a2a5a"),
  espadaGelo: I("espadaGelo", "espada", "Lâmina do Inverno", "cada acerto deixa o alvo lento (−10 pés)", "#6ad0f0"),
  armaduraBastiao: I("armaduraBastiao", "armadura", "Couraça do Bastião", "+2 na CA", "#9aa8c0"),
  armaduraEspinhos: I("armaduraEspinhos", "armadura", "Cota de Espinhos", "quem acerta um golpe corpo a corpo leva 1d4 de volta", "#7a8a4a"),
  armaduraRunica: I("armaduraRunica", "armadura", "Armadura Rúnica", "magias causam só metade do dano", "#5a7ae0"),
  elmoUltimaChance: I("elmoUltimaChance", "elmo", "Elmo da Última Chance", "engana a morte: quando cairia, volta com 1 PV (1× por luta)", "#e8c040"),
  elmoVigia: I("elmoVigia", "elmo", "Elmo do Vigia", "+5 na iniciativa: age antes de quase todos", "#c0c8d0"),
  elmoMente: I("elmoMente", "elmo", "Elmo da Mente Firme", "vantagem em todas as salvaguardas", "#b07ae0"),
  botasLigeiras: I("botasLigeiras", "botas", "Botas Ligeiras", "+10 pés de deslocamento e não provoca ataque de oportunidade", "#5ab0e0"),
  botasFirmes: I("botasFirmes", "botas", "Botas de Raiz", "não pode ser empurrado nem puxado, e +1 na CA", "#7a5a3a"),
  botasEsquiva: I("botasEsquiva", "botas", "Botas do Vento", "+3 na CA contra flechas, raios e magias de ataque", "#a0e0d0"),
  luvasCerteiras: I("luvasCerteiras", "luvas", "Manoplas Certeiras", "crítico com 1 número a menos no d20", "#e09a40"),
  luvasPrecisas: I("luvasPrecisas", "luvas", "Luvas da Precisão", "+2 em todas as jogadas de ataque", "#e0e070"),
  luvasTrovao: I("luvasTrovao", "luvas", "Manoplas do Trovão", "acertos críticos causam +2d8 de dano trovejante", "#4a6ae0"),
  capaSombras: I("capaSombras", "capa", "Capa das Sombras", "ao ficar com metade dos PV, fica invisível por 2 turnos", "#8a5ae0"),
  capaDeslocamento: I("capaDeslocamento", "capa", "Capa da Miragem", "o primeiro ataque contra ele em cada rodada tem desvantagem", "#5ac0c0"),
  capaCurativa: I("capaCurativa", "capa", "Capa da Seiva", "recupera 2 PV no início de cada turno", "#5ac05a"),
  arcoSussurrante: I("arcoSussurrante", "arco", "Arco Sussurrante", "dispara sozinho uma flecha (1d6) a cada turno", "#7ac050"),
  arcoChamas: I("arcoChamas", "arco", "Arco das Chamas", "ataques à distância causam +1d6 de fogo", "#f07a2a"),
  arcoCacador: I("arcoCacador", "arco", "Arco do Caçador", "vantagem contra quem está com metade dos PV ou menos", "#3a8a4a"),
  machadoCeifador: I("machadoCeifador", "machado", "Machado Ceifador", "ao derrubar alguém, recupera 1d8 PV", "#c0703a"),
  machadoBerserker: I("machadoBerserker", "machado", "Machado da Ira", "+1d6 de dano enquanto estiver com metade dos PV ou menos", "#c02a2a"),
  machadoFendedor: I("machadoFendedor", "machado", "Machado Fendedor", "ignora resistências: o dano nunca cai pela metade", "#a0a0b0"),
  escudoPrimeiroGolpe: I("escudoPrimeiroGolpe", "escudo", "Escudo do Primeiro Golpe", "bloqueia o primeiro ataque que causaria dano", "#5ad0a0"),
  escudoEspelhado: I("escudoEspelhado", "escudo", "Escudo Espelhado", "devolve metade do dano de magias de ataque a quem lançou", "#d0e0f0"),
  escudoGuardiao: I("escudoGuardiao", "escudo", "Escudo Guardião", "+1 na CA e todo dano recebido cai 2", "#e0b060"),
  cajadoArcano: I("cajadoArcano", "cajado", "Cajado Arcano", "magias de ataque causam +1d6 de dano", "#d23ab4"),
  cajadoSabedoria: I("cajadoSabedoria", "cajado", "Cajado da Sabedoria", "+2 na CD das magias: fica mais difícil resistir", "#6a8af0"),
  cajadoRenovacao: I("cajadoRenovacao", "cajado", "Cajado da Renovação", "recupera um espaço de magia a cada 2 rodadas", "#5ad08a"),
};
export const ITEM_IDS = Object.keys(ITENS) as ItemId[];
export const tipoDe = (id: ItemId) => ITENS[id].tipo;

// Ícones 16×16 em pixel art (. vazio, k contorno, a cor do item, b clara, c escura, m metal, w madeira, g ouro)
const ICONES: Record<TipoItem, string[]> = {
  espada: [
    "............kk..",
    "...........kmbk.",
    "..........kmbk..",
    ".........kmbk...",
    "........kmbk....",
    ".......kmbk.....",
    "......kmbk......",
    "..k..kmbk.......",
    "..kgkmbk........",
    "...kgbk.........",
    "...kagk.........",
    "..kaakgk........",
    ".kaak.kgk.......",
    ".kak...k........",
    "..k.............",
    "................",
  ],
  armadura: [
    "................",
    "..kkk.....kkk...",
    ".kmmmk...kmmmk..",
    ".kmbmmkkkmmcmk..",
    ".kmbmmmmmmmcmk..",
    "..kkmbmmmmcmk...",
    "...kmbmaamcmk...",
    "...kmbaaaacmk...",
    "...kmbmaamcmk...",
    "...kmbmmmmcmk...",
    "...kggggggggk...",
    "...kmbmmmmcmk...",
    "...kmbmmmmcmk...",
    "....kmmmmmmk....",
    ".....kkkkkk.....",
    "................",
  ],
  elmo: [
    "................",
    ".......kk.......",
    "......kaak......",
    ".....kkaakk.....",
    "....kmbmmmmk....",
    "...kmbmmmmmck...",
    "...kmbmmmmmck...",
    "...kmbmmmmmck...",
    "...kkkkkkkkkk...",
    "...kmkbgkbgmk...",
    "...kmkkkkkkmk...",
    "...kmbmkkmmck...",
    "...kmbmkkmmck...",
    "....kmmkkmck....",
    ".....kk..kk.....",
    "................",
  ],
  botas: [
    "................",
    "................",
    "...kkkk.........",
    "...kabk.........",
    "...kabk...kkkk..",
    "...kabk...kabk..",
    "...kabk...kabk..",
    "...kgggk..kabk..",
    "...kabck..kgggk.",
    "...kabcck.kabck.",
    "...kabcaak.kabcck",
    "...kkkkkkk.kabcaak",
    "...........kkkkkkk",
    "................",
    "................",
    "................",
  ],
  luvas: [
    "................",
    "......kkkk......",
    ".....kmbmmk.....",
    "....kkmbmmkk....",
    "...kmkmbmmkmk...",
    "...kmkmbmmkmk...",
    "...kmkmbmmkmkk..",
    "...kmmmbmmmmmmk.",
    "...kmmmmmmmmck..",
    "...kmbmmmmmmck..",
    "....kmbmmmmck...",
    "....kggggggk....",
    "....kaaaaaak....",
    "....kaaaaaak....",
    ".....kkkkkk.....",
    "................",
  ],
  capa: [
    "................",
    ".....kkkkkk.....",
    "....kggkkggk....",
    "....kabbbbak....",
    "...kabaaaaack...",
    "...kabaaaaack...",
    "..kabaaaaaaack..",
    "..kabaaaaaaack..",
    "..kabaacaaaack..",
    ".kabaaacaaaaack.",
    ".kabaaacaaaaack.",
    ".kabaaacaaaaack.",
    "kabaaaacaaaaaack",
    "kkakkaakkaakkakk",
    "..k...k...k..k..",
    "................",
  ],
  arco: [
    "................",
    "......kk........",
    ".....kwbk.......",
    "....kwk.k.......",
    "...kwk...k......",
    "...kwk....k.....",
    "..kwk......k....",
    "..kak......k....",
    "..kak......k....",
    "..kwk......k....",
    "...kwk....k.....",
    "...kwk...k......",
    "....kwk.k.......",
    ".....kwbk.......",
    "......kk........",
    "................",
  ],
  machado: [
    "................",
    "........kkkk....",
    ".......kmbmmk...",
    "......kmbmmmmk..",
    ".....kkmbmmmmck.",
    "....kwkkmbmmck..",
    "...kwk..kmmck...",
    "..kwk....kkk....",
    "..kwk...........",
    ".kwk............",
    ".kak............",
    "kwk.............",
    "kwk.............",
    "kk..............",
    "................",
    "................",
  ],
  cajado: [
    "................",
    "..........kk....",
    ".........kbak...",
    "........kbaaak..",
    ".........kaak...",
    "........kwkk....",
    ".......kwk......",
    "......kwk.......",
    ".....kwk........",
    "....kwk.........",
    "...kwk..........",
    "..kwk...........",
    ".kwk............",
    ".kk.............",
    "................",
    "................",
  ],
  escudo: [
    "................",
    "..kkkkkkkkkkkk..",
    "..kmmmmmmmmmmk..",
    "..kmaaaaaaaamk..",
    "..kmabaggaacmk..",
    "..kmabaggaacmk..",
    "..kmaggggggcmk..",
    "..kmaggggggcmk..",
    "..kmabaggaacmk..",
    "...kmbaggacmk...",
    "...kmaaaaacmk...",
    "....kmaaacmk....",
    ".....kmaamk.....",
    "......kmmk......",
    ".......kk.......",
    "................",
  ],
};

const clarear = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

// desenha o ícone de um item com o canto superior esquerdo em (x, y), ampliado `esc` vezes
export const desenharIcone = (ctx: CanvasRenderingContext2D, id: ItemId, x: number, y: number, esc = 1) => {
  const item = ITENS[id];
  const pal: Record<string, string> = {
    k: "#1a1014",
    a: item.cor,
    b: clarear(item.cor, 0.45),
    c: clarear(item.cor, -0.35),
    m: "#b8c0cc",
    w: "#8a5c36",
    g: "#e8c040",
  };
  ICONES[item.tipo].forEach((row, ry) =>
    [...row].forEach((ch, rx) => {
      if (ch === "." || rx > 15) return;
      ctx.fillStyle = pal[ch] ?? "#fff";
      ctx.fillRect(Math.round(x + rx * esc), Math.round(y + ry * esc), esc, esc);
    }),
  );
};
