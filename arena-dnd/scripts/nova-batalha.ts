// Monta um episódio novo da Arena D20 (16 lutadores, nível 1, 90 s):
//  - entra o CAMPEÃO do episódio anterior (campeoes/atual.json), com o nível que conquistou;
//  - entram até 15 personagens da fila de comentários; o resto é sorteado;
//  - rola tudo nos dados, mixa o áudio, escreve a ficha e salva o novo campeão (que sobe de nível).
//
// Uso:
//   npm run batalha                          → episódio com campeão + fila (ou aleatórios)
//   npm run batalha -- --semente 1234        → repete exatamente um episódio
//   npm run batalha -- --nome final-2026     → nome do arquivo
//   npm run batalha -- --sem-fila            → ignora a fila (só aleatórios)
//   npm run batalha -- --sem-campeao         → não traz o campeão anterior
//   npm run batalha -- --titulo "ARENA D20 #7" --perfil @suaconta
//
// Gera: batalhas/<nome>.json (props do vídeo), batalhas/<nome>-ficha.md, public/mix/<nome>.wav,
//       campeoes/atual.json (ficha do campeão para o próximo episódio)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { batalhar, Entrada, Episodio, Ficha, PropsBatalha, TOTAL_LUTADORES } from "../src/motor";
import { chegadas, INTRO } from "../src/motor/batalha";
import { cronograma, FPS } from "../src/motor/episodio";
import { magiasDe, poderesAte } from "../src/motor/niveis";
import { ATRIBUTOS, ATRIBUICAO_SRD, CLASSES, ESPECIES, MAGIAS } from "../src/motor/srd";
import { mod, sinal } from "../src/motor/dados";

const args = process.argv.slice(2);
const arg = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

// ---------- quem luta ----------
const CAMPEAO = "campeoes/atual.json";
const campeao: Ficha | undefined = !args.includes("--sem-campeao") && existsSync(CAMPEAO) ? JSON.parse(readFileSync(CAMPEAO, "utf8")) : undefined;

type ItemFila = { nome: string; descricao?: string; autor?: string; usado?: string };
const FILA = "personagens/fila.json";
const fila: ItemFila[] = existsSync(FILA) ? JSON.parse(readFileSync(FILA, "utf8")) : [];
const vagas = TOTAL_LUTADORES - (campeao ? 1 : 0);
const escolhidos = args.includes("--sem-fila") ? [] : fila.filter((p) => !p.usado && p.nome.toLowerCase() !== campeao?.nome.toLowerCase()).slice(0, vagas);

mkdirSync("batalhas", { recursive: true });
const numero = readdirSync("batalhas").filter((f) => /^batalha-\d+\.json$/.test(f)).length + 1;
const nome = arg("nome") ?? `batalha-${String(numero).padStart(3, "0")}`;
const semente = arg("semente") ? Number(arg("semente")) : randomInt(1, 2 ** 31 - 1);

const lutadores: Entrada[] = [
  ...(campeao ? [{ nome: campeao.nome, descricao: campeao.descricao, autor: campeao.autor, ficha: campeao }] : []),
  ...escolhidos.map(({ nome, descricao, autor }) => ({ nome, descricao, autor })),
];
const props: PropsBatalha & { audio: string } = {
  semente,
  titulo: arg("titulo") ?? `ARENA D20 #${numero}`,
  perfil: arg("perfil") ?? "@arenad20",
  lutadores,
  audio: `mix/${nome}.wav`,
};
const r = batalhar(props);

