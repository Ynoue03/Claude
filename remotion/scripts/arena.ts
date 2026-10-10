// Prepara um episódio do ARENA D20: eventos de som, ficha de texto, ficha nova do campeão e sprite sheets.
// Uso: npx tsx scripts/arena.ts [src/arena/episodios/episodio-1.json]
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { Episodio } from "../src/arena/episodio";
import { prepararCena } from "../src/arena/render/quadro";
import { listarSons } from "../src/arena/render/sons";
import { T } from "../src/arena/linha";
import { Anim, Dir, EXPRESSOES, gerarMini, gerarRetrato, gerarSprite, QUADROS } from "../src/arena/arte/sprite";
import { Lutador, atqArma, cdMagia, prof } from "../src/arena/sim/ficha";
import { ATRIBUTOS, CLASSE, ESPECIE } from "../src/arena/sim/tabelas";
import { mod, sinal } from "../src/arena/sim/rng";
import { Prancha } from "./png";

const raiz = resolve(__dirname, "..");
const arq = resolve(process.argv[2] ?? join(raiz, "src/arena/episodios/episodio-1.json"));
const ep: Episodio = JSON.parse(readFileSync(arq, "utf8"));
const c = prepararCena(ep);
const n = ep.numero;
const pasta = join(raiz, "entregas", `arena-d20-${n}`);
mkdirSync(join(pasta, "sprites"), { recursive: true });
mkdirSync(join(raiz, "public/arena"), { recursive: true });

// ── 1) eventos de som ──
const sons = listarSons(c);
const gotas: number[] = [];
c.arena.pocas.forEach((_, k) => {
  const ciclo = 70 + k * 13;
  for (let f = 0; f < T.fim; f++) if ((f + k * 31) % ciclo === 14) gotas.push(f);
});
writeFileSync(
  join(raiz, `public/arena/episodio-${n}.sons.json`),
  JSON.stringify({ fps: 30, quadros: T.fim, marcos: { batalha: T.batalha, duelo: c.L.temDuelo ? T.duelo : null, vencedor: T.vencedor, pergaminho: T.pergaminho, cta: T.cta }, gotas, sons }, null, 0),
);

// ── 2) sprite sheets e retratos ──
const linhas: { anim: Anim; dir: Dir }[] = [
  ...(["S", "N", "E", "W"] as Dir[]).map((dir) => ({ anim: "idle" as Anim, dir })),
  ...(["S", "N", "E", "W"] as Dir[]).map((dir) => ({ anim: "andar" as Anim, dir })),
  { anim: "ataque", dir: "E" },
  { anim: "ataque", dir: "S" },
  { anim: "magia", dir: "E" },
  { anim: "dano", dir: "E" },
  { anim: "derrota", dir: "S" },
  { anim: "vitoria", dir: "S" },
];
const nome = (l: Lutador) => l.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
for (const l of c.lut) {
  const rows = (linhas.length + 1) * 2;
  const p = new Prancha(48 * 7, 64 * rows, [0, 0, 0, 0]);
  [false, true].forEach((rasgado, bloco) => {
    linhas.forEach((ln, i) => {
      for (let f = 0; f < QUADROS[ln.anim]; f++) {
        const expr = ln.anim === "derrota" ? "derrota" : ln.anim === "vitoria" ? "vitoria" : ln.anim === "dano" ? "dor" : ln.anim === "ataque" ? (f === 2 ? "grito" : "concentrada") : ln.anim === "magia" ? (f >= 3 && f <= 5 ? "grito" : "concentrada") : rasgado ? "pvBaixo" : "neutra";
        p.colar(gerarSprite(l, { anim: ln.anim, f, dir: ln.dir, expr, rasgado }, l.campeaoAnterior), f * 48, (bloco * (linhas.length + 1) + i) * 64);
      }
    });
    EXPRESSOES.forEach((e, f) => p.colar(gerarSprite(l, { anim: "idle", f: 0, dir: "S", expr: e, rasgado }, l.campeaoAnterior), f * 48, (bloco * (linhas.length + 1) + linhas.length) * 64));
  });
  p.salvar(join(pasta, "sprites", `${String(l.id + 1).padStart(2, "0")}-${nome(l)}-sprites.png`));
  const r = new Prancha(96 * 7, 64 + 16, [0, 0, 0, 0]);
  EXPRESSOES.forEach((e, i) => {
    r.colar(gerarRetrato(l, e, l.campeaoAnterior), i * 96, 0);
    r.colar(gerarMini(l, e, l.campeaoAnterior), i * 96 + 40, 64);
  });
  r.salvar(join(pasta, "sprites", `${String(l.id + 1).padStart(2, "0")}-${nome(l)}-retratos.png`));
}
writeFileSync(
  join(pasta, "sprites", "LEIA-ME.md"),
  [
    "# Sprite sheets",
    "",
    "Cada `NN-nome-sprites.png` tem quadros de 48×64 px, um por coluna. Linhas (de cima para baixo):",
    "",
    ...linhas.map((ln, i) => `${i + 1}. ${ln.anim} · direção ${ln.dir} (${QUADROS[ln.anim]} quadros)`),
    `${linhas.length + 1}. as 7 expressões (${EXPRESSOES.join(", ")})`,
    "",
    `As linhas ${linhas.length + 2} a ${(linhas.length + 1) * 2} repetem tudo na versão com roupa rasgada e ferimentos (PV abaixo de 30%).`,
    "",
    "`NN-nome-retratos.png`: retratos 96×64 (cut-in e pergaminho) nas 7 expressões e, embaixo, os retratos 16×16 do HUD.",
  ].join("\n"),
);

