// Resolve o episódio antes da simulação: sorteia o elenco (quando não vem fixo), calcula HP/dano pelo
// poder canônico e escolhe a arena. Usado igual no navegador (vídeo) e no Node (áudio) → mesmo resultado.
import elenco from "./elenco.json";
import { criarRng } from "./rng";
import { escalaSprite } from "./sprites";
import { TEMAS } from "./temas";
import type { Episodio, EpisodioPronto, Lutador, LutadorPronto } from "./tipos";

export const ELENCO = elenco as Lutador[];

const pronto = (l: Lutador): LutadorPronto => {
  const poder = Math.max(1, Math.min(10, l.poder ?? 6));
  return {
    ...l,
    poder,
    hp: l.hp ?? Math.round(70 + poder * 8),
    dano: l.dano ?? Math.round((0.72 + poder * 0.055) * 100) / 100,
    velocidade: l.velocidade ?? 0.82,
  };
};

export const sortearElenco = (ep: Episodio): Lutador[] => {
  const s = ep.sorteio ?? {};
  const rng = criarRng((ep.seed ^ 0x51ab1e) >>> 0);
  const qtd = Math.max(2, Math.min(16, s.quantidade ?? 16));
  const max = Math.max(1, s.maxPorAnime ?? 2);
  const norm = (x: string) => x.toLowerCase();
  const animes = (s.animes ?? []).map(norm);
  const excluir = new Set((s.excluir ?? []).map(norm));
  let pool = ELENCO.filter(
    (l) => !excluir.has(l.id) && (!animes.length || animes.includes(norm(l.anime))),
  );
  const escolhidos: Lutador[] = [];
  const conta = new Map<string, number>();
  const pegar = (l: Lutador) => {
    escolhidos.push(l);
    conta.set(l.anime, (conta.get(l.anime) ?? 0) + 1);
    pool = pool.filter((p) => p.id !== l.id);
  };
  for (const id of s.incluir ?? []) {
    const l = pool.find((p) => p.id === norm(id) || norm(p.nome) === norm(id));
    if (l) pegar(l);
  }
  // sorteia primeiro o anime (todos com a mesma chance), depois o personagem dentro dele
  const limite = animes.length === 1 ? Infinity : max;
  while (escolhidos.length < qtd && pool.length) {
    const abertos = [...new Set(pool.map((l) => l.anime))].filter((a) => (conta.get(a) ?? 0) < limite);
    if (!abertos.length) break;
    const anime = abertos[rng.int(abertos.length)];
    const dele = pool.filter((l) => l.anime === anime);
    pegar(dele[rng.int(dele.length)]);
  }
  // ordem do HUD também aleatória
  return rng.embaralhar(escolhidos);
};

export const montarEpisodio = (ep: Episodio): EpisodioPronto => {
  const base = ep.lutadores && ep.lutadores.length ? ep.lutadores : sortearElenco(ep);
  const rng = criarRng((ep.seed ^ 0xa7e7a) >>> 0);
  const pedido = (ep.arena ?? "aleatoria").toLowerCase();
  const tema = TEMAS.find((t) => t.id === pedido) ?? TEMAS[rng.int(TEMAS.length)];
  return {
    ...ep,
    lutadores: base.map(pronto),
    tema: tema.id,
    obstaculo: tema.centro !== "nada",
    k: escalaSprite(ep.sprite ?? 64),
  };
};
