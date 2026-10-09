import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// Fundo "vivo": cor base + luz suave que respira devagar + vinheta.
// Nenhum quadro fica parado, mas nada chama atenção.
export const Backdrop: React.FC<{
  tom: string;
  luz?: string;
  escuro?: boolean;
}> = ({ tom, luz = "rgba(255, 250, 242, 0.75)", escuro = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const x = 30 + Math.sin(t * 0.35) * 12;
  const y = 28 + Math.cos(t * 0.27) * 8;

  return (
    <AbsoluteFill style={{ backgroundColor: tom }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 45% at ${x}% ${y}%, ${escuro ? "rgba(255,240,215,0.16)" : luz}, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 50% 45%, transparent 55%, ${escuro ? "rgba(0,0,0,0.28)" : "rgba(90,70,50,0.12)"} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
