import { criarRng, embaralhar } from "./dados";
import { criarFicha, Entrada, Ficha, NOMES } from "./personagem";
import { simular, Resultado } from "./batalha";

export const TOTAL_LUTADORES = 10;

// Props do vídeo: só a semente e quem luta. Todo o resto é recalculado (determinístico).
export type PropsBatalha = {
  semente: number;
  titulo?: string; // ex.: "BATALHA #12"
  perfil?: string; // @ da conta, aparece no fim
  lutadores: Entrada[]; // até 10; o que faltar é sorteado
};

export const montarFichas = (props: PropsBatalha): Ficha[] => {
  const rng = criarRng(props.semente);
  const usados = new Set(props.lutadores.map((e) => e.nome.toLowerCase()));
  const livres = embaralhar(rng, NOMES.filter((n) => !usados.has(n.toLowerCase())));
  const entradas: Entrada[] = props.lutadores.slice(0, TOTAL_LUTADORES);
  while (entradas.length < TOTAL_LUTADORES) entradas.push({ nome: livres[entradas.length] ?? `Herói ${entradas.length + 1}` });
  return entradas.map((e, i) => criarFicha(e, i, props.semente));
};

const cache = new Map<string, Resultado>();
export const batalhar = (props: PropsBatalha): Resultado => {
  const chave = JSON.stringify(props);
  const salvo = cache.get(chave);
  if (salvo) return salvo;
  const r = simular(montarFichas(props), props.semente);
  cache.set(chave, r);
  return r;
};

export type { Entrada, Ficha, Resultado };
