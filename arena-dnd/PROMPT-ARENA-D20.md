Crie um vídeo vertical de motion graphics em PIXEL ART chamado "ARENA D20",
no estilo "battle royale automático" (FFA, todos contra todos) com REGRAS DE RPG DE MESA
(5ª edição, System Reference Document 5.2) e SISTEMA DE NÍVEIS, com duração exata de 1:30 (90 s).
Cada luta é decidida por dados de verdade: nada é roteirizado. Os 16 lutadores são aleatórios,
todos começam no nível 1, e o campeão sobe de nível e termina com um pergaminho mostrando a ficha nova.

## Formato técnico
- 1080×1920 (9:16), 30 fps, 2700 quadros.
- Resolução interna: 360×640 px, ampliada 3× com image-rendering: pixelated (pixels nítidos).
- Simulação determinística com seed fixa: o mesmo render gera sempre a mesma luta e as mesmas rolagens.
  A seed fica gravada junto com o vídeo para qualquer rolagem poder ser conferida depois.
- Área segura: nada importante nos 220 px do topo, nos 320 px da base e nos 96 px laterais.

## Direção de arte dos sprites (prioridade máxima)
Referência de estilo: sprites de RPGs táticos e de ação de fantasia da era GBA/DS/SNES tardio
(ex.: Final Fantasy Tactics Advance, Tactics Ogre, Golden Sun), com proporção chibi de 2,5 cabeças
e alto nível de detalhe. Todos os sprites são desenhados do zero, nada copiado de jogos ou livros oficiais.

- Tamanho: ~48×64 px por personagem (cabeça ≈ 20–22 px de altura, para caber o rosto).
- Paleta própria por personagem, 14–20 cores, com rampas de cor (hue shifting: sombras puxam
  para roxo/azul e luzes para amarelo; nada de "só escurecer").
- Sombreamento em 3–4 tons por material (base, sombra, sombra profunda, brilho), luz vindo
  do alto à esquerda, rim light sutil do lado oposto.
- Contorno seletivo (sel-out): linha escura por fora, linhas internas coloridas, anti-aliasing
  manual só dentro do sprite (nunca na borda externa).
- Materiais diferenciados: tecido com dobras e vincos, couro com costuras, cota de malha em xadrez,
  metal de armadura com brilho especular de 1 px, madeira de cajados e arcos com veios, cabelo em
  mechas (clusters) com 2 brilhos, pele com blush e sombra no pescoço, escamas (draconato) e
  chifres (tiefling) com textura própria.
- Rosto detalhado: olhos com íris, pupila e brilho, sobrancelhas expressivas, boca e marcas
  (cicatrizes, tatuagens, barba, presas, sardas). Elmo fechado mostra só a fenda com os olhos brilhando.
- Sombra elíptica semitransparente no chão, embaixo de cada personagem.

### Expressões faciais (troca de rosto conforme o estado)
1. Neutra/idle   2. Concentrada (em combate)   3. Grito de ataque (boca aberta, olhos fixos)
4. Dor (olhos apertados, gota de suor)   5. PV baixo (ofegante, roupa rasgada, arranhões)
6. Derrota (olhos em "X", queda)   7. Vitória (sorriso, pose característica da classe)

### Animações (quadros por ação)
- Idle respirando: 4 quadros (cabelo, capa e manto balançam levemente)
- Caminhada: 6 quadros, 4 direções (capa, aljava, chapéu e acessórios com movimento secundário)
- Ataque com arma: 4 quadros · Magia/habilidade especial: 6–8 quadros (com antecipação e follow-through)
- Dano: 2 quadros · Derrota: 4 quadros · Vitória: 4 quadros em loop
- Dano progressivo: abaixo de 30% dos PV o sprite troca para a versão com roupa rasgada e ferimentos.
- Movimento constante: enquanto esperam a vez, os lutadores circulam pela arena (nunca ficam parados);
  no próprio turno, andam até a posição da regra e agem.

### Cut-in de golpe especial (estilo anime)
- Dispara em: 20 natural (CRÍTICO!), golpe que derruba um lutador, Fúria, Arma de Sopro, Surto de Ação e
  Destruição Divina (quando o lutador já tiver esses poderes) e magias que acertam 2+ alvos (ex.: Onda Trovejante).
