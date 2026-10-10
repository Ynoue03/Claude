// Tipo do JSON editável de cada episódio + montagem (fichas → luta).
import { simular } from "./sim/combate";
import { EntradaLutador, FichaSalva, Lutador, sortearElenco } from "./sim/ficha";
import { subirNivel } from "./sim/nivel";
import { montarLinha } from "./linha";

export type Episodio = {
  numero: number;
  seed: number;
  perfil: string;
  lutadores: EntradaLutador[];
  campeaoAnterior: FichaSalva | null;
  textos: {
    intro: string;
    lutem: string;
    caiu: string;
    vitoria: string;
    subiu: string;
    defende: string;
    cta1: string;
    cta2: string;
    cta3: string;
  };
};

export const montarEpisodio = (ep: Episodio) => {
  const { lutadores, dados } = sortearElenco(ep.seed, ep.lutadores, ep.campeaoAnterior);
  const fichasIniciais: Lutador[] = JSON.parse(JSON.stringify(lutadores));
  const resultado = simular(lutadores, dados);
  const subida = subirNivel(fichasIniciais[resultado.vencedor], dados, resultado, fichasIniciais, ep.seed);
  const linha = montarLinha(resultado, fichasIniciais);
  return { lutadores, fichasIniciais, resultado, dados, subida, linha };
};
