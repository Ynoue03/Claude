// Simulação determinística da batalha (roda inteira uma vez e vira uma tabela quadro a quadro).
// O "diretor" garante o roteiro: eliminações espalhadas de 10 s a 67 s, duelo final 70–80 s,
// vencedor definido pela seed (ou pelo campo "vencedor"). A IA cuida do resto: anda, escolhe o
// inimigo mais próximo, ataca, foge com HP baixo.
import { criarRng } from "./rng";
import { ARENA, CENTRO, FPS, PEDRA, T, TOTAL } from "./tempo";
import type { Episodio, Golpe, Status } from "./tipos";
import type { Pose } from "./sprites";

export type Quadro = {
  x: number;
  y: number;
  dir: number; // 0 baixo · 1 cima · 2 esquerda · 3 direita
  pose: Pose;
  hp: number;
  hpShow: number;
  vivo: boolean;
  morte: number; // quadro da derrota (-1 = vivo)
  hitF: number; // último quadro em que levou dano
  status: Status | null;
  escudo: boolean;
  salto: number; // px acima do chão (comemoração)
};

export type Ataque = {
  atk: number;
  alvo: number;
  golpe: Golpe;
  ini: number;
  carga: number; // quadros de preparação
  impacto: number;
  fim: number;
  de: { x: number; y: number };
  para: { x: number; y: number };
  acertou: boolean;
};

export type Numero = { f: number; x: number; y: number; txt: string; cor: string };
export type Queda = { f: number; id: number; x: number; y: number };
export type Cue = { f: number; som: string; vol: number; prio: number; tom?: number };

export type Sim = {
  quadros: Quadro[][];
  ataques: Ataque[];
  numeros: Numero[];
  quedas: Queda[];
  cues: Cue[];
  impactos: { f: number; forca: number }[];
  vencedor: number;
  vice: number;
  fimDuelo: number;
};

const CORPO_A_CORPO = new Set(["esfera", "raio", "aura", "corte", "soco", "clones", "arco"]);

