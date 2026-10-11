// Gera ../arena-d20/SuaArenaD20.md: tudo o que é preciso para recriar a ARENA D20 do zero.
// As tabelas (classes, poderes, armas, itens, chefes, nomes, arenas, tempos) saem direto do código,
// então rodar de novo depois de qualquer mudança mantém o documento fiel.
//   node scripts/documento.ts
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLASSES, CLASSE_IDS, ESPECIES, ESPECIE_IDS, PODERES, TRACOS_ESPECIE, NOMES, SOBRENOMES, ANCESTRALIDADES, COR_DANO, espacos } from "../src/arena/regras.ts";
import { ARMAS } from "../src/arena/personagem.ts";
import { ITENS, ITEM_IDS, TIPOS, podeUsar } from "../src/arena/itens.ts";
import { CHEFES, ORDEM_CHEFES } from "../src/arena/chefes.ts";
import { GEO, PE, ALCANCE, CONTATO, SEPARACAO, Y_MIN_CHEFE } from "../src/arena/combate.ts";
import { V, BAU, CUTIN, VS, ESPACO_CUTIN, GRUPO, FPS } from "../src/arena/roteiro.ts";
import { AMBIENTE, TOCHAS } from "../src/arena/cenario.ts";
import { TOCHAS_CAVERNA } from "../src/arena/caverna.ts";
import { SW, SH, PE_X, PE_Y, QUADROS, ESCALA_CHEFE } from "../src/arena/sprite.ts";
import { CW, CH } from "../src/arena/chefes-arte.ts";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const L: string[] = [];
const P = (s = "") => L.push(s);
const seg = (q: number) => `${(q / FPS).toFixed(q % FPS ? 1 : 0).replace(".", ",")} s`;
const tabela = (cab: string[], linhas: (string | number)[][]) => {
  P(`| ${cab.join(" | ")} |`);
  P(`| ${cab.map(() => "---").join(" | ")} |`);
  for (const l of linhas) P(`| ${l.join(" | ")} |`);
  P();
};
const TIPO_NOME: Record<string, string> = { cortante: "cortante", perfurante: "perfurante", concussao: "concussão", fogo: "fogo", frio: "frio", eletrico: "elétrico", trovejante: "trovejante", acido: "ácido", veneno: "veneno", necrotico: "necrótico", radiante: "radiante", psiquico: "psíquico", energetico: "energético" };

P("# SuaArenaD20 — tudo para recriar a ARENA D20");
P();
P("> Documento gerado por `remotion/scripts/documento.ts` a partir do código (as tabelas são os valores em uso).");
P("> Rode `node scripts/documento.ts` (dentro de `remotion/`) depois de qualquer mudança para atualizar.");
P();
P("Battle royale automático de RPG de mesa em pixel art, para Reels/TikTok/Shorts. 16 heróis aleatórios (ou vindos dos");
P("comentários) lutam todos contra todos com regras do **SRD 5.2**; cada rolagem sai de uma **seed**, então o mesmo episódio");
P("gera sempre a mesma luta, conferível rolagem por rolagem. O vencedor nunca é escolhido: ele sobe de nível e volta no");
P("próximo episódio como campeão. Perfil do CTA: **@SuaArenaD20**. Não usar o nome nem o logo \"Dungeons & Dragons\"/\"D&D\".");
P();

// ───────── 1. formato
P("## 1. Formato do vídeo");
P();
tabela(
  ["Item", "Valor"],
  [
    ["Saída", "1080×1920, 30 fps, **90 s exatos** (2700 quadros), H.264 + AAC, master −14 LUFS / −1 dBTP"],
    ["Resolução interna", "360×640, ampliada 3× sem suavizar (`imageSmoothingEnabled = false`, `image-rendering: pixelated`)"],
    ["Camadas", "**mundo** (cenário + lutadores + efeitos, com câmera: foco, zoom, tremor) e **interface** (HUD, banners, textos) por cima, sem câmera"],
    ["Arena do chefe", "mundo de 720×1280 mostrado inteiro (zoom 0,5 → cada pixel do mundo vira 1,5 px na saída); os rótulos dos lutadores passam para a interface, no tamanho normal"],
    ["Motor", "Remotion (React) desenhando em `<canvas>`; tudo procedural (sem imagens externas, sem fontes externas)"],
    ["Render", "`npx remotion render ArenaD20 out/arena-epNN.mp4 --props=EP.json --image-format=png --crf=16`"],
  ],
);