// ── 3) ficha de texto do episódio ──
const linhaFicha = (l: Lutador) => {
  const out: string[] = [];
  const ap = l.aparencia;
  out.push(`### ${l.id + 1}. ${l.nome} — ${ESPECIE[l.especie].nome}${l.ancestral ? ` (${l.ancestral})` : ""} · ${CLASSE[l.classe].nome} nível ${l.nivel}${l.autor ? ` · criado por ${l.autor}` : ""}`);
  if (l.descricao) out.push(`> ${l.descricao}`);
  l.tentativas.forEach((t, i) => {
    const sets = t.dados.map((d, k) => {
      const ord = d.slice().sort((a, b) => a - b);
      return `[${d.join(",")}] descarta ${ord[0]} = ${t.totais[k]}`;
    });
    out.push(`- 4d6 (tentativa ${i + 1}): ${sets.join(" · ")}${i < l.tentativas.length - 1 ? " → soma dos modificadores ≤ 0, rola de novo" : ""}`);
  });
  out.push(`- Antecedente: +2 ${l.antecedente[0]}, +1 ${l.antecedente[1]}`);
  out.push(`- Atributos: ${ATRIBUTOS.map((a) => `${a} ${l.atrib[a]} (${sinal(mod(l.atrib[a]))})`).join(" · ")}`);
  out.push(`- PV: ${l.pvTexto}`);
  out.push(`- CA ${l.ca} (${l.caTexto}) · deslocamento ${l.desloc} pés`);
  out.push(`- Arma: ${l.arma.nome} ${l.arma.n}d${l.arma.d} (${l.arma.tipo}) · ataque ${sinal(atqArma(l))}${CLASSE[l.classe].conjura ? ` · CD de magia ${cdMagia(l)}` : ""}${l.estilo ? ` · estilo ${l.estilo}` : ""}`);
  out.push(`- Visual: ${ap.torso}, ${ap.cabeca}, cabelo ${ap.estilo}${ap.barba ? " com barba" : ""}, cor ${ap.roupa1Nome}${ap.escudo !== "nenhum" ? `, escudo (${ap.escudo})` : ""}${ap.capa ? ", capa" : ""}`);
  return out.join("\n");
};

const s = c.subida;
const d = s.depois;
const md: string[] = [];
md.push(`# ARENA D20 #${n} — ficha do episódio`);
md.push("");
md.push(`- **Seed:** ${ep.seed} (mesma seed + mesmo JSON = mesma luta, rolagem por rolagem)`);
md.push(`- **Vencedor:** ${d.nome} (${ESPECIE[d.especie].nome}, ${CLASSE[d.classe].nome}) com ${c.resultado.pvFinal[d.id]}/${s.antes.pvMax} PV após ${c.resultado.rodadas} rodadas`);
md.push(`- **Perfil:** ${ep.perfil}`);
md.push(`- **Ritmo do vídeo:** intervalo entre ações ${c.L.ritmo.gapBatalha.toFixed(1)} quadros, ações a ${(c.L.ritmo.escalaBatalha * 100).toFixed(0)}% na batalha e ${(c.L.ritmo.escalaDuelo * 100).toFixed(0)}% no duelo (só o ritmo muda, nunca as regras).`);
md.push("");
md.push("## Fichas no início da luta");
md.push("");
for (const l of c.fichasIniciais) {
  md.push(linhaFicha(l));
  md.push("");
}
md.push("## Log do combate (rolagem por rolagem)");
md.push("");
md.push("```");
md.push(...c.resultado.log);
md.push("```");
md.push("");
md.push(`## Ficha nova do campeão — ${d.nome}, nível ${s.antes.nivel} → ${d.nivel}`);
md.push("");
md.push(`- **PV:** ${s.antes.pvMax} → ${d.pvMax} (${s.rolagemPV.texto})`);
md.push(`- **Atributos:** ${ATRIBUTOS.map((a) => `${a} ${d.atrib[a]} (${sinal(mod(d.atrib[a]))})${s.aumentos[a] ? ` **+${s.aumentos[a]}**` : ""}`).join(" · ")}`);
md.push(`- **CA ${d.ca}** · ataque ${sinal(atqArma(d))} · bônus de proficiência ${sinal(prof(d))}${CLASSE[d.classe].conjura ? ` · CD de magia ${cdMagia(d)}` : ""}`);
md.push(`- **Espaços de magia:** ${s.espacosAntes.join("/")} → ${s.espacosDepois.join("/")} (1º/2º/3º círculo)`);
md.push(`- **Poderes novos:** ${s.novosPoderes.length ? s.novosPoderes.map(([a, b]) => `${a} — ${b}`).join("; ") : "nenhum"}`);
md.push("");
md.push("**História:**");
md.push("");
md.push(`> ${s.historia}`);
md.push("");
md.push(`Para usar esta ficha no próximo episódio, copie o conteúdo de \`campeao.json\` para o campo \`"campeaoAnterior"\` do JSON do episódio ${n + 1}.`);
md.push("");
md.push("---");
md.push("");
md.push(
  'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.',
);
writeFileSync(join(pasta, `ficha-episodio-${n}.md`), md.join("\n") + "\n");
writeFileSync(join(pasta, "campeao.json"), JSON.stringify(d, null, 2) + "\n");
writeFileSync(join(pasta, `episodio-${n}.json`), JSON.stringify(ep, null, 2) + "\n");
mkdirSync(dirname(join(pasta, "x")), { recursive: true });
console.log(`✓ ${sons.length} eventos de som · ficha, campeão e sprites em ${pasta}`);
console.log(`  vencedor: ${d.nome} · quedas: ${c.L.quedas.length} · cut-ins: ${c.L.cutins.length}`);
