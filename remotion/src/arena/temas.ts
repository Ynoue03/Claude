// Arenas: locais famosos de anime em pixel art top-down. Uma é sorteada pela seed (ou fixada no JSON
// com "arena": "<id>"). O desenho fica em mapa.ts; aqui só os dados de cada tema.
export type Decor = { t: string; x: number; y: number; w?: number; h?: number; lado?: number; cor?: string };

export type Tema = {
  id: string;
  nome: string; // aparece no banner de abertura e no HUD
  anime: string;
  fundo: "agua" | "abismo" | "campo" | "cidade" | "estadio";
  agua?: [string, string, string]; // base, onda clara, onda escura
  ceu?: [string, string]; // abismo: céu e nuvem
  chao: { tipo: "grama" | "pedra" | "asfalto" | "concreto" | "areia"; cores: [string, string, string, string] };
  penhasco?: [string, string, string];
  plataforma: {
    forma: "octogono" | "quadrado" | "circulo";
    cores: [string, string, string, string, string];
    degrau: string;
    contorno: string;
    ladrilho?: string;
    faixas?: string;
  };
  centro: "pedra" | "pilar" | "estatua-cao" | "escombros" | "nada";
  decor: Decor[];
  arvore?: [string, string, string, string];
  flores?: boolean;
  particulas?: { tipo: "folhas" | "petalas" | "neve" | "brasas" | "cinzas"; cores: string[]; n: number };
  noite?: number; // opacidade do "filtro noturno"
  luzes?: [number, number, number, string][]; // x, y, raio, cor
  cachoeira?: boolean;
  tinta?: string; // leve tom de cor sobre o cenário (rgba)
};

const PEDRA_CINZA: Tema["plataforma"] = {
  forma: "octogono",
  cores: ["#8E949C", "#A2A8B0", "#B2B8C0", "#C0C6CC", "#CDD2D8"],
  degrau: "#6E747E",
  contorno: "#4E545E",
};

