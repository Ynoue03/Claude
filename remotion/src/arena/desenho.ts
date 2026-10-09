// Monta um quadro: mundo (270×480 + margem) → câmera (zoom/tremor) → HUD e banners por cima, 4×.
import { CONTORNO, luz, tom } from "./cores";
import { desenharAtaque, poeira } from "./efeitos";
import { larguraTexto, texto } from "./fonte";
import { desenharAgua, desenharEspumaFlores, desenharPedra, ilhaEstatica, M, MH, MW, PEDRA_BASE } from "./mapa";
import { anel, disco, elipse, linha, px, ret, type Ctx } from "./pixel";
import { hash } from "./rng";
import type { Sim } from "./sim";
import { SH, SW, sprite, spriteCaido } from "./sprites";
import { H, T, W } from "./tempo";
import type { Episodio } from "./tipos";

const ESCALA = 4;
const surgeEm = (i: number) => 6 + i * 4;

let mundo: HTMLCanvasElement | null = null;
let ui: HTMLCanvasElement | null = null;
const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

const corHp = (r: number) => (r > 0.5 ? "#48D060" : r > 0.25 ? "#F0C83A" : "#E8483A");

// ── câmera ──────────────────────────────────────────────
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));

const foco = (sim: Sim, f: number) => {
  const q = sim.quadros[f];
  if (f >= sim.fimDuelo + 10) return { x: q[sim.vencedor].x, y: q[sim.vencedor].y - 20 };
  const a = q[sim.vencedor];
  const b = q[sim.vice];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 14 };
};

export const camera = (sim: Sim, f: number) => {
  let z = 1;
  let cx = W / 2;
  let cy = H / 2;
  if (f >= T.duelo) {
    const k = ease((f - T.duelo) / 20);
    z = 1 + 0.2 * k;
    // foco suavizado (média dos últimos quadros, determinística)
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let j = Math.max(T.duelo, f - 14); j <= f; j++) {
      const p = foco(sim, j);
      sx += p.x;
      sy += p.y;
      n++;
    }
    const vw = W / z;
    const vh = H / z;
    const tx = Math.max(vw / 2, Math.min(W - vw / 2, sx / n));
    const ty = Math.max(vh / 2, Math.min(H - vh / 2, sy / n + 30));
    cx = W / 2 + (tx - W / 2) * k;
    cy = H / 2 + (ty - H / 2) * k;
  }
  // tremor
  let amp = 0;
  for (const im of sim.impactos) {
    const d = f - im.f;
    if (d >= 0 && d < 8) amp += im.forca * (1 - d / 8) * (f >= T.duelo ? 1.0 : 0.45);
  }
  if (f >= T.luta && f < T.luta + 8) amp += 2 * (1 - (f - T.luta) / 8);
  amp = Math.min(amp, 5);
  const sx = Math.round((hash(f, 1) - 0.5) * 2 * amp);
  const sy = Math.round((hash(f, 2) - 0.5) * 2 * amp);
  return { z, cx: cx + sx, cy: cy + sy };
};

