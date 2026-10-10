// Cenário: calabouço de pedra visto de cima, com tochas e iluminação em tempo real.
// Tela interna 360 × 640 (escala 3× → 1080 × 1920).
import { criarRng } from "../motor/dados";
import { tom, misturar, hexParaRgb } from "./cor";

export const TELA_W = 360;
export const TELA_H = 640;
export const CENTRO = { x: 180, y: 358 };
export const PX_POR_PE = 2.6;

// salão
export const SALA = { x0: 16, x1: 344, topo: 172, chao0: 206, chao1: 512, base: 532 };

export const paraTela = (x: number, y: number) => ({ x: CENTRO.x + x * PX_POR_PE, y: CENTRO.y + y * PX_POR_PE });

export type Tocha = { x: number; y: number; tipo: "parede" | "braseiro" };
export const TOCHAS: Tocha[] = [
  { x: 44, y: 190, tipo: "parede" },
  { x: 122, y: 190, tipo: "parede" },
  { x: 238, y: 190, tipo: "parede" },
  { x: 316, y: 190, tipo: "parede" },
  { x: 74, y: 516, tipo: "parede" },
  { x: 286, y: 516, tipo: "parede" },
  { x: 32, y: 282, tipo: "braseiro" },
  { x: 328, y: 282, tipo: "braseiro" },
  { x: 32, y: 446, tipo: "braseiro" },
  { x: 328, y: 446, tipo: "braseiro" },
];
const POCAS = [
  { x: 92, y: 300, rx: 10, ry: 4 },
  { x: 262, y: 452, rx: 12, ry: 5 },
  { x: 288, y: 250, rx: 7, ry: 3 },
];

type Ctx = CanvasRenderingContext2D;
const px = (ctx: Ctx, x: number, y: number, c: string, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};

