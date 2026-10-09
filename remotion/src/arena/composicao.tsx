import React from "react";
import { Composition, Folder, Still } from "remotion";
import { ArenaPixel } from "./Arena";
import { FolhaSprites } from "./Folha";
import padrao from "./arena-padrao.json";
import { FPS, TOTAL } from "./tempo";
import type { Episodio } from "./tipos";

export const arenaPadrao = padrao as Episodio;

export const ArenaComposition: React.FC = () => (
  <Folder name="Arena">
    <Composition
      id="AnimePixelArena"
      component={ArenaPixel}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={arenaPadrao}
    />
    <Still id="ArenaSprites" component={FolhaSprites} width={1080} height={1920} defaultProps={arenaPadrao} />
  </Folder>
);
