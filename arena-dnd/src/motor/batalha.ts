// Simulador de combate "todos contra todos" com as regras do SRD 5.2 (nível 5).
// Cada rolagem acontece de verdade (dados com semente) e vira um evento com tempo
// em quadros (30 fps) para o vídeo. O mesmo resultado sai no log da ficha.

import { Atributo, CLASSES, COR_DANO, MAGIAS, Magia, TipoDano } from "./srd";
import { dadosTruque, magiasDe, profDe } from "./niveis";
import { criarRng, d, d20, embaralhar, mod, Rng, rolar, sinal } from "./dados";
import { Ficha } from "./personagem";

// ---------- eventos do vídeo ----------
export type Ev =
  | { k: "mov"; id: number; t0: number; t1: number; x0: number; y0: number; x1: number; y1: number; salto?: boolean }
  | { k: "pv"; id: number; t: number; pv: number }
  | { k: "anim"; id: number; t: number; tipo: "ataque" | "magia" | "dano" | "cura" | "esquiva"; dx?: number; dy?: number }
  | { k: "rotulo"; id: number; t: number; dur: number; texto: string; cor: string }
  | { k: "dado"; id: number; t: number; valor: number; total: number; cor: string; lados?: number }
  | { k: "numero"; id: number; t: number; texto: string; cor: string; grande?: boolean }
  | { k: "fx"; t: number; dur: number; tipo: string; x0: number; y0: number; x1: number; y1: number; cor: string; raio?: number; n?: number; de?: number; para?: number } // de/para: o efeito acompanha o personagem na tela
  | { k: "aura"; id: number; t0: number; t1: number; raio: number; cor: string; tipo: string }
  | { k: "status"; id: number; t0: number; t1: number; texto: string; cor: string }
  | { k: "banner"; t: number; dur: number; texto: string; cor: string }
  | { k: "som"; t: number; arquivo: string; vol: number }
  | { k: "morte"; id: number; t: number }
  | { k: "turno"; id: number; t: number; rodada: number }
  | { k: "tremor"; t: number; forca: number }
  // golpe especial: congela a ação e mostra o rosto (o episódio escolhe quais viram cut-in)
  | { k: "cutin"; id: number; t: number; texto: string; sub: string; cor: string; prio: number }
  | { k: "duelo"; t: number; ids: [number, number] };

export type Resultado = {
  semente: number;
  fichas: Ficha[];
  iniciativa: { id: number; d20: number; total: number }[];
  posIniciais: { id: number; x: number; y: number }[];
  eventos: Ev[];
  log: string[];
  vencedor: number;
  fimBatalha: number; // quadro em que o último cai
  rodadas: number;
  abates: Record<number, number>;
  danoCausado: Record<number, number>;
};

export const INTRO = 150; // quadros antes do "LUTEM!" (5 s)
export const RAIO_ARENA = 53; // pés (o desenho converte para pixels)

// ---------- estado de cada lutador ----------
type Lutador = {
  f: Ficha;
  id: number;
  x: number;
  y: number;
  pv: number;
  pvMax: number;
  temp: number;
  vivo: boolean;
  espacos: [number, number, number];
  // condições e recursos
  furia: boolean;
  usosFuria: number;
  descuidadoAte: number; // índice de turno global: ataques contra ele têm vantagem
  atordoadoAte: number;
  guiado: boolean; // Raio Guia: próximo ataque contra ele tem vantagem
  zombado: boolean; // Zombaria Viciosa: desvantagem no próximo ataque
  escudoAte: number; // magia Escudo (+5 CA) até o próximo turno dele
  esquivaRodada: number; // Esquiva Sobrenatural (ladino)
  conc?: { magia: Magia; circulo: number; alvo?: number; x?: number; y?: number; desde: number };
  marcaAlvo?: number; // Bruxaria / Marca do Caçador
  surto: number;
  folego: number;
  curaMaos: number;
  foco: number;
  sopro: number;
  pedra: number;
  implacavel: boolean;
  repreensao: boolean;
  inspiracao: boolean;
  adrenalina: number;
  centelha: boolean;
  vexAlvo?: number; // Maestria "Irritar" (ladino): vantagem no próximo ataque contra esse alvo
  lentoAte: number;
};

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const ALCANCE_CORPO = 6.5; // pés entre centros para "adjacente" (visual)
const VEL = 2.2; // pés por quadro na animação de andar

