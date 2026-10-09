---
name: novo-video
description: Conduz a criação de um vídeo curto editado (Reels, TikTok, Shorts, anúncio, motion graphics) do briefing ao plano de edição — pergunta o nicho e se existe vídeo modelo, analisa o modelo (cortes, ritmo, BPM), escolhe transições e efeitos sonoros em catálogos por nicho e entrega um plano de edição cena a cena antes de produzir. Use sempre que a pessoa pedir um vídeo novo ou uma edição, mesmo que diga só "faz um reels de X", "quero um vídeo pro Instagram", "edita igual a esse vídeo", "que transição e som eu uso?", "monta a edição", "novo vídeo", ou envie um vídeo de referência.
---

# Novo vídeo

Transforma um pedido solto ("quero um reels de receita") em um vídeo bem editado, com transições e
efeitos sonoros escolhidos com critério. A referência completa está em `references/guia-edicao.md`
(briefing, presets por nicho, catálogos de transições e sons, regras de sincronia, checklist) — leia as
seções indicadas em cada passo em vez do arquivo inteiro.

O motivo de seguir esta ordem: edição ruim quase sempre vem de começar a animar antes de saber o nicho,
o ritmo e o áudio. Briefing e plano aprovados evitam retrabalho.

## Passo 1 — Briefing (guia §1 e §3)

Antes de qualquer edição, confirme **duas perguntas obrigatórias**, numa única rodada
(use opções clicáveis se a ferramenta de perguntas existir):

1. **Qual o nicho?** academia · alimentação · beleza/skincare · moda · imobiliário · tecnologia · finanças · educação · viagem · pets · outro
2. **Tem vídeo modelo?** arquivo de vídeo, link, prints, ou "não"

Na mesma rodada, pergunte só o que o pedido não respondeu entre: objetivo (alcance · salvar · vender · ensinar),
plataforma, e áudio (trilha própria · música licenciada · só efeitos para usar áudio em alta no app · narração).
Para o resto (duração, ritmo, trilha), adote o preset do nicho e **diga quais padrões adotou** — perguntar
tudo cansa; informar deixa a pessoa corrigir só o que importa.

Registre as respostas no formato de `references/briefing-modelo.md`.

## Passo 2 — Vídeo modelo (guia §2), se houver

- **Link de Instagram/TikTok:** em geral não dá para baixar. Peça o arquivo (baixar no celular e enviar) ou 3–4 prints.
- **Com arquivo e execução de código disponível:** rode
  `python3 <pasta-desta-skill>/scripts/analisar-modelo.py video.mp4 saida/` (requer ffmpeg e numpy).
  Gera `ficha.md` (cortes secos/suaves, cortes por segundo, BPM provável + alternativas, loudness,
  se os cortes têm som junto), `quadros.png` e `onda.png`. **Olhe as imagens** e complete a ficha:
  tipos de transição, estilo de texto, paleta, sons percebidos.
- **Sem execução de código:** analise os prints/descrição e estime ritmo e transições pelo que vê.
- Diga o que vai **copiar** (ritmo, estrutura, tipo de transição) e o que vai **adaptar** à marca.
  Nunca copie música, marca ou conteúdo de outra pessoa.

## Passo 3 — Plano de edição (guia §4–§8)

Monte o plano no formato do guia §8: cena, tempo, conteúdo na tela, animação, transição de saída,
efeitos sonoros com tempo local, trilha e BPM. Critérios:
- **1 transição principal + no máximo 1 de ênfase** (catálogo §4), coerentes com a energia do nicho.
- **Um efeito sonoro por evento visual importante** (catálogo §5), com as regras de sincronia:
  whoosh com pico no meio do corte, riser terminando no corte, impacto no corte, listas subindo de tom,
  acentos 4–6 dB acima da trilha.
- **Cortes no tempo da música** (guia §6): cenas em múltiplos de `60 / BPM` segundos.

Apresente o plano e **peça aprovação antes de produzir**.

## Passo 4 — Produção (depende de onde você está)

- **No repositório do estúdio** (existe `GUIA-EDICAO.md` e as pastas `remotion/`/`hyperframes/` no projeto):
  siga o `CLAUDE.md` dele — componentes prontos, biblioteca de sons em `audio/`, skills dos motores.
- **Em outro projeto com código:** produza com Remotion (séries/templates) ou HyperFrames (peça única)
  seguindo o plano; para os sons, use biblioteca licenciada ou sintetize. Se a pessoa quiser a base pronta
  (identidade, componentes e sons), sugira clonar `github.com/Ynoue03/Claude`.
- **Sem código (editor manual: CapCut, Premiere, DaVinci):** entregue o plano como **lista de cortes**
  com tempos exatos, nome da transição no editor, duração, e onde entra cada efeito sonoro e o volume relativo.

## Passo 5 — Entrega (guia §9)

Confira o checklist do guia §9. Para volume padrão de redes (−14 LUFS, −1 dBTP), use
`scripts/masterizar.sh video.mp4` desta skill quando houver execução de código; em editor manual,
oriente normalizar a −14 LUFS na exportação. Ofereça a versão **só com efeitos** quando a pessoa for
postar com áudio em alta do Instagram/TikTok.
