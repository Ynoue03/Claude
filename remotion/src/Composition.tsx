import { Composition } from "remotion";
import { vertical } from "./brand";
import { treinoExemplo } from "./data/treino";
import { receitaExemplo } from "./data/receita";
import { TreinoDoDia, treinoDuration } from "./videos/TreinoDoDia";
import { ReceitaFit, receitaDuration } from "./videos/ReceitaFit";
import { ArenaD20, ArenaProps } from "./videos/ArenaD20";
import episodio1 from "./arena/episodios/episodio-1.json";
import { Episodio } from "./arena/episodio";

// A duração é calculada a partir dos dados (mais exercícios = vídeo mais longo).
export const TreinoComposition = () => (
  <Composition
    id="TreinoDoDia"
    component={TreinoDoDia}
    durationInFrames={treinoDuration(treinoExemplo, vertical.fps)}
    fps={vertical.fps}
    width={vertical.width}
    height={vertical.height}
    defaultProps={treinoExemplo}
    calculateMetadata={({ props }) => ({
      durationInFrames: treinoDuration(props, vertical.fps),
    })}
  />
);

export const ReceitaComposition = () => (
  <Composition
    id="ReceitaFit"
    component={ReceitaFit}
    durationInFrames={receitaDuration(receitaExemplo, vertical.fps)}
    fps={vertical.fps}
    width={vertical.width}
    height={vertical.height}
    defaultProps={receitaExemplo}
    calculateMetadata={({ props }) => ({
      durationInFrames: receitaDuration(props, vertical.fps),
    })}
  />
);

// ARENA D20: 90 s fixos; troque o episódio passando outro JSON em --props
export const ArenaComposition = () => (
  <Composition
    id="ArenaD20"
    component={ArenaD20}
    durationInFrames={2700}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ episodio: episodio1 as unknown as Episodio, audio: "arena/episodio-1.wav" } satisfies ArenaProps}
  />
);
