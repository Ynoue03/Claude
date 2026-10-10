// Escolhe a seed de um episódio SÓ pelo ritmo (nunca pelo vencedor) e grava no JSON.
// Testa arena-d20-epNN, arena-d20-epNN-2, -3… e fica com a primeira que passa em:
//   • luta com pelo menos 35 turnos (lutas muito curtas deixam a batalha arrastada)
//   • duelo final com 3 a 8 turnos
//   • nenhum aviso de compressão (turnos rápidos demais)
// Uso: node scripts/escolher-seed.ts src/arena/episodios/ep08.json
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { criarRoteiro } from "../src/arena/roteiro.ts";

export const MIN_TURNOS = 35;
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arq = resolve(raiz, process.argv[2] ?? "src/arena/episodios/ep01.json");
const ep = JSON.parse(readFileSync(arq, "utf8"));
const nn = String(ep.numero).padStart(2, "0");
for (let n = 1; n <= 200; n++) {
  const seed = `arena-d20-ep${nn}${n === 1 ? "" : `-${n}`}`;
  const r = criarRoteiro({ ...ep, seed });
  const turnos = r.sim.turnos.length;
  const duelo = r.turnos.filter((t) => t.t0 >= r.sDuelo).length;
  const motivos = [turnos < MIN_TURNOS ? `${turnos} turnos (< ${MIN_TURNOS})` : "", duelo < 3 || duelo > 8 ? `duelo de ${duelo} turnos` : "", r.avisos.length ? "comprimido" : ""].filter(Boolean);
  console.log(`${seed}: ${motivos.length ? "✗ " + motivos.join(", ") : `✓ ${turnos} turnos, duelo de ${duelo}`}`);
  if (!motivos.length) {
    ep.seed = seed;
    writeFileSync(arq, JSON.stringify(ep, null, 2) + "\n");
    console.log(`→ seed gravada em ${arq}`);
    process.exit(0);
  }
}
console.error("nenhuma seed passou nas 200 tentativas");
process.exit(1);
