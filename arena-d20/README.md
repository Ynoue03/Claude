# ARENA D20 — battle royale automático com regras de mesa

Vídeo vertical 1080×1920, 30 fps, **90 s**, em pixel art (resolução interna 360×640 ampliada 3× sem suavizar).
16 lutadores aleatórios, todos no nível 1, lutam todos contra todos com regras do **SRD 5.2**.
Cada rolagem sai de uma **seed**: o mesmo episódio gera sempre a mesma luta, e qualquer rolagem pode ser conferida na `FICHA.md`.
O campeão sobe de nível e termina com o pergaminho da ficha nova.

> Este projeto é um template **Remotion** (vídeo em série, mesmo formato e dados diferentes).
> Ele **não segue a identidade "quiet luxury"** do `CLAUDE.md`: tem estética própria de jogo retrô, pedida no briefing
> (`briefings/2026-10-10-arena-d20.md`).

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
| `focoCampeao` | preferência dos lutadores por atacar o campeão (versão 2+): `"auto"` (recomendado) cresce com o nível do campeão — `2,5 × (nível − 2)`, calibrado para ele vencer ~50% (30 lutas por nível com a Yara nos níveis 2–5); ou um número fixo: `1` = leve (padrão), `5` = forte |
| `arena` | `"calabouco"` (padrão) ou `"floresta"` — clareira ao entardecer com lanternas, fogueiras, lagos e vaga-lumes; muda também o som ambiente |
| `centro` | `"livre"` (recomendado para episódios novos): sem tablado de degraus e sem pedra d20 no meio, e sem obstáculo na luta. Sem o campo = com o tablado e o altar (episódios 1–6 reproduzem igual) |
| `audio` | WAV em `remotion/public/` (`arena/epNN.wav`); vazio = sem áudio |

Exemplo de comentário: `{ "nome": "Brisa", "descricao": "elfa druida de cabelo ruivo com cajado e capa verde", "autor": "@fulana" }`.

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
