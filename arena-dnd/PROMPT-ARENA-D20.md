Crie um vídeo vertical de motion graphics em PIXEL ART chamado "ARENA D20",
no estilo "battle royale automático" (FFA, todos contra todos) com REGRAS DE RPG DE MESA
(5ª edição, System Reference Document 5.2) e SISTEMA DE NÍVEIS, com duração exata de 1:30 (90 s).
Cada luta é decidida por dados de verdade: nada é roteirizado. Todos começam no nível 1; o campeão sobe de nível
e termina com um pergaminho mostrando a ficha nova.

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
- Dispara em: 20 natural (CRÍTICO!), golpe que derruba um lutador, Fúria, Arma de Sopro, Surto de Ação e
  Destruição Divina (quando o campeão já tiver esses poderes) e magias que acertam 2+ alvos (ex.: Onda Trovejante).
- A ação congela por 0,6 s e aparece uma faixa diagonal com o ROSTO do personagem em close (retrato
  pixel art 96×64 px, rico em detalhes e com expressão de grito), linhas de velocidade ao fundo,
  o nome do golpe e a rolagem em destaque (ex.: "RAIO DE FOGO · 1d10 = 10"). Depois o golpe é disparado.
- Máximo de um cut-in a cada 4–5 s, para não cansar (prioridade: crítico > abate > recursos de classe).

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
- **Classe** (todos começam no nível 1): Guerreiro, Bárbaro, Paladino, Patrulheiro, Ladino, Monge, Mago, Feiticeiro,
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

- **Campeão da batalha anterior (opcional)**: se receber a ficha do último campeão, ele entra como 1 dos 10,
  com o nível, os atributos, os PV e os poderes que já conquistou, e uma coroa pixel art em cima da cabeça.
  Os outros 9 são sempre nível 1.

## Sistema de níveis
- **Todos começam no NÍVEL 1** e só podem usar o que o nível deles permite (tabela abaixo).
  Ex.: no nível 1 o Mago só tem 2 espaços de magia de 1º círculo e não conhece Bola de Fogo; o Guerreiro
  ainda não tem Surto de Ação nem Ataque Extra.
- **Bônus de proficiência**: +2 nos níveis 1–4, +3 nos níveis 5–8, +4 nos níveis 9–12 (segue o SRD).
- **Truques escalam**: 1 dado de dano nos níveis 1–4, 2 dados a partir do 5º (ex.: Raio de Fogo 1d10 → 2d10).
- **Subir de nível** acontece só com o CAMPEÃO, depois da vitória (ver "Pergaminho do campeão").
  Se ele voltar e vencer de novo, sobe mais um nível; se perder, a sequência termina.

## Sistema de dados (regras SRD 5.2)
Ficha de cada lutador no nível 1 (toda rolagem gravada para conferência):
- **Atributos**: role 4d6 e descarte o menor, 6 vezes (FOR, DES, CON, INT, SAB, CAR). O maior valor vai
  no atributo principal da classe; +2/+1 do antecedente (máx. 20). Modificador = (valor − 10) ÷ 2,
  arredondado para baixo. Se a soma dos modificadores for ≤ 0, role o conjunto de novo.
- **Pontos de vida no nível 1**: valor máximo do dado de vida + modificador de CON.
  Dados de vida: d12 Bárbaro · d10 Guerreiro, Paladino, Patrulheiro · d8 Bardo, Bruxo, Clérigo,
  Druida, Ladino, Monge · d6 Feiticeiro, Mago.
- **Classe de Armadura (CA)**: placas 18 · cota de malha 16 · brunea 14 + DES (máx. 2) · couro 11 + DES ·
  couro batido 12 + DES · bárbaro 10 + DES + CON · monge 10 + DES + SAB · armadura arcana 13 + DES · escudo +2.

Combate (rodadas, todos contra todos):
1. **Iniciativa**: d20 + DES; age do maior para o menor.
2. **Ataque**: d20 + modificador + proficiência ≥ CA do alvo → acerta. **20 natural = CRÍTICO** (dados de dano
   em dobro). **1 natural = FALHA**. Vantagem/desvantagem = rola 2d20 e fica com o maior/menor.
3. **Magias de salvaguarda**: o alvo rola d20 + modificador contra CD = 8 + proficiência + mod. de conjuração;
   passou = metade do dano (quando a magia permite).
4. **Dano**: sempre nos dados da arma ou magia + modificador (ex.: Montante 2d6+3, Machado Grande 1d12+3,
   Arco Longo 1d8+3, Raio de Fogo 1d10, Mísseis Mágicos 3×(1d4+1), Rajada Mística 1d10).
