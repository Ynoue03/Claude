# Prompt — ANIME PIXEL ARENA (v2)

> Cole este prompt no Claude Code (dentro deste repositório) para gerar um episódio novo ou recriar o
> sistema do zero. O motor já existe em `remotion/src/arena/`; para só gerar um episódio, basta mudar a
> seed: `scripts/arena.sh <episodio.json> <nome>`.

---

Crie um vídeo vertical de motion graphics em PIXEL ART chamado "ANIME PIXEL ARENA",
no estilo "battle royale automático" (FFA, todos contra todos), com duração exata de 1:30 (90 s).

## Formato técnico
- 1080×1920 (9:16), 30 fps, 2700 quadros.
- Resolução interna do jogo: 270×480 px, ampliada 4× sem suavização (pixels nítidos).
- Simulação determinística com seed fixa: a mesma seed gera sempre o mesmo elenco, a mesma arena e a mesma luta.
- Área segura: nada importante nos 220 px do topo, nos 320 px da base e nos 96 px laterais.

## Elenco sorteado (amplo e aleatório)
- Banco com ~50 personagens de 18 animes (`elenco.json`): Naruto, Dragon Ball, One Piece, Bleach,
  Demon Slayer, Jujutsu Kaisen, My Hero Academia, Hunter x Hunter, Attack on Titan, One Punch Man,
  Chainsaw Man, Fullmetal Alchemist, Spy x Family, Fairy Tail, JoJo, Mob Psycho 100, Black Clover, Solo Leveling.
- A cada episódio, 16 lutadores são sorteados pela seed: primeiro o anime (todos com a mesma chance),
  depois o personagem dentro dele, no máximo 2 por anime. Assim os personagens mudam de verdade de um
  episódio para outro, e não só os protagonistas.
- Opções: `quantidade`, `maxPorAnime`, `animes` (ex.: só Dragon Ball), `incluir`, `excluir`, ou uma lista
  fixa em `lutadores`.

## Força próxima do cânone
- Cada personagem tem `poder` de 1 a 10 baseado na obra (ex.: Saitama 10, Goku 10, Gojo 9,6, Sukuna 9,6,
  Frieza 9,0, Naruto 8,5, Luffy 8,5, Levi 5,6, Mikasa 5,0).
- O poder define HP (70 + poder × 8) e dano (0,72 + poder × 0,055), e pesa na ordem de sobrevivência
  (peso = poder³): os mais fortes tendem a ir longe, mas zebras acontecem.
- Campo `vencedor` (id ou nome) força o resultado.

## Arena sorteada: locais famosos de anime
Uma de 8 arenas top-down estilo GBA/SNES, sorteada pela seed (ou `"arena": "<id>"`):

| id | Local | Anime | Destaques |
|---|---|---|---|
| `vale-do-fim` | Valley of the End | Naruto | estátuas gigantes, cachoeira, folhas no vento |
| `budokai` | World Martial Arts Tournament | Dragon Ball | ringue de ladrilhos, pavilhões vermelhos, palmeiras |
| `marineford` | Marineford | One Piece | praça de pedra, mar com gelo, pilares quebrados, neve |
| `shibuya` | Shibuya | Jujutsu Kaisen | cruzamento à noite, prédios iluminados, Hachiko, cinzas |
| `sokyoku` | Sokyoku Hill | Bleach | colina sobre as nuvens, estrutura de execução, pétalas |
| `trem-infinito` | Mugen Train | Demon Slayer | campo à noite, trem com janelas acesas, brasas |
| `ua-festival` | U.A. Sports Festival | My Hero Academia | ringue de concreto, arquibancada com torcida |
| `namek` | Planet Namek | Dragon Ball | grama azul-esverdeada, mar verde, árvores Ajisa |

- Plataforma central em degraus (octógono, quadrado ou círculo, conforme o local), obstáculo central
  temático (pedra, pilar, escombros, estátua; alguns ringues sem obstáculo).
