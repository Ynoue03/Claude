# Arena D20 — batalhas pixel art com regras de RPG (TikTok / Reels / Shorts)

Cada vídeo é um **"todos contra todos" entre 10 heróis** numa arena pixel art (estilo do vídeo modelo
"Poké Pixel Arena"), com **regras da 5ª edição (SRD 5.2)**: atributos rolados em 4d6, PV rolados,
ataques d20 contra CA, salvaguardas, críticos, magias com espaços e concentração. Nada é roteirizado:
a batalha é simulada rolando dados de verdade, e a ficha publicada prova cada rolagem.

> **Esta pasta tem identidade própria.** A paleta "aesthetic" e as regras de movimento do `CLAUDE.md`
> da raiz valem para os vídeos de academia/alimentação, **não** para a Arena (aqui o visual é retrô 8/16-bit).

## Fluxo de um vídeo

```bash
cd arena-dnd
npm i                                   # 1ª vez
npm run audio                           # 1ª vez: gera trilha chiptune + efeitos (próprios)

# 1. coloque os personagens dos comentários em personagens/fila.json (ou use /nova-batalha no Claude)
# 2. monta a batalha (pega até 10 da fila; o resto é sorteado), rola tudo e mixa o áudio
npm run batalha
# 3. renderiza e masteriza (−14 LUFS) → out/batalha-001-final.mp4
npm run render -- batalha-001
```

Outros comandos:

```bash
npm run dev                              # Studio do Remotion (mude a semente nos props e veja outra luta)
npm run batalha -- --semente 1234        # repete uma batalha exatamente
npm run batalha -- --sem-fila            # 10 personagens aleatórios
npm run batalha -- --titulo "TORNEIO DOS MAGOS" --perfil @suaconta
npm run sprites -- batalha-001           # folha de aprovação só com os 10 da batalha
```

`npm run batalha` gera:

| Arquivo | Para quê |
|---|---|
| `batalhas/<nome>.json` | props do vídeo (semente + lutadores) — a batalha inteira sai daqui |
| `batalhas/<nome>-ficha.md` | fichas, todas as rolagens, log do combate, **legenda e comentário fixado sugeridos** e o crédito do SRD |
| `public/mix/<nome>.wav` | trilha + efeitos já sincronizados com os golpes |

## Personagens dos comentários

`personagens/fila.json`:

```json
[
  { "nome": "Bruna", "descricao": "elfa ladina de capuz verde e cabelo ruivo", "autor": "@fulana" }
]
```

- Da **descrição** saem: classe, espécie, cores (cabelo, roupa/capa, detalhes, olhos, armadura), estilo de cabelo,
  barba e arma preferida ("com machado", "com arco"). O que não estiver escrito é sorteado.
- Os **atributos, PV e golpes nunca vêm da descrição** — sempre dos dados (4d6, dado de vida, d20).
- Quem já lutou fica marcado com `"usado": "batalha-001"` e não entra de novo (apague o campo para repetir).
- O `autor` aparece no fim do vídeo se o personagem vencer ("CRIADO POR @fulana").

Palavras reconhecidas (português ou inglês): guerreiro, bárbaro, paladino, patrulheiro/arqueiro, ladino/assassino/ninja,
monge, mago, feiticeiro, bruxo/warlock/necromante, clérigo/sacerdote, druida, bardo · humano, elfo, anão, halfling, gnomo,
orc/meio-orc, tiefling/chifres, draconato/dragão, golias · cores comuns (vermelho, azul, dourado, roxo, ruivo, loiro…).

## Como está organizado

```
src/motor/        regras e simulação (sem nada de vídeo)
  dados.ts          dados com semente: d20, 4d6, "2d6+3", vantagem/desvantagem
  srd.ts            classes, espécies, armas e magias do SRD 5.2 (nível 5)
  personagem.ts     ficha: rolagens de atributos, PV, CA, aparência
  descricao.ts      lê a descrição do comentário
  batalha.ts        combate rodada a rodada → eventos com tempo em quadros
src/pixel/        arte
  sprites.ts        sprites 40×40 em vista 3/4 montados por peças sorteadas (elmos, capuz, roupas, capa…) + armas
  cenario.ts        ilha, arena octogonal, tochas, árvores, água
  fonte.ts          fonte bitmap 5×7 com acentos
src/render/quadro.ts   desenha cada quadro (canvas 270×480 → 1080×1920, escala 4×)
audio/gerar_chip.py    trilha chiptune 150 BPM + 22 efeitos 8-bit
scripts/              nova-batalha.ts (CLI), render.sh, preview-sprites.ts
```

Determinismo: a mesma semente gera sempre a mesma batalha no Node (ficha) e no navegador (vídeo).
Se mexer no simulador, nunca sorteie dentro de uma função de comparação de `sort`.

## Direitos

- Regras, classes, espécies e magias: **SRD 5.2, CC-BY-4.0** (crédito já incluído em cada ficha — cole-o na descrição do perfil ou no fim da legenda). Ver `PESQUISA-DND.md`.
- Sprites, cenário, fonte, trilha e efeitos: **feitos neste repositório** (sem assets de terceiros).
- O vídeo modelo e os prints do pack "zerie.itch.io" foram só referência de estilo; nada deles foi copiado.
  Se quiser usar aquele pack de verdade, confira a licença dele no itch.io antes.
- Não use "D&D"/"Dungeons & Dragons" como nome da conta nem a logo (marca registrada da Wizards).
