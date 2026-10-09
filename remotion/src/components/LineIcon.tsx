import React from "react";
import { evolvePath } from "@remotion/paths";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../brand";

// Ícones de traço fino que se desenham sozinhos (viewBox 120×120).
export const icones = {
  halter:
    "M14 60 L106 60 M24 44 L24 76 M34 36 L34 84 M86 36 L86 84 M96 44 L96 76",
  folha:
    "M24 96 C24 52 52 24 98 22 C96 68 68 96 24 96 Z M24 96 L70 50",
  tigela:
    "M16 58 L104 58 C104 82 86 100 60 100 C34 100 16 82 16 58 Z M44 46 C44 38 52 36 52 28 M64 46 C64 38 72 36 72 28",
  salvar: "M34 18 L86 18 L86 104 L60 84 L34 104 Z",
};

export const LineIcon: React.FC<{
  path: string;
  color: string;
  size?: number;
  delay?: number; // segundos
  duration?: number;
}> = ({ path, color, size = 120, delay = 0, duration = 1.2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.inOut,
  });
  // Cada subtraçado ("M ...") é desenhado com o mesmo progresso
  const partes = path.split(/(?=M)/).map((s) => s.trim());
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {partes.map((d) => {
        const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
        return (
          <path
            key={d}
            d={d}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
          />
        );
      })}
    </svg>
  );
};
