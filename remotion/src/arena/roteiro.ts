// Roteiro: distribui os turnos da simulação no tempo do vídeo (90 s) sem mudar nenhuma regra.
// Tempo de "cena" (s) = tempo do vídeo (v) menos os congelamentos (cut-ins e VS).
import { gerarLutadores, subirNivel, poderesAte } from "./personagem.ts";
import type { Episodio, Lutador, SubidaNivel } from "./personagem.ts";
import { simular } from "./combate.ts";
import type { Batida, Efeito, P, Resultado, Simulacao } from "./combate.ts";
import { CLASSES, ESPECIES, espacos } from "./regras.ts";
import type { TipoDano } from "./regras.ts";

export const FPS = 30;
export const V = {
  batalha: 150,
  duelo: 1680,
  vitoria: 1920,
  pergaminho: 2040,
  cta: 2580,
  fim: 2700,
};
export const CUTIN = 18; // 0,6 s congelado
export const VS = 48; // cut-in duplo do duelo
export const ESPACO_CUTIN = 135; // mínimo de 4,5 s entre cut-ins

export type Golpe = Batida & { k: "golpe" } & {
  t0: number; // início (cena)
  tImp: number; // impacto
  t1: number;
  origem: P;
  destinos: P[]; // posição de cada alvo no impacto
  cutin: boolean;
  turno: number;
};
export type Movimento = { ator: number; t0: number; t1: number; pts: P[]; corre: boolean; recua: boolean };
export type Congela = { s: number; d: number; tipo: "cutin" | "vs"; golpe?: Golpe; v0: number };
export type Chave = { f: number; x: number; y: number };
export type SomEv = { v: number; s: string; vol: number };

export type Roteiro = {
  ep: Episodio;
  lutadores: Lutador[];
  sim: Simulacao;
  turnos: { t0: number; t1: number; ator: number; rodada: number }[];
  golpes: Golpe[];
  movimentos: Movimento[];
  congela: Congela[];
  pos: Chave[][];
  pv: { f: number; pv: number; temp: number }[][];
  cond: { f: number; c: string; on: boolean }[][];
  morte: number[]; // cena
  danos: { f: number; id: number }[]; // quando cada um levou dano (para piscar/dor)
  vencedor: number;
  sFimDuelo: number;
  sDuelo: number;
  finalistas: number[];
  sons: SomEv[];
  subida: SubidaNivel;
  historia: string;
  pergaminho: ItemPergaminho[];
  avisos: string[];
};

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

// ───────────── duração natural de cada batida (quadros de cena) ─────────────
const ehBuff = (b: Batida & { k: "golpe" }) => b.resultados.every((r) => r.r === "buff" || (r.r === "cura" && r.alvo === b.ator));
const DISTANCIA_FX: Efeito[] = ["flecha", "raioFogo", "misseis", "raioGelo", "orbe", "rajada", "chama", "raioGuia", "espinhos"];
const natural = (b: Batida, posAtor: P, posAlvo: P | undefined) => {
  if (b.k === "estado") return { pre: 0, viagem: 0, pos: 0 };
  if (b.k === "mover") {
    let L = 0;
    for (let i = 1; i < b.pts.length; i++) L += dist(b.pts[i - 1], b.pts[i]);
    return { pre: 0, viagem: Math.max(4, L / (b.corre ? 5.5 : 4)), pos: 0 };
  }
  if (ehBuff(b)) return { pre: 9, viagem: 0, pos: 11 };
  const viaja = DISTANCIA_FX.includes(b.fx) && posAlvo ? Math.min(14, Math.max(4, dist(posAtor, posAlvo) / 11)) : 0;
  const morreu = b.resultados.some((r) => r.morreu);
  return { pre: b.magia ? 9 : 7, viagem: viaja, pos: 12 + (morreu ? 12 : 0) + (b.resultados.length > 1 ? 4 : 0) };
};

