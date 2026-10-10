// Lista de eventos sonoros (quadro global → som), sincronizada com o que aparece na tela.
// O sintetizador (audio/arena.py) lê esta lista e monta a mixagem.
import { GOLPE } from "../sim/combate";
import { globalDe, T } from "../linha";
import { CLASSE, PODERES, ESPECIE } from "../sim/tabelas";
import { Cena } from "./quadro";

export type Som = { f: number; som: string; vol: number; tom?: number; pan?: number; prio: number };

export const listarSons = (c: Cena) => {
  const { L, lut } = c;
  const sons: Som[] = [];
  const add = (f: number, som: string, vol: number, prio: number, extra: Partial<Som> = {}) => {
    if (f < 0 || f >= T.fim) return;
    sons.push({ f: Math.round(f), som, vol, prio, ...extra });
  };
  const pan = (x: number) => Math.max(-0.7, Math.min(0.7, (x - 180) / 160));

  // ── intro ──
  Object.keys(c.pousos).forEach((k) => {
    const id = +k;
    add(c.pousos[id], "baque", 0.5, 2, { tom: (c.pousos[id] % 7) * 0.03, pan: pan(c.resultado.posInicial[id].x) });
  });
  add(24, "blip", 0.6, 4);
  add(66, "bip", 0.7, 5);
  add(86, "bip", 0.7, 5);
  add(106, "bip", 0.7, 5, { tom: 0.12 });
  add(126, "lutem", 0.9, 6);

  // ── batalha ──
  const g = (w: number) => globalDe(L, w);
  for (const d of L.dados) {
    const x = lut[d.perto] ? c.resultado.posInicial[d.perto].x : 180;
    add(g(d.t0), "dado", 0.65, 1, { pan: pan(x) });
    if (d.valor === 20) add(g(d.t0 + 6), "sino", 0.75, 7);
    else if (d.valor === 1) add(g(d.t0 + 6), "falha", 0.6, 6);
    else if (d.res === "erro" || d.res === "salvou") add(g(d.t0 + 6), "plim", 0.75, 3);
  }
  for (const f of L.fx) {
    const info = GOLPE[f.golpe];
    const t = ["corte", "estocada", "soco", "impacto"].indexOf(f.tipo) >= 0 ? f.tI - 2 : f.tR;
    add(g(t), info.som, 0.62, 5, { pan: pan(f.de.x) });
  }
  L.faixas.forEach((fa) => {
    const l = lut[fa.id];
    let baixo = false;
    for (const p of fa.pv) {
      if (p.t < 0) continue;
      const k = p.v / l.pvMax;
      if (k < 0.3 && k > 0 && !baixo) {
        add(g(p.t + 6), "bipPV", 0.4, 3);
        baixo = true;
      }
      if (k >= 0.3) baixo = false;
    }
    for (const t of fa.golpes) add(g(t), "hit", 0.55, 4, { pan: pan(fa.pos0.x) });
    if (fa.morte !== null) {
      add(g(fa.morte), "derrota", 1.0, 6);
      add(g(fa.morte + 56), "poof", 0.4, 2);
    }
    for (const s of fa.segs) if (!s.empurrao && s.t1 - s.t0 > 6) for (let t = s.t0 + 2; t < s.t1; t += 7) add(g(t), "passo", 0.16, 0, { pan: pan(s.de.x), tom: (t % 3) * 0.05 });
  });
  for (const fl of L.flutuantes) if (fl.texto === "+" || fl.texto.charAt(0) === "+") add(g(fl.t0), "cura", 0.5, 4);
  for (const b of c.banners) add(b.g, "blip", 0.45, 4);
  for (const cg of L.congela) {
    if (cg.tipo === "cutin") {
      add(cg.g, "whoosh", 0.75, 8);
      add(cg.g + 4, "estalo", 0.7, 8);
    } else {
      add(cg.g, "vs", 0.9, 9);
    }
  }

  // ── vitória ──
  add(T.vencedor, "fanfarra", 0.85, 9);
  add(T.vencedor + 40, "subiu", 0.7, 7);

  // ── pergaminho (mesmos tempos de quadro.ts) ──
  const P0 = T.pergaminho;
  add(P0, "papel", 0.7, 7);
  add(P0 + 8, "levelup", 0.8, 8);
  const s = c.subida;
  const q0 = P0 + 30;
  Object.keys(s.aumentos).forEach((_, i) => add(q0 + 12 + i * 7, "plimSobe", 0.55, 6, { tom: i * 0.1 }));
  add(q0 + 62, "dado", 0.5, 4);
  add(q0 + 80, "plimSobe", 0.6, 7, { tom: 0 });
  let n = 1;
  const info = CLASSE[s.depois.classe];
  if (info.conjurador !== "nenhum") {
    const novos = s.espacosDepois.reduce((a, v, i) => a + Math.max(0, v - (s.espacosAntes[i] ?? 0)), 0);
    if (novos > 0) add(q0 + 104, "plimSobe", 0.6, 7, { tom: 0.1 * n++ });
  }
  let antigos = 0;
  for (let k = 1; k <= s.antes.nivel; k++) antigos += (PODERES[s.antes.classe][k] ?? []).length;
  antigos += ESPECIE[s.antes.especie].tracos.length + (s.antes.estilo ? 1 : 0);
  antigos = Math.min(8, antigos);
  for (let i = 0; i < antigos; i++) add(q0 + 120 + i * 6, "tique", 0.25, 1, { tom: i * 0.04 });
  s.novosPoderes.forEach((_, i) => add(q0 + 120 + antigos * 6 + 6 + i * 14, "plimSobe", 0.65, 7, { tom: 0.1 * n++ }));
  const tH = 120 + antigos * 6 + 6 + s.novosPoderes.length * 14 + 10;
  const fimH = tH + 4 + Math.ceil(s.historia.length / 1.6);
  for (let q = tH + 4; q < fimH; q += 3) add(q0 + q, "tecla", 0.12, 0, { tom: (q % 5) * 0.03 });
  add(q0 + fimH + 16, "selo", 0.7, 6);

  // ── CTA ──
  add(T.cta + 6, "blip", 0.5, 4);
  add(T.cta + 14, "blip", 0.5, 4, { tom: 0.12 });
  add(T.cta + 22, "blip", 0.55, 4, { tom: 0.24 });
  add(T.cta + 34, "final", 0.8, 8);

  sons.sort((a, b) => a.f - b.f);
  return sons;
};
