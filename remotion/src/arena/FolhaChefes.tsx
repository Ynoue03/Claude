import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { ORDEM_CHEFES, CHEFES } from "./chefes.ts";
import { CW, CH, quadroChefe, retratoChefe, miniChefe } from "./chefes-arte.ts";
import { ESCALA_CHEFE } from "./sprite.ts";
import type { Anim } from "./sprite.ts";
import { texto } from "./fonte.ts";

// Sprite sheet de um chefe por quadro (frame N = chefe N, na ordem dos episódios), no tamanho do mundo (3×).
// npx remotion render ArenaChefes ../arena-d20/chefes --sequence --image-format=png
const E = ESCALA_CHEFE;
const LINHAS: { rotulo: string; anim: Anim; n: number }[] = [
  { rotulo: "IDLE", anim: "idle", n: 4 },
  { rotulo: "ANDAR", anim: "andar", n: 6 },
  { rotulo: "ATAQUE", anim: "ataque", n: 7 },
  { rotulo: "DANO + DERROTA", anim: "dano", n: 2 },
  { rotulo: "VITÓRIA", anim: "vitoria", n: 4 },
];
export const CHEFES_W = 7 * CW * E;
export const CHEFES_H = 16 + LINHAS.length * CH * E + 80;

export const ArenaChefes: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("chefes"));
  useLayoutEffect(() => {
    const id = ORDEM_CHEFES[frame % ORDEM_CHEFES.length];
    const ctx = ref.current!.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#3a3440";
    ctx.fillRect(0, 0, CHEFES_W, CHEFES_H);
    texto(ctx, `${CHEFES[id].nome.toUpperCase()} · ${CHEFES[id].fonte}`, 4, 4, { cor: "#fff", escala: 2 });
    let y = 20;
    for (const ln of LINHAS) {
      for (let q = 0; q < ln.n; q++) ctx.drawImage(quadroChefe(id, ln.anim, q, "E", E), q * CW * E, y);
      if (ln.anim === "dano") for (let q = 0; q < 4; q++) ctx.drawImage(quadroChefe(id, "derrota", q, "E", E), (q + 2) * CW * E, y);
      texto(ctx, ln.rotulo, 4, y + 2, { cor: "#c8c0b8" });
      y += CH * E;
    }
    ctx.drawImage(retratoChefe(id), 4, y + 4);
    ctx.drawImage(miniChefe(id), 110, y + 4);
    ctx.drawImage(quadroChefe(id, "idle", 0, "E", 1), 140, y - 40);
    continueRender(h);
  }, [frame, h]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#3a3440" }}>
      <canvas ref={ref} width={CHEFES_W} height={CHEFES_H} style={{ imageRendering: "pixelated" }} />
    </AbsoluteFill>
  );
};
