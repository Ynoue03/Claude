# Estúdio de Motion — Academia & Alimentação (aesthetic)

Este repositório produz vídeos curtos de motion graphics com o Claude, em dois motores:

| Pasta          | Motor                         | Use para                                                                 |
| -------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `remotion/`    | Remotion (React)              | **Templates em série** — mesmo vídeo, dados diferentes (treinos, receitas) |
| `hyperframes/` | HyperFrames (HTML + GSAP)     | **Peças únicas e rápidas** — motion graphic de 8–15 s, dica, chamada, legenda em vídeo gravado |

Antes de mexer em um projeto, entre na pasta dele e use as skills instaladas lá
(`remotion-best-practices` / `hyperframes`). Elas têm as regras técnicas de cada motor.

## Identidade visual (vale para os dois motores)

**Clima:** calmo, limpo, editorial, "clean girl / quiet luxury". Nada de neon, glitch, cortes agressivos ou fontes pesadas.

**Paleta** (fonte da verdade: `remotion/src/brand.ts`; espelhada em `hyperframes/index.html` `:root`):

| Token     | Hex       | Uso                                  |
| --------- | --------- | ------------------------------------ |
| cream     | `#F3EEE6` | fundo principal                      |
| sand      | `#E4D8C8` | fundo de listas                      |
| clay      | `#B98B6A` | detalhes, linhas, números decorativos |
| clay-dark | `#9A6E50` | clay quando for **texto** (contraste) |
| sage      | `#9AA58A` | marcadores, barras                   |
| olive     | `#5C6449` | fundo de dica / CTA                  |
| ink       | `#1C1B19` | texto principal                      |
| muted     | `#6E675E` | texto secundário, rótulos            |

**Tipografia** (arquivos locais, renderizam offline):
- Títulos: *Cormorant Garamond itálico 500* — grande (120–150 px em 1080 de largura).
- Texto/números: Inter 300 / 500 / 700.
- Rótulos ("kicker"): Inter 500, 30 px, CAIXA ALTA, espaçamento 8 px, cor muted.

**Movimento:**
- Entrada padrão ("reveal"): sobe 40 px + fade + desfoque 8→0 px, 0,9 s, curva `bezier(0.16, 1, 0.3, 1)` (GSAP: `expo.out`).
- Listas: um item a cada 0,5–0,6 s.
- Transições entre cenas: fade (0,5 s) ou slide de baixo (0,6 s). Nunca zoom brusco.
- Sempre uma textura de grão sutil (opacidade ~0,07) por cima.

**Formato:** vertical 1080×1920, 30 fps. Área segura: 96 px nas laterais, 220 px no topo, 320 px na base
(a interface do Reels/TikTok cobre essas áreas).

**Estrutura padrão de um vídeo:** Gancho/título (≈3 s) → Conteúdo (lista, passos, números) → Dica ou dado (≈3 s) → CTA "salve / comente" + @perfil (≈2,5 s). Total ideal: 10–20 s.

## Tom do texto
- Português do Brasil, frases curtas, sem exagero ("secar 10 kg em 7 dias" ❌).
- Nada de promessa de resultado ou orientação médica; valores nutricionais são aproximados (use "≈").

## Comandos
```bash
# Remotion
cd remotion && npm i
npm run dev                                        # Studio (preview e edição)
npx remotion render TreinoDoDia out/treino.mp4      # renderiza com os dados de exemplo
npx remotion render TreinoDoDia out/costas.mp4 --props=./exemplos/costas.json  # outro conteúdo, mesmo template

# HyperFrames
cd hyperframes
npm run dev          # preview/Studio
npm run check        # valida (lint, layout, contraste) — rodar sempre antes de renderizar
npm run render       # MP4 em out/
```
