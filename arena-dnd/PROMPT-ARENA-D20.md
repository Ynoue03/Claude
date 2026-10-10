Crie um vídeo vertical de motion graphics em PIXEL ART chamado "ARENA D20",
no estilo "battle royale automático" (FFA, todos contra todos) com REGRAS DE RPG DE MESA
(5ª edição, System Reference Document 5.2), com duração exata de 1:30 (90 s).
Cada luta é decidida por dados de verdade: nada é roteirizado.

## Formato técnico
- 1080×1920 (9:16), 30 fps, 2700 quadros.
- Resolução interna: 360×640 px, ampliada 3× com image-rendering: pixelated (pixels nítidos).
- Simulação determinística com seed fixa: o mesmo render gera sempre a mesma luta e as mesmas rolagens.
  A seed fica gravada junto com o vídeo para qualquer rolagem poder ser conferida depois.
- Área segura: nada importante nos 220 px do topo, nos 320 px da base e nos 96 px laterais.

## Direção de arte dos sprites (prioridade máxima)
Referência de estilo: sprites de RPGs táticos e de ação de fantasia da era GBA/SNES tardio
(ex.: Final Fantasy Tactics Advance, Tactics Ogre, Golden Sun), proporção chibi de 2,5 cabeças
e alto nível de detalhe. Todos os sprites são desenhados do zero; nada copiado de jogos ou livros oficiais.
- Tamanho: ~48×64 px por personagem (cabeça ≈ 20–22 px de altura, para caber o rosto).
- Paleta própria por personagem, 14–20 cores, com rampas de cor (hue shifting: sombras puxam
  para roxo/azul e luzes para amarelo; nada de "só escurecer").
- Sombreamento em 3–4 tons por material (base, sombra, sombra profunda, brilho), luz vindo
  do alto à esquerda, rim light sutil do lado oposto.
- Contorno seletivo (sel-out): linha escura por fora, linhas internas coloridas, anti-aliasing
  manual só dentro do sprite (nunca na borda externa).
- Materiais diferenciados: tecido com dobras e vincos, couro com costuras, cota de malha em
  xadrez, metal de armadura com brilho especular de 1 px, madeira de cajados e arcos com veios,
  cabelo em mechas (clusters) com 2 brilhos, pele com blush e sombra no pescoço,
  escamas (draconato) e chifres (tiefling) com textura própria.
- Rosto detalhado: olhos com íris, pupila e brilho, sobrancelhas expressivas, boca e marcas
  (cicatrizes, tatuagens, barba, presas, sardas). Elmo fechado mostra só a fenda dos olhos brilhando.
- Sombra elíptica semitransparente no chão, embaixo de cada personagem.

## Expressões faciais (troca de rosto conforme o estado)
1. Neutra/idle
2. Concentrada (em combate)
3. Grito de ataque (boca aberta, olhos fixos)
4. Dor (olhos apertados, gota de suor)
5. PV baixo (ofegante, roupa rasgada, arranhões)
6. Derrota (olhos em "X", queda)
7. Vitória (sorriso, pose característica da classe)

## Animações (quadros por ação)
- Idle respirando: 4 quadros (cabelo, capa e manto balançam levemente).
- Caminhada: 6 quadros, 4 direções (capa, aljava, chapéu e acessórios com movimento secundário).
- Ataque com arma: 4 quadros · Magia/habilidade especial: 6–8 quadros (com antecipação e follow-through).
- Dano: 2 quadros · Derrota: 4 quadros · Vitória: 4 quadros em loop.
- Dano progressivo: abaixo de 30% dos PV o sprite troca para a versão com roupa rasgada e ferimentos.
- Movimento constante: enquanto esperam a vez, os personagens circulam pela arena (nunca ficam parados);
  no próprio turno, andam até a posição da regra e agem.

## Cut-in de golpe especial (estilo anime)
- Dispara em: 20 natural (CRÍTICO!), magias de 3º círculo (Bola de Fogo, Relâmpago, Guardiões
  Espirituais, Convocar Relâmpagos), Surto de Ação, Fúria, Destruição Divina e Arma de Sopro.
- A ação congela por 0,6 s e aparece uma faixa diagonal com o ROSTO do personagem em close (retrato
  pixel art 96×64 px, rico em detalhes e com expressão de grito), linhas de velocidade ao fundo,
  o nome do golpe e a rolagem em destaque (ex.: "BOLA DE FOGO · 8d6 = 31"). Depois o golpe é disparado.
- Máximo de um cut-in a cada 4–5 s, para não cansar (prioridade: crítico > 3º círculo > recursos de classe).

## Cenário (arena)
- Mapa top-down estilo GBA/SNES: ilha de grama cercada por água animada, borda de terra/pedra,
  árvores e tufos nos cantos, com o mesmo nível de detalhe dos sprites.
- Centro: área de areia em formato de "pirâmide em degraus", cercada por um anel de blocos de pedra
  com 4 tochas acesas (chamas animadas). Uma pedra central em forma de d20 (icosaedro) como obstáculo.
