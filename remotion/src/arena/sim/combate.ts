// Simulação da luta (todos contra todos) com regras do SRD 5.2 e IA simples.
// Função pura da seed: mesmas fichas + mesma seed = mesma luta, rolagem por rolagem.
import { Dados, sinal } from "./rng";
import { atqArma, atqMagia, cdMagia, Lutador, modArma, modAtr, prof } from "./ficha";
import { Atributo, CLASSE, ClasseId, COR_DANO, TipoDano } from "./tabelas";

// ─────────────────────────── geometria da arena ───────────────────────────
// Coordenadas em pixels da resolução interna (360×640). 5 pés = 12 px.
export const PX_POR_PE = 12 / 5;
export const ARENA = { x0: 50, x1: 310, y0: 250, y1: 518, cx: 180, cy: 384 };
export const ALTAR = { x: 180, y: 384, r: 17 };
const CORPO = 24; // alcance corpo a corpo (5 pés), centro a centro
const SEPARACAO = 15;

export type P = { x: number; y: number };
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const pes = (px: number) => px / PX_POR_PE;

// ─────────────────────────── golpes ───────────────────────────
export type GolpeId =
  | "ataque"
  | "flecha"
  | "furtivo"
  | "artes"
  | "folego"
  | "furia"
  | "curaMaos"
  | "curarFerimentos"
  | "marca"
  | "raioFogo"
  | "misseis"
  | "onda"
  | "escudo"
  | "raioGelo"
  | "orbe"
  | "inata"
  | "rajada"
  | "bruxaria"
  | "chama"
  | "raioGuia"
  | "palavra"
  | "produzirChama"
  | "chicote"
  | "zombaria"
  | "sussurros"
  | "sopro"
  | "surtoAdrenalina"
  | "desengajar"
  | "surtoAcao"
  | "destruicao"
  | "descuidado"
  | "rajadaGolpes"
  | "centelha"
  | "oportunidade"
  | "pedra";

export type Efeito =
  | "corte"
  | "estocada"
  | "impacto"
  | "flecha"
  | "soco"
  | "bolaFogo"
  | "dardos"
  | "onda"
  | "gelo"
  | "orbe"
  | "rajada"
  | "sombra"
  | "colunaLuz"
  | "raioLuz"
  | "cura"
  | "espinhos"
  | "notas"
  | "sopro"
  | "vapor"
  | "marca"
  | "escudo"
  | "brilho"
  | "nenhum";

export type InfoGolpe = { nome: string; cor: string; efeito: Efeito; som: string };

export const GOLPE: Record<GolpeId, InfoGolpe> = {
  ataque: { nome: "ATAQUE", cor: "#e8e8ec", efeito: "corte", som: "corte" },
  flecha: { nome: "FLECHA", cor: "#d8c49a", efeito: "flecha", som: "flecha" },
  furtivo: { nome: "ATAQUE FURTIVO", cor: "#a8aeb8", efeito: "estocada", som: "corte" },
  artes: { nome: "ARTES MARCIAIS", cor: "#8fd0f0", efeito: "soco", som: "soco" },
  folego: { nome: "RETOMAR O FÔLEGO", cor: "#4ad070", efeito: "cura", som: "cura" },
  furia: { nome: "FÚRIA!", cor: "#f07a1a", efeito: "vapor", som: "furia" },
  curaMaos: { nome: "CURA PELAS MÃOS", cor: "#4ad070", efeito: "cura", som: "cura" },
  curarFerimentos: { nome: "CURAR FERIMENTOS", cor: "#4ad070", efeito: "cura", som: "cura" },
  marca: { nome: "MARCA DO CAÇADOR", cor: "#a8e030", efeito: "marca", som: "marca" },
  raioFogo: { nome: "RAIO DE FOGO", cor: "#f07a1a", efeito: "bolaFogo", som: "fogo" },
  misseis: { nome: "MÍSSEIS MÁGICOS", cor: "#e03aa8", efeito: "dardos", som: "energia" },
  onda: { nome: "ONDA TROVEJANTE", cor: "#3a6ae0", efeito: "onda", som: "trovao" },
  escudo: { nome: "ESCUDO", cor: "#4ad0e0", efeito: "escudo", som: "escudo" },
  raioGelo: { nome: "RAIO DE GELO", cor: "#8fd6f4", efeito: "gelo", som: "gelo" },
  orbe: { nome: "ORBE CROMÁTICO", cor: "#a8e030", efeito: "orbe", som: "energia" },
  inata: { nome: "FEITIÇARIA INATA", cor: "#e04a4a", efeito: "brilho", som: "brilho" },
  rajada: { nome: "RAJADA MÍSTICA", cor: "#e03aa8", efeito: "rajada", som: "sombra" },
  bruxaria: { nome: "BRUXARIA", cor: "#8a3ad0", efeito: "sombra", som: "sombra" },
  chama: { nome: "CHAMA SAGRADA", cor: "#f2c43a", efeito: "colunaLuz", som: "luz" },
  raioGuia: { nome: "RAIO GUIA", cor: "#f2c43a", efeito: "raioLuz", som: "luz" },
  palavra: { nome: "PALAVRA CURATIVA", cor: "#4ad070", efeito: "cura", som: "cura" },
  produzirChama: { nome: "PRODUZIR CHAMA", cor: "#f07a1a", efeito: "bolaFogo", som: "fogo" },
  chicote: { nome: "CHICOTE DE ESPINHOS", cor: "#4ab040", efeito: "espinhos", som: "espinhos" },
  zombaria: { nome: "ZOMBARIA VICIOSA", cor: "#f07ab8", efeito: "notas", som: "zombaria" },
  sussurros: { nome: "SUSSURROS DISSONANTES", cor: "#f07ab8", efeito: "notas", som: "zombaria" },
  sopro: { nome: "ARMA DE SOPRO", cor: "#f07a1a", efeito: "sopro", som: "sopro" },
  surtoAdrenalina: { nome: "SURTO DE ADRENALINA", cor: "#c0602a", efeito: "vapor", som: "furia" },
  desengajar: { nome: "DESENGAJAR", cor: "#8a8f9c", efeito: "nenhum", som: "passo" },
  surtoAcao: { nome: "SURTO DE AÇÃO!", cor: "#e8e8ec", efeito: "brilho", som: "furia" },
  destruicao: { nome: "DESTRUIÇÃO DIVINA", cor: "#f2c43a", efeito: "colunaLuz", som: "luz" },
  descuidado: { nome: "ATAQUE DESCUIDADO", cor: "#f07a1a", efeito: "corte", som: "corte" },
  rajadaGolpes: { nome: "RAJADA DE GOLPES", cor: "#8fd0f0", efeito: "soco", som: "soco" },
  centelha: { nome: "CENTELHA DIVINA", cor: "#f2c43a", efeito: "colunaLuz", som: "luz" },
  oportunidade: { nome: "ATAQUE DE OPORTUNIDADE", cor: "#e8e8ec", efeito: "corte", som: "corte" },
  pedra: { nome: "RESISTÊNCIA DA PEDRA", cor: "#a8aab0", efeito: "escudo", som: "escudo" },
};