// ───────── 2. roteiro
P("## 2. Roteiro do episódio (tempos fixos)");
P();
tabela(
  ["Quadro", "Tempo", "Cena"],
  [
    [`0–${V.batalha}`, `0–${seg(V.batalha)}`, "intro: os lutadores caem do alto em círculo (1 a cada 4 quadros, poeira no pouso), nome + classe + NV embaixo; no episódio com chefe ele chega primeiro (quadro 4) com rugido e o banner **CUIDADO: [CHEFE]!** (16–66); **ESCOLHA SEU CAMPEÃO!** (72); contagem 3 (100), 2 (115), 1 (130), **LUTEM!** (145)"],
    [`${V.batalha}–${V.duelo}`, `${seg(V.batalha)}–${seg(V.duelo)}`, `batalha em rodadas (iniciativa d20 + DES), **${GRUPO} lutadores agindo ao mesmo tempo** (início escalonado de 6 quadros; as regras continuam em ordem de iniciativa); "[NOME] CAIU!" a cada queda; cut-ins congelam ${seg(CUTIN)}, no máximo 1 a cada ${seg(ESPACO_CUTIN)} (prioridade: crítico > abate > recurso em 2+ alvos)`],
    [`${V.duelo}–${V.vitoria}`, `${seg(V.duelo)}–${seg(V.vitoria)}`, `restam 2: tela **VS** (${seg(VS)}) com retratos, classe/NV, espécie, PV, CA, abates e itens; depois zoom 1,2× nos finalistas (na caverna: de 0,5× até 1×), trilha intensa, tremor nos especiais`],
    [`${V.vitoria}–${V.pergaminho}`, `${seg(V.vitoria)}–${seg(V.pergaminho)}`, "**VITÓRIA DE [NOME]!**, retrato sorrindo 2×, pose de vitória, confete, coluna de luz dourada, **SUBIU DE NÍVEL!** + NÍVEL a → b (se o chefe vence: **O [CHEFE] VENCEU!** + NENHUM HERÓI SOBREVIVEU)"],
    ["—", `${seg(BAU)}`, "**baú do campeão** (só versão 3, episódios múltiplos de 5, se um herói vence): entra depois da vitória e empurra o pergaminho; o campeão anda até o baú, abre, o item sobe girando com brilho e nome + poder"],
    [`${V.pergaminho}–${V.cta}`, `${seg(V.pergaminho)}–${seg(V.cta)}`, "pergaminho que desenrola: retrato, nome, espécie · classe, NÍVEL a → **b** piscando, vitórias; atributos (2×3, ganhos em verde), PV com d20 girando e a rolagem, CA, ataque, CD, espaços de magia; poderes antigos em 2 colunas e os novos com **NOVO!** em verde; itens com ícone, nome e descrição do poder; história letra a letra; \"DEFENDE O TÍTULO NA PRÓXIMA BATALHA!\"; selo de cera com d20"],
    [`${V.cta}–${V.fim}`, `${seg(V.cta)}–${seg(V.fim)}`, "CTA: fundo escuro, campeão 2× em pose de vitória com coroa, \"COMENTE NOME + DESCRIÇÃO DO SEU PERSONAGEM · OS DADOS DECIDEM O RESTO!\" (depois do · em dourado), d20 girando, @perfil"],
  ],
);
P("O ritmo da batalha é ajustado só esticando/comprimindo o tempo de cada turno (e sobrepondo o fim de um golpe com o início");
P("do próximo); nenhuma regra muda por causa do tempo.");
P();

