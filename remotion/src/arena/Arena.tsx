import React, { useLayoutEffect, useMemo, useRef } from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { desenharQuadro } from "./desenho";
import { simular } from "./sim";
import type { Episodio } from "./tipos";

// ANIME PIXEL ARENA — battle royale automático em pixel art (270×480 ampliado 4×).
export const ArenaPixel: React.FC<Episodio> = (ep) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const sim = useMemo(() => simular(ep), [ep]);
  useLayoutEffect(() => {
    if (ref.current) desenharQuadro(ref.current, ep, sim, frame);
  }, [ep, sim, frame]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas
        ref={ref}
        width={1080}
        height={1920}
        style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
      />
      {ep.audio ? <Audio src={staticFile(ep.audio)} /> : null}
    </AbsoluteFill>
  );
};
