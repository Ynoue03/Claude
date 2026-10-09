import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from "@remotion/transitions";

// Transição da marca: a cena que sai sobe e desfoca; a que entra vem de baixo, nítida.
const SoftRiseComponent: React.FC<
  TransitionPresentationComponentProps<Record<string, never>>
> = ({ children, presentationDirection, presentationProgress: p }) => {
  const saindo = presentationDirection === "exiting";
  return (
    <AbsoluteFill
      style={
        saindo
          ? {
              opacity: interpolate(p, [0, 0.8], [1, 0], {
                extrapolateRight: "clamp",
              }),
              translate: `0px ${interpolate(p, [0, 1], [0, -90])}px`,
              scale: interpolate(p, [0, 1], [1, 0.97]),
              filter: `blur(${interpolate(p, [0, 1], [0, 12])}px)`,
            }
          : {
              opacity: interpolate(p, [0.15, 1], [0, 1], {
                extrapolateLeft: "clamp",
              }),
              translate: `0px ${interpolate(p, [0, 1], [110, 0])}px`,
              filter: `blur(${interpolate(p, [0, 1], [10, 0])}px)`,
            }
      }
    >
      {children}
    </AbsoluteFill>
  );
};

export const softRise = (): TransitionPresentation<Record<string, never>> => ({
  component: SoftRiseComponent,
  props: {},
});
