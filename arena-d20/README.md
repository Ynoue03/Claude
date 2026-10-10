# ARENA D20 — battle royale automático com regras de mesa

Vídeo vertical 1080×1920, 30 fps, **90 s**, em pixel art (resolução interna 360×640 ampliada 3× sem suavizar).
16 lutadores aleatórios, todos no nível 1, lutam todos contra todos com regras do **SRD 5.2**.
Cada rolagem sai de uma **seed**: o mesmo episódio gera sempre a mesma luta, e qualquer rolagem pode ser conferida na `FICHA.md`.
O campeão sobe de nível e termina com o pergaminho da ficha nova.

> Este projeto é um template **Remotion** (vídeo em série, mesmo formato e dados diferentes).
> Ele **não segue a identidade "quiet luxury"** do `CLAUDE.md`: tem estética própria de jogo retrô, pedida no briefing
> (`briefings/2026-10-10-arena-d20.md`).

> **Todas as regras combinadas:** [`REGRAS.md`](REGRAS.md) · **Tudo para recriar a arena do zero:** [`SuaArenaD20.md`](SuaArenaD20.md) (gerado do código por
> `node scripts/documento.ts`, dentro de `remotion/`).

## Gerar um episódio

```bash
cd remotion && npm i && cd ..
scripts/arena.sh                                          # episódio 1 (remotion/src/arena/episodios/ep01.json)
scripts/arena.sh remotion/src/arena/episodios/ep02.json   # outro episódio
```

Ou passo a passo (a partir de `remotion/`):

```bash
node scripts/arena.ts src/arena/episodios/ep01.json   # simulação → FICHA.md, campeao.json, eventos de áudio
python3 ../audio/arena.py 01                          # trilha + efeitos → public/arena/ep01.wav
npm run dev                                           # Studio: composição "ArenaD20"
npx remotion render ArenaD20 out/arena-ep01.mp4 --image-format=png --crf=16
../scripts/masterizar.sh out/arena-ep01.mp4           # -14 LUFS / -1 dBTP
npx remotion render ArenaFolhas ../arena-d20/ep01/sprites --sequence --image-format=png
```

Sem internet para o Remotion baixar o Chrome: `CHROME=/caminho/chrome-headless-shell scripts/arena.sh`
(ou `--browser-executable=` nos comandos acima).

## Episódio novo = só um JSON

`remotion/src/arena/episodios/epNN.json`:

| Campo | O que é |
| --- | --- |
| `numero` | número do episódio (`ARENA D20 #N`) |
| `seed` | semente de todas as rolagens. Deixe `""` e o `scripts/arena.sh` escolhe sozinho (`remotion/scripts/escolher-seed.ts`): a primeira de `arena-d20-epNN`, `-2`, `-3`… com **pelo menos 35 turnos**, duelo final de 3 a 8 turnos e sem compressão — só ritmo, nunca o vencedor. Outra seed = outra luta (o vencedor **não** é escolhido: troque a seed para outro resultado) |
| `perfil` | @ do CTA |
| `lutadores` | até 16 itens `{ "nome", "descricao", "autor" }` vindos dos comentários. Vazio = aleatório. Classe, espécie, cores, cabelo e arma saem da descrição; atributos, PV e golpes continuam nos dados |
| `campeaoAnterior` | `null` ou o conteúdo de `arena-d20/epNN/campeao.json` do episódio anterior: entra como 1 dos 16, com nível, atributos, PV, poderes e coroa |
| `textos` | banners: `escolha`, `lutem`, `subiu`, `defende`, `cta` (no CTA, o trecho depois de ` · ` sai em dourado) |
| `versao` | `2` (padrão para episódios novos): nome **e sobrenome** que nunca se repetem na série, leve foco dos lutadores no campeão e **+1 nível na hora para quem derrubar o campeão** (vencendo, soma +2). Sem o campo = regras dos episódios 1–3 (reproduzem a mesma luta de antes) |
| `focoCampeao` | preferência dos lutadores por atacar o campeão (versão 2+): `"forte"` (recomendado, ep. 12+) cresce com os **PV máximos** do campeão — `0,31 × PV − 4,35`, calibrado para ele vencer ~35–40% em qualquer nível (com o antigo, o Korrin nv 7 vencia 100%); `"auto"` (eps. 6–11) = `2,5 × (nível − 2)`; ou um número fixo: `1` = leve, `5` = forte |
| `arena` | `"calabouco"` (padrão), `"floresta"` — clareira ao entardecer com lanternas, fogueiras, lagos e vaga-lumes; muda também o som ambiente — A `"caverna"` (4× maior, 720×1280, escura, com 8 tochas, cristais, lago subterrâneo, morcegos) é **só para luta com chefe** e entra sozinha nos episódios com chefe; a câmera mostra a caverna inteira |
| `chefe` | força um chefe (`"MINOTAURO"`, `"GRIFO"`, `"HIDRA"`, `"GIGANTE"`, `"QUIMERA"`, `"DRAGAO"`). Sem o campo, na versão 3 os episódios **10, 20, 30…** têm chefe automaticamente, nessa ordem |
| `focoChefe` | quanto os heróis preferem atacar o chefe (padrão `1.25`, calibrado para o chefe vencer ~30%) |
| `centro` | `"livre"` (recomendado para episódios novos): sem tablado de degraus e sem pedra d20 no meio, e sem obstáculo na luta. Sem o campo = com o tablado e o altar (episódios 1–6 reproduzem igual) |
| `versao` `3` | tudo da versão 2 + **baú do campeão** e **itens mágicos** (abaixo). Use em episódios novos |
| `audio` | WAV em `remotion/public/` (`arena/epNN.wav`); vazio = sem áudio |

