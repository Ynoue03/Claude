# ARENA D20 — todas as regras combinadas até agora

Este arquivo junta **tudo o que foi definido na nossa conversa**: o prompt original e cada mudança pedida depois, já no
estado atual (quando uma regra foi trocada, vale a versão nova; o histórico está no fim).
Detalhes técnicos e tabelas completas (classes, poderes, itens, chefes, cores, arquivos) estão em
[`SuaArenaD20.md`](SuaArenaD20.md).

---

## 1. O que é

- Vídeo vertical em **pixel art** chamado **ARENA D20**: battle royale automático, todos contra todos, com regras de RPG
  de mesa (**5ª edição, SRD 5.2**) e sistema de níveis.
- Cada luta é decidida por **dados de verdade**: nada é roteirizado e **o vencedor nunca é escolhido**. Para outro
  resultado, troca-se a seed.
- Série: cada episódio é um JSON novo; o campeão volta no episódio seguinte.
- Perfil no CTA: **@SuaArenaD20**.
- Proibido usar o nome ou a logo "Dungeons & Dragons"/"D&D" (marca registrada). O nome é "ARENA D20".
- Tem estética própria de jogo retrô; **não** segue a identidade "quiet luxury" do resto do repositório.

## 2. Formato

- 1080×1920 (9:16), 30 fps, **90 s exatos** (2700 quadros), com áudio.
- Resolução interna **360×640**, ampliada **3×** com pixels nítidos (sem suavizar).
- Área segura: nada importante nos 220 px do topo, nos 320 px da base e nos 96 px das laterais.
- Master de áudio em **−14 LUFS / −1 dBTP**.

## 3. Lutadores

- **16 lutadores aleatórios** por episódio, sorteados pela seed. Nenhum é pré-definido nem "forte de propósito".
- **Espécies (SRD 5.2):** Humano, Elfo, Anão, Halfling, Gnomo, Orc, Tiefling, Draconato, Golias — no máximo 3 iguais
  por luta. Cada uma com traços visuais próprios (orelhas, barba, presas, chifres e cauda, cabeça de dragão nas cores
  da ancestralidade, golias alto e cinza…).
- **Classes:** Guerreiro, Bárbaro, Paladino, Patrulheiro, Ladino, Monge, Mago, Feiticeiro, Bruxo, Clérigo, Druida,
  Bardo. As 12 aparecem sempre que possível; no máximo 2 da mesma classe (12 + 4 repetidas = 16).
- Visual sorteado entre as peças de cada classe (elmos, armaduras, capas, mantos, armas, chapéus…), com paletas
  medievais, cabelo (curto, longo, rabo, tranças, coque, moicano, careca) e barba opcional.
- **Personagens dos comentários** (opcional): "NOME + DESCRIÇÃO + @autor". Classe, espécie, cores e arma saem da
  descrição; **atributos, PV e golpes continuam nos dados**. Se vencer, aparece "CRIADO POR @autor".
- Todos começam no **nível 1**, menos o campeão que volta.

## 4. Nomes

- Todo lutador tem **nome e sobrenome**, e **nenhum nome se repete na série** (versão 2+).
- O lutador número `(episódio − 1) × 16 + posição` recebe o nome dessa posição de uma sequência fixa de 48 nomes ×
  40 sobrenomes. São 1920 combinações, todas diferentes, e cada luta tem 16 primeiros nomes diferentes (dá para
  120 episódios sem repetir).
- Nome vindo de comentário é usado como veio; se coincidir com um sorteado, o sorteado troca por um da reserva.
- O campeão antigo que não tinha sobrenome ganha um, fixo (ex.: Yara → Yara Rubrafonte).

## 5. Ficha (dados do SRD 5.2)

- **Atributos:** 4d6 descartando o menor, 6 vezes; o maior vai no atributo principal da classe; +2/+1 do
  antecedente (máx. 20). Modificador = (valor − 10) ÷ 2, arredondado para baixo. Se a soma dos modificadores for
  ≤ 0, rola o conjunto de novo.