// ---------------- fundo estático ----------------
export const desenharFundo = (ctx: Ctx) => {
  const rng = criarRng(66601);
  // vazio escuro (atrás das paredes)
  px(ctx, 0, 0, "#0b0a10", TELA_W, TELA_H);

  // chão de lajotas irregulares
  const BASE = ["#4b4752", "#47434e", "#504b57", "#443f4a", "#4e4955"];
  const ALT_L = 18;
  for (let y = SALA.topo; y < SALA.base; y += ALT_L) {
    const desloc = Math.floor(rng() * 14);
    let x = SALA.x0 - desloc;
    while (x < SALA.x1) {
      const w = 18 + Math.floor(rng() * 14);
      const cor = BASE[Math.floor(rng() * BASE.length)];
      for (let yy = 0; yy < ALT_L - 1; yy++)
        for (let xx = 0; xx < w - 1; xx++) {
          const X = x + xx, Y = y + yy;
          if (X < SALA.x0 || X >= SALA.x1) continue;
          const r = rng();
          let c = cor;
          if (yy === 0 || xx === 0) c = tom(cor, 1); // borda de cima/esquerda iluminada
          else if (yy === ALT_L - 2 || xx === w - 2) c = tom(cor, -1);
          else if (r < 0.06) c = tom(cor, -1);
          else if (r > 0.97) c = tom(cor, 1);
          px(ctx, X, Y, c);
        }
      // rejunte
      px(ctx, x + w - 1, y, "#24212a", 1, ALT_L);
      px(ctx, x, y + ALT_L - 1, "#24212a", w, 1);
      // musgo no rejunte
      if (rng() < 0.35) for (let i = 0; i < 4; i++) px(ctx, x + w - 2 + Math.floor(rng() * 3), y + Math.floor(rng() * ALT_L), rng() < 0.5 ? "#3d5a35" : "#4c6b3f");
      // rachadura
      if (rng() < 0.18) {
        let cx = x + 3 + rng() * (w - 6), cy = y + 2 + rng() * 6;
        for (let i = 0; i < 8; i++) {
          px(ctx, cx, cy, "#2a2630");
          cx += rng() < 0.5 ? 1 : 0;
          cy += 1;
        }
      }
      x += w;
    }
  }
  // manchas de sangue antigo
  for (let i = 0; i < 7; i++) {
    const cx = SALA.x0 + 20 + rng() * 290, cy = SALA.chao0 + 10 + rng() * 280;
    for (let k = 0; k < 18; k++) px(ctx, cx + (rng() - 0.5) * 9, cy + (rng() - 0.5) * 5, rng() < 0.5 ? "#4a2328" : "#3a1c22");
  }
  // poças
  for (const p of POCAS)
    for (let yy = -p.ry; yy <= p.ry; yy++)
      for (let xx = -p.rx; xx <= p.rx; xx++) {
        const dd = (xx / p.rx) ** 2 + (yy / p.ry) ** 2;
        if (dd > 1) continue;
        px(ctx, p.x + xx, p.y + yy, dd > 0.7 ? "#2b3340" : yy < 0 && xx > 0 ? "#3d4a5c" : "#323c4c");
      }

  // tablado em degraus (pirâmide de 3 níveis) no centro
  const degraus = [62, 44, 26];
  degraus.forEach((h, i) => {
    const corTopo = ["#5a5562", "#625c6a", "#6b6573"][i];
    for (let y = -h; y <= h; y++)
      for (let x = -h * 1.25; x <= h * 1.25; x++) {
        const X = CENTRO.x + x, Y = CENTRO.y + y * 0.78;
        const borda = Math.abs(y) >= h - 1 || Math.abs(x) >= h * 1.25 - 1;
        let c = corTopo;
        if (borda) c = y < 0 || x < 0 ? tom(corTopo, 1) : "#2c2832";
        else if ((Math.floor(X / 9) + Math.floor(Y / 7)) % 2 === 0 && rng() < 0.08) c = tom(corTopo, -1);
        px(ctx, X, Y, c);
      }
    // face do degrau (sombra embaixo)
    px(ctx, CENTRO.x - h * 1.25, CENTRO.y + h * 0.78 + 1, "#2a2630", h * 2.5, 2);
  });

  // paredes de cima (face visível) com blocos
  for (let y = SALA.topo - 32; y < SALA.chao0; y++)
    for (let x = 0; x < TELA_W; x++) {
      const linha = Math.floor((y - SALA.topo + 32) / 8);
      const bx = Math.floor((x + (linha % 2) * 8) / 16);
      const borda = (y - SALA.topo + 32) % 8 === 7 || (x + (linha % 2) * 8) % 16 === 15;
      const r = rng();
      let c = (bx + linha) % 3 === 0 ? "#3e3a45" : "#46414d";
      if (y < SALA.topo) c = tom(c, -1); // topo da parede, mais escuro
      if (y >= SALA.chao0 - 4) c = "#25222b"; // pé da parede
      if (borda) c = "#24212a";
      else if (r < 0.05) c = tom(c, 1);
      px(ctx, x, y, c);
    }
  // laterais
  for (let y = SALA.chao0; y < SALA.base; y++) {
    for (let x = 0; x < SALA.x0; x++) px(ctx, x, y, (Math.floor(y / 8) + Math.floor(x / 8)) % 2 ? "#36323d" : "#3b3742");
    for (let x = SALA.x1; x < TELA_W; x++) px(ctx, x, y, (Math.floor(y / 8) + Math.floor(x / 8)) % 2 ? "#36323d" : "#3b3742");
    px(ctx, SALA.x0, y, "#1c1a22");
    px(ctx, SALA.x1 - 1, y, "#1c1a22");
  }
  // parede de baixo (só o topo aparece)
  for (let y = SALA.chao1; y < TELA_H; y++)
    for (let x = 0; x < TELA_W; x++) {
      const c = y < SALA.chao1 + 4 ? "#56515e" : y < SALA.base ? ((Math.floor((x + (Math.floor(y / 8) % 2) * 8) / 16) % 2) ? "#3e3a45" : "#45404c") : "#0b0a10";
      px(ctx, x, y, c);
    }
  px(ctx, 0, SALA.chao1, "#6a6472", TELA_W, 1);

  // portão (grade levadiça) no meio da parede de cima
  const gx = 160, gw = 40, gy = SALA.topo - 22;
  px(ctx, gx - 4, gy - 4, "#2a2630", gw + 8, 30);
  px(ctx, gx, gy, "#08070c", gw, 26);
  for (let x = gx + 2; x < gx + gw; x += 6) px(ctx, x, gy, "#5c5866", 2, 26);
  for (let y = gy + 4; y < gy + 26; y += 7) px(ctx, gx, y, "#4a4652", gw, 1);
  // arco de pedra
  for (let i = -6; i <= gw + 5; i++) px(ctx, gx + i, gy - 5 - Math.round(Math.sin(((i + 6) / (gw + 12)) * Math.PI) * 4), "#5f5a68", 1, 2);

  // estandartes rasgados
  for (const bx of [86, 274]) {
    for (let y = 0; y < 22; y++) {
      const w = y > 17 ? (y % 2 ? 6 : 10) : 12;
      px(ctx, bx - w / 2, SALA.topo - 24 + y, y < 2 ? "#c9a24a" : y % 5 === 0 ? "#6e1f2a" : "#82242f", w, 1);
    }
    px(ctx, bx - 1, SALA.topo - 17, "#d9b35a", 2, 6); // símbolo
    px(ctx, bx - 3, SALA.topo - 15, "#d9b35a", 6, 2);
  }
  // correntes
  for (const cx of [20, 150, 210, 340])
    for (let y = SALA.topo - 26; y < SALA.topo - 2; y += 3) px(ctx, cx, y, y % 2 ? "#6f6a78" : "#4c4855", 2, 2);
  // nichos com crânio
  for (const nx of [58, 300]) {
    px(ctx, nx - 6, SALA.topo - 22, "#16141b", 12, 10);
    px(ctx, nx - 3, SALA.topo - 19, "#d8d0bc", 6, 4);
    px(ctx, nx - 2, SALA.topo - 18, "#16141b", 1, 1);
    px(ctx, nx + 1, SALA.topo - 18, "#16141b", 1, 1);
    px(ctx, nx - 2, SALA.topo - 15, "#bfb6a2", 4, 1);
  }
  // teias de aranha nos cantos
  for (const [cx, cy, sx] of [[SALA.x0, SALA.chao0, 1], [SALA.x1 - 1, SALA.chao0, -1]] as [number, number, number][]) {
    for (let i = 0; i < 14; i++) px(ctx, cx + sx * i, cy + i * 0.6, "rgba(220,220,230,0.35)");
    for (let i = 0; i < 12; i++) px(ctx, cx + sx * i * 0.4, cy + i, "rgba(220,220,230,0.35)");
    for (let r = 4; r < 12; r += 4) for (let a = 0; a < 6; a++) px(ctx, cx + sx * Math.cos(a / 4) * r, cy + Math.sin(a / 4) * r, "rgba(220,220,230,0.3)");
  }
  // ossos, barris e caixotes nos cantos
  const osso = (x: number, y: number, ang: number) => {
    for (let i = -4; i <= 4; i++) px(ctx, x + Math.cos(ang) * i, y + Math.sin(ang) * i, "#cfc6b0");
    px(ctx, x + Math.cos(ang) * 5 - 1, y + Math.sin(ang) * 5 - 1, "#e2dac6", 2, 2);
    px(ctx, x - Math.cos(ang) * 5 - 1, y - Math.sin(ang) * 5 - 1, "#e2dac6", 2, 2);
  };
  osso(60, 488, 0.3);
  osso(300, 222, 2.1);
  osso(110, 226, 1.2);
  const barril = (x: number, y: number) => {
    for (let yy = 0; yy < 14; yy++) for (let xx = 0; xx < 12; xx++) px(ctx, x + xx, y + yy, xx < 3 ? "#5a3a24" : xx > 9 ? "#4a2e1c" : "#74492c");
    px(ctx, x, y + 3, "#3a3a40", 12, 1);
    px(ctx, x, y + 10, "#3a3a40", 12, 1);
    px(ctx, x + 1, y - 1, "#8a5a36", 10, 2);
  };
  barril(22, 214);
  barril(322, 486);
  const caixote = (x: number, y: number) => {
    px(ctx, x, y, "#6a4a2a", 14, 12);
    px(ctx, x, y, "#8a6438", 14, 2);
    px(ctx, x + 1, y + 2, "#4a321c", 1, 10);
    px(ctx, x + 12, y + 2, "#4a321c", 1, 10);
    for (let i = 0; i < 10; i++) px(ctx, x + 2 + i, y + 2 + i, "#4a321c");
  };
  caixote(326, 212);
  caixote(22, 492);
};