- A ação congela por 0,6 s e aparece uma faixa diagonal com o ROSTO do personagem em close (retrato
  pixel art 96×64 px, rico em detalhes e com expressão de grito), linhas de velocidade ao fundo,
  o nome do golpe e a rolagem em destaque (ex.: "RAIO DE FOGO · 1d10 = 10"). Depois o golpe é disparado.
- Máximo de um cut-in a cada 4–5 s, para não cansar (prioridade: crítico > abate > recursos de classe).

## Cenário (arena): calabouço de pedra
- Mapa top-down estilo GBA/SNES de uma **dungeon / calabouço**, ocupando a tela toda: um salão de pedra
  retangular com chão de lajotas irregulares (rachaduras, musgo nas juntas, poças d'água refletindo o fogo,
  manchas de sangue antigo), com o mesmo nível de detalhe dos sprites.
- **Paredes** de blocos de pedra em volta do salão (vista de cima com a face da parede aparecendo embaixo),
  com arcos, portões de ferro fechados (grade levadiça), correntes penduradas, crânios em nichos e
  estandartes rasgados. A parede de cima fica atrás do HUD e a de baixo dentro da área segura inferior.
- **Tochas** presas nas paredes e em braseiros de ferro no chão (8 a 10 no total), com chama animada de 4 quadros,
  fagulhas subindo e fumaça leve. Cada tocha projeta uma **poça de luz quente** (laranja-âmbar) que tremula;
  fora das poças de luz o salão fica em penumbra azul-esverdeada.
- **Clima escuro, mas legível**: vinheta escura nas bordas, iluminação de ambiente fraca, e os personagens SEMPRE
  bem visíveis (recebem a luz das tochas próximas + um contorno de luz sutil); efeitos de magia iluminam o
  chão em volta enquanto duram (bola de fogo clareia a sala de laranja, raio pisca em branco).
- **Centro**: um tablado de pedra em "pirâmide de degraus" (3 níveis baixos) com runas gravadas que brilham
  fraco em azul, e um altar/pedra central em forma de d20 (icosaedro) como obstáculo.
- Detalhes espalhados (sem atrapalhar a luta): ossos, barris e caixotes quebrados nos cantos, teias de aranha
  nos cantos das paredes, ratos correndo de vez em quando, gotas pingando do teto nas poças, poeira no ar.
- Cenário com saturação e brilho menores que os dos personagens, para eles se destacarem.

## Lutadores (16 personagens ALEATÓRIOS de fantasia, gerados pelos dados)
Nenhum personagem é pré-definido. A cada episódio, com a seed, sorteie 16 lutadores:
- **Espécie** (SRD 5.2): Humano, Elfo, Anão, Halfling, Gnomo, Orc, Tiefling, Draconato, Golias.
  Traços visuais: elfo com orelhas longas; anão baixo e barbudo; halfling e gnomo baixos (gnomo com orelhas
  grandes); orc de pele verde-acinzentada com presas; tiefling de pele vermelha/roxa com chifres, cauda e
  olhos dourados; draconato com cabeça de dragão, dentes à mostra e escamas na cor da ancestralidade
  (vermelho, azul, branco, verde, negro, dourado, prateado, bronze); golias alto, de pele cinza com marcas.
- **Classe** (todos começam no nível 1): Guerreiro, Bárbaro, Paladino, Patrulheiro, Ladino, Monge, Mago,
  Feiticeiro, Bruxo, Clérigo, Druida, Bardo. Todas as 12 classes aparecem pelo menos uma vez se possível;
  no máximo 2 da mesma classe por episódio (12 + 4 repetidas = 16).
- **Nome**: sorteado de uma lista de nomes de fantasia (Thorin, Lyra, Kael, Mirela, Bruk, Seraphine, Doran,
  Vex, Elowen, Garruk, Isolde, Nyx, Zara, Ulric, Wren, Tamsin, Orrin, Rhea, Borin, Cassia, Faelan, Grom, Liora,
  Marek, Quill, Sable, Tobias, Yara, Azura…), sem repetir no mesmo episódio. Espécies também variadas (máx. 3 iguais).
