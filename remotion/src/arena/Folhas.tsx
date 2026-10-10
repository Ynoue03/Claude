import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { gerarLutadores } from "./personagem.ts";
import type { Episodio } from "./personagem.ts";
import { QUADROS, SH, SW, mini, quadro, retrato } from "./sprite.ts";
import type { Anim, Dir, Expr } from "./sprite.ts";
import { texto } from "./fonte.ts";

// Sprite sheet de um lutador por quadro (frame N = lutador N). Exporte com:
// npx remotion render ArenaFolhas out/folhas --sequence --image-format=png
export const FOLHA_W = 14 * SW;
const LINHAS: { rotulo: string; anim: Anim; dir: Dir; n?: number; expr?: Expr }[] = [
  { rotulo: "IDLE S", anim: "idle", dir: "S" },
  { rotulo: "ANDAR S", anim: "andar", dir: "S" },
  { rotulo: "ANDAR N", anim: "andar", dir: "N" },
  { rotulo: "ANDAR E", anim: "andar", dir: "E" },
  { rotulo: "ANDAR W", anim: "andar", dir: "W" },
  { rotulo: "ATAQUE E", anim: "ataque", dir: "E" },
  { rotulo: "MAGIA E", anim: "magia", dir: "E" },
  { rotulo: "DANO / DERROTA", anim: "dano", dir: "E" },
  { rotulo: "VITÓRIA", anim: "vitoria", dir: "S" },
];
const EXPRS: Expr[] = ["neutra", "foco", "grito", "dor", "pvbaixo", "derrota", "vitoria"];
export const FOLHA_H = 14 + (LINHAS.length + 1) * SH * 2 + 8 + 64 + 2 + 16 + 4;

export const ArenaFolhas: React.FC<Episodio> = (ep) => {
  const frame = useCurrentFrame();
  const { lutadores } = useMemo(() => gerarLutadores(ep), [ep]);
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("folha"));
  useLayoutEffect(() => {
    const l = lutadores[frame % lutadores.length];
    const ctx = ref.current!.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#3a3440";
    ctx.fillRect(0, 0, FOLHA_W, FOLHA_H);
    texto(ctx, `${l.nome} · ${l.classe} · ${l.especie}`, 4, 4, { cor: "#fff" });
    let y = 14;
    for (const rasgado of [false, true]) {
      for (const ln of LINHAS) {
        const n = QUADROS[ln.anim];
        for (let q = 0; q < n; q++) {
          const expr: Expr = ln.anim === "dano" ? "dor" : ln.anim === "vitoria" ? "vitoria" : ln.anim === "ataque" || ln.anim === "magia" ? "grito" : rasgado ? "pvbaixo" : "foco";
          ctx.drawImage(quadro(l, { anim: ln.anim, q, dir: ln.dir, expr, rasgado }), q * SW, y);
        }
        if (ln.anim === "dano")
          for (let q = 0; q < 4; q++) ctx.drawImage(quadro(l, { anim: "derrota", q, dir: "E", expr: "derrota", rasgado }), (q + 2) * SW, y);
        y += SH;
      }
      EXPRS.forEach((e, i) => ctx.drawImage(quadro(l, { anim: "idle", q: 0, dir: "S", expr: e, rasgado }), i * SW, y));
      y += SH;
    }
    y += 8;
    EXPRS.forEach((e, i) => ctx.drawImage(retrato(l, e), i * 96, y));
    EXPRS.forEach((e, i) => ctx.drawImage(mini(l, e), i * 18, y + 66));
    continueRender(h);
  }, [frame, lutadores, h]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#3a3440" }}>
      <canvas ref={ref} width={FOLHA_W} height={FOLHA_H} style={{ imageRendering: "pixelated" }} />
    </AbsoluteFill>
  );
};
