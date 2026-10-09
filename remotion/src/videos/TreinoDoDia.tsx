import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors, ease, fonts, safe } from "../brand";
import { Grain } from "../components/Grain";
import { Kicker } from "../components/Kicker";
import { Reveal } from "../components/Reveal";
import type { TreinoProps } from "../data/treino";

// Duração de cada cena em segundos (a lista cresce com o nº de exercícios)
export const treinoTiming = (n: number) => ({
  intro: 3,
  lista: 1.5 + n * 0.6 + 2,
  dica: 3,
  cta: 2.5,
  transicao: 0.5,
});

export const treinoDuration = (p: TreinoProps, fps: number) => {
  const t = treinoTiming(p.exercicios.length);
  return Math.round((t.intro + t.lista + t.dica + t.cta - 3 * t.transicao) * fps);
};

const Fundo: React.FC<{ tom?: string; children: React.ReactNode }> = ({
  tom = colors.cream,
  children,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: tom,
      padding: `${safe.top}px ${safe.x}px ${safe.bottom}px`,
      justifyContent: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

const Intro: React.FC<TreinoProps> = ({ titulo, subtitulo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Fundo>
      <Reveal>
        <Kicker>Treino do dia</Kicker>
      </Reveal>
      <Reveal delay={0.25}>
        <div
          style={{
            fontFamily: fonts.display,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 150,
            lineHeight: 1.0,
            color: colors.ink,
            marginTop: 30,
          }}
        >
          {titulo}
        </div>
      </Reveal>
      <div
        style={{
          height: 2,
          backgroundColor: colors.clay,
          marginTop: 50,
          width: `${interpolate(frame, [0.7 * fps, 1.7 * fps], [0, 100], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease.inOut,
          })}%`,
        }}
      />
      <Reveal delay={0.9}>
        <div style={{ fontFamily: fonts.body, fontWeight: 300, fontSize: 46, color: colors.muted, marginTop: 40 }}>
          {subtitulo}
        </div>
      </Reveal>
    </Fundo>
  );
};

const Lista: React.FC<TreinoProps> = ({ exercicios }) => (
  <Fundo tom={colors.sand}>
    <Reveal>
      <Kicker>Exercícios</Kicker>
    </Reveal>
    <div style={{ marginTop: 50 }}>
      {exercicios.map((ex, i) => (
        <Reveal key={ex.nome} delay={0.4 + i * 0.6} distance={30}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 36,
              padding: "34px 0",
              borderBottom: `1.5px solid ${colors.clay}55`,
            }}
          >
            <span style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: 64, color: colors.clay, width: 70 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 50, color: colors.ink, flex: 1 }}>
              {ex.nome}
            </span>
            <span style={{ fontFamily: fonts.body, fontWeight: 300, fontSize: 44, color: colors.muted }}>
              {ex.series}
            </span>
          </div>
        </Reveal>
      ))}
    </div>
  </Fundo>
);

const Dica: React.FC<TreinoProps> = ({ dica }) => (
  <Fundo tom={colors.olive}>
    <Reveal>
      <Kicker color={colors.sand}>Dica</Kicker>
    </Reveal>
    <Reveal delay={0.3}>
      <div
        style={{
          fontFamily: fonts.display,
          fontStyle: "italic",
          fontSize: 110,
          lineHeight: 1.08,
          color: colors.cream,
          marginTop: 30,
        }}
      >
        “{dica}”
      </div>
    </Reveal>
  </Fundo>
);

const Cta: React.FC<TreinoProps> = ({ handle }) => (
  <Fundo>
    <div style={{ textAlign: "center" }}>
      <Reveal>
        <div style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: 120, color: colors.ink, lineHeight: 1.05 }}>
          Salve para o
          <br />
          próximo treino
        </div>
      </Reveal>
      <Reveal delay={0.5}>
        <div style={{ marginTop: 60 }}>
          <Kicker color={colors.clay}>{handle}</Kicker>
        </div>
      </Reveal>
    </div>
  </Fundo>
);

export const TreinoDoDia: React.FC<TreinoProps> = (props) => {
  const { fps } = useVideoConfig();
  const t = treinoTiming(props.exercicios.length);
  const transicao = <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: Math.round(t.transicao * fps) })} />;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.cream }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={Math.round(t.intro * fps)} premountFor={fps}>
          <Intro {...props} />
        </TransitionSeries.Sequence>
        {transicao}
        <TransitionSeries.Sequence durationInFrames={Math.round(t.lista * fps)} premountFor={fps}>
          <Lista {...props} />
        </TransitionSeries.Sequence>
        {transicao}
        <TransitionSeries.Sequence durationInFrames={Math.round(t.dica * fps)} premountFor={fps}>
          <Dica {...props} />
        </TransitionSeries.Sequence>
        {transicao}
        <TransitionSeries.Sequence durationInFrames={Math.round(t.cta * fps)} premountFor={fps}>
          <Cta {...props} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Grain />
    </AbsoluteFill>
  );
};