- **Cores e cabelo**: paletas medievais (carmesim, azul real, verde-floresta, púrpura, mostarda, vinho,
  ardósia); cabelo natural ou fantasia; estilo curto, longo, rabo, tranças, coque, moicano ou careca;
  barba opcional.
- **Vestimenta, golpes e cor da caixa de cada classe** (as peças são sorteadas entre as opções):

| Classe | Visual a detalhar no sprite (peças sorteadas) | Golpes no nível 1 (cor da caixa) |
|---|---|---|
| GUERREIRO | Elmo fechado com pluma ou cruz, elmo aberto ou com chifres; placas ou cota de malha com tabardo; ombreiras; capa; escudo com brasão; montante, espada longa ou machado | ATAQUE (branco) · RETOMAR O FÔLEGO (verde) |
| BÁRBARO | Peito nu com cicatrizes ou colete de couro, pele de animal nos ombros, elmo com chifres ou bandana, pinturas de guerra; machado grande ou montante | FÚRIA! (laranja, vapor vermelho) · ATAQUE (branco) |
| PALADINO | Placas brilhantes com tabardo e símbolo sagrado, elmo com pluma, capa, escudo com brasão; espada longa ou martelo | ATAQUE (branco) · CURA PELAS MÃOS (verde) |
| PATRULHEIRO | Capuz e capa verdes, couro com correias, aljava nas costas, arco longo | MARCA DO CAÇADOR (verde-limão) · FLECHA (bege) |
| LADINO | Capuz, máscara ou bandana; couro escuro com correias; capa curta; rapieira, adagas ou arco curto | ATAQUE FURTIVO (cinza-prata) |
| MONGE | Gi com faixa colorida, cabeça raspada ou coque, faixas nas mãos e pés descalços | ARTES MARCIAIS (azul-claro) |
| MAGO | Chapéu pontudo com faixa dourada ou capuz; manto longo com faixa central; cajado com cristal brilhante | RAIO DE FOGO (laranja) · MÍSSEIS MÁGICOS (magenta) · ONDA TROVEJANTE (azul) · ESCUDO (ciano) |
| FEITICEIRO | Diadema ou capuz, manto ou túnica, orbe flutuante na cor da magia, escamas leves no rosto | RAIO DE FOGO (laranja) · RAIO DE GELO (azul-claro) · ORBE CROMÁTICO (verde-ácido) |
| BRUXO | Capuz escuro ou elmo com chifres, couro ou manto, orbe roxo flutuando ao lado | RAJADA MÍSTICA (magenta) · BRUXARIA (roxo) |
| CLÉRIGO | Manto claro ou cota de malha com símbolo sagrado, diadema, escudo; maça | CHAMA SAGRADA (dourado) · RAIO GUIA (dourado) · PALAVRA CURATIVA (verde) |
| DRUIDA | Coroa de folhas, galhada ou capuz; manto verde ou túnica com pele; escudo de madeira; cimitarra | PRODUZIR CHAMA (laranja) · CHICOTE DE ESPINHOS (verde) · ONDA TROVEJANTE (azul) |
| BARDO | Boina com pena, túnica colorida, capa; alaúde ou rapieira | ZOMBARIA VICIOSA (rosa) · SUSSURROS DISSONANTES (rosa) · PALAVRA CURATIVA (verde) |

- **Personagens dos comentários (opcional)**: se receber uma lista "NOME + DESCRIÇÃO" de seguidores, use-os no
  lugar dos aleatórios. Classe, espécie, cores e arma saem da descrição; ATRIBUTOS, PV e GOLPES continuam sendo
  rolados nos dados. Mostre "CRIADO POR @autor" se ele vencer.
- **Campeão do episódio anterior (opcional)**: se receber a ficha do último campeão, ele entra como 1 dos 16, com o
  nível, os atributos, os PV e os poderes que já conquistou, e uma coroa pixel art em cima da cabeça. Os outros 15
  são sempre nível 1.
