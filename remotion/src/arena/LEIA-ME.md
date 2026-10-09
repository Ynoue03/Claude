# ANIME PIXEL ARENA

Battle royale automático em pixel art (FFA, 16 lutadores), 1080×1920, 30 fps, **90 s exatos**.
Resolução interna 270×480 ampliada 4× sem suavização. Simulação determinística: mesma seed → mesma luta.

> Exceção consciente à identidade "quiet luxury" do estúdio: esta série tem estética de jogo retrô.

## Gerar um episódio
```bash
scripts/arena.sh                                   # episódio padrão → remotion/out/arena-master.mp4
scripts/arena.sh remotion/exemplos/arena-revanche.json revanche   # outra seed, vencedor forçado
```
O script roda a simulação em Node (deixas de som), gera trilha + efeitos (`audio/arena.py`),
renderiza o vídeo e masteriza (−14 LUFS / −1 dBTP). Preview: `npm run dev` → pasta **Arena**
(`AnimePixelArena` e a folha de sprites `ArenaSprites`).

## Dados (JSON)
`arena-padrao.json` tem tudo; um episódio novo só precisa dos campos que mudam:

| Campo | O que faz |
|---|---|
| `seed` | define a luta inteira (movimentos, ordem das quedas, vencedor) |
| `vencedor` | id ou nome para forçar o resultado (`null` = pela seed) |
| `perfil`, `titulo`, `textos` | @ do CTA, título do HUD, banners e frases do CTA |
| `lutadores[]` | nome, HP, velocidade, dano, visual e golpes |

Visual do lutador: cores (`pele`, `cabelo`, `roupa`, `mangas`, `centro`, `decote`, `ombros`, `cinto`,
`luvas`, `calca`, `sapato`), `penteado` (chave de `penteados.ts`, ou `mascara` própria de 24 colunas),
`padrao` (`xadrez`/`triangulos`/`x`) e `acessorios` (`bigodes`, `sardas`, `cicatriz-olho`,
`cicatriz-queimadura`, `cicatriz-testa`, `brincos`, `brincos-hanafuda`, `katana`, `tres-katanas`,
`espada-grande`, `manoplas`).

Golpe: `nome`, `cor`/`cor2`, `efeito` (`esfera`, `clones`, `raio`, `chamas`, `feixe`, `bomba`, `elastico`,
`aura`, `corte`, `arco`, `onda`, `projetil`, `escudo`, `soco`, `explosao`, `gelo`), `alcance` (px internos),
`dano`, `recarga` (s), `status` (`BRN`/`PAR`/`FRZ`), `som`, `especial` (tremor de tela), `area`.

## Roteiro fixo (`tempo.ts`)
0–5 s intro + 3-2-1 FIGHT! · 5–70 s batalha (quedas de ~10 s a ~67 s) · 70–80 s duelo final (zoom 1,2×,
trilha 168 BPM) · 80–87 s vencedor + confete · 87–90 s CTA.
O "diretor" em `sim.ts` agenda as quedas pela seed e ajusta o dano para cumprir o roteiro; a IA decide o resto.

## Arquivos
`sim.ts` simulação · `sprites.ts` + `penteados.ts` sprites chibi · `mapa.ts` arena · `efeitos.ts` golpes ·
`desenho.ts` câmera, HUD e banners · `fonte.ts` fonte pixel · `cli.ts` deixas de áudio.
