// Linha do tempo: transforma o log da luta em eventos com quadro marcado.
// O ritmo dos turnos é ajustado (nunca as regras) para as eliminações caberem em 5–56 s
// e o duelo final em 56–64 s. Cut-ins congelam a ação por 0,6 s.
import { Acao, GOLPE, GolpeId, Motivo, P, Passo, ResRolagem, Resultado } from "./sim/combate";
import { Lutador } from "./sim/ficha";
import { COR_DANO, TipoDano } from "./sim/tabelas";
import { hex, RGB } from "./arte/cor";
import { Anim } from "./arte/sprite";

export const FPS = 30;
export const T = {
  intro: 0,
  batalha: 150, // 5 s
  duelo: 1680, // 56 s
  vencedor: 1920, // 64 s
  pergaminho: 2040, // 68 s
  cta: 2580, // 86 s
  fim: 2700, // 90 s
};
export const CUTIN = 18; // 0,6 s
export const VS = 54; // cut-in duplo do duelo
const ESPACO_CUTIN = 130; // no máx. um a cada ~4,3 s

export type Seg = { t0: number; t1: number; de: P; para: P; empurrao: boolean };
export type Papel = { t0: number; t1: number; anim: Anim; tImpacto: number; olha: P | null; grito: boolean };
export type Faixa = {
  id: number;
  pos0: P;
  segs: Seg[];
  papeis: Papel[];
  pv: { t: number; v: number }[];
  conds: { t: number; cond: string; on: boolean }[];
  golpes: number[]; // tempos de impacto recebidos (pisca/recua)
  recuo: { t: number; de: P }[];
  morte: number | null;
  ocupado: [number, number][];
  turnos: [number, number][]; // seta ▼
};

export type FxTipo = string;
export type Fx = {
  tipo: FxTipo;
  t0: number; // início (mundo)
  tR: number; // soltura / disparo
  tI: number; // impacto
  t1: number;
  ator: number;
  alvos: number[];
  de: P;
  para: P;
  cor: RGB;
  golpe: GolpeId;
  dano?: TipoDano;
};
export type Flutuante = { t0: number; alvo: number; texto: string; cor: RGB; grande: boolean };
export type Dado20 = { t0: number; ator: number; perto: number; valor: number; res: ResRolagem; tipo: string };
export type Caixa = { t0: number; t1: number; ator: number; texto: string; cor: RGB };
export type Queda = { tw: number; alvo: number; por: number };
export type CutInEv = { tw: number; ator: number; golpe: GolpeId; rolagem: string; motivo: Motivo; alvo: number };
export type Cue = { f: number; som: string; vol: number; tom?: number; pan?: number };
export type Tremor = { tw: number; forca: number };
export type Rodada = { tw: number; n: number };

export type Linha = {
  faixas: Faixa[];
  fx: Fx[];
  flutuantes: Flutuante[];
  dados: Dado20[];
  caixas: Caixa[];
  quedas: Queda[];
  cutins: CutInEv[];
  tremores: Tremor[];
  rodadas: Rodada[];
  // mundo ↔ global
  congela: { g: number; dur: number; tipo: "cutin" | "vs" }[];
  inicioMundo: number; // global onde o mundo começa a andar (início da batalha)
  fimBatalhaW: number;
  fimDueloW: number;
  dueloInicioW: number;
  temDuelo: boolean;
  finalistas: [number, number] | null;
  vencedor: number;
  ritmo: { gapBatalha: number; escalaBatalha: number; gapDuelo: number; escalaDuelo: number };
};

const VEL = 2.4; // px por quadro andando
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

const projetil = (g: GolpeId) =>
  [
    "flecha",
    "raioFogo",
    "misseis",
    "raioGelo",
    "orbe",
    "rajada",
    "raioGuia",
    "produzirChama",
    "zombaria",
    "sussurros",
  ].indexOf(g) >= 0;

