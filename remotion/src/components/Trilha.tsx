import React from "react";
import { Audio } from "@remotion/media";
import { interpolate, staticFile, useVideoConfig } from "remotion";

// Música de fundo (arquivo em public/), com fade de entrada e saída e loop se o vídeo for maior.
// `abaixarEm` (frame): a música recua ~5 dB dali em diante para o fecho (sino) respirar.
export const Trilha: React.FC<{
  arquivo?: string;
  volume?: number;
  abaixarEm?: number;
}> = ({ arquivo, volume = 0.6, abaixarEm }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!arquivo) return null;
  const opts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  return (
    <Audio
      src={staticFile(arquivo)}
      loop
      volume={(f) =>
        interpolate(
          f,
          [0, 0.6 * fps, durationInFrames - 1.6 * fps, durationInFrames - 1],
          [0, volume, volume, 0],
          opts,
        ) *
        (abaixarEm === undefined
          ? 1
          : interpolate(f, [abaixarEm, abaixarEm + 0.4 * fps], [1, 0.55], opts))
      }
    />
  );
};
