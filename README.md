# Motion com Claude — Academia & Alimentação

Templates de vídeos verticais no estilo *aesthetic* para Reels/TikTok/Shorts, editados com o Claude Code.

- `remotion/` — templates **TreinoDoDia** e **ReceitaFit** (troque os dados, o vídeo se ajusta sozinho).
- `hyperframes/` — peça **Pré-treino ideal** (motion graphic de 10 s em HTML + GSAP).
- `CLAUDE.md` — identidade visual e regras que o Claude segue em todo vídeo.

## Como pedir um vídeo novo ao Claude

**Atalho:** digite `/novo-video` no Claude Code. Ele pergunta o nicho e se você tem um vídeo modelo,
analisa o modelo, monta o plano de edição (transições + efeitos sonoros) e só produz depois da sua aprovação.
O guia completo está em `GUIA-EDICAO.md`.

Ou descreva diretamente:

Abra o Claude Code dentro da pasta do motor e descreva o vídeo com estes 5 itens:

1. **Formato e duração** — "Reel vertical, ~15 s"
2. **Roteiro por cena** — "Cena 1: título 'Treino de costas'; Cena 2: 5 exercícios com séries; Cena 3: dica; Cena 4: CTA"
3. **Textos exatos** que vão aparecer na tela
4. **Mídias** — fotos/vídeos/música em `public/` (Remotion) ou `assets/` (HyperFrames)
5. **O que muda em relação ao padrão** — o resto vem do `CLAUDE.md`

Exemplos de pedidos:

> Usando o template TreinoDoDia, crie o treino "Costas & Bíceps", 6 exercícios, dica "puxe com o cotovelo, não com a mão". Renderize em out/costas.mp4.

> Crie no HyperFrames um motion de 8 s: "3 erros no agachamento", cada erro aparece com um X em clay e a correção embaixo.

> Gere 7 arquivos JSON de receitas fit para a semana e renderize um ReceitaFit para cada.

## Licença do Remotion
O Remotion é gratuito para equipes de até 3 pessoas; acima disso, é preciso licença paga (remotion.pro/license).
O HyperFrames é open source. As fontes (Cormorant Garamond, Inter) são OFL — uso comercial liberado.
