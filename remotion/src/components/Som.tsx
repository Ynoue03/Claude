import React, { createContext, useContext } from "react";
import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile, useVideoConfig } from "remotion";

// Liga/desliga todos os efeitos de um vídeo (prop `sfx` do template).
export const SomAtivo = createContext(true);

// Volumes de mixagem de cada efeito (arquivos normalizados em -3 dBFS de pico).
// Ajuste aqui para mudar o equilíbrio em todos os vídeos de uma vez.
export const mix = {
  transicao: 0.5,
  ar: 0.4,
  tique: 0.6,
  bolha: 0.55,
  escrita: 0.6,
  salvar: 0.6,
  sino: 0.85,
  brilho: 0.7,
  cartao: 0.55,
};

// Toca um efeito de public/audio/sfx/ em `em` segundos (relativo à cena onde está).
export const Som: React.FC<{ arquivo: string; em: number; volume: number }> = ({
  arquivo,
  em,
  volume,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const ativo = useContext(SomAtivo);
  if (!ativo) return null;
  const inicio = Math.max(0, Math.round(em * fps));
  return (
    <Sequence from={inicio} layout="none" name={`♪ ${arquivo}`}>
      <Audio
        src={staticFile(`audio/sfx/${arquivo}`)}
        // fade nos últimos 0,8 s da cena/vídeo: caudas longas (sino) nunca terminam cortadas
        volume={(f) =>
          volume *
          interpolate(
            inicio + f,
            [durationInFrames - 0.8 * fps, durationInFrames - 1],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )
        }
      />
    </Sequence>
  );
};

// O pico do whoosh de transição fica em 0,45 s do arquivo: alinha ao meio do corte.
export const PICO_TRANSICAO = 0.45;
