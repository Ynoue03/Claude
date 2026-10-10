// Renderiza quadros soltos em PNG (conferência): npx tsx scripts/quadros.ts 0 150 900 ...
import ep from "../src/arena/episodios/episodio-1.json";
import { Episodio } from "../src/arena/episodio";
import { desenharQuadro, prepararCena } from "../src/arena/render/quadro";
import { Prancha } from "./png";
const c = prepararCena(ep as unknown as Episodio);
const dir = process.env.OUT ?? "/tmp/claude-0/q";
for (const a of process.argv.slice(2)) {
  const g = Number(a);
  const t = Date.now();
  const b = desenharQuadro(c, g);
  const p = new Prancha(360, 640); p.rgba.set(b.d); p.salvar(`${dir}-${g}.png`, 2);
  console.log(g, Date.now() - t, "ms");
}
