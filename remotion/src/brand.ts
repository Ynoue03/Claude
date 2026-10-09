// Identidade visual "aesthetic" (academia + alimentação).
// Altere aqui e todos os vídeos acompanham.
// Fontes embutidas no projeto (pacotes @fontsource) — renderiza offline.
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/inter/300.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import { continueRender, delayRender, Easing } from "remotion";

export const fonts = {
  // Títulos elegantes (itálico serifado)
  display: "'Cormorant Garamond', serif",
  // Textos, números e rótulos
  body: "'Inter', sans-serif",
};

// Segura a renderização até as fontes carregarem (evita frames com fonte errada).
const fontHandle = delayRender("Carregando fontes");
Promise.all([
  document.fonts.load("italic 500 40px 'Cormorant Garamond'"),
  document.fonts.load("italic 600 40px 'Cormorant Garamond'"),
  document.fonts.load("300 40px 'Inter'"),
  document.fonts.load("500 40px 'Inter'"),
  document.fonts.load("700 40px 'Inter'"),
]).finally(() => continueRender(fontHandle));

export const colors = {
  cream: "#F3EEE6",
  sand: "#E4D8C8",
  clay: "#B98B6A",
  sage: "#9AA58A",
  olive: "#5C6449",
  ink: "#1C1B19",
  muted: "#6E675E",
};

// Formato vertical para Reels / TikTok / Shorts
export const vertical = { width: 1080, height: 1920, fps: 30 };

// Movimento: suave, sem "pulo". Use sempre estas curvas.
export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
};

// Margens seguras (UI do Instagram/TikTok cobre topo e base)
export const safe = { x: 96, top: 220, bottom: 320 };
