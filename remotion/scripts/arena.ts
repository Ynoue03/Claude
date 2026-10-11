// Gera os dados de um episódio do ARENA D20 a partir do JSON (seed + lutadores):
//   • public/arena/epNN-sons.json  → eventos de áudio (lidos por audio/arena.py)
//   • ../arena-d20/epNN/FICHA.md    → fichas, rolagens, iniciativa, log do combate e ficha nova do campeão
//   • ../arena-d20/epNN/campeao.json → cole em "campeaoAnterior" do próximo episódio
// Uso: node scripts/arena.ts src/arena/episodios/ep01.json
import { CHEFES, fichaChefe } from "../src/arena/chefes.ts";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { criarRoteiro, V, FPS, video, motivoSubidas } from "../src/arena/roteiro.ts";
import { fmt, poderesAte, codigoEp, rotuloEp } from "../src/arena/personagem.ts";
import type { Episodio } from "../src/arena/personagem.ts";
import {
  CLASSES,
  ESPECIES,
  espacos,
  mod,
  proficiencia,
} from "../src/arena/regras.ts";
import { ITENS } from "../src/arena/itens.ts";

const TIPO: Record<string, string> = {
  concussao: "concussão",
  eletrico: "elétrico",
  necrotico: "necrótico",
  psiquico: "psíquico",
  acido: "ácido",
};
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const arq = process.argv[2] ?? "src/arena/episodios/ep01.json";
const ep: Episodio = JSON.parse(readFileSync(resolve(raiz, arq), "utf8"));
const nn = codigoEp(ep);
const r = criarRoteiro(ep);
const L = r.lutadores;

// eventos de áudio
mkdirSync(join(raiz, "public/arena"), { recursive: true });
const vs = r.congela.find((c) => c.tipo === "vs")!;
writeFileSync(
  join(raiz, `public/arena/ep${nn}-sons.json`),
  JSON.stringify({
    fps: FPS,
    quadros: V.fim,
    arena: r.ep.arena ?? "calabouco",
    fases: {
      batalha: V.batalha,
      duelo: vs.v0,
      vitoria: V.vitoria,
      bau: r.fases.bau,
      pergaminho: r.fases.pergaminho,
      cta: V.cta,
    },
    sons: r.sons,
  }),
);

// ficha de texto
const seg = (v: number) =>
  `${Math.floor(v / FPS / 60)}:${String(Math.floor((v / FPS) % 60)).padStart(2, "0")}`;
const linhas: string[] = [];
const P = (s = "") => linhas.push(s);
const campeao = L[r.vencedor];
P(`# ARENA D20 ${rotuloEp(ep)} — ficha do episódio`);
P();
P(`- **Seed:** \`${ep.seed}\` (mesma seed = mesma luta, rolagem por rolagem)`);
P(
  `- **Lutadores:** ${L.length} · **Rodadas:** ${r.sim.rodadas} · **Turnos:** ${r.sim.turnos.length}`,
);
const chefe = L.find((l) => l.boss);
if (chefe)
  P(
    `- **Chefe:** ${chefe.nome} — ficha ${CHEFES[chefe.boss!].fonte} · arena ${r.ep.arena} · ${chefe.boss === campeao.boss ? "**o chefe venceu**" : `derrubado por ${r.sim.stats[chefe.id].derrubadoPor}`}`,
  );
if (campeao.boss)
  P(
    `- **Campeão:** nenhum — o ${campeao.nome} venceu a arena; o próximo episódio começa sem campeão (\`campeaoAnterior: null\`)`,
  );
else
  P(
    `- **Campeão:** ${campeao.nome} (${ESPECIES[campeao.especie].nome} ${CLASSES[campeao.classe].nome}) → nível ${r.subida.para}`,
  );