5. **Concentração**: ao sofrer dano, CON contra CD 10 ou metade do dano; falhou = a magia acaba.
6. **0 PV**: o lutador cai e sai da luta (faixa "NOME CAIU!").

## Poderes por nível (progressão do SRD 5.2, níveis 1 a 5)
Espaços de magia: conjuradores completos (Bardo, Clérigo, Druida, Feiticeiro, Mago) 2 → 3 → 4+2 → 4+3 → 4+3+2;
meio-conjuradores (Paladino, Patrulheiro) 2 → 2 → 3 → 3 → 4+2; Bruxo 1 → 2 (1º círculo) → 2 (2º) → 2 (2º) → 2 (3º).
(Ex.: "4+2" = 4 espaços de 1º círculo e 2 de 2º.)

| Classe | Nível 1 | Nível 2 | Nível 3 | Nível 4 | Nível 5 |
|---|---|---|---|---|---|
| Bárbaro | Fúria (2×), Defesa sem Armadura | Ataque Descuidado, Sentido de Perigo | Frenesi (Berserker), Fúria 3× | Aumento de Atributo | Ataque Extra, Movimento Rápido |
| Bardo | Inspiração de Bardo (d6); Zombaria Viciosa, Sussurros Dissonantes, Palavra Curativa, Onda Trovejante | Pau pra Toda Obra | Colégio; Despedaçar (2º) | Aumento de Atributo | Inspiração d8 |
| Clérigo | Chama Sagrada, Raio Guia, Palavra Curativa, Curar Ferimentos | Canalizar Divindade: Centelha Divina (1d8) | Arma Espiritual (2º), Domínio | Aumento de Atributo | Guardiões Espirituais (3º) |
| Druida | Produzir Chama, Chicote de Espinhos, Onda Trovejante, Palavra Curativa | Forma Selvagem | Raio Lunar (2º), Círculo | Aumento de Atributo | Convocar Relâmpagos (3º) |
| Guerreiro | Estilo de Luta, Retomar o Fôlego (1d10+nível) | Surto de Ação | Crítico Aprimorado (19–20, Campeão) | Aumento de Atributo | Ataque Extra |
| Monge | Artes Marciais (d6), Defesa sem Armadura | Foco: Rajada de Golpes, Defesa Paciente, Passo do Vento | Defletir Ataques | Aumento de Atributo | Golpe Atordoante, Ataque Extra, Artes Marciais d8 |
| Paladino | Cura pelas Mãos (5 PV × nível), magias de 1º | Estilo de Luta, Destruição Divina | Canalizar Divindade, Juramento | Aumento de Atributo | Ataque Extra |
| Patrulheiro | Marca do Caçador, magias de 1º | Estilo de Luta (Arquearia +2) | Presa do Caçador | Aumento de Atributo | Ataque Extra |
| Ladino | Ataque Furtivo 1d6 | Ação Ardilosa | Ataque Furtivo 2d6, Mira Firme | Aumento de Atributo | Ataque Furtivo 3d6, Esquiva Sobrenatural |
| Feiticeiro | Raio de Fogo, Raio de Gelo, Orbe Cromático, Feitiçaria Inata | Fonte de Magia, Metamagia | Raio Ardente (2º), Feitiçaria Dracônica | Aumento de Atributo | Bola de Fogo (3º) |
| Bruxo | Rajada Mística + Rajada Agonizante, Bruxaria | +2 Invocações | Pacto; magias de 2º | Aumento de Atributo | Toque Vampírico (3º) |
| Mago | Raio de Fogo, Mísseis Mágicos, Onda Trovejante, Escudo, Armadura Arcana | Erudito | Raio Ardente (2º), Escola de Evocação | Aumento de Atributo | Bola de Fogo e Relâmpago (3º) |

Traços de espécie no nível 1: Sortudo (halfling rerrola o 1), Resistência Implacável (orc fica com 1 PV uma vez),
Surto de Adrenalina (orc), Legado Infernal (tiefling: resistência a fogo + truque Raio de Fogo; Repreensão Infernal
só no nível 3), Arma de Sopro (draconato, 1d10 em cone; 2d10 no nível 5), Resistência da Pedra (golias),
Robustez Anã (+1 PV por nível), Inspiração Heroica (humano rerrola um ataque), Astúcia Gnômica.

## Subida de nível do campeão (regras de mesa, com dados)
Ao vencer, o campeão sobe 1 nível (1 → 2 na primeira vitória):
- **PV**: role o dado de vida da classe + modificador de CON (mínimo 1) e some ao máximo. Mostre a rolagem
  (ex.: "d10 = 7 + 2 CON = +9 PV").
