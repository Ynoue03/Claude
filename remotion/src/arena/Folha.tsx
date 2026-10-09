import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { sprite, spriteCaido, type Pose } from "./sprites";
import { texto } from "./fonte";
import type { Episodio } from "./tipos";

// Folha de sprites para conferir os lutadores (todas as direções e poses), 4× ampliada.
const POSES: [number, Pose][] = [
  [0, "parado"], [0, "passo1"], [0, "passo2"], [0, "ataque"], [0, "dano"], [0, "vitoria"],
  [1, "parado"], [1, "passo1"], [3, "parado"], [3, "passo1"], [3, "passo2"], [3, "ataque"], [2, "parado"],
];

export const FolhaSprites: React.FC<Episodio> = (props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#5DA94A";
    ctx.fillRect(0, 0, c.width, c.height);
    props.lutadores.forEach((l, i) => {
      const y = 4 + i * 30;
      texto(ctx, l.nome, 2, y + 12, "#FFFFFF", 1, "#1A1424");
      POSES.forEach(([d, p], j) => ctx.drawImage(sprite(l, d, p), 38 + j * 16, y - 4));
      ctx.drawImage(spriteCaido(l), 38 + POSES.length * 16, y + 4);
    });
  }, [props]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={270} height={480} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
    </AbsoluteFill>
  );
};
