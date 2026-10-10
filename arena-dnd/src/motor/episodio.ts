// Episódio de 90 s: pega a batalha simulada (regras puras) e encaixa no tempo do vídeo.
//  1) ajusta o RITMO dos turnos (nunca as regras) para a luta acabar perto de 64 s;
//  2) escolhe os cut-ins (prioridade crítico > golpe final > recursos; no máx. 1 a cada ~4,5 s)
//     e congela a ação 0,6 s em cada um; congela 1,7 s no "VS" do duelo final;
//  3) sobe o nível do campeão e escreve a história dele para o pergaminho.
import { Ev, INTRO, Resultado, simular, tempo } from "./batalha";
import { Ficha, subirNivel, Subida } from "./personagem";
import { CLASSES, ESPECIES } from "./srd";

export const FPS = 30;
export const DURACAO = 90 * FPS; // 2700 quadros
export const ALVO_FIM = 64 * FPS; // fim da luta (vitória) perto de 64 s
export const VITORIA = 110; // quadros de vitória/"SUBIU DE NÍVEL!" antes do pergaminho
export const CTA = 86 * FPS; // chamada final nos últimos 4 s
const CUTIN = 18; // 0,6 s
const VS = 50; // pausa do duelo final
const ESPACO_CUTIN = 135; // ~4,5 s entre cut-ins

export type Pausa = { t: number; dur: number; tipo: "cutin" | "duelo"; ev: Extract<Ev, { k: "cutin" }> | Extract<Ev, { k: "duelo" }> };

export type Episodio = Resultado & {
  pausas: Pausa[];
  ritmo: number;
  subida: Subida;
  historia: string;
  inicioPergaminho: number;
  duracao: number;
};

const clonar = (e: Ev): Ev => JSON.parse(JSON.stringify(e));

const remapear = (r: Resultado, k: number) => {
  const T = (t: number) => (t <= INTRO ? t : t >= 900000 ? t : Math.round(INTRO + (t - INTRO) * k));
  const ev = r.eventos.map((e0) => {
    const e = clonar(e0) as Ev & Record<string, number>;
    if ("t" in e) e.t = T(e.t);
    if ("t0" in e) e.t0 = T(e.t0);
    if ("t1" in e) e.t1 = Math.max(e.t0 + 2, T(e.t1));
    if (e.k === "fx") e.dur = Math.max(5, Math.round(e.dur * Math.min(1, k * 1.15)));
    if (e.k === "rotulo") e.dur = Math.max(24, Math.round(e.dur * Math.min(1, k * 1.2)));
    if (e.k === "banner") e.dur = 50;
    return e as Ev;
  });
  return { ev, fim: T(r.fimBatalha) };
};

const escolherCutins = (ev: Ev[]) => {
  const cand = ev.filter((e): e is Extract<Ev, { k: "cutin" }> => e.k === "cutin").sort((a, b) => a.t - b.t);
  const ok: Extract<Ev, { k: "cutin" }>[] = [];
  for (const c of cand) {
    const ult = ok[ok.length - 1];
    if (!ult || c.t - ult.t >= ESPACO_CUTIN) ok.push(c);
    else if (c.prio > ult.prio && c.t - ult.t < 40 && (ok.length < 2 || c.t - ok[ok.length - 2].t >= ESPACO_CUTIN)) ok[ok.length - 1] = c;
  }
  return ok;
};

const aplicarPausas = (ev: Ev[], fim: number) => {
  const cut = escolherCutins(ev);
  const duelo = ev.find((e): e is Extract<Ev, { k: "duelo" }> => e.k === "duelo");
  const brutas: Pausa[] = [
    ...cut.map((c) => ({ t: c.t, dur: CUTIN, tipo: "cutin" as const, ev: c })),
    ...(duelo ? [{ t: duelo.t, dur: VS, tipo: "duelo" as const, ev: duelo }] : []),
  ].sort((a, b) => a.t - b.t);
  // cut-in colado no VS: fica só o VS
  const pausasOrig = brutas.filter((p) => p.tipo === "duelo" || !brutas.some((q) => q.tipo === "duelo" && Math.abs(q.t - p.t) < 40));
  const desloc = (t: number, incluirIgual: boolean) =>
    pausasOrig.reduce((s, p) => s + (p.t < t || (incluirIgual && p.t === t) ? p.dur : 0), 0);
  const pausas: Pausa[] = pausasOrig.map((p) => ({ ...p, t: p.t + desloc(p.t, false) }));
  const sel = new Set<Ev>(pausasOrig.map((p) => p.ev));
  const out = ev
    .filter((e) => e.k !== "cutin" || sel.has(e))
    .map((e0) => {
      const e = e0 as Ev & Record<string, number>;
      const proprio = sel.has(e0);
      if ("t" in e && e.t < 900000) e.t += desloc(e.t, !proprio);
      if ("t0" in e) e.t0 += desloc(e.t0, true);
      if ("t1" in e && e.t1 < 900000) e.t1 += desloc(e.t1, true);
      return e as Ev;
    });
  return { ev: out, pausas, fim: fim + desloc(fim, true) };
};

