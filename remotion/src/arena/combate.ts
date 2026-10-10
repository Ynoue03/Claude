// Simulação da luta com as regras do SRD 5.2 (nível 1–5) + IA simples.
// Saída: lista de turnos, cada um com "batidas" (mover, golpe) que o roteiro transforma em quadros.
import { Rng } from "./rng.ts";
import { ARMAS, fmt, subirNivel } from "./personagem.ts";
import type { Arma, Lutador, SubidaNivel } from "./personagem.ts";
import { CLASSES, COR_DANO, espacos, mod, proficiencia } from "./regras.ts";
import { ITEM_IDS, podeUsar, tipoDe } from "./itens.ts";
import { CHEFES } from "./chefes.ts";
import type { AtaqueChefe } from "./chefes.ts";
import type { ItemId } from "./itens.ts";
import type { Atributo, TipoDano } from "./regras.ts";

// ───────────── geometria da arena (pixels da resolução interna 360×640) ─────────────
export const PE = 4; // 1 pé = 4 px  →  5 pés = 20 px, 30 pés = 120 px
export const ALCANCE = 26; // corpo a corpo (5 pés + folga de sprite)
export const CONTATO = 22;
export const SEPARACAO = 18;
// Tamanho de cada arena (mundo em pixels internos) e área onde dá para lutar.
// A caverna dos chefes tem 4× a área das arenas normais (o dobro de largura e de altura).
export type Geo = { w: number; h: number; lim: { x0: number; x1: number; y0: number; y1: number }; centro: P; raio: P };
export const GEO: Record<string, Geo> = {
  calabouco: { w: 360, h: 640, lim: { x0: 46, x1: 314, y0: 200, y1: 520 }, centro: { x: 180, y: 360 }, raio: { x: 118, y: 140 } },
  floresta: { w: 360, h: 640, lim: { x0: 46, x1: 314, y0: 200, y1: 520 }, centro: { x: 180, y: 360 }, raio: { x: 118, y: 140 } },
  // caverna dos chefes: 4× a área (2× cada lado); a luta ocupa o retângulo das arenas normais em 2×, e a câmera mostra tudo
  caverna: { w: 720, h: 1280, lim: { x0: 92, x1: 628, y0: 400, y1: 1040 }, centro: { x: 360, y: 720 }, raio: { x: 236, y: 280 } },
};
export const Y_MIN_CHEFE = 640;
export const geoDe = (arena?: string): Geo => GEO[arena ?? "calabouco"] ?? GEO.calabouco;
// limites da simulação em andamento (ajustados no início de cada simulação)
export let LIMITES = { ...GEO.calabouco.lim };
export const ALTAR = { x: 180, y: 352, r: 24 };
// Arenas com centro livre (sem tablado e sem pedra d20) não têm obstáculo; ligado/desligado no início de cada simulação.
let altarAtivo = true;

export type P = { x: number; y: number };
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const clampP = (p: P): P => {
  const q = { x: Math.max(LIMITES.x0, Math.min(LIMITES.x1, p.x)), y: Math.max(LIMITES.y0, Math.min(LIMITES.y1, p.y)) };
  const d = dist(q, ALTAR);
  if (altarAtivo && d < ALTAR.r + 8) {
    const a = Math.atan2(q.y - ALTAR.y, q.x - ALTAR.x || 0.01);
    q.x = ALTAR.x + Math.cos(a) * (ALTAR.r + 8);
    q.y = ALTAR.y + Math.sin(a) * (ALTAR.r + 8);
  }
  return q;
};
const compPath = (pts: P[]) => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);

// Caminho reto, desviando do altar central se precisar.
const caminho = (a: P, b: P): P[] => {
  if (!altarAtivo) return [a, b];
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
      itensPegos?: { id: number; itens: ItemId[] };
      chefeDerrotado?: boolean;
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
  evolucao: { nivel: number; pvMax: number; atributos: Record<Atributo, number>; pvRolagens: string[]; subidas: SubidaNivel[]; itens: ItemId[] }[];
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
  // itens mágicos (do baú, ou pegos de quem foi derrubado)
  itens: Set<ItemId>;
  itemUsado: Set<ItemId>;
  invisivel: number; // turnos restantes
  espadaTurno: boolean;
  miragem: boolean; // Capa da Miragem já desviou um ataque nesta rodada
  especialPronto: boolean; // chefe: habilidade especial carregada
  lento: boolean;
  desvantagem: boolean;
  vantagemContra: boolean;
  marcadoPor: Set<number>;
  amaldicoadoPor: Set<number>;
  stats: Estatistica;
};