export const simular = (fichas: Ficha[], semente: number): Resultado => {
  const rng: Rng = criarRng(semente ^ 0x9e3779b9);
  const ev: Ev[] = [];
  const log: string[] = [];
  const abates: Record<number, number> = {};
  const danoCausado: Record<number, number> = {};
  const som = (t: number, arquivo: string, vol = 1) => ev.push({ k: "som", t, arquivo, vol });

  // posições iniciais em círculo (ordem embaralhada)
  const ordemRoda = embaralhar(rng, fichas.map((f) => f.id));
  const L: Lutador[] = fichas.map((f) => {
    const i = ordemRoda.indexOf(f.id);
    const ang = -Math.PI / 2 + (i / fichas.length) * Math.PI * 2;
    return {
      f,
      id: f.id,
      x: Math.cos(ang) * (i % 2 ? 36 : 47),
      y: Math.sin(ang) * (i % 2 ? 36 : 47),
      pv: f.pv,
      pvMax: f.pv,
      temp: 0,
      vivo: true,
      espacos: [...f.espacos] as [number, number, number],
      furia: false,
      usosFuria: f.nivel >= 3 ? 3 : 2,
      descuidadoAte: -1,
      atordoadoAte: -1,
      guiado: false,
      zombado: false,
      escudoAte: -1,
      esquivaRodada: -1,
      surto: f.classe === "guerreiro" && f.nivel >= 2 ? 1 : 0,
      folego: f.classe === "guerreiro" ? 2 : 0,
      curaMaos: f.classe === "paladino" ? 5 * f.nivel : 0,
      foco: f.classe === "monge" && f.nivel >= 2 ? f.nivel : 0,
      sopro: f.especie === "draconato" ? profDe(f.nivel) : 0,
      pedra: f.especie === "golias" ? profDe(f.nivel) : 0,
      implacavel: f.especie === "orc",
      repreensao: f.especie === "tiefling" && f.nivel >= 3,
      inspiracao: f.especie === "humano",
      adrenalina: f.especie === "orc" ? profDe(f.nivel) : 0,
      centelha: f.classe === "clerigo" && f.nivel >= 2,
      lentoAte: -1,
    };
  });
  // o mago já entra com Armadura Arcana (gasta um espaço de 1º círculo)
  for (const l of L) if (l.f.classe === "mago") l.espacos[0]--;
  const posIniciais = L.map((l) => ({ id: l.id, x: l.x, y: l.y }));
  const porId = (id: number) => L.find((l) => l.id === id)!;
  const vivos = () => L.filter((l) => l.vivo);
  const m = (l: Lutador, a: Atributo) => mod(l.f.atributos[a]);

  // ---------- iniciativa: d20 + DES ----------
  const iniciativa = L.map((l) => {
    const r = d(rng, 20);
    return { id: l.id, d20: r, total: r + m(l, "DES") };
  }).sort((a, b) => b.total - a.total || m(porId(b.id), "DES") - m(porId(a.id), "DES") || a.id - b.id);
  log.push(`Iniciativa (d20+DES): ${iniciativa.map((i) => `${porId(i.id).f.nome} ${i.d20}${sinal(m(porId(i.id), "DES"))}=${i.total}`).join(", ")}`);

  let t = INTRO;
  let duelo = false;
  let turnoGlobal = 0;
  let rodada = 0;

  // ---------- utilidades de regra ----------
  const resistente = (alvo: Lutador, tipo: TipoDano) =>
    (alvo.furia && (tipo === "cortante" || tipo === "perfurante" || tipo === "concussão")) ||
    (alvo.f.especie === "tiefling" && tipo === "fogo") ||
    (alvo.f.especie === "anao" && tipo === "veneno") ||
    (alvo.f.especie === "draconato" && alvo.f.dragao?.tipo === tipo);

  const salvaguarda = (alvo: Lutador, atr: Atributo, cd: number) => {
    const atordoado = alvo.atordoadoAte >= turnoGlobal && (atr === "FOR" || atr === "DES");
    if (atordoado) return { passou: false, dado: 1, total: 0, auto: true };
    const vant = alvo.f.especie === "gnomo" && (atr === "INT" || atr === "SAB" || atr === "CAR");
    let r = d20(rng, vant ? "vantagem" : "normal").valor;
    if (r === 1 && alvo.f.especie === "halfling") r = d(rng, 20); // Sortudo
    const prof = CLASSES[alvo.f.classe].salvaguardas.includes(atr) ? profDe(alvo.f.nivel) : 0;
    const total = r + m(alvo, atr) + prof;
    return { passou: total >= cd, dado: r, total, auto: false };
  };


  // aplica dano já rolado; devolve o dano final
  const causarDano = (fonte: Lutador | null, alvo: Lutador, bruto: number, tipo: TipoDano, tq: number, critico = false, ataque = false): number => {
    if (!alvo.vivo) return 0;
    let dano = bruto;
    if (resistente(alvo, tipo)) dano = Math.floor(dano / 2);
    // Esquiva Sobrenatural (ladino): metade do dano de um ataque por rodada
    if (ataque && alvo.f.classe === "ladino" && alvo.f.nivel >= 5 && alvo.esquivaRodada !== rodada && dano >= 6 && alvo.atordoadoAte < turnoGlobal) {
      alvo.esquivaRodada = rodada;
      dano = Math.floor(dano / 2);
      ev.push({ k: "rotulo", id: alvo.id, t: tq, dur: 30, texto: "ESQUIVA SOBRENATURAL", cor: "#9aa3b5" });
    }
    // Defletir Ataques (monge): reação, reduz 1d10 + DES + nível de dano cortante/perfurante/concussão
    if (ataque && alvo.f.classe === "monge" && alvo.f.nivel >= 3 && alvo.esquivaRodada !== rodada && dano >= 8 && (tipo === "cortante" || tipo === "perfurante" || tipo === "concussão") && alvo.atordoadoAte < turnoGlobal) {
      alvo.esquivaRodada = rodada;
      const red = d(rng, 10) + m(alvo, "DES") + alvo.f.nivel;
      dano = Math.max(0, dano - red);
      ev.push({ k: "rotulo", id: alvo.id, t: tq, dur: 30, texto: "DEFLETIR ATAQUES", cor: "#51a5c5" });
      log.push(`   ${alvo.f.nome} deflete o ataque: −${red}`);
    }
    // Resistência da Pedra (golias): reduz 1d12+CON
    if (alvo.pedra > 0 && dano >= 10) {
      alvo.pedra--;
      const red = d(rng, 12) + m(alvo, "CON");
      dano = Math.max(0, dano - red);
      ev.push({ k: "rotulo", id: alvo.id, t: tq, dur: 30, texto: `PELE DE PEDRA −${red}`, cor: "#b0aaa0" });
      log.push(`   ${alvo.f.nome} usa Resistência da Pedra: −${red}`);
    }
    // PV temporários absorvem primeiro
    const absorvido = Math.min(alvo.temp, dano);
    alvo.temp -= absorvido;
    const real = dano - absorvido;
    alvo.pv = Math.max(0, alvo.pv - real);
    if (fonte) danoCausado[fonte.id] = (danoCausado[fonte.id] ?? 0) + dano;
    ev.push({ k: "numero", id: alvo.id, t: tq, texto: `-${dano}`, cor: critico ? "#ffd84a" : COR_DANO[tipo] === "#c8ccd4" ? "#ffffff" : COR_DANO[tipo], grande: critico || dano >= 20 });
    ev.push({ k: "anim", id: alvo.id, t: tq, tipo: "dano", dx: fonte ? Math.sign(alvo.x - fonte.x) : 0 });
    ev.push({ k: "pv", id: alvo.id, t: tq, pv: alvo.pv });
    som(tq, critico ? "critico.wav" : dano >= 20 ? "impacto-forte.wav" : "impacto.wav", critico ? 0.9 : 0.6);

    if (alvo.pv <= 0) {
      if (alvo.implacavel) {
        alvo.implacavel = false;
        alvo.pv = 1;
        ev.push({ k: "pv", id: alvo.id, t: tq + 8, pv: 1 });
        ev.push({ k: "rotulo", id: alvo.id, t: tq + 6, dur: 36, texto: "RESISTÊNCIA IMPLACÁVEL", cor: "#8aa871" });
        som(tq + 6, "buff.wav", 0.6);
        log.push(`   ${alvo.f.nome} cairia, mas a Resistência Implacável o deixa com 1 PV!`);
      } else {
        alvo.vivo = false;
        alvo.conc = undefined;
        ev.push({ k: "morte", id: alvo.id, t: tq + 4 });
        ev.push({ k: "banner", t: tq + 10, dur: 50, texto: `${alvo.f.nome.toUpperCase()} CAIU!`, cor: "#b33a32" });
        som(tq + 4, "derrota.wav", 0.8);
        if (fonte && fonte.id !== alvo.id) abates[fonte.id] = (abates[fonte.id] ?? 0) + 1;
        log.push(`   ☠ ${alvo.f.nome} cai!${fonte ? ` (abatido por ${fonte.f.nome})` : ""}`);
        if (vivos().length === 2 && !duelo) {
          duelo = true;
          const [a, b] = vivos();
          ev.push({ k: "duelo", t: tq + 30, ids: [a.id, b.id] });
          log.push(`   ⚔ DUELO FINAL: ${a.f.nome} × ${b.f.nome}`);
        }
        return dano;
      }
    }
    // Concentração: CON contra CD 10 ou metade do dano
    if (alvo.conc && dano > 0) {
      const cd = Math.max(10, Math.floor(dano / 2));
      const s = salvaguarda(alvo, "CON", cd);
      if (!s.passou) {
        log.push(`   ${alvo.f.nome} perde a concentração em ${alvo.conc.magia.nome} (CON ${s.total} vs CD ${cd})`);
        ev.push({ k: "rotulo", id: alvo.id, t: tq + 4, dur: 28, texto: "PERDEU CONCENTRAÇÃO", cor: "#9aa3b5" });
        encerrarConc(alvo, tq + 4);
      }
    }
    // Repreensão Infernal (tiefling): reação quando sofre dano de alguém
    if (alvo.repreensao && fonte && fonte.vivo && fonte.id !== alvo.id && dano > 0) {
      alvo.repreensao = false;
      const r = rolar(rng, "2d10");
      const cd = 8 + profDe(alvo.f.nivel) + m(alvo, "CAR");
      const s = salvaguarda(fonte, "DES", cd);
      const final = s.passou ? Math.floor(r.total / 2) : r.total;
      ev.push({ k: "rotulo", id: alvo.id, t: tq + 8, dur: 34, texto: "REPREENSÃO INFERNAL", cor: COR_DANO.fogo });
      ev.push({ k: "fx", t: tq + 10, dur: 16, tipo: "coluna", x0: fonte.x, y0: fonte.y, x1: fonte.x, y1: fonte.y, cor: COR_DANO.fogo, raio: 5, para: fonte.id });
      som(tq + 10, "fogo.wav", 0.7);
      log.push(`   ${alvo.f.nome} reage com Repreensão Infernal: ${r.expr} [${r.dados.join(",")}] = ${r.total}; ${fonte.f.nome} DES ${s.total} vs CD ${cd} → ${final}`);
      causarDano(alvo, fonte, final, "fogo", tq + 16);
    }
    return dano;
  };

  const encerrarConc = (l: Lutador, tq: number) => {
    if (!l.conc) return;
    const auras = ev.filter((e): e is Extract<Ev, { k: "aura" }> => e.k === "aura" && e.id === l.id && e.t1 > tq);
    for (const a of auras) a.t1 = tq;
    const st = ev.filter((e): e is Extract<Ev, { k: "status" }> => e.k === "status" && e.t1 > tq && e.texto === "MARCA" && l.marcaAlvo === e.id);
    for (const s of st) s.t1 = tq;
    l.conc = undefined;
    l.marcaAlvo = undefined;
  };

  const curar = (l: Lutador, alvo: Lutador, qtd: number, tq: number, nome: string) => {
    const antes = alvo.pv;
    alvo.pv = Math.min(alvo.pvMax, alvo.pv + qtd);
    ev.push({ k: "numero", id: alvo.id, t: tq, texto: `+${alvo.pv - antes}`, cor: COR_DANO.cura });
    ev.push({ k: "anim", id: alvo.id, t: tq, tipo: "cura" });
    ev.push({ k: "fx", t: tq - 4, dur: 24, tipo: "cura", x0: alvo.x, y0: alvo.y, x1: alvo.x, y1: alvo.y, cor: COR_DANO.cura, para: alvo.id });
    ev.push({ k: "pv", id: alvo.id, t: tq, pv: alvo.pv });
    som(tq - 4, "cura.wav", 0.7);
    log.push(`   ${l.f.nome} usa ${nome} e recupera ${alvo.pv - antes} PV (${alvo.pv}/${alvo.pvMax})`);
  };

  // ---------- movimento ----------
  const limitar = (x: number, y: number) => {
    const r = Math.hypot(x, y);
    const max = RAIO_ARENA - 3;
    return r > max ? { x: (x / r) * max, y: (y / r) * max } : { x, y };
  };
  // evita parar em cima de outro lutador
  const afastar = (eu: Lutador, x: number, y: number) => {
    for (let it = 0; it < 6; it++) {
      let mx = 0,
        my = 0;
      for (const o of vivos()) {
        if (o.id === eu.id) continue;
        const dd = Math.hypot(x - o.x, y - o.y);
        if (dd < 5.5) {
          const ang = dd < 0.01 ? rng() * Math.PI * 2 : Math.atan2(y - o.y, x - o.x);
          mx += Math.cos(ang) * (5.6 - dd);
          my += Math.sin(ang) * (5.6 - dd);
        }
      }
      if (!mx && !my) break;
      x += mx;
      y += my;
      ({ x, y } = limitar(x, y));
    }
    return { x, y };
  };
  const mover = (l: Lutador, alvoX: number, alvoY: number, maxPes: number, t0: number, salto = false) => {
    const dx = alvoX - l.x,
      dy = alvoY - l.y;
    const dd = Math.hypot(dx, dy);
    if (dd < 0.5) return t0;
    const passo = Math.min(dd, maxPes);
    let { x, y } = limitar(l.x + (dx / dd) * passo, l.y + (dy / dd) * passo);
    ({ x, y } = afastar(l, x, y));
    const dur = Math.max(5, Math.round(Math.hypot(x - l.x, y - l.y) / VEL));
    ev.push({ k: "mov", id: l.id, t0, t1: t0 + dur, x0: l.x, y0: l.y, x1: x, y1: y, salto });
    l.x = x;
    l.y = y;
    return t0 + dur;
  };
  const empurrar = (alvo: Lutador, de: { x: number; y: number }, pes: number, tq: number) => {
    const ang = Math.atan2(alvo.y - de.y, alvo.x - de.x);
    let { x, y } = limitar(alvo.x + Math.cos(ang) * pes, alvo.y + Math.sin(ang) * pes);
    ({ x, y } = afastar(alvo, x, y));
    ev.push({ k: "mov", id: alvo.id, t0: tq, t1: tq + 6, x0: alvo.x, y0: alvo.y, x1: x, y1: y });
    alvo.x = x;
    alvo.y = y;
  };

  // ---------- ataque com arma ou magia de ataque ----------
  type OpAtaque = {
    bonus: number;
    dano: string;
    modDano: number;
    tipo: TipoDano;
    distancia: boolean;
    arma: boolean;
    gwf?: boolean;
    efeito?: string;
    cor?: string;
  };
  const modoAtaque = (l: Lutador, alvo: Lutador, op: OpAtaque, extraVant = false) => {
    let v = extraVant ? 1 : 0;
    let dv = 0;
    if (l.furia && l.f.nivel >= 2 && op.arma && !op.distancia) v++; // Ataque Descuidado (nível 2)
    if (alvo.descuidadoAte >= turnoGlobal) v++;
    if (alvo.atordoadoAte >= turnoGlobal) v++;
    if (alvo.guiado) v++;
    if (l.vexAlvo === alvo.id && op.arma) v++;
    if (l.zombado) dv++;
    if (op.distancia && vivos().some((o) => o.id !== l.id && dist(o, l) <= ALCANCE_CORPO)) dv++;
    return v && !dv ? "vantagem" : dv && !v ? "desvantagem" : "normal";
  };

  // devolve true se acertou
  const atacar = (l: Lutador, alvo: Lutador, op: OpAtaque, ta: number, rotulo?: string, vantExtra = false, sneakDisponivel = { usado: false }) => {
    const modo = modoAtaque(l, alvo, op, vantExtra);
    if (alvo.guiado) alvo.guiado = false;
    if (l.zombado) l.zombado = false;
    let rol = d20(rng, modo);
    let nat = rol.valor;
    if (nat === 1 && l.f.especie === "halfling") {
      nat = d(rng, 20);
      log.push(`   (Sortudo: ${l.f.nome} rerrola o 1 → ${nat})`);
    }
    let total = nat + op.bonus;
    let caAlvo = alvo.f.ca + (alvo.escudoAte >= turnoGlobal ? 5 : 0);
    const minCrit = l.f.classe === "guerreiro" && l.f.nivel >= 3 && op.arma ? 19 : 20; // Crítico Aprimorado
    let acertou = nat >= minCrit || (nat !== 1 && total >= caAlvo);
    // Inspiração Heroica (humano): rerrola um ataque que errou
    if (!acertou && l.inspiracao && nat !== 1) {
      l.inspiracao = false;
      rol = d20(rng, "normal");
      nat = rol.valor;
      total = nat + op.bonus;
      acertou = nat >= minCrit || (nat !== 1 && total >= caAlvo);
      log.push(`   (Inspiração Heroica: rerrola → ${nat})`);
    }
    // Escudo (reação de mago/feiticeiro): +5 CA se isso transformar acerto em erro
    if (acertou && nat < minCrit && (alvo.f.classe === "mago" || alvo.f.classe === "feiticeiro") && alvo.espacos[0] > 0 && total < caAlvo + 5 && alvo.escudoAte < turnoGlobal) {
      alvo.espacos[0]--;
      alvo.escudoAte = turnoGlobal + vivos().length; // até o próximo turno dele (aprox.)
      caAlvo += 5;
      acertou = false;
      ev.push({ k: "rotulo", id: alvo.id, t: ta + 6, dur: 28, texto: "ESCUDO", cor: "#9fd8ff" });
      ev.push({ k: "fx", t: ta + 6, dur: 14, tipo: "escudo", x0: alvo.x, y0: alvo.y, x1: alvo.x, y1: alvo.y, cor: "#9fd8ff", para: alvo.id });
      som(ta + 6, "escudo.wav", 0.7);
      log.push(`   ${alvo.f.nome} conjura Escudo (+5 CA)!`);
    }
    const critico = nat >= minCrit;
    if (critico) ev.push({ k: "cutin", id: l.id, t: ta - 1, texto: rotulo ?? l.f.arma.nome.toUpperCase(), sub: `${nat} NATURAL · CRÍTICO!`, cor: "#ffd84a", prio: 3 });
    const cor = critico ? "#ffd84a" : nat === 1 ? "#d94a3a" : acertou ? "#7fe08a" : "#9aa3b5";
    ev.push({ k: "dado", id: l.id, t: ta, valor: nat, total, cor });
    if (rotulo) ev.push({ k: "rotulo", id: l.id, t: ta - 2, dur: 30, texto: rotulo, cor: op.cor ?? COR_DANO[op.tipo] });
    // animação do golpe / projétil
    const dx = alvo.x - l.x,
      dy = alvo.y - l.y;
    ev.push({ k: "anim", id: l.id, t: ta, tipo: op.arma ? "ataque" : "magia", dx: Math.sign(dx) || 1, dy: Math.sign(dy) });
    let tq = ta + 5;
    if (op.distancia || op.efeito) {
      const viagem = op.efeito === "toque" ? 6 : Math.max(5, Math.round(dist(l, alvo) / 7));
      const tipoFx = op.efeito ?? (op.arma ? "flecha" : "projetil");
      ev.push({ k: "fx", t: ta + 3, dur: viagem, tipo: tipoFx, x0: l.x, y0: l.y, x1: alvo.x + (acertou ? 0 : (rng() - 0.5) * 10), y1: alvo.y + (acertou ? 0 : (rng() - 0.5) * 10), cor: op.cor ?? COR_DANO[op.tipo], de: l.id, para: acertou ? alvo.id : undefined });
      som(ta + 2, op.arma ? "flecha.wav" : op.tipo === "fogo" ? "fogo.wav" : "magia.wav", 0.6);
      tq = ta + 3 + viagem;
    } else {
      ev.push({ k: "fx", t: tq - 2, dur: 8, tipo: "corte", x0: l.x, y0: l.y, x1: alvo.x, y1: alvo.y, cor: "#ffffff", de: l.id, para: alvo.id });
      som(ta + 1, "golpe.wav", 0.6);
    }
    const desc = `d20${modo !== "normal" ? ` (${modo}: ${rol.dados.join("/")})` : ""} ${nat}${sinal(op.bonus)}=${total} vs CA ${caAlvo}`;
    if (!acertou) {
      ev.push({ k: "numero", id: alvo.id, t: tq, texto: nat === 1 ? "FALHA!" : "ERROU", cor: "#c9ced6" });
      ev.push({ k: "anim", id: alvo.id, t: tq - 2, tipo: "esquiva", dx: Math.sign(dx) || 1 });
      som(tq, "erro.wav", 0.5);
      log.push(`   ${l.f.nome} → ${alvo.f.nome}: ${desc} → ${nat === 1 ? "falha crítica" : "erra"}`);
      return { acertou: false, tq };
    }
    if (critico) {
      ev.push({ k: "rotulo", id: l.id, t: ta + 2, dur: 30, texto: "CRÍTICO!", cor: "#ffd84a" });
      ev.push({ k: "tremor", t: tq, forca: 3 });
    }
    // dano: dados (dobrados no crítico) + modificador
    let r = rolar(rng, op.dano, critico);
    let dadosSoma = r.total;
    if (op.gwf) {
      const lados = Number(op.dano.split("d")[1].replace(/\D.*/, ""));
      dadosSoma = r.dados.map((x) => (x <= 2 ? 3 : x)).reduce((a, b) => a + b, 0) + r.bonus;
      void lados;
    }
    let total2 = dadosSoma + op.modDano;
    const partes = [`${r.expr}[${r.dados.join(",")}]${op.gwf ? "(GWF)" : ""}${op.modDano ? sinal(op.modDano) : ""}`];
    // Fúria +2
    if (l.furia && op.arma && !op.distancia) {
      total2 += 2;
      partes.push("+2 fúria");
    }
    // Bruxaria / Marca do Caçador +1d6
    if (l.marcaAlvo === alvo.id && l.conc) {
      const e = rolar(rng, "1d6", critico);
      total2 += e.total;
      partes.push(`+${e.expr}[${e.dados.join(",")}] marca`);
    }
    // Ataque Furtivo (ladino): 3d6 se tiver vantagem, 1×/turno
    if (l.f.classe === "ladino" && !sneakDisponivel.usado && modo === "vantagem") {
      sneakDisponivel.usado = true;
      const e = rolar(rng, `${Math.ceil(l.f.nivel / 2)}d6`, critico);
      total2 += e.total;
      partes.push(`+${e.expr}[${e.dados.join(",")}] furtivo`);
      ev.push({ k: "rotulo", id: l.id, t: ta + 4, dur: 30, texto: "ATAQUE FURTIVO", cor: "#c8ccd4" });
    }
    log.push(`   ${l.f.nome} → ${alvo.f.nome}: ${desc} → ${critico ? "CRÍTICO! " : "acerta, "}${partes.join(" ")} = ${total2} ${op.tipo}`);
    causarDano(l, alvo, total2, op.tipo, tq, critico, true);
    if (op.arma) l.vexAlvo = l.f.classe === "ladino" && ["rapieira", "espadaCurta", "arcoCurto"].includes(l.f.armaId) ? alvo.id : undefined;
    if (!alvo.vivo && !critico) ev.push({ k: "cutin", id: l.id, t: ta - 1, texto: rotulo ?? (op.arma ? l.f.arma.nome.toUpperCase() : "GOLPE FINAL"), sub: `${total2} DE DANO · GOLPE FINAL`, cor: op.cor ?? COR_DANO[op.tipo], prio: 2 });
    return { acertou: true, tq, critico };
  };

  // ---------- magias de salvaguarda em área ----------
  const alvosArea = (cx: number, cy: number, raio: number, excluir: number) =>
    vivos().filter((o) => o.id !== excluir && Math.hypot(o.x - cx, o.y - cy) <= raio + 2.5);

  // dados de dano da magia: truques escalam com o nível do personagem; magias, com o círculo usado
  const exprMagia = (l: Lutador, magia: Magia, circulo: number) => {
    if (!magia.dano) return "0d1";
    if (magia.nivel === 0 && magia.id !== "rajadaMistica") {
      const [q, resto] = magia.dano.split("d");
      return `${Number(q) * dadosTruque(l.f.nivel)}d${resto}`;
    }
    const extra = magia.porCirculo && circulo > magia.nivel ? circulo - magia.nivel : 0;
    return extra ? somarDados(magia.dano, magia.porCirculo!, extra) : magia.dano;
  };

  const magiaSalva = (l: Lutador, magia: Magia, circulo: number, alvos: Lutador[], cx: number, cy: number, ta: number, rotulo = true) => {
    const cd = l.f.cd!;
    const expr = exprMagia(l, magia, circulo);
    const r = rolar(rng, expr);
    if (rotulo) ev.push({ k: "rotulo", id: l.id, t: ta - 2, dur: 34, texto: magia.nome.toUpperCase(), cor: COR_DANO[magia.tipo!] });
    const vivosAntes = alvos.filter((a) => a.vivo).length;
    if (vivosAntes >= 2 || magia.id === "sopro") ev.push({ k: "cutin", id: l.id, t: ta - 1, texto: magia.nome.toUpperCase(), sub: `${r.expr} = ${r.total}`, cor: COR_DANO[magia.tipo!], prio: 2 });
    ev.push({ k: "anim", id: l.id, t: ta, tipo: "magia", dx: Math.sign(cx - l.x) || 1 });
    let tq = ta + 8;
    if (magia.efeito === "explosao") {
      const viagem = Math.max(6, Math.round(Math.hypot(cx - l.x, cy - l.y) / 6));
      ev.push({ k: "fx", t: ta + 3, dur: viagem, tipo: "projetil", x0: l.x, y0: l.y, x1: cx, y1: cy, cor: COR_DANO[magia.tipo!], de: l.id });
      tq = ta + 3 + viagem;
      ev.push({ k: "fx", t: tq, dur: 22, tipo: "explosao", x0: cx, y0: cy, x1: cx, y1: cy, cor: COR_DANO[magia.tipo!], raio: magia.raio });
      ev.push({ k: "tremor", t: tq, forca: magia.nivel >= 3 ? 5 : 3 });
      som(ta + 2, "magia.wav", 0.5);
      som(tq, magia.tipo === "fogo" ? "explosao.wav" : "trovao.wav", 0.9);
    } else if (magia.efeito === "linha") {
      ev.push({ k: "fx", t: ta + 4, dur: 18, tipo: "relampago", x0: l.x, y0: l.y, x1: cx, y1: cy, cor: COR_DANO[magia.tipo!], de: l.id });
      ev.push({ k: "tremor", t: ta + 6, forca: 4 });
      tq = ta + 8;
      som(ta + 4, "trovao.wav", 0.9);
    } else if (magia.efeito === "onda" || magia.efeito === "cone") {
      ev.push({ k: "fx", t: ta + 3, dur: 16, tipo: magia.efeito, x0: l.x, y0: l.y, x1: cx, y1: cy, cor: COR_DANO[magia.tipo!], raio: magia.raio ?? 15, de: l.id });
      tq = ta + 7;
      som(ta + 3, magia.tipo === "trovejante" ? "trovao.wav" : "sopro.wav", 0.8);
    } else if (magia.efeito === "coluna") {
      ev.push({ k: "fx", t: ta + 3, dur: 20, tipo: magia.tipo === "elétrico" ? "raioCeu" : "coluna", x0: cx, y0: cy, x1: cx, y1: cy, cor: COR_DANO[magia.tipo!], raio: magia.raio ?? 5 });
      tq = ta + 9;
      som(ta + 3, magia.tipo === "elétrico" ? "trovao.wav" : "sagrado.wav", 0.8);
    } else if (magia.efeito === "palavras") {
      for (const a of alvos) ev.push({ k: "fx", t: ta + 2, dur: 14, tipo: "palavras", x0: l.x, y0: l.y, x1: a.x, y1: a.y, cor: COR_DANO[magia.tipo!], de: l.id, para: a.id });
      tq = ta + 14;
      som(ta + 2, "zombaria.wav", 0.7);
    } else if (magia.efeito === "aura") {
      tq = ta + 6;
      som(ta + 2, "sagrado.wav", 0.7);
    }
    log.push(`   ${l.f.nome} conjura ${magia.nome}${circulo > 0 ? ` (${circulo}º círculo)` : ""}: ${r.expr} [${r.dados.join(",")}] = ${r.total} ${magia.tipo}, ${magia.salva} CD ${cd}`);
    if (!alvos.length) log.push("   ...mas não pega ninguém.");
    alvos.forEach((a, i) => {
      const s = salvaguarda(a, magia.salva!, cd);
      const final = s.passou ? (magia.metade ? Math.floor(r.total / 2) : 0) : r.total;
      log.push(`     ${a.f.nome}: ${magia.salva} ${s.auto ? "falha automática (atordoado)" : `${s.dado}→${s.total}`} ${s.passou ? "passa" : "falha"} → ${final}`);
      const tqi = tq + i * 2;
      if (final > 0) causarDano(l, a, final, magia.tipo!, tqi);
      else {
        ev.push({ k: "numero", id: a.id, t: tqi, texto: "SALVOU", cor: "#c9ced6" });
        som(tqi, "erro.wav", 0.4);
      }
      if (!s.passou && a.vivo) {
        if (magia.id === "zombaria") a.zombado = true;
        if (magia.id === "ondaTrovejante") empurrar(a, l, 10, tqi + 2);
        if (magia.id === "sussurros") {
          // o alvo usa a reação para fugir do conjurador
          const ang = Math.atan2(a.y - l.y, a.x - l.x);
          mover(a, a.x + Math.cos(ang) * a.f.deslocamento, a.y + Math.sin(ang) * a.f.deslocamento, a.f.deslocamento, tqi + 4);
        }
      }
    });
    if (vivosAntes < 2 && magia.id !== "sopro" && alvos.some((a) => !a.vivo))
      ev.push({ k: "cutin", id: l.id, t: ta - 1, texto: magia.nome.toUpperCase(), sub: `${r.expr} = ${r.total} · GOLPE FINAL`, cor: COR_DANO[magia.tipo!], prio: 2 });
    return tq + alvos.length * 2;
  };

  const somarDados = (base: string, extra: string, vezes: number) => {
    const [q, resto] = base.split("d");
    const lados = resto.replace(/[+-].*/, "");
    const bonus = resto.slice(lados.length);
    const [qe, le] = extra.split("d");
    if (le === lados) return `${Number(q) + Number(qe) * vezes}d${lados}${bonus}`;
    return base; // (não acontece com as magias da lista)
  };

  // ---------- escolha de alvo ----------
  const pontuarAlvo = (l: Lutador, o: Lutador) => {
    const dd = dist(l, o);
    let s = dd * 1.0 + (o.pv / o.pvMax) * 18 + rng() * 14;
    if (o.atordoadoAte >= turnoGlobal || o.descuidadoAte >= turnoGlobal || o.guiado) s -= l.f.classe === "ladino" ? 30 : 8;
    if (o.pv <= 12) s -= 10; // finalizar quem está quase caindo
    if (l.marcaAlvo === o.id) s -= 20;
    return s;
  };
  // pontua cada candidato UMA vez (sorteio fora do sort: o número de comparações
  // varia entre motores JS e mudaria a sequência de dados entre Node e navegador)
  const ordenarAlvos = (l: Lutador, cand: Lutador[]) =>
    cand.map((o) => ({ o, s: pontuarAlvo(l, o) })).sort((a, b) => a.s - b.s || a.o.id - b.o.id).map((x) => x.o);
  const melhorAlvo = (l: Lutador, alcanceMax = 999) => {
    const cand = vivos().filter((o) => o.id !== l.id && dist(l, o) <= alcanceMax);
    if (!cand.length) return undefined;
    return ordenarAlvos(l, cand)[0];
  };

  // posição para atacar corpo a corpo: encosta no alvo pelo lado de onde vem
  const pontoCorpo = (l: Lutador, alvo: Lutador) => {
    const ang = Math.atan2(l.y - alvo.y, l.x - alvo.x) + (rng() - 0.5) * 0.8;
    return { x: alvo.x + Math.cos(ang) * 5.5, y: alvo.y + Math.sin(ang) * 5.5 };
  };

  // aproxima para corpo a corpo; devolve [quadro ao chegar, alcançou?]
  const aproximar = (l: Lutador, alvo: Lutador, t0: number, desloc: number): [number, boolean] => {
    if (dist(l, alvo) <= ALCANCE_CORPO) return [t0, true];
    const p = pontoCorpo(l, alvo);
    const t1 = mover(l, p.x, p.y, desloc, t0);
    return [t1, dist(l, alvo) <= ALCANCE_CORPO + 0.5];
  };

  // atirador: mantém distância (≥ 25 pés do inimigo mais próximo) e fica dentro do alcance
  const posicionarDistancia = (l: Lutador, alvo: Lutador, alcance: number, t0: number, desloc: number, ficarSePuder = false) => {
    const perto = vivos().filter((o) => o.id !== l.id).sort((a, b) => dist(l, a) - dist(l, b))[0];
    if (perto && dist(l, perto) < 18) {
      // recua para longe do mais próximo
      const ang = Math.atan2(l.y - perto.y, l.x - perto.x) + (rng() - 0.5) * 0.9;
      return mover(l, l.x + Math.cos(ang) * desloc, l.y + Math.sin(ang) * desloc, desloc, t0);
    }
    if (dist(l, alvo) > alcance) return mover(l, alvo.x, alvo.y, Math.min(desloc, dist(l, alvo) - alcance + 5), t0);
    if (ficarSePuder) return t0; // ladino: parado para usar a Mira Firme
    // atirador nunca fica parado: contorna o alvo mantendo 25–40 pés (o deslocamento do turno)
    const angAtual = Math.atan2(l.y - alvo.y, l.x - alvo.x);
    const ang = angAtual + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.7);
    const distAlvo = 25 + rng() * 15;
    return mover(l, alvo.x + Math.cos(ang) * distAlvo, alvo.y + Math.sin(ang) * distAlvo, desloc, t0);
  };

  const opArma = (l: Lutador): OpAtaque => {
    const a = l.f.arma;
    const atr: Atributo = a.atributo === "acuidade" ? (m(l, "DES") >= m(l, "FOR") ? "DES" : "FOR") : a.atributo;
    const arquearia = l.f.classe === "patrulheiro" && l.f.nivel >= 2 && a.alcance > 5 ? 2 : 0;
    return {
      bonus: m(l, atr) + profDe(l.f.nivel) + arquearia,
      dano: l.f.classe === "monge" ? (l.f.nivel >= 5 ? "1d8" : "1d6") : a.dano, // Artes Marciais
      modDano: m(l, atr),
      tipo: a.tipo,
      distancia: a.alcance > 5,
      arma: true,
      gwf: l.f.classe === "guerreiro" && Boolean(a.duasMaos) && a.alcance <= 5,
      efeito: a.alcance > 5 ? "flecha" : undefined,
      cor: a.alcance > 5 ? "#e0c79a" : undefined,
    };
  };

  // melhor ponto para uma área (maior número de inimigos, sem pegar o próprio conjurador)
  const melhorArea = (l: Lutador, raio: number, alcance: number) => {
    let melhor = { x: 0, y: 0, alvos: [] as Lutador[], valor: 0 };
    for (const c of vivos()) {
      if (c.id === l.id || dist(l, c) > alcance) continue;
      const centros = [{ x: c.x, y: c.y }];
      for (const o of vivos()) if (o.id !== c.id && o.id !== l.id) centros.push({ x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 });
      for (const p of centros) {
        if (Math.hypot(p.x - l.x, p.y - l.y) <= raio + 4) continue;
        const alvos = alvosArea(p.x, p.y, raio, l.id);
        const valor = alvos.reduce((s, a) => s + Math.min(1, 30 / Math.max(a.pv, 1)) * 0.3 + 1, 0);
        if (valor > melhor.valor) melhor = { ...p, alvos, valor };
      }
    }
    return melhor;
  };

  const media = (expr: string) => {
    const mm = expr.match(/^(\d+)d(\d+)([+-]\d+)?$/)!;
    return Number(mm[1]) * (Number(mm[2]) + 1) / 2 + (mm[3] ? Number(mm[3]) : 0);
  };

  const gastarEspaco = (l: Lutador, minimo: number, preferirAlto = true): number => {
    const ordem = preferirAlto ? [2, 1, 0] : [0, 1, 2];
    for (const i of ordem) if (i + 1 >= minimo && l.espacos[i] > 0) { l.espacos[i]--; return i + 1; }
    return 0;
  };
  const temEspaco = (l: Lutador, minimo: number) => l.espacos.some((q, i) => q > 0 && i + 1 >= minimo);

  // ---------- turno do conjurador ----------
  const turnoConjurador = (l: Lutador, t0: number): number => {
    const lista = magiasDe(l.f.classe, l.f.nivel).map((id) => MAGIAS[id]);
    const atrConj = CLASSES[l.f.classe].conjuracao!.atributo;
    let t1 = t0;
    let bonusUsado = false;

    // cura de emergência como ação bônus (Palavra Curativa)
    const palavra = lista.find((s) => s.id === "palavraCurativa");
    if (palavra && l.pv < l.pvMax * 0.35 && temEspaco(l, 1)) {
      const c = gastarEspaco(l, 1, false);
      const r = rolar(rng, `${c + 1}d4`);
      ev.push({ k: "rotulo", id: l.id, t: t1, dur: 30, texto: "PALAVRA CURATIVA", cor: COR_DANO.cura });
      curar(l, l, r.total + m(l, atrConj), t1 + 8, `Palavra Curativa ${r.expr}[${r.dados.join(",")}]${sinal(m(l, atrConj))}`);
      t1 += 14;
      bonusUsado = true;
    }

    // Bruxaria (ação bônus) no começo, se não estiver concentrado
    const hex = lista.find((s) => s.id === "bruxaria");
    if (hex && !l.conc && !bonusUsado && temEspaco(l, 1)) {
      const alvo = melhorAlvo(l, 90);
      if (alvo) {
        const c = gastarEspaco(l, 1, false);
        l.conc = { magia: hex, circulo: c, alvo: alvo.id, desde: t1 };
        l.marcaAlvo = alvo.id;
        ev.push({ k: "rotulo", id: l.id, t: t1, dur: 30, texto: "BRUXARIA", cor: COR_DANO.necrótico });
        ev.push({ k: "fx", t: t1 + 4, dur: 14, tipo: "espectral", x0: l.x, y0: l.y, x1: alvo.x, y1: alvo.y, cor: COR_DANO.necrótico, de: l.id, para: alvo.id });
        ev.push({ k: "status", id: alvo.id, t0: t1 + 10, t1: 999999, texto: "MARCA", cor: COR_DANO.necrótico });
        som(t1 + 2, "magia.wav", 0.5);
        log.push(`   ${l.f.nome} lança Bruxaria em ${alvo.f.nome} (+1d6 necrótico por acerto)`);
        t1 += 12;
        bonusUsado = true;
      }
    }

    // Arma Espiritual: ataca com ação bônus enquanto durar
    if (l.conc?.magia.id === "armaEspiritual" && !bonusUsado) {
      const alvo = melhorAlvo(l, 60);
      if (alvo) {
        const c = l.conc.circulo;
        const r = atacar(l, alvo, { bonus: l.f.ataqueMagia!, dano: `${1 + (c - 2)}d8`, modDano: m(l, atrConj), tipo: "energia", distancia: false, arma: false, efeito: "espectral", cor: "#e3e8ff" }, t1, "ARMA ESPIRITUAL");
        t1 = r.tq + 4;
        bonusUsado = true;
      }
    }
    // Guardiões Espirituais: dano em quem está perto no começo do turno do clérigo
    if (l.conc?.magia.id === "guardioes") {
      const alvos = alvosArea(l.x, l.y, 15, l.id);
      if (alvos.length) t1 = magiaSalva(l, { ...l.conc.magia, efeito: "aura" }, l.conc.circulo, alvos, l.x, l.y, t1, false) + 2;
    }
    // Raio Lunar: move o feixe (ação bônus) para um alvo e causa dano
    if (l.conc?.magia.id === "raioLunar" && !bonusUsado) {
      const alvo = melhorAlvo(l, 120);
      if (alvo) {
        t1 = magiaSalva(l, l.conc.magia, l.conc.circulo, [alvo], alvo.x, alvo.y, t1, true) + 2;
        bonusUsado = true;
      }
    }

    // ----- ação: avalia opções -----
    type Op = { valor: number; fazer: () => number };
    const ops: Op[] = [];
    const proximo = vivos().filter((o) => o.id !== l.id).sort((a, b) => dist(l, a) - dist(l, b))[0];
    const alvo = melhorAlvo(l);
    if (!alvo) return t1;

    for (const s of lista) {
      if (s.modo === "cura" || s.modo === "bonus" || s.id === "palavraCurativa") continue;
      if (s.nivel > 0 && !temEspaco(l, s.nivel)) continue;
      const custo = s.nivel === 0 ? 0 : s.nivel * 2.2 + 1;
      const circ = s.nivel === 0 ? 0 : Math.max(s.nivel, l.espacos.findIndex((q, i) => q > 0 && i + 1 >= s.nivel) + 1);
      const extra = s.porCirculo && circ > s.nivel ? circ - s.nivel : 0;
      const expr = s.dano ? (s.nivel === 0 ? exprMagia(l, s, 0) : extra ? somarDados(s.dano, s.porCirculo!, extra) : s.dano) : "0d1";
      if (s.concentracao && l.conc) continue;

      if (s.modo === "ataque" && s.alcance >= 30) {
        // Rajada Mística: 1 feixe por "dado de truque" (2 no nível 5); +CAR com Rajada Agonizante (nível 2)
        const feixesBase = s.id === "rajadaMistica" ? dadosTruque(l.f.nivel) : s.feixes ?? 1;
        const feixes = feixesBase + (s.feixesPorCirculo ?? 0) * (circ > s.nivel ? circ - s.nivel : 0);
        const bonusDano = s.id === "rajadaMistica" && l.f.nivel >= 2 ? m(l, "CAR") : 0;
        const chance = Math.min(0.95, Math.max(0.05, (21 - (alvo.f.ca - (l.f.ataqueMagia ?? 0))) / 20));
        const valor = (media(expr) + bonusDano) * feixes * chance - custo + (s.id === "raioGuia" ? 2 : 0);
        ops.push({
          valor,
          fazer: () => {
            const c = s.nivel ? gastarEspaco(l, s.nivel) : 0;
            let tt = posicionarDistancia(l, alvo, s.alcance, t1, l.f.deslocamento);
            ev.push({ k: "rotulo", id: l.id, t: tt, dur: 34, texto: s.nome.toUpperCase(), cor: COR_DANO[s.tipo!] });
            if (s.concentracao) l.conc = { magia: s, circulo: c, desde: tt };
            const n = feixesBase + (s.feixesPorCirculo ?? 0) * (c > s.nivel ? c - s.nivel : 0);
            const ex = s.porCirculo && c > s.nivel ? c - s.nivel : 0;
            const dExpr = s.nivel === 0 && s.id !== "rajadaMistica" ? exprMagia(l, s, 0) : ex ? somarDados(s.dano!, s.porCirculo!, ex) : s.dano!;
            let fim = tt;
            for (let i = 0; i < n; i++) {
              const a = i === 0 || !alvo.vivo ? (alvo.vivo ? alvo : melhorAlvo(l, s.alcance)) : alvo;
              if (!a) break;
              const r = atacar(l, a, { bonus: l.f.ataqueMagia!, dano: dExpr, modDano: bonusDano, tipo: s.tipo!, distancia: true, arma: false, efeito: s.efeito === "raio" ? "raio" : "projetil", cor: COR_DANO[s.tipo!] }, tt + i * 7);
              if (r.acertou && s.id === "raioGuia") a.guiado = true;
              if (r.acertou && s.id === "raioDeGelo") a.lentoAte = turnoGlobal + vivos().length;
              if (r.acertou && s.id === "chicoteEspinhos" && a.vivo) {
                const ang = Math.atan2(l.y - a.y, l.x - a.x);
                mover(a, a.x + Math.cos(ang) * 10, a.y + Math.sin(ang) * 10, 10, r.tq + 1);
              }
              fim = Math.max(fim, r.tq);
            }
            return fim;
          },
        });
      }
      if (s.id === "misseisMagicos") {
        const n = 3 + (circ - 1);
        ops.push({
          valor: 3.5 * n - custo + (alvo.pv <= 3.5 * n ? 6 : 0),
          fazer: () => {
            const c = gastarEspaco(l, 1, false);
            const dardos = 3 + (c - 1);
            let tt = posicionarDistancia(l, alvo, 120, t1, l.f.deslocamento);
            ev.push({ k: "rotulo", id: l.id, t: tt, dur: 34, texto: "MÍSSEIS MÁGICOS", cor: COR_DANO.energia });
            ev.push({ k: "anim", id: l.id, t: tt, tipo: "magia", dx: Math.sign(alvo.x - l.x) || 1 });
            ev.push({ k: "fx", t: tt + 3, dur: 12, tipo: "misseis", x0: l.x, y0: l.y, x1: alvo.x, y1: alvo.y, cor: COR_DANO.energia, n: dardos, de: l.id, para: alvo.id });
            som(tt + 3, "magia.wav", 0.7);
            const r = rolar(rng, `${dardos}d4+${dardos}`);
            log.push(`   ${l.f.nome} → ${alvo.f.nome}: Mísseis Mágicos (${dardos} dardos, acerto automático) ${r.expr}[${r.dados.join(",")}] = ${r.total} energia`);
            causarDano(l, alvo, r.total, "energia", tt + 15);
            return tt + 16;
          },
        });
      }
      if (s.id === "toqueVampirico") {
        ops.push({
          valor: media(expr) * 0.65 * 1.5 - custo + (l.pv < l.pvMax * 0.5 ? 6 : 0),
          fazer: () => {
            const c = gastarEspaco(l, 3);
            const [tt, chegou] = aproximar(l, alvo, t1, l.f.deslocamento);
            if (!chegou) return tt;
            const ex = c > 3 ? c - 3 : 0;
            const r = atacar(l, alvo, { bonus: l.f.ataqueMagia!, dano: ex ? somarDados("3d6", "1d6", ex) : "3d6", modDano: 0, tipo: "necrótico", distancia: false, arma: false, efeito: "toque", cor: COR_DANO.necrótico }, tt, "TOQUE VAMPÍRICO");
            if (r.acertou) {
              const ultimo = [...ev].reverse().find((e) => e.k === "numero" && e.id === alvo.id) as Extract<Ev, { k: "numero" }> | undefined;
              const dano = ultimo ? Number(ultimo.texto.replace("-", "")) || 0 : 0;
              if (dano > 0) curar(l, l, Math.floor(dano / 2), r.tq + 8, "Toque Vampírico");
            }
            return r.tq + 8;
          },
        });
      }
      if (s.modo === "salvaguarda" && (s.raio ?? 0) >= 10 && s.efeito === "explosao") {
        const area = melhorArea(l, s.raio!, s.alcance);
        if (area.alvos.length) {
          const quedas = area.alvos.reduce((q, a) => q + (a.pv <= media(expr) * 0.6 ? 1 : 0), 0);
          ops.push({
            valor: media(expr) * 0.75 * area.alvos.length - custo + quedas * 4,
            fazer: () => {
              const c = gastarEspaco(l, s.nivel);
              const recalc = melhorArea(l, s.raio!, s.alcance);
              const alvos = recalc.alvos.length ? recalc : area;
              if (s.concentracao) l.conc = { magia: s, circulo: c, desde: t1 };
              return magiaSalva(l, s, c, alvosArea(alvos.x, alvos.y, s.raio!, l.id), alvos.x, alvos.y, t1 + 2);
            },
          });
        }
      }
      if (s.id === "relampago") {
        // linha de 100 pés por 5 de largura: mira no alvo e pega quem estiver no caminho
        const pegos = (alvoL: Lutador) => {
          const ang = Math.atan2(alvoL.y - l.y, alvoL.x - l.x);
          return vivos().filter((o) => {
            if (o.id === l.id) return false;
            const px = o.x - l.x,
              py = o.y - l.y;
            const ao = px * Math.cos(ang) + py * Math.sin(ang);
            const perp = Math.abs(-px * Math.sin(ang) + py * Math.cos(ang));
            return ao > 0 && ao <= 100 && perp <= 5;
          });
        };
        let melhorL: Lutador | undefined;
        let maxPegos: Lutador[] = [];
        for (const o of vivos()) if (o.id !== l.id) { const p = pegos(o); if (p.length > maxPegos.length) { maxPegos = p; melhorL = o; } }
        if (melhorL && maxPegos.length) {
          const alvoLinha = melhorL;
          ops.push({
            valor: media(expr) * 0.75 * maxPegos.length - custo,
            fazer: () => {
              const c = gastarEspaco(l, 3);
              const ang = Math.atan2(alvoLinha.y - l.y, alvoLinha.x - l.x);
              return magiaSalva(l, s, c, pegos(alvoLinha), l.x + Math.cos(ang) * 100, l.y + Math.sin(ang) * 100, t1 + 2);
            },
          });
        }
      }
      if (s.id === "ondaTrovejante") {
        const alvos = alvosArea(l.x, l.y, 12, l.id);
        if (alvos.length) {
          ops.push({
            valor: media(expr) * 0.7 * alvos.length - custo + 3,
            fazer: () => {
              const c = gastarEspaco(l, 1, false);
              return magiaSalva(l, s, c, alvosArea(l.x, l.y, 12, l.id), l.x, l.y, t1 + 2);
            },
          });
        }
      }
      if (s.id === "chamaSagrada" || s.id === "zombaria" || s.id === "sussurros") {
        ops.push({
          valor: media(expr) * (s.metade ? 0.75 : 0.55) - custo + (s.id === "zombaria" ? 1 : 0),
          fazer: () => {
            const c = s.nivel ? gastarEspaco(l, s.nivel, false) : 0;
            const tt = posicionarDistancia(l, alvo, s.alcance, t1, l.f.deslocamento);
            return magiaSalva(l, s, c, alvo.vivo ? [alvo] : [], alvo.x, alvo.y, tt + 2);
          },
        });
      }
      if (s.id === "guardioes") {
        const perto = alvosArea(l.x, l.y, 30, l.id).length;
        ops.push({
          valor: perto ? 16 + perto * 3 : 4,
          fazer: () => {
            const c = gastarEspaco(l, 3);
            // anda até o meio da confusão
            const tt = alvo ? mover(l, alvo.x, alvo.y, Math.max(0, Math.min(l.f.deslocamento, dist(l, alvo) - 6)), t1) : t1;
            l.conc = { magia: s, circulo: c, desde: tt };
            ev.push({ k: "rotulo", id: l.id, t: tt, dur: 36, texto: "GUARDIÕES ESPIRITUAIS", cor: COR_DANO.radiante });
            ev.push({ k: "anim", id: l.id, t: tt, tipo: "magia" });
            ev.push({ k: "aura", id: l.id, t0: tt + 4, t1: 999999, raio: 15, cor: COR_DANO.radiante, tipo: "guardioes" });
            som(tt + 2, "sagrado.wav", 0.8);
            log.push(`   ${l.f.nome} conjura Guardiões Espirituais (${c}º círculo, concentração)`);
            const alvos = alvosArea(l.x, l.y, 15, l.id);
            return alvos.length ? magiaSalva(l, { ...s, efeito: "aura" }, c, alvos, l.x, l.y, tt + 8, false) : tt + 12;
          },
        });
      }
      if (s.id === "armaEspiritual" && !l.conc) {
        ops.push({
          valor: 13,
          fazer: () => {
            const c = gastarEspaco(l, 2, false);
            l.conc = { magia: s, circulo: c, desde: t1 };
            log.push(`   ${l.f.nome} conjura Arma Espiritual (${c}º círculo, concentração)`);
            const r = atacar(l, alvo, { bonus: l.f.ataqueMagia!, dano: `${1 + (c - 2)}d8`, modDano: m(l, atrConj), tipo: "energia", distancia: false, arma: false, efeito: "espectral", cor: "#e3e8ff" }, t1 + 2, "ARMA ESPIRITUAL");
            return r.tq;
          },
        });
      }
      if (s.id === "raioLunar" || s.id === "convocarRelampagos") {
        ops.push({
          valor: media(expr) * 0.75 + (s.id === "convocarRelampagos" ? 9 : 7) - custo,
          fazer: () => {
            const c = gastarEspaco(l, s.nivel);
            l.conc = { magia: s, circulo: c, desde: t1 };
            const tt = posicionarDistancia(l, alvo, s.alcance, t1, l.f.deslocamento);
            return magiaSalva(l, s, c, alvo.vivo ? alvosArea(alvo.x, alvo.y, s.raio ?? 5, l.id) : [], alvo.x, alvo.y, tt + 2);
          },
        });
      }
    }
    // Convocar Relâmpagos já ativo: novo raio sem gastar espaço
    if (l.conc?.magia.id === "convocarRelampagos") {
      const s = l.conc.magia;
      const c = l.conc.circulo;
      ops.push({
        valor: 18,
        fazer: () => {
          const tt = posicionarDistancia(l, alvo, 120, t1, l.f.deslocamento);
          return magiaSalva(l, s, c, alvosArea(alvo.x, alvo.y, 5, l.id), alvo.x, alvo.y, tt + 2);
        },
      });
    }
    // cura com ação (Curar Ferimentos) se estiver mal
    const curarF = lista.find((s) => s.id === "curarFerimentos");
    if (curarF && l.pv < l.pvMax * 0.3 && temEspaco(l, 1)) {
      ops.push({
        valor: 22,
        fazer: () => {
          const c = gastarEspaco(l, 1, false);
          const r = rolar(rng, `${2 * c}d8`);
          ev.push({ k: "rotulo", id: l.id, t: t1, dur: 30, texto: "CURAR FERIMENTOS", cor: COR_DANO.cura });
          curar(l, l, r.total + m(l, atrConj), t1 + 8, `Curar Ferimentos ${r.expr}[${r.dados.join(",")}]${sinal(m(l, atrConj))}`);
          return t1 + 14;
        },
      });
    }
    // Centelha Divina (clérigo nível 2): 1d8 + SAB radiante, CON para metade, 1× por batalha
    if (l.centelha) {
      ops.push({
        valor: 4.5 + m(l, "SAB") + 3,
        fazer: () => {
          l.centelha = false;
          const centelha: Magia = { id: "centelha", nome: "Centelha Divina", nivel: 1, modo: "salvaguarda", dano: `1d8+${Math.max(0, m(l, "SAB"))}`, tipo: "radiante", salva: "CON", metade: true, alcance: 30, efeito: "coluna" };
          const tt = posicionarDistancia(l, alvo, 30, t1, l.f.deslocamento);
          return magiaSalva(l, centelha, 1, alvo.vivo ? [alvo] : [], alvo.x, alvo.y, tt + 2);
        },
      });
    }
    // ataque com arma (clérigo com maça, bardo com rapieira) se o alvo estiver colado
    if (proximo && dist(l, proximo) <= ALCANCE_CORPO) {
      const op = opArma(l);
      ops.push({ valor: (media(op.dano) + op.modDano) * 0.65, fazer: () => atacar(l, proximo, op, t1).tq });
    }
    // Arma de Sopro (draconato)
    pushSopro(l, ops, t1);

    ops.sort((a, b) => b.valor - a.valor);
    // um pouco de imprevisibilidade (sem jogar fora uma opção muito melhor)
    const escolhida = ops.length > 1 && ops[1].valor > ops[0].valor * 0.85 && rng() < 0.35 ? ops[1] : ops[0];
    return escolhida ? escolhida.fazer() : t1;
  };

  // ---------- Arma de Sopro (draconato) ----------
  const pushSopro = (l: Lutador, ops: { valor: number; fazer: () => number }[], t1: number) => {
    if (l.sopro <= 0 || !l.f.dragao) return;
    const proximos = vivos().filter((o) => o.id !== l.id && dist(l, o) <= 15);
    if (!proximos.length) return;
    // cone de 15 pés na direção do mais próximo
    const alvo = proximos.sort((a, b) => dist(l, a) - dist(l, b))[0];
    const ang = Math.atan2(alvo.y - l.y, alvo.x - l.x);
    const noCone = proximos.filter((o) => {
      const a = Math.atan2(o.y - l.y, o.x - l.x);
      let df = Math.abs(a - ang);
      if (df > Math.PI) df = Math.PI * 2 - df;
      return df <= 0.55;
    });
    ops.push({
      valor: 11 * 0.75 * noCone.length + 2,
      fazer: () => {
        l.sopro--;
        const tipo = l.f.dragao!.tipo;
        const sopro: Magia = { id: "sopro", nome: `Sopro de Dragão`, nivel: 0, modo: "salvaguarda", dano: l.f.nivel >= 5 ? "2d10" : "1d10", tipo, salva: "DES", metade: true, alcance: 15, raio: 15, efeito: "cone" };
        const cdAntes = l.f.cd;
        l.f.cd = 8 + profDe(l.f.nivel) + m(l, "CON");
        const fim = magiaSalva(l, sopro, 0, noCone.filter((o) => o.vivo), l.x + Math.cos(ang) * 15, l.y + Math.sin(ang) * 15, t1 + 2);
        l.f.cd = cdAntes;
        return fim;
      },
    });
  };

  // ---------- turno marcial (guerreiro, bárbaro, paladino, patrulheiro, ladino, monge) ----------
  const turnoMarcial = (l: Lutador, t0: number): number => {
    let t1 = t0;
    const op = opArma(l);
    const distancia = op.distancia;
    let alvo = melhorAlvo(l);
    if (!alvo) return t1;
    let bonusUsado = false;
    const sneak = { usado: false };

    // recursos de ação bônus antes de se mover
    if (l.f.classe === "barbaro" && !l.furia && l.usosFuria > 0) {
      l.furia = true;
      l.usosFuria--;
      bonusUsado = true;
      ev.push({ k: "rotulo", id: l.id, t: t1, dur: 34, texto: "FÚRIA!", cor: "#e8552e" });
      ev.push({ k: "cutin", id: l.id, t: t1 - 1, texto: "FÚRIA!", sub: "+2 DE DANO · RESISTÊNCIA", cor: "#e8552e", prio: 1 });
      ev.push({ k: "aura", id: l.id, t0: t1 + 2, t1: 999999, raio: 4, cor: "#e8552e", tipo: "furia" });
      som(t1, "furia.wav", 0.8);
      log.push(`   ${l.f.nome} entra em Fúria!`);
      t1 += 10;
    }
    if (l.f.classe === "guerreiro" && l.folego > 0 && l.pv < l.pvMax * 0.45) {
      l.folego--;
      bonusUsado = true;
      const r = rolar(rng, "1d10");
      ev.push({ k: "rotulo", id: l.id, t: t1, dur: 30, texto: "RETOMAR O FÔLEGO", cor: COR_DANO.cura });
      curar(l, l, r.total + l.f.nivel, t1 + 6, `Retomar o Fôlego 1d10[${r.dados[0]}]+${l.f.nivel}`);
      t1 += 12;
    }
    if (l.f.classe === "paladino" && l.curaMaos > 0 && l.pv < l.pvMax * 0.4) {
      const qtd = Math.min(l.curaMaos, l.pvMax - l.pv);
      l.curaMaos -= qtd;
      bonusUsado = true;
      ev.push({ k: "rotulo", id: l.id, t: t1, dur: 30, texto: "CURA PELAS MÃOS", cor: COR_DANO.cura });
      curar(l, l, qtd, t1 + 6, "Cura pelas Mãos");
      t1 += 12;
    }
    if (l.f.classe === "patrulheiro" && !l.conc && l.espacos.some((q) => q > 0)) {
      const a = melhorAlvo(l, 150);
      if (a) {
        const c = gastarEspaco(l, 1, false);
        l.conc = { magia: MAGIAS.marcaCacador, circulo: c, alvo: a.id, desde: t1 };
        l.marcaAlvo = a.id;
        alvo = a;
        bonusUsado = true;
        ev.push({ k: "rotulo", id: l.id, t: t1, dur: 30, texto: "MARCA DO CAÇADOR", cor: "#c8e06a" });
        ev.push({ k: "status", id: a.id, t0: t1 + 6, t1: 999999, texto: "MARCA", cor: "#c8e06a" });
        som(t1, "magia.wav", 0.5);
        log.push(`   ${l.f.nome} marca ${a.f.nome} (Marca do Caçador)`);
        t1 += 10;
      }
    }
    // patrulheiro/bruxo: se o marcado caiu, a marca passa para outro (ação bônus)
    if (l.conc && l.marcaAlvo !== undefined && !porId(l.marcaAlvo).vivo && !bonusUsado) {
      const a = melhorAlvo(l, 150);
      if (a) {
        l.marcaAlvo = a.id;
        alvo = a;
        bonusUsado = true;
        ev.push({ k: "status", id: a.id, t0: t1 + 4, t1: 999999, texto: "MARCA", cor: "#c8e06a" });
      }
    }

    // ----- movimento -----
    let desloc = l.f.deslocamento - (l.lentoAte >= turnoGlobal ? 10 : 0);
    let parado = true;
    if (distancia) {
      const tAntes = t1;
      t1 = posicionarDistancia(l, alvo, l.f.arma.alcance, t1, desloc, l.f.classe === "ladino");
      parado = t1 === tAntes;
    } else if (dist(l, alvo) > ALCANCE_CORPO) {
      parado = false;
      // se não alcança andando, Disparada (ação) ou Ação Ardilosa / Surto de Adrenalina (bônus)
      const precisa = dist(l, alvo) - ALCANCE_CORPO;
      if (precisa > desloc && !bonusUsado && ((l.f.classe === "ladino" && l.f.nivel >= 2) || l.adrenalina > 0)) {
        if (l.adrenalina > 0) {
          l.adrenalina--;
          l.temp = Math.max(l.temp, profDe(l.f.nivel));
          ev.push({ k: "rotulo", id: l.id, t: t1, dur: 28, texto: "SURTO DE ADRENALINA", cor: "#8aa871" });
        } else ev.push({ k: "rotulo", id: l.id, t: t1, dur: 28, texto: "AÇÃO ARDILOSA", cor: "#9aa3b5" });
        desloc *= 2;
        bonusUsado = true;
      }
      const [tt, chegou] = aproximar(l, alvo, t1, desloc);
      t1 = tt;
      if (!chegou) {
        // usa a ação para disparar (Disparada) e chega mais perto
        const [tt2] = aproximar(l, alvo, t1, desloc);
        log.push(`   ${l.f.nome} corre (Disparada) em direção a ${alvo.f.nome}`);
        return tt2;
      }
    }
    // Mira Firme (ladino): vantagem se não se moveu
    let vantagem = false;
    if (l.f.classe === "ladino" && l.f.nivel >= 3 && parado && !bonusUsado) {
      vantagem = true;
      bonusUsado = true;
      ev.push({ k: "rotulo", id: l.id, t: t1, dur: 26, texto: "MIRA FIRME", cor: "#9aa3b5" });
      t1 += 6;
    }

    // Arma de Sopro substitui um ataque (draconato)
    const opsSopro: { valor: number; fazer: () => number }[] = [];
    pushSopro(l, opsSopro, t1);
    // Ataque Extra só no nível 5
    let ataquesRestantes = CLASSES[l.f.classe].ataquesPorAcao > 1 && l.f.nivel >= 5 ? 2 : 1;
    if (opsSopro.length && opsSopro[0].valor > 16) {
      t1 = opsSopro[0].fazer() + 4;
      ataquesRestantes--;
    }

    const fazerAtaques = (n: number) => {
      for (let i = 0; i < n; i++) {
        if (!alvo || !alvo.vivo) {
          alvo = ordenarAlvos(l, vivos().filter((o) => o.id !== l.id && dist(l, o) <= (distancia ? l.f.arma.alcance : ALCANCE_CORPO + 0.5)))[0];
          if (!alvo) return;
        }
        const r = atacar(l, alvo, opArma(l), t1, undefined, vantagem, sneak);
        // Destruição Divina (paladino): no acerto, gasta espaço (prioriza crítico)
        if (r.acertou && l.f.classe === "paladino" && l.f.nivel >= 2 && !bonusUsado && alvo.vivo && (r.critico || rng() < 0.55) && l.espacos.some((q) => q > 0)) {
          const c = gastarEspaco(l, 1, Boolean(r.critico));
          const sm = rolar(rng, `${1 + c}d8`, r.critico);
          bonusUsado = true;
          ev.push({ k: "rotulo", id: l.id, t: t1 + 4, dur: 32, texto: "DESTRUIÇÃO DIVINA", cor: COR_DANO.radiante });
          ev.push({ k: "cutin", id: l.id, t: t1 - 1, texto: "DESTRUIÇÃO DIVINA", sub: `${sm.expr} = ${sm.total} RADIANTE`, cor: COR_DANO.radiante, prio: 1 });
          ev.push({ k: "fx", t: r.tq, dur: 18, tipo: "coluna", x0: alvo.x, y0: alvo.y, x1: alvo.x, y1: alvo.y, cor: COR_DANO.radiante, raio: 4, para: alvo.id });
          som(r.tq, "sagrado.wav", 0.8);
          log.push(`   Destruição Divina (${c}º círculo): ${sm.expr}[${sm.dados.join(",")}] = ${sm.total} radiante`);
          causarDano(l, alvo, sm.total, "radiante", r.tq + 6);
        }
        // Golpe Atordoante (monge): 1 ponto de foco, CON contra CD
        if (r.acertou && l.f.classe === "monge" && l.f.nivel >= 5 && l.foco > 0 && alvo.vivo && alvo.atordoadoAte < turnoGlobal && rng() < 0.7) {
          l.foco--;
          const cd = 8 + profDe(l.f.nivel) + m(l, "SAB");
          const s = salvaguarda(alvo, "CON", cd);
          log.push(`   Golpe Atordoante: ${alvo.f.nome} CON ${s.dado}→${s.total} vs CD ${cd} → ${s.passou ? "resiste" : "ATORDOADO"}`);
          if (!s.passou) {
            alvo.atordoadoAte = turnoGlobal + vivos().length; // até o fim do próximo turno do monge
            ev.push({ k: "rotulo", id: l.id, t: r.tq + 2, dur: 30, texto: "GOLPE ATORDOANTE", cor: "#f2d544" });
            ev.push({ k: "status", id: alvo.id, t0: r.tq + 4, t1: r.tq + 4 + 300, texto: "ATORD", cor: "#f2d544" });
            som(r.tq + 2, "atordoar.wav", 0.7);
          }
        }
        t1 = Math.max(t1 + 11, r.tq - 2);
      }
    };
    fazerAtaques(ataquesRestantes);

    // Surto de Ação (guerreiro): mais uma ação de ataque
    if (l.f.classe === "guerreiro" && l.surto > 0 && vivos().length > 1 && (rodada >= 2 || (alvo && alvo.pv < 15))) {
      l.surto--;
      ev.push({ k: "rotulo", id: l.id, t: t1, dur: 32, texto: "SURTO DE AÇÃO", cor: "#ffb347" });
      ev.push({ k: "cutin", id: l.id, t: t1 - 1, texto: "SURTO DE AÇÃO", sub: "MAIS UMA AÇÃO!", cor: "#ffb347", prio: 1 });
      som(t1, "buff.wav", 0.7);
      log.push(`   ${l.f.nome} usa Surto de Ação!`);
      t1 += 6;
      fazerAtaques(2);
    }
    // Rajada de Golpes (monge): 2 golpes extras por 1 ponto de foco
    if (l.f.classe === "monge" && !bonusUsado && l.foco > 0 && vivos().length > 1) {
      l.foco--;
      ev.push({ k: "rotulo", id: l.id, t: t1, dur: 30, texto: "RAJADA DE GOLPES", cor: "#ffb347" });
      t1 += 4;
      fazerAtaques(2);
    } else if (l.f.classe === "monge" && !bonusUsado && vivos().length > 1 && alvo && dist(l, alvo) <= ALCANCE_CORPO + 0.5) {
      // Artes Marciais (nível 1): golpe desarmado extra como ação bônus
      fazerAtaques(1);
    }
    if (l.f.classe === "barbaro" && l.furia) l.descuidadoAte = turnoGlobal + vivos().length;
    return t1;
  };

  // ---------- laço de rodadas ----------
  let fimBatalha = t;
  while (vivos().length > 1 && rodada < 40) {
    rodada++;
    log.push(`\n— Rodada ${rodada} —`);
    for (const ini of iniciativa) {
      const l = porId(ini.id);
      if (!l.vivo) continue;
      if (vivos().length <= 1) break;
      turnoGlobal++;
      if (l.escudoAte > 0 && l.escudoAte < turnoGlobal) l.escudoAte = -1;
      ev.push({ k: "turno", id: l.id, t, rodada });
      if (l.atordoadoAte >= turnoGlobal) {
        ev.push({ k: "rotulo", id: l.id, t, dur: 24, texto: "ATORDOADO...", cor: "#f2d544" });
        log.push(` ${l.f.nome} está atordoado e perde o turno.`);
        t += 18;
        continue;
      }
      // marcador de status "ATORD" termina ao passar o atordoamento
      for (const e of ev) if (e.k === "status" && e.id === l.id && e.texto === "ATORD" && e.t1 > t) e.t1 = t;
      log.push(` ${l.f.nome} (${CLASSES[l.f.classe].nome}, ${l.pv}/${l.pvMax} PV):`);
      const tFim = CLASSES[l.f.classe].conjuracao && l.f.classe !== "paladino" && l.f.classe !== "patrulheiro" ? turnoConjurador(l, t) : turnoMarcial(l, t);
      // marcas que ficaram sem dono
      for (const e of ev)
        if (e.k === "status" && e.texto === "MARCA" && e.t1 > tFim) {
          const dono = L.find((x) => x.marcaAlvo === e.id && x.vivo && x.conc);
          if (!dono || !porId(e.id).vivo) e.t1 = Math.min(e.t1, tFim);
        }
      t = Math.max(t + 14, tFim + 6);
      fimBatalha = t;
    }
  }
  const sobreviventes = vivos();
  // limite de rodadas (raro): vence quem tem mais PV proporcional
  const vencedor = sobreviventes.sort((a, b) => b.pv / b.pvMax - a.pv / a.pvMax)[0];
  // encerra auras/status no fim
  for (const e of ev) {
    if (e.k === "aura" && e.t1 > fimBatalha) e.t1 = fimBatalha + 40;
    if (e.k === "status" && e.t1 > fimBatalha) e.t1 = fimBatalha;
  }
  log.push(`\n🏆 Vencedor: ${vencedor.f.nome} (${vencedor.pv}/${vencedor.pvMax} PV) após ${rodada} rodadas.`);

  return {
    semente,
    fichas,
    iniciativa,
    posIniciais,
    eventos: ev.sort((a, b) => tempo(a) - tempo(b)),
    log,
    vencedor: vencedor.id,
    fimBatalha,
    rodadas: rodada,
    abates,
    danoCausado,
  };
};

export const tempo = (e: Ev) => ("t" in e ? e.t : e.t0);

// quadro em que cada lutador "cai" na arena durante a abertura (vídeo e áudio usam o mesmo)
export const chegadas = (r: Pick<Resultado, "posIniciais">): Record<number, number> => {
  const ordem = [...r.posIniciais].sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  const out: Record<number, number> = {};
  ordem.forEach((p, i) => (out[p.id] = 6 + i * 5));
  return out;
};

