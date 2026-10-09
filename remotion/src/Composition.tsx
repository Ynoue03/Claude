import { Composition } from "remotion";
import { vertical } from "./brand";
import { treinoExemplo } from "./data/treino";
import { receitaExemplo } from "./data/receita";
import { TreinoDoDia, treinoDuration } from "./videos/TreinoDoDia";
import { ReceitaFit, receitaDuration } from "./videos/ReceitaFit";

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
