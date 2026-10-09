export type TreinoProps = {
  titulo: string;
  subtitulo: string;
  exercicios: { nome: string; series: string }[];
  dica: string;
  dicaDestaque?: string; // trecho da dica sublinhado à mão
  musica?: string; // arquivo em public/ (trilhas prontas em public/audio/musica/)
  musicaVolume?: number; // 0–1, padrão 0.6
  sfx?: boolean; // efeitos sonoros (padrão: ligado)
  handle: string;
};

export const treinoExemplo: TreinoProps = {
  titulo: "Glúteos & Posterior",
  subtitulo: "45 min · intermediário",
  exercicios: [
    { nome: "Elevação pélvica", series: "4 × 12" },
    { nome: "Stiff com halteres", series: "4 × 10" },
    { nome: "Búlgaro", series: "3 × 10 cada" },
    { nome: "Cadeira flexora", series: "3 × 15" },
    { nome: "Abdução na polia", series: "3 × 15" },
  ],
  dica: "Controle a descida. Três segundos em cada repetição.",
  dicaDestaque: "Três segundos",
  handle: "@seuperfil",
  musica: "audio/musica/treino-house.wav",
};