- **Balanceamento**: não há "personagem forte" escolhido a dedo. A diferença entre eles vem só dos dados
  (atributos, PV, acertos) e das regras de classe; qualquer um pode vencer. O vencedor NÃO pode ser forçado:
  quem decide são os dados (para outro resultado, troque a seed).

## Sistema de níveis
- **Todos começam no NÍVEL 1** e só podem usar o que o nível deles permite (tabela "Poderes por nível").
  Ex.: no nível 1 o Mago tem só 2 espaços de magia de 1º círculo e não conhece Bola de Fogo; o Guerreiro
  ainda não tem Surto de Ação nem Ataque Extra.
- **Bônus de proficiência**: +2 nos níveis 1–4, +3 nos níveis 5–8 (segue o SRD).
- **Truques escalam**: 1 dado de dano nos níveis 1–4, 2 dados a partir do 5º (ex.: Raio de Fogo 1d10 → 2d10).
- **Só o CAMPEÃO sobe de nível**, depois da vitória. Se ele voltar e vencer de novo, sobe mais um nível;
  se perder, a sequência termina.

## Sistema de dados (regras SRD 5.2)
Ficha de cada lutador no nível 1 (toda rolagem gravada para conferência):
- **Atributos**: role 4d6 e descarte o menor, 6 vezes (FOR, DES, CON, INT, SAB, CAR). O maior valor vai no
  atributo principal da classe; +2/+1 do antecedente (máx. 20). Modificador = (valor − 10) ÷ 2, arredondado
  para baixo. Se a soma dos modificadores for ≤ 0, role o conjunto de novo.
- **Pontos de vida no nível 1**: valor máximo do dado de vida + modificador de CON.
  Dados de vida: d12 Bárbaro · d10 Guerreiro, Paladino, Patrulheiro · d8 Bardo, Bruxo, Clérigo, Druida,
  Ladino, Monge · d6 Feiticeiro, Mago.
- **Classe de Armadura (CA)**: placas 18 · cota de malha 16 · brunea 14 + DES (máx. 2) · couro 11 + DES ·
  couro batido 12 + DES · bárbaro 10 + DES + CON · monge 10 + DES + SAB · armadura arcana 13 + DES · escudo +2.

### Poderes por nível (progressão do SRD 5.2, níveis 1 a 5)
Espaços de magia: conjuradores completos (Bardo, Clérigo, Druida, Feiticeiro, Mago) 2 → 3 → 4+2 → 4+3 → 4+3+2;
meio-conjuradores (Paladino, Patrulheiro) 2 → 2 → 3 → 3 → 4+2; Bruxo 1 → 2 (1º círculo) → 2 (2º) → 2 (2º) → 2 (3º).
("4+2" = 4 espaços de 1º círculo e 2 de 2º.)