// ───────── 3. seed
P("## 3. Seed e determinismo");
P();
P("- RNG `sfc32` alimentado pelo hash `cyrb128` da seed (texto). Toda rolagem passa por `rng.roll(rótulo, n, d, bônus)` e fica no log.");
P("- Ruído visual (grão, folhas, poeira, gotas) usa `hash3(x, y, z)` — nunca `Math.random`.");
P("- Seed vazia → `scripts/escolher-seed.ts` testa `arena-d20-epNN`, `-2`, `-3`… e grava a primeira com **≥ 35 turnos**, duelo final de **3 a 8 turnos** e **sem compressão**. Escolha só pelo ritmo, **nunca pelo vencedor**.");
P("- Regra nova nunca muda episódio antigo: tudo novo fica atrás de `versao` ou de um campo novo do JSON. Teste: regenerar a FICHA dos episódios antigos e conferir `git diff`.");
P();

// ───────── 4. JSON
P("## 4. Episódio = um JSON (`remotion/src/arena/episodios/epNN.json`)");
P();
tabela(
  ["Campo", "O que é"],
  [
    ["`numero`", "número do episódio (ARENA D20 #N)"],
    ["`nivelInicial` / `itemInicial`", "todos começam no nível N (subindo com rolagens) e com 1 item da classe; o chefe se fortalece junto (PV × 1 + 0,125/nível, +1 acerto/nível, dano × 1 + 0,25/nível, CD +1 a cada 2 níveis; heróis o tratam como um herói de PV médio) — Dragão vs 16 nv 5 com item vence ~45%"],
    ["`veteranos` / `nivelMinimo`", "luta só com fichas salvas (LENDAS); quem estiver abaixo de `nivelMinimo` sobe até ele com rolagens (LENDAS: 5)"],
    ["`serie`", "ordem: sem o campo = A; `\"B\"`, `\"C\"`… recomeçam do 1 sem campeão (ARENA D20 B #1); arquivos com código `B01`; nomes únicos entre as ordens (A = sequência do ep. 1, B = do 61, C = do 121)"],
    ["`seed`", "texto da seed; `\"\"` = escolhida automaticamente pelo ritmo"],
    ["`perfil`", "@ do CTA (`@SuaArenaD20`)"],
    ["`lutadores`", "até 16 `{ nome, descricao, autor }` dos comentários; vazio = aleatórios. Classe, espécie, cores, cabelo e arma saem da descrição"],
    ["`campeaoAnterior`", "`null` ou o `campeao.json` do episódio anterior (nível, atributos, PV, visual, vitórias, itens, coroa)"],
    ["`textos`", "`escolha`, `lutem`, `subiu`, `defende`, `cta`"],
    ["`versao`", "1 = regras dos eps. 1–3; 2 = nome + sobrenome únicos, foco no campeão, +1 nível ao derrubar o campeão; 3 = baú, itens, chefes; 4 = + magias de círculo alto, usadas antes das de nível baixo; **5 = + invisibilidade de verdade (ninguém mira em quem sumiu)** (usar sempre)"],
    ["`focoCampeao`", "`\"forte\"` (recomendado, ep. 12+) = 0,31 × PV máximo do campeão − 4,35 (campeão vence ~35–40%); `\"auto\"` (eps. 6–11) = 2,5 × (nível − 2); ou número fixo"],
    ["`arena`", "`\"calabouco\"` ou `\"floresta\"`. A `\"caverna\"` é **só para luta com chefe** e é escolhida sozinha quando há chefe"],
    ["`centro`", "`\"livre\"` (recomendado): sem tablado nem altar d20 no meio"],
    ["`chefe` / `focoChefe`", "força um chefe; sem o campo, versão 3 tem chefe nos episódios 10, 20, 30… · `focoChefe` padrão 1,25"],
    ["`audio`", "`arena/epNN.wav`"],
  ],
);

