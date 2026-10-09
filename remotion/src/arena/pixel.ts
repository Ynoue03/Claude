// Primitivas de desenho em pixel (coordenadas sempre inteiras, sem suavização).
export type Ctx = CanvasRenderingContext2D;

export const px = (ctx: Ctx, x: number, y: number, c: string, s = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), s, s);
};

export const ret = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

export const disco = (ctx: Ctx, cx: number, cy: number, r: number, c: string) => {
  if (r <= 0) return;
  ctx.fillStyle = c;
  const R = Math.round(r);
  const X = Math.round(cx);
  const Y = Math.round(cy);
  for (let dy = -R; dy <= R; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
    ctx.fillRect(X - w, Y + dy, w * 2 + 1, 1);
  }
};

export const elipse = (ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string) => {
  ctx.fillStyle = c;
  const X = Math.round(cx);
  const Y = Math.round(cy);
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.5))));
    ctx.fillRect(X - w, Y + dy, w * 2 + 1, 1);
  }
};

export const anel = (ctx: Ctx, cx: number, cy: number, r: number, c: string, esp = 1, de = 0, ate = Math.PI * 2) => {
  if (r <= 0) return;
  ctx.fillStyle = c;
  const passos = Math.max(12, Math.ceil(r * 7));
  for (let e = 0; e < esp; e++) {
    const rr = r - e;
    for (let k = 0; k <= passos; k++) {
      const a = de + ((ate - de) * k) / passos;
      ctx.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 1, 1);
    }
  }
};

export const linha = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, c: string, esp = 1) => {
  ctx.fillStyle = c;
  let X0 = Math.round(x0);
  let Y0 = Math.round(y0);
  const X1 = Math.round(x1);
  const Y1 = Math.round(y1);
  const dx = Math.abs(X1 - X0);
  const dy = -Math.abs(Y1 - Y0);
  const sx = X0 < X1 ? 1 : -1;
  const sy = Y0 < Y1 ? 1 : -1;
  let err = dx + dy;
  const o = Math.floor(esp / 2);
  for (let n = 0; n < 2000; n++) {
    ctx.fillRect(X0 - o, Y0 - o, esp, esp);
    if (X0 === X1 && Y0 === Y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      X0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      Y0 += sy;
    }
  }
};

// raio em zigue-zague entre dois pontos
export const zigue = (
  ctx: Ctx, x0: number, y0: number, x1: number, y1: number, c: string, semente: number, amp = 4, esp = 1,
  rnd: (a: number, b: number) => number,
) => {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(2, Math.round(d / 6));
  const nx = -(y1 - y0) / (d || 1);
  const ny = (x1 - x0) / (d || 1);
  let px0 = x0;
  let py0 = y0;
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const off = k === n ? 0 : (rnd(semente, k) - 0.5) * 2 * amp;
    const X = x0 + (x1 - x0) * t + nx * off;
    const Y = y0 + (y1 - y0) * t + ny * off;
    linha(ctx, px0, py0, X, Y, c, esp);
    px0 = X;
    py0 = Y;
  }
};
