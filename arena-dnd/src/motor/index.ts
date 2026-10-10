import { criarRng, embaralhar } from "./dados";
import { criarFicha, Entrada, Ficha, NOMES } from "./personagem";
import { CLASSES, ClasseId, ESPECIES, EspecieId } from "./srd";
import { Episodio, montarEpisodio } from "./episodio";

export const TOTAL_LUTADORES = 16;

// Props do vídeo: só a semente e quem luta. Todo o resto é recalculado (determinístico).
export type PropsBatalha = {
  semente: number;
  titulo?: string; // ex.: "ARENA D20 #12"
  perfil?: string; // @ da conta, aparece no fim
  lutadores: Entrada[]; // até 16 (o campeão anterior vem com `ficha`); o que faltar é sorteado
};

// Sorteio equilibrado: todas as 12 classes aparecem (no máx. 2 iguais) e no máx. 3 da mesma espécie.
export const montarFichas = (props: PropsBatalha): Ficha[] => {
  const rng = criarRng(props.semente);
  const entradas: Entrada[] = props.lutadores.slice(0, TOTAL_LUTADORES).map((e) => ({ ...e }));
  const usados = new Set(entradas.map((e) => e.nome.toLowerCase()));
  const livres = embaralhar(rng, NOMES.filter((n) => !usados.has(n.toLowerCase())));
  while (entradas.length < TOTAL_LUTADORES) entradas.push({ nome: livres.shift() ?? `Herói ${entradas.length + 1}` });

  // primeiro cria quem já tem classe/espécie definidas (campeão, descrição), depois distribui o resto
  const fichas: (Ficha | null)[] = entradas.map((e, i) => (e.ficha ? { ...e.ficha, id: i } : e.descricao ? criarFicha(e, i, props.semente) : null));
  const contaClasse: Record<string, number> = {};
  const contaEspecie: Record<string, number> = {};
  for (const f of fichas) if (f) {
    contaClasse[f.classe] = (contaClasse[f.classe] ?? 0) + 1;
    contaEspecie[f.especie] = (contaEspecie[f.especie] ?? 0) + 1;
  }
  const classes = Object.keys(CLASSES) as ClasseId[];
  const especies = Object.keys(ESPECIES) as EspecieId[];
  const faltam = embaralhar(rng, classes.filter((c) => !contaClasse[c]));
  return fichas.map((f, i) => {
    if (f) return f;
    const classe = faltam.shift() ?? embaralhar(rng, classes).find((c) => (contaClasse[c] ?? 0) < 2) ?? classes[0];
    const especie = embaralhar(rng, especies).find((s) => (contaEspecie[s] ?? 0) < 3) ?? especies[0];
    contaClasse[classe] = (contaClasse[classe] ?? 0) + 1;
    contaEspecie[especie] = (contaEspecie[especie] ?? 0) + 1;
    return criarFicha({ ...entradas[i], classe, especie }, i, props.semente);
  });
};

const cache = new Map<string, Episodio>();
export const batalhar = (props: PropsBatalha): Episodio => {
  const chave = JSON.stringify(props);
  const salvo = cache.get(chave);
  if (salvo) return salvo;
  const r = montarEpisodio(montarFichas(props), props.semente);
  cache.set(chave, r);
  return r;
};

export type { Entrada, Ficha, Episodio };
