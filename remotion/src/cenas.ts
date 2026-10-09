// Converte a duração de cada cena (s) em frames, descontando as transições.
export const montarCenas = (
  duracoes: number[],
  transicao: number,
  fps: number,
) => {
  const frames = duracoes.map((d) => Math.round(d * fps));
  const t = Math.round(transicao * fps);
  const inicios: number[] = [];
  let acc = 0;
  frames.forEach((f, i) => {
    inicios.push(acc);
    acc += f - (i < frames.length - 1 ? t : 0);
  });
  return { frames, transicao: t, inicios, total: acc };
};
