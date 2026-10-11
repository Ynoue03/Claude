# Estudo — como melhorar a arte dos chefes da ARENA D20

> Outubro de 2026. Pergunta: que ferramentas, conectores e caminhos podemos usar para os chefes (Minotauro, Grifo,
> Hidra, Gigante, Quimera, Dragão) ficarem bonitos — hoje eles são "muito feios".

## 1. Por que os chefes atuais ficam feios

Os heróis (48×64) ficam bons porque o desenho procedural foi muito trabalhado e o sprite é pequeno: com poucos pixels,
formas geométricas + sombreamento em 4 tons + contorno sel-out parecem pixel art de verdade. Nos chefes isso não escala:

- **São montados com elipses, cápsulas e polígonos.** Em 112×112 (336×336 no mundo) as formas aparecem como "bolhas"
  lisas e o resultado lembra recortes de papel, não pixel art desenhada à mão.
- **Falta o que um pixel artist faz em sprites grandes:** silhueta pensada, anatomia com massas que se sobrepõem,
  sombreamento por planos (não por elipse), clusters de pixels, textura dirigida (pelo, escama, pena), detalhes de
  1 px nos pontos de interesse (olhos, dentes, garras), e animação com antecipação e quadros-chave.
- **Animação é só deslocar partes** (bob, ângulo do braço). Sprites grandes precisam de quadros desenhados.

Conclusão: dá para melhorar um pouco no código, mas **o salto de qualidade vem de trocar o desenho procedural por
quadros de pixel art de verdade (PNG)** — gerados por IA de pixel art, desenhados por alguém, ou comprados — e o motor
passa só a carregá-los e animá-los.

## 2. O que temos conectado hoje

| Conector | Situação | Serve para os chefes? |
| --- | --- | --- |
| **Pixelab (PixelLab)** | instalado, mas **sem token**: toda chamada volta `401: Missing Authorization header` | **Sim — é o melhor candidato** (ver 3.1). Precisa reconectar com o token da API da conta PixelLab |
| Canva | conectado | Pouco: gera imagens genéricas, não pixel art com grade/paleta controladas. Útil só para arte conceitual, capas e miniaturas |
| Google Drive / Microsoft 365 | conectados | Só para guardar/compartilhar os PNGs e referências |
| Gmail, Calendar, Inkbox | — | Não se aplicam |

**Ação imediata:** na conta do PixelLab, gerar o token da API e reconectar o conector "Pixelab" no claude.ai
(Configurações → Conectores) informando esse token. Sem isso nenhuma ferramenta dele funciona aqui.

## 3. Opções

### 3.1 PixelLab (IA especializada em pixel art) — **recomendado**

- Ferramentas no próprio conector: `create_image_pro` / `create_character_pro_flash` (personagem a partir de texto),
  `create_1_direction_object` (um lado só — é o nosso caso, chefes vistos de lado), `animate_character`,
  `animate_with_skeleton_v3` (animação por esqueleto), `edit_image` / `inpaint_image` (corrigir partes),
  `reduce_colors` (limitar paleta), `unzoom_image`, `image_to_pixelart` (converter um esboço/arte em pixel art).
- **`pixelart_workbench` (grátis):** editor de pixel art por comandos — eu consigo inspecionar, limpar e retocar os
  quadros gerados pixel a pixel, e montar quadros de animação, sem gastar crédito.
- Tamanhos (fontes de terceiros): imagem até ~400×400 nos planos pagos; animação por esqueleto até ~128×128.
- Preço (fontes de terceiros, conferir na página oficial): ~US$ 12/mês (≈2.000 gerações, imagens até 320×320),
  ~US$ 24/mês (até 400×400), ~US$ 50/mês. Um plano básico basta para 6 chefes.
- **Licença:** os termos oficiais dizem que o usuário é dono do que gera e pode usar comercialmente; proibido usar as
  saídas para treinar outros modelos.
- Prós: feito para sprites de jogo, respeita grade de pixel, gera animações, dá para eu operar direto daqui.
  Contras: IA erra anatomia e consistência entre quadros — vai precisar de retoque (o workbench resolve boa parte).

### 3.2 Retro Diffusion (IA de pixel art, extensão do Aseprite)

- Extensão para o Aseprite: US$ 20 (Lite) ou US$ 65 (completa), pagamento único; também tem API pay-as-you-go.
- Modelos treinados só em pixel art, bons em paleta e grade. Os modelos de sprite sheet trabalham em tamanhos
  pequenos (32–48 px) — para chefe grande serve mais para a imagem parada do que para a animação.
- Não tem conector aqui: usaria no Aseprite da pessoa e enviaria os PNGs.

### 3.3 Aseprite + servidor MCP (desenho "à mão" guiado)

- Aseprite é o editor padrão de pixel art (US$ 20). Existem servidores MCP abertos que deixam o Claude operá-lo por
  scripts Lua (`pixel-mcp`, `aseprite-mcp`, `AsepriteMCP`): desenhar, paleta, camadas, animação e exportar sprite sheet.
- Bom para **retocar** o que a IA gerar e montar as animações; desenhar um chefe inteiro do zero assim é lento e o
  resultado depende de muitas iterações.
- Precisa de uma máquina com o Aseprite instalado (não roda nesta nuvem sem instalar).

### 3.4 Pacotes de sprites prontos (CraftPix, itch.io, OpenGameArt)

- Os dois modelos de Minotauro que você mandou vêm desse mundo (CraftPix, itch.io). Há minotauros, dragões, grifos
  etc. com idle, andar, ataque, dano e morte já animados.
