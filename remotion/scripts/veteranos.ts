// LENDAS: lista todos que já saíram do nível 1, cada um no estado mais recente.
// node scripts/veteranos.ts [saida.json] → fichas para o campo `veteranos` do próximo episódio de LENDAS
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { criarRoteiro } from "../src/arena/roteiro.ts";
import { gerarLutadores } from "../src/arena/personagem.ts";
const dir = new URL("../src/arena/episodios/", import.meta.url).pathname;
const ordem = (f: string) => { const m = f.match(/^ep([A-Z]?)(\d+)\.json$/)!; return (m[1] || "A") + m[2]; };
const arqs = readdirSync(dir).filter((f) => /^ep[A-Z]?\d+\.json$/.test(f)).sort((a, b) => ordem(a).localeCompare(ordem(b)));
const vet = new Map<string, any>();
for (const f of arqs) {
  const ep = JSON.parse(readFileSync(dir + f, "utf8"));
  const r = criarRoteiro(ep);
  const cod = ordem(f);
  // LENDAS com nível mínimo: todo mundo sai com a ficha com que entrou (já elevada), para o nível ficar salvo
  const entrada = ep.nivelMinimo ? gerarLutadores(ep).lutadores : [];
  for (const l of (entrada as any[]).filter((x) => !x.boss)) vet.set(l.nome, { ep: cod, como: "entrou", ficha: { nome: l.nome, especie: l.especie, classe: l.classe, nivel: l.nivel, atributos: l.atributos, pvMax: l.pvMax, pvRolagens: l.pvRolagens, ancestralidade: l.ancestralidade?.nome, visual: l.visual, vitorias: l.vitorias, itens: l.itens ?? [], autor: l.autor, descricao: l.descricao, rolagens: l.rolagens, antecedente: l.antecedente } });
  r.lutadores.forEach((l: any, i: number) => {
    if (l.boss) return;
    const subs = r.sim.evolucao[i].subidas;
    // quem entrou acima do nível 1 (campeão/heróis fortes) também conta — guarda o estado de entrada
    if (l.nivel > 1 && l.campeao && !ep.nivelMinimo) vet.set(l.nome, { ep: cod, como: "campeão anterior", ficha: { ...ep.campeaoAnterior, nome: l.nome } });
    if (subs.length && i !== r.vencedor) vet.set(l.nome, { ep: cod, como: "subiu na luta", ficha: { ...subs[subs.length - 1].ficha, vitorias: l.vitorias } });
    if (i === r.vencedor) vet.set(l.nome, { ep: cod, como: "venceu", ficha: r.subida.ficha });
  });
}
const lista = [...vet.values()].sort((a, b) => b.ficha.nivel - a.ficha.nivel);
lista.forEach((v) => console.log(`${v.ficha.nivel.toString().padStart(2)} ${v.ficha.nome.padEnd(22)} ${v.ficha.especie.padEnd(10)} ${v.ficha.classe.padEnd(12)} ${v.ep} ${v.como} · itens ${(v.ficha.itens ?? []).length}`));
writeFileSync(process.argv[2] ?? "veteranos.json", JSON.stringify(lista.map((v) => v.ficha), null, 2));
console.log(lista.length, "personagens");