// ---------------- animações do cenário (por quadro) ----------------
export const animarCenario = (ctx: Ctx, f: number) => {
  // runas do tablado pulsando em azul
  const pulso = 0.5 + 0.5 * Math.sin(f * 0.07);
  const runa = misturar("#3a4a7a", "#8fd0ff", pulso * 0.7);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = CENTRO.x + Math.cos(a) * 44, y = CENTRO.y + Math.sin(a) * 26;
    px(ctx, x - 1, y - 1, runa, 3, 1);
    px(ctx, x, y - 2, runa, 1, 3);
  }
  // altar em forma de d20 no centro
  const ax = CENTRO.x, ay = CENTRO.y - 4;
  const hexa = (r: number) => Array.from({ length: 6 }, (_, i) => [ax + Math.cos(-Math.PI / 2 + (i * Math.PI) / 3) * r, ay + Math.sin(-Math.PI / 2 + (i * Math.PI) / 3) * r] as [number, number]);
  ctx.fillStyle = "#1c1a22";
  ctx.beginPath();
  hexa(10).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.fill();
  ctx.fillStyle = "#77707f";
  ctx.beginPath();
  hexa(9).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.fill();
  ctx.fillStyle = "#938b9c";
  ctx.beginPath();
  ctx.moveTo(ax, ay - 9);
  ctx.lineTo(ax + 6, ay - 2);
  ctx.lineTo(ax - 6, ay - 2);
  ctx.fill();
  px(ctx, ax - 1, ay - 1, runa, 3, 3);
  px(ctx, ax - 10, ay + 9, "rgba(0,0,0,0.35)", 20, 2);

  // tochas e braseiros (chama de 4 quadros + fagulhas)
  for (const [i, t] of TOCHAS.entries()) {
    if (t.tipo === "parede") {
      px(ctx, t.x - 1, t.y - 2, "#2a201a", 3, 10);
      px(ctx, t.x - 3, t.y - 3, "#5a5560", 7, 2);
    } else {
      px(ctx, t.x - 6, t.y - 2, "#2a2630", 12, 6);
      px(ctx, t.x - 5, t.y - 3, "#5a5560", 10, 2);
      px(ctx, t.x - 4, t.y + 4, "#2a2630", 2, 4);
      px(ctx, t.x + 2, t.y + 4, "#2a2630", 2, 4);
    }
    const fl = Math.floor((f + i * 3) / 3) % 4;
    const chamas = [
      ["..y..", ".yoy.", "yoRoy", ".oRo.", "..R.."],
      ["...y.", "..yo.", ".yoRy", ".oRo.", "..R.."],
      [".y...", ".oy..", "yRoy.", ".oRo.", "..R.."],
      ["..y..", ".yoy.", ".oRo.", "yoRoy", "..R.."],
    ][fl];
    const cores: Record<string, string> = { y: "#fff0a0", o: "#ffa63a", R: "#e8452e" };
    const largura = t.tipo === "braseiro" ? 2 : 1;
    chamas.forEach((l, yy) =>
      [...l].forEach((c, xx) => {
        if (!cores[c]) return;
        px(ctx, t.x + (xx - 2) * largura, t.y - 8 + yy, cores[c], largura, 1);
      }),
    );
    // fagulhas subindo
    for (let k = 0; k < 2; k++) {
      const fase = (f + i * 11 + k * 17) % 30;
      px(ctx, t.x + Math.sin((f + k * 9) * 0.3 + i) * 3, t.y - 10 - fase, fase < 15 ? "#ffd27a" : "#c8642a");
    }
  }
  // gotas pingando nas poças
  for (const [i, p] of POCAS.entries()) {
    const ciclo = (f + i * 41) % 90;
    if (ciclo < 12) px(ctx, p.x, p.y - 24 + ciclo * 2, "#9fb8d8");
    else if (ciclo < 30) {
      const r = (ciclo - 12) * 0.5;
      for (let a = 0; a < 12; a++) px(ctx, p.x + Math.cos(a / 1.9) * r, p.y + Math.sin(a / 1.9) * r * 0.45, "rgba(170,200,230,0.6)");
    }
  }
  // poeira no ar
  for (let i = 0; i < 18; i++) {
    const x = (i * 73 + f * 0.15 * ((i % 3) + 1)) % (SALA.x1 - SALA.x0) + SALA.x0;
    const y = SALA.chao0 + ((i * 131 + Math.sin(f * 0.02 + i) * 12) % (SALA.chao1 - SALA.chao0));
    px(ctx, x, y, "rgba(230,210,170,0.35)");
  }
  // rato atravessando de vez em quando
  const cicloRato = f % 420;
  if (cicloRato < 90) {
    const x = SALA.x0 + (cicloRato / 90) * (SALA.x1 - SALA.x0), y = SALA.chao1 - 4;
    px(ctx, x, y, "#5a4c46", 5, 3);
    px(ctx, x + 5, y + 1, "#6a5a52", 2, 2);
    px(ctx, x - 4, y + 2, "#3a302c", 4, 1);
    px(ctx, x + 6, y + 1, "#120e10");
  }
};

