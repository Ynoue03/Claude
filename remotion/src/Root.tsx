import { Composition } from "remotion";
import { ReceitaComposition, TreinoComposition } from "./Composition";
import { ArenaFolhas, FOLHA_H, FOLHA_W } from "./arena/Folhas";
import { ArenaD20, ARENA_DURACAO } from "./arena/ArenaD20";
import { CatalogoItens } from "./arena/CatalogoItens";
import ep01 from "./arena/episodios/ep01.json";
import type { Episodio } from "./arena/personagem.ts";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <TreinoComposition />
      <ReceitaComposition />
      {/* ARENA D20: troque o episódio com --props=src/arena/episodios/epNN.json */}
      <Composition id="ArenaD20" component={ArenaD20} durationInFrames={ARENA_DURACAO} fps={30} width={1080} height={1920} defaultProps={ep01 as Episodio} />
      <Composition id="ArenaItens" component={CatalogoItens} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="ArenaFolhas" component={ArenaFolhas} durationInFrames={16} fps={30} width={FOLHA_W} height={FOLHA_H} defaultProps={ep01 as Episodio} />
    </>
  );
};