| Classe | Nível 1 | Nível 2 | Nível 3 | Nível 4 | Nível 5 |
|---|---|---|---|---|---|
| Bárbaro | Fúria (2×), Defesa sem Armadura | Ataque Descuidado, Sentido de Perigo | Frenesi (Berserker), Fúria 3× | Aumento de Atributo | Ataque Extra, Movimento Rápido |
| Bardo | Inspiração de Bardo (d6); Zombaria Viciosa, Sussurros Dissonantes, Palavra Curativa, Onda Trovejante | Pau pra Toda Obra | Colégio; Despedaçar (2º) | Aumento de Atributo | Inspiração d8 |
| Clérigo | Chama Sagrada, Raio Guia, Palavra Curativa, Curar Ferimentos | Canalizar Divindade: Centelha Divina (1d8) | Arma Espiritual (2º), Domínio | Aumento de Atributo | Guardiões Espirituais (3º) |
| Druida | Produzir Chama, Chicote de Espinhos, Onda Trovejante, Palavra Curativa | Forma Selvagem | Raio Lunar (2º), Círculo | Aumento de Atributo | Convocar Relâmpagos (3º) |
| Guerreiro | Estilo de Luta, Retomar o Fôlego (1d10 + nível) | Surto de Ação | Crítico Aprimorado (19–20, Campeão) | Aumento de Atributo | Ataque Extra |
| Monge | Artes Marciais (d6), Defesa sem Armadura | Foco: Rajada de Golpes, Defesa Paciente, Passo do Vento | Defletir Ataques | Aumento de Atributo | Golpe Atordoante, Ataque Extra, Artes Marciais d8 |
| Paladino | Cura pelas Mãos (5 PV × nível), magias de 1º | Estilo de Luta, Destruição Divina | Canalizar Divindade, Juramento | Aumento de Atributo | Ataque Extra |
| Patrulheiro | Marca do Caçador, magias de 1º | Estilo de Luta (Arquearia +2) | Presa do Caçador | Aumento de Atributo | Ataque Extra |
| Ladino | Ataque Furtivo 1d6 | Ação Ardilosa | Ataque Furtivo 2d6, Mira Firme | Aumento de Atributo | Ataque Furtivo 3d6, Esquiva Sobrenatural |
| Feiticeiro | Raio de Fogo, Raio de Gelo, Orbe Cromático, Feitiçaria Inata | Fonte de Magia, Metamagia | Raio Ardente (2º), Feitiçaria Dracônica | Aumento de Atributo | Bola de Fogo (3º) |
| Bruxo | Rajada Mística, Bruxaria | Rajada Agonizante (+CAR) | Pacto; magias de 2º | Aumento de Atributo | Toque Vampírico (3º) |
| Mago | Raio de Fogo, Mísseis Mágicos, Onda Trovejante, Escudo, Armadura Arcana | Erudito | Raio Ardente (2º), Escola de Evocação | Aumento de Atributo | Bola de Fogo e Relâmpago (3º) |

Traços de espécie no nível 1: Sortudo (halfling rerrola o 1), Resistência Implacável (orc fica com 1 PV uma vez),
Surto de Adrenalina (orc), Legado Infernal (tiefling: resistência a fogo + truque Raio de Fogo; Repreensão Infernal
só no nível 3), Arma de Sopro (draconato, 1d10 em cone; 2d10 no nível 5), Resistência da Pedra (golias),
Robustez Anã (+1 PV por nível), Inspiração Heroica (humano rerrola um ataque), Astúcia Gnômica.

## Mecânica da luta (regras + IA simples)
- **Iniciativa**: d20 + DES; cada rodada age do maior para o menor (seta ▼ piscando em cima de quem está no turno).
- **Turno**: deslocamento (30 pés; alguns têm 25–35) + uma ação + às vezes uma ação bônus + uma reação por rodada.
- **IA**: lutadores corpo a corpo vão até o inimigo mais vantajoso (perto, ferido ou atordoado); atiradores e
  conjuradores contornam o alvo mantendo distância; com PV baixo usam cura (se tiverem) ou fogem (Desengajar).
- **Ataque**: d20 + modificador + proficiência ≥ CA do alvo → acerta. **20 natural = CRÍTICO** (dados de dano em
  dobro). **1 natural = FALHA**. Vantagem/desvantagem = rola 2d20 e fica com o maior/menor.
  Um **d20 gira** ao lado de quem ataca por 0,2 s e para no resultado (verde = acertou, cinza = errou,
  dourado = 20 natural, vermelho = 1 natural).
- **Magias de salvaguarda**: o alvo rola d20 + modificador contra CD = 8 + proficiência + mod. de conjuração;
  passou = metade do dano (quando a magia permite) e aparece "SALVOU".
- **Dano**: sempre nos dados da arma ou magia + modificador (ex.: Montante 2d6+3, Machado Grande 1d12+3,
  Arco Longo 1d8+3, Raio de Fogo 1d10, Mísseis Mágicos 3×(1d4+1), Rajada Mística 1d10 (+CAR a partir do nível 2)).
- **Concentração**: ao sofrer dano, CON contra CD 10 ou metade do dano; falhou = a magia acaba ("PERDEU CONCENTRAÇÃO").
- **Caixa do golpe**: caixa pixel com o nome do golpe por ≈1 s (borda escura 2 px, fundo na cor do tipo de dano,
  texto branco em fonte pixel) + efeito visual com partículas e brilho: corte em arco da espada, flecha com rastro,
  bola de fogo com explosão, dardos de energia em curva, feixe de gelo, raio vindo do céu, coluna de luz dourada,
  onda de trovão em anel, espinhos que puxam, notas musicais da zombaria, sopro em cone do draconato.
