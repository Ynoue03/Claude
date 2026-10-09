import React from "react";
import { colors, fonts } from "../brand";

// Rótulo pequeno em caixa-alta, acima dos títulos.
export const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = colors.muted,
}) => (
  <div
    style={{
      fontFamily: fonts.body,
      fontWeight: 500,
      fontSize: 30,
      letterSpacing: 8,
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);