export const criarRoteiro = (ep: Episodio): Roteiro => {
  const { lutadores, rng } = gerarLutadores(ep);
  const sim = simular(lutadores, rng);
  const N = lutadores.length;
  const avisos: string[] = [];

  // índice do turno em que restam 2
  let quedas = 0;
  let idx2 = -1;
  sim.turnos.forEach((t, i) =>
    t.batidas.forEach((b) => {
      if (b.k === "golpe")
        b.resultados.forEach((r) => {
          if (r.morreu) {
            quedas++;
            if (quedas === N - 2 && idx2 < 0) idx2 = i;
          }
        });
    }),
  );
  if (idx2 < 0) idx2 = sim.turnos.length - 1; // (só acontece se a luta terminar sem duelo)

  // Faz o layout de uma fase; retorna a duração natural e (se escala dada) preenche tempos.
  type Plano = { golpes: Golpe[]; movs: Movimento[]; turnos: Roteiro["turnos"]; fim: number; pos: P[] };
  const layout = (ini: number, fimT: number, inicioS: number, escala: number, folga: number, posIni: P[], cutins: Set<string>): Plano => {
    const pos = posIni.map((p) => ({ ...p }));
    const golpes: Golpe[] = [];
    const movs: Movimento[] = [];
    const turnos: Roteiro["turnos"] = [];
    let s = inicioS;
    for (let ti = ini; ti <= fimT; ti++) {
      const t = sim.turnos[ti];
      const t0 = s;
      s += 5 * escala;
      let sobra = 0; // parte final do último golpe que pode se sobrepor ao próximo turno
      t.batidas.forEach((b, bi) => {
        if (b.k === "mover") {
          const n = natural(b, pos[b.ator], undefined);
          const d = n.viagem * escala;
          movs.push({ ator: b.ator, t0: s, t1: s + d, pts: b.pts, corre: b.corre, recua: b.recua });
          pos[b.ator] = { ...b.pts[b.pts.length - 1] };
          s += d;
          sobra = 0;
        } else if (b.k === "golpe") {
          const alvoP = b.resultados[0] ? pos[b.resultados[0].alvo] : undefined;
          const n = natural(b, pos[b.ator], alvoP);
          const chave = `${ti}:${bi}`;
          const g: Golpe = {
            ...b,
            t0: s,
            tImp: s + (n.pre + n.viagem) * escala,
            t1: s + (n.pre + n.viagem + n.pos) * escala,
            origem: { ...pos[b.ator] },
            destinos: b.resultados.map((r) => ({ ...pos[r.alvo] })),
            cutin: cutins.has(chave),
            turno: ti,
          };
          (g as Golpe & { chave: string }).chave = chave;
          golpes.push(g);
          b.resultados.forEach((r) => r.novaPos && (pos[r.alvo] = { ...r.novaPos }));
          s = g.t1;
          sobra = Math.max(0, n.pos - (b.resultados.some((r) => r.morreu) ? 16 : 7)) * escala;
        }
      });
      s += -sobra + 3 * escala + folga;
      turnos.push({ t0, t1: s, ator: t.ator, rodada: t.rodada });
    }
    return { golpes, movs, turnos, fim: s, pos };
  };

  // 1ª passada: duração natural
  const posA = sim.posIniciais;
  const natBat = layout(0, idx2, 0, 1, 0, posA, new Set());
  const natDuelo = layout(idx2 + 1, sim.turnos.length - 1, 0, 1, 0, natBat.pos, new Set());

  // escolhe cut-ins pela prioridade (crítico > abate > recurso), respeitando o espaçamento
  const escolherCutins = (planos: { p: Plano; offset: number; escala: number }[]) => {
    const cands: { chave: string; prio: number; v: number }[] = [];
    for (const { p, offset, escala } of planos)
      for (const g of p.golpes) {
        if (g.especial > 0) cands.push({ chave: (g as Golpe & { chave: string }).chave, prio: g.especial, v: offset + g.tImp * escala });
      }
    cands.sort((a, b) => b.prio - a.prio || a.v - b.v);
    const aceitos: typeof cands = [];
    for (const c of cands) {
      if (c.v < V.batalha + 45) continue;
      if (Math.abs(c.v - V.duelo) < 70) continue; // não colide com o VS
      if (c.v > V.vitoria - 20) continue;
      if (aceitos.every((a) => Math.abs(a.v - c.v) >= ESPACO_CUTIN)) aceitos.push(c);
    }
    return aceitos;
  };
  const orcBat = V.duelo - V.batalha;
  const orcDuelo = V.vitoria - V.duelo - VS - 16;
  let esc1 = orcBat / natBat.fim;
  let esc2 = orcDuelo / Math.max(1, natDuelo.fim);
  const pre = escolherCutins([
    { p: natBat, offset: V.batalha, escala: esc1 },
    { p: natDuelo, offset: V.duelo + VS, escala: esc2 },
  ]);
  const set = new Set(pre.map((c) => c.chave));
  const contar = (p: Plano) => p.golpes.filter((g) => set.has((g as Golpe & { chave: string }).chave)).length;
  const nCutBat = contar(natBat);
  const nCutDuelo = contar(natDuelo);

  // 2ª passada: escala final para caber no tempo
  const ajustar = (nat: number, orc: number, nTurnos: number) => {
    let e = orc / Math.max(1, nat);
    let folga = 0;
    if (e > 1.35) {
      folga = ((e - 1.35) * nat) / Math.max(1, nTurnos);
      e = 1.35;
    }
    return { e, folga };
  };
  const a1 = ajustar(natBat.fim, orcBat - nCutBat * CUTIN, idx2 + 1);
  esc1 = a1.e;
  if (esc1 < 0.5) avisos.push(`Batalha comprimida (escala ${esc1.toFixed(2)}): turnos muito rápidos — considere outra seed.`);
  const sBat0 = V.batalha;
  const bat = layout(0, idx2, sBat0, esc1, a1.folga, posA, set);
  // cena no fim da batalha: V.duelo - cut-ins da batalha
  const sDuelo = V.duelo - nCutBat * CUTIN;
  bat.turnos[bat.turnos.length - 1].t1 = sDuelo;
  const a2 = ajustar(natDuelo.fim, orcDuelo - nCutDuelo * CUTIN, sim.turnos.length - 1 - idx2);
  esc2 = a2.e;
  if (esc2 < 0.5) avisos.push(`Duelo comprimido (escala ${esc2.toFixed(2)}).`);
  // o duelo começa depois do VS (congelado no tempo de cena sDuelo)
  const duelo = layout(idx2 + 1, sim.turnos.length - 1, sDuelo + 8, esc2, a2.folga, bat.pos, set);
  const sFimDuelo = duelo.turnos.length ? duelo.turnos[duelo.turnos.length - 1].t1 : sDuelo + 8;

  const golpes = [...bat.golpes, ...duelo.golpes];
  const movimentos = [...bat.movs, ...duelo.movs];
  const turnos = [...bat.turnos, ...duelo.turnos];

  // congelamentos (cena → vídeo)
  const congela: Congela[] = [];
  for (const g of golpes) if (g.cutin) congela.push({ s: g.tImp, d: CUTIN, tipo: "cutin", golpe: g, v0: 0 });
  congela.push({ s: sDuelo, d: VS, tipo: "vs", v0: 0 });
  congela.sort((a, b) => a.s - b.s);
  let acum = 0;
  for (const c of congela) {
    c.v0 = c.s + acum;
    acum += c.d;
  }

  // ───── trilhas de estado por lutador (tempo de cena) ─────
  const pos: Chave[][] = lutadores.map((_, i) => [{ f: 0, x: posA[i].x, y: posA[i].y }]);
  for (const m of movimentos) {
    const L: number[] = [0];
    for (let i = 1; i < m.pts.length; i++) L.push(L[i - 1] + dist(m.pts[i - 1], m.pts[i]));
    const tot = L[L.length - 1] || 1;
    m.pts.forEach((p, i) => pos[m.ator].push({ f: m.t0 + (m.t1 - m.t0) * (L[i] / tot), x: p.x, y: p.y }));
  }
  const pv = lutadores.map((l) => [{ f: 0, pv: l.pvMax, temp: 0 }]);
  const cond = lutadores.map(() => [] as { f: number; c: string; on: boolean }[]);
  const morte = lutadores.map(() => Infinity);
  const danos: { f: number; id: number }[] = [];
  for (const g of golpes) {
    g.resultados.forEach((r: Resultado) => {
      pv[r.alvo].push({ f: g.tImp, pv: r.pvDepois, temp: r.pvTempDepois });
      if (r.dano > 0) danos.push({ f: g.tImp, id: r.alvo });
      if (r.morreu) morte[r.alvo] = g.tImp;
      if (r.novaPos) {
        const cur = posEm(pos[r.alvo], g.tImp);
        pos[r.alvo].push({ f: g.tImp, x: cur.x, y: cur.y }, { f: g.tImp + 6, x: r.novaPos.x, y: r.novaPos.y });
      }
    });
    g.cond.forEach((c) => cond[c.id].push({ f: g.tImp, c: c.add ?? c.del!, on: !!c.add }));
  }
  // estados sem golpe (fim de escudo etc.) — usa o início do turno
  sim.turnos.forEach((t, ti) => {
    const tt = turnos[ti];
    t.batidas.forEach((b) => {
      if (b.k === "estado") b.cond.forEach((c) => cond[c.id].push({ f: tt.t0 + 2, c: c.add ?? c.del!, on: !!c.add }));
    });
  });
  pos.forEach((p) => p.sort((a, b) => a.f - b.f));
  pv.forEach((p) => p.sort((a, b) => a.f - b.f));
  cond.forEach((p) => p.sort((a, b) => a.f - b.f));
  // concentração some quando o lutador cai
  lutadores.forEach((_, i) => {
    if (morte[i] < Infinity) ["CNC", "MRC", "FÚR", "ESC", "LNT", "ZMB"].forEach((c) => cond[i].push({ f: morte[i], c, on: false }));
  });

  const vencedor = sim.vencedor;
  const finalistas = [vencedor, sim.ordemQueda[sim.ordemQueda.length - 1]].filter((x) => x !== undefined && x >= 0);

  // ───── subida de nível, história e pergaminho ─────
  const campeao = lutadores[vencedor];
  const subida = subirNivel(campeao, rng);
  const historia = escreverHistoria(campeao, sim, subida);
  const pergaminho = montarPergaminho(campeao, subida, sim);

  const r: Roteiro = {
    ep,
    lutadores,
    sim,
    turnos,
    golpes,
    movimentos,
    congela,
    pos,
    pv,
    cond,
    morte,
    danos,
    vencedor,
    sFimDuelo,
    sDuelo,
    finalistas,
    sons: [],
    subida,
    historia,
    pergaminho,
    avisos,
  };
  r.sons = gerarSons(r);
  return r;
};