// ── mundo ───────────────────────────────────────────────
const desenharMundo = (ctx: Ctx, ep: Episodio, sim: Sim, f: number) => {
  ctx.save();
  ctx.translate(M, M);
  desenharAgua(ctx, f);
  ctx.drawImage(ilhaEstatica(), -M, -M);
  desenharEspumaFlores(ctx, f);
  const q = sim.quadros[f];
  const L = ep.lutadores;

  // sombras
  q.forEach((s, i) => {
    if (f < surgeEm(i)) return;
    if (!s.vivo && f - s.morte > 30) return;
    elipse(ctx, s.x, s.y, 7 - Math.min(3, s.salto / 2), 2, "rgba(40,30,20,0.32)");
  });

  // ordenação por profundidade (lutadores + pedra)
  const itens: { y: number; d: () => void }[] = [{ y: PEDRA_BASE, d: () => desenharPedra(ctx) }];
  q.forEach((s, i) => {
    if (f < surgeEm(i)) return;
    const morto = !s.vivo;
    const tm = f - s.morte;
    if (morto && tm > 30) return;
    itens.push({
      y: s.y,
      d: () => {
        const l = L[i];
        const X = Math.round(s.x) - Math.floor(SW / 2);
        const Y = Math.round(s.y) - SH + 1 - s.salto;
        if (morto) {
          if (tm < 14) {
            if (tm % 4 < 2) ctx.drawImage(sprite(l, s.dir, "dano", tm % 8 < 2), X, Y);
          } else if (tm < 30) {
            const c = spriteCaido(l);
            if (tm < 24 || tm % 2 === 0) ctx.drawImage(c, Math.round(s.x) - 17, Math.round(s.y) - 22);
          }
          return;
        }
        // giro do Howitzer durante a carga
        let dir = s.dir;
        const atq = s.pose === "ataque" ? ataqueAtivo(sim, i, f) : null;
        if (atq && atq.golpe.efeito === "explosao" && f < atq.impacto) dir = [0, 3, 1, 2][Math.floor((f - atq.ini) / 2) % 4];
        const flash = f - s.hitF < 7 && (f - s.hitF) % 2 === 0;
        ctx.drawImage(sprite(l, dir, s.pose, flash), X, Y);
        // status sobre o sprite
        if (s.status === "FRZ") {
          ctx.fillStyle = "rgba(120,230,255,0.45)";
          ctx.fillRect(X + 3, Y + 4, SW - 6, SH - 4);
          ret(ctx, X + 3, Y + 4, 1, SH - 4, "#E8FFFF");
          px(ctx, X + 6, Y + 7, "#FFFFFF", 2);
          px(ctx, X + 18, Y + 20, "#FFFFFF");
        } else if (s.status === "BRN") {
          for (let k = 0; k < 3; k++) {
            const ox = X + 5 + Math.floor(hash(f >> 2, i * 3 + k) * 16);
            const oy = Y + 14 + Math.floor(hash(f >> 2, i * 3 + k + 1) * 14);
            px(ctx, ox, oy, "#FF8A1A", 2);
            px(ctx, ox, oy - 2, "#FFD040");
          }
        } else if (s.status === "PAR" && f % 6 < 3) {
          const ox = X + 4 + Math.floor(hash(f, i) * 18);
          const oy = Y + 8 + Math.floor(hash(f, i + 40) * 18);
          linha(ctx, ox, oy, ox + 3, oy + 2, "#FFE040");
          linha(ctx, ox + 3, oy + 2, ox + 1, oy + 5, "#FFE040");
        }
        if (s.escudo) {
          const r = 16 + (f % 8 < 4 ? 0 : 1);
          ctx.globalAlpha = 0.25;
          disco(ctx, s.x, s.y - 14, r, "#7FF8FF");
          ctx.globalAlpha = 1;
          anel(ctx, s.x, s.y - 14, r, "#7FF8FF", 1);
          for (let k = 0; k < 3; k++) {
            const a = f * 0.15 + k * 2.1;
            px(ctx, s.x + Math.cos(a) * r, s.y - 14 + Math.sin(a) * r, "#FFFFFF", 2);
          }
        }
      },
    });
  });
  itens.sort((a, b) => a.y - b.y);
  for (const it of itens) it.d();

  // surgimento (intro) e "poof" da derrota
  q.forEach((s, i) => {
    const ts = f - surgeEm(i);
    if (ts >= 0 && ts < 12) poeira(ctx, { x: s.x, y: s.y - 12 }, ts, i * 11, "#FFFFFF", 7);
    if (!s.vivo) {
      const tm = f - s.morte;
      if (tm >= 22 && tm < 46) {
        poeira(ctx, { x: s.x, y: s.y - 8 }, (tm - 22) * 0.7, i * 13, "#F0EEF4", 9);
        poeira(ctx, { x: s.x, y: s.y - 8 }, (tm - 22) * 0.5, i * 17, "#B8B4C4", 6);
      }
    }
  });

  // efeitos dos golpes
  for (const atq of sim.ataques) {
    if (f < atq.ini || f > atq.fim + 14) continue;
    desenharAtaque(ctx, atq, f, sim, ep);
  }

  // barras de HP + status
  q.forEach((s, i) => {
    if (f < surgeEm(i) || !s.vivo) return;
    if (f >= T.vencedor) return;
    const x = Math.round(s.x) - 9;
    const y = Math.round(s.y) + 3;
    const r = Math.max(0, s.hpShow / L[i].hp);
    ret(ctx, x, y, 18, 4, CONTORNO);
    ret(ctx, x + 1, y + 1, 16, 2, "#4A3040");
    ret(ctx, x + 1, y + 1, Math.max(0, Math.round(16 * (s.hp / L[i].hp))), 2, "#F8F0E0");
    ret(ctx, x + 1, y + 1, Math.round(16 * Math.min(r, s.hp / L[i].hp)), 2, corHp(s.hp / L[i].hp));
    ret(ctx, x + 1, y + 1, Math.round(16 * Math.min(r, s.hp / L[i].hp)), 1, tom(corHp(s.hp / L[i].hp), 0.3));
    if (s.status) {
      const c = s.status === "BRN" ? "#FF9A40" : s.status === "PAR" ? "#FFE040" : "#7FF0FF";
      texto(ctx, s.status, s.x, y + 6, c, 1, CONTORNO, "centro");
    }
  });

  // números de dano
  for (const n of sim.numeros) {
    const t = f - n.f;
    if (t < 0 || t > 24) continue;
    if (t > 18 && t % 2) continue;
    const dy = -Math.min(12, t * 1.1) + (t < 3 ? -2 + t : 0);
    texto(ctx, n.txt, n.x, n.y + dy, n.cor, 1, CONTORNO, "centro");
  }

  // caixas com o nome do golpe (≈1 s)
  const caixas: { x: number; y: number; w: number; h: number; atq: (typeof sim.ataques)[number] }[] = [];
  for (const atq of sim.ataques) {
    if (f < atq.ini || f > atq.ini + 30) continue;
    const s = q[atq.atk];
    if (!s.vivo) continue;
    const tw = larguraTexto(atq.golpe.nome);
    const w = tw + 10;
    const h = 13;
    let x = Math.round(s.x - w / 2);
    x = Math.max(24, Math.min(246 - w, x));
    let y = Math.round(s.y) - SH - h - 2 - s.salto;
    for (const c of caixas) {
      if (x < c.x + c.w && x + w > c.x && y < c.y + c.h && y + h > c.y) y = c.y - h - 1;
    }
    caixas.push({ x, y, w, h, atq });
  }
  for (const c of caixas) {
    const t = f - c.atq.ini;
    const cor = c.atq.golpe.cor;
    const enc = t < 1 ? 2 : 0; // pequeno "pop" na entrada
    ret(ctx, c.x + enc, c.y, c.w - enc * 2, c.h, CONTORNO);
    ret(ctx, c.x + 2 + enc, c.y + 2, c.w - 4 - enc * 2, c.h - 4, cor);
    ret(ctx, c.x + 2 + enc, c.y + 2, c.w - 4 - enc * 2, 1, tom(cor, 0.35));
    ret(ctx, c.x + 2 + enc, c.y + c.h - 3, c.w - 4 - enc * 2, 1, tom(cor, -0.3));
    {
      const sombra = luz(cor) > 0.55 ? tom(cor, -0.65) : tom(cor, -0.5);
      texto(ctx, c.atq.golpe.nome, c.x + 5 + 1, c.y + 4 + 1, sombra);
      texto(ctx, c.atq.golpe.nome, c.x + 5, c.y + 4, "#FFFFFF");
    }
    // seta para o lutador
    px(ctx, c.x + c.w / 2 - 1, c.y + c.h, CONTORNO, 2);
  }
  ctx.restore();
};