- Licenças variam: CraftPix vende com licença comercial; no itch.io há pacotes CC0 (livre) e outros com regras
  próprias; no OpenGameArt muitos são CC-BY (exige crédito). **Conferir a licença de cada pacote** antes de usar.
- Prós: qualidade profissional imediata e animação completa. Contras: **quebra a regra do projeto de tudo ser
  desenhado do zero**, outros canais podem usar o mesmo chefe, e o estilo de cada pacote pode não casar com os heróis.

### 3.5 Contratar um pixel artist

- Freelancers (Fiverr, ArtStation, comunidades de pixel art) fazem um chefe animado de ~128–200 px.
- Melhor qualidade e estilo sob medida; mais caro e mais lento. Faz sentido para 1–2 chefes "assinatura" da série.

### 3.6 Melhorar o procedural (sem ferramenta nova)

- Desenhar os chefes em resolução menor e mais "pixelada" (ex.: 80–96 px, ampliado), com clusters e sombreamento por
  planos, e mais quadros de animação. Ganho real, mas limitado — já foi o que fizemos com o Minotauro novo.

## 4. Comparação

| Caminho | Qualidade | Tempo | Custo | Animação | Mantém "desenhado do zero"? |
| --- | --- | --- | --- | --- | --- |
| PixelLab + retoque no workbench | alta | 1–2 dias para os 6 | ~US$ 12–24/mês | sim (esqueleto + quadros) | sim (arte nova, gerada para nós) |
| Retro Diffusion + Aseprite | alta (parado) | 2–4 dias | US$ 20–85 único | manual | sim |
| Aseprite + MCP, à mão | média-alta | lenta | US$ 20 | manual | sim |
| Pacote pronto | muito alta | horas | grátis–US$ 30 por pacote | completa | **não** |
| Pixel artist | muito alta | semanas | maior | completa | sim |
| Procedural melhorado | média | 1 dia por chefe | zero | limitada | sim |

## 5. Recomendação

1. **Reconectar o PixelLab com o token** e assinar o plano básico.
2. **Piloto com o Minotauro:** gerar a imagem parada de lado (~160–200 px) com `create_1_direction_object` /
   `create_image_pro`, gerar idle/ataque/dano com `animate_with_skeleton_v3`, limpar paleta e contornos no
   `pixelart_workbench`, e exportar os quadros em PNG.
3. **Integrar no motor:** os quadros vão para `remotion/public/arena/chefes/<chefe>/` e o `quadroChefe()` passa a
   carregar o PNG quando existir (o desenho procedural fica de reserva). A âncora (pés), o tamanho no mundo, o retrato
   e o mini saem do próprio PNG. Nada muda nas regras nem nas lutas — só a arte.
4. Aprovado o Minotauro, repetir para os outros cinco. Se algum chefe "assinatura" (o Dragão, por exemplo) merecer,
   encomendar de um pixel artist.

## Fontes

- [PixelLab — Termos de Serviço](https://www.pixellab.ai/termsofservice)
- [PixelLab MCP (lobehub)](https://lobehub.com/bg/mcp/pixellab-pixellab-mcp) · [PixelLab MCP (mcpservers.org)](https://mcpservers.org/servers/pixellab-code/pixellab-mcp) · [PixelLab MCP (glama)](https://glama.ai/mcp/servers/@samedii/PixelLab)
- [PixelLab — AlternativeTo](https://alternativeto.net/software/pixellab/about) · [Tryanai — PixelLab](https://tryanai.com/tool/pixellab) · [Knowara — PixelLab review](https://knowara.com/ai-tools/image/pixellab-review/)
- [Retro Diffusion vs PixelLab (GameDev AI Hub)](https://gamedevaihub.com/retro-diffusion-vs-pixellab/) · [PixelLab vs Aseprite (GameDev AI Hub)](https://gamedevaihub.com/pixellab-vs-aseprite/)
- [Retro Diffusion para Aseprite (itch.io)](https://astropulse.itch.io/retrodiffusion/purchase) · [Retro Diffusion LITE](https://astropulse.itch.io/retrodiffusionlite/purchase) · [SpriteCook — comparação Retro Diffusion](https://www.spritecook.ai/compare/retro-diffusion)
- [Best AI Pixel Art & Sprite Generators 2026 (Cinevva)](https://app.cinevva.com/guides/ai-pixel-art-generators) · [Ludo — AI sprite generators](https://ludo.ai/compare/best-ai-sprite-generators) · [Ludo — AI pixel art generators](https://ludo.ai/compare/best-ai-pixel-art-generators)
- [Sorceress — AI pixel sprite generator](https://sorceress.games/blog/drop-in-an-ai-pixel-sprite-generator-no-aseprite)
- Aseprite MCP: [rkdfx/aseprite-mcp](https://github.com/rkdfx/aseprite-mcp) · [willibrandon/pixel-mcp](https://pkg.go.dev/github.com/willibrandon/pixel-mcp) · [diivi/aseprite-mcp](https://cdn.jsdelivr.net/gh/diivi/aseprite-mcp@main/README.md) · [AsepriteMCP (sakamoro)](https://mcpservers.org/en/servers/ext-sakamoro/AsepriteMCP)
- Pacotes: [Minotaurs 2D (itch.io)](https://free-game-assets.itch.io/minotaurs-2d-game-character-sprite-sheet) · [Animated pixel minotaur (itch.io)](https://rvros.itch.io/animated-pixel-minotaur) · [Minotaur 2 (OpenGameArt)](https://opengameart.org/content/minotaur-2) · [Licenças da CraftPix (citado em itch.io)](https://itch.io/post/1613473)