- **Cores por tipo de dano**: fogo laranja, frio azul-claro, elétrico amarelo, trovejante azul, radiante dourado,
  necrótico roxo, energia magenta, psíquico rosa, veneno verde, ácido verde-limão, cortante/perfurante/concussão
  branco, cura verde.
- **Dano recebido**: sprite pisca em branco, recua, rosto troca para "dor", número de dano sobe e some
  ("ERROU", "SALVOU", "CRÍTICO!" quando for o caso; cura em verde com "+").
- **Condições** em etiqueta abaixo da barra de PV: "ATD" (atordoado), "MRC" (marcado), "LNT" (lento), "FÚR" (em fúria),
  "CNC" (concentrando), "ESC" (escudo ativo).
- Mini barra de PV abaixo de cada sprite: verde > amarelo > vermelho.
- **0 PV / derrota**: rosto de derrota, queda, sprite pisca e some com "poof" de fumaça; faixa "[NOME] CAIU!" com o
  mini retrato; fica uma caveirinha no chão.
- Eliminações espalhadas pelo vídeo inteiro (ajuste o ritmo dos turnos, não as regras).

## HUD (topo, logo abaixo dos 220 px de área segura)
- Título "ARENA D20 #N" e "RODADA X · VIVOS N".
- Grade 4×4 com os 16 lutadores: mini retrato do rosto (16×16 px, com expressão que muda conforme os PV) + nome em
  fonte pixel + "NV 1" + quadradinho na cor da classe + barra de PV em tempo real.
- Eliminado: retrato em tons de cinza com "X", nome riscado, barra vazia.
- Campeão que volta: "NV 2" (ou mais) em dourado e uma coroinha no retrato.

## Subida de nível do campeão (regras de mesa, com dados)
Ao vencer, o campeão sobe 1 nível (1 → 2 na primeira vitória):
- **PV**: role o dado de vida da classe + modificador de CON (mínimo 1) e some ao máximo. Mostre a rolagem
  (ex.: "d10 = 7 + 2 CON = +9 PV").
- **Poderes**: recebe tudo da coluna do novo nível na tabela (ex.: Guerreiro nível 2 → Surto de Ação).
- **Espaços de magia e truques**: atualizados pela tabela de espaços.
- **Atributos**: no SRD eles só sobem no nível 4 (e depois 8, 12, 16 e 19), no "Aumento de Atributo": +2 em um
  atributo ou +1 em dois (máx. 20), escolhendo o principal da classe. Nos outros níveis os atributos não mudam,
  mas o que muda por causa do nível (PV, bônus de proficiência no 5, CD de magia, bônus de ataque) recebe o "+".

## Pergaminho do campeão (tela final)
Depois da vitória, um pergaminho pixel art desenrola de cima para baixo (papel envelhecido com bordas queimadas,
fitas vermelhas e um selo de cera com um d20) e mostra a ficha do campeão:
- **Topo**: retrato do campeão (o mesmo do cut-in, com expressão de vitória), NOME grande, espécie e classe, e
  "NÍVEL 1 → 2" com o novo número piscando em dourado.
- **Atributos**: os 6 (FOR, DES, CON, INT, SAB, CAR) com valor e modificador. Todo valor que aumentou ganha um "+N"
  em VERDE ao lado (ex.: "CON 16 (+3) +1"), aparecendo um por um com um brilho e um som de subida.
- **Combate**: PV máximos com "+N" em verde e o dado rolado na hora (o dado gira e para no valor), CA, bônus de
  ataque, CD de magia e espaços de magia (os novos em verde).
- **Poderes**: lista de habilidades e magias; os poderes NOVOS aparecem por último, em VERDE, com a marca "NOVO!"
  e uma descrição curta (ex.: "SURTO DE AÇÃO — uma ação extra por descanso").