- **Poderes**: recebe tudo da coluna do novo nível na tabela acima (ex.: Guerreiro nível 2 → Surto de Ação).
- **Espaços de magia e truques**: atualizados pela tabela de espaços.
- **Atributos**: no SRD eles só sobem no nível 4 (e depois 8, 12, 16 e 19), no "Aumento de Atributo":
  +2 em um atributo ou +1 em dois (máx. 20), escolhendo o principal da classe. Nos outros níveis os atributos
  não mudam, mas o que muda por causa do nível (PV, bônus de proficiência no 5, CD de magia, bônus de ataque) recebe o +.

## Pergaminho do campeão (tela final)
Depois da vitória, um pergaminho pixel art desenrola de cima para baixo (papel envelhecido com bordas queimadas,
fitas vermelhas e um selo de cera com um d20) e mostra a ficha do campeão:
- **Topo**: retrato do campeão (o mesmo do cut-in, com expressão de vitória), NOME grande, espécie e classe,
  e "NÍVEL 1 → 2" com o novo número piscando em dourado.
- **Atributos**: os 6 (FOR, DES, CON, INT, SAB, CAR) com valor e modificador. Todo valor que aumentou ganha um
  "+N" em VERDE ao lado (ex.: "CON 16 (+3) +1"), aparecendo um por um com um brilho e um som de subida.
- **Combate**: PV máximos com "+N" em verde e o dado rolado na hora (o d20/dado gira e para no valor),
  CA, bônus de ataque, CD de magia e espaços de magia (os novos em verde).
- **Poderes**: lista de habilidades e magias; os poderes NOVOS aparecem por último, em VERDE, com a marca "NOVO!"
  e uma descrição curta (ex.: "SURTO DE AÇÃO — uma ação extra por descanso").
- **História**: 3–4 linhas em português, em terceira pessoa e sem marcar gênero se ele não foi informado,
  misturando a espécie, a classe, a descrição do comentário (se houver) e o que aconteceu na luta
  (quantos derrubou, o golpe final, um crítico marcante). Ex.: "Nascida nas florestas do norte, a druida
  Zara invocou relâmpagos sobre três rivais e resistiu com 4 PV até o último golpe. Agora, no nível 2,
  aprendeu a assumir a forma das feras."
- **Rodapé**: "DEFENDE O TÍTULO NA PRÓXIMA BATALHA!" e "CRIADO POR @autor" (se veio de comentário).
- Texto em fonte pixel legível (mín. 7 px de altura na resolução interna), dentro da área segura.

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

- Etiqueta "NV 1" ao lado do nome no painel; o campeão que volta mostra "NV 2" (ou mais) e uma coroinha.

## Linha do tempo (90 s)
- 0–5 s: os 10 caem na arena um por um (com poeira), nome, classe e "NV 1" embaixo de cada um, caixa
  "ESCOLHA SEU CAMPEÃO!" com d20 nos cantos, contagem 3-2-1 e "LUTEM!".
- 5–68 s: batalha. Ajuste o ritmo dos turnos para a luta terminar entre 65 e 68 s.
- 68–72 s: câmera aproxima no vencedor (vitória em loop), faixa "VITÓRIA!" e "SUBIU DE NÍVEL!" com uma coluna
  de luz dourada e partículas subindo.
- 72–86 s: pergaminho do campeão (desenrola em 1 s; atributos, PV e poderes aparecem em sequência; os "+" e os
  poderes novos entram em verde com brilho; a história aparece por último, letra por letra).
- 86–90 s: chamada "COMENTE NOME + DESCRIÇÃO DO SEU PERSONAGEM · OS DADOS DECIDEM O RESTO!" sobre o pergaminho.

## Áudio
- Trilha chiptune 8-bit própria (onda quadrada, triângulo e ruído), ~150 BPM, em loop; recua no fim e
  entra uma fanfarra de vitória e um jingle de "level up" quando o pergaminho abre.
- Um efeito por evento: dado rolando, golpe, impacto, crítico, erro, flecha, magia, fogo, explosão, trovão,
  cura, escudo, queda de lutador, contagem, "LUTEM!", papel desenrolando e um "plim" a cada "+" verde.
  Volume final em −14 LUFS.

## Entregáveis
- O vídeo MP4 e uma ficha de texto com: seed, fichas dos 10 no nível 1 (todas as rolagens de 4d6, PV, CA, arma),
  ordem de iniciativa, log do combate rolagem por rolagem e a FICHA NOVA DO CAMPEÃO (nível, rolagem de PV,
  poderes novos e história), pronta para ele voltar na próxima batalha.
- No fim da ficha, o crédito obrigatório do SRD:
  "This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
  available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
  International License, available at https://creativecommons.org/licenses/by/4.0/legalcode."
- Não use a logo nem o nome "Dungeons & Dragons"/"D&D" no vídeo (marca registrada); use "ARENA D20".