const magiaAnim = (g: GolpeId) => {
  if (g === "ataque" || g === "furtivo" || g === "artes" || g === "oportunidade" || g === "descuidado" || g === "rajadaGolpes" || g === "surtoAcao")
    return "ataque" as Anim;
  if (g === "flecha") return "ataque" as Anim;
  if (g === "desengajar") return "idle" as Anim;
  return "magia" as Anim;
};

type Ctx = {
  lut: Lutador[];
  faixas: Faixa[];
  pos: P[]; // posição lógica atual
  fx: Fx[];
  flutuantes: Flutuante[];
  dados: Dado20[];
  caixas: Caixa[];
  quedas: Queda[];
  tremores: Tremor[];
  candidatos: { tw: number; ator: number; golpe: GolpeId; rolagem: string; motivo: Motivo; alvo: number }[];
  escala: number; // ritmo interno das ações (duelo pode acelerar/desacelerar)
};

/** anima uma ação a partir do quadro `c` (mundo). Devolve o fim e o fim por envolvido. */
const animarAcao = (ctx: Ctx, a: Acao, c0: number, gravar: boolean) => {
  const e = ctx.escala;
  let c = c0;
  const fim: Record<number, number> = {};
  const marca = (id: number, t: number) => (fim[id] = Math.max(fim[id] ?? 0, t));
  let golpeAtual: { g: GolpeId; tB: number; fxi: number | null; papel: Papel | null } | null = null;
  let tImpacto = c;
  let primeiroImpacto = true;
  let nDano = 0;
  const posDe = (id: number) => ctx.pos[id];

  for (const p of a.passos as Passo[]) {
    switch (p.k) {
      case "mover": {
        const d = dist(p.de, p.para);
        const dur = Math.max(4, Math.round((d / VEL) * Math.min(1, e)));
        if (gravar) {
          ctx.faixas[p.ator].segs.push({ t0: c, t1: c + dur, de: { ...p.de }, para: { ...p.para }, empurrao: false });
        }
        ctx.pos[p.ator] = { ...p.para };
        c += dur;
        marca(p.ator, c);
        break;
      }
      case "empurrar": {
        if (gravar) ctx.faixas[p.alvo].segs.push({ t0: tImpacto + 2, t1: tImpacto + 10, de: { ...p.de }, para: { ...p.para }, empurrao: true });
        ctx.pos[p.alvo] = { ...p.para };
        marca(p.alvo, tImpacto + 10);
        break;
      }
      case "golpe": {
        const info = GOLPE[p.golpe];
        const reacao = p.ator !== a.ator;
        const tB = reacao ? Math.max(c - 4, c0) : c;
        const anim = magiaAnim(p.golpe);
        const alvoP = p.alvos.length ? posDe(p.alvos[0]) : posDe(p.ator);
        if (gravar) {
          ctx.caixas.push({ t0: tB, t1: tB + Math.round(30 * Math.max(0.8, e)), ator: p.ator, texto: info.nome, cor: hex(p.cor) });
          const papel: Papel = { t0: tB, t1: tB + 20, anim, tImpacto: tB + 14, olha: p.alvos.length && p.alvos[0] !== p.ator ? { ...alvoP } : null, grito: false };
          if (anim !== "idle") ctx.faixas[p.ator].papeis.push(papel);
          const f: Fx = {
            tipo: info.efeito,
            t0: tB,
            tR: tB + 10,
            tI: tB + 14,
            t1: tB + 30,
            ator: p.ator,
            alvos: p.alvos.slice(),
            de: { ...posDe(p.ator) },
            para: { ...alvoP },
            cor: hex(p.cor),
            golpe: p.golpe,
          };
          ctx.fx.push(f);
          golpeAtual = { g: p.golpe, tB, fxi: ctx.fx.length - 1, papel: anim !== "idle" ? papel : null };
        } else golpeAtual = { g: p.golpe, tB, fxi: null, papel: null };
        if (!reacao) {
          c = tB + Math.round((anim === "magia" ? 12 : 8) * e);
          primeiroImpacto = true;
        } else c = tB + 6;
        marca(p.ator, c + 2);
        if (gravar && a.cutin && !reacao && (p.golpe === a.golpe || a.cutin === "abate" || a.cutin === "critico"))
          ctx.candidatos.push({ tw: tB, ator: p.ator, golpe: p.golpe, rolagem: a.rolagemDestaque, motivo: a.cutin, alvo: p.alvos[0] ?? p.ator });
        break;
      }
      case "rolagem": {
        const tD = c;
        if (gravar) ctx.dados.push({ t0: tD, ator: p.ator, perto: p.tipo === "ataque" ? p.ator : p.alvo, valor: p.d20, res: p.res, tipo: p.tipo });
        c = tD + Math.round(8 * e);
        // tempo de voo do projétil
        if (golpeAtual && primeiroImpacto) {
          const g = golpeAtual.g;
          const voo = projetil(g) ? Math.max(5, Math.min(12, Math.round(dist(posDe(a.ator), posDe(p.alvo)) / 10))) : 2;
          tImpacto = c + voo;
          if (gravar && golpeAtual.fxi !== null) {
            const f = ctx.fx[golpeAtual.fxi];
            f.tR = c;
            f.tI = tImpacto;
            f.t1 = tImpacto + 18;
            f.para = { ...posDe(p.alvo) };
          }
          if (gravar && golpeAtual.papel) {
            golpeAtual.papel.tImpacto = projetil(g) ? c : tImpacto;
            golpeAtual.papel.t1 = Math.max(golpeAtual.papel.t1, tImpacto + 8);
            golpeAtual.papel.grito = p.res === "critico" || (a.cutin !== null && a.cutin !== "area");
          }
          primeiroImpacto = p.tipo === "ataque" ? false : primeiroImpacto;
          if (p.tipo !== "ataque") primeiroImpacto = false;
          c = tImpacto;
        } else if (p.tipo === "ataque") {
          // segundo ataque na mesma ação (rajada, adagas)
          tImpacto = c + 2;
          c = tImpacto;
        } else if (p.tipo === "salva") {
          tImpacto = Math.max(tImpacto, c);
        }
        if (gravar && p.res !== "acerto" && p.res !== "falhou" && p.tipo !== "conc") {
          const txt = p.res === "critico" ? "CRÍTICO!" : p.res === "falha" ? "FALHA!" : p.res === "erro" ? "ERROU" : "SALVOU";
          const cor: RGB = p.res === "critico" ? [255, 214, 60] : p.res === "falha" ? [230, 70, 60] : [220, 220, 228];
          ctx.flutuantes.push({ t0: tImpacto, alvo: p.res === "critico" ? p.alvo : p.alvo, texto: txt, cor, grande: p.res === "critico" });
          if (p.res === "critico") ctx.tremores.push({ tw: tImpacto, forca: 3 });
        }
        marca(p.ator, c + 2);
        marca(p.alvo, tImpacto + 2);
        break;
      }
      case "dano": {
        const t = tImpacto + nDano * 3;
        nDano++;
        if (gravar) {
          const fa = ctx.faixas[p.alvo];
          fa.pv.push({ t, v: p.pvDepois });
          fa.golpes.push(t);
          fa.recuo.push({ t, de: { ...posDe(p.de) } });
          fa.papeis.push({ t0: t, t1: t + 10, anim: "dano", tImpacto: t, olha: { ...posDe(p.de) }, grito: false });
          ctx.flutuantes.push({ t0: t + 1, alvo: p.alvo, texto: `-${p.valor}`, cor: hex(COR_DANO[p.tipo] === "#e8e8ec" ? "#ffffff" : COR_DANO[p.tipo]), grande: p.critico });
          if (p.valor >= 8) ctx.tremores.push({ tw: t, forca: p.valor >= 12 ? 3 : 2 });
          if (golpeAtual && golpeAtual.fxi !== null) ctx.fx[golpeAtual.fxi].dano = p.tipo;
        }
        marca(p.alvo, t + 4);
        c = Math.max(c, t + 2);
        break;
      }
      case "cura": {
        const t = Math.max(tImpacto, c);
        if (gravar) {
          ctx.faixas[p.alvo].pv.push({ t: t + 4, v: p.pvDepois });
          ctx.flutuantes.push({ t0: t + 4, alvo: p.alvo, texto: `+${p.valor}`, cor: [90, 230, 120], grande: false });
        }
        c = t + 8;
        marca(p.alvo, c);
        break;
      }
      case "cond":
        if (gravar) ctx.faixas[p.alvo].conds.push({ t: Math.max(c, tImpacto), cond: p.cond, on: p.on });
        break;
      case "aviso":
        if (gravar) ctx.flutuantes.push({ t0: Math.max(c, tImpacto) + 2, alvo: p.alvo, texto: p.texto, cor: hex(p.cor), grande: false });
        c += 4;
        break;
      case "cai": {
        const t = tImpacto + 3;
        if (gravar) {
          ctx.faixas[p.alvo].morte = t;
          ctx.quedas.push({ tw: t, alvo: p.alvo, por: p.por });
        }
        marca(p.alvo, t + 6);
        c = Math.max(c, t + 6);
        break;
      }
    }
  }
  const fimTotal = Math.max(c + Math.round(4 * e), fim[a.ator] ?? 0);
  return { fim: fimTotal, porId: fim };
};