- Cenário com saturação um pouco menor que a dos personagens, para eles se destacarem.

## Lutadores (10 personagens ALEATÓRIOS de fantasia, gerados pelos dados)
Nenhum personagem é pré-definido. A cada vídeo, com a seed, sorteie 10 lutadores:
- **Espécie** (SRD 5.2): Humano, Elfo, Anão, Halfling, Gnomo, Orc, Tiefling, Draconato, Golias.
  Traços visuais: elfo com orelhas longas; anão baixo e barbudo; halfling e gnomo baixos;
  orc de pele verde-acinzentada com presas; tiefling de pele vermelha/roxa com chifres e cauda;
  draconato com cabeça de dragão e escamas na cor da ancestralidade (vermelho, azul, branco, verde,
  negro, dourado, prateado, bronze); golias alto de pele cinza com marcas.
- **Classe** (nível 5): Guerreiro, Bárbaro, Paladino, Patrulheiro, Ladino, Monge, Mago, Feiticeiro,
  Bruxo, Clérigo, Druida, Bardo. Evite repetir a mesma classe mais de 2 vezes por vídeo.
- **Nome**: sorteado de uma lista de nomes de fantasia (Thorin, Lyra, Kael, Mirela, Bruk, Seraphine,
  Doran, Vex, Elowen, Garruk, Isolde, Nyx, Zara, Ulric, Wren…), sem repetir no mesmo vídeo.
- **Vestimenta sorteada por classe** (peças e cores mudam a cada personagem):
  - Guerreiro/Paladino: elmo fechado (com pluma ou cruz), elmo aberto ou com chifres; placas ou cota
    de malha com tabardo; ombreiras; capa; escudo com brasão.
  - Bárbaro: peito nu ou colete de couro, pele de animal nos ombros, elmo com chifres ou bandana.
  - Patrulheiro/Ladino: capuz, máscara ou bandana; couro com correias; capa curta; aljava nas costas.
  - Monge: gi com faixa, cabeça raspada ou coque.
  - Mago/Feiticeiro/Bruxo: chapéu pontudo, capuz ou diadema; manto longo com faixa central; cajado
    com cristal ou orbe flutuante na cor da magia (fogo, gelo, arcano, sombra).
  - Clérigo/Druida/Bardo: manto ou cota de malha com símbolo sagrado; coroa de folhas ou galhada;
    boina com pena e alaúde.
  - Cores sorteadas de paletas medievais (carmesim, azul real, verde-floresta, púrpura, mostarda,
    vinho, ardósia), cabelo natural ou fantasia, estilo de cabelo (curto, longo, rabo, tranças,
    coque, moicano, careca), barba opcional.
- **Personagens dos comentários (opcional)**: se receber uma lista "NOME + DESCRIÇÃO" de seguidores,
  use-os no lugar dos aleatórios. Classe, espécie, cores e arma saem da descrição; ATRIBUTOS, PV e
  GOLPES continuam sendo rolados nos dados. Mostre "CRIADO POR @autor" se ele vencer.

## Sistema de dados (regras SRD 5.2, todos no nível 5)
Ficha de cada lutador (toda rolagem gravada para conferência):
- **Atributos**: role 4d6 e descarte o menor, 6 vezes (FOR, DES, CON, INT, SAB, CAR). O maior valor vai
  no atributo principal da classe; +2/+1 do antecedente (máx. 20). Modificador = (valor − 10) ÷ 2,
  arredondado para baixo. Se a soma dos modificadores for ≤ 0, role o conjunto de novo.
- **Pontos de vida**: máximo do dado de vida no 1º nível + dado rolado nos níveis 2–5 + CON × 5.
  Dados de vida: d12 Bárbaro · d10 Guerreiro, Paladino, Patrulheiro · d8 Bardo, Bruxo, Clérigo,
  Druida, Ladino, Monge · d6 Feiticeiro, Mago.
- **Classe de Armadura (CA)**: placas 18 · cota de malha 16 · brunea 14 + DES (máx. 2) · couro 11 + DES ·
  couro batido 12 + DES · bárbaro 10 + DES + CON · monge 10 + DES + SAB · armadura arcana 13 + DES · escudo +2.
- **Bônus de proficiência**: +3.

Combate (rodadas, todos contra todos):
1. **Iniciativa**: d20 + DES; age do maior para o menor.
2. **Ataque**: d20 + modificador + proficiência ≥ CA do alvo → acerta. **20 natural = CRÍTICO** (dados de dano
   em dobro). **1 natural = FALHA**. Vantagem/desvantagem = rola 2d20 e fica com o maior/menor.
3. **Magias de salvaguarda**: o alvo rola d20 + modificador contra CD = 8 + proficiência + mod. de conjuração;
   passou = metade do dano (quando a magia permite).
4. **Dano**: sempre nos dados da arma ou magia + modificador (ex.: Montante 2d6+4, Machado Grande 1d12+4,
   Arco Longo 1d8+3, Raio de Fogo 2d10, Bola de Fogo 8d6, Mísseis Mágicos 3×(1d4+1), Rajada Mística 2×(1d10+CAR)).
