import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { colors, ease, fonts, safe } from "../brand";
import { Grain } from "../components/Grain";
import { Kicker } from "../components/Kicker";
import { Reveal } from "../components/Reveal";
import type { ReceitaProps } from "../data/receita";

export const receitaTiming = (n: number) => ({
  intro: 3,
  ingredientes: 1.5 + n * 0.5 + 2,
  macros: 4,
  cta: 2.5,
  transicao: 0.6,
});

export const receitaDuration = (p: ReceitaProps, fps: number) => {
  const t = receitaTiming(p.ingredientes.length);
  return Math.round((t.intro + t.ingredientes + t.macros + t.cta - 3 * t.transicao) * fps);
};

const Fundo: React.FC<{ tom?: string; children: React.ReactNode }> = ({ tom = colors.cream, children }) => (
  <AbsoluteFill style={{ backgroundColor: tom, padding: `${safe.top}px ${safe.x}px ${safe.bottom}px`, justifyContent: "center" }}>
    {children}
  </AbsoluteFill>
);

const Intro: React.FC<ReceitaProps> = ({ titulo, subtitulo }) => (
  <Fundo>
    <Reveal>
      <Kicker>Receita fit</Kicker>
    </Reveal>
    <Reveal delay={0.25}>
      <div style={{ fontFamily: fonts.display, fontStyle: "italic", fontWeight: 500, fontSize: 140, lineHeight: 1.0, color: colors.ink, marginTop: 30 }}>
        {titulo}
      </div>
    </Reveal>
    <Reveal delay={0.8}>
      <div style={{ fontFamily: fonts.body, fontWeight: 300, fontSize: 46, color: colors.muted, marginTop: 50 }}>{subtitulo}</div>
    </Reveal>
  </Fundo>
);

const Ingredientes: React.FC<ReceitaProps> = ({ ingredientes }) => (
  <Fundo tom={colors.sand}>
    <Reveal>
      <Kicker>Ingredientes</Kicker>
    </Reveal>
    <div style={{ marginTop: 50 }}>
      {ingredientes.map((item, i) => (
        <Reveal key={item} delay={0.4 + i * 0.5} distance={30}>
          <div style={{ display: "flex", alignItems: "center", gap: 32, padding: "26px 0" }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.sage }} />
            <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 52, color: colors.ink }}>{item}</span>
          </div>
        </Reveal>
      ))}
    </div>
  </Fundo>
);

const Barra: React.FC<{ rotulo: string; valor: number; max: number; cor: string; delay: number }> = ({ rotulo, valor, max, cor, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [delay * fps, (delay + 1.2) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.out,
  });
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.body, fontSize: 44, color: colors.ink }}>
        <span style={{ fontWeight: 300 }}>{rotulo}</span>
        <span style={{ fontWeight: 700 }}>{Math.round(valor * p)} g</span>
      </div>
      <div style={{ height: 14, borderRadius: 7, backgroundColor: `${colors.ink}14`, marginTop: 18, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 7, backgroundColor: cor, width: `${(valor / max) * 100 * p}%` }} />
      </div>
    </div>
  );
};

const Macros: React.FC<ReceitaProps> = ({ macros }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(macros.proteina, macros.carbo, macros.gordura);
  const kcal = interpolate(frame, [0.3 * fps, 1.8 * fps], [0, macros.kcal], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.out,
  });
  return (
    <Fundo>
      <Reveal>
        <Kicker>Por porção</Kicker>
      </Reveal>
      <Reveal delay={0.2}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 20 }}>
          <span style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: 260, color: colors.ink, lineHeight: 1.1, fontVariantNumeric: "lining-nums" }}>{Math.round(kcal)}</span>
          <span style={{ fontFamily: fonts.body, fontWeight: 300, fontSize: 56, color: colors.muted }}>kcal</span>
        </div>
      </Reveal>
      <Barra rotulo="Proteína" valor={macros.proteina} max={max} cor={colors.clay} delay={0.8} />
      <Barra rotulo="Carboidrato" valor={macros.carbo} max={max} cor={colors.sage} delay={1.0} />
      <Barra rotulo="Gordura" valor={macros.gordura} max={max} cor={colors.olive} delay={1.2} />
    </Fundo>
  );
};

const Cta: React.FC<ReceitaProps> = ({ handle }) => (
  <Fundo tom={colors.olive}>
    <div style={{ textAlign: "center" }}>
      <Reveal>
        <div style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: 120, color: colors.cream, lineHeight: 1.05 }}>
          Salve e faça
          <br />
          hoje à noite
        </div>
      </Reveal>
      <Reveal delay={0.5}>
        <div style={{ marginTop: 60 }}>
          <Kicker color={colors.sand}>{handle}</Kicker>
        </div>
      </Reveal>
    </div>
  </Fundo>
);

export const ReceitaFit: React.FC<ReceitaProps> = (props) => {
  const { fps } = useVideoConfig();
  const t = receitaTiming(props.ingredientes.length);
  const transicao = (
    <TransitionSeries.Transition
      presentation={slide({ direction: "from-bottom" })}
      timing={linearTiming({ durationInFrames: Math.round(t.transicao * fps), easing: ease.inOut })}
    />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: colors.cream }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={Math.round(t.intro * fps)} premountFor={fps}>
          <Intro {...props} />
        </TransitionSeries.Sequence>
        {transicao}
        <TransitionSeries.Sequence durationInFrames={Math.round(t.ingredientes * fps)} premountFor={fps}>
          <Ingredientes {...props} />
        </TransitionSeries.Sequence>
        {transicao}
        <TransitionSeries.Sequence durationInFrames={Math.round(t.macros * fps)} premountFor={fps}>
          <Macros {...props} />
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