- **PV no nível 1:** valor máximo do dado de vida + CON (d12 Bárbaro; d10 Guerreiro, Paladino, Patrulheiro;
  d8 Bardo, Bruxo, Clérigo, Druida, Ladino, Monge; d6 Feiticeiro, Mago).
- **CA:** placas 18 · cota de malha 16 · brunea 14 + DES (máx. 2) · couro 11 + DES · couro batido 12 + DES ·
  bárbaro 10 + DES + CON · monge 10 + DES + SAB · armadura arcana 13 + DES · escudo +2.
- **Proficiência:** +2 nos níveis 1–4, +3 nos níveis 5–8, +4 nos níveis 9–10. **Truques** com 1 dado nos níveis 1–4 e 2 dados a partir do 5.
- Poderes e espaços de magia **só os do nível** de cada um (tabela de poderes por nível do SRD, **até o nível 10**;
  os poderes do 6 em diante aparecem na ficha e no pergaminho, e na luta vale o efeito que já existia até o nível 5).
- Proficiência +4 a partir do nível 9.
- Traços de espécie: Sortudo, Resistência Implacável, Surto de Adrenalina, Legado Infernal, Arma de Sopro,
  Resistência da Pedra, Robustez Anã, Inspiração Heroica, Astúcia Gnômica, Passo Élfico.
- Toda rolagem fica gravada na FICHA para conferência.

## 6. Mecânica da luta

- **Iniciativa:** d20 + DES; cada rodada vai do maior para o menor.
- **Turnos de 4 em 4:** na tela, **4 lutadores agem ao mesmo tempo** (início escalonado), em vez de um de cada vez.
  As regras continuam em ordem de iniciativa — só a apresentação é em grupo.
- **Turno:** deslocamento (25–35 pés) + 1 ação + às vezes ação bônus + 1 reação por rodada.
- **Ataque de oportunidade** ao sair do alcance de um inimigo corpo a corpo (o ladino nível 2+ desengaja com a Ação
  Ardilosa).
- **Ataque:** d20 + modificador + proficiência ≥ CA acerta. **20 natural = CRÍTICO** (dados de dano em dobro);
  **1 natural = FALHA**. Vantagem/desvantagem = 2d20, fica com o maior/menor.
- **Salvaguardas:** d20 + modificador contra CD = 8 + proficiência + mod. de conjuração; passou = metade do dano
  quando a magia permite ("SALVOU").
- **Dano** sempre nos dados da arma/magia + modificador.
- **Concentração:** ao levar dano, CON contra CD 10 ou metade do dano; falhou, a magia acaba.
- **0 PV = cai** (sem testes de morte), sai de cena com fumaça e fica uma caveirinha. O último de pé vence.
- **Escala:** 1 pé = 4 px.

## 7. IA

- Corpo a corpo vai até o inimigo mais vantajoso (perto, ferido, atordoado).
- Atiradores e conjuradores (mago, feiticeiro, bruxo, clérigo, druida, bardo, patrulheiro, ladino com arco)
  **evitam o corpo a corpo**: buscam o ponto mais seguro de onde ainda alcançam o alvo, recuam quando alguém chega
  perto e atacam de longe; com PV baixo usam cura.
- **Foco no campeão (versão 2+):** os lutadores preferem atacar o campeão, **com força proporcional ao nível dele**:
  `focoCampeao: "forte"` (a partir do episódio 12) = 0,31 × PV máximo do campeão − 4,35. Os lutadores evitam alvos
  com muito PV, então o foco cresce com os PV dele; calibrado para o campeão vencer ~35–40% em qualquer nível.
  (Nos episódios 6–11 era `"auto"` = 2,5 × (nível − 2), que ficou fraco: o Korrin no nível 7 vencia 100%.)
- **Foco no chefe:** nos episódios com chefe, os heróis preferem atacar o chefe (`focoChefe` 1,25).
- Nada é coordenado entre lutadores.