const ataqueAtivo = (sim: Sim, i: number, f: number) => {
  for (let k = sim.ataques.length - 1; k >= 0; k--) {
    const a = sim.ataques[k];
    if (a.atk === i && f >= a.ini && f <= a.fim) return a;
    if (a.ini < f - 200) break;
  }
  return null;
};

// ── interface ───────────────────────────────────────────
const caixaClara = (ctx: Ctx, x: number, y: number, w: number, h: number) => {
  ret(ctx, x - 1, y - 1, w + 2, h + 2, "#120E1E");
  ret(ctx, x, y, w, h, "#2A1E3A");
  ret(ctx, x + 2, y + 2, w - 4, h - 4, "#F8F0D8");
  ret(ctx, x + 2, y + h - 4, w - 4, 2, "#E2D4B0");
  ret(ctx, x + 4, y + 4, w - 8, 1, "#D8B060");
  ret(ctx, x + 4, y + h - 6, w - 8, 1, "#D8B060");
  // cantos decorados
  for (const [cx, cy] of [[x + 4, y + 4], [x + w - 5, y + 4], [x + 4, y + h - 6], [x + w - 5, y + h - 6]]) {
    px(ctx, cx, cy, "#C83A3A");
    px(ctx, cx - 1, cy, "#D8B060");
    px(ctx, cx + 1, cy, "#D8B060");
    px(ctx, cx, cy - 1, "#D8B060");
    px(ctx, cx, cy + 1, "#D8B060");
  }
};

