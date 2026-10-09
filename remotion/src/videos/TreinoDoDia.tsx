import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { colors, ease, fonts, safe } from "../brand";
import { montarCenas } from "../cenas";
import { Backdrop } from "../components/Backdrop";
import { Chrome } from "../components/Chrome";
import { TextoComDestaque } from "../components/Destaque";
import { GhostWord } from "../components/GhostWord";
import { Grain } from "../components/Grain";
import { Kicker } from "../components/Kicker";
import { Vazamentos } from "../components/LightLeak";
import { LineIcon, icones } from "../components/LineIcon";
import { Reveal } from "../components/Reveal";
import { softRise } from "../components/SoftRise";
import { Trilha } from "../components/Trilha";
import { WordReveal } from "../components/WordReveal";
import type { TreinoProps } from "../data/treino";

// Duração de cada cena em segundos (a lista cresce com o nº de exercícios)
const duracoes = (p: TreinoProps) => [3.4, 1.6 + p.exercicios.length * 0.55 + 2.2, 3.6, 3];
const TRANSICAO = 0.7;

export const treinoDuration = (p: TreinoProps, fps: number) => montarCenas(duracoes(p), TRANSICAO, fps).total;

const Cena: React.FC<{ children: React.ReactNode; justify?: React.CSSProperties["justifyContent"] }> = ({
  children,
  justify = "center",
}) => (
  <AbsoluteFill style={{ padding: `${safe.top}px ${safe.x}px ${safe.bottom}px`, justifyContent: justify }}>
    {children}
  </AbsoluteFill>
);

const titulo: React.CSSProperties = {
  fontFamily: fonts.display,
  fontStyle: "italic",
  fontWeight: 500,
  color: colors.ink,
  lineHeight: 0.98,
  letterSpacing: -2,
};

const Intro: React.FC<TreinoProps> = ({ titulo: texto, subtitulo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Backdrop tom={colors.cream} />
      <GhostWord text="treino" color={colors.sand} />
      <Cena>
        <LineIcon path={icones.halter} color={colors.clay} size={110} delay={0.1} />
        <div style={{ height: 40 }} />
        <Kicker delay={0.2}>
          <Reveal delay={0.3} distance={16}>Treino do dia</Reveal>
        </Kicker>
        <WordReveal text={texto} delay={0.45} style={{ ...titulo, fontSize: 168, marginTop: 34 }} />
        <div
          style={{
            height: 2,
            backgroundColor: colors.clay,
            marginTop: 56,
            width: `${interpolate(frame, [1.0 * fps, 2.0 * fps], [0, 100], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.inOut,
            })}%`,
          }}
        />
        <Reveal delay={1.3} distance={24}>
          <div style={{ fontFamily: fonts.body, fontWeight: 300, fontSize: 46, color: colors.muted, marginTop: 40 }}>
            {subtitulo}
          </div>
        </Reveal>
      </Cena>
    </AbsoluteFill>
  );
};

const Linha: React.FC<{ indice: number; nome: string; series: string; delay: number }> = ({
  indice,
  nome,
  series,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opts = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out } as const;
  return (
    <div style={{ position: "relative", padding: "30px 0" }}>
      <Reveal delay={delay} distance={26}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 34 }}>
          <span style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: 64, color: colors.clay, width: 72 }}>
            {String(indice + 1).padStart(2, "0")}
          </span>
          <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 48, color: colors.ink, flex: 1, letterSpacing: -0.5 }}>
            {nome}
          </span>
          <span
            style={{
              fontFamily: fonts.body,
              fontWeight: 500,
              fontSize: 34,
              color: colors.ink,
              border: `1.5px solid ${colors.clay}`,
              borderRadius: 999,
              padding: "10px 24px",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {series}
          </span>
        </div>
      </Reveal>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 1.5,
          backgroundColor: `${colors.clay}66`,
          width: `${interpolate(frame, [(delay + 0.1) * fps, (delay + 0.9) * fps], [0, 100], opts)}%`,
        }}
      />
    </div>
  );
};

const Lista: React.FC<TreinoProps> = ({ exercicios }) => (
  <AbsoluteFill>
    <Backdrop tom={colors.sand} />
    <Cena>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Kicker delay={0.1}>
          <Reveal delay={0.2} distance={16}>Exercícios</Reveal>
        </Kicker>
        <Reveal delay={0.3} distance={16}>
          <span style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: 54, color: colors.clayDark }}>
            {exercicios.length} movimentos
          </span>
        </Reveal>
      </div>
      <div style={{ marginTop: 40 }}>
        {exercicios.map((ex, i) => (
          <Linha key={ex.nome} indice={i} nome={ex.nome} series={ex.series} delay={0.5 + i * 0.55} />
        ))}
      </div>
    </Cena>
  </AbsoluteFill>
);

const Dica: React.FC<TreinoProps> = ({ dica, dicaDestaque }) => (
  <AbsoluteFill>
    <Backdrop tom={colors.olive} escuro />
    <Cena>
      <Reveal distance={20}>
        <div style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: 300, lineHeight: 0.6, color: colors.clay, height: 150 }}>
          “
        </div>
      </Reveal>
      <Kicker color={colors.sand} delay={0.2}>
        <Reveal delay={0.3} distance={16}>Dica de execução</Reveal>
      </Kicker>
      <TextoComDestaque
        texto={dica}
        destaque={dicaDestaque}
        cor={colors.clay}
        delay={0.5}
        style={{ ...titulo, color: colors.cream, fontSize: 112, lineHeight: 1.06, marginTop: 36, letterSpacing: -1 }}
      />
    </Cena>
  </AbsoluteFill>
);

const Cta: React.FC<TreinoProps> = () => (
  <AbsoluteFill>
    <Backdrop tom={colors.cream} />
    <Cena>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <LineIcon path={icones.salvar} color={colors.clay} size={120} delay={0.1} duration={1} />
        <WordReveal text="Salve para o próximo treino" delay={0.3} style={{ ...titulo, fontSize: 132, marginTop: 50, lineHeight: 1.04 }} />
        <Reveal delay={1.1} distance={20}>
          <div style={{ fontFamily: fonts.body, fontWeight: 300, fontSize: 40, color: colors.muted, marginTop: 50 }}>
            e mande para quem treina com você
          </div>
        </Reveal>
      </div>
    </Cena>
  </AbsoluteFill>
);

export const TreinoDoDia: React.FC<TreinoProps> = (props) => {
  const { fps } = useVideoConfig();
  const c = montarCenas(duracoes(props), TRANSICAO, fps);
  const transicao = (
    <TransitionSeries.Transition presentation={softRise()} timing={linearTiming({ durationInFrames: c.transicao, easing: ease.inOut })} />
  );
  const cenas = [Intro, Lista, Dica, Cta];

  return (
    <AbsoluteFill style={{ backgroundColor: colors.cream }}>
      <TransitionSeries>
        {cenas.map((C, i) => (
          <React.Fragment key={i}>
            {i > 0 ? transicao : null}
            <TransitionSeries.Sequence durationInFrames={c.frames[i]} premountFor={fps}>
              <C {...props} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
      <Vazamentos inicios={c.inicios} duracao={c.transicao} />
      <Chrome handle={props.handle} rotulo="Treino" inicios={c.inicios} escuras={[2]} />
      <Grain />
      <Trilha arquivo={props.musica} />
    </AbsoluteFill>
  );
};
