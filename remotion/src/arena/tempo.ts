// Linha do tempo fixa do episódio (30 fps, 90 s = 2700 quadros).
export const FPS = 30;
export const TOTAL = 90 * FPS;
export const T = {
  banner: Math.round(0.3 * FPS), // "CHOOSE YOUR FIGHTER!"
  conta3: Math.round(2.6 * FPS),
  conta2: Math.round(3.4 * FPS),
  conta1: Math.round(4.2 * FPS),
  luta: 5 * FPS, // "FIGHT!" e início da simulação
  primeiraQueda: 10 * FPS,
  ultimaQueda: Math.round(67.2 * FPS), // até aqui saem todos menos 2
  duelo: 70 * FPS, // zoom 1,2× e música acelera
  final: Math.round(78.6 * FPS), // queda do vice
  vencedor: 80 * FPS, // banner WINNER
  cta: 87 * FPS,
};

// Geometria (resolução interna 270×480). Área segura: x 24–246, y 55–400.
export const W = 270;
export const H = 480;
export const CENTRO = { x: 135, y: 262 };
export const ARENA = { a: 98, b: 105, k: 1.42 }; // octógono "em degraus"
export const PEDRA = { x: 135, y: 260, r: 13 };