if (r.avisos.length) P(`- **Avisos de ritmo:** ${r.avisos.join(" ")}`);
P();
P(`## Fichas no início da luta`);
P();
for (const l of L) {
  const at = l.atributos;
  if (l.boss) {
    const c = fichaChefe(l.boss, l.bossNivel ?? 1);
    P(`### ${l.nome} — CHEFE (${c.fonte})`);
    P(
      `- FOR ${at.FOR} (${fmt(mod(at.FOR))}) · DES ${at.DES} (${fmt(mod(at.DES))}) · CON ${at.CON} (${fmt(mod(at.CON))}) · INT ${at.INT} (${fmt(mod(at.INT))}) · SAB ${at.SAB} (${fmt(mod(at.SAB))}) · CAR ${at.CAR} (${fmt(mod(at.CAR))})`,
    );
    P(
      `- PV ${l.pvMax}${l.pvMax !== c.pv ? ` (${c.pv} da ficha × ${(l.pvMax / c.pv).toFixed(1).replace(".", ",")}, heróis mais fortes)` : ""} · CA ${c.ca} · Deslocamento ${c.deslocamento} pés${c.voa ? " (voa: sem ataque de oportunidade ao se mover)" : ""} · ${(c.turnos ?? 2) > 1 ? "age **2 vezes por rodada** (no seu número de iniciativa e no meio da ordem)" : "age 1 vez por rodada"} · não é empurrado`,
    );
    P(
      `- Ataques (todos em cada turno): ${c.ataques.map((a) => `${a.nome} +${a.acerto} ${a.n}d${a.d}+${a.bonus} ${TIPO[a.tipo] ?? a.tipo}`).join("; ")}`,
    );
    const e = c.especial;
    P(
      `- Especial (recarga ${c.recarga}–6): ${e.nome}${e.k === "sopro" ? ` — cone ${e.n}d${e.d} ${TIPO[e.tipo] ?? e.tipo}, salvaguarda de DES CD ${e.cd} (metade)` : e.k === "pedra" ? ` — à distância +${e.acerto} ${e.n}d${e.d}+${e.bonus}` : e.k === "investida" ? ` — corre o dobro e soma ${e.extraN}d${e.extraD}, empurra` : e.k === "rasante" ? " — voa até o alvo e ataca com vantagem" : e.k === "abjurar" ? ` — até ${e.max} inimigos a 60 pés fazem salvaguarda de ${e.atributo} CD ${e.cd} ou ficam com medo por 2 turnos (desvantagem e não o atacam)` : " — uma mordida em cada herói por perto"}`,
    );
    const h = c.heroi;
    if (h) {
      P(`- Ficha de personagem: ${CLASSES[h.classe].nome} nível ${h.nivel} · ${ESPECIES[h.especie].nome} · proficiência +${h.prof} · PV ${h.pvRolagens.join("; ")}`);
      P(`- Golpes Sombrios (Golpes Radiantes, nv 11): +1d8 necrótico em todo golpe corpo a corpo · Destruição Sombria (Destruição Divina): +2d8 a +6d8 necrótico, espaços ${h.slots.join("/")}`);
      P(`- ${h.aura.nome} (Auréola Sagrada, nv 20): ${h.aura.dano} necrótico em quem estiver a 30 pés no começo do turno dele · Aura de Proteção: +${h.bonusSalv} nas salvaguardas`);
      P(`- Cura pelas Mãos: reserva de ${h.curaMaos} PV (50 por vez abaixo de 40% dos PV) · Resistência da Pedra (Golias): −1d12+CON num golpe, ${h.prof} vezes · Azagaias em quem ele não alcança`);
    }
    if (c.resistencias.length)
      P(`- Resistência: ${c.resistencias.map((t) => TIPO[t] ?? t).join(", ")}`);
    P(
      `- Quem derrubar o chefe sobe 1 nível na hora e ganha um item (d30, só itens da sua classe)`,
    );
    P();
    continue;
  }
  P(
    `### ${l.nome} — ${ESPECIES[l.especie].nome}${l.ancestralidade ? ` (${l.ancestralidade.nome})` : ""} · ${CLASSES[l.classe].nome} nível ${l.nivel}${l.campeao ? " 👑 campeão anterior" : ""}`,
  );
  if (l.autor || l.descricao)
    P(`- Comentário: ${l.autor ? `${l.autor} — ` : ""}"${l.descricao}"`);
  if (l.rolagens.length) {
    P(
      `- Atributos (4d6, descarta o menor${l.tentativas > 1 ? `; conjunto rolado ${l.tentativas}×` : ""}): ${l.rolagens
        .map(
          (d) =>
            `[${d.join(",")}]→${[...d]
              .sort((a, b) => b - a)
              .slice(0, 3)
              .reduce((s, x) => s + x, 0)}`,
        )
        .join(" ")}`,
    );
    P(`- Antecedente: ${l.antecedente}`);
  }
  P(
    `- FOR ${at.FOR} (${fmt(mod(at.FOR))}) · DES ${at.DES} (${fmt(mod(at.DES))}) · CON ${at.CON} (${fmt(mod(at.CON))}) · INT ${at.INT} (${fmt(mod(at.INT))}) · SAB ${at.SAB} (${fmt(mod(at.SAB))}) · CAR ${at.CAR} (${fmt(mod(at.CAR))})`,
  );
  P(
    `- PV ${l.pvMax} (${l.pvRolagens.join("; ")}) · CA ${l.ca} (${l.caDesc}) · Deslocamento ${l.deslocamento} pés`,
  );
  P(
    `- Arma: ${l.arma.nome} ${l.arma.n}d${l.arma.d} ${TIPO[l.arma.tipo] ?? l.arma.tipo} · Proficiência +${proficiencia(l.nivel)}${espacos(l.classe, l.nivel).length ? ` · Espaços de magia ${espacos(l.classe, l.nivel).join("/")}${l.classe === "MAGO" ? " (1 gasto na Armadura Arcana)" : ""}` : ""}`,
  );
  P(
    `- Poderes: ${poderesAte(l)
      .map((p) => p.nome)
      .join(", ")}`,
  );
  if (l.itens?.length)
    P(
      `- Itens: ${l.itens.map((it) => `${ITENS[it].nome} (${ITENS[it].poder})`).join("; ")}`,
    );
  P();
}
P(`## Ordem de iniciativa (d20 + DES)`);
P();
r.sim.iniciativa.forEach((i, k) =>
  P(
    `${k + 1}. ${L[i.id].nome}: d20 ${i.d20} ${fmt(mod(L[i.id].atributos.DES))} = **${i.total}**`,
  ),
);
P();
P(`## Log do combate`);
P();
P("Tempo = momento do vídeo em que o turno começa.");
P();
r.sim.turnos.forEach((t, i) => {
  const tt = r.turnos[i];
  P(`**${seg(video(r, tt.t0))}** ${t.log[0]}`);
  t.log.slice(1).forEach((s) => P(`    ${s}`));
});
P();
P(
  `**Ordem de queda:** ${r.sim.ordemQueda.map((id, k) => `${k + 1}. ${L[id].nome} (por ${r.sim.stats[id].derrubadoPor})`).join(" · ")}`,
);
P();
if (campeao.boss) {
  P(`## Sem campeão`);
  P();
  P(`- ${r.historia}`);
  P();
}
if (!campeao.boss) P(`## Ficha nova do campeão`);
P();
const s = r.subida;
const st = r.sim.stats[campeao.id];
if (!campeao.boss) {
  P(
    `**${campeao.nome}** — ${ESPECIES[campeao.especie].nome} ${CLASSES[campeao.classe].nome}, **nível ${s.de} → ${s.para}** (vitórias: ${s.ficha.vitorias})`,
  );
  P();
  P(
    `- Na luta: ${st.abates} abate(s) (${st.derrubados.join(", ") || "—"}), ${st.dano} de dano causado, ${st.criticos} crítico(s), menor PV ${st.menorPv}, golpe final: ${st.golpeFinal || "—"}`,
  );
  P(
    `- PV: ${s.pvAntes} → **${s.pvDepois}** (${s.rolagensTxt.join(" · ")} = +${s.pvGanho})`,
  );
  if (r.sim.evolucao[campeao.id].subidas.length)
    P(
      (() => {
        const m = motivoSubidas(campeao, L, r.sim);
        const n = r.sim.evolucao[campeao.id].subidas.length;
        const por = [m.campeao || !m.chefe ? "o campeão" : "", m.chefe ? `o ${m.chefe}` : ""].filter(Boolean).join(" e ");
        return `- Subiu ${n > 1 ? `${n} níveis` : "um nível"} **durante a luta** por derrubar ${por} e mais um pela vitória.`;
      })(),
    );
  P(
    `- Atributos: ${(["FOR", "DES", "CON", "INT", "SAB", "CAR"] as const).map((a) => `${a} ${s.atributosDepois[a]}${s.atributosDepois[a] > s.atributosAntes[a] ? ` (+${s.atributosDepois[a] - s.atributosAntes[a]})` : ""}`).join(" · ")}`,
  );
  if (s.espacosDepois.length)
    P(
      `- Espaços de magia: ${s.espacosAntes.join("/")} → ${s.espacosDepois.join("/")}`,
    );
  P(
    `- Poderes novos: ${s.poderesNovos.map((p) => `**${p.nome}** — ${p.desc}`).join("; ") || "—"}`,
  );
  if (r.fases.bau >= 0)
    P(
      `- Baú do campeão (episódio ${ep.numero}): ${r.itemBau ? `**${ITENS[r.itemBau].nome}** — ${ITENS[r.itemBau].poder}` : "vazio (já tinha todos os itens)"}`,
    );
  if (r.itensFinais.length)
    P(
      `- Itens que leva para o próximo episódio: ${r.itensFinais.map((it) => ITENS[it].nome).join(", ")}`,
    );
  P(`- História: ${r.historia}`);
  P();
}
P(
  "Para o próximo episódio, copie o conteúdo de `campeao.json` para o campo `campeaoAnterior` do JSON do episódio.",
);
P();
P("---");
P();
P(
  'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.',
);

const pasta = join(raiz, `../arena-d20/ep${nn}`);
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, "FICHA.md"), linhas.join("\n") + "\n");
writeFileSync(
  join(pasta, "campeao.json"),
  JSON.stringify(campeao.boss ? null : s.ficha, null, 2) + "\n",
);
writeFileSync(
  join(pasta, "lutadores.json"),
  JSON.stringify(
    L.map((l) =>
      l.boss
        ? { nome: l.nome, chefe: l.boss }
        : { nome: l.nome, classe: l.classe, especie: l.especie },
    ),
    null,
    2,
  ) + "\n",
);
console.log(
  `✓ ARENA D20 ${rotuloEp(ep)} · seed ${ep.seed} · ${campeao.boss ? "vitória do chefe" : "campeão"} ${campeao.nome}${campeao.boss ? "" : ` (${CLASSES[campeao.classe].nome})`} · ${r.sim.turnos.length} turnos`,
);
if (r.avisos.length) console.log("  avisos:", r.avisos.join(" "));
console.log(`  ${join(pasta, "FICHA.md")}`);
