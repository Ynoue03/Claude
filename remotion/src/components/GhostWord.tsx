import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, fonts } from "../brand";

// Palavra gigante e translúcida ao fundo, deslizando devagar — camada editorial.
export const GhostWord: React.FC<{ text: string; color: string; top?: number }> = ({
  text,
  color,
  top = 1180,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          whiteSpace: "nowrap",
          fontFamily: fonts.display,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 560,
          lineHeight: 1,
          color,
          opacity: interpolate(frame, [0, 1.2 * fps], [0, 0.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease.out,
          }),
          translate: `${interpolate(frame, [0, 6 * fps], [60, -220])}px 0px`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
