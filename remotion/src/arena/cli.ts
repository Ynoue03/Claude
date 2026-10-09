// Roda a simulação fora do navegador e grava as deixas de áudio (para audio/arena.py).
// Uso (via scripts/arena.sh): node arena-cli.mjs [props.json] [saida.json]
import { readFileSync, writeFileSync } from "node:fs";
import padrao from "./arena-padrao.json";
import { simular } from "./sim";
import { FPS, T, TOTAL } from "./tempo";
import type { Episodio } from "./tipos";

const [, , entrada, saida = "arena-cues.json"] = process.argv;
const extra = entrada ? JSON.parse(readFileSync(entrada, "utf8")) : {};
const ep = { ...(padrao as Episodio), ...extra } as Episodio;
const sim = simular(ep);

const nome = (i: number) => ep.lutadores[i].nome;
writeFileSync(
  saida,
  JSON.stringify(
    {
      fps: FPS,
      quadros: TOTAL,
      marcos: T,
      fimDuelo: sim.fimDuelo,
      vencedor: nome(sim.vencedor),
      cues: sim.cues,
    },
    null,
    1,
  ),
);
console.log(`vencedor: ${nome(sim.vencedor)} · vice: ${nome(sim.vice)}`);
for (const q of sim.quedas) console.log(`  ${(q.f / FPS).toFixed(1).padStart(5)} s  ${nome(q.id)} DEFEATED`);
console.log(`ataques: ${sim.ataques.length} · deixas de som: ${sim.cues.length}`);
