import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { ITENS, ITEM_IDS, TIPOS } from "./itens.ts";
import { desenharIcone } from "./itens.ts";
import { texto, quebrar } from "./fonte.ts";

// Catálogo dos 27 itens do baú (9 tipos × 3 versões). npx remotion still ArenaItens out/itens.png
export const CATALOGO_W = 360,
  CATALOGO_H = 640;
export const CatalogoItens: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("catálogo"));
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#1a1420";
    ctx.fillRect(0, 0, CATALOGO_W, CATALOGO_H);
    texto(ctx, "ITENS DO BAÚ", CATALOGO_W / 2, 8, { cor: "#ffd84a", contorno: "#1a1014", escala: 2, alinhar: "centro" });
    TIPOS.forEach((tipo, ti) => {
      const y0 = 30 + ti * 67;
      texto(ctx, tipo.toUpperCase(), 8, y0, { cor: "#c8c0b8", fonte: "p" });
      ITEM_IDS.filter((i) => ITENS[i].tipo === tipo).forEach((id, k) => {
        const x = 6 + k * 118,
          y = y0 + 8;
        const it = ITENS[id];
        ctx.fillStyle = "#2a2230";
        ctx.fillRect(x, y, 114, 56);
        desenharIcone(ctx, id, x + 2, y + 2, 2);
        quebrar(it.nome.toUpperCase(), 76, "p").forEach((ln, j) => texto(ctx, ln, x + 37, y + 3 + j * 7, { cor: it.cor, fonte: "p" }));
        quebrar(it.poder.toUpperCase(), 108, "p").slice(0, 4).forEach((ln, j) => texto(ctx, ln, x + 3, y + 36 + j * 6, { cor: "#ffffff", fonte: "p" }));
      });
    });
    continueRender(h);
  }, [h]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={CATALOGO_W} height={CATALOGO_H} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
    </AbsoluteFill>
  );
};