Exemplo de comentário: `{ "nome": "Brisa", "descricao": "elfa druida de cabelo ruivo com cajado e capa verde", "autor": "@fulana" }`.

## Baú do campeão e itens (versão 3)

Nos episódios **5, 10, 15…** entra uma cena de 4 s depois da vitória: o campeão abre um baú e acha um item
(d30, rerrola se sair um **tipo** que ele já tem — só vale 1 item de cada tipo — ou um item que não é da classe dele). O pergaminho fica um pouco mais rápido
para caber nos 90 s. Os itens ficam na ficha (`campeao.json` → `itens`) e valem em todas as lutas seguintes.
**Quem derrubar o portador pega os itens dele** na hora (só os de tipos que ainda não tem; aparece "PEGOU O ITEM!"),
e se vencer leva para o próximo episódio. Catálogo com ícones: `itens.png` (composição `ArenaItens`).

**Itens por classe:** quem luta à distância (Mago, Feiticeiro, Bruxo, Clérigo, Druida, Bardo, Patrulheiro, ou quem tem arma de disparo) não pega
espada, machado nem escudo; quem luta corpo a corpo (Bárbaro, Guerreiro, Paladino, Ladino, Monge) não pega cajado nem
arco. Vale no baú, no item que o chefe deixa cair e ao derrubar o portador (o item que não serve fica para trás).

| Tipo | Versão 1 | Versão 2 | Versão 3 |
| --- | --- | --- | --- |
| Espada | **Lâmina Rubra**: 1º acerto do turno +1d6 | **Lâmina Vampira**: cada acerto recupera 1d4 PV | **Lâmina do Inverno**: cada acerto deixa o alvo lento |
| Armadura | **Couraça do Bastião**: +2 CA | **Cota de Espinhos**: quem acerta corpo a corpo leva 1d4 | **Armadura Rúnica**: magias causam metade do dano |
| Elmo | **Elmo da Última Chance**: engana a morte (volta com 1 PV, 1× por luta) | **Elmo do Vigia**: +5 na iniciativa | **Elmo da Mente Firme**: vantagem em todas as salvaguardas |
| Botas | **Botas Ligeiras**: +10 pés e sem ataque de oportunidade | **Botas de Raiz**: não é empurrado/puxado, +1 CA | **Botas do Vento**: +3 CA contra ataques à distância |
| Luvas | **Manoplas Certeiras**: crítico com 1 a menos no d20 | **Luvas da Precisão**: +2 em todos os ataques | **Manoplas do Trovão**: críticos +2d8 trovejante |
| Capa | **Capa das Sombras**: invisível 2 turnos ao chegar à metade dos PV | **Capa da Miragem**: 1º ataque contra ele por rodada tem desvantagem | **Capa da Seiva**: +2 PV no início de cada turno |
| Arco | **Arco Sussurrante**: dispara sozinho 1d6 por turno | **Arco das Chamas**: ataques à distância +1d6 de fogo | **Arco do Caçador**: vantagem contra quem está com metade dos PV ou menos |
| Machado | **Machado Ceifador**: ao derrubar alguém, +1d8 PV | **Machado da Ira**: +1d6 de dano com metade dos PV ou menos | **Machado Fendedor**: ignora resistências |
| Cajado | **Cajado Arcano**: magias de ataque +1d6 | **Cajado da Sabedoria**: +2 na CD das magias | **Cajado da Renovação**: recupera 1 espaço de magia a cada 2 rodadas |
| Escudo | **Escudo do Primeiro Golpe**: bloqueia o 1º ataque que causaria dano | **Escudo Espelhado**: devolve metade do dano de magias de ataque | **Escudo Guardião**: +1 CA e todo dano recebido −2 |