// ───────── 5. regras
P("## 5. Regras (SRD 5.2, simplificadas para luta automática)");
P();
P(`- Escala: **1 pé = ${PE} px** (5 pés = ${5 * PE} px). Corpo a corpo alcança ${ALCANCE} px; ponto de contato a ${CONTATO} px; ninguém fica a menos de ${SEPARACAO} px de outro.`);
P("- Criação: atributos 4d6 descartando o menor (rerrola o conjunto inteiro se a soma dos modificadores for ≤ 0), distribuídos pela prioridade da classe; antecedente +2/+1; PV = dado de vida máximo + CON; CA pela armadura/escudo/classe.");
P("- Turno: deslocamento (com ataque de oportunidade ao sair do alcance, exceto com Desengajar/voo) + ação (ataque, truque, magia, recurso) + ação bônus quando a classe tem.");
P("- Ataque: d20 + atributo + proficiência vs CA; 20 natural = crítico (dados de dano em dobro), 1 natural = falha. Vantagem/desvantagem rolam 2d20. Magias de área pedem salvaguarda (metade do dano no sucesso quando cabe). Concentração cai com dano (CON CD 10 ou metade do dano).");
P("- IA: corpo a corpo vai no alvo com melhor nota (distância, PV baixo, ameaça, foco no campeão/chefe); quem luta à distância mantém distância e recua de quem está colado. Nada é coordenado.");
P("- Morte: 0 PV = cai (sem testes de morte). Último de pé vence.");
P("- Subida de nível do vencedor: +1 nível, PV = dado de vida rolado + CON (mínimo 1), poderes do nível novo, Aumento de Atributo no nível 4 (+2 no atributo principal). Na versão 2+, quem derruba o campeão sobe 1 nível na hora (vencendo, soma +2).");
P("- Nomes (versão 2+): lutador sorteado nº `(episódio − 1) × 16 + posição` de uma sequência fixa de nomes × sobrenomes (permutações com saltos 29 e 23): nunca repete por 120 episódios e cada luta tem 16 primeiros nomes diferentes.");
P();
P("### Classes");
P();
tabela(
  ["Classe", "Dado de vida", "Atributos (prioridade)", "Salvaguardas", "Conjura com", "Estilo", "Cor"],
  CLASSE_IDS.map((id) => {
    const c = CLASSES[id];
    return [c.nome, `d${c.dv}`, c.prioridade.join(" > "), c.salvaguardas.join(", "), c.conjuracao ?? "—", c.distancia ? "à distância" : "corpo a corpo", `\`${c.cor}\``];
  }),
);
P("### Poderes por nível (1–5)");
P();
for (const id of CLASSE_IDS) {
  P(`**${CLASSES[id].nome}** — espaços de magia por nível: ${[1, 2, 3, 4, 5].map((n) => espacos(id, n).join("/") || "—").join(" · ")}`);
  PODERES[id].forEach((lista, i) => P(`- NV ${i + 1}: ${lista.map((p) => `**${p.nome}** (${p.desc})`).join("; ")}`));
  P();
}
P("### Espécies");
P();
tabela(
  ["Espécie", "Deslocamento", "Altura do sprite", "Traços"],
  ESPECIE_IDS.map((id) => {
    const e = ESPECIES[id];
    return [e.nome, `${e.deslocamento} pés`, `${e.altura}×`, TRACOS_ESPECIE[id].map((t) => `**${t.nome}** (${t.desc})`).join("; ")];
  }),
);
P(`Ancestralidades dracônicas: ${ANCESTRALIDADES.map((a) => `${a.nome} (${TIPO_NOME[a.dano] ?? a.dano}, \`${a.cor}\`)`).join(", ")}.`);
P();
P("### Armas");
P();
tabela(
  ["Arma", "Dano", "Atributo", "Tipo"],
  Object.values(ARMAS)
    .filter((a, i, arr) => arr.findIndex((b) => b.nome === a.nome) === i)
    .map((a) => [a.nome, `${a.n}d${a.d} ${TIPO_NOME[a.tipo] ?? a.tipo}`, a.atributo, `${a.distancia ? "à distância" : "corpo a corpo"}${a.duasMaos ? ", duas mãos" : ""}`]),
);
P(`Cores dos tipos de dano (números e efeitos): ${Object.entries(COR_DANO).map(([t, c]) => `${TIPO_NOME[t] ?? t} \`${c}\``).join(" · ")}.`);
P();

// ───────── 6. itens
P("## 6. Baú do campeão e itens mágicos (versão 3)");
P();
P(`- Episódios **5, 10, 15…**: depois da vitória o campeão abre um baú (cena de ${seg(BAU)}) e acha um item: d${ITEM_IDS.length}, rerrola se for de um tipo que ele já tem ou se não for da classe dele. 1 item por tipo.`);
P("- Os itens ficam no `campeao.json` e valem nas lutas seguintes. **Quem derruba o portador pega os itens** (só tipos que ainda não tem e que são da sua classe) — \"PEGOU O ITEM!\".");
P("- **Itens por classe:** quem luta à distância (classe à distância ou arma de disparo) não pega espada, machado nem escudo; quem luta corpo a corpo não pega cajado nem arco.");
P("- Catálogo com ícones 16×16: composição `ArenaItens` → `arena-d20/itens.png`.");
P();
tabela(
  ["Tipo", "Item", "Poder", "Distância", "Corpo a corpo", "Cor"],
  TIPOS.flatMap((t) =>
    ITEM_IDS.filter((id) => ITENS[id].tipo === t).map((id) => [t, ITENS[id].nome, ITENS[id].poder, podeUsar(id, true) ? "sim" : "não", podeUsar(id, false) ? "sim" : "não", `\`${ITENS[id].cor}\``]),
  ),
);