## 8. Níveis e campeão

- **Só o vencedor sobe de nível**, depois da vitória: +1 nível; PV = dado de vida rolado + CON (mínimo 1), com a
  rolagem mostrada; poderes do novo nível; espaços de magia atualizados; **Aumento de Atributo no nível 4**
  (+2 no atributo principal; o Guerreiro também no 6 e o Ladino também no 10). Nos outros níveis os atributos não mudam.
- **Quem derrubar o campeão ganha 1 nível na hora**, no meio da luta. Se esse lutador também vencer a arena, ganha
  mais 1 → **+2 níveis** no total.
- O **campeão volta no episódio seguinte** como 1 dos 16, com nível, atributos, PV, poderes, itens e uma **coroa**.
  Se perder, a sequência dele termina.
- O campeão é passado copiando `arena-d20/epNN/campeao.json` para `campeaoAnterior` do próximo episódio.

## 9. Baú do campeão e itens mágicos (versão 3)

- Nos episódios **múltiplos de 5** (5, 10, 15…), depois da vitória entra uma cena de 4 s: **o campeão abre um baú e
  acha um item aleatório com poder**.
- **30 itens**: espada, armadura, elmo, botas, luvas, capa, arco, machado, escudo e **cajado**, com **3 versões de
  cada tipo**, cada uma com um poder diferente (ex.: escudo que bloqueia o primeiro golpe que causaria dano, elmo que
  engana a morte e volta com 1 PV, capa que deixa invisível por 2 turnos). Lista completa em `SuaArenaD20.md`.
- **3 cajados para os magos:** Cajado Arcano (+1d6 nas magias de ataque), Cajado da Sabedoria (+2 na CD das magias),
  Cajado da Renovação (recupera 1 espaço de magia a cada 2 rodadas).
- Só **1 item de cada tipo** por lutador; o sorteio rerrola se sair um tipo que ele já tem.
- **Itens por classe:** quem luta à distância **não pode pegar machado, espada nem escudo**; quem luta corpo a corpo
  **não pode pegar cajado nem arco**. Vale no baú, no item que o chefe deixa cair e ao derrotar quem carrega itens.
- Os itens ficam com o campeão para as próximas lutas.
- **Quem derrotar o portador pega os itens dele** na hora ("PEGOU O ITEM!"), só os de tipos que ainda não tem e que
  são da sua classe; se vencer, leva para o próximo episódio.
- Se o chefe vencer, não tem baú.

## 10. Chefes (a cada 10 episódios)

- Nos episódios **10, 20, 30…** entra um **chefe**, uma criatura grande do SRD, nesta ordem: **Minotauro → Grifo →
  Hidra → Gigante da Colina → Quimera → Dragão Vermelho** (e repete).
- O "Beholder" não está no SRD (é material protegido), então foi trocado pela **Quimera**.
- O chefe entra como **17º lutador**, no **centro** do círculo, cercado pelos 16 heróis. É todos contra todos (os
  heróis também se atacam), mas eles preferem o chefe.
- **Tamanho:** o chefe é bem maior que os heróis — **3× maior que o primeiro desenho** (336×336 px no mundo,
  redesenhado em resolução tripla para o pixel dele ter o mesmo tamanho do pixel dos heróis). Corpo e alcance crescem
  junto.
- Age **2 vezes por rodada**, com todos os ataques em cada turno; tem um **especial com recarga** (investida, rasante,
  fúria das cabeças, arremesso de pedra, sopro de fogo); não é empurrado; quem voa não provoca ataque de oportunidade.
- **Quem derrubar o chefe sobe 1 nível na hora e ganha um item** (da sua classe) — "CHEFE DERROTADO!".
- **Se o chefe vencer:** "O [CHEFE] VENCEU!", sem baú, o pergaminho mostra a ficha do chefe, "A ARENA ESPERA UM NOVO
  CAMPEÃO", e o episódio seguinte começa **sem campeão**.