// ─────────────────────────── passos (o que a linha do tempo anima) ───────────────────────────
export type Cond = "ATD" | "MRC" | "LNT" | "FÚR" | "CNC" | "ESC";
export type ResRolagem = "acerto" | "erro" | "critico" | "falha" | "salvou" | "falhou";

export type Passo =
  | { k: "mover"; ator: number; de: P; para: P; oportunidade?: boolean }
  | { k: "golpe"; ator: number; golpe: GolpeId; alvos: number[]; alvo: P; cor: string; texto?: string }
  | {
      k: "rolagem";
      ator: number;
      alvo: number;
      tipo: "ataque" | "salva" | "conc";
      d20s: number[];
      d20: number;
      total: number;
      contra: number;
      res: ResRolagem;
    }
  | { k: "dano"; alvo: number; de: number; valor: number; tipo: TipoDano; pvAntes: number; pvDepois: number; critico: boolean; salvou: boolean }
  | { k: "cura"; alvo: number; valor: number; pvAntes: number; pvDepois: number }
  | { k: "cond"; alvo: number; cond: Cond; on: boolean }
  | { k: "cai"; alvo: number; por: number }
  | { k: "aviso"; alvo: number; texto: string; cor: string }
  | { k: "empurrar"; alvo: number; de: P; para: P };

export type Motivo = "critico" | "abate" | "recurso" | "area";

export type Acao = {
  ator: number;
  passos: Passo[];
  /** participantes (para animar em paralelo sem conflito) */
  envolvidos: number[];
  /** candidato a cut-in */
  cutin: Motivo | null;
  golpe: GolpeId | null;
  rolagemDestaque: string; // ex.: "1d10 = 10"
};

export type Turno = { rodada: number; ator: number; acoes: Acao[] };

export type Resultado = {
  iniciativa: { id: number; d20: number; mod: number; total: number }[];
  turnos: Turno[];
  log: string[];
  vencedor: number;
  rodadas: number;
  abates: Record<number, number[]>;
  golpeFinal: { ator: number; golpe: GolpeId; alvo: number } | null;
  criticos: Record<number, number>;
  pvFinal: Record<number, number>;
  maiorDano: Record<number, { valor: number; golpe: GolpeId; alvo: number }>;
  menorPV: Record<number, number>;
  posInicial: P[];
};

// ─────────────────────────── estado de combate ───────────────────────────
type Estado = {
  l: Lutador;
  pv: number;
  temp: number;
  pos: P;
  vivo: boolean;
  reacao: boolean;
  furia: boolean;
  conc: { golpe: GolpeId; alvo: number } | null;
  marcadoPor: number[]; // quem marcou (marca do caçador / bruxaria)
  lento: boolean;
  desvantagemProx: boolean; // zombaria viciosa
  vantagemContra: boolean; // raio guia
  inataAtiva: number; // rodadas restantes
  escudoAte: number; // escudo ativo até o turno deste lutador
  descuidado: boolean;
  furtivoUsado: boolean;
};

const PROF_SALVA: Record<ClasseId, Atributo[]> = {
  guerreiro: ["FOR", "CON"],
  barbaro: ["FOR", "CON"],
  paladino: ["SAB", "CAR"],
  patrulheiro: ["FOR", "DES"],
  ladino: ["DES", "INT"],
  monge: ["FOR", "DES"],
  mago: ["INT", "SAB"],
  feiticeiro: ["CON", "CAR"],
  bruxo: ["SAB", "CAR"],
  clerigo: ["SAB", "CAR"],
  druida: ["INT", "SAB"],
  bardo: ["DES", "CAR"],
};

const NOME_DANO: Record<TipoDano, string> = {
  fogo: "fogo",
  frio: "frio",
  eletrico: "elétrico",
  trovejante: "trovejante",
  radiante: "radiante",
  necrotico: "necrótico",
  energia: "energia",
  psiquico: "psíquico",
  veneno: "veneno",
  acido: "ácido",
  cortante: "cortante",
  perfurante: "perfurante",
  concussao: "concussão",
  cura: "cura",
};

const ehDistancia = (l: Lutador) =>
  l.arma.distancia ||
  l.classe === "mago" ||
  l.classe === "feiticeiro" ||
  l.classe === "bruxo" ||
  l.classe === "clerigo" ||
  l.classe === "druida" ||
  l.classe === "bardo";

const fisico = (t: TipoDano) => t === "cortante" || t === "perfurante" || t === "concussao";

