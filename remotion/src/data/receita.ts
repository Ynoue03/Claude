export type ReceitaProps = {
  titulo: string;
  subtitulo: string;
  ingredientes: string[];
  macros: { kcal: number; proteina: number; carbo: number; gordura: number };
  handle: string;
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
};