// ---------- áudio: trilha + ambiente + efeitos num WAV só ----------
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
const amostra = (q: number) => Math.round((q / FPS) * SR);
const mix = new Float32Array(amostra(r.duracao));
const somar = (x: Float32Array, quadro: number, vol: number) => {
  const ini = amostra(quadro);
  for (let k = 0; k < x.length && ini + k < mix.length; k++) if (ini + k >= 0) mix[ini + k] += x[k] * vol;
};
const cacheSfx: Record<string, Float32Array> = {};
const sfx = (n: string) => (cacheSfx[n] ??= lerWav(`public/audio/sfx/${n}`));
const loop = (x: Float32Array, de: number, ate: number, vol: number, fadeIn = 0.4, fadeOut = 0.6) => {
  const a = amostra(de), b = Math.min(mix.length, amostra(ate));
  for (let k = a; k < b; k++) {
    const fade = Math.min(1, (k - a) / (SR * fadeIn)) * Math.min(1, (b - k) / (SR * fadeOut));
    mix[k] += x[(k - a) % x.length] * vol * fade;
  }
};
const fim = r.fimBatalha;
const duelo = r.pausas.find((p) => p.tipo === "duelo");
const fimDuelo = duelo ? duelo.t + duelo.dur : fim;
// ambiente de calabouço por baixo de tudo
loop(lerWav("public/audio/ambiente-calabouco.wav"), 0, r.duracao, 0.35, 0.3, 1.5);
// trilha de batalha; versão intensa no duelo final; recua no fim
loop(lerWav("public/audio/musica-batalha.wav"), 4, duelo ? duelo.t : fim + 20, 0.4);
if (duelo) loop(lerWav("public/audio/musica-duelo.wav"), fimDuelo, fim + 20, 0.42, 0.1);
somar(lerWav("public/audio/vitoria.wav"), fim + 28, 0.8);
// abertura
for (const q of Object.values(chegadas(r))) somar(sfx("queda.wav"), q + 7, 0.45);
for (const q of [INTRO - 45, INTRO - 30, INTRO - 15]) somar(sfx("contagem.wav"), q, 0.7);
somar(sfx("lutem.wav"), INTRO, 0.8);
// cut-ins e VS
for (const p of r.pausas) somar(sfx(p.tipo === "duelo" ? "vs.wav" : "cutin.wav"), p.t, p.tipo === "duelo" ? 0.9 : 0.7);
// efeitos da luta (sem empilhar o mesmo som no mesmo instante; no máx. 4 por quadro)
const ultimo: Record<string, number> = {};
const porQuadro: Record<number, number> = {};
for (const e of r.eventos) {
  if (e.k !== "som") continue;
  if (ultimo[e.arquivo] !== undefined && e.t - ultimo[e.arquivo] < 3) continue;
  if ((porQuadro[e.t] ?? 0) >= 4) continue;
  ultimo[e.arquivo] = e.t;
  porQuadro[e.t] = (porQuadro[e.t] ?? 0) + 1;
  if (existsSync(`public/audio/sfx/${e.arquivo}`)) somar(sfx(e.arquivo), e.t, e.vol * 0.9);
}
// pergaminho: papel, jingle de level up, dado do PV e um "plim" subindo a cada + verde
const cr = cronograma(r);
somar(sfx("papel.wav"), cr.t0, 0.8);
somar(sfx("levelup.wav"), cr.topo, 0.8);
let plim = 0;
const tocarPlim = (q: number) => somar(sfx(`plim${Math.min(5, ++plim)}.wav`), q, 0.7);
ATRIBUTOS.forEach((a, i) => { if (r.subida.atributos[a]) tocarPlim(cr.atributos + i * cr.passoAtrib); });
somar(sfx("dado.wav"), cr.pv, 0.6);
tocarPlim(cr.pv + 14);
const novos = r.subida.poderes.length + r.subida.magias.length;
for (let i = 0; i < Math.max(1, novos); i++) tocarPlim(cr.novos + i * cr.passoNovo);
somar(sfx("buff.wav"), cr.rodape, 0.6);
// limitador suave, pico em −1 dBFS
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

// ---------- ficha, fila e campeão ----------
writeFileSync(`batalhas/${nome}.json`, JSON.stringify(props, null, 2) + "\n");
writeFileSync(`batalhas/${nome}-ficha.md`, ficha(r, props, nome));
if (escolhidos.length) {
  for (const p of escolhidos) p.usado = nome;
  writeFileSync(FILA, JSON.stringify(fila, null, 2) + "\n");
}
mkdirSync("campeoes/historico", { recursive: true });
const novoCampeao = { ...r.subida.depois, id: 0 };
writeFileSync(CAMPEAO, JSON.stringify(novoCampeao, null, 2) + "\n");
writeFileSync(`campeoes/historico/${nome}.json`, JSON.stringify({ episodio: nome, historia: r.historia, ficha: novoCampeao }, null, 2) + "\n");

const venc = r.fichas[r.vencedor];
console.log(`✓ ${nome}: semente ${semente}, ${r.rodadas} rodadas, luta termina em ${(fim / FPS).toFixed(1)} s (ritmo ${r.ritmo.toFixed(2)}), ${r.pausas.length} pausas`);
console.log(`  campeão: ${venc.nome} (${ESPECIES[venc.especie].nome} ${CLASSES[venc.classe].nome}) → nível ${r.subida.depois.nivel}`);
console.log(`  ${campeao ? `defensor do título: ${campeao.nome} (nível ${campeao.nivel}) · ` : ""}${escolhidos.length} da fila · ${TOTAL_LUTADORES - escolhidos.length - (campeao ? 1 : 0)} aleatório(s)`);
console.log(`  batalhas/${nome}-ficha.md · public/mix/${nome}.wav · ${CAMPEAO}`);
console.log(`  Renderizar: npm run render -- ${nome}`);