// ───────────── consultas usadas pelo render ─────────────
export const posEm = (ch: Chave[], f: number): P => {
  if (f <= ch[0].f) return { x: ch[0].x, y: ch[0].y };
  for (let i = 1; i < ch.length; i++) {
    if (f <= ch[i].f) {
      const a = ch[i - 1],
        b = ch[i];
      const t = b.f === a.f ? 1 : (f - a.f) / (b.f - a.f);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  const z = ch[ch.length - 1];
  return { x: z.x, y: z.y };
};

// vídeo → cena (e se está dentro de um congelamento)
export const cena = (r: Roteiro, v: number): { s: number; congelado?: Congela; dentro: number } => {
  let acum = 0;
  for (const c of r.congela) {
    if (v < c.v0) break;
    if (v < c.v0 + c.d) return { s: c.s, congelado: c, dentro: v - c.v0 };
    acum += c.d;
  }
  return { s: v - acum, dentro: 0 };
};
export const video = (r: Roteiro, s: number): number => {
  let acum = 0;
  for (const c of r.congela) {
    if (s < c.s) break;
    acum += c.d;
  }
  return s + acum;
};

export const valorEm = <T extends { f: number }>(arr: T[], f: number): T | undefined => {
  let out: T | undefined;
  for (const x of arr) {
    if (x.f <= f) out = x;
    else break;
  }
  return out;
};
export const condicoesEm = (r: Roteiro, id: number, f: number): string[] => {
  const on = new Map<string, boolean>();
  for (const c of r.cond[id]) {
    if (c.f > f) break;
    on.set(c.c, c.on);
  }
  return [...on.entries()].filter(([, v]) => v).map(([k]) => k);
};

// ───────────── história do campeão (3ª pessoa, sem marcar gênero) ─────────────
const ORIGEM: Record<string, string> = {
  HUMANO: "Das cidades muradas do sul",
  ELFO: "Das florestas antigas do norte",
  ANAO: "Das forjas sob a montanha",
  HALFLING: "Dos vales tranquilos do oeste",
  GNOMO: "Das oficinas escondidas nas colinas",
  ORC: "Das estepes de cinza",
  TIEFLING: "Dos becos onde o fogo infernal ainda queima",
  DRACONATO: "Das ilhas do dragão",
  GOLIAS: "Dos picos gelados",
};
const FEITO: Record<string, string> = {
  GUERREIRO: "ergueu a lâmina contra todos",
  BARBARO: "deixou a fúria falar mais alto",
  PALADINO: "lutou guiado por um juramento sagrado",
  PATRULHEIRO: "caçou cada rival de longe",
  LADINO: "atacou das sombras",
  MONGE: "lutou com punhos e respiração",
  MAGO: "dobrou o fogo e o trovão",
  FEITICEIRO: "soltou a magia que corre no sangue",
  BRUXO: "cobrou o preço de um pacto sombrio",
  CLERIGO: "trouxe a luz sagrada ao calabouço",
  DRUIDA: "invocou espinhos e chamas",
  BARDO: "venceu com versos afiados",
};
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const escreverHistoria = (c: Lutador, sim: Simulacao, sub: SubidaNivel): string => {
  const st = sim.stats[c.id];
  const origem = c.especie === "DRACONATO" ? `${ORIGEM.DRACONATO} ${c.ancestralidade?.nome ?? ""}`.trim() : ORIGEM[c.especie];
  const abates = st.abates === 0 ? "sem derrubar ninguém até o fim" : st.abates === 1 ? "derrubou um rival" : `derrubou ${st.abates} rivais`;
  const frases: string[] = [];
  frases.push(`${origem}, ${c.nome} ${FEITO[c.classe]} e ${abates}.`);
  if (st.menorPv <= Math.max(3, c.pvMax * 0.3)) frases.push(`Resistiu com ${st.menorPv} PV quando tudo parecia perdido.`);
  else if (st.primeiroCritico) frases.push(`Acertou um crítico (${st.primeiroCritico}) que ficou na memória da arena.`);
  if (st.golpeFinal) frases.push(`Golpe final: ${capital(st.golpeFinal.toLowerCase())}.`);
  const novo = sub.poderesNovos[0];
  frases.push(novo ? `Agora, no nível ${sub.para}, domina: ${novo.nome}.` : `Agora, no nível ${sub.para}, volta mais forte.`);
  return frases.join(" ");
};

// ───────────── pergaminho: itens em sequência (o render e o áudio usam a mesma agenda) ─────────────
export type ItemPergaminho = {
  v: number; // quadro do vídeo em que aparece
  tipo: "titulo" | "atributo" | "combate" | "poder" | "historia" | "rodape";
  texto: string;
  extra?: string; // "+1" em verde etc.
  novo?: boolean;
  desc?: string;
};
const montarPergaminho = (c: Lutador, sub: SubidaNivel, sim: Simulacao): ItemPergaminho[] => {
  const itens: ItemPergaminho[] = [];
  let v = V.pergaminho + 34; // depois de desenrolar (1 s)
  const passo = (n: number) => {
    v += n;
    return v;
  };
  itens.push({ v, tipo: "titulo", texto: c.nome });
  const ats = ["FOR", "DES", "CON", "INT", "SAB", "CAR"] as const;
  for (const a of ats) {
    const antes = sub.atributosAntes[a];
    const depois = sub.atributosDepois[a];
    const md = Math.floor((depois - 10) / 2);
    itens.push({ v: passo(9), tipo: "atributo", texto: `${a} ${depois} (${md >= 0 ? "+" : ""}${md})`, extra: depois > antes ? `+${depois - antes}` : undefined });
  }
  const pb = sub.para >= 5 ? 3 : 2;
  const pbAntes = sub.de >= 5 ? 3 : 2;
  const conj = CLASSES[c.classe].conjuracao;
  itens.push({ v: passo(16), tipo: "combate", texto: `PV ${sub.pvDepois}`, extra: `+${sub.pvGanho}`, desc: `d${sub.dado} = ${sub.rolagem} ${sub.conMod >= 0 ? "+" : ""}${sub.conMod} CON${sub.anao ? " +1" : ""}` });
  itens.push({ v: passo(30), tipo: "combate", texto: `CA ${c.ca}` });
  const atkAt = c.arma.atributo === "DES" ? Math.max(sub.atributosDepois.DES, sub.atributosDepois.FOR) : sub.atributosDepois.FOR;
  const atkAntesAt = c.arma.atributo === "DES" ? Math.max(sub.atributosAntes.DES, sub.atributosAntes.FOR) : sub.atributosAntes.FOR;
  const atk = Math.floor((atkAt - 10) / 2) + pb;
  const atkAntes = Math.floor((atkAntesAt - 10) / 2) + pbAntes;
  itens.push({ v: passo(9), tipo: "combate", texto: `ATAQUE +${atk}`, extra: atk > atkAntes ? `+${atk - atkAntes}` : undefined });
  if (conj) {
    const cdV = 8 + pb + Math.floor((sub.atributosDepois[conj] - 10) / 2);
    const cdA = 8 + pbAntes + Math.floor((sub.atributosAntes[conj] - 10) / 2);
    itens.push({ v: passo(9), tipo: "combate", texto: `CD DE MAGIA ${cdV}`, extra: cdV > cdA ? `+${cdV - cdA}` : undefined });
  }
  const ea = espacos(c.classe, sub.de);
  const ed = espacos(c.classe, sub.para);
  if (ed.length) {
    const txt = ed.map((n, i) => (n ? `${n}×${i + 1}º` : "")).filter(Boolean).join(" ");
    const novos = ed.reduce((s, n, i) => s + Math.max(0, n - (ea[i] ?? 0)), 0);
    itens.push({ v: passo(9), tipo: "combate", texto: `ESPAÇOS ${txt}`, extra: novos > 0 ? `+${novos}` : undefined });
  }
  // poderes: antigos primeiro, os novos por último (verde, NOVO!)
  const antigos = poderesAte({ classe: c.classe, especie: c.especie, nivel: sub.de });
  v += 12;
  for (const p of antigos.slice(0, 7)) itens.push({ v: passo(5), tipo: "poder", texto: p.nome });
  v += 8;
  for (const p of sub.poderesNovos) itens.push({ v: passo(22), tipo: "poder", texto: p.nome, novo: true, desc: p.desc });
  itens.push({ v: passo(24), tipo: "historia", texto: "" });
  void sim;
  return itens;
};
export const ESPECIE_NOME = (l: Lutador) => ESPECIES[l.especie].nome;

// ───────────── eventos de áudio (quadros do vídeo) ─────────────
const SOM_FX: Partial<Record<Efeito, string>> = {
  corte: "corte",
  corteGrande: "corte",
  estocada: "corte",
  impacto: "impacto",
  soco: "soco",
  flecha: "flecha",
  raioFogo: "fogo",
  chama: "fogo",
  orbe: "fogo",
  misseis: "energia",
  rajada: "sombra",
  bruxaria: "sombra",
  onda: "trovao",
  raioGelo: "gelo",
  chamaSagrada: "luz",
  raioGuia: "luz",
  fulgor: "luz",
  cura: "cura",
  espinhos: "corte",
  zombaria: "zombaria",
  sussurros: "zombaria",
  sopro: "sopro",
  furia: "furia",
  marca: "brilho",
  escudo: "brilho",
  brilho: "brilho",
};
const SOM_TIPO: Partial<Record<TipoDano, string>> = { eletrico: "raio", frio: "gelo", fogo: "fogo", acido: "veneno", veneno: "veneno" };

const gerarSons = (r: Roteiro): SomEv[] => {
  const S: SomEv[] = [];
  const add = (v: number, s: string, vol = 1) => S.push({ v: Math.round(v), s, vol });
  const N = r.lutadores.length;
  // intro
  for (let i = 0; i < N; i++) add(8 + i * 4 + 10, "queda", 0.5);
  add(78, "banner", 0.9);
  add(100, "conta", 1);
  add(115, "conta", 1);
  add(130, "conta", 1);
  add(145, "lutem", 1);
  // golpes
  for (const g of r.golpes) {
    const v0 = video(r, g.t0);
    const vi = video(r, g.tImp) + (g.cutin ? 0 : 0);
    if (g.d20) add(v0 + 1, "dado", 0.55);
    if (g.cutin) {
      const c = r.congela.find((x) => x.golpe === g)!;
      add(c.v0, "whoosh", 1);
      add(c.v0 + 3, "estalo", 0.9);
    }
    const vImp = g.cutin ? r.congela.find((x) => x.golpe === g)!.v0 + CUTIN : vi;
    if (g.magia && g.fx !== "cura") add(v0 + 2, "conjura", 0.5);
    const base = (g.fx === "sopro" || g.fx === "orbe") && SOM_TIPO[g.tipo] ? SOM_TIPO[g.tipo]! : SOM_FX[g.fx] ?? "impacto";
    const algumAcerto = g.resultados.some((x) => x.dano > 0 || x.cura > 0 || x.r === "buff");
    if (algumAcerto || !g.d20) add(vImp, base, 0.9);
    else add(vImp - 2, "swing", 0.6);
    for (const x of g.resultados) {
      if (x.r === "critico") add(vImp, "sino", 1);
      if (x.r === "erro" || x.r === "falha") add(vImp + 2, "plim", 0.7);
      if (x.dano > 0) add(vImp + 1, "hit", 0.8);
      if (x.morreu) {
        add(vImp + 8, "derrota", 0.9);
        add(vImp + 14, "banner", 0.6);
      }
      // PV baixo
      const l = r.lutadores[x.alvo];
      if (!x.morreu && x.dano > 0 && x.pvDepois / l.pvMax < 0.3 && x.pvDepois + x.dano >= l.pvMax * 0.3) add(vImp + 10, "bip", 0.55);
    }
  }
  // passos (discretos): um a cada 7 quadros de caminhada do lutador ativo
  for (const m of r.movimentos) {
    for (let s = m.t0 + 2; s < m.t1; s += m.corre ? 5 : 7) add(video(r, s), "passo", 0.3);
  }
  // duelo
  const vs = r.congela.find((c) => c.tipo === "vs")!;
  add(vs.v0, "whoosh", 1);
  add(vs.v0 + 4, "estalo", 1);
  add(vs.v0 + 10, "vs", 1);
  // vitória e pergaminho
  add(V.vitoria, "fanfarra", 1);
  add(V.vitoria + 38, "brilho", 0.8);
  add(V.pergaminho, "papel", 1);
  add(V.pergaminho + 8, "levelup", 0.9);
  for (const it of r.pergaminho) {
    if (it.extra || it.novo) add(it.v, "plimSobe", 0.85);
    else if (it.tipo === "atributo" || it.tipo === "poder" || it.tipo === "combate") add(it.v, "tique", 0.4);
  }
  add(V.cta, "banner", 0.8);
  return S.sort((a, b) => a.v - b.v);
};
