import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { criarRoteiro, V } from "./roteiro.ts";
import { desenharQuadro } from "./render.ts";
import type { Episodio } from "./personagem.ts";
import { W, H } from "./cenario.ts";

export const ARENA_DURACAO = V.fim;
const ESC = 3; // 360×640 → 1080×1920, pixels nítidos

// ARENA D20 — battle royale automático com regras de mesa (SRD 5.2). Tudo sai da seed do episódio.
export const ArenaD20: React.FC<Episodio> = (ep) => {
  const frame = useCurrentFrame();
  const roteiro = useMemo(() => criarRoteiro(ep), [ep]);
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("quadro da arena"));
  useLayoutEffect(() => {
    const cam = desenharQuadro(roteiro, frame);
    const ctx = ref.current!.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#08060c";
    ctx.fillRect(0, 0, W * ESC, H * ESC);
    const z = ESC * cam.zoom;
    ctx.setTransform(z, 0, 0, z, (W * ESC) / 2 - cam.foco.x * z + cam.tremor.x * ESC, (H * ESC) / 2 - cam.foco.y * z + cam.tremor.y * ESC);
    ctx.drawImage(cam.mundo, 0, 0);
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    ctx.drawImage(cam.ui, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    continueRender(handle);
  }, [frame, roteiro, handle]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#08060c" }}>
      <canvas ref={ref} width={W * ESC} height={H * ESC} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
      {ep.audio ? <Audio src={staticFile(ep.audio)} /> : null}
    </AbsoluteFill>
  );
};