const hud = (ctx: Ctx, ep: Episodio, sim: Sim, f: number) => {
  const x0 = 22;
  const y0 = 57;
  const w = 226;
  const h = 51;
  ret(ctx, x0 - 1, y0 - 1, w + 2, h + 2, "#06050C");
  ctx.fillStyle = "rgba(20,18,42,0.9)";
  ctx.fillRect(x0, y0, w, h);
  ret(ctx, x0, y0, w, 1, "#F4EED8");
  ret(ctx, x0, y0 + h - 1, w, 1, "#8A84A8");
  ret(ctx, x0, y0, 1, h, "#F4EED8");
  ret(ctx, x0 + w - 1, y0, 1, h, "#8A84A8");
  const q = sim.quadros[f];
  const vivos = q.filter((s) => s.vivo).length;
  texto(ctx, ep.titulo, x0 + 4, y0 + 3, "#F8D048");
  texto(ctx, `${ep.textos.vivos} ${vivos}`, x0 + w - 4, y0 + 3, "#FFFFFF", 1, undefined, "dir");
  ret(ctx, x0 + 3, y0 + 10, w - 6, 1, "#3A3460");
  const cw = (w - 6) / 4;
  ep.lutadores.forEach((l, i) => {
    const c = i % 4;
    const r = Math.floor(i / 4);
    const x = Math.round(x0 + 3 + c * cw);
    const y = y0 + 13 + r * 10;
    const s = q[i];
    const fora = !s.vivo && f >= s.morte + 6;
    const ferido = f - s.hitF < 5 && s.vivo;
    ret(ctx, x, y, 3, 5, fora ? "#4A4858" : l.visual.cabelo);
    ret(ctx, x, y + 3, 3, 2, fora ? "#4A4858" : l.visual.roupa);
    if (fora) {
      px(ctx, x, y + 1, "#E8483A");
      px(ctx, x + 2, y + 1, "#E8483A");
      px(ctx, x + 1, y + 2, "#E8483A");
    }
    texto(ctx, l.nome, x + 5, y, fora ? "#5E5C70" : ferido ? "#FF7A6A" : "#FFFFFF");
    const bw = Math.floor(cw) - 4;
    ret(ctx, x, y + 6, bw, 3, "#06050C");
    ret(ctx, x + 1, y + 7, bw - 2, 1, "#3A2A38");
    if (!fora) {
      const rr = Math.max(0, s.hpShow / l.hp);
      ret(ctx, x + 1, y + 7, Math.round((bw - 2) * rr), 1, "#F8F0E0");
      ret(ctx, x + 1, y + 7, Math.round((bw - 2) * Math.max(0, s.hp / l.hp)), 1, corHp(s.hp / l.hp));
    }
  });
};

