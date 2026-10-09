import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../brand";

// Título editorial: cada palavra sobe de dentro de uma máscara, em sequência.
export const WordReveal: React.FC<{
  text: string;
  delay?: number; // segundos
  stagger?: number; // segundos entre palavras
  style?: React.CSSProperties;
  render?: (word: string, index: number) => React.ReactNode;
}> = ({ text, delay = 0, stagger = 0.07, style, render }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div style={{ textWrap: "balance", ...style }}>
      {words.map((word, i) => {
        const start = (delay + i * stagger) * fps;
        const p = interpolate(frame, [start, start + 0.85 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease.out,
        });
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "top",
              // folga para descendentes e itálico não serem cortados
              padding: "0.04em 0.12em 0.16em",
              margin: "-0.04em -0.12em -0.16em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                translate: `0 ${(1 - p) * 115}%`,
                rotate: `${(1 - p) * 6}deg`,
                transformOrigin: "left bottom",
              }}
            >
              {render ? render(word, i) : word}
            </span>
            {i < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </div>
  );
};
