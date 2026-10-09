import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { ELENCO } from "./montar";
import { sprite, type Pose } from "./sprites";
import { texto } from "./fonte";

// Folha de sprites de todo o elenco (elenco.json), para conferir os visuais.
const POSES: [number, Pose][] = [[0, "parado"], [0, "ataque"], [0, "vitoria"], [1, "parado"], [3, "passo1"], [3, "ataque"]];

export const FolhaSprites: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#5DA94A";
    ctx.fillRect(0, 0, c.width, c.height);
    ELENCO.forEach((l, i) => {
      const col = i % 2;
      const lin = Math.floor(i / 2);
      const x = 4 + col * 270;
      const y = 4 + lin * 38;
      texto(ctx, l.nome.slice(0, 8), x, y + 14, "#FFFFFF", 1, "#1A1424");
      POSES.forEach(([d, p], j) => ctx.drawImage(sprite(l, d, p), x + 40 + j * 36, y));
    });
  }, []);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={540} height={960} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
    </AbsoluteFill>
  );
};
