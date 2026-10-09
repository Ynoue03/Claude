---
name: novo-video
description: Inicia a criação de um vídeo novo (motion, Reels, TikTok, Shorts) seguindo o GUIA-EDICAO.md — pergunta o nicho e se existe vídeo modelo, analisa o modelo, escolhe transições e efeitos sonoros nos catálogos e apresenta um plano de edição antes de produzir. Use sempre que a pessoa pedir um vídeo novo, mesmo que diga só "faz um vídeo de X", "quero um reels", "edita igual a esse vídeo", "novo vídeo" ou envie um vídeo de referência.
---

# Novo vídeo

Siga `GUIA-EDICAO.md` (raiz do repositório) — ele é a fonte da verdade. Resumo do fluxo:

## 1. Briefing (antes de qualquer código)

Leia `GUIA-EDICAO.md` seções 1 e 3. Se o pedido ainda não responde, pergunte **em uma única rodada**
(use a ferramenta de perguntas com opções clicáveis quando disponível):

1. **Qual o nicho?** (academia · alimentação · beleza/skincare · moda · imobiliário · tecnologia · finanças · educação · viagem · pets · outro)
2. **Tem vídeo modelo?** (arquivo em `modelos/`, link, ou "não")
3. Objetivo e plataforma (alcance/salvar/vender · Reels/TikTok/Shorts/anúncio)
4. Áudio (trilha própria · música licenciada · só efeitos para usar áudio em alta · narração)

Duração, roteiro, mídia e identidade: use o que a pessoa já disse; o resto vem do preset do nicho
e do `CLAUDE.md`, e você **informa** os padrões adotados em vez de perguntar tudo.

Salve as respostas copiando `briefings/_modelo.md` para `briefings/AAAA-MM-DD-<nome>.md`.

## 2. Vídeo modelo (se houver)

- Link de rede social: peça o arquivo (não é possível baixar daqui com confiabilidade).
- Rode `python3 scripts/analisar-modelo.py modelos/<arquivo>` e **abra** `quadros.png` e `onda.png`.
- Complete a seção "Preencher olhando os quadros" da `ficha.md`; mostre à pessoa o que vai copiar
  (ritmo, estrutura, tipo de transição) e o que vai adaptar à marca. Nunca copie música, marca ou conteúdo alheio.

## 3. Plano de edição

Monte o plano no formato da seção 8 do guia: cenas, tempos, transições (catálogo seção 4),
efeitos sonoros com tempo local (catálogo seção 5, regras de sincronia), trilha e BPM (seção 6).
Escolha o motor: série/dados variáveis → `remotion/`; peça única → `hyperframes/`.
**Peça aprovação do plano antes de produzir.**

## 4. Produção e entrega

- Reutilize os componentes do `CLAUDE.md` (Remotion) e os helpers do HyperFrames; leia as skills do motor.
- Efeito "a criar" no catálogo: gere em `audio/gerar.py` (siga as receitas existentes) e rode o gerador.
- Novo nicho aprovado: adicione a linha na tabela de presets (seção 3 do guia).
- Valide e entregue pelo checklist da seção 9 (lint/check, stills, `scripts/masterizar.sh`).
