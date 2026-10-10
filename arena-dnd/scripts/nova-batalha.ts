// Monta uma batalha nova: pega até 10 personagens da fila de comentários, sorteia o resto,
// rola tudo nos dados, mixa o áudio e escreve a ficha (para o comentário fixado / auditoria).
//
// Uso:
//   npm run batalha                          → batalha com a fila (ou 10 aleatórios)
//   npm run batalha -- --semente 1234        → repete exatamente uma batalha
//   npm run batalha -- --nome final-2026     → nome do arquivo
//   npm run batalha -- --sem-fila            → ignora a fila (10 aleatórios)
//
// Gera: batalhas/<nome>.json (props do vídeo), batalhas/<nome>-ficha.md, public/mix/<nome>.wav
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { batalhar, PropsBatalha } from "../src/motor";
import { chegadas, INTRO, Resultado } from "../src/motor/batalha";
import { ATRIBUTOS, ATRIBUICAO_SRD, CLASSES, ESPECIES, MAGIAS } from "../src/motor/srd";
import { mod, sinal } from "../src/motor/dados";
import { OUTRO_QUADROS } from "./constantes";

const args = process.argv.slice(2);
const arg = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

type ItemFila = { nome: string; descricao?: string; autor?: string; usado?: string };
const FILA = "personagens/fila.json";
const fila: ItemFila[] = existsSync(FILA) ? JSON.parse(readFileSync(FILA, "utf8")) : [];
const usarFila = !args.includes("--sem-fila");
const escolhidos = usarFila ? fila.filter((p) => !p.usado).slice(0, 10) : [];

mkdirSync("batalhas", { recursive: true });
const numero = readdirSync("batalhas").filter((f) => /^batalha-\d+\.json$/.test(f)).length + 1;
const nome = arg("nome") ?? `batalha-${String(numero).padStart(3, "0")}`;
const semente = arg("semente") ? Number(arg("semente")) : randomInt(1, 2 ** 31 - 1);

const props: PropsBatalha & { audio: string } = {
  semente,
  titulo: arg("titulo") ?? `ARENA D20 #${numero}`,
  perfil: arg("perfil") ?? "@arenad20",
  lutadores: escolhidos.map(({ nome, descricao, autor }) => ({ nome, descricao, autor })),
  audio: `mix/${nome}.wav`,
};
const r = batalhar(props);

// ---------- áudio: trilha + efeitos mixados num WAV só ----------
const lerWav = (arq: string): Float32Array => {
  const b = readFileSync(arq);
  let i = 12;
  while (i < b.length) {
    const id = b.toString("ascii", i, i + 4);
    const tam = b.readUInt32LE(i + 4);
    if (id === "data") {
      const n = tam / 2;
      const out = new Float32Array(n);
      for (let k = 0; k < n; k++) out[k] = b.readInt16LE(i + 8 + k * 2) / 32768;
      return out;
    }
    i += 8 + tam;
  }
  throw new Error(`WAV inválido: ${arq}`);
};
const SR = 44100;
const FPS = 30;
const duracaoQ = r.fimBatalha + OUTRO_QUADROS;
const mix = new Float32Array(Math.ceil((duracaoQ / FPS) * SR));
const somar = (x: Float32Array, quadro: number, vol: number) => {
  const ini = Math.round((quadro / FPS) * SR);
  for (let k = 0; k < x.length && ini + k < mix.length; k++) if (ini + k >= 0) mix[ini + k] += x[k] * vol;
};
const cacheSfx: Record<string, Float32Array> = {};
const sfx = (n: string) => (cacheSfx[n] ??= lerWav(`public/audio/sfx/${n}`));