const confete = (ctx: Ctx, f: number) => {
  const t = f - T.vencedor;
  if (t < 0) return;
  const CORES = ["#F04A5A", "#F8D048", "#48D060", "#3A8CF0", "#F28AC8", "#FFFFFF", "#9A5AE8"];
  for (let k = 0; k < 90; k++) {
    const atraso = hash(k, 3) * 40;
    const tt = t - atraso;
    if (tt < 0) continue;
    const vel = 0.9 + hash(k, 4) * 1.1;
    const y = ((-12 + tt * vel + hash(k, 5) * 60) % 500) - 10;
    const x = hash(k, 6) * W + Math.sin(tt * 0.12 + k) * 6;
    const giro = Math.floor(tt / 4 + k) % 2;
    ret(ctx, x, y, giro ? 2 : 1, giro ? 1 : 2, CORES[k % CORES.length]);
  }
};

const desenharUI = (ctx: Ctx, ep: Episodio, sim: Sim, f: number) => {
  ctx.clearRect(0, 0, W, H);
  if (f >= T.cta) {
    const k = Math.min(1, (f - T.cta) / 8);
    ctx.fillStyle = `rgba(10,8,24,${0.6 * k})`;
    ctx.fillRect(0, 0, W, H);
  }
  hud(ctx, ep, sim, f);
  const tx = ep.textos;

  // banner inicial
  if (f >= T.banner && f < T.conta3) {
    const t = f - T.banner;
    const tw = larguraTexto(tx.escolha, 2);
    const w = Math.min(226, tw + 22);
    const ab = Math.min(1, t / 6);
    const ww = Math.max(8, Math.round(w * ab));
    const x = Math.round(W / 2 - ww / 2);
    const y = 226;
    caixaClara(ctx, x, y, ww, 32);
    if (ab >= 1) {
      texto(ctx, ep.titulo, W / 2, y + 8, "#B07A2A", 1, undefined, "centro");
      if (t % 30 < 24 || t < 20) texto(ctx, tx.escolha, W / 2, y + 16, "#2A1E3A", 2, undefined, "centro");
    }
  }
  // contagem
  const conta: [number, string][] = [[T.conta3, "3"], [T.conta2, "2"], [T.conta1, "1"]];
  for (const [ini, s] of conta) {
    const t = f - ini;
    if (t < 0 || t >= 20) continue;
    const esc = t < 3 ? 11 - t : 8;
    texto(ctx, s, W / 2, 238 - (5 * esc) / 2, "#FFFFFF", esc, "#2A1E3A", "centro");
  }
  if (f >= T.luta && f < T.luta + 26) {
    const t = f - T.luta;
    const esc = t < 3 ? 7 - t : 5;
    const dx = t < 8 ? Math.round((hash(f, 9) - 0.5) * 4) : 0;
    texto(ctx, tx.luta, W / 2 + dx, 238 - (5 * esc) / 2, "#FFE040", esc, "#B01822", "centro");
  }

  // avisos de derrota
  let pilha = 0;
  for (const qd of sim.quedas) {
    const t = f - qd.f - 4;
    if (t < 0 || t > 44) continue;
    const nome = ep.lutadores[qd.id].nome;
    const msg = `${nome} ${tx.derrota}`;
    const w = Math.min(226, larguraTexto(msg, 2) + 12);
    const entra = Math.min(1, t / 5);
    const sai = t > 38 ? (t - 38) / 6 : 0;
    const x = Math.round(22 - (w + 30) * (1 - entra) + (w + 260) * sai * sai);
    const y = 112 + pilha * 18;
    pilha++;
    ret(ctx, x - 1, y - 1, w + 2, 16, "#06050C");
    ret(ctx, x, y, w, 14, "#3A0E1E");
    ret(ctx, x, y, w, 1, "#E8483A");
    ret(ctx, x, y + 13, w, 1, "#7A1A2A");
    const nw = larguraTexto(`${nome} `, 2);
    texto(ctx, `${nome} `, x + 6, y + 2, "#FFFFFF", 2);
    texto(ctx, tx.derrota, x + 6 + nw, y + 2, "#FF6A5A", 2);
  }

  // duelo final
  if (f >= T.duelo + 4 && f < T.duelo + 50) {
    const t = f - T.duelo - 4;
    const a = ep.lutadores[sim.vencedor].nome;
    const b = ep.lutadores[sim.vice].nome;
    const msg = `${a} VS ${b}`;
    if (t % 8 < 6 || t > 16) {
      texto(ctx, "FINAL DUEL!", W / 2, 116, "#FFE040", 2, "#B01822", "centro");
      texto(ctx, msg, W / 2, 132, "#FFFFFF", 1, CONTORNO, "centro");
    }
  }

  // vencedor
  if (f >= T.vencedor) {
    confete(ctx, f);
    const t = f - T.vencedor;
    const nome = ep.lutadores[sim.vencedor].nome;
    const w2 = larguraTexto(`${nome}!`, 3);
    const w = Math.min(226, Math.max(w2, larguraTexto(tx.vencedor, 2)) + 24);
    const ab = Math.min(1, t / 6);
    const ww = Math.max(8, Math.round(w * ab));
    const y = f >= T.cta ? 118 : 124;
    caixaClara(ctx, Math.round(W / 2 - ww / 2), y, ww, 40);
    if (ab >= 1) {
      texto(ctx, tx.vencedor, W / 2, y + 7, "#B07A2A", 2, undefined, "centro");
      const pisca = t < 24 && t % 6 < 3;
      texto(ctx, `${nome}!`, W / 2, y + 20, pisca ? "#C83A3A" : "#2A1E3A", 3, undefined, "centro");
    }
  }

  // CTA
  if (f >= T.cta) {
    const t = f - T.cta;
    const sobe = Math.max(0, 1 - t / 8);
    const y = Math.round(272 + sobe * 140);
    const linhas = tx.cta;
    const w = 226;
    const x = 22;
    const h = 22 + linhas.length * 16 + 14;
    ret(ctx, x - 1, y - 1, w + 2, h + 2, "#06050C");
    ret(ctx, x, y, w, h, "#1E1A3A");
    ret(ctx, x + 1, y + 1, w - 2, 1, "#F4EED8");
    ret(ctx, x + 1, y + h - 2, w - 2, 1, "#5A548A");
    linhas.forEach((l, k) => {
      const esc = larguraTexto(l, 2) <= w - 12 ? 2 : 1;
      texto(ctx, l, W / 2, y + 8 + k * 16, k === 0 ? "#FFFFFF" : "#FFE040", esc, CONTORNO, "centro");
    });
    const yp = y + 8 + linhas.length * 16 + 2;
    texto(ctx, ep.perfil, W / 2, yp, "#7FE8FF", 2, CONTORNO, "centro");
    // balão de comentário pixel
    const bx = x + 8;
    const by = yp + 1;
    ret(ctx, bx, by, 9, 6, "#FFFFFF");
    px(ctx, bx + 2, by + 6, "#FFFFFF", 2);
    ret(ctx, bx + 2, by + 2, 1, 1, "#1E1A3A");
    ret(ctx, bx + 4, by + 2, 1, 1, "#1E1A3A");
    ret(ctx, bx + 6, by + 2, 1, 1, "#1E1A3A");
  }
};

// ── quadro completo ─────────────────────────────────────
export const desenharQuadro = (alvo: HTMLCanvasElement, ep: Episodio, sim: Sim, f: number) => {
  mundo ??= canvas(MW, MH);
  ui ??= canvas(W, H);
  const mctx = mundo.getContext("2d")!;
  mctx.imageSmoothingEnabled = false;
  desenharMundo(mctx, ep, sim, f);
  const uctx = ui.getContext("2d")!;
  desenharUI(uctx, ep, sim, f);

  const ctx = alvo.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, alvo.width, alvo.height);
  const cam = camera(sim, f);
  const vw = W / cam.z;
  const vh = H / cam.z;
  const sx = cam.cx - vw / 2 + M;
  const sy = cam.cy - vh / 2 + M;
  ctx.drawImage(mundo, sx, sy, vw, vh, 0, 0, W * ESCALA, H * ESCALA);
  ctx.drawImage(ui, 0, 0, W, H, 0, 0, W * ESCALA, H * ESCALA);
};
