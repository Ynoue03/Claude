import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { ELENCO } from "./montar";
import { SH, SW, sprite, type Pose } from "./sprites";
import { texto } from "./fonte";

// Folha de comparação: o mesmo personagem em 32, 64 e 128 px (mesmo tamanho na tela, mais detalhe),
// mais as poses da animação em 128 px.
const POSES: Pose[] = ["parado", "passo1", "preparo", "ataque", "dano", "vitoria"];

export const FolhaSprites: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(4, 0, 0, 4, 0, 0);
    ctx.fillStyle = "#5DA94A";
    ctx.fillRect(0, 0, 270, 480);
    const escolha = ELENCO.filter((_, i) => i % 2 === 0).slice(0, 18);
    ["32", "64", "128"].forEach((t, j) => texto(ctx, t, 18 + j * 28, 3, "#FFFFFF", 1, "#1A1424", "centro"));
    ["32", "64", "128"].forEach((t, j) => texto(ctx, t, 153 + j * 28, 3, "#FFFFFF", 1, "#1A1424", "centro"));
    escolha.forEach((l, i) => {
      const col = i % 2;
      const lin = Math.floor(i / 2);
      [1, 2, 4].forEach((k, j) => ctx.drawImage(sprite(l, 0, "parado", false, k), 5 + col * 135 + j * 28, 10 + lin * 36, SW, SH));
      texto(ctx, l.nome.slice(0, 9), 95 + col * 135, 26 + lin * 36, "#FFFFFF", 1, "#1A1424");
    });
    const l = ELENCO.find((x) => x.id === "goku")!;
    POSES.forEach((p, j) => ctx.drawImage(sprite(l, 3, p, false, 4), 4 + j * 44, 340, SW * 1.6, SH * 1.6));
    POSES.forEach((p, j) => texto(ctx, p.toUpperCase(), 25 + j * 44, 398, "#FFFFFF", 1, "#1A1424", "centro"));
    [0, 1, 3].forEach((d, j) => ctx.drawImage(sprite(ELENCO.find((x) => x.id === "kakashi")!, d, "parado", false, 4), 30 + j * 70, 410, SW * 1.6, SH * 1.6));
  }, []);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