function ficha(r: Episodio, p: typeof props, nome: string) {
  const L: string[] = [];
  const v = r.fichas[r.vencedor];
  const s = r.subida;
  L.push(`# ${p.titulo} — ${nome}`, "");
  L.push(`Semente: \`${r.semente}\` · ${r.rodadas} rodadas · campeão: **${v.nome}** (${ESPECIES[v.especie].nome} ${CLASSES[v.classe].nome}) → **nível ${s.depois.nivel}**`, "");
  L.push("16 lutadores; todos no **nível 1** (regras SRD 5.2), exceto o campeão que volta para defender o título. Atributos: 4d6 descartando o menor, 6 vezes; o maior vai no atributo principal da classe; +2/+1 do antecedente. PV no nível 1: máximo do dado de vida + CON.", "");
  L.push("## Legenda sugerida", "", "```");
  L.push(`16 heróis de nível 1, 1 campeão. Quem você escolheu? 🎲`);
  L.push(`Campeão: ${v.nome} (${ESPECIES[v.especie].nome} ${CLASSES[v.classe].nome}) — subiu para o nível ${s.depois.nivel}!${v.autor ? ` Criado por ${v.autor}.` : ""}`);
  L.push(`Comente NOME + DESCRIÇÃO do seu personagem e os dados decidem o resto!`);
  L.push(`#dnd #dungeonsanddragons #rpg #pixelart #rpgdemesa #d20 #retrogaming #batalha`);
  L.push("```", "");
  L.push("## Comentário fixado sugerido", "", "```");
  L.push(`Quer lutar na próxima? Responda assim:`);
  L.push(`Nome: Bruna`);
  L.push(`Descrição: elfa ladina de capuz verde e cabelo ruivo`);
  L.push(`(classe, espécie e cores saem da descrição; atributos, vida e ataques são rolados nos dados)`);
  L.push("```", "");
  L.push("## Pergaminho do campeão", "");
  L.push(`**${v.nome}** — ${ESPECIES[v.especie].nome} ${CLASSES[v.classe].nome}, nível ${s.antes.nivel} → **${s.depois.nivel}**`, "");
  L.push(`- PV: ${s.antes.pv} → **${s.depois.pv}** (d${CLASSES[v.classe].dadoVida} = ${s.dadoPv} ${sinal(mod(s.depois.atributos.CON))} CON${v.especie === "anao" ? " +1 Robustez Anã" : v.especie === "humano" ? " +2 Vigoroso" : ""})`);
  const ganhos = ATRIBUTOS.filter((a) => s.atributos[a]).map((a) => `${a} +${s.atributos[a]}`);
  L.push(`- Atributos: ${ganhos.length ? ganhos.join(", ") : "sem aumento neste nível (só nos níveis 4, 8, 12, 16 e 19)"}`);
  L.push(`- Poderes novos: ${[...s.poderes.map((x) => `${x.nome} (${x.desc})`), ...s.magias.map((m) => `${MAGIAS[m].nome} (magia)`)].join("; ") || "—"}`);
  L.push(`- Espaços de magia: ${s.antes.espacos.join("/")} → ${s.depois.espacos.join("/")}`);
  L.push("", `> ${r.historia}`, "");
  L.push("## Lutadores", "");
  L.push("| # | Nome | Espécie / Classe | Nível | FOR | DES | CON | INT | SAB | CAR | PV | CA | Arma | CD |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const f of r.fichas) {
    const at = ATRIBUTOS.map((a) => `${f.atributos[a]} (${sinal(mod(f.atributos[a]))})`);
    L.push(`| ${f.id + 1} | ${f.nome}${f.autor ? ` <br>${f.autor}` : ""}${f.vitorias ? " 👑" : ""} | ${ESPECIES[f.especie].nome}${f.dragao ? ` (${f.dragao.nome})` : ""} ${CLASSES[f.classe].nome} | ${f.nivel} | ${at.join(" | ")} | ${f.pv} | ${f.ca}${f.escudo ? " (escudo)" : ""} | ${f.arma.nome} ${f.arma.dano} | ${f.cd ?? "—"} |`);
  }
  L.push("", "### Rolagens", "");
  for (const f of r.fichas) {
    const c = CLASSES[f.classe];
    L.push(`**${f.nome}** — ${ESPECIES[f.especie].nome} ${c.nome}, nível ${f.nivel}${f.descricao ? ` · _"${f.descricao}"_` : ""}`);
    L.push(`- 4d6 (descarta o menor): ${f.rolagens.map((x) => `[${x.dados.join(",")}]→${x.soma}`).join("  ")}${f.rerrolou ? ` _(conjunto rolado de novo ${f.rerrolou}× pela regra da mesa)_` : ""}`);
    L.push(`- Antecedente: ${Object.entries(f.bonusAntecedente).map(([a, b]) => `${a} +${b}`).join(", ")}`);
    L.push(`- PV: ${c.dadoVida} (máx. no 1º nível)${f.pvRolagens.length ? ` + d${c.dadoVida}: ${f.pvRolagens.join(", ")}` : ""} ${sinal(mod(f.atributos.CON))} CON × ${f.nivel}${f.especie === "anao" ? ` + ${f.nivel} (Robustez Anã)` : ""}${f.especie === "humano" ? ` + ${2 * f.nivel} (Vigoroso)` : ""} = **${f.pv}**`);
    L.push(`- Poderes: ${poderesAte(f.classe, f.especie, f.nivel).map((x) => x.nome).join(" · ")}`);
    const mg = magiasDe(f.classe, f.nivel);
    if (mg.length) L.push(`- Magias: ${mg.map((m) => MAGIAS[m].nome).join(", ")} (CD ${f.cd}, ataque ${sinal(f.ataqueMagia!)}, espaços ${f.espacos.join("/")})`);
    L.push("");
  }
  L.push("## Combate rolagem por rolagem", "", "```", ...r.log, "```", "");
  L.push("---", "", `_${ATRIBUICAO_SRD}_`, "");
  return L.join("\n");
}