5. **Concentração**: ao sofrer dano, CON contra CD 10 ou metade do dano; falhou = a magia acaba.
6. **0 PV**: o lutador cai e sai da luta (faixa "NOME CAIU!").

Golpes e poderes por classe (nomes em português, só material do SRD):
- Guerreiro: Ataque Extra, Surto de Ação, Retomar o Fôlego (1d10+5).
- Bárbaro: Fúria (+2 de dano, resistência), Ataque Descuidado (vantagem), Ataque Extra.
- Paladino: Ataque Extra, Destruição Divina (2d8 radiante +1d8 por círculo), Cura pelas Mãos.
- Patrulheiro: Ataque Extra com arco, Marca do Caçador (+1d6).
- Ladino: Ataque Furtivo (3d6 com vantagem), Mira Firme, Ação Ardilosa, Esquiva Sobrenatural.
- Monge: Rajada de Golpes, Golpe Atordoante, Defletir Ataques.
- Mago: Raio de Fogo, Mísseis Mágicos, Raio Ardente, Bola de Fogo, Relâmpago, Escudo (+5 CA).
- Feiticeiro: Raio de Gelo, Orbe Cromático, Despedaçar, Bola de Fogo.
- Bruxo: Rajada Mística, Bruxaria (+1d6), Toque Vampírico.
- Clérigo: Chama Sagrada, Raio Guia, Arma Espiritual, Guardiões Espirituais, Palavra Curativa.
- Druida: Produzir Chama, Chicote de Espinhos, Raio Lunar, Convocar Relâmpagos, Onda Trovejante.
- Bardo: Zombaria Viciosa, Sussurros Dissonantes, Despedaçar, Palavra Curativa.
Traços de espécie: Sortudo (halfling rerrola o 1), Resistência Implacável (orc fica com 1 PV uma vez),
Repreensão Infernal (tiefling), Arma de Sopro (draconato, 2d10 em cone), Resistência da Pedra (golias),
Robustez Anã, Inspiração Heroica (humano rerrola um ataque).

## Interface na tela
- **Painel no topo** (abaixo da área segura): título "ARENA D20", "RODADA X · VIVOS N", e os 10 lutadores em
  2 colunas com quadradinho na cor da classe, nome e barra de PV (verde > 50%, amarela > 25%, vermelha);
  quem cai fica riscado e cinza.
- **d20 rolando** ao lado de quem ataca: gira por 0,2 s e para no resultado (verde = acertou, cinza = errou,
  dourado = 20 natural, vermelho = 1 natural).
- **Números de dano** saindo do alvo na cor do tipo de dano (fogo laranja, frio azul-claro, elétrico amarelo,
  radiante dourado, necrótico roxo, energia magenta, psíquico rosa, cortante/perfurante branco); "ERROU",
  "SALVOU", "CRÍTICO!" quando for o caso; cura em verde com "+".
- **Rótulo do golpe** acima do personagem, em caixa colorida pelo tipo de dano (ex.: "BOLA DE FOGO", "FÚRIA!").
- Barra de PV pequena embaixo de cada personagem e etiquetas de condição (ATD atordoado, MRC marcado).
- Seta ▼ piscando em cima de quem está no turno.

## Linha do tempo (90 s)
- 0–5 s: os 10 caem na arena um por um (com poeira), nome e classe embaixo de cada um, caixa
  "ESCOLHA SEU CAMPEÃO!" com d20 nos cantos, contagem 3-2-1 e "LUTEM!".
- 5–80 s: batalha. Ajuste o ritmo dos turnos para a luta terminar entre 75 e 80 s.
- 80–90 s: câmera aproxima no vencedor (vitória em loop), caixa "VITÓRIA DE NOME!" com espécie, classe,
  abates e dano causado; depois a chamada "COMENTE NOME + DESCRIÇÃO DO SEU PERSONAGEM · OS DADOS DECIDEM O RESTO!".

## Áudio
- Trilha chiptune 8-bit própria (onda quadrada, triângulo e ruído), ~150 BPM, em loop; recua no fim e
  entra uma fanfarra de vitória.
- Um efeito por evento: dado rolando, golpe, impacto, crítico, erro, flecha, magia, fogo, explosão, trovão,
  cura, escudo, queda de lutador, contagem e "LUTEM!". Volume final em −14 LUFS.

## Entregáveis
- O vídeo MP4 e uma ficha de texto com: seed, fichas dos 10 (todas as rolagens de 4d6, PV, CA, arma),
  ordem de iniciativa e o log do combate rolagem por rolagem.
- No fim da ficha, o crédito obrigatório do SRD:
  "This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
  available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
  International License, available at https://creativecommons.org/licenses/by/4.0/legalcode."
- Não use a logo nem o nome "Dungeons & Dragons"/"D&D" no vídeo (marca registrada); use "ARENA D20".