// ───────── 7. chefes
P("## 7. Chefes (versão 3, episódios 10, 20, 30…)");
P();
P(`- Ordem: ${ORDEM_CHEFES.map((c) => CHEFES[c].nome).join(" → ")} (e repete). O Beholder não está no SRD, então o "de muitos olhos" virou a Quimera.`);
P("- A luta é **sempre na caverna** e a caverna é **só** para chefe. O chefe entra como 17º lutador, no **centro** do círculo dos 16 heróis; é todos contra todos, mas os heróis preferem o chefe (`focoChefe`).");
P(`- Tamanho: sprite desenhado em ${CW}×${CH} e mostrado **${ESCALA_CHEFE}× maior** no mundo (${CW * ESCALA_CHEFE}×${CH * ESCALA_CHEFE}), redesenhado em resolução ${ESCALA_CHEFE}× para o pixel do chefe ter o mesmo tamanho do pixel dos heróis. O corpo (alcance e espaço) acompanha: raio = coluna "Corpo".`);
P(`- Age **2 vezes por rodada** (no seu número de iniciativa e no meio da ordem), todos os ataques em cada turno; especial com recarga (d6 ≥ recarga); não é empurrado; quem voa não provoca ataque de oportunidade. Não sobe acima de y = ${Y_MIN_CHEFE} px (a cabeça não some atrás do placar).`);
P("- **Quem derruba o chefe sobe 1 nível na hora e ganha um item** (da sua classe) — banner \"CHEFE DERROTADO!\" + rugido.");
P("- Se o chefe vence: sem baú, pergaminho com a ficha do chefe, \"A ARENA ESPERA UM NOVO CAMPEÃO\", e `campeao.json` = `null` (próximo episódio sem campeão).");
P("- Interface: barra de vida própria logo abaixo do HUD (retrato 16×16, nome em vermelho, \"CHEFE\", barra vermelha com PV).");
P();
tabela(
  ["Chefe", "Ficha", "CA", "PV", "Desloc.", "Voa", "Corpo", "Ataques", "Especial (recarga)", "Resiste"],
  ORDEM_CHEFES.map((id) => {
    const c = CHEFES[id];
    const e = c.especial;
    const esp = e.k === "sopro" ? `${e.nome}: cone ${e.n}d${e.d} ${TIPO_NOME[e.tipo]}, DES CD ${e.cd}, alcance ${e.alcance} px além do corpo` : e.k === "pedra" ? `${e.nome}: +${e.acerto}, ${e.n}d${e.d}+${e.bonus}` : e.k === "investida" ? `${e.nome}: corre o dobro, +${e.extraN}d${e.extraD}, empurra` : e.k === "rasante" ? `${e.nome}: voa até o alvo, vantagem` : `${e.nome}: uma mordida em cada herói colado`;
    return [c.nome, c.fonte, c.ca, c.pv, `${c.deslocamento} pés`, c.voa ? "sim" : "não", `${c.raio} px`, c.ataques.map((a) => `${a.nome} +${a.acerto} ${a.n}d${a.d}+${a.bonus}`).join("; "), `${esp} (${c.recarga}–6)`, c.resistencias.map((t) => TIPO_NOME[t]).join(", ") || "—"];
  }),
);
P("PV calibrados (o SRD dá bem mais) para o chefe vencer ~30% (Dragão ~50%), em 50 lutas simuladas por chefe com o campeão do ep. 8.");
P();

