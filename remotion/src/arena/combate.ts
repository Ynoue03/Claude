// Simulação da luta com as regras do SRD 5.2 (nível 1–5) + IA simples.
// Saída: lista de turnos, cada um com "batidas" (mover, golpe) que o roteiro transforma em quadros.
import { Rng } from "./rng.ts";
import { ARMAS, fmt, subirNivel } from "./personagem.ts";
import type { Arma, Lutador, SubidaNivel } from "./personagem.ts";
import { CLASSES, COR_DANO, espacos, mod, proficiencia } from "./regras.ts";
import type { Atributo, TipoDano } from "./regras.ts";

// ───────────── geometria da arena (pixels da resolução interna 360×640) ─────────────
export const PE = 4; // 1 pé = 4 px  →  5 pés = 20 px, 30 pés = 120 px
export const ALCANCE = 26; // corpo a corpo (5 pés + folga de sprite)
export const CONTATO = 22;
export const SEPARACAO = 18;
export const LIMITES = { x0: 46, x1: 314, y0: 200, y1: 520 };
export const ALTAR = { x: 180, y: 352, r: 24 };

export type P = { x: number; y: number };
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const clampP = (p: P): P => {
  const q = { x: Math.max(LIMITES.x0, Math.min(LIMITES.x1, p.x)), y: Math.max(LIMITES.y0, Math.min(LIMITES.y1, p.y)) };
  const d = dist(q, ALTAR);
  if (d < ALTAR.r + 8) {
    const a = Math.atan2(q.y - ALTAR.y, q.x - ALTAR.x || 0.01);
    q.x = ALTAR.x + Math.cos(a) * (ALTAR.r + 8);
    q.y = ALTAR.y + Math.sin(a) * (ALTAR.r + 8);
  }
  return q;
};
const compPath = (pts: P[]) => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);

// Caminho reto, desviando do altar central se precisar.
const caminho = (a: P, b: P): P[] => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((ALTAR.x - a.x) * dx + (ALTAR.y - a.y) * dy) / L2));
  const q = { x: a.x + dx * t, y: a.y + dy * t };
  const d = dist(q, ALTAR);
  if (d >= ALTAR.r + 6 || t <= 0.02 || t >= 0.98) return [a, b];
  let nx = q.x - ALTAR.x,
    ny = q.y - ALTAR.y;
  if (Math.hypot(nx, ny) < 0.5) {
    nx = -dy;
    ny = dx;
  }
  const n = Math.hypot(nx, ny);
  const w = { x: ALTAR.x + (nx / n) * (ALTAR.r + 14), y: ALTAR.y + (ny / n) * (ALTAR.r + 14) };
  return [a, w, b];
};
// Corta o caminho no comprimento máximo
const cortar = (pts: P[], max: number): P[] => {
  const out = [pts[0]];
  let resta = max;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (d <= resta) {
      out.push(pts[i]);
      resta -= d;
    } else {
      out.push(lerp(pts[i - 1], pts[i], resta / d));
      break;
    }
  }
  return out;
};

// ───────────── tipos de saída ─────────────
export type Efeito =
  | "corte"
  | "corteGrande"
  | "estocada"
  | "impacto"
  | "soco"
  | "flecha"
  | "raioFogo"
  | "misseis"
  | "onda"
  | "raioGelo"
  | "orbe"
  | "rajada"
  | "bruxaria"
  | "chamaSagrada"
  | "raioGuia"
  | "cura"
  | "chama"
  | "espinhos"
  | "zombaria"
  | "sussurros"
  | "sopro"
  | "furia"
  | "marca"
  | "escudo"
  | "brilho"
  | "fulgor";

export type Resultado = {
  alvo: number;
  r: "acerto" | "erro" | "critico" | "falha" | "salvou" | "falhou" | "cura" | "buff";
  dano: number;
  cura: number;
  textos: string[]; // ex.: "CRÍTICO!", "SALVOU", "PERDEU CONCENTRAÇÃO", "IMPLACÁVEL!"
  pvDepois: number;
  pvTempDepois: number;
  morreu: boolean;
  novaPos?: P;
};

export type Batida =
  | { k: "mover"; ator: number; pts: P[]; recua: boolean; corre: boolean }
  | {
      k: "golpe";
      ator: number;
      nome: string;
      cor: string;
      tipo: TipoDano;
      fx: Efeito;
      corpoACorpo: boolean;
      magia: boolean;
      d20?: { v: number; cor: "acerto" | "erro" | "critico" | "falha" };
      rolagem: string; // "1d10 = 10"
      resultados: Resultado[];
      especial: 0 | 1 | 2 | 3; // candidato a cut-in: 3 crítico, 2 abate, 1 recurso, 0 não
      reacao: boolean;
      cond: { id: number; add?: string; del?: string }[];
      // quem derrubou o campeão sobe de nível na hora
      subiu?: { id: number; de: number; para: number; ganho: number; pvDepois: number; pvMax: number; rolagem: string };
    }
  | { k: "estado"; cond: { id: number; add?: string; del?: string }[] };

export type Turno = { rodada: number; ator: number; batidas: Batida[]; log: string[] };

export type Estatistica = {
  abates: number;
  dano: number;
  criticos: number;
  menorPv: number;
  golpeFinal: string;
  derrubados: string[];
  derrubadoPor: string;
  primeiroCritico: string;
  curou: number;
};

export type Simulacao = {
  turnos: Turno[];
  iniciativa: { id: number; d20: number; total: number }[];
  posIniciais: P[];
  vencedor: number;
  ordemQueda: number[];
  stats: Estatistica[];
  rodadas: number;
  // nível, PV máximo e atributos de cada um no fim da luta (+ subidas de nível durante ela)
  evolucao: { nivel: number; pvMax: number; atributos: Record<Atributo, number>; pvRolagens: string[]; subidas: SubidaNivel[] }[];
};

// ───────────── estado de combate ─────────────
type Est = {
  l: Lutador;
  id: number;
  nivel: number; // pode subir no meio da luta (quem derruba o campeão)
  pvMax: number;
  at: Record<Atributo, number>;
  pvRolagens: string[];
  subidas: SubidaNivel[];
  pv: number;
  pvTemp: number;
  vivo: boolean;
  pos: P;
  reacao: boolean;
  slots: number[];
  prof: number;
  // recursos
  furia: number; // rodadas restantes (0 = sem fúria)
  furiaUsos: number;
  folego: number;
  surto: number;
  curaMaos: number;
  sopro: number;
  inspiracao: boolean;
  implacavel: boolean;
  pedra: number;
  adrenalina: number;
  inata: number;
  inataAtiva: boolean;
  foco: number;
  centelha: number;
  conc: null | { tipo: "MARCA" | "BRUXARIA"; alvo: number };
  // condições
  escudo: boolean;
  lento: boolean;
  desvantagem: boolean;
  vantagemContra: boolean;
  marcadoPor: Set<number>;
  amaldicoadoPor: Set<number>;
  stats: Estatistica;
};


