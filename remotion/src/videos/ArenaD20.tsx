// ARENA D20 — battle royale em pixel art com regras de RPG de mesa (SRD 5.2).
// Cada quadro é desenhado num canvas 360×640 e ampliado 3× (pixels nítidos).
import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Episodio } from "../arena/episodio";
import { Cena, desenharQuadro, prepararCena } from "../arena/render/quadro";

export type ArenaProps = { episodio: Episodio; audio: string };

// a cena (fichas, luta, linha do tempo, cenário) é calculada uma vez por aba
const cenas = new Map<string, Cena>();
const cenaDe = (ep: Episodio) => {
  const k = JSON.stringify(ep);
  let c = cenas.get(k);
  if (!c) {
    c = prepararCena(ep);
    cenas.set(k, c);
  }
  return c;
};

export const ArenaD20: React.FC<ArenaProps> = ({ episodio, audio }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const cena = cenaDe(episodio);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const b = desenharQuadro(cena, frame);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(b.d), b.w, b.h), 0, 0);
  }, [cena, frame]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#08060c" }}>
      <canvas
        ref={ref}
        width={360}
        height={640}
        style={{ width: 1080, height: 1920, imageRendering: "pixelated" }}
      />
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
