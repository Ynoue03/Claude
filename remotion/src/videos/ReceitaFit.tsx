import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { colors, ease, fonts, safe } from "../brand";
import { montarCenas } from "../cenas";
import { Anel } from "../components/Anel";
import { Backdrop } from "../components/Backdrop";
import { Chrome } from "../components/Chrome";
import { GhostWord } from "../components/GhostWord";
import { Grain } from "../components/Grain";
import { Kicker } from "../components/Kicker";
import { Vazamentos } from "../components/LightLeak";
import { LineIcon, icones } from "../components/LineIcon";
import { Reveal } from "../components/Reveal";
import { mix, PICO_TRANSICAO, Som, SomAtivo } from "../components/Som";
import { softRise } from "../components/SoftRise";
import { Trilha } from "../components/Trilha";
import { WordReveal } from "../components/WordReveal";
import type { ReceitaProps } from "../data/receita";

const duracoes = (p: ReceitaProps) => [
  3.4,
  1.6 + p.ingredientes.length * 0.5 + 2.2,
  4.4,
  3,
];
const TRANSICAO = 0.7;

export const receitaDuration = (p: ReceitaProps, fps: number) =>
  montarCenas(duracoes(p), TRANSICAO, fps).total;

const Cena: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      padding: `${safe.top}px ${safe.x}px ${safe.bottom}px`,
      justifyContent: "center",
    }}
  >
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

const Intro: React.FC<ReceitaProps> = ({ titulo: texto, subtitulo }) => (
  <AbsoluteFill>
    <Backdrop tom={colors.cream} />
    <GhostWord text="receita" color={colors.sand} />
    <Cena>
      <LineIcon
        path={icones.tigela}
        color={colors.clay}
        size={120}
        delay={0.1}
      />
      <div style={{ height: 36 }} />
      <Kicker delay={0.2}>
        <Reveal delay={0.3} distance={16}>
          Receita fit
        </Reveal>
      </Kicker>
      <WordReveal
        text={texto}
        delay={0.45}
        style={{ ...titulo, fontSize: 156, marginTop: 34 }}
      />
      <Reveal delay={1.3} distance={24}>
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 300,
            fontSize: 46,
            color: colors.muted,
            marginTop: 56,
          }}
        >
          {subtitulo}
        </div>
      </Reveal>
    </Cena>
    <Som arquivo="ar.wav" em={0.35} volume={mix.ar} />
  </AbsoluteFill>
);

const Item: React.FC<{ texto: string; delay: number }> = ({ texto, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame: frame - delay * fps,
    fps,
    config: { damping: 14, stiffness: 160 },
  });
  // Quantidade inicial ("120 g", "½") em destaque, resto em peso leve
  const m = texto.match(
    /^([\d½¼¾.,]+\s?(g|ml|kg|colheres?|xícaras?)?\s?(de)?)\s(.*)$/i,
  );
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 34,
        padding: "24px 0",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.sage,
          scale: String(pop),
        }}
      />
      <Reveal delay={delay + 0.05} distance={24}>
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: 50,
            color: colors.ink,
            letterSpacing: -0.5,
          }}
        >
          {m ? (
            <>
              <span style={{ fontWeight: 700 }}>
                {m[1].replace(/\s?de$/, "")}
              </span>
              <span style={{ fontWeight: 300 }}>
                {m[3] ? " de " : " "}
                {m[4]}
              </span>
            </>
          ) : (
            <span style={{ fontWeight: 500 }}>{texto}</span>
          )}
        </span>
      </Reveal>
    </div>
  );
};

const Ingredientes: React.FC<ReceitaProps> = ({ ingredientes }) => (
  <AbsoluteFill>
    <Backdrop tom={colors.sand} />
    <Cena>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Kicker delay={0.1}>
          <Reveal delay={0.2} distance={16}>
            Ingredientes
          </Reveal>
        </Kicker>
        <Reveal delay={0.3} distance={16}>
          <LineIcon
            path={icones.folha}
            color={colors.olive}
            size={80}
            delay={0.3}
          />
        </Reveal>
      </div>
      <div style={{ marginTop: 40 }}>
        {ingredientes.map((item, i) => (
          <Item key={item} texto={item} delay={0.5 + i * 0.5} />
        ))}
      </div>
    </Cena>
    {/* um "pop" por marcador, cada vez um pouco mais agudo */}
    {ingredientes.map((item, i) => (
      <Som
        key={item}
        arquivo={`bolha-${(i % 8) + 1}.wav`}
        em={0.5 + i * 0.5}
        volume={mix.bolha}
      />
    ))}
  </AbsoluteFill>
);

