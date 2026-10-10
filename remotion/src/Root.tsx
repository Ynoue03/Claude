import { ArenaComposition, ReceitaComposition, TreinoComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <TreinoComposition />
      <ReceitaComposition />
      <ArenaComposition />
    </>
  );
};