- PV ajustados para o chefe vencer ~30% das vezes (o Dragão, o mais difícil, ~50%).
- Interface: aviso "CUIDADO: [CHEFE]!" com rugido na abertura e barra de vida própria embaixo do placar.

## 11. Arenas

- **Calabouço** (padrão): salão de pedra top-down, lajotas, paredes com arcos, portões, correntes e estandartes,
  8–10 tochas com luz quente que tremula, penumbra fora da luz, poças, ratos, poeira, gotas.
- **Floresta**: clareira no mesmo estilo e nível de detalhe do calabouço — grama, terra batida, árvores, ruínas,
  lanternas, fogueiras, lagos, vaga-lumes, folhas caindo.
- **Caverna — só para luta com chefe**: **4× a arena tradicional**, escura, com algumas tochas (8), rocha,
  estalagmites, cristais, lago, ossadas e morcegos. Episódio com chefe vai sempre para a caverna; sem chefe nunca.
- **Sem o d20 e sem as escadas no centro**: episódios novos usam `centro: "livre"` (sem tablado de degraus e sem a
  pedra d20). Os episódios antigos continuam como foram feitos.
- Sempre: clima escuro mas legível, personagens bem visíveis, cenário menos saturado que os personagens, vinheta e
  grão leve.

## 12. Câmera

- Arenas normais: a arena inteira na tela; **zoom 1,2× no duelo final**; tremor de tela nos especiais.
- **Caverna (luta com chefe): a câmera mostra a arena toda** durante a luta. Nomes, barras de vida, caixas de golpe,
  dados e números continuam no tamanho normal para ficarem legíveis. No duelo final a câmera aproxima nos finalistas.

## 13. Sprites e arte

- Estilo de RPGs táticos de fantasia da era GBA/DS/SNES tardio; **tudo desenhado do zero**, nada copiado.
- Heróis ~**48×64 px**, chibi de 2,5 cabeças; paleta própria com **hue shifting** (sombras frias, luzes quentes),
  3–4 tons por material, luz do alto à esquerda, **rim light**, contorno **sel-out**; materiais diferenciados (tecido,
  couro, malha, metal, madeira, cabelo em mechas, pele, escamas, chifres); rosto com íris, brilho e expressão.
- **7 expressões:** neutra, concentrada, grito, dor, PV baixo, derrota, vitória.
- **Animações:** idle 4 quadros, caminhada 6 (4 direções), ataque 4, magia 6–8, dano 2, derrota 4, vitória 4.
- Abaixo de 30% dos PV o sprite troca para a versão com roupa rasgada.
- Enquanto esperam, os lutadores circulam pela arena (nunca ficam parados).
- Sombra elíptica embaixo de cada um.

## 14. Interface

- **HUD** no topo: "ARENA D20 #N", "RODADA X · VIVOS N" e grade 4×4 com mini retrato 16×16 (expressão muda com os
  PV), nome, NV, cor da classe e barra de PV. Eliminado em cinza com X e nome riscado. Campeão com coroa e NV em dourado.
- Sobre cada lutador: barra de PV (verde > amarelo > vermelho), etiquetas de condição (FÚR, MRC, LNT, CNC, ESC, INV…),
  seta ▼ em quem está agindo.
- **Caixa do golpe** com o nome na cor do tipo de dano + efeito visual próprio de cada golpe; **d20 girando** ao lado
  de quem ataca (verde acertou, cinza errou, dourado 20 natural, vermelho 1 natural); números de dano subindo.
- **Cores por tipo de dano:** fogo laranja, frio azul-claro, elétrico amarelo, trovejante azul, radiante dourado,
  necrótico roxo, energia magenta, psíquico rosa, veneno verde, ácido verde-limão, físico branco, cura verde.
- **Cut-in estilo anime** (congela 0,6 s, faixa diagonal com o rosto 96×64 gritando, linhas de velocidade, nome do
  golpe e rolagem): em crítico, abate, Fúria, Arma de Sopro, Surto de Ação, Destruição Divina e magias em 2+ alvos.
  Máximo 1 a cada 4,5 s (prioridade crítico > abate > recurso).