// ───────── 8. arenas
P("## 8. Arenas");
P();
tabela(
  ["Arena", "Mundo", "Área de luta (x0–x1, y0–y1)", "Centro", "Círculo inicial", "Luz ambiente", "Luzes"],
  (["calabouco", "floresta", "caverna"] as const).map((a) => {
    const g = GEO[a];
    return [a, `${g.w}×${g.h}`, `${g.lim.x0}–${g.lim.x1}, ${g.lim.y0}–${g.lim.y1}`, `${g.centro.x}, ${g.centro.y}`, `raio ${g.raio.x}×${g.raio.y}`, `rgb(${AMBIENTE[a].join(", ")})`, `${a === "caverna" ? TOCHAS_CAVERNA.length : TOCHAS.length} ${a === "floresta" ? "lanternas/fogueiras" : "tochas"}`];
  }),
);
P("- **Calabouço** (padrão): lajotas com variação, paredes de pedra em cima e nos lados, portões, correntes, estandartes, 10 tochas com chama animada e luz quente, poças que refletem, ratos, poeira no ar.");
P("- **Floresta**: clareira ao entardecer, grama e terra batida, linha de árvores, arcos de pedra em ruína, estandartes, lanternas e fogueiras, lagos, vaga-lumes, folhas caindo, coelhos.");
P("- **Caverna** (só chefe): 4× a área (2× cada lado), paredes de rocha em superelipse, estalagmites, cristais que brilham, lago subterrâneo, ossadas, gotas, poeira e morcegos; escura, 8 tochas com raio de luz 1,7×. A área de luta é a das arenas normais em 2× e a câmera mostra a caverna inteira (vinheta na tela); no duelo aproxima até 1×.");
P("- Luz: o mundo é escurecido pela luz ambiente e iluminado em modo aditivo pelas tochas/efeitos (cada luz tem raio, cor e tremulação); lutadores recebem brilho conforme a luz no ponto onde estão.");
P("- Sempre: grão leve e vinheta. `centro: \"livre\"` tira o tablado de degraus e o altar d20 do meio.");
P();