// ---------------- iluminação ----------------
export type Luz = { x: number; y: number; r: number; i: number; cor?: string };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
const CEL = 4;

// escurece o salão e acende poças de luz quente das tochas (+ luzes extras: personagens, magias)
export const iluminar = (ctx: Ctx, f: number, extras: Luz[]) => {
  const luzes: Luz[] = TOCHAS.map((t, i) => ({
    x: t.x,
    y: t.y - 4,
    r: (t.tipo === "braseiro" ? 70 : 64) + Math.sin(f * 0.31 + i * 1.7) * 3 + Math.sin(f * 0.77 + i) * 2,
    i: 1.05,
    cor: "#ffa04a",
  }));
  luzes.push(...extras);
  const cols = Math.ceil(TELA_W / CEL), lins = Math.ceil(TELA_H / CEL);
  const y0 = Math.floor((SALA.topo - 34) / CEL), y1 = Math.ceil(TELA_H / CEL);
  for (let cy = y0; cy < Math.min(lins, y1); cy++)
    for (let cx = 0; cx < cols; cx++) {
      const X = cx * CEL + 2, Y = cy * CEL + 2;
      let L = 0.46;
      let quente = 0, wr = 0, wg = 0, wb = 0;
      for (const l of luzes) {
        const dd = Math.hypot(X - l.x, (Y - l.y) * 1.15);
        if (dd >= l.r) continue;
        const k = (1 - dd / l.r) ** 1.4 * l.i;
        L += k;
        if (l.cor) {
          const [r, g, b] = hexParaRgb(l.cor);
          wr += r * k;
          wg += g * k;
          wb += b * k;
          quente += k;
        }
      }
      // escuridão em degraus com pontilhado (cara de 16 bits)
      let esc = Math.max(0, Math.min(0.72, 1 - L));
      const passo = 0.14;
      const q = esc / passo;
      esc = (q - Math.floor(q) > BAYER[(cy % 4) * 4 + (cx % 4)] ? Math.ceil(q) : Math.floor(q)) * passo;
      if (esc > 0.01) {
        ctx.fillStyle = `rgba(8,6,18,${esc.toFixed(2)})`;
        ctx.fillRect(cx * CEL, cy * CEL, CEL, CEL);
      }
      if (quente > 0.05) {
        ctx.fillStyle = `rgba(${Math.round(wr / quente)},${Math.round(wg / quente)},${Math.round(wb / quente)},${Math.min(0.16, quente * 0.1).toFixed(3)})`;
        ctx.fillRect(cx * CEL, cy * CEL, CEL, CEL);
      }
    }
  // vinheta nas bordas do salão
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(4,3,10,${0.1 - i * 0.015})`;
    ctx.fillRect(SALA.x0 + i * 3, SALA.chao0, 3, SALA.chao1 - SALA.chao0);
    ctx.fillRect(SALA.x1 - (i + 1) * 3, SALA.chao0, 3, SALA.chao1 - SALA.chao0);
  }
};

export const corClasse: Record<string, string> = {
  barbaro: "#e7623e",
  bardo: "#c67ac8",
  clerigo: "#d8e0e8",
  druida: "#9aae44",
  guerreiro: "#c8865a",
  monge: "#5ab8d8",
  paladino: "#e8cc66",
  patrulheiro: "#5aae78",
  ladino: "#9a9c96",
  feiticeiro: "#e0554f",
  bruxo: "#a86ff0",
  mago: "#5a8ff0",
};
