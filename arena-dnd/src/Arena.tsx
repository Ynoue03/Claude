import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, CalculateMetadataFunction, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { batalhar, PropsBatalha } from "./motor";
import { Cena } from "./render/quadro";

export type PropsArena = PropsBatalha & {
  audio?: string; // trilha + efeitos já mixados (gerado por `npm run batalha`), em public/
};

export const Arena: React.FC<PropsArena> = (props) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const chave = JSON.stringify({ ...props, audio: undefined });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cena = useMemo(() => new Cena(batalhar(props), props.titulo, props.perfil), [chave]);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) cena.desenhar(ctx, frame);
  }, [cena, frame]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#2f6fc0" }}>
      <canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
      {props.audio ? <Audio src={staticFile(props.audio)} /> : null}
    </AbsoluteFill>
  );
};

export const calcularDuracao: CalculateMetadataFunction<PropsArena> = ({ props }) => {
  const r = batalhar(props);
  return { durationInFrames: r.duracao };
};
