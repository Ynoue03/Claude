# Estúdio de Motion — Academia & Alimentação (aesthetic)

Este repositório produz vídeos curtos de motion graphics com o Claude, em dois motores:

| Pasta          | Motor                         | Use para                                                                 |
| -------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `remotion/`    | Remotion (React)              | **Templates em série** — mesmo vídeo, dados diferentes (treinos, receitas) |
| `hyperframes/` | HyperFrames (HTML + GSAP)     | **Peças únicas e rápidas** — motion graphic de 8–15 s, dica, chamada, legenda em vídeo gravado |

Antes de mexer em um projeto, entre na pasta dele e use as skills instaladas lá
(`remotion-best-practices` / `hyperframes`). Elas têm as regras técnicas de cada motor.

**Vídeo novo? Comece pelo `GUIA-EDICAO.md`** (ou `/novo-video`): briefing com nicho e vídeo modelo,
presets por nicho, catálogos de transições e efeitos sonoros, plano de edição e checklist de entrega.
Não produza sem briefing e plano aprovados.

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
- Títulos: palavra por palavra saindo de uma máscara (0,07 s entre palavras), com quebra de linha balanceada.
- Listas: um item a cada 0,5–0,6 s.
- Transição entre cenas: **soft rise** (0,7 s) — a cena que sai sobe e desfoca, a que entra vem de baixo — com um vazamento de luz quente sobre o corte. Nunca zoom brusco.
- Sempre: fundo "vivo" (luz suave que respira + vinheta) e grão de filme (~0,07) por cima.

**Peças de acabamento (Remotion: `remotion/src/components/`)** — reutilize em vez de recriar:
| Componente | O que faz |
| --- | --- |
| `Backdrop` | fundo com luz que respira e vinheta (`escuro` para cenas oliva) |
| `WordReveal` / `TextoComDestaque` | título palavra a palavra / com trecho sublinhado à mão |
| `Kicker` | rótulo em caixa alta com traço que se desenha |
| `GhostWord` | palavra gigante translúcida ao fundo do gancho |
| `LineIcon` + `icones` | ícones de traço que se desenham (halter, folha, tigela, salvar) |
| `Anel` | anel de calorias com fatias por macro |
| `Chrome` | moldura: @perfil, "01 / 04" e barra de progresso |
| `softRise` / `Vazamentos` | transição da marca e luz quente nos cortes |
| `Trilha` | música opcional com fade (prop `musica`, arquivo em `public/`) |

No HyperFrames, os mesmos efeitos estão em `hyperframes/index.html` (moldura, luz, grão) e nos helpers
`dividir`/`subir`/`desenhar`/`entrar`/`sair` dentro de cada arquivo de `compositions/`.

**Formato:** vertical 1080×1920, 30 fps. Área segura: 96 px nas laterais, 220 px no topo, 320 px na base
(a interface do Reels/TikTok cobre essas áreas).

**Estrutura padrão de um vídeo:** Gancho/título (≈3 s) → Conteúdo (lista, passos, números) → Dica ou dado (≈3 s) → CTA "salve / comente" + @perfil (≈2,5 s). Total ideal: 10–20 s.

## Áudio (detalhes em `ESTUDO-AUDIO.md`)
- Trilhas e efeitos são **próprios**, gerados por `audio/gerar.py` (sem direito autoral de terceiros).
- Treino → `treino-house` (112 BPM) · Receita → `receita-lofi` (84 BPM) · Dica/pré-treino → `pre-treino-pop` (100 BPM).
- Um efeito por evento importante (corte, item de lista, destaque, fecho); listas sobem na escala; nada de sons "meme".
- Remotion: use `<Som arquivo em volume>` dentro da cena que dispara o evento e os volumes de `mix` em `components/Som.tsx`.
- Acentos ~4–6 dB acima da trilha; a trilha recua no fecho.
- **Sempre masterizar antes de postar:** `scripts/masterizar.sh out/video.mp4` (−14 LUFS, −1 dBTP).

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

# Vídeo modelo → ficha técnica (cortes, ritmo, BPM, quadros)
python3 scripts/analisar-modelo.py modelos/referencia.mp4

# Entrega (volume padrão das redes)
scripts/masterizar.sh remotion/out/treino.mp4      # gera treino-master.mp4
python3 audio/gerar.py                              # regenera trilhas e efeitos

# HyperFrames
cd hyperframes
npm run dev          # preview/Studio
npm run check        # valida (lint, layout, contraste) — rodar sempre antes de renderizar
npm run render       # MP4 em out/
```
