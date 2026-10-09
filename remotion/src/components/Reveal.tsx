import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../brand";

// Sobe e aparece com leve desfoque — o "reveal" padrão da marca.
export const Reveal: React.FC<{
  delay?: number; // em segundos
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, distance = 40, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = delay * fps;
  const end = start + 0.9 * fps;
  const opts = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.out,
  } as const;

  return (
    <div
      style={{
        opacity: interpolate(frame, [start, end], [0, 1], opts),
        translate: interpolate(
          frame,
          [start, end],
          [`0px ${distance}px`, "0px 0px"],
          opts,
        ),
        filter: `blur(${interpolate(frame, [start, end], [8, 0], opts)}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
