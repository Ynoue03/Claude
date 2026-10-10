import React from "react";
import { Composition } from "remotion";
import { Arena, calcularDuracao, PropsArena } from "./Arena";

const exemplo: PropsArena = {
  semente: 42,
  titulo: "ARENA D20",
  perfil: "@arenad20",
  lutadores: [],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Arena"
    component={Arena}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={900}
    defaultProps={exemplo}
    calculateMetadata={calcularDuracao}
  />
);