type F = {
  i: number;
  hp: number;
  max: number;
  hpShow: number;
  x: number;
  y: number;
  dir: number;
  vivo: boolean;
  morte: number;
  D: number;
  estado: "livre" | "ataque" | "dano" | "comemora";
  ate: number;
  atq: Ataque | null;
  cd: number[];
  prox: number;
  alvo: number;
  alvoAte: number;
  lado: number;
  fuga: number;
  status: Status | null;
  statusAte: number;
  queimaProx: number;
  escudoAte: number;
  hitF: number;
  kbx: number;
  kby: number;
  kbN: number;
  andou: boolean;
  passo: number;
  avisoBaixo: boolean;
  executado: boolean;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const limitarArena = (p: { x: number; y: number }) => {
  let dx = clamp(p.x - CENTRO.x, -ARENA.a, ARENA.a);
  let dy = clamp(p.y - CENTRO.y, -ARENA.b, ARENA.b);
  const s = Math.abs(dx) / ARENA.a + Math.abs(dy) / ARENA.b;
  if (s > ARENA.k) {
    dx *= ARENA.k / s;
    dy *= ARENA.k / s;
  }
  p.x = CENTRO.x + dx;
  p.y = CENTRO.y + dy;
  const pd = Math.hypot(p.x - PEDRA.x, p.y - PEDRA.y);
  const rmin = PEDRA.r + 5;
  if (pd < rmin) {
    const ux = pd > 0.01 ? (p.x - PEDRA.x) / pd : 0;
    const uy = pd > 0.01 ? (p.y - PEDRA.y) / pd : 1;
    p.x = PEDRA.x + ux * rmin;
    p.y = PEDRA.y + uy * rmin;
  }
};

const direcao = (dx: number, dy: number, atual: number) => {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return atual;
  if (Math.abs(dx) > Math.abs(dy) * 1.15) return dx < 0 ? 2 : 3;
  if (Math.abs(dy) > Math.abs(dx) * 1.15) return dy < 0 ? 1 : 0;
  return atual;
};

export const posInicial = (i: number, n: number) => {
  const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return { x: CENTRO.x + Math.cos(ang) * 80, y: CENTRO.y + Math.sin(ang) * 90 };
};

export const resolverVencedor = (ep: Episodio) => {
  const v = (ep.vencedor ?? "").toString().trim().toLowerCase();
  if (!v) return -1;
  return ep.lutadores.findIndex((l) => l.id.toLowerCase() === v || l.nome.toLowerCase() === v);
};

export const simular = (ep: Episodio): Sim => {
  const rng = criarRng(ep.seed);
  const L = ep.lutadores;
  const n = L.length;

  // ── roteiro do diretor ─────────────────────────────────
  let venc = resolverVencedor(ep);
  if (venc < 0) venc = rng.int(n);
  const ordem = rng.embaralhar(L.map((_, i) => i).filter((i) => i !== venc));
  const vice = ordem[ordem.length - 1];
  const D: number[] = new Array(n).fill(Infinity);
  D[vice] = T.final;
  const cedo = ordem.slice(0, -1);
  const passo = cedo.length > 1 ? (T.ultimaQueda - T.primeiraQueda) / (cedo.length - 1) : 0;
  cedo.forEach((id, k) => {
    const j = k === 0 || k === cedo.length - 1 ? 0 : rng.entre(-0.3, 0.3) * passo;
    D[id] = Math.round((cedo.length > 1 ? T.primeiraQueda + passo * k : T.ultimaQueda) + j);
  });

  const fs: F[] = L.map((l, i) => {
    const p = posInicial(i, n);
    return {
      i,
      hp: l.hp,
      max: l.hp,
      hpShow: l.hp,
      x: p.x,
      y: p.y,
      dir: 0,
      vivo: true,
      morte: -1,
      D: D[i],
      estado: "livre",
      ate: 0,
      atq: null,
      cd: l.golpes.map(() => T.luta + rng.int(40)),
      prox: T.luta + 6 + rng.int(36),
      alvo: -1,
      alvoAte: 0,
      lado: rng.chance(0.5) ? 1 : -1,
      fuga: 0,
      status: null,
      statusAte: 0,
      queimaProx: 0,
      escudoAte: 0,
      hitF: -99,
      kbx: 0,
      kby: 0,
      kbN: 0,
      andou: false,
      passo: 0,
      avisoBaixo: false,
      executado: false,
    };
  });

  const ataques: Ataque[] = [];
  const numeros: Numero[] = [];
  const quedas: Queda[] = [];
  const cues: Cue[] = [];
  const impactos: { f: number; forca: number }[] = [];
  const quadros: Quadro[][] = [];
  let fimDuelo = T.final;

  const alvoHp = (a: F, f: number) => {
    if (a.i === venc) return a.max * (1 - 0.62 * clamp((f - T.luta) / (T.final - T.luta), 0, 1));
    const u = clamp((f - T.luta) / (a.D - T.luta), 0, 1);
    return a.max * Math.pow(1 - u, 0.75);
  };
  const vivos = () => fs.filter((a) => a.vivo);

  const derrotar = (a: F, f: number) => {
    a.vivo = false;
    a.morte = f;
    a.hp = 0;
    a.estado = "livre";
    a.atq = null;
    quedas.push({ f, id: a.i, x: a.x, y: a.y });
    cues.push({ f, som: "derrota", vol: 1, prio: 6 });
    if (a.i === vice) fimDuelo = f;
  };

  const ferir = (a: F, bruto: number, f: number, cor = "#FFFFFF", crit = false) => {
    if (!a.vivo) return 0;
    let d = bruto;
    if (a.escudoAte > f) d *= 0.25;
    const letal = a.i !== venc && f >= a.D - 8;
    const tgt = alvoHp(a, f);
    if (a.hp - d > tgt + 0.18 * a.max) d *= 1.5;
    const piso = letal ? 0 : Math.max(1, tgt * 0.72);
    if (letal) d = Math.max(d, a.hp);
    d = Math.round(Math.min(d, a.hp - piso));
    const topo = { x: a.x, y: a.y - 34 };
    if (d < 1) {
      numeros.push({ f, ...topo, txt: a.escudoAte > f ? "BLOCK" : "GUARD", cor: "#B8C0CC" });
      return 0;
    }
    a.hp -= d;
    a.hitF = f;
    numeros.push({ f, ...topo, txt: `${d}${crit ? "!" : ""}`, cor: crit ? "#FFE040" : cor });
    if (!a.avisoBaixo && a.hp < a.max * 0.25 && a.hp > 0) {
      a.avisoBaixo = true;
      cues.push({ f: f + 4, som: "hpbaixo", vol: 0.8, prio: 2 });
    }
    if (a.hp <= 0) derrotar(a, f);
    return d;
  };

  const iniciar = (a: F, alvo: F, golpe: Golpe, gi: number, f: number) => {
    const ef = golpe.efeito;
    if (ef === "escudo") {
      a.escudoAte = f + 3 * FPS;
      const atq: Ataque = {
        atk: a.i, alvo: a.i, golpe, ini: f, carga: 6, impacto: f + 6, fim: f + 18,
        de: { x: a.x, y: a.y }, para: { x: a.x, y: a.y }, acertou: false,
      };
      ataques.push(atq);
      a.atq = atq;
      a.estado = "ataque";
      a.cd[gi] = f + golpe.recarga * FPS;
      a.prox = f + 24;
      cues.push({ f, som: golpe.som, vol: 0.9, prio: 3 });
      return;
    }
    const d = dist(a, alvo);
    const carga = ef === "bomba" ? 22 : ef === "feixe" || ef === "explosao" || ef === "projetil" ? 14 : 10;
    const viagem =
      ef === "feixe" ? 2
      : ef === "onda" || ef === "projetil" || ef === "bomba" ? Math.ceil(d / 6)
      : ef === "chamas" ? 6
      : ef === "gelo" ? Math.ceil(d / 7)
      : ef === "elastico" ? 4
      : 0;
    const impacto = f + carga + viagem;
    const atq: Ataque = {
      atk: a.i, alvo: alvo.i, golpe, ini: f, carga, impacto,
      fim: impacto + (ef === "feixe" ? 12 : ef === "chamas" ? 16 : 10),
      de: { x: a.x, y: a.y }, para: { x: alvo.x, y: alvo.y }, acertou: false,
    };
    ataques.push(atq);
    a.atq = atq;
    a.estado = "ataque";
    a.dir = direcao(alvo.x - a.x, alvo.y - a.y, a.dir);
    a.cd[gi] = f + golpe.recarga * FPS;
    a.prox = atq.fim + 14 + rng.int(20);
    if (["feixe", "bomba", "esfera", "projetil", "raio"].includes(ef))
      cues.push({ f, som: "carga", vol: 0.55, prio: 1, tom: ef === "bomba" ? -5 : 0 });
  };

  const resolverImpacto = (a: F, atq: Ataque, f: number) => {
    const alvo = fs[atq.alvo];
    const g = atq.golpe;
    atq.de = { x: a.x, y: a.y };
    atq.para = { x: alvo.x, y: alvo.y };
    cues.push({ f, som: g.som, vol: g.especial ? 1 : 0.85, prio: g.especial ? 4 : 3 });
    if (!alvo.vivo) return;
    const corpo = CORPO_A_CORPO.has(g.efeito);
    const letal = alvo.i !== venc && f >= alvo.D - 8;
    const alcancou = corpo || letal || dist(a, alvo) <= g.alcance * 1.7;
    if (!alcancou || (!letal && rng.chance(0.07))) {
      numeros.push({ f, x: alvo.x, y: alvo.y - 34, txt: "MISS", cor: "#B8C0CC" });
      cues.push({ f, som: "miss", vol: 0.5, prio: 1 });
      return;
    }
    atq.acertou = true;
    const crit = rng.chance(0.12);
    const L0 = L[a.i];
    const bruto = g.dano * L0.dano * rng.entre(0.85, 1.15) * (crit ? 1.5 : 1);
    const dano = ferir(alvo, bruto, f, "#FFFFFF", crit);
    impactos.push({ f, forca: g.especial ? 3 : 1 });
    if (dano > 0) {
      cues.push({ f: f + 1, som: "hit", vol: 0.8, prio: 3 });
      if (alvo.vivo) {
        const d = Math.max(0.01, dist(a, alvo));
        alvo.kbx = ((alvo.x - a.x) / d) * 1.3;
        alvo.kby = ((alvo.y - a.y) / d) * 1.3;
        alvo.kbN = 4;
        if (alvo.estado === "livre") {
          alvo.estado = "dano";
          alvo.ate = f + 8;
        }
        if (g.status && rng.chance(0.6)) {
          alvo.status = g.status;
          alvo.statusAte = f + (g.status === "FRZ" ? 40 : g.status === "PAR" ? 50 : 96);
          alvo.queimaProx = f + 24;
        }
      }
    }
    if (g.area) {
      for (const o of fs) {
        if (o.i === a.i || o.i === alvo.i || !o.vivo) continue;
        if (dist(o, atq.para) <= g.area) ferir(o, bruto * 0.5, f + 2, "#FFD8A0");
      }
    }
  };

  for (let f = 0; f < TOTAL; f++) {
    const ativos = vivos();
    if (f >= T.luta) {
      const emAtaque = fs.filter((a) => a.estado === "ataque").length;
      const limite = ativos.length > 8 ? 3 : ativos.length > 4 ? 3 : 2;

      // executor: quem passou do horário programado leva o golpe final
      for (const a of ativos) {
        if (a.i === venc || f < a.D + 20 || a.executado) continue;
        const cand = ativos
          .filter((o) => o.i !== a.i && o.estado !== "ataque")
          .sort((p, q) => dist(p, a) - dist(q, a))[0];
        if (!cand) continue;
        const gs = L[cand.i].golpes;
        let gi = 0;
        gs.forEach((g, k) => {
          if (g.efeito !== "escudo" && g.alcance >= gs[gi].alcance) gi = k;
        });
        if (gs[gi].efeito === "escudo") continue;
        a.executado = true;
        iniciar(cand, a, gs[gi], gi, f);
      }

      for (const a of ativos) {
        const l = L[a.i];
        a.andou = false;
        if (a.status && f >= a.statusAte) a.status = null;
        if (a.status === "BRN" && f >= a.queimaProx) {
          a.queimaProx = f + 24;
          ferir(a, 3, f, "#FF9A40");
          if (!a.vivo) continue;
        }
        if (a.kbN > 0) {
          a.x += a.kbx;
          a.y += a.kby;
          a.kbN--;
        }
        if (a.estado === "dano" && f >= a.ate) a.estado = "livre";

        if (a.estado === "ataque" && a.atq) {
          const atq = a.atq;
          const alvo = fs[atq.alvo];
          if (CORPO_A_CORPO.has(atq.golpe.efeito) && f < atq.impacto && alvo.vivo) {
            const d = Math.max(0.01, dist(a, alvo));
            const alvoX = alvo.x - ((alvo.x - a.x) / d) * 10;
            const alvoY = alvo.y - ((alvo.y - a.y) / d) * 4 - 1;
            const rap = atq.golpe.efeito === "raio" || atq.golpe.efeito === "aura" ? 0.45 : 0.22;
            a.x += (alvoX - a.x) * rap;
            a.y += (alvoY - a.y) * rap;
            a.dir = direcao(alvo.x - a.x, alvo.y - a.y, a.dir);
          }
          if (f === atq.impacto) resolverImpacto(a, atq, f);
          if (f >= atq.fim) {
            a.estado = a.estado === "ataque" ? "livre" : a.estado;
            a.atq = null;
          }
          continue;
        }

        if (a.estado === "comemora") {
          const alvoP = { x: CENTRO.x, y: PEDRA.y + 42 };
          const d = dist(a, alvoP);
          if (d > 1.2) {
            a.x += ((alvoP.x - a.x) / d) * 1.1;
            a.y += ((alvoP.y - a.y) / d) * 1.1;
            a.dir = direcao(alvoP.x - a.x, alvoP.y - a.y, a.dir);
            a.andou = true;
          } else a.dir = 0;
          continue;
        }
        if (a.estado !== "livre") continue;
        if (a.status === "FRZ") continue;

        // escolher alvo
        const outros = ativos.filter((o) => o.i !== a.i && o.vivo);
        if (outros.length === 0) continue;
        if (f >= a.alvoAte || !fs[a.alvo]?.vivo || a.alvo === a.i) {
          let melhor = outros[0];
          let ms = Infinity;
          for (const o of outros) {
            let urg = (o.hp - alvoHp(o, f)) / o.max;
            if (o.i !== venc && f >= o.D - 50) urg += 2;
            const fila = fs.filter((x) => x.vivo && x.i !== a.i && x.alvo === o.i).length;
            const s = dist(a, o) - 45 * urg - (o.i === a.alvo ? 10 : 0) + fila * 14;
            if (s < ms) {
              ms = s;
              melhor = o;
            }
          }
          a.alvo = melhor.i;
          a.alvoAte = f + 12;
        }
        const e = fs[a.alvo];
        const d = dist(a, e);

        // fuga com HP baixo
        const condenado = a.i !== venc && f >= a.D - 60;
        if (a.fuga <= f && a.hp < a.max * 0.3 && !condenado && outros.length > 1 && rng.chance(0.02))
          a.fuga = f + 50;
        const fugindo = a.fuga > f && !condenado;

        const prontos = l.golpes
          .map((g, gi) => ({ g, gi }))
          .filter(({ g, gi }) => a.cd[gi] <= f && g.efeito !== "escudo");
        const escudo = l.golpes.findIndex((g) => g.efeito === "escudo");
        const alcance = Math.max(...l.golpes.filter((g) => g.efeito !== "escudo").map((g) => g.alcance), 20);

        let vx = 0;
        let vy = 0;
        const ux = (e.x - a.x) / Math.max(0.01, d);
        const uy = (e.y - a.y) / Math.max(0.01, d);
        if (fugindo) {
          vx = -ux + -uy * 0.5 * a.lado;
          vy = -uy + ux * 0.5 * a.lado;
        } else {
          const R = prontos.length ? Math.min(...prontos.map((p) => p.g.alcance)) : alcance;
          if (d > R * 0.85) {
            vx = ux;
            vy = uy;
          } else if (d < R * 0.4 && R > 36) {
            vx = -ux * 0.7;
            vy = -uy * 0.7;
          } else {
            vx = -uy * a.lado * 0.55;
            vy = ux * a.lado * 0.55;
          }
          if (rng.chance(0.004)) a.lado *= -1;
          // ataque
          if (f >= a.prox && emAtaque < limite && rng.chance(0.3)) {
            if (escudo >= 0 && a.cd[escudo] <= f && a.hp < a.max * 0.75 && d < 60) {
              iniciar(a, a, l.golpes[escudo], escudo, f);
              continue;
            }
            const ok = prontos.filter(({ g }) => g.alcance >= d);
            if (ok.length) {
              const esp = ok.filter(({ g }) => g.especial);
              const esc = esp.length && rng.chance(0.45) ? esp[rng.int(esp.length)] : ok[rng.int(ok.length)];
              iniciar(a, e, esc.g, esc.gi, f);
              continue;
            }
          }
        }
        // leve atração ao centro da arena: espalha a luta pelo mapa em vez de grudar nas bordas
        const dcx = CENTRO.x - a.x;
        const dcy = CENTRO.y - a.y;
        const dc = Math.hypot(dcx, dcy);
        if (dc > 50) {
          vx += (dcx / dc) * 0.25;
          vy += (dcy / dc) * 0.25;
        }
        const m = Math.hypot(vx, vy);
        if (m > 0.01) {
          const spd = l.velocidade * (a.status === "PAR" ? 0.45 : 1) * (condenado ? 0.6 : 1) * (fugindo ? 1.1 : 1);
          a.x += (vx / m) * spd;
          a.y += (vy / m) * spd;
          a.andou = spd > 0.2;
          a.dir = direcao(vx, vy, a.dir);
          if (!fugindo && d < 70) a.dir = direcao(ux, uy, a.dir);
        }
      }

      // separação + limites
      const vs = vivos();
      for (let p = 0; p < vs.length; p++)
        for (let q = p + 1; q < vs.length; q++) {
          const A = vs[p];
          const B = vs[q];
          const d = dist(A, B);
          if (d < 17 && d > 0.001) {
            const k = (17 - d) / 2 / d * 0.6;
            const dx = (B.x - A.x) * k;
            const dy = (B.y - A.y) * k;
            A.x -= dx;
            A.y -= dy;
            B.x += dx;
            B.y += dy;
          }
        }
      for (const a of vs) limitarArena(a);

      // fim do duelo → vencedor comemora
      const v = fs[venc];
      if (!fs[vice].vivo && v.estado !== "comemora" && v.estado !== "ataque" && f > fimDuelo + 12) {
        v.estado = "comemora";
        v.status = null;
      }
      if (vs.some((a) => a.andou) && f % 9 === 0)
        cues.push({ f, som: "passo", vol: 0.35, prio: 0, tom: (f / 9) % 2 });
    } else {
      // intro: todos virados para o centro
      for (const a of fs) a.dir = direcao(CENTRO.x - a.x, CENTRO.y - a.y, 0);
    }

    // registrar quadro
    quadros.push(
      fs.map((a) => {
        if (a.hpShow > a.hp) a.hpShow = Math.max(a.hp, a.hpShow - Math.max(0.5, (a.hpShow - a.hp) * 0.1));
        if (a.andou) a.passo++;
        const ciclo = Math.floor(a.passo / 5) % 4;
        let pose: Pose = "parado";
        if (a.estado === "ataque") pose = "ataque";
        else if (f - a.hitF < 8) pose = "dano";
        else if (a.andou) pose = ciclo === 0 ? "passo1" : ciclo === 2 ? "passo2" : "parado";
        let salto = 0;
        if (a.estado === "comemora" && f >= T.vencedor - 6 && !a.andou) {
          pose = "vitoria";
          const c = (f - T.vencedor) % 18;
          salto = c < 9 ? [0, 2, 4, 5, 6, 6, 5, 4, 2][c] : 0;
          a.dir = 0;
        }
        return {
          x: a.x,
          y: a.y,
          dir: a.dir,
          pose,
          hp: a.hp,
          hpShow: a.hpShow,
          vivo: a.vivo,
          morte: a.morte,
          hitF: a.hitF,
          status: a.status,
          escudo: a.escudoAte > f,
          salto,
        };
      }),
    );
  }

  // cues fixas do roteiro
  cues.push({ f: T.banner, som: "banner", vol: 1, prio: 6 });
  L.forEach((_, i) => cues.push({ f: 6 + i * 4, som: "pop", vol: 0.45, prio: 1, tom: i % 8 }));
  cues.push({ f: T.conta3, som: "conta", vol: 1, prio: 7, tom: 0 });
  cues.push({ f: T.conta2, som: "conta", vol: 1, prio: 7, tom: 0 });
  cues.push({ f: T.conta1, som: "conta", vol: 1, prio: 7, tom: 0 });
  cues.push({ f: T.luta, som: "fight", vol: 1, prio: 7 });
  for (const q of quedas) cues.push({ f: q.f + 6, som: "blip", vol: 0.7, prio: 5 });
  cues.push({ f: T.duelo, som: "zoom", vol: 0.9, prio: 6 });
  cues.push({ f: T.vencedor, som: "fanfarra", vol: 1, prio: 8 });
  cues.push({ f: T.cta, som: "blip", vol: 0.8, prio: 6 });
  cues.sort((a, b) => a.f - b.f);

  return { quadros, ataques, numeros, quedas, cues, impactos, vencedor: venc, vice, fimDuelo };
};