export const simular = (lutadores: Lutador[], r: Dados, maxRodadas = 400): Resultado => {
  const log: string[] = [];
  const N = lutadores.length;
  const es: Estado[] = lutadores.map((l) => ({
    l,
    pv: l.pvMax,
    temp: 0,
    pos: { x: 0, y: 0 },
    vivo: true,
    reacao: true,
    furia: false,
    conc: null,
    marcadoPor: [],
    lento: false,
    desvantagemProx: false,
    vantagemContra: false,
    inataAtiva: 0,
    escudoAte: -1,
    descuidado: false,
    furtivoUsado: false,
  }));

  // posições iniciais: círculo em volta do altar, ordem embaralhada
  const ordemCirculo = r.embaralhar(lutadores.map((l) => l.id));
  ordemCirculo.forEach((id, i) => {
    const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
    es[id].pos = { x: Math.round(ARENA.cx + Math.cos(ang) * 112), y: Math.round(ARENA.cy + Math.sin(ang) * 112) };
  });
  const posInicial = es.map((e) => ({ ...e.pos }));

  const abates: Record<number, number[]> = {};
  const criticos: Record<number, number> = {};
  const maiorDano: Resultado["maiorDano"] = {};
  const menorPV: Record<number, number> = {};
  lutadores.forEach((l) => {
    abates[l.id] = [];
    criticos[l.id] = 0;
    menorPV[l.id] = l.pvMax;
  });
  let golpeFinal: Resultado["golpeFinal"] = null;

  const nome = (id: number) => lutadores[id].nome;
  const vivos = () => es.filter((e) => e.vivo);

  // ── iniciativa ──
  log.push("## Iniciativa (d20 + DES)");
  const iniciativa = lutadores.map((l) => {
    const d20 = r.d(20);
    const m = modAtr(l, "DES");
    return { id: l.id, d20, mod: m, total: d20 + m };
  });
  iniciativa.sort((a, b) => b.total - a.total || b.mod - a.mod || a.id - b.id);
  iniciativa.forEach((i, k) =>
    log.push(`${k + 1}. ${nome(i.id)} — d20=${i.d20} ${sinal(i.mod)} = ${i.total}`),
  );

  const turnos: Turno[] = [];
  let acao: Acao;
  let turno: Turno;

  const novaAcao = (ator: number, golpe: GolpeId | null = null) => {
    acao = { ator, passos: [], envolvidos: [ator], cutin: null, golpe, rolagemDestaque: "" };
    turno.acoes.push(acao);
    return acao;
  };
  const envolver = (id: number) => {
    if (acao.envolvidos.indexOf(id) < 0) acao.envolvidos.push(id);
  };
  const marcarCutin = (m: Motivo) => {
    const prio: Record<Motivo, number> = { critico: 4, abate: 3, recurso: 2, area: 1 };
    if (!acao.cutin || prio[m] > prio[acao.cutin]) acao.cutin = m;
  };

  // ── rolagem de d20 com vantagem/desvantagem, Sortudo (halfling) ──
  const d20 = (e: Estado, vant: number) => {
    const rolar = () => {
      let v = r.d(20);
      if (e.l.especie === "halfling" && v === 1) {
        const n = r.d(20);
        log.push(`   Sortudo: ${nome(e.l.id)} rerrola o 1 → ${n}`);
        v = n;
      }
      return v;
    };
    const a = rolar();
    if (vant === 0) return { d20s: [a], d20: a };
    const b = rolar();
    return { d20s: [a, b], d20: vant > 0 ? Math.max(a, b) : Math.min(a, b) };
  };

  const condicao = (alvo: number, cond: Cond, on: boolean) => acao.passos.push({ k: "cond", alvo, cond, on });

  // ── concentração ──
  const encerrarConc = (e: Estado, motivo: string) => {
    if (!e.conc) return;
    const alvo = es[e.conc.alvo];
    alvo.marcadoPor = alvo.marcadoPor.filter((m) => m !== e.l.id);
    if (alvo.marcadoPor.length === 0 && alvo.vivo) condicao(alvo.l.id, "MRC", false);
    condicao(e.l.id, "CNC", false);
    if (motivo) log.push(`   ${nome(e.l.id)} ${motivo}`);
    e.conc = null;
  };

  // ── dano ──
  const causarDano = (
    deId: number,
    alvoId: number,
    valorBruto: number,
    tipo: TipoDano,
    critico: boolean,
    salvou: boolean,
    golpe: GolpeId,
    rolagemTexto: string,
  ) => {
    const alvo = es[alvoId];
    if (!alvo.vivo) return;
    envolver(alvoId);
    let valor = valorBruto;
    const notas: string[] = [];
    const resiste =
      (alvo.furia && fisico(tipo)) ||
      (alvo.l.especie === "tiefling" && tipo === "fogo") ||
      (alvo.l.especie === "draconato" && alvo.l.sopro === tipo) ||
      (alvo.l.especie === "anao" && tipo === "veneno");
    if (resiste) {
      valor = Math.floor(valor / 2);
      notas.push("resistência: metade");
    }
    // Resistência da Pedra (golias): reação, reduz 1d12 + CON
    if (alvo.l.especie === "golias" && alvo.reacao && alvo.l.recursos.pedra > 0 && valor >= 6) {
      alvo.reacao = false;
      alvo.l.recursos.pedra--;
      const rr = r.rolar(1, 12, modAtr(alvo.l, "CON"));
      const reduz = Math.max(0, rr.total);
      valor = Math.max(0, valor - reduz);
      notas.push(`Resistência da Pedra ${rr.expr}=${rr.total}`);
      acao.passos.push({ k: "aviso", alvo: alvoId, texto: "PEDRA!", cor: "#a8aab0" });
    }
    let restante = valor;
    if (alvo.temp > 0) {
      const usa = Math.min(alvo.temp, restante);
      alvo.temp -= usa;
      restante -= usa;
      if (usa) notas.push(`${usa} PV temporários`);
    }
    const antes = alvo.pv;
    alvo.pv = Math.max(0, alvo.pv - restante);
    // Resistência Implacável (orc)
    let implacavel = false;
    if (alvo.pv === 0 && alvo.l.recursos.implacavel > 0) {
      alvo.l.recursos.implacavel--;
      alvo.pv = 1;
      implacavel = true;
    }
    acao.passos.push({
      k: "dano",
      alvo: alvoId,
      de: deId,
      valor,
      tipo,
      pvAntes: antes,
      pvDepois: alvo.pv,
      critico,
      salvou,
    });
    log.push(
      `   ${rolagemTexto} → ${valor} de ${NOME_DANO[tipo]}${notas.length ? ` (${notas.join(", ")})` : ""} · ${nome(alvoId)} ${antes}→${alvo.pv} PV`,
    );
    const atk = maiorDano[deId];
    if (!atk || valor > atk.valor) maiorDano[deId] = { valor, golpe, alvo: alvoId };
    menorPV[alvoId] = Math.min(menorPV[alvoId], alvo.pv);
    if (implacavel) {
      acao.passos.push({ k: "aviso", alvo: alvoId, texto: "IMPLACÁVEL!", cor: "#c0602a" });
      log.push(`   Resistência Implacável: ${nome(alvoId)} fica com 1 PV`);
    }
    if (alvo.pv === 0) {
      alvo.vivo = false;
      acao.passos.push({ k: "cai", alvo: alvoId, por: deId });
      abates[deId].push(alvoId);
      golpeFinal = { ator: deId, golpe, alvo: alvoId };
      marcarCutin("abate");
      log.push(`   ☠ ${nome(alvoId)} CAIU! (por ${nome(deId)}) · restam ${vivos().length}`);
      // quem estava concentrado nele perde o alvo
      for (const o of es) if (o.conc && o.conc.alvo === alvoId) encerrarConc(o, "");
      if (alvo.conc) encerrarConc(alvo, "");
      return;
    }
    // concentração
    if (alvo.conc && valor > 0) {
      const cd = Math.max(10, Math.floor(valor / 2));
      const pb = PROF_SALVA[alvo.l.classe].indexOf("CON") >= 0 ? prof(alvo.l) : 0;
      const m = modAtr(alvo.l, "CON") + pb;
      const rr = d20(alvo, 0);
      const total = rr.d20 + m;
      const passou = rr.d20 !== 1 && total >= cd;
      acao.passos.push({
        k: "rolagem",
        ator: alvoId,
        alvo: alvoId,
        tipo: "conc",
        d20s: rr.d20s,
        d20: rr.d20,
        total,
        contra: cd,
        res: passou ? "salvou" : "falhou",
      });
      log.push(`   Concentração de ${nome(alvoId)}: d20=${rr.d20} ${sinal(m)} = ${total} vs CD ${cd} → ${passou ? "mantém" : "PERDEU CONCENTRAÇÃO"}`);
      if (!passou) {
        acao.passos.push({ k: "aviso", alvo: alvoId, texto: "PERDEU CONCENTRAÇÃO", cor: "#8fd6f4" });
        encerrarConc(alvo, "");
      }
    }
  };

  const curar = (deId: number, alvoId: number, rr: { expr: string; total: number }, golpe: GolpeId) => {
    const alvo = es[alvoId];
    const antes = alvo.pv;
    alvo.pv = Math.min(alvo.l.pvMax, alvo.pv + Math.max(0, rr.total));
    acao.passos.push({ k: "cura", alvo: alvoId, valor: alvo.pv - antes, pvAntes: antes, pvDepois: alvo.pv });
    log.push(`   ${GOLPE[golpe].nome}: ${rr.expr} = ${rr.total} → ${nome(alvoId)} ${antes}→${alvo.pv} PV`);
    acao.rolagemDestaque = `${rr.expr} = ${rr.total}`;
    void deId;
  };

  // ── teste de ataque ──
  const testeAtaque = (
    a: Estado,
    alvo: Estado,
    bonus: number,
    distancia: boolean,
    vantExtra = 0,
  ): { acerto: boolean; critico: boolean; texto: string; d20: number } => {
    let vant = vantExtra;
    if (distancia && inimigosAdj(a).length > 0) vant--;
    if (a.desvantagemProx) {
      vant--;
      a.desvantagemProx = false;
    }
    if (alvo.vantagemContra) {
      vant++;
      alvo.vantagemContra = false;
    }
    if (alvo.descuidado) vant++;
    const v = Math.sign(vant);
    let rr = d20(a, v);
    let total = rr.d20 + bonus;
    let ca = alvo.l.ca + (alvo.escudoAte >= 0 ? 5 : 0);
    let critico = rr.d20 === 20 || (rr.d20 === 19 && a.l.classe === "guerreiro" && a.l.nivel >= 3);
    let falha = rr.d20 === 1;
    let acerto = critico || (!falha && total >= ca);
    // Inspiração Heroica (humano): rerrola um ataque que errou
    if (!acerto && a.l.recursos.heroica > 0 && rr.d20 < 12) {
      a.l.recursos.heroica--;
      log.push(`   Inspiração Heroica: ${nome(a.l.id)} rerrola (${rr.d20})`);
      rr = d20(a, v);
      total = rr.d20 + bonus;
      critico = rr.d20 === 20;
      falha = rr.d20 === 1;
      acerto = critico || (!falha && total >= ca);
    }
    // Escudo (mago): reação +5 se transformar o acerto em erro
    if (
      acerto &&
      !critico &&
      alvo.l.classe === "mago" &&
      alvo.reacao &&
      alvo.l.recursos.espacos[0] > 0 &&
      total < ca + 5 &&
      alvo.escudoAte < 0
    ) {
      alvo.reacao = false;
      alvo.l.recursos.espacos[0]--;
      alvo.escudoAte = 1;
      ca += 5;
      acerto = false;
      acao.passos.push({ k: "golpe", ator: alvo.l.id, golpe: "escudo", alvos: [alvo.l.id], alvo: alvo.pos, cor: GOLPE.escudo.cor });
      condicao(alvo.l.id, "ESC", true);
      envolver(alvo.l.id);
      log.push(`   ${nome(alvo.l.id)} conjura ESCUDO (reação): CA ${ca}`);
    }
    const res: ResRolagem = critico ? "critico" : falha ? "falha" : acerto ? "acerto" : "erro";
    acao.passos.push({
      k: "rolagem",
      ator: a.l.id,
      alvo: alvo.l.id,
      tipo: "ataque",
      d20s: rr.d20s,
      d20: rr.d20,
      total,
      contra: ca,
      res,
    });
    if (critico) {
      criticos[a.l.id]++;
      marcarCutin("critico");
    }
    const vtxt = rr.d20s.length > 1 ? ` (${v > 0 ? "vantagem" : "desvantagem"}: ${rr.d20s.join(" e ")})` : "";
    const texto = `d20=${rr.d20}${vtxt} ${sinal(bonus)} = ${total} vs CA ${ca} → ${critico ? "CRÍTICO!" : falha ? "FALHA (1 natural)" : acerto ? "acerto" : "erro"}`;
    log.push(`   ${texto}`);
    envolver(alvo.l.id);
    return { acerto, critico, texto, d20: rr.d20 };
  };

  const salvaguarda = (alvo: Estado, atr: Atributo, cd: number, de: number) => {
    const pb = PROF_SALVA[alvo.l.classe].indexOf(atr) >= 0 ? prof(alvo.l) : 0;
    const m = modAtr(alvo.l, atr) + pb;
    const vant = alvo.l.especie === "gnomo" && (atr === "INT" || atr === "SAB" || atr === "CAR") ? 1 : 0;
    const rr = d20(alvo, vant);
    const total = rr.d20 + m;
    const passou = total >= cd;
    acao.passos.push({
      k: "rolagem",
      ator: de,
      alvo: alvo.l.id,
      tipo: "salva",
      d20s: rr.d20s,
      d20: rr.d20,
      total,
      contra: cd,
      res: passou ? "salvou" : "falhou",
    });
    envolver(alvo.l.id);
    log.push(`   Salvaguarda de ${atr} de ${nome(alvo.l.id)}: d20=${rr.d20} ${sinal(m)} = ${total} vs CD ${cd} → ${passou ? "SALVOU" : "falhou"}`);
    return passou;
  };

  // dobra os dados no crítico
  const rolarDano = (n: number, d: number, m: number, critico: boolean) => r.rolar(critico ? n * 2 : n, d, m);

  // ── vizinhança ──
  const inimigosAdj = (e: Estado) => es.filter((o) => o !== e && o.vivo && dist(o.pos, e.pos) <= CORPO + 1);
  const outrosPerto = (alvo: Estado, a: Estado) =>
    es.some((o) => o !== alvo && o !== a && o.vivo && dist(o.pos, alvo.pos) <= CORPO + 1);

  const livre = (p: P, ignora: Estado[]) =>
    dist(p, ALTAR) >= ALTAR.r + 6 && es.every((o) => !o.vivo || ignora.indexOf(o) >= 0 || dist(o.pos, p) >= SEPARACAO);

  const limitar = (p: P): P => ({
    x: Math.round(Math.min(ARENA.x1, Math.max(ARENA.x0, p.x))),
    y: Math.round(Math.min(ARENA.y1, Math.max(ARENA.y0, p.y))),
  });

  /** anda de `a` em direção a `destino` no máximo `max` px; desvia do altar e dos outros */
  const caminhar = (e: Estado, destino: P, max: number): P => {
    const de = e.pos;
    const d = dist(de, destino);
    let alvo = d <= max ? destino : { x: de.x + ((destino.x - de.x) / d) * max, y: de.y + ((destino.y - de.y) / d) * max };
    alvo = limitar(alvo);
    // tenta pequenas variações até achar lugar livre
    for (let k = 0; k < 12 && !livre(alvo, [e]); k++) {
      const ang = (k / 12) * Math.PI * 2;
      alvo = limitar({ x: alvo.x + Math.cos(ang) * 8, y: alvo.y + Math.sin(ang) * 6 });
    }
    if (dist(de, alvo) > max + 10) return de;
    return alvo;
  };

  const mover = (e: Estado, para: P, desengajar = false) => {
    if (dist(e.pos, para) < 2) return;
    const de = { ...e.pos };
    const adjAntes = inimigosAdj(e);
    novaAcao(e.l.id);
    acao.passos.push({ k: "mover", ator: e.l.id, de, para });
    e.pos = para;
    log.push(`   ${nome(e.l.id)} anda ${Math.round(pes(dist(de, para)))} pés${desengajar ? " (Desengajar)" : ""}`);
    // ataques de oportunidade de quem ficou para trás
    if (!desengajar) {
      for (const o of adjAntes) {
        if (!o.vivo || !e.vivo || !o.reacao || dist(o.pos, para) <= CORPO + 1) continue;
        if (o.l.arma.distancia || ehDistancia(o.l)) continue;
        o.reacao = false;
        novaAcao(o.l.id, "oportunidade");
        acao.passos.push({ k: "golpe", ator: o.l.id, golpe: "oportunidade", alvos: [e.l.id], alvo: de, cor: GOLPE.oportunidade.cor });
        log.push(` ${nome(o.l.id)} faz ATAQUE DE OPORTUNIDADE em ${nome(e.l.id)}`);
        golpeArma(o, e, "oportunidade");
      }
    }
  };

  // ── ataque com arma ──
  const golpeArma = (a: Estado, alvo: Estado, golpe: GolpeId, opts: { semMod?: boolean; vant?: number } = {}) => {
    const l = a.l;
    const arma = l.arma;
    const m = modArma(l, arma);
    const bonus = atqArma(l);
    const t = testeAtaque(a, alvo, bonus, arma.distancia, opts.vant ?? 0);
    if (!t.acerto) return false;
    const dadoN = arma.n;
    let dadoD = arma.d;
    if (l.classe === "monge" && arma.id === "punhos") dadoD = l.nivel >= 5 ? 8 : 6;
    let modDano = opts.semMod ? Math.min(0, m) : m;
    if (a.furia && arma.atr !== "DES") modDano += 2;
    if (l.estilo === "Duelo" && !arma.duasMaos && !arma.distancia) modDano += 2;
    const rr = rolarDano(dadoN, dadoD, modDano, t.critico);
    // Armas Grandes: 1 e 2 contam como 3
    if (l.estilo === "Armas Grandes") {
      let soma = modDano;
      rr.dados = rr.dados.map((v) => (v < 3 ? 3 : v));
      for (const v of rr.dados) soma += v;
      rr.total = soma;
    }
    let total = rr.total;
    let texto = `${rr.expr} [${rr.dados.join(",")}]`;
    // ataque furtivo
    if (
      l.classe === "ladino" &&
      !a.furtivoUsado &&
      (arma.atr === "fin" || arma.distancia) &&
      outrosPerto(alvo, a)
    ) {
      a.furtivoUsado = true;
      const nd = Math.ceil(l.nivel / 2);
      const f = rolarDano(nd, 6, 0, t.critico);
      total += f.total;
      texto += ` + furtivo ${f.expr} [${f.dados.join(",")}]`;
      acao.golpe = "furtivo";
      for (const p of acao.passos) if (p.k === "golpe" && p.ator === a.l.id) {
        p.golpe = "furtivo";
        p.cor = GOLPE.furtivo.cor;
      }
    }
    // marca do caçador / bruxaria
    let extraTipo: TipoDano | null = null;
    let extra = 0;
    if (alvo.marcadoPor.indexOf(l.id) >= 0 && a.conc) {
      const f = rolarDano(1, 6, 0, t.critico);
      extra = f.total;
      extraTipo = a.conc.golpe === "bruxaria" ? "necrotico" : "energia";
      texto += ` + ${a.conc.golpe === "bruxaria" ? "bruxaria" : "marca"} ${f.expr} [${f.dados.join(",")}]`;
    }
    // destruição divina (paladino nível 2+): gasta espaço no acerto
    if (l.classe === "paladino" && l.nivel >= 2 && l.recursos.espacos[0] > 0 && (t.critico || alvo.pv > 6)) {
      l.recursos.espacos[0]--;
      const f = rolarDano(2, 8, 0, t.critico);
      extra += f.total;
      extraTipo = "radiante";
      texto += ` + DESTRUIÇÃO DIVINA ${f.expr} [${f.dados.join(",")}]`;
      acao.passos.push({ k: "aviso", alvo: alvo.l.id, texto: "DESTRUIÇÃO DIVINA!", cor: "#f2c43a" });
      marcarCutin("recurso");
    }
    acao.rolagemDestaque = `${rr.expr} = ${total + extra}`;
    causarDano(l.id, alvo.l.id, total, arma.tipo, t.critico, false, golpe, texto);
    if (extra && alvo.vivo && extraTipo) causarDano(l.id, alvo.l.id, extra, extraTipo, t.critico, false, golpe, "extra");
    return true;
  };

  // ── magia de ataque ──
  const magiaAtaque = (a: Estado, alvo: Estado, golpe: GolpeId, n: number, d: number, m: number, tipo: TipoDano, corpo = false) => {
    const vant = a.inataAtiva > 0 ? 1 : 0;
    const t = testeAtaque(a, alvo, atqMagia(a.l), !corpo, vant);
    if (!t.acerto) return false;
    const rr = rolarDano(n, d, m, t.critico);
    let texto = `${rr.expr} [${rr.dados.join(",")}]`;
    acao.rolagemDestaque = `${rr.expr} = ${rr.total}`;
    let extra = 0;
    if (alvo.marcadoPor.indexOf(a.l.id) >= 0 && a.conc) {
      const f = rolarDano(1, 6, 0, t.critico);
      extra = f.total;
      texto += ` + ${a.conc.golpe === "bruxaria" ? "bruxaria" : "marca"} ${f.expr}`;
    }
    causarDano(a.l.id, alvo.l.id, rr.total, tipo, t.critico, false, golpe, texto);
    if (extra && alvo.vivo) causarDano(a.l.id, alvo.l.id, extra, a.conc && a.conc.golpe === "bruxaria" ? "necrotico" : "energia", t.critico, false, golpe, "extra");
    return true;
  };

  // ── magia de salvaguarda ──
  const magiaSalva = (
    a: Estado,
    alvos: Estado[],
    golpe: GolpeId,
    atr: Atributo,
    n: number,
    d: number,
    tipo: TipoDano,
    metade: boolean,
    cd = cdMagia(a.l),
  ) => {
    const rr = r.rolar(n, d);
    acao.rolagemDestaque = `${rr.expr} = ${rr.total}`;
    log.push(`   dano rolado uma vez: ${rr.expr} [${rr.dados.join(",")}] = ${rr.total} · CD ${cd}`);
    const falharam: Estado[] = [];
    for (const alvo of alvos) {
      if (!alvo.vivo) continue;
      const passou = salvaguarda(alvo, atr, cd, a.l.id);
      if (passou && !metade) {
        acao.passos.push({ k: "aviso", alvo: alvo.l.id, texto: "SALVOU", cor: "#e8e8ec" });
        continue;
      }
      if (!passou) falharam.push(alvo);
      const v = passou ? Math.floor(rr.total / 2) : rr.total;
      causarDano(a.l.id, alvo.l.id, v, tipo, false, passou, golpe, passou ? "metade" : "dano cheio");
    }
    return falharam;
  };

  // ── escolha de alvo ──
  const escolherAlvo = (a: Estado, distancia: boolean): Estado | null => {
    const vs = es.filter((o) => o !== a && o.vivo);
    if (!vs.length) return null;
    let melhor: Estado | null = null;
    let nota = Infinity;
    for (const o of vs) {
      const d = pes(dist(a.pos, o.pos));
      const ferido = o.pv / o.l.pvMax;
      let s = distancia ? d * 0.35 + ferido * 25 + o.l.ca * 0.8 : d + ferido * 22;
      if (o.marcadoPor.indexOf(a.l.id) >= 0) s -= 18;
      if (o.pv <= 4) s -= 10;
      s += r.float() * 6; // um pouco de imprevisto
      if (s < nota) {
        nota = s;
        melhor = o;
      }
    }
    return melhor;
  };

  /** posição ao lado do alvo para atacar corpo a corpo */
  const posCorpo = (a: Estado, alvo: Estado): P => {
    const lado = a.pos.x <= alvo.pos.x ? -1 : 1;
    const opcoes = [
      { x: alvo.pos.x + lado * 20, y: alvo.pos.y },
      { x: alvo.pos.x - lado * 20, y: alvo.pos.y },
      { x: alvo.pos.x + lado * 16, y: alvo.pos.y + 12 },
      { x: alvo.pos.x + lado * 16, y: alvo.pos.y - 12 },
      { x: alvo.pos.x - lado * 16, y: alvo.pos.y + 12 },
      { x: alvo.pos.x - lado * 16, y: alvo.pos.y - 12 },
    ].map(limitar);
    opcoes.sort((p, q) => dist(a.pos, p) - dist(a.pos, q));
    for (const p of opcoes) if (livre(p, [a]) || dist(p, a.pos) < 2) return p;
    return opcoes[0];
  };

  /** atirador: fica a ~35–50 pés do alvo, longe dos outros */
  const posDistancia = (a: Estado, alvo: Estado, max: number): P => {
    let melhor = a.pos;
    let nota = Infinity;
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const raio = 40 * PX_POR_PE;
      const p = limitar({ x: alvo.pos.x + Math.cos(ang) * raio, y: alvo.pos.y + Math.sin(ang) * raio * 0.8 });
      const ate = dist(a.pos, p);
      if (ate > max) continue;
      let s = ate * 0.2;
      for (const o of es) if (o.vivo && o !== a) s += Math.max(0, 70 - dist(o.pos, p)) * 0.6;
      if (!livre(p, [a])) s += 100;
      if (s < nota) {
        nota = s;
        melhor = p;
      }
    }
    return melhor;
  };

  const anuncia = (a: Estado, golpe: GolpeId, alvos: Estado[], alvoPos?: P) => {
    const g = GOLPE[golpe];
    let cor = g.cor;
    if (golpe === "sopro" && a.l.sopro) cor = COR_DANO[a.l.sopro];
    novaAcao(a.l.id, golpe);
    acao.passos.push({
      k: "golpe",
      ator: a.l.id,
      golpe,
      alvos: alvos.map((x) => x.l.id),
      alvo: alvoPos ?? (alvos[0] ? alvos[0].pos : a.pos),
      cor,
    });
    for (const x of alvos) envolver(x.l.id);
    log.push(` ${nome(a.l.id)} usa ${g.nome}${alvos.length ? ` em ${alvos.map((x) => nome(x.l.id)).join(", ")}` : ""}`);
  };

  // ── turno de um lutador ──
  const agir = (a: Estado, rodada: number) => {
    const l = a.l;
    a.reacao = true;
    a.furtivoUsado = false;
    a.descuidado = false;
    if (a.escudoAte >= 0) {
      a.escudoAte = -1;
      novaAcao(l.id);
      condicao(l.id, "ESC", false);
    }
    if (a.inataAtiva > 0) a.inataAtiva--;
    const movimento = l.desloc * PX_POR_PE - (a.lento ? 10 * PX_POR_PE : 0);
    if (a.lento) {
      a.lento = false;
      novaAcao(l.id);
      condicao(l.id, "LNT", false);
    }
    let bonus = true;
    let acaoLivre = true;
    const pvPct = a.pv / l.pvMax;

    // 1) cura de emergência
    if (pvPct < 0.4) {
      if (l.classe === "guerreiro" && l.recursos.folego > 0) {
        l.recursos.folego--;
        anuncia(a, "folego", [a]);
        curar(l.id, l.id, r.rolar(1, 10, l.nivel), "folego");
        bonus = false;
      } else if (l.classe === "paladino" && l.recursos.curaMaos > 0) {
        const v = Math.min(l.recursos.curaMaos, l.pvMax - a.pv);
        l.recursos.curaMaos -= v;
        anuncia(a, "curaMaos", [a]);
        curar(l.id, l.id, { expr: `reserva ${v}`, total: v }, "curaMaos");
        bonus = false;
      } else if (
        (l.classe === "clerigo" || l.classe === "druida" || l.classe === "bardo") &&
        l.recursos.espacos[0] > 0
      ) {
        l.recursos.espacos[0]--;
        anuncia(a, "palavra", [a]);
        curar(l.id, l.id, r.rolar(2, 4, atqMagia(l) - prof(l)), "palavra");
        bonus = false;
      }
    }
    if (a.pv / l.pvMax < 0.25 && l.classe === "paladino" && l.recursos.espacos[0] > 0) {
      l.recursos.espacos[0]--;
      anuncia(a, "curarFerimentos", [a]);
      curar(l.id, l.id, r.rolar(2, 8, modAtr(l, "CAR")), "curarFerimentos");
      acaoLivre = false;
    }

    // 2) recursos de abertura (ação bônus)
    if (bonus && l.classe === "barbaro" && !a.furia && l.recursos.furia > 0) {
      l.recursos.furia--;
      a.furia = true;
      anuncia(a, "furia", [a]);
      condicao(l.id, "FÚR", true);
      marcarCutin("recurso");
      bonus = false;
    }
    if (bonus && l.classe === "feiticeiro" && a.inataAtiva === 0 && l.recursos.inata > 0 && rodada <= 3) {
      l.recursos.inata--;
      a.inataAtiva = 10;
      anuncia(a, "inata", [a]);
      bonus = false;
    }

    let alvo = escolherAlvo(a, ehDistancia(l));
    if (!alvo) return;

    if (bonus && !a.conc && (l.classe === "patrulheiro" || l.classe === "bruxo")) {
      const pode = l.classe === "patrulheiro" ? l.recursos.marcaGratis > 0 || l.recursos.espacos[0] > 0 : l.recursos.espacos[0] > 0;
      if (pode) {
        if (l.classe === "patrulheiro" && l.recursos.marcaGratis > 0) l.recursos.marcaGratis--;
        else l.recursos.espacos[0]--;
        const g: GolpeId = l.classe === "patrulheiro" ? "marca" : "bruxaria";
        anuncia(a, g, [alvo]);
        a.conc = { golpe: g, alvo: alvo.l.id };
        alvo.marcadoPor.push(l.id);
        condicao(alvo.l.id, "MRC", true);
        condicao(l.id, "CNC", true);
        bonus = false;
      }
    }

    // 3) fuga com PV baixo (atiradores e conjuradores sem cura)
    const adj = inimigosAdj(a);
    if (a.pv / l.pvMax < 0.3 && adj.length > 0 && ehDistancia(l) && acaoLivre) {
      novaAcao(l.id, "desengajar");
      acao.passos.push({ k: "golpe", ator: l.id, golpe: "desengajar", alvos: [], alvo: a.pos, cor: GOLPE.desengajar.cor });
      log.push(` ${nome(l.id)} usa DESENGAJAR`);
      acaoLivre = false;
      const longe = posDistancia(a, adj[0], movimento);
      mover(a, caminhar(a, longe, movimento), true);
      return;
    }

    // 4) movimento + ação
    const usaDistancia = ehDistancia(l);
    if (!usaDistancia) {
      // corpo a corpo: vai até o alvo
      if (dist(a.pos, alvo.pos) > CORPO + 1) {
        let alcance = movimento;
        const destino = posCorpo(a, alvo);
        // surto de adrenalina (orc): disparada como ação bônus + PV temporários
        if (bonus && l.especie === "orc" && l.recursos.surto > 0 && dist(a.pos, destino) > movimento) {
          l.recursos.surto--;
          a.temp = prof(l);
          anuncia(a, "surtoAdrenalina", [a]);
          log.push(`   +${prof(l)} PV temporários e disparada`);
          alcance *= 2;
          bonus = false;
        }
        const para = caminhar(a, destino, alcance);
        mover(a, para);
        if (!a.vivo) return;
      }
      if (dist(a.pos, alvo.pos) > CORPO + 1) {
        // não alcançou: tiefling usa o truque; senão, se aproxima de outro
        const perto = inimigosAdj(a)[0];
        if (perto) alvo = perto;
        else if (l.especie === "tiefling" && acaoLivre) {
          anuncia(a, "raioFogo", [alvo]);
          magiaAtaque(a, alvo, "raioFogo", l.nivel >= 5 ? 2 : 1, 10, 0, "fogo");
          return;
        } else return;
      }
      if (!acaoLivre || !alvo.vivo) return;
      // sopro do draconato: quando pega 2+ ou de vez em quando
      if (l.especie === "draconato" && l.recursos.sopro > 0 && l.sopro) {
        const cone = es.filter((o) => o !== a && o.vivo && dist(o.pos, a.pos) <= 15 * PX_POR_PE + 2 && Math.sign(o.pos.x - a.pos.x) === Math.sign(alvo!.pos.x - a.pos.x || 1));
        if (cone.length >= 2 || r.float() < 0.35) {
          l.recursos.sopro--;
          anuncia(a, "sopro", cone.length ? cone : [alvo]);
          marcarCutin(cone.length >= 2 ? "area" : "recurso");
          magiaSalva(a, cone.length ? cone : [alvo], "sopro", "DES", l.nivel >= 5 ? 2 : 1, 10, l.sopro, true, 8 + modAtr(l, "CON") + prof(l));
          if (cone.length >= 2) marcarCutin("area");
          return;
        }
      }
      let g: GolpeId = l.classe === "monge" ? "artes" : "ataque";
      let vant = 0;
      if (l.classe === "barbaro" && l.nivel >= 2) {
        g = "descuidado";
        a.descuidado = true;
        vant = 1;
      }
      anuncia(a, g, [alvo]);
      golpeArma(a, alvo, g, { vant });
      // surto de ação (guerreiro nível 2+)
      if (l.classe === "guerreiro" && l.recursos.surtoAcao > 0 && alvo.vivo && alvo.pv <= 10) {
        l.recursos.surtoAcao--;
        anuncia(a, "surtoAcao", [alvo]);
        marcarCutin("recurso");
        golpeArma(a, alvo, "surtoAcao");
      }
      // ação bônus de arma leve / monge
      if (bonus && alvo.vivo && l.classe === "monge") {
        if (l.nivel >= 2 && l.recursos.foco > 0) {
          l.recursos.foco--;
          anuncia(a, "rajadaGolpes", [alvo]);
          golpeArma(a, alvo, "rajadaGolpes");
          if (alvo.vivo) golpeArma(a, alvo, "rajadaGolpes");
        } else {
          anuncia(a, "artes", [alvo]);
          golpeArma(a, alvo, "artes");
        }
      } else if (bonus && alvo.vivo && l.arma.id === "adagas") {
        anuncia(a, "ataque", [alvo]);
        golpeArma(a, alvo, "ataque", { semMod: true });
      }
      return;
    }

    // ── atiradores e conjuradores ──
    const adjAgora = inimigosAdj(a);
    const emArea = (centro: P, raioPes: number) =>
      es.filter((o) => o !== a && o.vivo && dist(o.pos, centro) <= raioPes * PX_POR_PE + 2);

    // onda trovejante quando há inimigos colados
    if (
      (l.classe === "mago" || l.classe === "druida" || l.classe === "bardo") &&
      l.recursos.espacos[0] > (l.classe === "mago" ? 0 : 1) &&
      adjAgora.length >= 1 &&
      emArea(a.pos, 15).length >= (l.classe === "mago" ? 1 : 2)
    ) {
      const alvos = emArea(a.pos, 15);
      l.recursos.espacos[0]--;
      anuncia(a, "onda", alvos, a.pos);
      if (alvos.length >= 2) marcarCutin("area");
      const falharam = magiaSalva(a, alvos, "onda", "CON", 2, 8, "trovejante", true);
      for (const f of falharam) {
        if (!f.vivo) continue;
        const dx = f.pos.x - a.pos.x;
        const dy = f.pos.y - a.pos.y;
        const dd = Math.hypot(dx, dy) || 1;
        const para = caminhar(f, { x: f.pos.x + (dx / dd) * 24, y: f.pos.y + (dy / dd) * 24 }, 24);
        acao.passos.push({ k: "empurrar", alvo: f.l.id, de: { ...f.pos }, para });
        f.pos = para;
      }
      if (movimento > 0 && a.vivo) {
        const t2 = escolherAlvo(a, true);
        if (t2) mover(a, caminhar(a, posDistancia(a, t2, movimento), movimento));
      }
      return;
    }

    // reposiciona mantendo distância (se não estiver colado com PV alto)
    if (adjAgora.length === 0 || a.pv / l.pvMax < 0.6) {
      const ideal = posDistancia(a, alvo, movimento);
      if (dist(ideal, a.pos) > 6) mover(a, caminhar(a, ideal, movimento), false);
      if (!a.vivo) return;
    }
    if (!acaoLivre || !alvo.vivo) return;
    const dPes = pes(dist(a.pos, alvo.pos));
    const cantrip = l.nivel >= 5 ? 2 : 1;

    switch (l.classe) {
      case "mago":
        if (l.recursos.espacos[0] > 0 && alvo.pv <= 9 && alvo.pv >= 4) {
          l.recursos.espacos[0]--;
          anuncia(a, "misseis", [alvo]);
          const rs = [r.rolar(1, 4, 1), r.rolar(1, 4, 1), r.rolar(1, 4, 1)];
          const tot = rs[0].total + rs[1].total + rs[2].total;
          acao.rolagemDestaque = `3×(1d4+1) = ${tot}`;
          causarDano(l.id, alvo.l.id, tot, "energia", false, false, "misseis", `3×(1d4+1) [${rs.map((x) => x.dados[0] + 1).join(",")}]`);
        } else {
          anuncia(a, "raioFogo", [alvo]);
          magiaAtaque(a, alvo, "raioFogo", cantrip, 10, 0, "fogo");
        }
        break;
      case "feiticeiro":
        if (l.recursos.espacos[0] > 0 && alvo.pv >= 8) {
          l.recursos.espacos[0]--;
          anuncia(a, "orbe", [alvo]);
          magiaAtaque(a, alvo, "orbe", 3, 8, 0, "acido");
        } else if (dPes < 30 && r.float() < 0.5) {
          anuncia(a, "raioGelo", [alvo]);
          if (magiaAtaque(a, alvo, "raioGelo", cantrip, 8, 0, "frio") && alvo.vivo) {
            alvo.lento = true;
            condicao(alvo.l.id, "LNT", true);
          }
        } else {
          anuncia(a, "raioFogo", [alvo]);
          magiaAtaque(a, alvo, "raioFogo", cantrip, 10, 0, "fogo");
        }
        break;
      case "bruxo":
        anuncia(a, "rajada", [alvo]);
        magiaAtaque(a, alvo, "rajada", cantrip, 10, modAtr(l, "CAR"), "energia");
        break;
      case "clerigo":
        if (l.nivel >= 2 && l.recursos.centelha > 0 && alvo.pv >= 6) {
          l.recursos.centelha--;
          anuncia(a, "centelha", [alvo]);
          marcarCutin("recurso");
          magiaSalva(a, [alvo], "centelha", "CON", 1, 8, "radiante", true);
        } else if (l.recursos.espacos[0] > 1 && alvo.pv >= 10) {
          l.recursos.espacos[0]--;
          anuncia(a, "raioGuia", [alvo]);
          if (magiaAtaque(a, alvo, "raioGuia", 4, 6, 0, "radiante") && alvo.vivo) alvo.vantagemContra = true;
        } else {
          anuncia(a, "chama", [alvo]);
          magiaSalva(a, [alvo], "chama", "DES", cantrip, 8, "radiante", false);
        }
        break;
      case "druida":
        if (dPes <= 30) {
          anuncia(a, "chicote", [alvo]);
          if (magiaAtaque(a, alvo, "chicote", cantrip, 6, 0, "perfurante", true) && alvo.vivo) {
            const para = caminhar(alvo, { x: alvo.pos.x + (a.pos.x - alvo.pos.x) * 0.4, y: alvo.pos.y + (a.pos.y - alvo.pos.y) * 0.4 }, 24);
            acao.passos.push({ k: "empurrar", alvo: alvo.l.id, de: { ...alvo.pos }, para });
            alvo.pos = para;
          }
        } else {
          anuncia(a, "produzirChama", [alvo]);
          magiaAtaque(a, alvo, "produzirChama", cantrip, 8, 0, "fogo");
        }
        break;
      case "bardo":
        if (l.recursos.espacos[0] > 1 && alvo.pv >= 7) {
          l.recursos.espacos[0]--;
          anuncia(a, "sussurros", [alvo]);
          magiaSalva(a, [alvo], "sussurros", "SAB", 3, 6, "psiquico", true);
        } else {
          anuncia(a, "zombaria", [alvo]);
          const f = magiaSalva(a, [alvo], "zombaria", "SAB", cantrip, 6, "psiquico", false);
          if (f.length && alvo.vivo) alvo.desvantagemProx = true;
        }
        break;
      default: {
        // patrulheiro e ladino com arco
        const g: GolpeId = l.classe === "patrulheiro" ? "flecha" : "ataque";
        anuncia(a, g, [alvo]);
        golpeArma(a, alvo, g);
      }
    }
  };

  // ── rodadas ──
  let rodada = 0;
  while (vivos().length > 1 && rodada < maxRodadas) {
    rodada++;
    log.push(`\n## Rodada ${rodada} · vivos ${vivos().length}`);
    for (const ini of iniciativa) {
      const a = es[ini.id];
      if (!a.vivo) continue;
      if (vivos().length <= 1) break;
      turno = { rodada, ator: a.l.id, acoes: [] };
      turnos.push(turno);
      log.push(`- ${nome(a.l.id)} (${CLASSE[a.l.classe].nome}, ${a.pv}/${a.l.pvMax} PV)`);
      agir(a, rodada);
    }
  }

  const vencedor = vivos()[0] ?? es[0];
  const pvFinal: Record<number, number> = {};
  es.forEach((e) => (pvFinal[e.l.id] = e.pv));
  log.push(`\n## Vencedor: ${nome(vencedor.l.id)} com ${vencedor.pv}/${vencedor.l.pvMax} PV após ${rodada} rodadas`);

  return {
    iniciativa,
    turnos,
    log,
    vencedor: vencedor.l.id,
    rodadas: rodada,
    abates,
    golpeFinal,
    criticos,
    pvFinal,
    maiorDano,
    menorPV,
    posInicial,
  };
};