- Banners: "[NOME] CAIU!", "SUBIU DE NÍVEL!", "PEGOU O ITEM!", "CHEFE DERROTADO!", "CUIDADO: [CHEFE]!".

## 15. Roteiro (90 s)

1. **0–5 s · Intro:** os 16 caem em círculo com poeira, nome/classe/NV embaixo; "ESCOLHA SEU CAMPEÃO!"; 3, 2, 1, LUTEM!
   (com chefe: ele chega primeiro, com rugido e "CUIDADO: [CHEFE]!").
2. **5–56 s · Batalha:** rodadas em grupos de 4; "[NOME] CAIU!" a cada eliminação, espalhadas pelo vídeo inteiro.
3. **56–64 s · Duelo final:** tela VS com os dois rostos e as fichas resumidas, zoom, música mais intensa.
4. **64–68 s · Vencedor:** "VITÓRIA DE [NOME]!", retrato sorrindo, pose, confete, coluna de luz, "SUBIU DE NÍVEL!".
5. **Baú** (4 s, só nos episódios múltiplos de 5).
6. **68–86 s · Pergaminho** (fica mais rápido quando tem baú).
7. **86–90 s · CTA:** "Comente NOME + DESCRIÇÃO do seu personagem · os dados decidem o resto!" + @SuaArenaD20.

- O ritmo se ajusta esticando ou comprimindo o tempo dos turnos, **nunca mudando as regras**.

## 16. Pergaminho do campeão

- Desenrola de cima para baixo (papel envelhecido, bordas queimadas, fitas vermelhas, selo de cera com d20).
- Topo: retrato de vitória, nome, espécie e classe, "NÍVEL a → b" com o número novo piscando em dourado.
- Atributos com valor e modificador; o que aumentou ganha "+N" em verde.
- Combate: PV com o dado girando e a rolagem, CA, ataque, CD, espaços de magia (novos em verde).
- Poderes: os novos por último, em verde, com "NOVO!" e descrição curta (na versão 3, os 8 poderes antigos mais recentes,
  sem os superados).
- **Itens:** cada item que o campeão está usando aparece com ícone, nome e a descrição do poder (o do baú com "NOVO!").
- História de 3–4 linhas em português, terceira pessoa, sem marcar gênero, com o que aconteceu na luta.
- Rodapé: "DEFENDE O TÍTULO NA PRÓXIMA BATALHA!" e "CRIADO POR @autor" se veio de comentário.

## 17. Áudio

- **Tudo sintetizado** (sem direito autoral de terceiros), estilo 8/16 bits.
- Trilha chiptune de batalha em **lá menor, 145 BPM**, em loop; versão intensa no duelo; calma no pergaminho.
- Ambiente por arena: calabouço e caverna (tochas, gotas, eco); floresta (vento nas folhas, grilos, coruja, fogueira).
- Um efeito por evento: dado, golpe por tipo, cut-in, hit, crítico, erro, PV baixo, derrota, banners, contagem,
  fanfarra, papel desenrolando, "plim" a cada "+" verde, baú e tesouro, **rugido do chefe**.
- Efeitos ~4–6 dB acima da trilha, com limite de efeitos simultâneos; master −14 LUFS / −1 dBTP.

## 18. Seed e ritmo

- Simulação **determinística**: a mesma seed gera sempre a mesma luta e as mesmas rolagens.
- A seed é escolhida **só pelo ritmo, nunca pelo vencedor**: a primeira de `arena-d20-epNN`, `-2`, `-3`… com
  **pelo menos 35 turnos**, duelo final de 3 a 8 turnos e sem compressão de turnos.
- Uma luta curta pode acontecer por sorte dos dados — por isso existe o mínimo de 35 turnos.
- **Regra nova nunca muda episódio antigo:** tudo o que é novo fica atrás da `versao` ou de um campo novo do JSON, e
  os episódios antigos continuam gerando a mesma luta.

