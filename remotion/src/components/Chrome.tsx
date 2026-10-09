import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, ease, fonts, safe } from "../brand";

// Moldura de revista: @perfil e "01 / 04" no topo, linha de progresso na base.
export const Chrome: React.FC<{
  handle: string;
  rotulo: string;
  inicios: number[]; // frame em que cada cena começa
  escuras?: number[]; // índices das cenas com fundo escuro
}> = ({ handle, rotulo, inicios, escuras = [] }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  let cena = 0;
  inicios.forEach((f, i) => {
    if (frame >= f) cena = i;
  });
  const cor = escuras.includes(cena) ? colors.sand : colors.muted;
  const entrada = interpolate(frame, [0.4 * fps, 1.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.out,
  });
  const texto: React.CSSProperties = {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 24,
    letterSpacing: 6,
    textTransform: "uppercase",
    color: cor,
  };
  const total = String(inicios.length).padStart(2, "0");

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: entrada }}>
      <div
        style={{
          position: "absolute",
          top: 150,
          left: safe.x,
          right: safe.x,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span style={texto}>{handle}</span>
        <span style={{ ...texto, fontVariantNumeric: "tabular-nums" }}>
          {rotulo} · {String(cena + 1).padStart(2, "0")} / {total}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 250,
          left: safe.x,
          width: width - safe.x * 2,
          height: 2,
          backgroundColor: `${cor}40`,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(frame / (durationInFrames - 1)) * 100}%`,
            backgroundColor: cor,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