const Macros: React.FC<ReceitaProps> = ({ macros }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const linhas = [
    {
      rotulo: "Proteína",
      g: macros.proteina,
      kcal: macros.proteina * 4,
      cor: colors.clay,
    },
    {
      rotulo: "Carboidrato",
      g: macros.carbo,
      kcal: macros.carbo * 4,
      cor: colors.sage,
    },
    {
      rotulo: "Gordura",
      g: macros.gordura,
      kcal: macros.gordura * 9,
      cor: colors.olive,
    },
  ];
  return (
    <AbsoluteFill>
      <Backdrop tom={colors.cream} />
      <Cena>
        <Kicker delay={0.1}>
          <Reveal delay={0.2} distance={16}>
            Por porção
          </Reveal>
        </Kicker>
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 50 }}
        >
          <Reveal delay={0.2} distance={30}>
            <Anel
              kcal={macros.kcal}
              fatias={linhas.map((l) => ({ valor: l.kcal, cor: l.cor }))}
              delay={0.3}
            />
          </Reveal>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 70,
          }}
        >
          {linhas.map((l, i) => (
            <Reveal key={l.rotulo} delay={1.0 + i * 0.15} distance={24}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: l.cor,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontWeight: 300,
                      fontSize: 34,
                      color: colors.muted,
                    }}
                  >
                    {l.rotulo}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: 700,
                    fontSize: 64,
                    color: colors.ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {Math.round(
                    l.g *
                      interpolate(
                        frame,
                        [(1.0 + i * 0.15) * fps, (2.2 + i * 0.15) * fps],
                        [0, 1],
                        {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                          easing: ease.out,
                        },
                      ),
                  )}
                  <span
                    style={{
                      fontWeight: 300,
                      fontSize: 40,
                      color: colors.muted,
                    }}
                  >
                    {" "}
                    g
                  </span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </Cena>
      {/* cintilar enquanto o anel se preenche */}
      <Som arquivo="brilho.wav" em={0.3} volume={mix.brilho} />
    </AbsoluteFill>
  );
};

const Cta: React.FC<ReceitaProps> = () => (
  <AbsoluteFill>
    <Backdrop tom={colors.olive} escuro />
    <Cena>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <LineIcon
          path={icones.salvar}
          color={colors.sand}
          size={120}
          delay={0.1}
          duration={1}
        />
        <WordReveal
          text="Salve e faça hoje à noite"
          delay={0.3}
          style={{
            ...titulo,
            color: colors.cream,
            fontSize: 132,
            marginTop: 50,
            lineHeight: 1.04,
          }}
        />
        <Reveal delay={1.1} distance={20}>
          <div
            style={{
              fontFamily: fonts.body,
              fontWeight: 300,
              fontSize: 40,
              color: colors.sand,
              marginTop: 50,
            }}
          >
            e conte nos comentários como ficou
          </div>
        </Reveal>
      </div>
    </Cena>
    <Som arquivo="salvar.wav" em={0.75} volume={mix.salvar} />
    <Som arquivo="sino-receita.wav" em={1.05} volume={mix.sino} />
  </AbsoluteFill>
);

export const ReceitaFit: React.FC<ReceitaProps> = (props) => {
  const { fps } = useVideoConfig();
  const c = montarCenas(duracoes(props), TRANSICAO, fps);
  const transicao = (
    <TransitionSeries.Transition
      presentation={softRise()}
      timing={linearTiming({
        durationInFrames: c.transicao,
        easing: ease.inOut,
      })}
    />
  );
  const cenas = [Intro, Ingredientes, Macros, Cta];
  return (
    <SomAtivo.Provider value={props.sfx !== false}>
      <AbsoluteFill style={{ backgroundColor: colors.cream }}>
        <TransitionSeries>
          {cenas.map((C, i) => (
            <React.Fragment key={i}>
              {i > 0 ? transicao : null}
              <TransitionSeries.Sequence
                durationInFrames={c.frames[i]}
                premountFor={fps}
              >
                <C {...props} />
              </TransitionSeries.Sequence>
            </React.Fragment>
          ))}
        </TransitionSeries>
        <Vazamentos inicios={c.inicios} duracao={c.transicao} />
        <Chrome
          handle={props.handle}
          rotulo="Receita"
          inicios={c.inicios}
          escuras={[3]}
        />
        <Grain />
        <Trilha
          arquivo={props.musica}
          volume={props.musicaVolume ?? 0.6}
          abaixarEm={c.inicios[c.inicios.length - 1] + c.transicao}
        />
        {c.inicios.slice(1).map((f) => (
          <Som
            key={f}
            arquivo="transicao.wav"
            em={(f + c.transicao / 2) / fps - PICO_TRANSICAO}
            volume={mix.transicao}
          />
        ))}
      </AbsoluteFill>
    </SomAtivo.Provider>
  );
};