## 18b. Ordens da série

- A série tem **ordens**: tudo do episódio 1 ao 12 é a **ordem A**. A **ordem B** recomeça do episódio 1, com 16
  lutadores novos no nível 1, sem campeão e com as regras atuais (versão 3, foco "forte", centro livre).
- No vídeo aparece "ARENA D20 B #1"; os arquivos usam o código `B01` (`episodios/epB01.json`, `arena-d20/epB01/`).
- Os nomes continuam **sem repetir entre as ordens** (a ordem A usa a sequência a partir do episódio 1, a B a partir do
  61, a C do 121…). Baú (múltiplos de 5) e chefes (múltiplos de 10) contam pelo número do episódio dentro da ordem.

## 18c. Ordens que começam fortes (ordem C)

- `nivelInicial: 5`: os 16 sorteados sobem do nível 1 até o 5 antes da luta, cada nível com o dado de vida rolado (como a
  subida do campeão). `itemInicial: true`: cada um começa com 1 item sorteado (d30), só da sua classe.
- O chefe se fortalece junto com o nível inicial dos heróis: PV × (1 + 0,125 por nível acima do 1), +1 de acerto por
  nível, dados de dano × (1 + 0,25 por nível), CD do especial +1 a cada 2 níveis; e os heróis o tratam como um herói de PV
  médio na escolha de alvo (sem isso, os 16 batiam só nele e ele nunca vencia). Calibrado: Dragão Vermelho contra 16
  heróis de nível 5 com 1 item vence ~45%.