## Chefes (versão 3, episódios 10, 20, 30…)

Uma criatura grande do SRD 5.2 entra como **17º lutador**, no meio da caverna, cercada pelos 16 heróis, **3× maior** que o
primeiro desenho (sprite de 336×336 no mundo, redesenhado em resolução tripla; o corpo e o alcance crescem junto). É todos contra
todos: os heróis também se atacam, mas preferem o chefe. Barra de vida própria embaixo do HUD, banner
"CUIDADO: …!" na abertura e rugido. Regras:

- age **2 vezes por rodada** (no seu número de iniciativa e no meio da ordem), com todos os ataques em cada turno;
- corpo grande: alcança e ocupa mais espaço, não é empurrado; quem voa não provoca ataque de oportunidade;
- especial com recarga (d6): sopro em cone, arremesso de pedra, rasante com vantagem, investida ou uma mordida por cabeça;
- **quem derrubar o chefe sobe 1 nível na hora e ganha um item** (d30, só da sua classe) — aparece "CHEFE DERROTADO!";
- se o chefe vencer: sem baú, o pergaminho mostra a ficha dele, e o próximo episódio começa sem campeão
  (`campeao.json` sai `null`).

| Chefe | Ficha do SRD 5.2 | CA | PV | Ataques | Especial | Vence* |
| --- | --- | --- | --- | --- | --- | --- |
| Minotauro | Minotaur | 14 | 145 | Machado grande 2d12+4, chifrada 2d8+4 | Investida (+2d8, empurra) | 30% |
| Grifo | Griffon | 12 | 135 | Bico 1d8+4, garras 2d6+4 | Rasante (voa, vantagem) | 36% |
| Hidra | Hydra | 15 | 120 | 3 mordidas 1d10+5 | Fúria das cabeças | 28% |
| Gigante da Colina | Hill Giant | 13 | 100 | 2× clava grande 3d8+5 | Arremesso de pedra 3d10+5 | 34% |
| Quimera | Chimera | 14 | 90 | Mordida, chifres, garras | Sopro de fogo 7d8 (CD 15) | 36% |
| Dragão Vermelho | Young Red Dragon | 18 | 110 | Mordida 2d10+6, garras 2d6+6 | Sopro de fogo 6d6 (CD 14), resiste a fogo | 48% |

\* 50 lutas simuladas por chefe (já 3× maior, na caverna mostrada inteira) com `focoChefe` 1,25 e o campeão do ep. 8 (Bárbaro nv 4). PV ajustados (o dragão
jovem tem bem mais na ficha) para o chefe perder na maioria das vezes, mas ser sempre ameaça. O Beholder não está no
SRD, então o chefe "de muitos olhos" virou a Quimera.

## Nomes

