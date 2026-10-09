export type ReceitaProps = {
  titulo: string;
  subtitulo: string;
  ingredientes: string[];
  macros: { kcal: number; proteina: number; carbo: number; gordura: number };
  handle: string;
  musica?: string; // arquivo em public/ (trilhas prontas em public/audio/musica/)
  musicaVolume?: number; // 0–1, padrão 0.6
  sfx?: boolean; // efeitos sonoros (padrão: ligado)
};

export const receitaExemplo: ReceitaProps = {
  titulo: "Bowl de frango com quinoa",
  subtitulo: "15 min · 1 porção",
  ingredientes: [
    "120 g de frango grelhado",
    "80 g de quinoa cozida",
    "½ abacate",
    "Tomate-cereja e rúcula",
    "Fio de azeite e limão",
  ],
  macros: { kcal: 520, proteina: 42, carbo: 38, gordura: 21 },
  handle: "@seuperfil",
  musica: "audio/musica/receita-lofi.wav",
};