- Fundo animado (água, nuvens, torcida), partículas de clima, filtro noturno com luzes quentes,
  vinheta e crateras/queimados que ficam no chão depois dos golpes fortes.
- Placa "STAGE: <LOCAL>" na abertura e nome do local no HUD durante a luta.

## Lutadores (sprites chibi pixel art desenhados do zero)
- ~24×32 px, 4 direções, passos, ataque, dano, derrota e comemoração.
- Roupa, cabelo, cores e acessórios fiéis (bandana, máscara do Kakashi, cabeça de javali do Inosuke,
  turbante e antenas do Piccolo, chifres da Power, capa do Saitama, cachecol da Mikasa…).
- Acabamento profissional: sombreamento com hue shifting (sombra puxa para roxo, luz para amarelo),
  contorno seletivo (sel-out: escuro embaixo, colorido em cima), luz no topo da silhueta, sombra do queixo.
- Animação: respiração parado, balanço ao andar, poeira nos passos, aura de energia ao carregar especiais,
  rastro (afterimage) nas investidas, brilho dos golpes iluminando o cenário.

## Golpes e mecânica (IA simples)
- 1–2 golpes por personagem com nome e cor do elemento (Rasengan, Kamehameha, Raikiri, Amaterasu,
  Getsuga Tensho, Dismantle, Serious Punch, Senbonzakura, Chain Jail, Fire Dragon Roar, Ora Ora…),
  cada um com um de 16 efeitos visuais (esfera, feixe, bomba, corte, arco, onda, projétil, raio, chamas,
  gelo, explosão, soco, elástico, aura, clones, escudo).
- Caixa pixel com o nome do golpe por ≈1 s; número de dano; piscar em branco e recuo; status BRN/PAR/FRZ;
  mini barra de HP (verde > amarelo > vermelho); derrota com piscar, queda e "poof".
- Lutadores andam, buscam o inimigo mais próximo e fogem com HP baixo. Eliminações espalhadas de
  ~10 s a ~67 s.

## HUD e roteiro (90 s)
- HUD 4×4 logo abaixo dos 220 px do topo: nomes em fonte pixel, HP descendo em tempo real, eliminados em cinza.
1. 0–5 s · INTRO: lutadores em círculo, banner "CHOOSE YOUR FIGHTER!" + placa do local, contagem "3, 2, 1, FIGHT!".
2. 5–70 s · BATALHA: aviso "[NOME] DEFEATED!" a cada queda.
3. 70–80 s · DUELO FINAL: "FINAL DUEL!", zoom 1,2×, música mais rápida, tremor de tela nos especiais.
4. 80–87 s · VENCEDOR: banner "WINNER: [NOME]!", comemoração no centro, confete.
5. 87–90 s · CTA: "Quem ganha na próxima? Comente seu favorito!" + @perfil.

## Áudio (8/16 bits, sintetizado, sem direito autoral)
- Trilha chiptune 144 BPM → 168 BPM (um tom acima) no duelo → jingle de vitória → fecho calmo.
- Um efeito por evento: passos, carga, feixe, explosão, corte, água, raio, gelo, fogo, soco, escudo, hit,
  miss, bip de HP baixo, arpejo de derrota, blip de banner, contagem e "FIGHT!".
- Efeitos ~5 dB acima da trilha, no máximo 4 simultâneos; master em −14 LUFS / −1 dBTP.

## Entrega
- MP4 1080×1920, 30 fps, 90 s, com áudio masterizado (`remotion/out/<nome>-master.mp4`).
- Episódio novo = um JSON curto, por exemplo:
  ```json
  { "seed": 4242, "arena": "aleatoria", "sorteio": { "quantidade": 16, "maxPorAnime": 2 }, "perfil": "@seuperfil" }
  ```
  Variações: `"sorteio": { "animes": ["Dragon Ball"] }` (só Dragon Ball), `"arena": "shibuya"`,
  `"vencedor": "GOJO"`, `"lutadores": [...]` (elenco fixo).