// Foco automático: em 30 lutas por nível (campeã Yara, níveis 2–5) o campeão vence ~50% com
// foco 0 / 2,5 / 5 / 7,5 → cresce 2,5 por nível acima do 2.
export const focoPorNivel = (nivel: number) => Math.max(0, 2.5 * (nivel - 2));
// "forte" (episódio 12+): cresce com os PV máximos do campeão, porque os lutadores evitam alvos com muito PV
// (o foco precisa compensar isso). Calibrado para o campeão vencer ~35–40% em qualquer nível (60 lutas por campeão:
// Yara nv 2, 3 e 5, Korrin nv 4 e 7 → 27–55%, média ~37%; com o "auto" o Korrin nv 7 vencia 100%).
export const focoPorPv = (pvMax: number) => Math.max(0, 0.31 * pvMax - 4.35);

export const simular = (lutadores: Lutador[], rng: Rng, opcoes: { versao?: number; focoCampeao?: number | "auto" | "forte"; centro?: "altar" | "livre"; arena?: string; focoChefe?: number } = {}): Simulacao => {
  const geo = geoDe(opcoes.arena);
  const focoChefe = opcoes.focoChefe ?? 1.25;
  LIMITES = { ...geo.lim };
  altarAtivo = opcoes.centro !== "livre" && geo.w === 360;
  const versao = opcoes.versao ?? 1;
  // força da preferência por atacar o campeão: 1 = leve (padrão da versão 2); 0 = nenhuma;
  // "auto" = cresce com o nível do campeão (episódios 6–11); "forte" = cresce com os PV dele (episódio 12+)
  const camp = lutadores.find((l) => l.campeao);
  const foco = opcoes.focoCampeao === "auto" ? focoPorNivel(camp?.nivel ?? 1) : opcoes.focoCampeao === "forte" ? (camp ? focoPorPv(camp.pvMax) : 0) : opcoes.focoCampeao ?? (versao >= 2 ? 1 : 0);
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
      itens: new Set(l.itens ?? []),
      itemUsado: new Set(),
      invisivel: 0,
      espadaTurno: false,
      miragem: false,
      especialPronto: true,
      pv: l.pvMax,
      pvTemp: 0,
      vivo: true,
      pos: { x: 0, y: 0 },
      reacao: true,
      slots,
      prof,
      furia: 0,
      furiaUsos: l.classe === "BARBARO" ? (n >= 6 ? 4 : n >= 3 ? 3 : 2) : 0,
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
    // chefe não usa recursos de classe nem de espécie
    if (l.boss) {
      Object.assign(e, { furiaUsos: 0, folego: 0, surto: 0, curaMaos: 0, sopro: 0, inspiracao: false, implacavel: false, pedra: 0, adrenalina: 0, inata: 0, foco: 0, centelha: 0, slots: [] });
    }
    // Mago lança Armadura Arcana antes da luta (gasta 1 espaço de 1º círculo).
    if (l.classe === "MAGO" && e.slots[0] > 0) e.slots[0]--;
    return e;
  });

  // posições iniciais: círculo em volta do centro (o chefe começa no meio do círculo)
  const N = E.filter((e) => !e.l.boss).length;
  const posIniciais: P[] = E.map((e, i) => {
    if (e.l.boss) return { ...geo.centro };
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
    return clampP({ x: geo.centro.x + Math.cos(a) * geo.raio.x, y: geo.centro.y + Math.sin(a) * geo.raio.y });
  });
  E.forEach((e, i) => (e.pos = { ...posIniciais[i] }));

  // iniciativa
  const iniciativa = E.map((e) => {
    const r = rng.roll(`${e.l.nome} · iniciativa`, 1, 20, mod(e.at.DES) + (e.itens.has("elmoVigia") ? 5 : 0));
    return { id: e.id, d20: r.dados[0], total: r.total, des: e.at.DES, desempate: rng.next() };
  }).sort((a, b) => b.total - a.total || b.des - a.des || b.desempate - a.desempate);

  const turnos: Turno[] = [];
  const ordemQueda: number[] = [];
  const vivos = () => E.filter((e) => e.vivo);
  const inimigos = (e: Est) => E.filter((o) => o.vivo && o.id !== e.id);

  // ─── utilidades de regra ───
  const m = (e: Est, a: Atributo) => mod(e.at[a]);
  const conj = (e: Est) => (CLASSES[e.l.classe].conjuracao ? m(e, CLASSES[e.l.classe].conjuracao!) : Math.max(m(e, "INT"), m(e, "SAB"), m(e, "CAR")));
  const cd = (e: Est) => 8 + e.prof + conj(e) + (e.inataAtiva ? 1 : 0) + (e.itens.has("cajadoSabedoria") ? 2 : 0);
  const caAtual = (e: Est) => e.l.ca + (e.escudo ? 5 : 0) + (e.itens.has("armaduraBastiao") ? 2 : 0) + (e.itens.has("botasFirmes") ? 1 : 0) + (e.itens.has("escudoGuardiao") ? 1 : 0);
  const armaCorpo = (e: Est): Arma => (e.l.arma.distancia ? { ...ARMAS.adaga, nome: e.l.classe === "PATRULHEIRO" ? "Espada Curta" : "Adaga", d: e.l.classe === "PATRULHEIRO" ? 6 : 4 } : e.l.arma);
  const modArma = (e: Est, a: Arma) => (a.atributo === "DES" ? Math.max(m(e, "DES"), m(e, "FOR")) : m(e, "FOR"));
  const podeCorpo = (e: Est) => e.vivo;
  // chefes têm corpo maior: alcance, contato e espaço em volta crescem com o raio deles
  const tam = (e: Est) => (e.l.boss ? CHEFES[e.l.boss].raio : 0);
  const adjacente = (a: Est, b: Est) => dist(a.pos, b.pos) <= ALCANCE + tam(a) + tam(b);
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
    if (alvo.l.boss && CHEFES[alvo.l.boss].resistencias.includes(tipo)) return true;
    if (alvo.furia > 0 && (tipo === "cortante" || tipo === "perfurante" || tipo === "concussao")) return true;
    if (alvo.l.especie === "TIEFLING" && tipo === "fogo") return true;
    if (alvo.l.especie === "ANAO" && tipo === "veneno") return true;
    if (alvo.l.especie === "DRACONATO" && alvo.l.ancestralidade?.dano === tipo) return true;
    return false;
  };

  // Aplica dano: resistência, Resistência da Pedra, PV temporários, Implacável, concentração, morte.
  const aplicarDano = (fonte: Est, alvo: Est, bruto: number, tipo: TipoDano, nomeGolpe: string, res: Resultado, batida: Batida & { k: "golpe" }) => {
    let dano = bruto;
    if (alvo.itens.has("armaduraRunica") && batida.magia && tipo !== "cura") {
      dano = Math.floor(dano / 2);
      res.textos.push("RÚNICA");
    }
    if (resistente(alvo, tipo) && !fonte.itens.has("machadoFendedor")) {
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
    if (alvo.itens.has("escudoGuardiao") && dano > 0) dano = Math.max(0, dano - 2);
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
    // Elmo da Última Chance: engana a morte uma vez
    if (alvo.pv <= 0 && alvo.itens.has("elmoUltimaChance") && !alvo.itemUsado.has("elmoUltimaChance")) {
      alvo.itemUsado.add("elmoUltimaChance");
      alvo.pv = 1;
      res.textos.push("ENGANOU A MORTE!");
      log(`  ${alvo.l.nome}: o Elmo da Última Chance engana a morte, volta com 1 PV`);
      batida.especial = 3;
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
      if (versao >= 2 && alvo.l.campeao && fonte.id !== alvo.id && fonte.vivo && !fonte.l.boss) subirNaLuta(fonte, batida);
      // derrubou o chefe: sobe um nível na hora e pega o item que ele deixa cair
      if (alvo.l.boss && fonte.id !== alvo.id && fonte.vivo && !fonte.l.boss) {
        log(`  ★ ${fonte.l.nome} DERROTA O CHEFE ${alvo.l.nome.toUpperCase()}!`);
        subirNaLuta(fonte, batida, "derrotou o chefe");
        const tiposF = new Set([...fonte.itens].map(tipoDe));
        const dist_ = ehDistancia(fonte);
        const possiveis = ITEM_IDS.filter((i) => !tiposF.has(tipoDe(i)) && podeUsar(i, dist_));
        for (let k = 0; k < 40 && possiveis.length; k++) {
          const d = rng.roll(`${fonte.l.nome} · item que o chefe deixou cair (d${ITEM_IDS.length})`, 1, ITEM_IDS.length).total;
          const it = ITEM_IDS[d - 1];
          if (possiveis.includes(it)) {
            fonte.itens.add(it);
            batida.itensPegos = { id: fonte.id, itens: [it] };
            log(`  ⚑ o chefe deixa cair ${it}: fica com ${fonte.l.nome}`);
            break;
          }
        }
        batida.chefeDerrotado = true;
        batida.especial = 3;
      }
      // quem derruba o portador pega os itens dele
      if (alvo.itens.size && fonte.id !== alvo.id && fonte.vivo && !fonte.l.boss) {
        const tiposFonte = new Set([...fonte.itens].map(tipoDe));
        const pegos = [...alvo.itens].filter((it) => !tiposFonte.has(tipoDe(it)) && podeUsar(it, ehDistancia(fonte)));
        pegos.forEach((it) => fonte.itens.add(it));
        alvo.itens.clear();
        if (pegos.length) {
          batida.itensPegos = { id: fonte.id, itens: pegos };
          log(`  ⚑ ${fonte.l.nome} pega os itens de ${alvo.l.nome}: ${pegos.join(", ")}`);
        }
      }
      // Machado Ceifador: cura ao derrubar
      if (fonte.vivo && fonte.id !== alvo.id && fonte.itens.has("machadoCeifador") && fonte.pv < fonte.pvMax) {
        const r = rng.roll(`${fonte.l.nome} · Machado Ceifador (1d8)`, 1, 8);
        const antes = fonte.pv;
        fonte.pv = Math.min(fonte.pvMax, fonte.pv + r.total);
        const cura = novoRes(fonte, "cura");
        cura.cura = fonte.pv - antes;
        cura.pvDepois = fonte.pv;
        cura.textos.push("CEIFADOR");
        batida.resultados.push(cura);
        log(`  ${fonte.l.nome}: Machado Ceifador recupera ${cura.cura} PV`);
      }
    } else {
      alvo.stats.menorPv = Math.min(alvo.stats.menorPv, alvo.pv);
      // Capa das Sombras: some por 2 turnos ao chegar na metade dos PV
      if (alvo.itens.has("capaSombras") && !alvo.itemUsado.has("capaSombras") && alvo.pv <= alvo.pvMax / 2) {
        alvo.itemUsado.add("capaSombras");
        alvo.invisivel = 2;
        batida.cond.push({ id: alvo.id, add: "INV" });
        res.textos.push("INVISÍVEL!");
        log(`  ${alvo.l.nome}: a Capa das Sombras deixa invisível por 2 turnos`);
      }
      if (alvo.conc && dano > 0) {
        const cdC = Math.max(10, Math.floor(dano / 2));
        const profC = CLASSES[alvo.l.classe].salvaguardas.includes("CON") ? alvo.prof : 0;
        const s = rolarD20(alvo, `concentração (CD ${cdC})`, alvo.itens.has("elmoMente") ? 1 : 0);
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

  const subirNaLuta = (e: Est, batida: Batida & { k: "golpe" }, porque = "derrubou o campeão") => {
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
    if (cl === "BARBARO" && (e.nivel === 3 || e.nivel === 6)) e.furiaUsos++;
    if (cl === "GUERREIRO" && e.nivel === 2) e.surto = 1;
    if (cl === "PALADINO") e.curaMaos += 5;
    if (cl === "MONGE" && e.nivel >= 2) e.foco += e.nivel === 2 ? 2 : 1;
    if (cl === "CLERIGO" && e.nivel === 2) e.centelha = 1;
    e.subidas.push(sub);
    const rol = `d${sub.dado} = ${sub.rolagem} ${fmt(sub.conMod)} CON`;
    batida.subiu = { id: e.id, de: sub.de, para: sub.para, ganho: sub.pvGanho, pvDepois: e.pv, pvMax: e.pvMax, rolagem: rol };
    batida.especial = 3;
    log(`  ★ ${e.l.nome} ${porque} e SOBE DE NÍVEL na hora: NV ${sub.de} → ${sub.para}, ${rol} = +${sub.pvGanho} PV (${e.pv}/${e.pvMax})${sub.poderesNovos.length ? `, ganha ${sub.poderesNovos.map((x) => x.nome).join(", ")}` : ""}`);
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
    if (a.itens.has("arcoCacador") && alvo.pv <= alvo.pvMax / 2) v++; // Arco do Caçador
    if (a.invisivel > 0) v++; // invisível ataca com vantagem…
    if (alvo.invisivel > 0) d++; // …e é atacado com desvantagem
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
    let vant = vantagem(a, alvo, op.distancia, op.magia);
    // Capa da Miragem: o primeiro ataque contra o portador em cada rodada tem desvantagem
    if (alvo.itens.has("capaDeslocamento") && !alvo.miragem) {
      alvo.miragem = true;
      vant = vant > 0 ? 0 : -1;
    }
    if (alvo.vantagemContra) {
      alvo.vantagemContra = false;
    }
    if (a.desvantagem && !op.reacao) {
      a.desvantagem = false;
      b.cond.push({ id: a.id, del: "ZMB" });
    }
    const bonus = op.bonusAcerto + (a.itens.has("luvasPrecisas") ? 2 : 0);
    let d = rolarD20(a, `ataque (${op.nome}) contra ${alvo.l.nome}`, vant);
    let total = d.v + bonus;
    const critMin = (op.critMin ?? 20) - (a.itens.has("luvasCerteiras") ? 1 : 0);
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
    const caEfetiva = caAtual(alvo) + (alvo.itens.has("botasEsquiva") && op.distancia ? 3 : 0);
    let acertou = !falha && (critico || total >= caEfetiva);
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
      acertou = !falha && (critico || total >= caEfetiva);
    }
    // Escudo do Primeiro Golpe: bloqueia o primeiro ataque que causaria dano
    let bloqueou = false;
    if (acertou && alvo.itens.has("escudoPrimeiroGolpe") && !alvo.itemUsado.has("escudoPrimeiroGolpe")) {
      alvo.itemUsado.add("escudoPrimeiroGolpe");
      acertou = false;
      critico = false;
      bloqueou = true;
      log(`  ${alvo.l.nome}: o Escudo do Primeiro Golpe BLOQUEIA o ataque`);
    }
    const res = novoRes(alvo, critico ? "critico" : acertou ? "acerto" : falha ? "falha" : "erro");
    if (insp) res.textos.push("INSPIRAÇÃO!");
    if (bloqueou) res.textos.push("BLOQUEOU!");
    b.d20 = { v: d.v, cor: critico ? "critico" : falha ? "falha" : acertou ? "acerto" : "erro" };
    log(`  ${a.l.nome} → ${alvo.l.nome}: ${op.nome}, d20 ${d.dados.join("/")} ${fmt(bonus)} = ${total} vs CA ${caAtual(alvo)} → ${critico ? "CRÍTICO!" : acertou ? "acertou" : falha ? "FALHA (1 natural)" : "errou"}`);
    if (acertou) {
      const dn = rolarDano(a, op.nome, op.n, op.d, critico, op.gwf);
      let total2 = dn.total + op.bonusDano;
      let extraTxt = "";
      // Lâmina Rubra: +1d6 no primeiro acerto do turno
      if (a.itens.has("espadaRubra") && !a.espadaTurno) {
        a.espadaTurno = true;
        const f = rolarDano(a, "Lâmina Rubra", 1, 6, critico);
        total2 += f.total;
        extraTxt += ` + lâmina ${f.txt}=${f.total}`;
      }
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
      // itens que somam dano
      if (a.itens.has("cajadoArcano") && op.magia) {
        const f = rolarDano(a, "Cajado Arcano", 1, 6, critico);
        total2 += f.total;
        extraTxt += ` + cajado ${f.txt}=${f.total}`;
      }
      if (a.itens.has("luvasTrovao") && critico) {
        const f = rolarDano(a, "Manoplas do Trovão", 2, 8, false);
        total2 += f.total;
        extraTxt += ` + trovão ${f.txt}=${f.total}`;
      }
      if (a.itens.has("arcoChamas") && op.distancia) {
        const f = rolarDano(a, "Arco das Chamas", 1, 6, critico);
        total2 += f.total;
        extraTxt += ` + chamas ${f.txt}=${f.total}`;
      }
      if (a.itens.has("machadoBerserker") && a.pv <= a.pvMax / 2) {
        const f = rolarDano(a, "Machado da Ira", 1, 6, critico);
        total2 += f.total;
        extraTxt += ` + ira ${f.txt}=${f.total}`;
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
      const pvAntesAlvo = alvo.pv;
      aplicarDano(a, alvo, total2, op.tipo, op.rotulo ?? op.nome, res, b);
      op.extra?.(alvo, res, b);
      const causado = Math.max(0, pvAntesAlvo - alvo.pv);
      // Lâmina do Inverno: deixa lento
      if (a.itens.has("espadaGelo") && alvo.vivo && !alvo.lento) {
        alvo.lento = true;
        b.cond.push({ id: alvo.id, add: "LNT" });
      }
      // Lâmina Vampira: recupera 1d4 a cada acerto
      if (a.itens.has("espadaVampira") && a.vivo && a.pv < a.pvMax) {
        const r = rng.roll(`${a.l.nome} · Lâmina Vampira (1d4)`, 1, 4);
        const antes = a.pv;
        a.pv = Math.min(a.pvMax, a.pv + r.total);
        const cura = novoRes(a, "cura");
        cura.cura = a.pv - antes;
        cura.pvDepois = a.pv;
        cura.textos.push("VAMPIRA");
        b.resultados.push(cura);
        log(`  ${a.l.nome}: Lâmina Vampira recupera ${cura.cura} PV`);
      }
      // Cota de Espinhos: devolve 1d4 a quem acertou corpo a corpo
      if (alvo.itens.has("armaduraEspinhos") && !op.distancia && a.vivo && alvo.id !== a.id) {
        const r = rng.roll(`${alvo.l.nome} · Cota de Espinhos (1d4)`, 1, 4);
        const ret = novoRes(a, "acerto");
        ret.textos.push("ESPINHOS");
        log(`  ${a.l.nome} se fere na Cota de Espinhos de ${alvo.l.nome}: ${r.total}`);
        aplicarDano(alvo, a, r.total, "perfurante", "Cota de Espinhos", ret, b);
        b.resultados.push(ret);
      }
      // Escudo Espelhado: devolve metade do dano de magias de ataque
      if (alvo.itens.has("escudoEspelhado") && op.magia && causado > 1 && a.vivo && alvo.id !== a.id) {
        const ret = novoRes(a, "acerto");
        ret.textos.push("REFLETIU!");
        log(`  o Escudo Espelhado de ${alvo.l.nome} devolve ${Math.floor(causado / 2)} de dano a ${a.l.nome}`);
        aplicarDano(alvo, a, Math.floor(causado / 2), op.tipo, "Escudo Espelhado", ret, b);
        b.resultados.push(ret);
      }
    } else {
      if (!bloqueou) res.textos.push(falha ? "FALHA" : "ERROU");
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
      const vant = (alvo.l.especie === "GNOMO" && mental) || sentido || alvo.itens.has("elmoMente") ? 1 : 0;
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
    // o chefe não sobe tanto que a cabeça fique atrás do placar
    if (a.l.boss) pts = pts.map((q) => ({ x: q.x, y: Math.max(q.y, Y_MIN_CHEFE) }));
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
        if (!desengajar && !a.itens.has("botasLigeiras")) {
          for (const o of inimigos(a)) {
            if (!o.reacao || naoProvocou.has(o.id) || !podeCorpo(o)) continue;
            const al = ALCANCE + tam(o) + tam(a);
            if (dist(pos, o.pos) <= al && dist(q, o.pos) > al) {
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
    const todos = inimigos(a);
    if (!todos.length) return undefined;
    // ninguém mira em quem está invisível (a não ser que só sobre ele)
    const visiveis = todos.filter((o) => o.invisivel <= 0);
    const ini = visiveis.length ? visiveis : todos;
    let melhor: Est | undefined;
    let ms = Infinity;
    for (const o of ini) {
      const d = dist(a.pos, o.pos);
      let s = distancia ? o.pv * 0.6 + d * 0.02 : d / 40 + o.pv * 0.35;
      if (o.pv <= 4) s -= 3;
      // chefe: o PV enorme dele não conta contra; só a distância e o foco (todo mundo quer derrubá-lo)
      if (o.l.boss) s = (distancia ? d * 0.02 + 4 : d / 40 + 2.5) - focoChefe + rng.next() * 1.5;
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
  const livre = (a: Est, p: P) => E.every((o) => !o.vivo || o.id === a.id || dist(o.pos, p) >= SEPARACAO + tam(o) + tam(a)) && (!altarAtivo || dist(p, ALTAR) > ALTAR.r + 6);
  const pontoContato = (a: Est, alvo: Est): P | undefined => {
    let best: P | undefined;
    let bd = Infinity;
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const rc = CONTATO + tam(alvo) + tam(a);
      const p = { x: alvo.pos.x + Math.cos(ang) * rc, y: alvo.pos.y + Math.sin(ang) * rc * 0.8 };
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
  const velocidade = (a: Est) => (a.l.deslocamento - (a.lento ? 10 : 0) + (a.l.classe === "BARBARO" && a.nivel >= 5 ? 10 : 0) + (a.l.classe === "MONGE" && a.nivel >= 2 ? 10 : 0) + (a.itens.has("botasLigeiras") ? 10 : 0)) * PE;

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
    a.espadaTurno = false;
    // Cajado da Renovação: recupera um espaço de magia de 1º círculo a cada 2 rodadas
    if (a.itens.has("cajadoRenovacao") && rodada % 2 === 0) {
      const max = espacos(a.l.classe, a.nivel)[0] ?? 0;
      if (max > 0 && a.slots[0] < max) {
        a.slots[0]++;
        log(`  ${a.l.nome}: o Cajado da Renovação devolve um espaço de magia (${a.slots[0]}/${max})`);
      }
    }
    if (a.itens.has("capaCurativa") && a.pv < a.pvMax) {
      curar(a, a, "CAPA DA SEIVA", 2, "+2 PV", "cura", batidas, false);
    }
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
      // Arco Sussurrante: dispara sozinho no inimigo mais ferido
      if (a.vivo && a.itens.has("arcoSussurrante")) {
        const alvos = inimigos(a).filter((o) => o.invisivel <= 0);
        const t = alvos.sort((x, y) => x.pv - y.pv)[0];
        if (t) atacar(a, t, { nome: "ARCO SUSSURRANTE", n: 1, d: 6, bonusDano: 0, tipo: "perfurante", fx: "flecha", distancia: true, magia: false, bonusAcerto: a.prof + m(a, "DES"), rotulo: "Arco Sussurrante", especial: 0 }, batidas);
      }
      if (a.invisivel > 0) {
        a.invisivel--;
        if (a.invisivel === 0) batidas.push({ k: "estado", cond: [{ id: a.id, del: "INV" }] });
      }
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
    const perto = inimigos(a).filter((o) => dist(o.pos, a.pos) <= 44 + tam(o));
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
            if (falhou && alvo2.vivo && !(alvo2.itens.has("botasFirmes") || !!alvo2.l.boss)) {
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
                if (t.vivo && !(t.itens.has("botasFirmes") || !!t.l.boss)) {
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
                if (falhou && t.vivo && t.reacao && !(t.itens.has("botasFirmes") || !!t.l.boss)) {
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

  // ─── turno do chefe: move, usa o especial quando carregado e ataca várias vezes ───
  const jogarTurnoChefe = (a: Est, rodada: number) => {
    const c = CHEFES[a.l.boss!];
    const batidas: Batida[] = [];
    turnoAtual = { rodada, ator: a.id, batidas, log: [] };
    log(`[R${rodada}] Turno do chefe ${a.l.nome} (${a.pv}/${a.pvMax} PV)`);
    a.reacao = true;
    if (!a.especialPronto) {
      const r = rng.roll(`${a.l.nome} · recarga de ${c.especial.nome} (d6 ≥ ${c.recarga})`, 1, 6);
      if (r.total >= c.recarga) {
        a.especialPronto = true;
        log(`  ${c.especial.nome} recarregado`);
      }
    }
    const fim = () => {
      if (a.lento) {
        a.lento = false;
        batidas.push({ k: "estado", cond: [{ id: a.id, del: "LNT" }] });
      }
      if (a.desvantagem) {
        a.desvantagem = false;
        batidas.push({ k: "estado", cond: [{ id: a.id, del: "ZMB" }] });
      }
      turnos.push(turnoAtual);
    };
    const ini = inimigos(a);
    if (!ini.length) return fim();
    const score = (o: Est) => dist(a.pos, o.pos) / 40 + o.pv * 0.12 - (o.l.campeao ? 1.5 : 0);
    let alvo = ini.reduce((m, o) => (score(o) < score(m) ? o : m), ini[0]);
    const vel = velocidade(a);
    const op = (q: AtaqueChefe, extra?: Partial<OpAtaque>): OpAtaque => ({ nome: q.nome, n: q.n, d: q.d, bonusDano: q.bonus, tipo: q.tipo, fx: q.fx, distancia: false, magia: false, bonusAcerto: q.acerto, rotulo: q.nome, ...extra });
    const irAte = (t: Est, alcance = vel) => {
      const ponto = adjacente(a, t) ? a.pos : pontoContato(a, t);
      if (!ponto) return;
      mover(a, cortar(caminho(a.pos, ponto), alcance), batidas, false, alcance > vel, c.voa);
    };
    const esp = c.especial;
    if (a.especialPronto) {
      if (esp.k === "sopro") {
        const cone = (centro: Est) => inimigos(a).filter((o) => dist(a.pos, o.pos) <= esp.alcance + c.raio && angulo(a.pos, centro.pos, o.pos) < Math.PI / 4);
        // escolhe o alvo que põe mais gente no cone
        const melhor = ini.reduce((m, o) => (cone(o).length > cone(m).length ? o : m), alvo);
        if (dist(a.pos, melhor.pos) > esp.alcance * 0.7 + c.raio) {
          const d = dist(a.pos, melhor.pos) - esp.alcance * 0.6 - c.raio;
          mover(a, cortar(caminho(a.pos, melhor.pos), Math.min(vel, Math.max(0, d))), batidas, false, false, c.voa);
          if (!a.vivo) return fim();
        }
        const alvos = cone(melhor);
        if (alvos.length >= 2 || (alvos.length === 1 && ini.length <= 3)) {
          a.especialPronto = false;
          salvaguarda(a, alvos, { nome: esp.nome, n: esp.n, d: esp.d, tipo: esp.tipo, fx: "sopro", atributo: "DES", metade: true, especial: 3, cdOverride: esp.cd }, batidas);
          return fim();
        }
      } else if (esp.k === "pedra") {
        const longe = ini.filter((o) => dist(a.pos, o.pos) > 90).sort((x, y) => x.pv - y.pv)[0];
        if (longe) {
          a.especialPronto = false;
          atacar(a, longe, { nome: esp.nome, n: esp.n, d: esp.d, bonusDano: esp.bonus, tipo: "concussao", fx: "orbe", distancia: true, magia: false, bonusAcerto: esp.acerto, rotulo: esp.nome, especial: 1 }, batidas);
          return fim();
        }
      } else if (esp.k === "rasante") {
        const presa = ini.slice().sort((x, y) => x.pv - y.pv)[0];
        a.especialPronto = false;
        const ponto = pontoContato(a, presa);
        if (ponto) mover(a, [a.pos, ponto], batidas, false, true, true);
        if (!a.vivo) return fim();
        if (adjacente(a, presa)) {
          for (const q of c.ataques) {
            if (!presa.vivo) break;
            presa.vantagemContra = true;
            atacar(a, presa, op(q, { nome: esp.nome, especial: 1 }), batidas);
          }
        }
        return fim();
      } else if (esp.k === "investida") {
        if (dist(a.pos, alvo.pos) > 60) {
          a.especialPronto = false;
          irAte(alvo, vel * 2);
          if (!a.vivo) return fim();
          if (adjacente(a, alvo)) {
            const q = c.ataques[1] ?? c.ataques[0];
            atacar(
              a,
              alvo,
              op(q, {
                nome: esp.nome,
                n: q.n + esp.extraN,
                especial: 1,
                extra: (t, res) => {
                  if (t.vivo && !t.itens.has("botasFirmes")) {
                    const ang = Math.atan2(t.pos.y - a.pos.y, t.pos.x - a.pos.x);
                    const np = clampP({ x: t.pos.x + Math.cos(ang) * 40, y: t.pos.y + Math.sin(ang) * 40 });
                    t.pos = np;
                    res.novaPos = np;
                  }
                },
              }),
              batidas,
            );
          }
          return fim();
        }
      } else if (esp.k === "cabecas") {
        const perto = ini.filter((o) => adjacente(a, o) || dist(a.pos, o.pos) <= ALCANCE + c.raio + 20);
        if (perto.length >= 2) {
          a.especialPronto = false;
          for (const t of perto.slice(0, 5)) if (t.vivo) atacar(a, t, op(c.ataques[0], { nome: esp.nome, especial: 1 }), batidas);
          return fim();
        }
      }
    }
    // ataque normal: chega no alvo e ataca várias vezes (cada ataque no inimigo colado mais conveniente)
    irAte(alvo);
    if (!a.vivo) return fim();
    if (!adjacente(a, alvo)) {
      const colado = ameacas(a)[0];
      if (!colado) return fim();
      alvo = colado;
    }
    c.ataques.forEach((q, k) => {
      const colados = ameacas(a);
      if (!colados.length) return;
      // a hidra espalha as mordidas; os outros insistem no mesmo alvo enquanto ele estiver de pé
      const t = a.l.boss === "HIDRA" ? colados[k % colados.length] : alvo.vivo && adjacente(a, alvo) ? alvo : colados[0];
      atacar(a, t, op(q), batidas);
    });
    return fim();
  };

  // ─── laço de rodadas ───
  let rodada = 0;
  while (vivos().length > 1 && rodada < 80) {
    rodada++;
    E.forEach((e) => (e.miragem = false));
    // o chefe age duas vezes por rodada: na sua iniciativa e de novo no meio da rodada
    const chefe = E.find((e) => e.l.boss);
    for (const [idx, ini] of iniciativa.entries()) {
      if (chefe && chefe.vivo && idx === Math.floor(iniciativa.length / 2) && vivos().length > 1) jogarTurnoChefe(chefe, rodada);
      const a = E[ini.id];
      if (!a.vivo) continue;
      if (vivos().length <= 1) break;
      turnoSeguro(() => (a.l.boss ? jogarTurnoChefe(a, rodada) : jogarTurno(a, rodada)));
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
    evolucao: E.map((e) => ({ nivel: e.nivel, pvMax: e.pvMax, atributos: e.at, pvRolagens: e.pvRolagens, subidas: e.subidas, itens: [...e.itens] })),
  };
};