// ───────── 9. pixel art
P("## 9. Pixel art (motor próprio, tudo em código)");
P();
P("- `Tela`: buffer de **material** + **tom** por pixel. Formas: elipse, retângulo, polígono, cápsula (traço grosso redondo), linha. Cada forma recebe uma função de tom (volume esférico, cilíndrico ou fixo) e um padrão opcional (escamas, pelos, penas, tecido).");
P("- Rampas: cada material vira uma rampa de 5 tons com **hue shifting** (sombras mais frias/azuladas, luzes mais quentes/amareladas), sombreamento em 4 tons + brilho.");
P("- Contorno **sel-out** (contorno escuro colorido pelo material vizinho, nunca preto puro) e **rim light** na borda do lado da luz.");
P(`- Heróis: sprites **${SW}×${SH}**, âncora nos pés (${PE_X}, ${PE_Y}), corpo chibi de ~2,5 cabeças; 4 direções (S, N, E, W); animações ${Object.entries(QUADROS).map(([a, n]) => `${a} ${n}q`).join(", ")}; 7 expressões (neutra, foco, grito, dor, PV baixo, derrota, vitória); versão rasgada/suja com PV baixo.`);
P("- Peças por classe/espécie: armaduras (placas, malha, couro, manto, gi…), elmos/chapéus/capuzes, capas, tabardos, ombreiras, armas na mão, orelhas, chifres, presas, escamas; cores de pele/cabelo/olho/roupa sorteadas das paletas de `regras.ts`.");
P("- Retratos **96×64** (busto, para cut-in, VS, vitória e pergaminho) e mini **16×16** (HUD, \"CAIU!\").");
P(`- Chefes: vista de lado, ${CW}×${CH} no desenho, ${ESCALA_CHEFE}× no mundo; poses idle, andar, ataque, dano, derrota (tomba), vitória (rugido); retrato 96×64 recortado da cabeça e mini 16×16.`);
P("- Fontes bitmap próprias: grande 5×7 e pequena 3×5, com acentos do português, setas e sinal de menos; contorno de 1 px.");
P("- Sombra elíptica no chão, coroa dourada no campeão anterior, contorno de luz atrás de cada sprite, flash branco ao levar dano, recuo de 1–2 px.");
P();

// ───────── 10. interface
P("## 10. Interface");
P();
P("- **HUD** (topo, y 73–165, fundo escuro 78%): \"ARENA D20 #N\" em dourado, \"RODADA r · VIVOS v\"; grade 4×4 com mini retrato, primeiro nome, quadradinho da cor da classe, NV e barra de PV; quem está agindo pisca em dourado; caído = X vermelho e nome riscado; coroa no campeão.");
P("- Sobre cada lutador: barra de PV de 16 px, etiquetas de condição (FÚR fúria, MRC marcado, INV invisível, ESC escudo, CNC concentrando, LNT lento…), ▼ dourada em quem está no turno.");
P("- Golpe: caixa com o nome do golpe na cor do tipo, d20 girando com o resultado (verde acerto, cinza erro, dourado crítico, vermelho falha), números de dano flutuando (crítico maior), CURA em verde, \"SALVOU\"/\"FALHA\".");
P("- Banners: \"[NOME] CAIU!\" (desliza, mini retrato cinza com X, empilha), cut-in (faixa diagonal na cor da classe, retrato 2× e linhas de velocidade), VS, vitória, \"SUBIU DE NÍVEL!\" com coluna de luz, \"PEGOU O ITEM!\" com ícones, \"CHEFE DERROTADO!\".");
P("- Cores fixas: dourado `#ffd84a`, tinta `#1a1014`, papel do pergaminho `#e8d4a4`, tinta do pergaminho `#3a2418`, verde de ganho `#2e8a2e`.");
P("- Área segura: nada importante abaixo de y ≈ 530 (interface do app cobre a base).");
P();

// ───────── 11. áudio
const py = readFileSync(join(raiz, "../audio/arena.py"), "utf8");
const sfx = [...py.matchAll(/"([a-z]+)": sfx_/g)].map((m) => m[1]);
P("## 11. Áudio (`audio/arena.py`, 100% sintetizado com numpy, sem direito autoral)");
P();
P("- Trilha chiptune em **lá menor, 145 BPM**, em loop (pulso, triângulo e ruído); versão intensa no duelo, calma no pergaminho, recua no CTA.");
P("- Ambiente por arena: calabouço e caverna = tochas crepitando, gotas e vento grave com eco; floresta = vento nas folhas, grilos, coruja ao longe e fogueiras crepitando.");
P("- Um efeito por evento, ~4–6 dB acima da trilha, eco curto, limite de efeitos simultâneos. Eventos vêm de `public/arena/epNN-sons.json` (gerado pelo roteiro).");
P(`- Efeitos (${sfx.length}): ${sfx.join(", ")}.`);
P("- Determinístico: rodar de novo gera o mesmo WAV. Sempre masterizar: `scripts/masterizar.sh` (−14 LUFS, −1 dBTP).");
P();