const novaFaixa = (id: number, p: P, pv: number): Faixa => ({
  id,
  pos0: { ...p },
  segs: [],
  papeis: [],
  pv: [{ t: -99999, v: pv }],
  conds: [],
  golpes: [],
  recuo: [],
  morte: null,
  ocupado: [],
  turnos: [],
});

/** agenda os turnos: cada ação começa depois da anterior + gap, e espera quem estiver ocupado */
const agendar = (
  res: Resultado,
  lut: Lutador[],
  gap: number,
  escalaBatalha: number,
  gapDuelo: number,
  escalaDuelo: number,
  inicioDuelo: number | null, // índice do 1º turno do duelo
  dueloW: number | null, // quadro de mundo onde o duelo começa (null = logo após)
  gravar: boolean,
) => {
  const faixas = lut.map((l) => novaFaixa(l.id, res.posInicial[l.id], l.pvMax));
  const ctx: Ctx = {
    lut,
    faixas,
    pos: res.posInicial.map((p) => ({ ...p })),
    fx: [],
    flutuantes: [],
    dados: [],
    caixas: [],
    quedas: [],
    tremores: [],
    candidatos: [],
    escala: 1,
  };
  const ocupado: number[] = lut.map(() => 0);
  const rodadas: Rodada[] = [];
  let cursor = 0;
  let fimBatalha = 0;
  let fimDuelo = 0;
  let duelo0 = 0;
  res.turnos.forEach((turno, ti) => {
    const emDuelo = inicioDuelo !== null && ti >= inicioDuelo;
    if (emDuelo && ti === inicioDuelo) {
      cursor = dueloW ?? Math.max(cursor, ...ocupado);
      duelo0 = cursor;
      for (let i = 0; i < ocupado.length; i++) ocupado[i] = Math.max(ocupado[i], cursor);
    }
    ctx.escala = emDuelo ? escalaDuelo : escalaBatalha;
    const g = emDuelo ? gapDuelo : gap;
    if (rodadas.length === 0 || rodadas[rodadas.length - 1].n !== turno.rodada) rodadas.push({ tw: cursor, n: turno.rodada });
    let inicioTurno = -1;
    let fimTurno = 0;
    for (const a of turno.acoes) {
      if (!a.passos.length) continue;
      let ini = cursor;
      for (const id of a.envolvidos) ini = Math.max(ini, ocupado[id]);
      if (inicioTurno < 0) inicioTurno = ini;
      const r = animarAcao(ctx, a, ini, gravar);
      for (const id of a.envolvidos) ocupado[id] = Math.max(ocupado[id], r.porId[id] ?? r.fim);
      ocupado[a.ator] = Math.max(ocupado[a.ator], r.fim);
      fimTurno = Math.max(fimTurno, r.fim);
      cursor = ini + g;
      if (gravar) for (const id of a.envolvidos) faixas[id].ocupado.push([ini - 6, r.fim + 6]);
    }
    if (inicioTurno >= 0 && gravar) faixas[turno.ator].turnos.push([inicioTurno, fimTurno]);
    if (inicioTurno < 0) cursor += 2;
    if (emDuelo) fimDuelo = Math.max(fimDuelo, fimTurno);
    else fimBatalha = Math.max(fimBatalha, fimTurno);
  });
  return { ctx, rodadas, fimBatalha, fimDuelo, duelo0 };
};