- **História**: 3–4 linhas em português, em terceira pessoa e sem marcar gênero se ele não foi informado,
  misturando espécie, classe, a descrição do comentário (se houver) e o que aconteceu na luta (quantos derrubou,
  o golpe final, um crítico marcante). Ex.: "Vinda das florestas do norte, Zara invocou espinhos e trovões sobre
  três rivais e resistiu com 4 PV até o último golpe. Agora, no nível 2, aprendeu a assumir a forma das feras."
- **Rodapé**: "DEFENDE O TÍTULO NA PRÓXIMA BATALHA!" e "CRIADO POR @autor" (se veio de comentário).
- Texto em fonte pixel legível (mín. 7 px de altura na resolução interna), dentro da área segura.

## Roteiro (90 s)
1. **0–5 s · INTRO**: os 16 caem na arena em círculo (com poeira), cada um faz sua pose de idle, com nome, classe
   e "NV 1" embaixo; banner "ESCOLHA SEU CAMPEÃO!" com d20 nos cantos e contagem "3, 2, 1, LUTEM!".
2. **5–56 s · BATALHA**: luta livre por rodadas; a cada eliminação, aviso "[NOME] CAIU!" com o mini retrato.
3. **56–64 s · DUELO FINAL**: restam 2; cut-in duplo com os dois rostos se encarando ("VS") e as fichas resumidas
   (PV, CA, classe), zoom 1,2×, música acelera, especiais com tremor de tela.
4. **64–68 s · VENCEDOR**: banner "VITÓRIA DE [NOME]!", retrato grande sorrindo, pose de vitória, confetes pixel,
   coluna de luz dourada e "SUBIU DE NÍVEL!".
5. **68–86 s · PERGAMINHO**: desenrola em 1 s; atributos, PV e poderes aparecem em sequência; os "+" e os poderes
   novos entram em verde com brilho; a história aparece por último, letra por letra.
6. **86–90 s · CTA**: "Comente NOME + DESCRIÇÃO do seu personagem · os dados decidem o resto!" + @perfil.
Ajuste o ritmo dos turnos (nunca as regras) para a luta caber no tempo da batalha e do duelo final.

## Áudio (estilo jogo retrô 8/16 bits, trilha e efeitos sintetizados próprios)
- Ambiente de calabouço por baixo de tudo: crepitar das tochas, gotas pingando, eco leve nos golpes.
- Trilha chiptune de batalha (≈140–150 BPM, tom menor, clima de masmorra) em loop; versão intensa no duelo final; jingle de vitória e jingle
  de "level up" quando o pergaminho abre.
- Efeitos: passos discretos, dado rolando, um som por tipo de golpe (corte, flecha, fogo, gelo, trovão, raio,
  luz sagrada, sombra, cura), "whoosh" + estalo no cut-in, "hit" ao levar dano, sino no crítico, "plim" no erro,
  bip de PV baixo, arpejo descendente na derrota, blip do banner, contagem 3-2-1 + "LUTEM!", fanfarra de vitória,
  papel desenrolando e um "plim" subindo a cada "+" verde do pergaminho.
- Efeitos ~4–6 dB acima da trilha, limite de SFX simultâneos; master em −14 LUFS / −1 dBTP.

## Entrega
- MP4 1080×1920, 30 fps, 90 s, com áudio.
- Sprite sheets em PNG por personagem (todas as animações e expressões, versão normal e com roupa rasgada)
  + retratos (16×16 do HUD e 96×64 do cut-in/pergaminho).
- Dados editáveis em JSON, para novos episódios trocando só os dados:
  número do episódio, seed, lutadores (nome, descrição, @autor — vazio = aleatório), ficha do campeão anterior,
  textos dos banners e @perfil.
- Ficha de texto do episódio: seed, fichas dos 16 no nível 1 (todas as rolagens de 4d6, PV, CA, arma), ordem de
  iniciativa, log do combate rolagem por rolagem e a FICHA NOVA DO CAMPEÃO (nível, rolagem de PV, poderes novos e
  história), pronta para ele voltar no próximo episódio.
- No fim da ficha, o crédito obrigatório do SRD:
  "This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
  available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
  International License, available at https://creativecommons.org/licenses/by/4.0/legalcode."
- Não use a logo nem o nome "Dungeons & Dragons"/"D&D" no vídeo (marca registrada); use "ARENA D20".