// ───────── 12. arquivos e pipeline
P("## 12. Arquivos e pipeline");
P();
tabela(
  ["Arquivo", "Papel"],
  [
    ["`remotion/src/arena/rng.ts`", "sfc32 + cyrb128, rolagens com rótulo, `hash3`"],
    ["`regras.ts`", "classes, espécies, poderes, espaços de magia, nomes, paletas"],
    ["`personagem.ts`", "sorteio/leitura dos comentários, atributos, PV, CA, visual, campeão anterior, chefe como 17º, subida de nível"],
    ["`combate.ts`", "simulação completa (turnos em batidas mover/golpe/estado), IA, itens, chefes, geometria das arenas"],
    ["`roteiro.ts`", "batidas → quadros do vídeo (grupos de 4, congelamentos, cut-ins, VS, baú, história, pergaminho, sons)"],
    ["`render.ts`", "desenha cada quadro (mundo + interface) e a câmera"],
    ["`pixel.ts`, `sprite.ts`, `chefes-arte.ts`, `fonte.ts`, `efeitos.ts`", "motor de pixel art, sprites, chefes, fontes, efeitos de golpe"],
    ["`cenario.ts`, `floresta.ts`, `caverna.ts`", "arenas, luzes e vida no cenário"],
    ["`itens.ts`, `chefes.ts`", "itens (poderes, ícones, classe) e fichas dos chefes"],
    ["`ArenaD20.tsx`, `CatalogoItens.tsx`, `Folhas.tsx`", "composições: vídeo, catálogo de itens, sprite sheets"],
    ["`remotion/scripts/arena.ts`", "FICHA.md, campeao.json, lutadores.json, eventos de áudio"],
    ["`remotion/scripts/escolher-seed.ts`", "escolhe a seed pelo ritmo"],
    ["`scripts/arena.sh`", "pipeline completo de um episódio"],
  ],
);
P("```bash");
P("cd remotion && npm i && cd ..");
P("scripts/arena.sh remotion/src/arena/episodios/epNN.json");
P("# 0 seed pelo ritmo (se vazia) → 1 simulação + FICHA → 2 áudio → 3 vídeo → 4 master → 5 sprite sheets");
P("# saída: remotion/out/arena-epNN-master.mp4 e arena-d20/epNN/ (FICHA.md, campeao.json, lutadores.json, sprites/)");
P("```");
P();
P("Próximo episódio: copiar `arena-d20/epNN/campeao.json` para `campeaoAnterior`, `seed: \"\"`, `versao: 5`, `focoCampeao: \"forte\"`, `centro: \"livre\"`.");
P();

// ───────── 13. nomes
P("## 13. Nomes e sobrenomes");
P();
P(`- Nomes (${NOMES.length}): ${NOMES.join(", ")}.`);
P(`- Sobrenomes (${SOBRENOMES.length}): ${SOBRENOMES.join(", ")}.`);
P();
P("## 14. Entregas por episódio");
P();
P("- MP4 masterizado; `FICHA.md` (seed, fichas, rolagens, iniciativa, log com tempo do vídeo, ordem de queda, ficha nova, crédito SRD); `campeao.json`; `lutadores.json`; sprite sheets e retratos por lutador.");
P("- Texto de crédito obrigatório (na FICHA e na descrição):");
P();
P("---");
P();
P('This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.');

const saida = join(raiz, "../arena-d20/SuaArenaD20.md");
writeFileSync(saida, L.join("\n") + "\n");
console.log(`✓ ${saida} (${L.length} linhas)`);
