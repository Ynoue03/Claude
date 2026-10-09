import { ReceitaComposition, TreinoComposition } from "./Composition";
import { ArenaComposition } from "./arena/composicao";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <TreinoComposition />
      <ReceitaComposition />
      <ArenaComposition />
    </>
  );
};
