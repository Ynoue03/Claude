import React from "react";
import { lightLeak } from "@remotion/effects/light-leak";
import { AbsoluteFill, interpolate, Sequence, Solid, useCurrentFrame, useVideoConfig } from "remotion";

// Vazamento de luz quente sobre o corte — usado em <TransitionSeries.Overlay>.
export const LightLeak: React.FC<{ seed?: number }> = ({ seed = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, height, width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.55 }}>
      <Solid
        width={width}
        height={height}
        effects={[
          lightLeak({
            seed,
            hueShift: 20,
            progress: interpolate(frame, [0, durationInFrames - 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }),
        ]}
      />
    </AbsoluteFill>
  );
};

// Um light leak centralizado em cada troca de cena.
export const Vazamentos: React.FC<{ inicios: number[]; duracao: number }> = ({ inicios, duracao }) => {
  const { fps } = useVideoConfig();
  const largura = Math.round(duracao + 0.6 * fps);
  return (
    <>
      {inicios.slice(1).map((f, i) => (
        <Sequence
          key={f}
          from={Math.max(0, f + Math.round(duracao / 2) - Math.round(largura / 2))}
          durationInFrames={largura}
          premountFor={fps}
        >
          <LightLeak seed={i + 2} />
        </Sequence>
      ))}
    </>
  );
};
