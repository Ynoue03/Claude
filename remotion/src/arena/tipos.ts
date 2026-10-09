// Tipos do episódio "ANIME PIXEL ARENA" — tudo que muda de um episódio para outro vem daqui (JSON).

export type Efeito =
  | "esfera" // esfera girando na mão + estouro (Rasengan)
  | "clones" // cópias do lutador avançam (Shadow Clone)
  | "raio" // investida com rastro de raio (Chidori, Thunderclap, Godspeed)
  | "chamas" // jato de chamas que queimam o alvo (Amaterasu, Flashfire)
  | "feixe" // carrega e dispara um feixe (Kamehameha, Galick Gun, Final Flash)
  | "bomba" // esfera gigante sobe e cai no alvo (Spirit Bomb)
  | "elastico" // braço estica até o alvo (Gomu Gomu Pistol)
  | "aura" // aura de vapor + investida (Gear Second)
  | "corte" // cortes cruzados no alvo (Onigiri, Santoryu)
  | "arco" // arco de elemento ao redor do alvo (Water Breathing, Hinokami)
  | "onda" // meia-lua que viaja (Getsuga Tensho)
  | "projetil" // esfera que viaja deixando rastro (Hollow Purple)
  | "escudo" // bolha que reduz o dano recebido (Infinity)
  | "soco" // investida + estouro de impacto (Detroit Smash, Black Flash, Jajanken)
  | "explosao" // gira e explode no alvo (Howitzer Impact)
  | "gelo"; // trilha de cristais que congela (Ice Wall)

export type Status = "BRN" | "PAR" | "FRZ";

export type SomGolpe =
  | "feixe"
  | "explosao"
  | "corte"
  | "agua"
  | "raio"
  | "gelo"
  | "fogo"
  | "soco"
  | "esfera"
  | "escudo";

export type Golpe = {
  nome: string;
  cor: string; // fundo da caixa e cor principal do efeito
  cor2?: string; // cor secundária do efeito
  efeito: Efeito;
  alcance: number; // px (resolução interna 270×480)
  dano: number;
  recarga: number; // segundos
  status?: Status;
  som: SomGolpe;
  especial?: boolean; // tremor de tela no impacto
  area?: number; // raio de dano em área (px)
  linha?: string; // cor do "braço" no efeito elastico (corrente, chiclete…); padrão = pele
};

export type Visual = {
  penteado: string; // chave de penteados.ts (ou use `mascara`)
  mascara?: string[]; // penteado próprio: linhas de 24 caracteres (# - + o r m w k .)
  pele: string;
  cabelo: string;
  cabelo2?: string; // pontas / metade / raspado
  olhos: string;
  olhos2?: string; // heterocromia
  roupa: string; // tronco
  mangas?: string; // cor das mangas ("pele" = sem manga)
  centro?: string; // faixa central (camiseta por baixo do casaco)
  decote?: string; // V do decote
  ombros?: string;
  cinto?: string;
  padrao?: "xadrez" | "triangulos" | "x" | "chamas" | "escamas";
  padraoCor?: string;
  luvas?: string;
  calca: string;
  shorts?: boolean;
  sapato: string;
  acessorioCor?: string; // 'o' na máscara (bandana, chapéu)
  acessorioCor2?: string; // 'r' na máscara
  capa?: string; // casaco longo / capa atrás do corpo
  acessorios?: string[]; // mascara-boca, tatuagem, kanji-testa, cachecol, bigodes, sardas, cicatriz-olho, cicatriz-queimadura, cicatriz-testa, brincos, brincos-hanafuda, katana, tres-katanas, espada-grande, manoplas
};

export type Lutador = {
  id: string;
  nome: string;
  anime: string;
  poder?: number; // 1–10, força no cânone: define HP/dano e a chance de ir longe na luta
  hp?: number; // opcional: calculado pelo poder
  velocidade?: number; // px por quadro (padrão 0,82)
  dano?: number; // multiplicador (opcional: calculado pelo poder)
  visual: Visual;
  golpes: Golpe[];
};

export type Textos = {
  escolha: string;
  luta: string;
  derrota: string;
  vencedor: string;
  vivos: string;
  cta: string[];
};

export type Episodio = {
  titulo: string;
  seed: number;
  vencedor?: string | null; // id ou nome; vazio = definido pela seed
  perfil: string;
  textos: Textos;
  audio?: string | null; // arquivo em public/ (gerado por scripts/arena.sh)
  arena?: string; // id do tema (temas.ts) ou "aleatoria" (sorteada pela seed)
  sorteio?: Sorteio; // usado quando `lutadores` está vazio
  lutadores?: Lutador[]; // elenco fixo (vazio = sorteio no elenco.json)
};

export type Sorteio = {
  quantidade?: number; // padrão 16 (2 a 16)
  maxPorAnime?: number; // padrão 2
  animes?: string[]; // limitar a estes animes (ex.: ["Dragon Ball"])
  incluir?: string[]; // ids que entram sempre
  excluir?: string[];
};

// Episódio resolvido: elenco sorteado, atributos calculados, tema escolhido.
export type LutadorPronto = Lutador & { poder: number; hp: number; velocidade: number; dano: number };
export type EpisodioPronto = Omit<Episodio, "lutadores"> & {
  lutadores: LutadorPronto[];
  tema: string;
  obstaculo: boolean;
};