Na versão 2, cada lutador sorteado recebe o nome número `(episódio − 1) × 16 + posição` de uma sequência fixa de
48 nomes × 40 sobrenomes (`nomeCompleto` em `regras.ts`): as 1920 combinações são todas diferentes e cada luta tem 16
primeiros nomes diferentes, então nenhum nome se repete por 120 episódios. Nomes vindos de comentários são usados como
vieram; se algum coincidir com o sorteado, o sorteado troca por um da reserva no fim da sequência. O campeão antigo
sem sobrenome ganha um, fixo, na primeira luta da versão 2 (Yara → Yara Rubrafonte).

## Onde está cada parte

| Arquivo | O que faz |
| --- | --- |
| `remotion/src/arena/regras.ts` | tabelas do SRD 5.2: classes, espécies, dados de vida, espaços de magia, poderes por nível (1–5) |
| `remotion/src/arena/personagem.ts` | sorteio dos 16 (classes, espécies, nomes, peças do visual), 4d6 descartando o menor, PV, CA, leitura da descrição, subida de nível |
| `remotion/src/arena/combate.ts` | a luta: iniciativa, deslocamento, ataque de oportunidade, vantagem/desvantagem, crítico/falha, salvaguardas, concentração, recursos de classe e espécie, IA (corpo a corpo × atiradores que recuam) |
| `remotion/src/arena/roteiro.ts` | mostra os turnos em **grupos de 4 lutadores agindo ao mesmo tempo** (constante `GRUPO`; as regras continuam em ordem de iniciativa), distribui os grupos nos 90 s (só o ritmo muda, nunca as regras), escolhe os cut-ins (crítico > abate > recurso, um a cada 4,5 s), agenda sons, história e pergaminho |
| `remotion/src/arena/pixel.ts` + `sprite.ts` | motor de pixel art: rampas com hue shifting, sombreamento em 4 tons, sel-out, rim light; sprites 48×64, retratos 96×64 e 16×16, 7 expressões, versões rasgadas |
| `remotion/src/arena/floresta.ts` | floresta: grama e terra batida, linha de árvores, arcos em ruína, estandartes, monte de terra em degraus com pedras rúnicas, pedra d20 com musgo, lanternas, fogueiras, lagos, vaga-lumes, folhas caindo, coelhos |
| `remotion/src/arena/chefes.ts` + `chefes-arte.ts` | fichas dos chefes e os sprites deles (112×112, vista de lado), retrato e mini |
| `remotion/src/arena/caverna.ts` | caverna dos chefes: paredes de rocha, estalagmites, cristais, lago, ossadas, gotas, morcegos, 8 tochas |
| `remotion/src/arena/cenario.ts` | calabouço: lajotas, paredes, portões, correntes, estandartes, tablado de degraus com runas, altar d20, 10 tochas com luz, poças, ratos, poeira |
| `remotion/src/arena/efeitos.ts` | golpes: cortes, flechas, raio de fogo, mísseis, raio de gelo, onda trovejante, chama sagrada, espinhos, notas da zombaria, sopro em cone, cura… |
| `remotion/src/arena/render.ts` | monta cada quadro: mundo + luz, HUD 4×4, caixas de golpe, d20 girando, números, "CAIU!", cut-in, VS, vitória, pergaminho, CTA |
| `audio/arena.py` | chiptune em lá menor (145 BPM), versão intensa no duelo, ambiente de calabouço, ~40 efeitos sintetizados |
| `remotion/scripts/arena.ts` | gera `FICHA.md`, `campeao.json`, `lutadores.json` e os eventos de áudio |

## Limites conhecidos

- Poderes de nível 3–5 aparecem no pergaminho, mas só parte deles tem efeito na luta (Crítico Aprimorado, Ataque Extra,
  Ataque Furtivo 2d6/3d6, truques com 2 dados, Fúria 3×). Forma Selvagem, magias de 2º/3º círculo e Golpe Atordoante
  ainda não são usados pela IA. Os de nível 2 que valem em combate estão implementados, exceto Forma Selvagem,
  Fonte de Magia/Metamagia e Defesa Paciente/Passo do Vento.
- Mago gasta 1 dos 2 espaços na Armadura Arcana antes da luta (regra de mesa), então luta com 1 espaço de magia.
- A IA é simples de propósito: escolhe alvo por distância e PV, não coordena nada.

---

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
