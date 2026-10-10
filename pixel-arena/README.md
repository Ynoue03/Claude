# ANIME PIXEL ARENA — battle royale automático em pixel art

Vídeo vertical de 90 s (1080×1920, 30 fps, 2700 quadros) com 16 lutadores de anime em pixel art,
luta FFA simulada de forma **determinística** (mesma seed → mesma luta), HUD 4×4, cut-ins de golpe
especial, duelo final, vencedor e CTA. Trilha chiptune e efeitos **sintetizados aqui** (sem áudio de terceiros).

> Motor próprio em JavaScript puro (sem dependências): desenha tudo pixel a pixel em 360×640 e amplia 3×
> com vizinho mais próximo. Por isso fica fora de `remotion/` e `hyperframes/`.
> Este projeto tem **identidade visual própria** (retrô/anime) — a paleta "aesthetic" do `CLAUDE.md` da raiz não se aplica aqui.

## Comandos

```bash
cd pixel-arena
node renderizar.mjs                                   # → out/anime-pixel-arena.mp4 (já masterizado, −14 LUFS / −1 dBTP)
node renderizar.mjs dados/episodio-02.json --saida out/ep02.mp4
node renderizar.mjs --de 2100 --ate 2400 --sem-audio  # só um trecho, para revisar rápido
node exportar-sprites.mjs                             # → sprites/<id>/folha.png, expressoes.png, retratos.png, folha.json
python3 -m http.server 8000                           # preview no navegador: http://localhost:8000/preview.html
```

Requisitos: Node 18+ e `ffmpeg`. Render completo ≈ 3 min (4 núcleos).
O render também grava `out/<nome>-roteiro.json` (quem caiu, quando, por quem, e cada cut-in).

## Novo episódio = trocar só os dados

Copie `dados/episodio-01.json` e edite:

| Campo | O que faz |
|---|---|
| `seed` | muda a luta inteira (movimento, ordem das quedas, quem vence) |
| `vencedor` | `null` = decide pela seed; `"gojo"` força o resultado |
| `perfil` | @ do CTA |
| `banner.*` | textos: escolha, FIGHT!, derrota (`{NOME}`), duelo, vencedor, CTA (2 linhas) |
| `lutadores[]` | nome, `hp`, `vel`, `dano` e `golpes` (nome, cor da caixa, `efeito`, `alcance`, `poder`, `status`, `especial`) |

Efeitos disponíveis: `rasengan clones chidori amaterasu feixe feixeGrande genki pistol gear cortes cortesGrandes
getsuga agua fogoCorte relampago infinito roxo divergente blackflash smash explosao gelo fogo jajanken godspeed`.
Status: `BRN` (queima), `PAR` (paralisa), `FRZ` (congela). O golpe com `"especial": true` usa o cut-in.

A aparência de cada lutador é código (`src/sprites/personagens.mjs`); um personagem novo precisa de uma entrada lá.
Trocar a ordem/IDs no JSON reposiciona o HUD automaticamente.

## Como funciona

| Arquivo | Papel |
|---|---|
| `src/sim.mjs` | simulação + "diretor": agenda as 14 quedas entre ~10 s e ~68 s, duelo 70–80 s; IA persegue o mais próximo, foge com HP baixo; cut-in ≤ 1 a cada 4,5 s |
| `src/sprites/tela.mjs` | "tela de rótulos": desenha por partes e calcula sombreamento (luz do alto à esquerda), rim light, linhas internas coloridas e contorno sel-out |
| `src/sprites/corpo.mjs` | esqueleto chibi 2,5 cabeças, poses de todas as animações, cabelo em mechas, retratos |
| `src/sprites/rosto.mjs` | olhos (íris, pupila, brilho), sobrancelhas, bocas e as 7 expressões, em qualquer escala |
| `src/sprites/paleta.mjs` | limita cada personagem a 20 cores (k-means em Lab) |
| `src/cores.mjs` | rampas com hue shifting (sombra → azul/roxo, luz → amarelo) |
| `src/cenario.mjs` | ilha, penhasco, água animada, pirâmide de areia em degraus, pedra, árvores (saturação −22%) |
| `src/efeitos.mjs` | efeito visual de cada golpe + status |
| `src/render.mjs` | mundo, HUD, caixas de golpe, cut-ins, banners, vitória, CTA e composição 3× com zoom/tremor |
| `src/audio.mjs` | trilha (144 BPM batalha, 160 BPM duelo, jingle) + efeitos, com limite de vozes simultâneas |
| `src/fonte.mjs` | fontes pixel próprias 5×7 (com acentos) e 3×5 |

### Folhas de sprites (`sprites/<id>/`)
Quadro 64×72 com o pé em (32, 68). Linhas: frente (idle 4, andar 6, derrota 4, vitória 4) · lado esquerdo e
direito (idle 4, andar 6, ataque 4, especial 8, dano 2, derrota 4) · costas (idle 4, andar 6) — e as mesmas
linhas na versão "ferido" (roupa rasgada, arranhões; usada abaixo de 30% de HP). Posições exatas em `folha.json`.
