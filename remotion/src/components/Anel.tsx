import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, ease, fonts } from "../brand";

// Anel de calorias: cada arco é a fatia de kcal de um macro (P×4, C×4, G×9).
export const Anel: React.FC<{
  kcal: number;
  fatias: { valor: number; cor: string }[];
  tamanho?: number;
  delay?: number;
}> = ({ kcal, fatias, tamanho = 560, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = tamanho / 2 - 24;
  const circ = 2 * Math.PI * r;
  const total = fatias.reduce((a, f) => a + f.valor, 0);
  const gap = 30; // respiro entre arcos (px) — inclui as pontas arredondadas
  const p = interpolate(frame, [delay * fps, (delay + 1.8) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.out,
  });
  let acc = 0;
  return (
    <div style={{ position: "relative", width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} style={{ rotate: "-90deg" }}>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} stroke={`${colors.ink}10`} strokeWidth={14} fill="none" />
        {fatias.map((f, i) => {
          const len = (f.valor / total) * circ;
          const inicio = acc;
          acc += len;
          const visivel = Math.max(0, Math.min(len - gap, p * circ - inicio));
          return (
            <circle
              key={i}
              cx={tamanho / 2}
              cy={tamanho / 2}
              r={r}
              stroke={f.cor}
              strokeWidth={14}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${visivel} ${circ}`}
              strokeDashoffset={-inicio}
              opacity={visivel > 0 ? 1 : 0}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: fonts.display,
            fontStyle: "italic",
            fontSize: 210,
            lineHeight: 1,
            color: colors.ink,
            fontVariantNumeric: "lining-nums tabular-nums",
          }}
        >
          {Math.round(kcal * p)}
        </span>
        <span
          style={{
            fontFamily: fonts.body,
            fontWeight: 500,
            fontSize: 28,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: colors.muted,
            marginTop: 6,
          }}
        >
          kcal
        </span>
      </div>
    </div>
  );
};