// trilha em loop, recua no fim e dá lugar à fanfarra
const musica = lerWav("public/audio/musica-batalha.wav");
const fimMusica = Math.round(((r.fimBatalha + 20) / FPS) * SR);
for (let k = 0; k < Math.min(mix.length, fimMusica); k++) {
  const fade = Math.min(1, k / (SR * 0.5)) * Math.min(1, (fimMusica - k) / (SR * 0.6));
  mix[k] += musica[k % musica.length] * 0.42 * fade;
}
somar(lerWav("public/audio/vitoria.wav"), r.fimBatalha + 28, 0.8);
// abertura: queda de cada lutador, contagem e "LUTEM!"
for (const q of Object.values(chegadas(r))) somar(sfx("queda.wav"), q + 7, 0.5);
for (const q of [INTRO - 45, INTRO - 30, INTRO - 15]) somar(sfx("contagem.wav"), q, 0.7);
somar(sfx("lutem.wav"), INTRO, 0.8);
// efeitos da luta (sem empilhar o mesmo som no mesmo instante)
const ultimo: Record<string, number> = {};
for (const e of r.eventos) {
  if (e.k !== "som") continue;
  if (ultimo[e.arquivo] !== undefined && e.t - ultimo[e.arquivo] < 3) continue;
  ultimo[e.arquivo] = e.t;
  if (!existsSync(`public/audio/sfx/${e.arquivo}`)) continue;
  somar(sfx(e.arquivo), e.t, e.vol * 0.9);
}
// limitador suave e pico em −1 dBFS
let pico = 0;
for (let k = 0; k < mix.length; k++) {
  mix[k] = Math.tanh(mix[k] * 1.1);
  pico = Math.max(pico, Math.abs(mix[k]));
}
const ganho = 0.89 / (pico || 1);
const pcm = Buffer.alloc(mix.length * 2);
for (let k = 0; k < mix.length; k++) pcm.writeInt16LE(Math.round(mix[k] * ganho * 32767), k * 2);
const cab = Buffer.alloc(44);
cab.write("RIFF", 0);
cab.writeUInt32LE(36 + pcm.length, 4);
cab.write("WAVEfmt ", 8);
cab.writeUInt32LE(16, 16);
cab.writeUInt16LE(1, 20);
cab.writeUInt16LE(1, 22);
cab.writeUInt32LE(SR, 24);
cab.writeUInt32LE(SR * 2, 28);
cab.writeUInt16LE(2, 32);
cab.writeUInt16LE(16, 34);
cab.write("data", 36);
cab.writeUInt32LE(pcm.length, 40);
mkdirSync("public/mix", { recursive: true });
writeFileSync(`public/mix/${nome}.wav`, Buffer.concat([cab, pcm]));

// ---------- ficha ----------
writeFileSync(`batalhas/${nome}.json`, JSON.stringify(props, null, 2) + "\n");
writeFileSync(`batalhas/${nome}-ficha.md`, ficha(r, props, nome));

// marca quem da fila já lutou
if (escolhidos.length) {
  for (const p of escolhidos) p.usado = nome;
  writeFileSync(FILA, JSON.stringify(fila, null, 2) + "\n");
}

const venc = r.fichas[r.vencedor];
console.log(`✓ ${nome}: semente ${semente}, ${r.rodadas} rodadas, ${(duracaoQ / FPS).toFixed(1)} s — vencedor ${venc.nome} (${ESPECIES[venc.especie].nome} ${CLASSES[venc.classe].nome})`);
console.log(`  ${escolhidos.length} personagem(ns) da fila, ${10 - escolhidos.length} aleatório(s)`);
console.log(`  batalhas/${nome}-ficha.md · public/mix/${nome}.wav`);
console.log(`  Renderizar: npm run render -- ${nome}`);