export const montarEpisodio = (fichas: Ficha[], semente: number): Episodio => {
  const r = simular(fichas, semente);
  // busca o ritmo (2 passadas: as pausas dependem do ritmo)
  let k = (ALVO_FIM - INTRO) / Math.max(1, r.fimBatalha - INTRO);
  let res = aplicarPausas(...(Object.values(remapear(r, k)) as [Ev[], number]));
  for (let i = 0; i < 3; i++) {
    const pausasTot = res.pausas.reduce((s, p) => s + p.dur, 0);
    k = Math.min(1.5, Math.max(0.3, (ALVO_FIM - INTRO - pausasTot) / Math.max(1, r.fimBatalha - INTRO)));
    const m = remapear(r, k);
    res = aplicarPausas(m.ev, m.fim);
  }
  const fim = res.fim;
  const venc = r.fichas[r.vencedor];
  const subida = subirNivel(venc, semente);
  const inicioPergaminho = Math.min(fim + VITORIA, CTA - 10 * FPS);
  return {
    ...r,
    eventos: res.ev.sort((a, b) => tempo(a) - tempo(b)),
    fimBatalha: fim,
    pausas: res.pausas,
    ritmo: k,
    subida,
    historia: historia(r, subida),
    inicioPergaminho,
    duracao: DURACAO,
  };
};

// ---------- história do campeão (3–4 frases, sem marcar gênero) ----------
const ORIGEM: Record<string, string> = {
  humano: "das cidades do reino",
  elfo: "das florestas antigas",
  anao: "das forjas sob a montanha",
  halfling: "dos vales tranquilos",
  gnomo: "das oficinas escondidas",
  orc: "das tribos das estepes",
  tiefling: "de uma linhagem infernal",
  draconato: "de um clã dracônico",
  golias: "dos picos gelados",
};

export const historia = (r: Resultado, s: Subida): string => {
  const f = s.antes;
  const classe = CLASSES[f.classe].nome.toLowerCase();
  const especie = ESPECIES[f.especie].nome.toLowerCase();
  const abates = r.abates[f.id] ?? 0;
  const dano = r.danoCausado[f.id] ?? 0;
  const pvFinal = [...r.eventos].reverse().find((e) => e.k === "pv" && e.id === f.id) as Extract<Ev, { k: "pv" }> | undefined;
  const criticos = r.log.filter((l) => l.includes(`${f.nome} →`) && l.includes("CRÍTICO")).length;
  const origem = f.dragao ? `do clã do dragão ${f.dragao.nome.toLowerCase()}` : ORIGEM[f.especie];
  const quem = f.descricao ? `${f.nome}, ${f.descricao.replace(/\.$/, "")},` : `${f.nome}, ${especie} ${classe} ${origem},`;
  const veio = f.vitorias ? `voltou à Arena para defender o título no nível ${f.nivel}` : "entrou na Arena como mais um aventureiro de nível 1";
  const frase1 = `${quem} ${veio}.`;
  const feitos = abates === 0 ? "Sem derrubar ninguém, sobreviveu a tudo" : `Derrubou ${abates} ${abates === 1 ? "rival" : "rivais"}${criticos ? ` com ${criticos} ${criticos === 1 ? "acerto crítico" : "acertos críticos"}` : ""}, causou ${dano} de dano`;
  const frase2 = `${feitos} e venceu com ${pvFinal?.pv ?? f.pv} PV após ${r.rodadas} rodadas.`;
  const novo = s.poderes[0];
  const frase3 = novo
    ? `Agora, no nível ${s.depois.nivel}, aprendeu ${novo.nome}: ${novo.desc}.`
    : `Agora, no nível ${s.depois.nivel}, ficou mais resistente: +${s.depois.pv - s.antes.pv} PV.`;
  return `${frase1} ${frase2} ${frase3}`;
};

// Cronograma do pergaminho (vídeo e mixagem de áudio usam o mesmo)
export const cronograma = (ep: Pick<Episodio, "inicioPergaminho" | "subida">) => {
  const t0 = ep.inicioPergaminho;
  const k = Math.min(1.4, Math.max(0.75, (CTA - t0) / 360));
  const T = (u: number) => t0 + Math.round(u * k);
  const ganhosAtrib = Object.keys(ep.subida.atributos).length;
  return {
    t0,
    k,
    topo: T(28),
    atributos: T(48),
    passoAtrib: Math.max(4, Math.round(7 * k)),
    combate: T(100) + ganhosAtrib * 4,
    pv: T(112),
    magia: T(128),
    poderes: T(148),
    novos: T(176),
    passoNovo: Math.max(8, Math.round(16 * k)),
    historia: T(215),
    charsPorQuadro: 1.4 / k,
    rodape: T(330),
  };
};