export const TEMAS: Tema[] = [
  {
    id: "vale-do-fim",
    nome: "VALLEY OF THE END",
    anime: "Naruto",
    fundo: "agua",
    agua: ["#2A7EC0", "#7CC4F0", "#2468A8"],
    chao: { tipo: "grama", cores: ["#4E9A46", "#43883C", "#66B058", "#7CC66A"] },
    penhasco: ["#7A6A58", "#8E9096", "#5E626A"],
    plataforma: PEDRA_CINZA,
    centro: "pedra",
    decor: [
      { t: "estatua", x: 24, y: 214, lado: 1, cor: "#9A9AA0" },
      { t: "estatua", x: 246, y: 214, lado: -1, cor: "#8E9488" },
      { t: "arvore", x: 26, y: 140 }, { t: "arvore", x: 244, y: 140 },
      { t: "arvore", x: 22, y: 402 }, { t: "arvore", x: 248, y: 402 },
      { t: "rocha", x: 30, y: 330 }, { t: "rocha", x: 240, y: 340 },
    ],
    arvore: ["#1F4F2A", "#2E6B34", "#3F8A44", "#7CC46E"],
    flores: true,
    cachoeira: true,
    particulas: { tipo: "folhas", cores: ["#5FA84A", "#8CC85A", "#C8A040"], n: 18 },
  },
  {
    id: "budokai",
    nome: "WORLD MARTIAL ARTS TOURNAMENT",
    anime: "Dragon Ball",
    fundo: "campo",
    chao: { tipo: "grama", cores: ["#5DA94A", "#4F9A40", "#72BE5A", "#86CF6A"] },
    plataforma: {
      forma: "quadrado",
      cores: ["#C8C0B0", "#E2DCD0", "#E8E2D6", "#ECE6DA", "#F0EAE0"],
      degrau: "#A8A090",
      contorno: "#6E6658",
      ladrilho: "#B8B0A0",
    },
    centro: "nada",
    decor: [
      { t: "telhado", x: 40, y: 132, cor: "#C8302A" }, { t: "telhado", x: 230, y: 132, cor: "#C8302A" },
      { t: "palmeira", x: 14, y: 250 }, { t: "palmeira", x: 256, y: 300 },
      { t: "palmeira", x: 18, y: 404 }, { t: "palmeira", x: 252, y: 404 },
      { t: "bandeira", x: 14, y: 172, cor: "#F2C230" }, { t: "bandeira", x: 256, y: 172, cor: "#F2C230" },
    ],
    arvore: ["#1F5A2A", "#2E7A34", "#46A040", "#8AD86E"],
    flores: true,
  },
  {
    id: "marineford",
    nome: "MARINEFORD",
    anime: "One Piece",
    fundo: "agua",
    agua: ["#1E5EA8", "#5EA4E0", "#184C8C"],
    chao: { tipo: "pedra", cores: ["#B8AE9C", "#A49A88", "#CCC2B0", "#DCD4C4"] },
    penhasco: ["#8A8478", "#6E6A62", "#54504A"],
    plataforma: {
      forma: "octogono",
      cores: ["#A8A08E", "#C2BAA6", "#CEC6B2", "#D8D0BE", "#E2DACA"],
      degrau: "#8A826E",
      contorno: "#5A5446",
      ladrilho: "#B4AC98",
    },
    centro: "escombros",
    decor: [
      { t: "gelo", x: 20, y: 70 }, { t: "gelo", x: 236, y: 92 }, { t: "gelo", x: 40, y: 446 }, { t: "gelo", x: 226, y: 452 },
      { t: "pilar-quebrado", x: 28, y: 150 }, { t: "pilar-quebrado", x: 242, y: 156 },
      { t: "pilar-quebrado", x: 24, y: 300 }, { t: "pilar-quebrado", x: 246, y: 250 },
      { t: "bandeira", x: 30, y: 398, cor: "#F4F4F8" }, { t: "bandeira", x: 240, y: 398, cor: "#F4F4F8" },
    ],
    particulas: { tipo: "neve", cores: ["#FFFFFF", "#D8F0FF"], n: 40 },
  },
  {
    id: "shibuya",
    nome: "SHIBUYA",
    anime: "Jujutsu Kaisen",
    fundo: "cidade",
    chao: { tipo: "asfalto", cores: ["#3A3C46", "#33353E", "#44464F", "#55575F"] },
    plataforma: {
      forma: "quadrado",
      cores: ["#40424C", "#46484F", "#46484F", "#46484F", "#46484F"],
      degrau: "#2A2C34",
      contorno: "#1E2026",
      faixas: "#E8E8EC",
    },
    centro: "estatua-cao",
    decor: [
      { t: "predio", x: 0, y: 112, w: 70, h: 40, cor: "#2A2E44" }, { t: "predio", x: 200, y: 112, w: 70, h: 40, cor: "#3A2E44" },
      { t: "predio", x: 0, y: 400, w: 60, h: 30, cor: "#2E3448" }, { t: "predio", x: 210, y: 400, w: 60, h: 30, cor: "#342A3E" },
      { t: "poste", x: 20, y: 220 }, { t: "poste", x: 250, y: 220 }, { t: "poste", x: 20, y: 340 }, { t: "poste", x: 250, y: 340 },
    ],
    noite: 0.42,
    luzes: [[20, 200, 16, "#FFD890"], [250, 200, 16, "#FFD890"], [20, 320, 16, "#FFD890"], [250, 320, 16, "#FFD890"],
      [135, 262, 60, "#8AB8FF"]],
    particulas: { tipo: "cinzas", cores: ["#8A8A94", "#B0B0B8", "#5A5A64"], n: 30 },
  },
  {
    id: "sokyoku",
    nome: "SOKYOKU HILL",
    anime: "Bleach",
    fundo: "abismo",
    ceu: ["#8CC8F0", "#F4FAFF"],
    chao: { tipo: "pedra", cores: ["#D8D2C4", "#C4BEB0", "#E6E0D4", "#F0ECE2"] },
    penhasco: ["#B8AE9C", "#9A9282", "#7A7466"],
    plataforma: {
      forma: "circulo",
      cores: ["#C8C2B4", "#E0DACE", "#E8E2D8", "#EEE8DE", "#F4F0E8"],
      degrau: "#A8A294",
      contorno: "#6E685C",
      ladrilho: "#D0CABC",
    },
    centro: "pilar",
    decor: [
      { t: "sokyoku", x: 135, y: 140 },
      { t: "rocha", x: 30, y: 200 }, { t: "rocha", x: 240, y: 230 }, { t: "rocha", x: 36, y: 380 }, { t: "rocha", x: 236, y: 390 },
      { t: "cerejeira", x: 24, y: 300 }, { t: "cerejeira", x: 248, y: 320 },
    ],
    arvore: ["#B04A78", "#D86A98", "#F09AC0", "#FFD8E8"],
    particulas: { tipo: "petalas", cores: ["#F8A8C8", "#FFD0E0", "#E880A8"], n: 34 },
  },
  {
    id: "trem-infinito",
    nome: "MUGEN TRAIN",
    anime: "Demon Slayer",
    fundo: "campo",
    chao: { tipo: "grama", cores: ["#3E6A40", "#345C38", "#4A7A48", "#5A8A54"] },
    plataforma: {
      forma: "circulo",
      cores: ["#7A6248", "#8A7054", "#94785A", "#9C8060", "#A48866"],
      degrau: "#5E4A36",
      contorno: "#3E3024",
    },
    centro: "pedra",
    decor: [
      { t: "trilho", x: 0, y: 128 }, { t: "trem", x: 4, y: 122 },
      { t: "arvore", x: 18, y: 260 }, { t: "arvore", x: 252, y: 230 }, { t: "arvore", x: 24, y: 404 }, { t: "arvore", x: 246, y: 404 },
    ],
    arvore: ["#12301E", "#1E4428", "#2A5A34", "#4A7A48"],
    flores: true,
    noite: 0.38,
    luzes: [[30, 124, 14, "#FFC870"], [80, 124, 14, "#FFC870"], [130, 124, 14, "#FFC870"], [180, 124, 14, "#FFC870"], [230, 124, 14, "#FFC870"],
      [135, 262, 70, "#FFB070"]],
    particulas: { tipo: "brasas", cores: ["#FF8A1A", "#FFD040", "#FF5A1A"], n: 28 },
  },
  {
    id: "ua-festival",
    nome: "U.A. SPORTS FESTIVAL",
    anime: "My Hero Academia",
    fundo: "estadio",
    chao: { tipo: "concreto", cores: ["#6E7A88", "#647080", "#7A8694", "#8A96A4"] },
    plataforma: {
      forma: "quadrado",
      cores: ["#A8AEB6", "#C2C8CE", "#CAD0D6", "#D2D8DE", "#DAE0E6"],
      degrau: "#8A9098",
      contorno: "#4E545C",
      ladrilho: "#AEB4BC",
    },
    centro: "nada",
    decor: [],
  },
  {
    id: "namek",
    nome: "PLANET NAMEK",
    anime: "Dragon Ball",
    fundo: "agua",
    agua: ["#2E9A80", "#7AD8B8", "#24806A"],
    chao: { tipo: "grama", cores: ["#5AAE8A", "#4C9A78", "#70C29C", "#8AD6B0"] },
    penhasco: ["#7A8A5A", "#6A7A50", "#4E5A3A"],
    plataforma: {
      forma: "octogono",
      cores: ["#9AA478", "#B0B88A", "#BCC496", "#C8CEA2", "#D2D8AE"],
      degrau: "#7A8460",
      contorno: "#4E5A3A",
    },
    centro: "pedra",
    decor: [
      { t: "ajisa", x: 24, y: 150 }, { t: "ajisa", x: 246, y: 150 }, { t: "ajisa", x: 16, y: 280 },
      { t: "ajisa", x: 254, y: 300 }, { t: "ajisa", x: 26, y: 404 }, { t: "ajisa", x: 244, y: 404 },
    ],
    arvore: ["#2A6A7A", "#3A8A9A", "#5AAAB8", "#9ADCE4"],
    tinta: "rgba(200,230,120,0.07)",
  },
];