function ficha(r: Resultado, p: typeof props, nome: string) {
  const L: string[] = [];
  const v = r.fichas[r.vencedor];
  L.push(`# ${p.titulo} — ${nome}`, "");
  L.push(`Semente: \`${r.semente}\` · ${r.rodadas} rodadas · vencedor: **${v.nome}** (${ESPECIES[v.especie].nome} ${CLASSES[v.classe].nome})`, "");
  L.push("Todos lutam no **nível 5** (regras SRD 5.2). Atributos: 4d6 descartando o menor, rolados 6 vezes; o maior vai no atributo principal da classe; +2/+1 do antecedente. PV: máximo do dado no 1º nível + dado rolado nos níveis 2–5 + CON.", "");
  L.push("## Legenda sugerida", "", "```");
  L.push(`10 heróis, 1 sobrevivente. Quem você escolheu? 🎲`);
  L.push(`Vencedor: ${v.nome} (${ESPECIES[v.especie].nome} ${CLASSES[v.classe].nome})${v.autor ? ` — criado por ${v.autor}` : ""}`);
  L.push(`Comente NOME + DESCRIÇÃO do seu personagem e os dados decidem o resto!`);
  L.push(`#dnd #dungeonsanddragons #rpg #pixelart #rpgdemesa #d20 #retrogaming #batalha`);
  L.push("```", "");
  L.push("## Comentário fixado sugerido", "", "```");
  L.push(`Quer lutar na próxima? Responda assim:`);
  L.push(`Nome: Bruna`);
  L.push(`Descrição: elfa ladina de capuz verde e cabelo ruivo`);
  L.push(`(classe, espécie e cores saem da descrição; atributos, vida e ataques são rolados nos dados)`);
  L.push("```", "");
  L.push("## Lutadores", "");
  L.push("| # | Nome | Espécie / Classe | FOR | DES | CON | INT | SAB | CAR | PV | CA | Arma | CD |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const f of r.fichas) {
    const at = ATRIBUTOS.map((a) => `${f.atributos[a]} (${sinal(mod(f.atributos[a]))})`);
    L.push(`| ${f.id + 1} | ${f.nome}${f.autor ? ` <br>${f.autor}` : ""} | ${ESPECIES[f.especie].nome}${f.dragao ? ` (${f.dragao.nome})` : ""} ${CLASSES[f.classe].nome} | ${at.join(" | ")} | ${f.pv} | ${f.ca}${f.escudo ? " (escudo)" : ""} | ${f.arma.nome} ${f.arma.dano} | ${f.cd ?? "—"} |`);
  }
  L.push("", "### Rolagens", "");
  for (const f of r.fichas) {
    const c = CLASSES[f.classe];
    L.push(`**${f.nome}** — ${ESPECIES[f.especie].nome} ${c.nome}${f.descricao ? ` · _"${f.descricao}"_` : ""}`);
    L.push(`- 4d6 (descarta o menor): ${f.rolagens.map((x) => `[${x.dados.join(",")}]→${x.soma}`).join("  ")}${f.rerrolou ? ` _(conjunto rolado de novo ${f.rerrolou}× pela regra da mesa: soma dos modificadores ≤ 0)_` : ""}`);
    L.push(`- Antecedente: ${Object.entries(f.bonusAntecedente).map(([a, b]) => `${a} +${b}`).join(", ")}`);
    L.push(`- PV: ${c.dadoVida} (1º nível) + d${c.dadoVida}: ${f.pvRolagens.join(", ")} + CON ${sinal(mod(f.atributos.CON))}×5${f.especie === "anao" ? " + 5 (Robustez Anã)" : ""}${f.especie === "humano" ? " + 10 (Vigoroso)" : ""} = **${f.pv}**`);
    L.push(`- Recursos: ${[...c.recursos, ...ESPECIES[f.especie].tracos].join(" · ")}`);
    if (c.conjuracao) L.push(`- Magias: ${c.conjuracao.magias.map((m) => MAGIAS[m].nome).join(", ")} (CD ${f.cd}, ataque ${sinal(f.ataqueMagia!)})`);
    L.push("");
  }
  L.push("## Combate rolagem por rolagem", "", "```", ...r.log, "```", "");
  L.push("---", "", `_${ATRIBUICAO_SRD}_`, "");
  return L.join("\n");
}
