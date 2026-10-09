import React from "react";
import { Underline } from "@remotion/rough-notation";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { WordReveal } from "./WordReveal";

// Texto revelado palavra a palavra, com um trecho sublinhado à mão depois.
export const TextoComDestaque: React.FC<{
  texto: string;
  destaque?: string;
  cor: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ texto, destaque, cor, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palavras = texto.split(" ");
  const alvo = destaque ? destaque.split(" ") : [];
  let ini = -1;
  if (alvo.length) {
    ini = palavras.findIndex((_, i) =>
      alvo.every(
        (w, j) =>
          palavras[i + j]?.replace(/[.,!?]/g, "") === w.replace(/[.,!?]/g, ""),
      ),
    );
  }
  const sublinhar = delay + palavras.length * 0.07 + 0.6;
  return (
    <WordReveal
      text={texto}
      delay={delay}
      style={style}
      render={(w, i) =>
        ini >= 0 && i >= ini && i < ini + alvo.length ? (
          <Underline
            color={cor}
            strokeWidth={4}
            iterations={1}
            padding={{ top: 2 }}
            seed={3 + i}
            progress={interpolate(
              frame,
              [
                (sublinhar + (i - ini) * 0.25) * fps,
                (sublinhar + (i - ini + 1) * 0.25) * fps,
              ],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )}
          >
            {w}
          </Underline>
        ) : (
          w
        )
      }
    />
  );
};
