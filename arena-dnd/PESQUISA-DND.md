# Pesquisa: regras de D&D usadas na Arena D20

> **Atualização:** os episódios agora começam todos no **nível 1** e só o campeão sobe de nível.
> A progressão nível a nível (poderes, magias, espaços, proficiência) está em `src/motor/niveis.ts`
> e na tabela "Poderes por nível" do `PROMPT-ARENA-D20.md`. As tabelas abaixo descrevem o nível 5.

Base: **System Reference Document 5.2 (SRD 5.2)** — o "núcleo aberto" das regras de 2024 da 5ª edição,
publicado pela Wizards of the Coast sob **Creative Commons CC-BY-4.0**. Isso permite usar regras, classes,
espécies e magias do SRD em conteúdo próprio (inclusive monetizado), **desde que se dê o crédito**
(texto abaixo, já incluído em toda ficha gerada). Tudo que **não** está no SRD (subclasses fora dele,
monstros e personagens famosos dos livros, cenários como Forgotten Realms, a logo e a marca "Dungeons & Dragons")
continua protegido — por isso o vídeo usa só material do SRD e o nome **"Arena D20"**.

> Crédito obrigatório (em inglês, como a Wizards pede):
> *This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
> available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
> International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.*

**Cuidado com a marca:** "Dungeons & Dragons", "D&D" e a logo do "&" são marcas registradas. Use as hashtags
(#dnd, #dungeonsanddragons) e diga "compatível com D&D 5e" / "regras da 5ª edição", mas não ponha a logo
nem "D&D" como nome da conta ou da série. A licença do SRD não cobre a marca.

---

## 1. Atributos (a parte que vem dos dados)

| O quê | Regra do SRD | Na Arena |
|---|---|---|
| Gerar atributos | 3 métodos: conjunto padrão (15,14,13,12,10,8), compra de pontos (27), **rolagem: 4d6 descartando o menor, 6 vezes** | **4d6 descartando o menor**, todas as rolagens aparecem na ficha |
| Distribuir | o jogador escolhe onde pôr cada valor | maior valor no atributo principal da classe, depois na ordem de prioridade (como um jogador faria) |
| Ajuste | regras de 2024: o **antecedente** dá +2 / +1 (ou +1/+1/+1) | +2 no principal e +1 no segundo, máximo 20 |
| Regra da mesa | comum em mesas: rerrolar fichas muito fracas | se a soma dos modificadores for ≤ 0, o conjunto inteiro é rolado de novo (fica registrado) |
| Modificador | (valor − 10) ÷ 2, arredondado para baixo | igual |

Distribuição do 4d6-descarta-menor: média ≈ 12,24; 18 sai em ~1,6% das rolagens; 3 em ~0,08%.

## 2. Nível, vida e defesa

- **Nível 5 para todos** — é o "ponto doce" da 5ª edição: Ataque Extra para marciais, magias de 3º círculo
  (Bola de Fogo, Relâmpago, Guardiões Espirituais), truques com 2 dados. Bônus de proficiência **+3**.
- **Pontos de vida:** máximo do dado de vida no 1º nível + **dado rolado** nos níveis 2–5 + modificador de CON por nível.
  Dados de vida: d12 Bárbaro · d10 Guerreiro, Paladino, Patrulheiro · d8 Bardo, Bruxo, Clérigo, Druida, Ladino, Monge · d6 Feiticeiro, Mago.
- **Classe de Armadura (CA):** pela armadura da classe — Placas 18, Cota de Malha 16, Brunea 14 + DES (máx. 2),
  Couro 11 + DES, Couro Batido 12 + DES, Defesa sem Armadura (Bárbaro 10 + DES + CON; Monge 10 + DES + SAB),
  Armadura Arcana 13 + DES; escudo +2.

## 3. Como o combate funciona (e como a Arena simula)

1. **Iniciativa:** d20 + DES, do maior para o menor. Empate: maior DES.
2. **Turno:** deslocamento (30 pés, alguns têm 35–40) + **uma ação** + às vezes **uma ação bônus** + **uma reação** por rodada.
3. **Ataque:** d20 + modificador + proficiência **≥ CA do alvo** → acerta.
   - **20 natural = crítico:** rola os dados de dano em dobro. **1 natural = erro automático.**
   - **Vantagem / desvantagem:** rola 2d20 e fica com o maior / menor.
   - Ataque à distância com inimigo a 1,5 m (5 pés): desvantagem.
4. **Magia de salvaguarda:** o alvo rola d20 + modificador (+ proficiência se for treinado) contra a **CD = 8 + proficiência + mod. do atributo de conjuração**. Muitas causam metade do dano em quem passa.
5. **Concentração:** algumas magias duram enquanto o conjurador se concentra; ao sofrer dano, ele rola CON contra CD 10 ou metade do dano (o que for maior) — se falhar, a magia acaba.
6. **Resistência:** metade do dano daquele tipo (ex.: Fúria do Bárbaro contra cortante/perfurante/concussão; Tiefling contra fogo).
7. **0 PV:** no jogo de mesa o personagem faz testes contra a morte; **na Arena ele está fora da luta** (é um "todos contra todos").

O vídeo mostra cada rolagem: o **d20 gira** ao lado de quem ataca e para no resultado (verde = acertou,
cinza = errou, dourado = 20 natural, vermelho = 1 natural); o **número de dano** sai do alvo na cor do tipo de dano;
o **rótulo** com o nome do golpe aparece como no vídeo modelo. A ficha (`batalhas/*-ficha.md`) traz o log completo.

## 4. Classes (nível 5) — o que cada uma faz na Arena

| Classe | Arma / foco | Recursos usados | Estilo na arena |
|---|---|---|---|
| Guerreiro | Montante (2d6) ou espada/machado + escudo | Ataque Extra, Surto de Ação, Retomar o Fôlego (1d10+5), Arma Grande (1–2 viram 3) | linha de frente |
| Bárbaro | Machado Grande (1d12) / Montante | Fúria (+2 dano, resistência), Ataque Descuidado (vantagem, mas inimigos também têm), Ataque Extra, 40 pés | linha de frente |
| Paladino | Espada Longa / Martelo + escudo, Placas | Ataque Extra, Destruição Divina (2d8 +1d8/círculo radiante), Cura pelas Mãos (25 PV) | linha de frente |
| Patrulheiro | Arco Longo (1d8) | Ataque Extra, Marca do Caçador (+1d6), Arquearia (+2) | atirador |
| Ladino | Rapieira / Espada Curta / Arco Curto | Ataque Furtivo (3d6 com vantagem), Mira Firme, Ação Ardilosa, Esquiva Sobrenatural | oportunista |
| Monge | Golpe Desarmado (d8) | Rajada de Golpes, Golpe Atordoante (CON), Defletir Ataques, 5 pontos de foco | corpo a corpo rápido |
| Mago | Bordão | Raio de Fogo, Mísseis Mágicos, Raio Ardente, Bola de Fogo, Relâmpago, Onda Trovejante, Escudo (+5 CA) | artilharia |
| Feiticeiro | foco arcano | Raio de Gelo, Raio de Fogo, Orbe Cromático, Raio Ardente, Despedaçar, Bola de Fogo, Escudo | artilharia |
| Bruxo | foco | Rajada Mística (2 feixes 1d10 + CAR), Bruxaria (+1d6), Toque Vampírico, Despedaçar; 2 espaços de 3º círculo | artilharia |
| Clérigo | Maça + escudo | Chama Sagrada, Raio Guia, Arma Espiritual, Guardiões Espirituais, Palavra Curativa, Curar Ferimentos | suporte / meio da briga |
| Druida | Cimitarra + escudo | Produzir Chama, Chicote de Espinhos, Onda Trovejante, Raio Lunar, Convocar Relâmpagos, Palavra Curativa | controle |
| Bardo | Rapieira / alaúde | Zombaria Viciosa, Sussurros Dissonantes, Despedaçar, Onda Trovejante, Palavra Curativa | suporte |

Espaços de magia no nível 5: conjuradores completos 4/3/2 (1º/2º/3º círculo); Paladino e Patrulheiro 4/2; Bruxo 2 de 3º círculo.
Truques escalam no 5º nível (2 dados).

## 5. Espécies (SRD 5.2)

| Espécie | Traço usado no combate |
|---|---|
| Humano | Inspiração Heroica (rerrola um ataque errado), talento Vigoroso (+2 PV/nível) |
| Elfo | Linhagem da Floresta: 35 pés |
| Anão | Robustez Anã (+1 PV/nível), resistência a veneno |
| Halfling | Sortudo: rerrola o 1 natural no d20 |
| Gnomo | vantagem em salvaguardas de INT/SAB/CAR |
| Orc | Resistência Implacável (fica com 1 PV uma vez), Surto de Adrenalina (corre + PV temporários) |
| Tiefling | resistência a fogo, Repreensão Infernal (2d10 fogo de volta em quem o feriu, 1×) |
| Draconato | Arma de Sopro (cone 2d10 do tipo do dragão, CD 8+CON+prof., 3×), resistência ao mesmo tipo |
| Golias | Resistência da Pedra (reduz 1d12 + CON, 3×), 35 pés |

## 6. Simplificações (para caber num vídeo de 40–70 s)

- Sem ataques de oportunidade, sem cobertura/terreno, sem testes contra a morte.
- Escudo do mago dura até o próximo turno dele (aproximado pela ordem de iniciativa).
- Ataque Furtivo só com vantagem (num "todos contra todos" não existe aliado ao lado do alvo).
- A IA escolhe alvos por distância, vida restante e um pouco de sorte; conjuradores mantêm distância e
  escolhem a magia pelo dano esperado (gastam espaços altos em áreas com vários inimigos).
- Equilíbrio medido em 300 batalhas aleatórias: toda classe vence entre ~4% e ~14% das vezes
  (Patrulheiro, Druida e Paladino no topo; Bárbaro e Ladino embaixo — o Ataque Descuidado cobra caro quando todos são inimigos).

## 7. Ideias de série (engajamento)

- **Comentário vira lutador:** "Nome + descrição" no comentário → o personagem entra na próxima batalha
  com atributos rolados (a ficha prova que foi sorte, não escolha).
- **Campeão defende o título:** o vencedor volta na batalha seguinte com o mesmo nome e descrição (novas rolagens).
- **Temáticas:** só magos, só espécies pequenas, "taverna" (bardos), torneio mata-mata 1×1 entre vencedores.
- **Pausa para apostar:** a contagem 3-2-1 da abertura é o momento de pedir "comente em quem você aposta".

## Fontes

- [System Reference Document 5.2 — D&D Beyond](https://www.dndbeyond.com/srd)
- [SRD 5.2 lançado sob Creative Commons — Tribality](https://www.tribality.com/2025/04/23/dd-system-reference-document-v5-2/)
- [Notícia: SRD 5.2 sob CC-BY-4.0 — attronarch](https://tiny.write.as/attronarch/news-system-reference-document-v5-2-released-under-creative-commons)
- [Licença CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode)