/** quadro de mundo (wt) em que acontece cada queda, por ordem */
export const montarLinha = (res: Resultado, lut: Lutador[]): Linha => {
  // índice do turno em que restam 2 (início do duelo)
  let vivos = lut.length;
  let inicioDuelo: number | null = null;
  let finalistas: [number, number] | null = null;
  const mortos = new Set<number>();
  res.turnos.forEach((t, ti) => {
    for (const a of t.acoes)
      for (const p of a.passos)
        if (p.k === "cai") {
          vivos--;
          mortos.add(p.alvo);
          if (vivos === 2 && inicioDuelo === null) {
            inicioDuelo = ti + 1;
            const f = lut.filter((l) => !mortos.has(l.id)).map((l) => l.id);
            finalistas = [f[0], f[1]];
          }
        }
  });
  if (inicioDuelo !== null && inicioDuelo >= res.turnos.length) inicioDuelo = null;
  const temDuelo = inicioDuelo !== null;

  // orçamento em quadros de mundo (sem congelamentos)
  const alvoBatalha = (temDuelo ? T.duelo - 6 : T.vencedor - 20) - T.batalha;

  // 1) acha o gap da batalha por busca binária (contando os cut-ins que vão caber)
  const estimarCutins = (fim: number) => Math.min(Math.floor(fim / ESPACO_CUTIN), 12);
  let lo = 0.45;
  let hi = 2;
  let ritmoB = 1;
  for (let it = 0; it < 30; it++) {
    ritmoB = (lo + hi) / 2;
    const { fimBatalha } = agendar(res, lut, 24 * ritmoB, Math.min(1.2, ritmoB), 30, 1, inicioDuelo, null, false);
    const total = fimBatalha + estimarCutins(fimBatalha) * CUTIN;
    if (total > alvoBatalha) hi = ritmoB;
    else lo = ritmoB;
  }
  ritmoB = lo;
  let gap = 24 * ritmoB;
  const escB = Math.min(1.2, ritmoB);

  // 2) duelo: cabe em 56–64 s (menos o VS e o último cut-in)
  const orcDuelo = T.vencedor - T.duelo - VS - CUTIN - 24;
  let escalaDuelo = 1;
  let gapDuelo = 34;
  if (temDuelo) {
    let lo2 = 0.55;
    let hi2 = 2.2;
    for (let it = 0; it < 25; it++) {
      escalaDuelo = (lo2 + hi2) / 2;
      gapDuelo = 34 * escalaDuelo;
      const r = agendar(res, lut, gap, escB, gapDuelo, escalaDuelo, inicioDuelo, 100000, false);
      const dur = r.fimDuelo - r.duelo0;
      if (dur > orcDuelo) hi2 = escalaDuelo;
      else lo2 = escalaDuelo;
    }
    escalaDuelo = lo2;
    gapDuelo = 34 * escalaDuelo;
  }

  // 3) agenda de verdade; o duelo começa no quadro de mundo que cai em 56 s + VS
  let ag = agendar(res, lut, gap, escB, gapDuelo, escalaDuelo, inicioDuelo, null, true);
  // escolhe cut-ins (prioridade crítico > abate > recurso > área; espaçados)
  const escolher = (cands: Ctx["candidatos"]) => {
    const prio: Record<Motivo, number> = { critico: 4, abate: 3, recurso: 2, area: 2 };
    const ord = cands.slice().sort((a, b) => prio[b.motivo] - prio[a.motivo] || a.tw - b.tw);
    const esc: Ctx["candidatos"] = [];
    for (const c of ord) if (esc.every((e) => Math.abs(e.tw - c.tw) >= ESPACO_CUTIN)) esc.push(c);
    return esc.sort((a, b) => a.tw - b.tw);
  };
  let cut = escolher(ag.ctx.candidatos.filter((c) => !temDuelo || c.tw < ag.fimBatalha + 1));
  // ajuste fino: se os cut-ins fizerem a batalha passar de 56 s, recalcula com gap menor
  for (let it = 0; it < 8; it++) {
    const total = ag.fimBatalha + cut.filter((c) => c.tw <= ag.fimBatalha).length * CUTIN;
    if (total <= alvoBatalha + 4) break;
    gap *= 0.94;
    ag = agendar(res, lut, gap, escB, gapDuelo, escalaDuelo, inicioDuelo, null, true);
    cut = escolher(ag.ctx.candidatos.filter((c) => !temDuelo || c.tw < ag.fimBatalha + 1));
  }
  const cutBatalha = cut.filter((c) => c.tw <= ag.fimBatalha);
  // o duelo começa em mundo = (56 s + VS) - batalha - congelamentos
  let dueloW: number | null = null;
  if (temDuelo) {
    dueloW = T.duelo - T.batalha - cutBatalha.length * CUTIN;
    dueloW = Math.max(dueloW, ag.fimBatalha + 4);
    ag = agendar(res, lut, gap, escB, gapDuelo, escalaDuelo, inicioDuelo, dueloW, true);
    const cDuelo = escolher(ag.ctx.candidatos.filter((c) => c.tw >= (dueloW as number)));
    cut = cutBatalha.concat(cDuelo.slice(-1)); // no duelo, só o golpe mais importante
  }

  // o VS fica no lugar certo mesmo se veio depois: recalcula posições globais em ordem de mundo
  const eventosMundo: { tw: number; dur: number; tipo: "cutin" | "vs" }[] = cut.map((c) => ({ tw: c.tw, dur: CUTIN, tipo: "cutin" }));
  if (temDuelo && dueloW !== null) eventosMundo.push({ tw: dueloW, dur: VS, tipo: "vs" });
  eventosMundo.sort((a, b) => a.tw - b.tw || (a.tipo === "vs" ? -1 : 1));
  const congela: Linha["congela"] = [];
  let acum = 0;
  for (const e of eventosMundo) {
    congela.push({ g: T.batalha + e.tw + acum, dur: e.dur, tipo: e.tipo });
    acum += e.dur;
  }

  return {
    faixas: ag.ctx.faixas,
    fx: ag.ctx.fx,
    flutuantes: ag.ctx.flutuantes,
    dados: ag.ctx.dados,
    caixas: ag.ctx.caixas,
    quedas: ag.ctx.quedas,
    cutins: cut,
    tremores: ag.ctx.tremores,
    rodadas: ag.rodadas,
    congela,
    inicioMundo: T.batalha,
    fimBatalhaW: ag.fimBatalha,
    fimDueloW: ag.fimDuelo,
    dueloInicioW: dueloW ?? ag.fimBatalha,
    temDuelo,
    finalistas,
    vencedor: res.vencedor,
    ritmo: { gapBatalha: gap, escalaBatalha: escB, gapDuelo, escalaDuelo },
  };
};

/** global → mundo (congelamentos param o mundo) */
export const mundo = (L: Linha, g: number) => {
  let w = g - L.inicioMundo;
  for (const c of L.congela) {
    if (g >= c.g + c.dur) w -= c.dur;
    else if (g >= c.g) {
      w -= g - c.g;
      break;
    } else break;
  }
  return w;
};

/** mundo → global (início de um evento) */
export const globalDe = (L: Linha, w: number) => {
  let g = w + L.inicioMundo;
  for (const c of L.congela) if (c.g <= g) g += c.dur;
  return g;
};

/** congelamento ativo no quadro global (se houver) */
export const congelamentoEm = (L: Linha, g: number) => {
  for (const c of L.congela) if (g >= c.g && g < c.g + c.dur) return c;
  return null;
};