export const simular = (lutadores: Lutador[], rng: Rng, opcoes: { versao?: number; focoCampeao?: number } = {}): Simulacao => {
  const versao = opcoes.versao ?? 1;
  // força da preferência por atacar o campeão: 1 = leve (padrão da versão 2); 0 = nenhuma
  const foco = opcoes.focoCampeao ?? (versao >= 2 ? 1 : 0);
  const E: Est[] = lutadores.map((l) => {
    const n = l.nivel;
    const prof = proficiencia(n);
    const slots = espacos(l.classe, n);
    const e: Est = {
      l,
      id: l.id,
      nivel: n,
      pvMax: l.pvMax,
      at: { ...l.atributos },
      pvRolagens: [...l.pvRolagens],
      subidas: [],
      pv: l.pvMax,
      pvTemp: 0,
      vivo: true,
      pos: { x: 0, y: 0 },
      reacao: true,
      slots,
      prof,
      furia: 0,
      furiaUsos: l.classe === "BARBARO" ? (n >= 3 ? 3 : 2) : 0,
      folego: l.classe === "GUERREIRO" ? 2 : 0,
      surto: l.classe === "GUERREIRO" && n >= 2 ? 1 : 0,
      curaMaos: l.classe === "PALADINO" ? 5 * n : 0,
      sopro: l.especie === "DRACONATO" ? prof : 0,
      inspiracao: l.especie === "HUMANO",
      implacavel: l.especie === "ORC",
      pedra: l.especie === "GOLIAS" ? prof : 0,
      adrenalina: l.especie === "ORC" ? prof : 0,
      inata: l.classe === "FEITICEIRO" ? 2 : 0,
      inataAtiva: false,
      foco: l.classe === "MONGE" && n >= 2 ? n : 0,
      centelha: l.classe === "CLERIGO" && n >= 2 ? 1 : 0,
      conc: null,
      escudo: false,
      lento: false,
      desvantagem: false,
      vantagemContra: false,
      marcadoPor: new Set(),
      amaldicoadoPor: new Set(),
      stats: { abates: 0, dano: 0, criticos: 0, menorPv: l.pvMax, golpeFinal: "", derrubados: [], derrubadoPor: "", primeiroCritico: "", curou: 0 },
    };
    // Mago lança Armadura Arcana antes da luta (gasta 1 espaço de 1º círculo).
    if (l.classe === "MAGO" && e.slots[0] > 0) e.slots[0]--;
    return e;
  });

  // posições iniciais: círculo em volta do tablado
  const N = E.length;
  const posIniciais: P[] = E.map((_, i) => {
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
    return clampP({ x: 180 + Math.cos(a) * 118, y: 360 + Math.sin(a) * 140 });
  });
  E.forEach((e, i) => (e.pos = { ...posIniciais[i] }));

  // iniciativa
  const iniciativa = E.map((e) => {
    const r = rng.roll(`${e.l.nome} · iniciativa`, 1, 20, mod(e.at.DES));
    return { id: e.id, d20: r.dados[0], total: r.total, des: e.at.DES, desempate: rng.next() };
  }).sort((a, b) => b.total - a.total || b.des - a.des || b.desempate - a.desempate);

  const turnos: Turno[] = [];
  const ordemQueda: number[] = [];
  const vivos = () => E.filter((e) => e.vivo);
  const inimigos = (e: Est) => E.filter((o) => o.vivo && o.id !== e.id);

  // ─── utilidades de regra ───
  const m = (e: Est, a: Atributo) => mod(e.at[a]);
  const conj = (e: Est) => (CLASSES[e.l.classe].conjuracao ? m(e, CLASSES[e.l.classe].conjuracao!) : Math.max(m(e, "INT"), m(e, "SAB"), m(e, "CAR")));
  const cd = (e: Est) => 8 + e.prof + conj(e) + (e.inataAtiva ? 1 : 0);
  const caAtual = (e: Est) => e.l.ca + (e.escudo ? 5 : 0);
  const armaCorpo = (e: Est): Arma => (e.l.arma.distancia ? { ...ARMAS.adaga, nome: e.l.classe === "PATRULHEIRO" ? "Espada Curta" : "Adaga", d: e.l.classe === "PATRULHEIRO" ? 6 : 4 } : e.l.arma);
  const modArma = (e: Est, a: Arma) => (a.atributo === "DES" ? Math.max(m(e, "DES"), m(e, "FOR")) : m(e, "FOR"));
  const podeCorpo = (e: Est) => e.vivo;
  const adjacente = (a: Est, b: Est) => dist(a.pos, b.pos) <= ALCANCE;
  const ameacas = (e: Est) => inimigos(e).filter((o) => adjacente(e, o));
  const nomeArma = (a: Arma) => a.nome.toUpperCase();
  const dadoMarcial = (e: Est) => (e.nivel >= 5 ? 8 : 6);
  const truque = (e: Est) => (e.nivel >= 5 ? 2 : 1);
  const ehDistancia = (e: Est) => CLASSES[e.l.classe].distancia || e.l.arma.distancia;

  let turnoAtual: Turno;
  const log = (s: string) => turnoAtual.log.push(s);

  const rolarD20 = (e: Est, rotulo: string, vant: number): { v: number; dados: number[] } => {
    const n = vant !== 0 ? 2 : 1;
    const r = rng.roll(`${e.l.nome} · ${rotulo}${vant > 0 ? " (vantagem)" : vant < 0 ? " (desvantagem)" : ""}`, n, 20);
    let dados = r.dados;
    // Sortudo (halfling): rerrola o 1 natural
    if (e.l.especie === "HALFLING" && dados.includes(1)) {
      dados = dados.map((d) => (d === 1 ? rng.roll(`${e.l.nome} · Sortudo (rerrola o 1)`, 1, 20).total : d));
      log(`  Sortudo: rerrolou o 1 → ${dados.join("/")}`);
    }
    const v = vant > 0 ? Math.max(...dados) : vant < 0 ? Math.min(...dados) : dados[0];
    return { v, dados };
  };

  const rolarDano = (e: Est, rotulo: string, n: number, d: number, critico: boolean, gwf = false): { total: number; txt: string; dados: number[] } => {
    const qtd = critico ? n * 2 : n;
    const r = rng.roll(`${e.l.nome} · dano ${rotulo}${critico ? " (crítico)" : ""}`, qtd, d);
    const dados = gwf ? r.dados.map((x) => Math.max(3, x)) : r.dados;
    const total = dados.reduce((s, x) => s + x, 0);
    return { total, txt: `${qtd}d${d}`, dados };
  };

  const resistente = (alvo: Est, tipo: TipoDano) => {
    if (tipo === "cura") return false;
    if (alvo.furia > 0 && (tipo === "cortante" || tipo === "perfurante" || tipo === "concussao")) return true;
    if (alvo.l.especie === "TIEFLING" && tipo === "fogo") return true;
    if (alvo.l.especie === "ANAO" && tipo === "veneno") return true;
    if (alvo.l.especie === "DRACONATO" && alvo.l.ancestralidade?.dano === tipo) return true;
    return false;
  };

  // Aplica dano: resistência, Resistência da Pedra, PV temporários, Implacável, concentração, morte.
  const aplicarDano = (fonte: Est, alvo: Est, bruto: number, tipo: TipoDano, nomeGolpe: string, res: Resultado, batida: Batida & { k: "golpe" }) => {
    let dano = bruto;
    if (resistente(alvo, tipo)) {
      dano = Math.floor(dano / 2);
      res.textos.push("RESISTE");
    }
    if (alvo.pedra > 0 && alvo.reacao && dano >= 7 && alvo.pv - dano <= alvo.pvMax * 0.5) {
      const r = rng.roll(`${alvo.l.nome} · Resistência da Pedra (1d12+CON)`, 1, 12, m(alvo, "CON"));
      const red = Math.max(0, r.total);
      alvo.pedra--;
      alvo.reacao = false;
      dano = Math.max(0, dano - red);
      res.textos.push(`PEDRA −${red}`);
      log(`  ${alvo.l.nome} usa Resistência da Pedra: −${red}`);
    }
    if (alvo.pvTemp > 0) {
      const abs = Math.min(alvo.pvTemp, dano);
      alvo.pvTemp -= abs;
      dano -= abs;
    }
    alvo.pv -= dano;
    res.dano += bruto;
    fonte.stats.dano += dano;
    if (alvo.pv <= 0 && alvo.implacavel) {
      alvo.implacavel = false;
      alvo.pv = 1;
      res.textos.push("IMPLACÁVEL!");
      log(`  ${alvo.l.nome}: Resistência Implacável, fica com 1 PV`);
    }
    if (alvo.pv <= 0) {
      alvo.pv = 0;
      alvo.vivo = false;
      res.morreu = true;
      ordemQueda.push(alvo.id);
      fonte.stats.abates++;
      fonte.stats.derrubados.push(alvo.l.nome);
      fonte.stats.golpeFinal = nomeGolpe;
      alvo.stats.derrubadoPor = fonte.l.nome;
      log(`  ✖ ${alvo.l.nome} CAIU (${nomeGolpe} de ${fonte.l.nome})`);
      // concentração de quem caiu acaba; marcas nele somem
      if (alvo.conc) alvo.conc = null;
      if (batida.especial < 2) batida.especial = 2;
      // derrubou o campeão: sobe um nível na hora
      if (versao >= 2 && alvo.l.campeao && fonte.id !== alvo.id && fonte.vivo) subirNaLuta(fonte, batida);
    } else {
      alvo.stats.menorPv = Math.min(alvo.stats.menorPv, alvo.pv);
      if (alvo.conc && dano > 0) {
        const cdC = Math.max(10, Math.floor(dano / 2));
        const profC = CLASSES[alvo.l.classe].salvaguardas.includes("CON") ? alvo.prof : 0;
        const s = rolarD20(alvo, `concentração (CD ${cdC})`, 0);
        const tot = s.v + m(alvo, "CON") + profC;
        if (tot < cdC) {
          res.textos.push("PERDEU CONCENTRAÇÃO");
          log(`  ${alvo.l.nome} perdeu a concentração (${tot} < ${cdC})`);
          const c = alvo.conc;
          alvo.conc = null;
          const tgt = E[c.alvo];
          if (c.tipo === "MARCA") {
            tgt.marcadoPor.delete(alvo.id);
            if (tgt.marcadoPor.size === 0) batida.cond.push({ id: tgt.id, del: "MRC" });
          } else {
            tgt.amaldicoadoPor.delete(alvo.id);
          }
          batida.cond.push({ id: alvo.id, del: "CNC" });
        }
      }
    }
    res.pvDepois = alvo.pv;
    res.pvTempDepois = alvo.pvTemp;
  };

  const subirNaLuta = (e: Est, batida: Batida & { k: "golpe" }) => {
    const base = { ...e.l, nivel: e.nivel, pvMax: e.pvMax, atributos: e.at, pvRolagens: e.pvRolagens };
    const sub = subirNivel(base, rng);
    const cl = e.l.classe;
    e.nivel = sub.para;
    e.pvMax = sub.pvDepois;
    e.pv = Math.min(e.pvMax, e.pv + sub.pvGanho);
    e.at = { ...sub.atributosDepois };
    e.pvRolagens = [...(sub.ficha.pvRolagens ?? [])];
    e.prof = proficiencia(e.nivel);
    const novos = espacos(cl, e.nivel),
      antigos = espacos(cl, sub.de);
    novos.forEach((n, i) => (e.slots[i] = (e.slots[i] ?? 0) + n - (antigos[i] ?? 0)));
    if (cl === "BARBARO" && e.nivel === 3) e.furiaUsos++;
    if (cl === "GUERREIRO" && e.nivel === 2) e.surto = 1;
    if (cl === "PALADINO") e.curaMaos += 5;
    if (cl === "MONGE" && e.nivel >= 2) e.foco += e.nivel === 2 ? 2 : 1;
    if (cl === "CLERIGO" && e.nivel === 2) e.centelha = 1;
    e.subidas.push(sub);
    const rol = `d${sub.dado} = ${sub.rolagem} ${fmt(sub.conMod)} CON`;
    batida.subiu = { id: e.id, de: sub.de, para: sub.para, ganho: sub.pvGanho, pvDepois: e.pv, pvMax: e.pvMax, rolagem: rol };
    batida.especial = 3;
    log(`  ★ ${e.l.nome} derrubou o campeão e SOBE DE NÍVEL na hora: NV ${sub.de} → ${sub.para}, ${rol} = +${sub.pvGanho} PV (${e.pv}/${e.pvMax})${sub.poderesNovos.length ? `, ganha ${sub.poderesNovos.map((x) => x.nome).join(", ")}` : ""}`);
  };

  const novoGolpe = (ator: Est, nome: string, tipo: TipoDano, fx: Efeito, corpo: boolean, magia: boolean, reacao = false): Batida & { k: "golpe" } => ({
    k: "golpe",
    ator: ator.id,
    nome,
    cor: COR_DANO[tipo],
    tipo,
    fx,
    corpoACorpo: corpo,
    magia,
    rolagem: "",
    resultados: [],
    especial: 0,
    reacao,
    cond: [],
  });
  const novoRes = (alvo: Est, r: Resultado["r"]): Resultado => ({ alvo: alvo.id, r, dano: 0, cura: 0, textos: [], pvDepois: alvo.pv, pvTempDepois: alvo.pvTemp, morreu: false });

  // Vantagem / desvantagem de um ataque
  const vantagem = (a: Est, alvo: Est, distancia: boolean, magia: boolean) => {
    let v = 0,
      d = 0;
    if (alvo.vantagemContra) v++;
    if (magia && a.inataAtiva) v++;
    if (a.desvantagem) d++;
    if (distancia && ameacas(a).length > 0) d++;
    if (a.l.classe === "BARBARO" && a.nivel >= 2 && !distancia) v++; // Ataque Descuidado
    if (alvo.l.classe === "BARBARO" && alvo.nivel >= 2) v++; // ...e quem ataca o bárbaro descuidado também tem vantagem
    return v > 0 && d > 0 ? 0 : v > 0 ? 1 : d > 0 ? -1 : 0;
  };

  // Ataque com rolagem (arma ou magia de ataque)
  type OpAtaque = {
    nome: string;
    n: number;
    d: number;
    bonusDano: number;
    tipo: TipoDano;
    fx: Efeito;
    distancia: boolean;
    magia: boolean;
    bonusAcerto: number;
    critMin?: number;
    gwf?: boolean;
    reacao?: boolean;
    furtivo?: boolean;
    especial?: 0 | 1 | 2 | 3;
    rotulo?: string; // nome para a ficha/história (ex.: a arma em vez de "ATAQUE")
    extra?: (alvo: Est, res: Resultado, b: Batida & { k: "golpe" }) => void;
  };
  const atacar = (a: Est, alvo: Est, op: OpAtaque, batidas: Batida[]): Batida & { k: "golpe" } => {
    const b = novoGolpe(a, op.nome, op.tipo, op.fx, !op.distancia, op.magia, !!op.reacao);
    b.especial = op.especial ?? 0;
    const vant = vantagem(a, alvo, op.distancia, op.magia);
    if (alvo.vantagemContra) {
      alvo.vantagemContra = false;
    }
    if (a.desvantagem && !op.reacao) {
      a.desvantagem = false;
      b.cond.push({ id: a.id, del: "ZMB" });
    }
    const bonus = op.bonusAcerto;
    let d = rolarD20(a, `ataque (${op.nome}) contra ${alvo.l.nome}`, vant);
    let total = d.v + bonus;
    const critMin = op.critMin ?? 20;
    let critico = d.v >= critMin;
    let falha = d.v === 1;
    // Escudo (mago): reação que transforma acerto em erro
    if (!critico && !falha && total >= caAtual(alvo) && total < caAtual(alvo) + 5 && alvo.l.classe === "MAGO" && alvo.reacao && alvo.slots[0] > 0 && alvo.pv <= alvo.pvMax) {
      alvo.slots[0]--;
      alvo.reacao = false;
      alvo.escudo = true;
      b.cond.push({ id: alvo.id, add: "ESC" });
      log(`  ${alvo.l.nome} lança ESCUDO (+5 CA) como reação`);
    }
    let acertou = !falha && (critico || total >= caAtual(alvo));
    // Inspiração Heroica (humano): rerrola um ataque que errou
    let insp = false;
    if (!acertou && a.inspiracao) {
      a.inspiracao = false;
      insp = true;
      const d2 = rolarD20(a, `Inspiração Heroica (rerrola o ataque)`, vant);
      d = d2;
      total = d.v + bonus;
      critico = d.v >= critMin;
      falha = d.v === 1;
      acertou = !falha && (critico || total >= caAtual(alvo));
    }
    const res = novoRes(alvo, critico ? "critico" : acertou ? "acerto" : falha ? "falha" : "erro");
    if (insp) res.textos.push("INSPIRAÇÃO!");
    b.d20 = { v: d.v, cor: critico ? "critico" : falha ? "falha" : acertou ? "acerto" : "erro" };
    log(`  ${a.l.nome} → ${alvo.l.nome}: ${op.nome}, d20 ${d.dados.join("/")} ${fmt(bonus)} = ${total} vs CA ${caAtual(alvo)} → ${critico ? "CRÍTICO!" : acertou ? "acertou" : falha ? "FALHA (1 natural)" : "errou"}`);
    if (acertou) {
      const dn = rolarDano(a, op.nome, op.n, op.d, critico, op.gwf);
      let total2 = dn.total + op.bonusDano;
      let extraTxt = "";
      // Ataque Furtivo
      if (op.furtivo) {
        const outroPerto = E.some((o) => o.vivo && o.id !== a.id && o.id !== alvo.id && dist(o.pos, alvo.pos) <= ALCANCE);
        if (vant > 0 || outroPerto) {
          const nd = Math.ceil(a.nivel / 2);
          const f = rolarDano(a, "Ataque Furtivo", nd, 6, critico);
          total2 += f.total;
          extraTxt += ` + furtivo ${f.txt}=${f.total}`;
          res.textos.push("FURTIVO");
          b.nome = "ATAQUE FURTIVO";
          b.cor = "#b8bcc8";
        }
      }
      // Marca do Caçador / Bruxaria
      if (alvo.marcadoPor.has(a.id)) {
        const f = rolarDano(a, "Marca do Caçador", 1, 6, critico);
        total2 += f.total;
        extraTxt += ` + marca ${f.txt}=${f.total}`;
      }
      if (alvo.amaldicoadoPor.has(a.id)) {
        const f = rolarDano(a, "Bruxaria", 1, 6, critico);
        total2 += f.total;
        extraTxt += ` + bruxaria ${f.txt}=${f.total}`;
      }
      // Fúria
      if (a.furia > 0 && !op.distancia && !op.magia) {
        total2 += a.nivel >= 9 ? 3 : 2;
        extraTxt += " + fúria 2";
      }
      // Destruição Divina (paladino nível 2+)
      if (a.l.classe === "PALADINO" && a.nivel >= 2 && !op.distancia && !op.magia && a.slots.some((s) => s > 0) && (critico || alvo.pv <= 18)) {
        const i = a.slots.findIndex((s) => s > 0);
        a.slots[i]--;
        const f = rolarDano(a, "Destruição Divina", 2 + i, 8, critico);
        total2 += f.total;
        extraTxt += ` + destruição ${f.txt}=${f.total}`;
        b.nome = "DESTRUIÇÃO DIVINA";
        b.cor = COR_DANO.radiante;
        b.fx = "fulgor";
        b.especial = Math.max(b.especial, 1) as 1;
      }
      total2 = Math.max(1, total2);
      if (critico) {
        res.textos.push("CRÍTICO!");
        a.stats.criticos++;
        if (!a.stats.primeiroCritico) a.stats.primeiroCritico = `${op.rotulo ?? op.nome} em ${alvo.l.nome}`;
        b.especial = 3;
      }
      b.rolagem = `${dn.txt}${op.bonusDano ? fmt(op.bonusDano) : ""} = ${total2}`;
      log(`    dano ${dn.dados.join("+")}${op.bonusDano ? fmt(op.bonusDano) : ""}${extraTxt} = ${total2} ${op.tipo}`);
      aplicarDano(a, alvo, total2, op.tipo, op.rotulo ?? op.nome, res, b);
      op.extra?.(alvo, res, b);
    } else {
      res.textos.push(falha ? "FALHA" : "ERROU");
      b.rolagem = `d20 = ${d.v}`;
    }
    if (b.especial === 3 || res.morreu) b.rolagem = b.rolagem || `d20 = ${d.v}`;
    b.resultados.push(res);
    batidas.push(b);
    return b;
  };

  // Magia de salvaguarda contra vários alvos
  const salvaguarda = (
    a: Est,
    alvos: Est[],
    op: { nome: string; n: number; d: number; bonusDano?: number; tipo: TipoDano; fx: Efeito; atributo: Atributo; metade: boolean; especial?: 0 | 1 | 2 | 3; cdOverride?: number; extra?: (alvo: Est, res: Resultado, falhou: boolean, b: Batida & { k: "golpe" }) => void },
    batidas: Batida[],
  ) => {
    const b = novoGolpe(a, op.nome, op.tipo, op.fx, false, true);
    b.especial = op.especial ?? 0;
    const CD = op.cdOverride ?? cd(a);
    const dn = rolarDano(a, op.nome, op.n, op.d, false);
    const total = dn.total + (op.bonusDano ?? 0);
    b.rolagem = `${dn.txt}${op.bonusDano ? fmt(op.bonusDano) : ""} = ${total}`;
    log(`  ${a.l.nome}: ${op.nome} (CD ${CD} ${op.atributo}) → dano ${dn.dados.join("+")}${op.bonusDano ? fmt(op.bonusDano) : ""} = ${total}`);
    for (const alvo of alvos) {
      const mental = op.atributo === "INT" || op.atributo === "SAB" || op.atributo === "CAR";
      const sentido = alvo.l.classe === "BARBARO" && alvo.nivel >= 2 && op.atributo === "DES"; // Sentido de Perigo
      const vant = (alvo.l.especie === "GNOMO" && mental) || sentido ? 1 : 0;
      const profS = CLASSES[alvo.l.classe].salvaguardas.includes(op.atributo) ? alvo.prof : 0;
      const s = rolarD20(alvo, `salvaguarda de ${op.atributo} contra ${op.nome}`, vant);
      const tot = s.v + m(alvo, op.atributo) + profS;
      const passou = tot >= CD;
      const res = novoRes(alvo, passou ? "salvou" : "falhou");
      const dano = passou ? (op.metade ? Math.floor(total / 2) : 0) : total;
      log(`    ${alvo.l.nome}: d20 ${s.dados.join("/")} ${fmt(m(alvo, op.atributo) + profS)} = ${tot} → ${passou ? "SALVOU" : "falhou"} (${dano} de dano)`);
      if (passou) res.textos.push("SALVOU");
      if (dano > 0) aplicarDano(a, alvo, dano, op.tipo, op.nome, res, b);
      op.extra?.(alvo, res, !passou, b);
      b.resultados.push(res);
    }
    if (alvos.length >= 2) b.especial = Math.max(b.especial, 1) as 1;
    batidas.push(b);
    return b;
  };

  const curar = (a: Est, alvo: Est, nome: string, valor: number, rol: string, fx: Efeito, batidas: Batida[], acaoBonus = true) => {
    const b = novoGolpe(a, nome, "cura", fx, false, true);
    const antes = alvo.pv;
    alvo.pv = Math.min(alvo.pvMax, alvo.pv + valor);
    const res = novoRes(alvo, "cura");
    res.cura = alvo.pv - antes;
    res.pvDepois = alvo.pv;
    a.stats.curou += res.cura;
    b.rolagem = rol;
    b.resultados.push(res);
    log(`  ${a.l.nome}: ${nome} ${rol} → +${res.cura} PV (${alvo.pv}/${alvo.pvMax})${acaoBonus ? " [ação bônus]" : ""}`);
    batidas.push(b);
  };

  const buff = (a: Est, nome: string, tipo: TipoDano, fx: Efeito, alvo: Est, cond: { id: number; add?: string; del?: string }[], especial: 0 | 1 = 0, cor?: string) => {
    const b = novoGolpe(a, nome, tipo, fx, false, true);
    if (cor) b.cor = cor;
    b.especial = especial;
    b.resultados.push(novoRes(alvo, "buff"));
    b.cond.push(...cond);
    return b;
  };

  // ─── movimento com ataques de oportunidade ───
  const mover = (a: Est, pts: P[], batidas: Batida[], recua = false, corre = false, desengajar = false) => {
    if (pts.length < 2 || compPath(pts) < 1) return;
    const passo = 3;
    let atual = [pts[0]];
    const naoProvocou = new Set<number>();
    let pos = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const seg = dist(pts[i - 1], pts[i]);
      const nPassos = Math.max(1, Math.ceil(seg / passo));
      for (let s = 1; s <= nPassos; s++) {
        const q = lerp(pts[i - 1], pts[i], s / nPassos);
        if (!desengajar) {
          for (const o of inimigos(a)) {
            if (!o.reacao || naoProvocou.has(o.id) || !podeCorpo(o)) continue;
            if (dist(pos, o.pos) <= ALCANCE && dist(q, o.pos) > ALCANCE) {
              // sai do alcance: ataque de oportunidade
              atual.push(pos);
              batidas.push({ k: "mover", ator: a.id, pts: atual, recua, corre });
              a.pos = { ...pos };
              o.reacao = false;
              naoProvocou.add(o.id);
              log(`  ↯ ${a.l.nome} provoca ataque de oportunidade de ${o.l.nome}`);
              const arma = armaCorpo(o);
              const ob = atacar(o, a, opArma(o, arma, true), batidas);
              ob.nome = "OPORTUNIDADE";
              if (!a.vivo) return;
              atual = [pos];
            }
          }
        }
        pos = q;
      }
      atual.push(pts[i]);
    }
    a.pos = { ...pts[pts.length - 1] };
    batidas.push({ k: "mover", ator: a.id, pts: atual, recua, corre });
  };

  const opArma = (a: Est, arma: Arma, reacao = false): OpAtaque => {
    const md = modArma(a, arma);
    const estilo = (a.l.classe === "GUERREIRO" || (a.l.classe === "PALADINO" && a.nivel >= 2)) && !arma.distancia;
    const duelo = estilo && !arma.duasMaos;
    const gwf = estilo && arma.duasMaos;
    const arquearia = a.l.classe === "PATRULHEIRO" && a.nivel >= 2 && arma.distancia ? 2 : 0;
    const monge = a.l.classe === "MONGE";
    const fx: Efeito = arma.distancia ? "flecha" : monge ? "soco" : arma.duasMaos ? "corteGrande" : arma.tipo === "perfurante" ? "estocada" : arma.tipo === "concussao" ? "impacto" : "corte";
    return {
      nome: monge ? "ARTES MARCIAIS" : arma.distancia ? (a.l.classe === "PATRULHEIRO" ? "FLECHA" : nomeArma(arma)) : a.l.classe === "LADINO" ? nomeArma(arma) : "ATAQUE",
      n: arma.n,
      d: monge ? dadoMarcial(a) : arma.d,
      bonusDano: md + (duelo ? 2 : 0),
      tipo: arma.tipo,
      fx,
      distancia: arma.distancia,
      magia: false,
      bonusAcerto: md + a.prof + arquearia,
      critMin: a.l.classe === "GUERREIRO" && a.nivel >= 3 ? 19 : 20,
      gwf,
      reacao,
      furtivo: a.l.classe === "LADINO",
      rotulo: monge ? "Artes Marciais" : arma.nome,
    };
  };
  const opMagia = (a: Est, nome: string, n: number, d: number, tipo: TipoDano, fx: Efeito, bonusDano = 0, extra?: OpAtaque["extra"]): OpAtaque => ({
    nome,
    n,
    d,
    bonusDano,
    tipo,
    fx,
    distancia: true,
    magia: true,
    bonusAcerto: a.prof + conj(a),
    extra,
  });

  // ─── escolha de alvo e posição ───
  const escolherAlvo = (a: Est, distancia: boolean): Est | undefined => {
    const ini = inimigos(a);
    if (!ini.length) return undefined;
    let melhor: Est | undefined;
    let ms = Infinity;
    for (const o of ini) {
      const d = dist(a.pos, o.pos);
      let s = distancia ? o.pv * 0.6 + d * 0.02 : d / 40 + o.pv * 0.35;
      if (o.pv <= 4) s -= 3;
      if (a.conc && a.conc.alvo === o.id) s -= 4;
      if (o.l.campeao) s -= foco * (distancia ? 2 : 1.2); // foco no campeão
      s += rng.next() * 1.5;
      if (s < ms) {
        ms = s;
        melhor = o;
      }
    }
    return melhor;
  };
  const livre = (a: Est, p: P) => E.every((o) => !o.vivo || o.id === a.id || dist(o.pos, p) >= SEPARACAO) && dist(p, ALTAR) > ALTAR.r + 6;
  const pontoContato = (a: Est, alvo: Est): P | undefined => {
    let best: P | undefined;
    let bd = Infinity;
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const p = { x: alvo.pos.x + Math.cos(ang) * CONTATO, y: alvo.pos.y + Math.sin(ang) * CONTATO * 0.8 };
      if (p.x < LIMITES.x0 || p.x > LIMITES.x1 || p.y < LIMITES.y0 || p.y > LIMITES.y1) continue;
      if (!livre(a, p)) continue;
      const d = compPath(caminho(a.pos, p));
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  };
  const velocidade = (a: Est) => (a.l.deslocamento - (a.lento ? 10 : 0) + (a.l.classe === "BARBARO" && a.nivel >= 5 ? 10 : 0) + (a.l.classe === "MONGE" && a.nivel >= 2 ? 10 : 0)) * PE;

  const pontoSeguro = (a: Est, alvo: Est | undefined): P => {
    const vel = velocidade(a);
    const cands: P[] = [a.pos];
    for (let r = 1; r <= 3; r++)
      for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * Math.PI * 2 + r * 0.3;
        cands.push(clampP({ x: a.pos.x + Math.cos(ang) * vel * (r / 3), y: a.pos.y + Math.sin(ang) * vel * (r / 3) }));
      }
    let best = a.pos;
    let bs = -Infinity;
    for (const p of cands) {
      if (!livre(a, p) && p !== a.pos) continue;
      const path = caminho(a.pos, p);
      if (compPath(path) > vel + 0.5) continue;
      let dmin = Infinity;
      let corpo = 0;
      for (const o of inimigos(a)) {
        const d = dist(p, o.pos);
        dmin = Math.min(dmin, d);
        if (!ehDistancia(o) && d < velocidade(o) + ALCANCE) corpo += (velocidade(o) + ALCANCE - d) / 60;
        if (d <= ALCANCE) corpo += 6;
      }
      const parede = Math.min(p.x - LIMITES.x0, LIMITES.x1 - p.x, p.y - LIMITES.y0, LIMITES.y1 - p.y);
      let s = Math.min(dmin, 150) * 0.05 - corpo - (parede < 34 ? (34 - parede) * 0.08 : 0) - compPath(path) * 0.004;
      if (alvo && dist(p, alvo.pos) > 260) s -= 2;
      if (s > bs) {
        bs = s;
        best = p;
      }
    }
    return best;
  };

  const turnoSeguro = (fn: () => void) => fn();

  // ─── IA de um turno ───
  const jogarTurno = (a: Est, rodada: number) => {
    const batidas: Batida[] = [];
    turnoAtual = { rodada, ator: a.id, batidas, log: [] };
    log(`[R${rodada}] Turno de ${a.l.nome} (${a.pv}/${a.pvMax} PV)`);
    // início do turno
    a.reacao = true;
    if (a.escudo) {
      a.escudo = false;
      batidas.push({ k: "estado", cond: [{ id: a.id, del: "ESC" }] });
    }
    if (a.furia > 0) {
      a.furia--;
      if (a.furia === 0) batidas.push({ k: "estado", cond: [{ id: a.id, del: "FÚR" }] });
    }
    let bonusUsada = false;
    let acaoUsada = false;
    const cl = a.l.classe;
    const pct = a.pv / a.pvMax;

    // ── curas de emergência ──
    if (pct < 0.4) {
      if (cl === "GUERREIRO" && a.folego > 0) {
        a.folego--;
        const r = rng.roll(`${a.l.nome} · Retomar o Fôlego (1d10+${a.nivel})`, 1, 10, a.nivel);
        curar(a, a, "RETOMAR O FÔLEGO", r.total, `1d10+${a.nivel} = ${r.total}`, "cura", batidas);
        bonusUsada = true;
      } else if (cl === "PALADINO" && a.curaMaos > 0) {
        const v = Math.min(a.curaMaos, a.pvMax - a.pv);
        a.curaMaos -= v;
        curar(a, a, "CURA PELAS MÃOS", v, `${v} PV da reserva`, "cura", batidas);
        bonusUsada = true;
      } else if ((cl === "CLERIGO" || cl === "DRUIDA" || cl === "BARDO") && a.slots[0] > 0) {
        if (cl === "CLERIGO" && pct < 0.25 && a.slots[0] > 0) {
          a.slots[0]--;
          const r = rng.roll(`${a.l.nome} · Curar Ferimentos (2d8+SAB)`, 2, 8, conj(a));
          curar(a, a, "CURAR FERIMENTOS", r.total, `2d8${fmt(conj(a))} = ${r.total}`, "cura", batidas, false);
          acaoUsada = true;
        } else {
          a.slots[0]--;
          const r = rng.roll(`${a.l.nome} · Palavra Curativa (2d4+mod)`, 2, 4, conj(a));
          curar(a, a, "PALAVRA CURATIVA", r.total, `2d4${fmt(conj(a))} = ${r.total}`, "cura", batidas);
          bonusUsada = true;
        }
      }
    }

    const distancia = ehDistancia(a);
    const alvo = escolherAlvo(a, distancia);
    if (!alvo) return finalizar();

    // ── ação bônus antes de agir ──
    if (!bonusUsada) {
      if (cl === "BARBARO" && a.furia === 0 && a.furiaUsos > 0 && dist(a.pos, alvo.pos) < velocidade(a) * 2) {
        a.furiaUsos--;
        a.furia = 10;
        batidas.push(buff(a, "FÚRIA!", "fogo", "furia", a, [{ id: a.id, add: "FÚR" }], 1, "#e0742a"));
        log(`  ${a.l.nome} entra em FÚRIA (resiste a cortante/perfurante/concussão, +2 de dano)`);
        bonusUsada = true;
      } else if (cl === "PATRULHEIRO" && !a.conc && a.slots[0] > 0) {
        a.slots[0]--;
        a.conc = { tipo: "MARCA", alvo: alvo.id };
        alvo.marcadoPor.add(a.id);
        batidas.push(buff(a, "MARCA DO CAÇADOR", "acido", "marca", alvo, [{ id: alvo.id, add: "MRC" }, { id: a.id, add: "CNC" }], 0, "#b8e04a"));
        log(`  ${a.l.nome} marca ${alvo.l.nome} (Marca do Caçador, concentração)`);
        bonusUsada = true;
      } else if (cl === "PATRULHEIRO" && a.conc && !E[a.conc.alvo].vivo) {
        const ant = a.conc.alvo;
        E[ant].marcadoPor.delete(a.id);
        a.conc = { tipo: "MARCA", alvo: alvo.id };
        alvo.marcadoPor.add(a.id);
        batidas.push(buff(a, "MARCA DO CAÇADOR", "acido", "marca", alvo, [{ id: alvo.id, add: "MRC" }], 0, "#b8e04a"));
        log(`  ${a.l.nome} move a Marca do Caçador para ${alvo.l.nome}`);
        bonusUsada = true;
      } else if (cl === "BRUXO" && !a.conc && a.slots.some((s) => s > 0)) {
        const i = a.slots.findIndex((s) => s > 0);
        a.slots[i]--;
        a.conc = { tipo: "BRUXARIA", alvo: alvo.id };
        alvo.amaldicoadoPor.add(a.id);
        batidas.push(buff(a, "BRUXARIA", "necrotico", "bruxaria", alvo, [{ id: a.id, add: "CNC" }], 0, "#8a3cc4"));
        log(`  ${a.l.nome} lança Bruxaria em ${alvo.l.nome} (concentração)`);
        bonusUsada = true;
      } else if (cl === "BRUXO" && a.conc && !E[a.conc.alvo].vivo) {
        a.conc = { tipo: "BRUXARIA", alvo: alvo.id };
        alvo.amaldicoadoPor.add(a.id);
        batidas.push(buff(a, "BRUXARIA", "necrotico", "bruxaria", alvo, [], 0, "#8a3cc4"));
        log(`  ${a.l.nome} move a Bruxaria para ${alvo.l.nome}`);
        bonusUsada = true;
      } else if (cl === "FEITICEIRO" && !a.inataAtiva && a.inata > 0) {
        a.inata--;
        a.inataAtiva = true;
        batidas.push(buff(a, "FEITIÇARIA INATA", "energia", "brilho", a, [], 0, a.l.visual.magia));
        log(`  ${a.l.nome} desperta a Feitiçaria Inata (vantagem nas magias, CD +1)`);
        bonusUsada = true;
      }
    }

    if (acaoUsada) return finalizar();

    // ── movimento + ação ──
    const vel = velocidade(a);
    if (distancia) {
      // atirador / conjurador
      const ameacado = ameacas(a).length > 0;
      const destino = pontoSeguro(a, alvo);
      const desengaja = cl === "LADINO" && a.nivel >= 2 && ameacado && !bonusUsada;
      if (desengaja) bonusUsada = true;
      const recua = ameacado && dist(destino, a.pos) > 4;
      mover(a, caminho(a.pos, destino), batidas, recua, false, desengaja);
      if (!a.vivo) return finalizar();
      const encurralado = ameacas(a).length > 0;
      const alvoAgora = alvo.vivo ? alvo : escolherAlvo(a, true);
      if (!alvoAgora) return finalizar();
      if (encurralado && (cl === "LADINO" || cl === "PATRULHEIRO" || cl === "CLERIGO" || cl === "DRUIDA") && !(cl === "DRUIDA" && a.slots[0] > 0 && ameacas(a).length >= 2)) {
        // usa arma corpo a corpo contra quem está colado
        const perto = ameacas(a).sort((x, y) => x.pv - y.pv)[0];
        atacar(a, perto, opArma(a, armaCorpo(a)), batidas);
      } else {
        acaoDistancia(a, alvoAgora, batidas, bonusUsada);
      }
    } else {
      // corpo a corpo
      let ponto: P | undefined = adjacente(a, alvo) ? a.pos : pontoContato(a, alvo);
      let alvoFinal = alvo;
      if (!ponto) {
        // sem espaço em volta do alvo: escolhe o inimigo mais próximo com espaço
        const outros = inimigos(a).sort((x, y) => dist(a.pos, x.pos) - dist(a.pos, y.pos));
        for (const o of outros) {
          const p = adjacente(a, o) ? a.pos : pontoContato(a, o);
          if (p) {
            ponto = p;
            alvoFinal = o;
            break;
          }
        }
      }
      if (!ponto) return finalizar();
      const path = caminho(a.pos, ponto);
      const L = compPath(path);
      let alcance = vel;
      let corre = false;
      if (L > vel && !bonusUsada && a.adrenalina > 0 && L <= vel * 2) {
        a.adrenalina--;
        a.pvTemp += a.prof;
        bonusUsada = true;
        corre = true;
        alcance = vel * 2;
        batidas.push(buff(a, "SURTO DE ADRENALINA", "fogo", "furia", a, [], 0, "#c84a2a"));
        log(`  ${a.l.nome}: Surto de Adrenalina (dispara, +${a.prof} PV temporários)`);
      }
      if (L <= alcance) {
        mover(a, path, batidas, false, corre);
        if (!a.vivo) return finalizar();
        acaoCorpo(a, alvoFinal, batidas, bonusUsada);
      } else if (a.l.especie === "TIEFLING") {
        // não alcança: anda o máximo e usa o Raio de Fogo do Legado Infernal
        mover(a, cortar(path, vel), batidas);
        if (!a.vivo) return finalizar();
        atacar(a, alvoFinal, opMagia(a, "RAIO DE FOGO", truque(a), 10, "fogo", "raioFogo"), batidas);
      } else {
        // Disparada: dobra o deslocamento, sem ataque
        mover(a, cortar(path, alcance === vel ? vel * 2 : alcance), batidas, false, true);
        log(`  ${a.l.nome} usa Disparada`);
        if (!a.vivo) return finalizar();
      }
    }
    return finalizar();

    function finalizar() {
      // fim do turno: efeitos que duram "até o fim do próximo turno"
      if (a.lento) {
        a.lento = false;
        batidas.push({ k: "estado", cond: [{ id: a.id, del: "LNT" }] });
      }
      if (a.desvantagem) {
        a.desvantagem = false;
        batidas.push({ k: "estado", cond: [{ id: a.id, del: "ZMB" }] });
      }
      turnos.push(turnoAtual);
    }
  };

  // Ação corpo a corpo (já adjacente)
  const acaoCorpo = (a: Est, alvo: Est, batidas: Batida[], bonusUsada: boolean) => {
    const cl = a.l.classe;
    const arma = armaCorpo(a);
    const ataques = a.nivel >= 5 && ["GUERREIRO", "BARBARO", "PALADINO", "PATRULHEIRO", "MONGE"].includes(cl) ? 2 : 1;
    // Arma de Sopro (draconato): substitui um ataque
    const cone = (centro: Est) => inimigos(a).filter((o) => dist(a.pos, o.pos) <= 64 && angulo(a.pos, centro.pos, o.pos) < Math.PI / 4);
    const anc = a.l.ancestralidade;
    let usouSopro = false;
    if (a.sopro > 0 && anc && (cone(alvo).length >= 2 || rng.next() < 0.45)) {
      a.sopro--;
      usouSopro = true;
      salvaguarda(a, cone(alvo), { nome: "ARMA DE SOPRO", n: a.nivel >= 5 ? 2 : 1, d: 10, tipo: anc.dano, fx: "sopro", atributo: "DES", metade: true, especial: 1, cdOverride: 8 + m(a, "CON") + a.prof }, batidas);
    }
    for (let i = usouSopro ? 1 : 0; i < ataques; i++) {
      const t = alvo.vivo ? alvo : ameacas(a)[0];
      if (!t) break;
      atacar(a, t, opArma(a, arma), batidas);
    }
    // Surto de Ação (guerreiro nível 2+)
    if (cl === "GUERREIRO" && a.surto > 0) {
      const t = alvo.vivo ? alvo : ameacas(a)[0];
      if (t) {
        a.surto--;
        batidas.push(buff(a, "SURTO DE AÇÃO", "cortante", "brilho", a, [], 1, "#e8c040"));
        log(`  ${a.l.nome}: SURTO DE AÇÃO (uma ação extra)`);
        for (let i = 0; i < ataques; i++) {
          const t2 = t.vivo ? t : ameacas(a)[0];
          if (t2) atacar(a, t2, opArma(a, arma), batidas);
        }
      }
    }
    // Ação bônus de ataque (monge: Artes Marciais / Rajada de Golpes)
    if (!bonusUsada && cl === "MONGE") {
      const golpes = a.foco > 0 ? 2 : 1;
      if (golpes === 2) {
        a.foco--;
        log(`  ${a.l.nome}: Rajada de Golpes (1 ponto de foco)`);
      }
      for (let i = 0; i < golpes; i++) {
        const t = alvo.vivo ? alvo : ameacas(a)[0];
        if (!t) break;
        const op = opArma(a, arma);
        if (golpes === 2) op.nome = "RAJADA DE GOLPES";
        atacar(a, t, op, batidas);
      }
    }
    // Retomar o Fôlego se ficou ferido e ainda tem ação bônus
    if (!bonusUsada && cl === "GUERREIRO" && a.folego > 0 && a.pv / a.pvMax < 0.5) {
      a.folego--;
      const r = rng.roll(`${a.l.nome} · Retomar o Fôlego (1d10+${a.nivel})`, 1, 10, a.nivel);
      curar(a, a, "RETOMAR O FÔLEGO", r.total, `1d10+${a.nivel} = ${r.total}`, "cura", batidas);
    }
  };

  const angulo = (o: P, a: P, b: P) => {
    const a1 = Math.atan2(a.y - o.y, a.x - o.x);
    const a2 = Math.atan2(b.y - o.y, b.x - o.x);
    let d = Math.abs(a1 - a2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  };

  // Ação de atirador/conjurador
  const acaoDistancia = (a: Est, alvo: Est, batidas: Batida[], bonusUsada: boolean) => {
    const cl = a.l.classe;
    const T = truque(a);
    const perto = inimigos(a).filter((o) => dist(o.pos, a.pos) <= 44);
    const onda = (nome = "ONDA TROVEJANTE") =>
      salvaguarda(
        a,
        perto,
        {
          nome,
          n: 2,
          d: 8,
          tipo: "trovejante",
          fx: "onda",
          atributo: "CON",
          metade: true,
          extra: (alvo2, res, falhou) => {
            if (falhou && alvo2.vivo) {
              const ang = Math.atan2(alvo2.pos.y - a.pos.y, alvo2.pos.x - a.pos.x);
              const np = clampP({ x: alvo2.pos.x + Math.cos(ang) * 40, y: alvo2.pos.y + Math.sin(ang) * 40 });
              alvo2.pos = np;
              res.novaPos = np;
            }
          },
        },
        batidas,
      );
    switch (cl) {
      case "MAGO": {
        if (perto.length >= 2 && a.slots[0] > 0) {
          a.slots[0]--;
          onda();
        } else if (a.slots[0] > 0 && alvo.pv <= 9 && alvo.pv >= 4) {
          a.slots[0]--;
          const b = novoGolpe(a, "MÍSSEIS MÁGICOS", "energia", "misseis", false, true);
          const r = rng.roll(`${a.l.nome} · Mísseis Mágicos 3×(1d4+1)`, 3, 4, 3);
          const res = novoRes(alvo, "acerto");
          b.rolagem = `3×(1d4+1) = ${r.total}`;
          log(`  ${a.l.nome}: MÍSSEIS MÁGICOS em ${alvo.l.nome} → ${r.dados.map((x) => x + 1).join("+")} = ${r.total} (acerto automático)`);
          aplicarDano(a, alvo, r.total, "energia", "MÍSSEIS MÁGICOS", res, b);
          b.resultados.push(res);
          batidas.push(b);
        } else {
          atacar(a, alvo, opMagia(a, "RAIO DE FOGO", T, 10, "fogo", "raioFogo"), batidas);
        }
        break;
      }
      case "FEITICEIRO": {
        if (a.slots[0] > 0 && alvo.pv >= 7) {
          a.slots[0]--;
          atacar(a, alvo, opMagia(a, "ORBE CROMÁTICO", 3, 8, "acido", "orbe"), batidas);
        } else if (!ehDistancia(alvo) && dist(a.pos, alvo.pos) < 170) {
          atacar(
            a,
            alvo,
            opMagia(a, "RAIO DE GELO", T, 8, "frio", "raioGelo", 0, (t, _res, b) => {
              if (t.vivo) {
                t.lento = true;
                b.cond.push({ id: t.id, add: "LNT" });
              }
            }),
            batidas,
          );
        } else {
          atacar(a, alvo, opMagia(a, "RAIO DE FOGO", T, 10, "fogo", "raioFogo"), batidas);
        }
        break;
      }
      case "BRUXO": {
        const car = a.nivel >= 2 ? m(a, "CAR") : 0;
        atacar(a, alvo, opMagia(a, "RAJADA MÍSTICA", 1, 10, "energia", "rajada", car), batidas);
        if (a.nivel >= 5 && alvo.vivo) atacar(a, alvo, opMagia(a, "RAJADA MÍSTICA", 1, 10, "energia", "rajada", car), batidas);
        break;
      }
      case "CLERIGO": {
        if (a.centelha > 0 && alvo.pv <= 10) {
          a.centelha--;
          salvaguarda(a, [alvo], { nome: "CENTELHA DIVINA", n: 1, d: 8, bonusDano: conj(a), tipo: "radiante", fx: "chamaSagrada", atributo: "CON", metade: true, especial: 1 }, batidas);
        } else if (a.slots[0] >= 2 || (a.slots[0] >= 1 && a.pv / a.pvMax > 0.6)) {
          a.slots[0]--;
          atacar(
            a,
            alvo,
            opMagia(a, "RAIO GUIA", 4, 6, "radiante", "raioGuia", 0, (t) => {
              if (t.vivo) t.vantagemContra = true;
            }),
            batidas,
          );
        } else {
          salvaguarda(a, [alvo], { nome: "CHAMA SAGRADA", n: T, d: 8, tipo: "radiante", fx: "chamaSagrada", atributo: "DES", metade: false }, batidas);
        }
        break;
      }
      case "DRUIDA": {
        if (perto.length >= 2 && a.slots[0] > 0) {
          a.slots[0]--;
          onda();
        } else if (ehDistancia(alvo) && dist(a.pos, alvo.pos) <= 120 && rng.next() < 0.5) {
          atacar(
            a,
            alvo,
            {
              ...opMagia(a, "CHICOTE DE ESPINHOS", T, 6, "perfurante", "espinhos", 0, (t, res) => {
                if (t.vivo) {
                  const ang = Math.atan2(a.pos.y - t.pos.y, a.pos.x - t.pos.x);
                  const d = Math.max(0, Math.min(40, dist(a.pos, t.pos) - CONTATO - 6));
                  const np = clampP({ x: t.pos.x + Math.cos(ang) * d, y: t.pos.y + Math.sin(ang) * d });
                  t.pos = np;
                  res.novaPos = np;
                }
              }),
              distancia: false,
            },
            batidas,
          );
          const ultima = batidas[batidas.length - 1];
          if (ultima.k === "golpe") ultima.cor = "#4fa83c";
        } else {
          atacar(a, alvo, opMagia(a, "PRODUZIR CHAMA", T, 8, "fogo", "chama"), batidas);
        }
        break;
      }
      case "BARDO": {
        if (perto.length >= 2 && a.slots[0] > 0) {
          a.slots[0]--;
          onda();
        } else if (a.slots[0] > 0 && alvo.pv >= 6) {
          a.slots[0]--;
          salvaguarda(
            a,
            [alvo],
            {
              nome: "SUSSURROS DISSONANTES",
              n: 3,
              d: 6,
              tipo: "psiquico",
              fx: "sussurros",
              atributo: "SAB",
              metade: true,
              extra: (t, res, falhou) => {
                if (falhou && t.vivo && t.reacao) {
                  t.reacao = false;
                  const ang = Math.atan2(t.pos.y - a.pos.y, t.pos.x - a.pos.x);
                  const np = clampP({ x: t.pos.x + Math.cos(ang) * 60, y: t.pos.y + Math.sin(ang) * 60 });
                  t.pos = np;
                  res.novaPos = np;
                  res.textos.push("FOGE!");
                }
              },
            },
            batidas,
          );
        } else {
          salvaguarda(
            a,
            [alvo],
            {
              nome: "ZOMBARIA VICIOSA",
              n: T,
              d: 6,
              tipo: "psiquico",
              fx: "zombaria",
              atributo: "SAB",
              metade: false,
              extra: (t, _res, falhou, b) => {
                if (falhou && t.vivo) {
                  t.desvantagem = true;
                  b.cond.push({ id: t.id, add: "ZMB" });
                }
              },
            },
            batidas,
          );
        }
        break;
      }
      case "PATRULHEIRO":
      default: {
        const arma = a.l.arma.distancia ? a.l.arma : a.l.armaDistancia ?? a.l.arma;
        atacar(a, alvo, opArma(a, arma), batidas);
        if (a.nivel >= 5 && cl === "PATRULHEIRO" && alvo.vivo) atacar(a, alvo, opArma(a, arma), batidas);
        break;
      }
    }
    void bonusUsada;
  };

  // ─── laço de rodadas ───
  let rodada = 0;
  while (vivos().length > 1 && rodada < 80) {
    rodada++;
    for (const ini of iniciativa) {
      const a = E[ini.id];
      if (!a.vivo) continue;
      if (vivos().length <= 1) break;
      turnoSeguro(() => jogarTurno(a, rodada));
    }
  }
  const vencedor = vivos()[0]?.id ?? -1;
  return {
    turnos,
    iniciativa: iniciativa.map(({ id, d20, total }) => ({ id, d20, total })),
    posIniciais,
    vencedor,
    ordemQueda,
    stats: E.map((e) => e.stats),
    rodadas: rodada,
    evolucao: E.map((e) => ({ nivel: e.nivel, pvMax: e.pvMax, atributos: e.at, pvRolagens: e.pvRolagens, subidas: e.subidas })),
  };
};
