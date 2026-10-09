import React from "react";
import { Audio } from "@remotion/media";
import { interpolate, staticFile, useVideoConfig } from "remotion";

// Música opcional (arquivo em public/), com fade de entrada e saída.
export const Trilha: React.FC<{ arquivo?: string }> = ({ arquivo }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!arquivo) return null;
  return (
    <Audio
      src={staticFile(arquivo)}
      volume={(f) =>
        interpolate(f, [0, 0.8 * fps, durationInFrames - 1.2 * fps, durationInFrames], [0, 0.8, 0.8, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};