- O chefe pode ser escolhido em qualquer episódio com o campo `chefe` (ex.: `"DRAGAO"` no C #1).

## 19. Versões das regras

| Versão | O que liga | Episódios |
| --- | --- | --- |
| 1 | regras originais | 1–3 |
| 2 | nome + sobrenome únicos, foco no campeão, +1 nível ao derrubar o campeão | 4–8 |
| 3 | tudo da 2 + baú, itens mágicos, itens por classe, chefes, caverna | a partir do 9 |

## 20. Entregas de cada episódio

- MP4 masterizado (1080×1920, 30 fps, 90 s, com áudio).
- `FICHA.md`: seed, fichas dos lutadores com todas as rolagens, iniciativa, log do combate rolagem por rolagem com o
  tempo do vídeo, ordem de queda, ficha nova do campeão, itens, e o crédito do SRD.
- `campeao.json` (para o próximo episódio; `null` se o chefe vencer) e `lutadores.json`.
- Sprite sheets PNG por lutador (animações, expressões, versão rasgada) + retratos 16×16 e 96×64.
- Crédito obrigatório no fim da ficha:

  > This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
  > available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
  > International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

## 21. Como fazer um episódio novo

1. Criar `remotion/src/arena/episodios/epNN.json` com `numero`, `seed: ""`, `perfil: "@SuaArenaD20"`,
   `lutadores` (comentários ou vazio), `campeaoAnterior` (o `campeao.json` do anterior), `textos`, `versao: 3`,
   `focoCampeao: "forte"`, `centro: "livre"`, `arena` (`"calabouco"` ou `"floresta"`; com chefe vira caverna sozinho)
   e `audio: "arena/epNN.wav"`.
2. Rodar `scripts/arena.sh remotion/src/arena/episodios/epNN.json`.

---

## Histórico do que foi pedido

| # | Pedido | Virou regra |
| --- | --- | --- |
| 1 | Prompt original "ARENA D20" | formato, lutadores, SRD 5.2, níveis, arte, HUD, roteiro, áudio, entregas |
| 2 | "Faça a próxima batalha" | episódio 2 com o campeão do 1 |
| 3 | Turnos de 4 em 4 personagens | 4 lutadores agindo ao mesmo tempo na tela |
| 4 | Nova batalha com @SuaArenaD20 | perfil do CTA (episódio 3) |
| 5 | Nomes nunca repetidos, com sobrenome; leve foco no campeão; quem mata o campeão ganha 1 nível (+2 se vencer) | versão 2 (episódio 4) |
| 6 | Foco mais forte no campeão | episódio 5 |
| 7 | Foco de acordo com o nível; arena floresta no mesmo estilo | `focoCampeao: "auto"` e floresta (episódio 6) |
| 8 | Tirar o d20 e as escadas do centro das arenas | `centro: "livre"` |
| 9 | Episódio 7 na floresta | — |
| 10 | Mínimo de 35 turnos | escolha da seed (episódio 8) |
| 11 | Baú nos episódios múltiplos de 5 com item aleatório com poder; itens passam para quem derrota o portador | versão 3 |
| 12 | Pelo menos 3 itens de cada tipo com poderes diferentes | 27 itens (30 com os cajados) |
| 13 | Boss a cada 10 episódios (Minotauro, Beholder, dragão, hidra, grifo, gigantes), caverna 4× escura com tochas, 3 cajados, itens só da classe | chefes, caverna, cajados, itens por classe (Beholder → Quimera) |
| 14 | Caverna só para luta com boss; câmera pega a arena toda; boss 3× maior; arquivo .md para recriar a arena | regras atuais + `SuaArenaD20.md` |
| 15 | Arquivo .md com todas as regras da conversa | este arquivo |
| 16 | Episódios 9 e 10 | ep 9 no calabouço; ep 10 com o Minotauro na caverna + baú; poderes estendidos até o nível 10 (o Korrin chegou ao 6) |
| 17 | Minotauro parecido com 2 modelos de pixel art | Minotauro redesenhado do zero no mesmo estilo (curvado, musculoso, chifres longos, machado de duas lâminas, cinto com rebites, tufos de pelo); quedas novas dos chefes; folhas de sprites em `arena-d20/chefes/` |
| 18 | Episódio 11 | ep 11 na floresta: Korrin vence de novo (nível 7, 6 vitórias); o pergaminho (versão 3) passa a mostrar os 8 poderes antigos mais recentes, sem os superados |
| 19 | Aumentar o foco no campeão; ep 12; descrição dos itens no pergaminho | `focoCampeao: "forte"` (pelos PV do campeão); itens com o poder escrito no pergaminho; ep 12 no calabouço: Korrin cai na 1ª rodada e o Orrin Ventolargo vence |
| 20 | O ep 12 é da ordem A; criar o ep 1 da ordem B | campo `serie`; ARENA D20 B #1 no calabouço, campeão Grom Rubrafonte |
| 21 | Render mais rápido; eps A 13, 14 e 15 | `scripts/arena.sh` com todos os núcleos e x264 veryfast (~3,7 min por episódio); A13 Pike Valeclaro derruba o Orrin (+2 níveis), A14 Pike defende (nv 4), A15 Pike cai para Nessa Solposto e Rhea Ouroverde vence e acha as Luvas da Precisão no baú |
| 22 | Ordem B, eps 2 a 5 | B2 Talia Águaclara derruba o Grom (+2 níveis); B3 Oona Galhoverde derruba a Talia e Yara Ferrocinza vence; B4 Zara Pontavento derruba a Yara (+2); B5 Zara defende (nv 4) e acha as Manoplas Certeiras |
| 23 | Ordem C ep 1: todos nível 5 com 1 item, chefe Dragão Vermelho | `nivelInicial`, `itemInicial`, chefe fortalecido pelo nível dos heróis; C #1: Liora Corvonegro derruba o Dragão e Mirela Ossovelho vence (nv 6, 6 itens) |
| 24 | Chefes mais bonitos, de graça | Minotauro gerado no Canva (IA) e pixelizado por `scripts/pixelizar.py` (fundo verde → 163×144, 20 cores, contorno sel-out); `scripts/chefes-sprites.py` gera `chefes-sprites.ts`; animação por deformação; os outros chefes continuam no desenho em código até ganharem arte |
