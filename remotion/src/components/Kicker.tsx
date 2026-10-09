import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, ease, fonts } from "../brand";

// Rótulo pequeno em caixa-alta, com um traço que se desenha antes do texto.
export const Kicker: React.FC<{ children: React.ReactNode; color?: string; delay?: number; traco?: boolean }> = ({
  children,
  color = colors.muted,
  delay = 0,
  traco = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        fontFamily: fonts.body,
        fontWeight: 500,
        fontSize: 30,
        letterSpacing: 8,
        textTransform: "uppercase",
        color,
      }}
    >
      {traco ? (
        <div
          style={{
            height: 2,
            backgroundColor: color,
            width: interpolate(frame, [delay * fps, (delay + 0.7) * fps], [0, 56], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.out,
            }),
          }}
        />
      ) : null}
      {children}
    </div>
  );
};
