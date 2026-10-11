# SuaArenaD20 — tudo para recriar a ARENA D20

> Documento gerado por `remotion/scripts/documento.ts` a partir do código (as tabelas são os valores em uso).
> Rode `node scripts/documento.ts` (dentro de `remotion/`) depois de qualquer mudança para atualizar.

Battle royale automático de RPG de mesa em pixel art, para Reels/TikTok/Shorts. 16 heróis aleatórios (ou vindos dos
comentários) lutam todos contra todos com regras do **SRD 5.2**; cada rolagem sai de uma **seed**, então o mesmo episódio
gera sempre a mesma luta, conferível rolagem por rolagem. O vencedor nunca é escolhido: ele sobe de nível e volta no
próximo episódio como campeão. Perfil do CTA: **@SuaArenaD20**. Não usar o nome nem o logo "Dungeons & Dragons"/"D&D".

## 1. Formato do vídeo

| Item | Valor |
| --- | --- |
| Saída | 1080×1920, 30 fps, **90 s exatos** (2700 quadros), H.264 + AAC, master −14 LUFS / −1 dBTP |
| Resolução interna | 360×640, ampliada 3× sem suavizar (`imageSmoothingEnabled = false`, `image-rendering: pixelated`) |
| Camadas | **mundo** (cenário + lutadores + efeitos, com câmera: foco, zoom, tremor) e **interface** (HUD, banners, textos) por cima, sem câmera |
| Arena do chefe | mundo de 720×1280 mostrado inteiro (zoom 0,5 → cada pixel do mundo vira 1,5 px na saída); os rótulos dos lutadores passam para a interface, no tamanho normal |
| Motor | Remotion (React) desenhando em `<canvas>`; tudo procedural (sem imagens externas, sem fontes externas) |
| Render | `npx remotion render ArenaD20 out/arena-epNN.mp4 --props=EP.json --image-format=png --crf=16` |

## 2. Roteiro do episódio (tempos fixos)

| Quadro | Tempo | Cena |
| --- | --- | --- |
| 0–150 | 0–5 s | intro: os lutadores caem do alto em círculo (1 a cada 4 quadros, poeira no pouso), nome + classe + NV embaixo; no episódio com chefe ele chega primeiro (quadro 4) com rugido e o banner **CUIDADO: [CHEFE]!** (16–66); **ESCOLHA SEU CAMPEÃO!** (72); contagem 3 (100), 2 (115), 1 (130), **LUTEM!** (145) |
| 150–1680 | 5 s–56 s | batalha em rodadas (iniciativa d20 + DES), **4 lutadores agindo ao mesmo tempo** (início escalonado de 6 quadros; as regras continuam em ordem de iniciativa); "[NOME] CAIU!" a cada queda; cut-ins congelam 0,6 s, no máximo 1 a cada 4,5 s (prioridade: crítico > abate > recurso em 2+ alvos) |
| 1680–1920 | 56 s–64 s | restam 2: tela **VS** (1,6 s) com retratos, classe/NV, espécie, PV, CA, abates e itens; depois zoom 1,2× nos finalistas (na caverna: de 0,5× até 1×), trilha intensa, tremor nos especiais |
| 1920–2040 | 64 s–68 s | **VITÓRIA DE [NOME]!**, retrato sorrindo 2×, pose de vitória, confete, coluna de luz dourada, **SUBIU DE NÍVEL!** + NÍVEL a → b (se o chefe vence: **O [CHEFE] VENCEU!** + NENHUM HERÓI SOBREVIVEU) |
| — | 4 s | **baú do campeão** (só versão 3, episódios múltiplos de 5, se um herói vence): entra depois da vitória e empurra o pergaminho; o campeão anda até o baú, abre, o item sobe girando com brilho e nome + poder |
| 2040–2580 | 68 s–86 s | pergaminho que desenrola: retrato, nome, espécie · classe, NÍVEL a → **b** piscando, vitórias; atributos (2×3, ganhos em verde), PV com d20 girando e a rolagem, CA, ataque, CD, espaços de magia; poderes antigos em 2 colunas e os novos com **NOVO!** em verde; itens com ícone, nome e descrição do poder; história letra a letra; "DEFENDE O TÍTULO NA PRÓXIMA BATALHA!"; selo de cera com d20 |
| 2580–2700 | 86 s–90 s | CTA: fundo escuro, campeão 2× em pose de vitória com coroa, "COMENTE NOME + DESCRIÇÃO DO SEU PERSONAGEM · OS DADOS DECIDEM O RESTO!" (depois do · em dourado), d20 girando, @perfil |

O ritmo da batalha é ajustado só esticando/comprimindo o tempo de cada turno (e sobrepondo o fim de um golpe com o início
do próximo); nenhuma regra muda por causa do tempo.

## 3. Seed e determinismo

- RNG `sfc32` alimentado pelo hash `cyrb128` da seed (texto). Toda rolagem passa por `rng.roll(rótulo, n, d, bônus)` e fica no log.
- Ruído visual (grão, folhas, poeira, gotas) usa `hash3(x, y, z)` — nunca `Math.random`.
- Seed vazia → `scripts/escolher-seed.ts` testa `arena-d20-epNN`, `-2`, `-3`… e grava a primeira com **≥ 35 turnos**, duelo final de **3 a 8 turnos** e **sem compressão**. Escolha só pelo ritmo, **nunca pelo vencedor**.
- Regra nova nunca muda episódio antigo: tudo novo fica atrás de `versao` ou de um campo novo do JSON. Teste: regenerar a FICHA dos episódios antigos e conferir `git diff`.

## 4. Episódio = um JSON (`remotion/src/arena/episodios/epNN.json`)

| Campo | O que é |
| --- | --- |
| `numero` | número do episódio (ARENA D20 #N) |
| `nivelInicial` / `itemInicial` | todos começam no nível N (subindo com rolagens) e com 1 item da classe; o chefe se fortalece junto (PV × 1 + 0,125/nível, +1 acerto/nível, dano × 1 + 0,25/nível, CD +1 a cada 2 níveis; heróis o tratam como um herói de PV médio) — Dragão vs 16 nv 5 com item vence ~45% |
| `veteranos` / `nivelMinimo` | luta só com fichas salvas (LENDAS); quem estiver abaixo de `nivelMinimo` sobe até ele com rolagens (LENDAS: 5) |
| `serie` | ordem: sem o campo = A; `"B"`, `"C"`… recomeçam do 1 sem campeão (ARENA D20 B #1); arquivos com código `B01`; nomes únicos entre as ordens (A = sequência do ep. 1, B = do 61, C = do 121) |
| `seed` | texto da seed; `""` = escolhida automaticamente pelo ritmo |
| `perfil` | @ do CTA (`@SuaArenaD20`) |
| `lutadores` | até 16 `{ nome, descricao, autor }` dos comentários; vazio = aleatórios. Classe, espécie, cores, cabelo e arma saem da descrição |
| `campeaoAnterior` | `null` ou o `campeao.json` do episódio anterior (nível, atributos, PV, visual, vitórias, itens, coroa) |
| `textos` | `escolha`, `lutem`, `subiu`, `defende`, `cta` |
| `versao` | 1 = regras dos eps. 1–3; 2 = nome + sobrenome únicos, foco no campeão, +1 nível ao derrubar o campeão; 3 = baú, itens, chefes; 4 = + magias de círculo alto, usadas antes das de nível baixo; 5 = + invisibilidade de verdade (ninguém mira em quem sumiu); **6 = + Sir Aldric com todos os poderes do Paladino 20** (usar sempre) |
| `focoCampeao` | `"forte"` (recomendado, ep. 12+) = 0,31 × PV máximo do campeão − 4,35 (campeão vence ~35–40%); `"auto"` (eps. 6–11) = 2,5 × (nível − 2); ou número fixo |
| `arena` | `"calabouco"` ou `"floresta"`. A `"caverna"` é **só para luta com chefe** e é escolhida sozinha quando há chefe |
| `centro` | `"livre"` (recomendado): sem tablado nem altar d20 no meio |
| `chefe` / `focoChefe` | força um chefe; sem o campo, versão 3 tem chefe nos episódios 10, 20, 30… · `focoChefe` padrão 1,25 |
| `audio` | `arena/epNN.wav` |

## 5. Regras (SRD 5.2, simplificadas para luta automática)

- Escala: **1 pé = 4 px** (5 pés = 20 px). Corpo a corpo alcança 26 px; ponto de contato a 22 px; ninguém fica a menos de 18 px de outro.
- Criação: atributos 4d6 descartando o menor (rerrola o conjunto inteiro se a soma dos modificadores for ≤ 0), distribuídos pela prioridade da classe; antecedente +2/+1; PV = dado de vida máximo + CON; CA pela armadura/escudo/classe.
- Turno: deslocamento (com ataque de oportunidade ao sair do alcance, exceto com Desengajar/voo) + ação (ataque, truque, magia, recurso) + ação bônus quando a classe tem.
- Ataque: d20 + atributo + proficiência vs CA; 20 natural = crítico (dados de dano em dobro), 1 natural = falha. Vantagem/desvantagem rolam 2d20. Magias de área pedem salvaguarda (metade do dano no sucesso quando cabe). Concentração cai com dano (CON CD 10 ou metade do dano).
- IA: corpo a corpo vai no alvo com melhor nota (distância, PV baixo, ameaça, foco no campeão/chefe); quem luta à distância mantém distância e recua de quem está colado. Nada é coordenado.
- Morte: 0 PV = cai (sem testes de morte). Último de pé vence.
- Subida de nível do vencedor: +1 nível, PV = dado de vida rolado + CON (mínimo 1), poderes do nível novo, Aumento de Atributo no nível 4 (+2 no atributo principal). Na versão 2+, quem derruba o campeão sobe 1 nível na hora (vencendo, soma +2).
- Nomes (versão 2+): lutador sorteado nº `(episódio − 1) × 16 + posição` de uma sequência fixa de nomes × sobrenomes (permutações com saltos 29 e 23): nunca repete por 120 episódios e cada luta tem 16 primeiros nomes diferentes.

### Classes

| Classe | Dado de vida | Atributos (prioridade) | Salvaguardas | Conjura com | Estilo | Cor |
| --- | --- | --- | --- | --- | --- | --- |
| Guerreiro | d10 | FOR > CON > DES > SAB > CAR > INT | FOR, CON | — | corpo a corpo | `#b8402e` |
| Bárbaro | d12 | FOR > CON > DES > SAB > CAR > INT | FOR, CON | — | corpo a corpo | `#e0742a` |
| Paladino | d10 | FOR > CAR > CON > SAB > DES > INT | SAB, CAR | CAR | corpo a corpo | `#f0d060` |
| Patrulheiro | d10 | DES > SAB > CON > FOR > INT > CAR | FOR, DES | SAB | à distância | `#4f9a3a` |
| Ladino | d8 | DES > CON > INT > SAB > CAR > FOR | DES, INT | — | corpo a corpo | `#7c8494` |
| Monge | d8 | DES > SAB > CON > FOR > INT > CAR | FOR, DES | — | corpo a corpo | `#5fb6d8` |
| Mago | d6 | INT > CON > DES > SAB > CAR > FOR | INT, SAB | INT | à distância | `#3d5bd6` |
| Feiticeiro | d6 | CAR > CON > DES > SAB > INT > FOR | CON, CAR | CAR | à distância | `#d0324a` |
| Bruxo | d8 | CAR > CON > DES > SAB > INT > FOR | SAB, CAR | CAR | à distância | `#8a3cc4` |
| Clérigo | d8 | SAB > CON > FOR > DES > CAR > INT | SAB, CAR | SAB | à distância | `#e8e0c8` |
| Druida | d8 | SAB > CON > DES > INT > CAR > FOR | INT, SAB | SAB | à distância | `#2f7a4a` |
| Bardo | d8 | CAR > DES > CON > SAB > INT > FOR | DES, CAR | CAR | à distância | `#e46aa8` |

### Poderes por nível (1–5)

**Guerreiro** — espaços de magia por nível: — · — · — · — · —
- NV 1: **Estilo de Luta** (técnica de combate preferida); **Retomar o Fôlego** (cura 1d10 + nível)
- NV 2: **Surto de Ação** (uma ação extra por descanso)
- NV 3: **Crítico Aprimorado** (crítico com 19 ou 20)
- NV 4: **Aumento de Atributo** (+2 em FOR)
- NV 5: **Ataque Extra** (dois ataques por ação)
- NV 6: **Aumento de Atributo** (+2 no atributo principal)
- NV 7: **Estilo de Luta Extra** (aprende uma segunda técnica)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Indomável** (rerrola uma salvaguarda que falhou); **Mestre Tático** (empurra, atrasa ou derruba ao acertar)
- NV 10: **Guerreiro Heroico** (Inspiração Heroica a cada turno)

**Bárbaro** — espaços de magia por nível: — · — · — · — · —
- NV 1: **Fúria (2×)** (+2 de dano e resiste a golpes); **Defesa sem Armadura** (CA 10 + DES + CON)
- NV 2: **Ataque Descuidado** (vantagem ao atacar, mas fica exposto); **Sentido de Perigo** (vantagem em salvaguardas de DES)
- NV 3: **Frenesi** (ataque extra de bônus em fúria); **Fúria 3×** (uma fúria a mais por dia)
- NV 4: **Aumento de Atributo** (+2 em FOR)
- NV 5: **Ataque Extra** (dois ataques por ação); **Movimento Rápido** (+10 pés de deslocamento)
- NV 6: **Mente Implacável** (em fúria, não fica com medo nem encantado); **Fúria 4×** (uma fúria a mais por dia)
- NV 7: **Instinto Selvagem** (vantagem na iniciativa); **Salto Instintivo** (anda meio deslocamento ao entrar em fúria)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Golpe Brutal** (troca a vantagem por +1d10 e um efeito no golpe)
- NV 10: **Retaliação** (revida quem o fere de perto)

**Paladino** — espaços de magia por nível: 2 · 2 · 3 · 3 · 4/2
- NV 1: **Cura pelas Mãos** (reserva de cura (5 × nível)); **Magias de 1º círculo** (dois espaços de magia)
- NV 2: **Estilo de Luta** (técnica de combate preferida); **Destruição Divina** (+2d8 radiante ao acertar)
- NV 3: **Canalizar Divindade** (poder sagrado do juramento); **Juramento Sagrado** (escolhe o seu juramento)
- NV 4: **Aumento de Atributo** (+2 em FOR)
- NV 5: **Ataque Extra** (dois ataques por ação)
- NV 6: **Aura de Proteção** (+CAR nas salvaguardas de quem está perto)
- NV 7: **Aura do Juramento** (dom do juramento em volta de si)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Magias de 3º círculo** (espaços de 3º círculo); **Abjurar Inimigos** (deixa inimigos com medo)
- NV 10: **Aura de Coragem** (ninguém perto fica com medo)

**Patrulheiro** — espaços de magia por nível: 2 · 2 · 3 · 3 · 4/2
- NV 1: **Marca do Caçador** (+1d6 no alvo marcado); **Magias de 1º círculo** (dois espaços de magia)
- NV 2: **Arquearia** (+2 nos ataques à distância)
- NV 3: **Presa do Caçador** (dano extra em quem já está ferido)
- NV 4: **Aumento de Atributo** (+2 em DES)
- NV 5: **Ataque Extra** (dois ataques por ação)
- NV 6: **Andarilho** (+10 pés de deslocamento)
- NV 7: **Táticas Defensivas** (dom do caçador para se proteger)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Magias de 3º círculo** (espaços de 3º círculo); **Especialização** (dobra a proficiência em perícias)
- NV 10: **Incansável** (PV temporários e menos cansaço)

**Ladino** — espaços de magia por nível: — · — · — · — · —
- NV 1: **Ataque Furtivo 1d6** (dano extra com vantagem)
- NV 2: **Ação Ardilosa** (desengaja sem provocar ataques)
- NV 3: **Ataque Furtivo 2d6** (o furtivo dobra); **Mira Firme** (vantagem parado no lugar)
- NV 4: **Aumento de Atributo** (+2 em DES)
- NV 5: **Ataque Furtivo 3d6** (o furtivo cresce de novo); **Esquiva Sobrenatural** (corta pela metade um golpe)
- NV 6: **Especialização** (dobra a proficiência em perícias)
- NV 7: **Ataque Furtivo 4d6** (o furtivo cresce de novo); **Evasão** (nenhum dano em área ao passar na salvaguarda)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Ataque Furtivo 5d6** (o furtivo cresce de novo); **Poder do Arquétipo** (segundo dom do arquétipo)
- NV 10: **Aumento de Atributo** (+2 no atributo principal)

**Monge** — espaços de magia por nível: — · — · — · — · —
- NV 1: **Artes Marciais (d6)** (golpe extra desarmado); **Defesa sem Armadura** (CA 10 + DES + SAB)
- NV 2: **Rajada de Golpes** (dois golpes extras com foco); **Defesa Paciente** (esquiva como ação bônus); **Passo do Vento** (corre ou desengaja rápido)
- NV 3: **Defletir Ataques** (reduz o dano recebido)
- NV 4: **Aumento de Atributo** (+2 em DES)
- NV 5: **Golpe Atordoante** (atordoa com um golpe); **Ataque Extra** (dois ataques por ação); **Artes Marciais d8** (golpes mais fortes)
- NV 6: **Golpes Empoderados** (golpes desarmados de energia); **Poder da Tradição** (segundo dom da tradição)
- NV 7: **Evasão** (nenhum dano em área ao passar na salvaguarda)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Movimento Acrobático** (corre por paredes e água)
- NV 10: **Foco Exaltado** (rajada e defesa mais fortes); **Autorrestauração** (livra-se de condições ruins)

**Mago** — espaços de magia por nível: 2 · 3 · 4/2 · 4/3 · 4/3/2
- NV 1: **Raio de Fogo** (1d10 de fogo); **Mísseis Mágicos** (três dardos que nunca erram); **Onda Trovejante** (2d8 trovejante em volta); **Escudo** (+5 de CA como reação); **Armadura Arcana** (CA 13 + DES)
- NV 2: **Erudito** (especialista em um saber)
- NV 3: **Raio Ardente** (três raios de fogo (2º)); **Escola de Evocação** (magias de dano mais seguras)
- NV 4: **Aumento de Atributo** (+2 em INT)
- NV 5: **Bola de Fogo e Relâmpago** (8d6 em área (3º))
- NV 6: **Truque Potente** (truques causam metade do dano mesmo se falharem); **Magias de 3º círculo** (espaços de 3º círculo)
- NV 7: **Magias de 4º círculo** (espaços de 4º círculo)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Magias de 5º círculo** (espaços de 5º círculo)
- NV 10: **Evocação Fortalecida** (+INT no dano das evocações)

**Feiticeiro** — espaços de magia por nível: 2 · 3 · 4/2 · 4/3 · 4/3/2
- NV 1: **Raio de Fogo** (1d10 de fogo); **Raio de Gelo** (1d8 de frio e deixa lento); **Orbe Cromático** (3d8 do elemento escolhido); **Feitiçaria Inata** (vantagem nas magias por 1 min)
- NV 2: **Fonte de Magia** (pontos de feitiçaria); **Metamagia** (molda as próprias magias)
- NV 3: **Raio Ardente** (três raios de fogo (2º)); **Feitiçaria Dracônica** (escamas e resistência)
- NV 4: **Aumento de Atributo** (+2 em CAR)
- NV 5: **Bola de Fogo** (8d6 de fogo em área (3º))
- NV 6: **Afinidade Elemental** (+CAR no dano do elemento do dragão); **Magias de 3º círculo** (espaços de 3º círculo)
- NV 7: **Feitiçaria Encarnada** (Feitiçaria Inata mais forte); **Magias de 4º círculo** (espaços de 4º círculo)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Magias de 5º círculo** (espaços de 5º círculo)
- NV 10: **Metamagia Extra** (mais uma forma de moldar magias)

**Bruxo** — espaços de magia por nível: 1 · 2 · 0/2 · 0/2 · 0/0/2
- NV 1: **Rajada Mística** (1d10 de energia); **Bruxaria** (+1d6 necrótico no alvo)
- NV 2: **Rajada Agonizante** (soma CAR na Rajada Mística)
- NV 3: **Pacto** (dádiva do patrono); **Magias de 2º círculo** (espaços de pacto mais fortes)
- NV 4: **Aumento de Atributo** (+2 em CAR)
- NV 5: **Toque Vampírico** (rouba vida pelo toque (3º))
- NV 6: **Dom do Patrono** (segundo dom do patrono)
- NV 7: **Magias de 4º círculo** (espaços de pacto de 4º círculo)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Magias de 5º círculo** (espaços de pacto de 5º círculo); **Contatar Patrono** (conversa com o patrono)
- NV 10: **Proteção do Patrono** (terceiro dom do patrono)

**Clérigo** — espaços de magia por nível: 2 · 3 · 4/2 · 4/3 · 4/3/2
- NV 1: **Chama Sagrada** (1d8 radiante, salvaguarda de DES); **Raio Guia** (4d6 radiante e dá vantagem); **Palavra Curativa** (cura à distância); **Curar Ferimentos** (cura pelo toque)
- NV 2: **Centelha Divina** (1d8 + SAB de luz ou cura)
- NV 3: **Arma Espiritual** (uma arma de luz luta junto (2º)); **Domínio Divino** (escolhe o seu domínio)
- NV 4: **Aumento de Atributo** (+2 em SAB)
- NV 5: **Guardiões Espirituais** (espíritos ferem quem chega perto (3º))
- NV 6: **Poder do Domínio** (segundo dom do domínio); **Centelha 2×** (Canalizar Divindade duas vezes)
- NV 7: **Golpes Abençoados** (+1d8 radiante nos truques ou armas); **Magias de 4º círculo** (espaços de 4º círculo)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Magias de 5º círculo** (espaços de 5º círculo)
- NV 10: **Intervenção Divina** (pede um milagre ao seu deus)

**Druida** — espaços de magia por nível: 2 · 3 · 4/2 · 4/3 · 4/3/2
- NV 1: **Produzir Chama** (1d8 de fogo à distância); **Chicote de Espinhos** (1d6 e puxa o alvo); **Onda Trovejante** (2d8 trovejante em volta); **Palavra Curativa** (cura à distância)
- NV 2: **Forma Selvagem** (assume a forma das feras)
- NV 3: **Raio Lunar** (coluna de luz prateada (2º)); **Círculo Druídico** (escolhe o seu círculo)
- NV 4: **Aumento de Atributo** (+2 em SAB)
- NV 5: **Convocar Relâmpagos** (raios caem do céu (3º))
- NV 6: **Poder do Círculo** (segundo dom do círculo); **Magias de 3º círculo** (espaços de 3º círculo)
- NV 7: **Fúria Elemental** (+1d8 elemental nos truques ou golpes); **Magias de 4º círculo** (espaços de 4º círculo)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Magias de 5º círculo** (espaços de 5º círculo)
- NV 10: **Dom do Círculo** (terceiro dom do círculo)

**Bardo** — espaços de magia por nível: 2 · 3 · 4/2 · 4/3 · 4/3/2
- NV 1: **Inspiração de Bardo (d6)** (um dado extra para quem inspira); **Zombaria Viciosa** (dano psíquico e desvantagem); **Sussurros Dissonantes** (3d6 psíquico, o alvo foge); **Palavra Curativa** (cura à distância); **Onda Trovejante** (2d8 trovejante em volta)
- NV 2: **Pau pra Toda Obra** (meia proficiência em tudo)
- NV 3: **Colégio do Bardo** (escolhe a sua tradição); **Despedaçar** (3d8 trovejante em área (2º))
- NV 4: **Aumento de Atributo** (+2 em CAR)
- NV 5: **Inspiração d8** (o dado de inspiração cresce)
- NV 6: **Poder do Colégio** (segundo dom do colégio); **Magias de 3º círculo** (espaços de 3º círculo)
- NV 7: **Magias de 4º círculo** (espaços de 4º círculo)
- NV 8: **Aumento de Atributo** (+2 no atributo principal)
- NV 9: **Especialização** (dobra a proficiência em perícias); **Magias de 5º círculo** (espaços de 5º círculo)
- NV 10: **Segredos Mágicos** (aprende magias de outras listas); **Inspiração d10** (o dado de inspiração cresce)

### Espécies

| Espécie | Deslocamento | Altura do sprite | Traços |
| --- | --- | --- | --- |
| Humano | 30 pés | 1× | **Inspiração Heroica** (rerrola um ataque) |
| Elfo | 35 pés | 1× | **Passo Élfico** (35 pés de deslocamento) |
| Anão | 30 pés | 0.86× | **Robustez Anã** (+1 PV por nível) |
| Halfling | 30 pés | 0.8× | **Sortudo** (rerrola o 1 natural) |
| Gnomo | 30 pés | 0.8× | **Astúcia Gnômica** (vantagem em salvaguardas mentais) |
| Orc | 30 pés | 1.04× | **Resistência Implacável** (fica com 1 PV uma vez); **Surto de Adrenalina** (dispara e ganha PV temporários) |
| Tiefling | 30 pés | 1× | **Legado Infernal** (resiste a fogo, Raio de Fogo) |
| Draconato | 30 pés | 1.04× | **Arma de Sopro** (1d10 em cone) |
| Golias | 35 pés | 1.1× | **Resistência da Pedra** (reduz o dano 1d12 + CON) |

Ancestralidades dracônicas: vermelho (fogo, `#b8322a`), azul (elétrico, `#2f5fc0`), branco (frio, `#d8e2ea`), verde (veneno, `#3f8f3a`), negro (ácido, `#3a3442`), dourado (fogo, `#d0a030`), prateado (frio, `#a8b4c0`), bronze (elétrico, `#a8703a`).

### Armas

| Arma | Dano | Atributo | Tipo |
| --- | --- | --- | --- |
| Espada Longa | 1d8 cortante | FOR | corpo a corpo |
| Montante | 2d6 cortante | FOR | corpo a corpo, duas mãos |
| Machado | 1d8 cortante | FOR | corpo a corpo |
| Machado Grande | 1d12 cortante | FOR | corpo a corpo, duas mãos |
| Martelo de Guerra | 1d8 concussão | FOR | corpo a corpo |
| Maça | 1d6 concussão | FOR | corpo a corpo |
| Rapieira | 1d8 perfurante | DES | corpo a corpo |
| Adagas | 1d4 perfurante | DES | corpo a corpo |
| Adaga | 1d4 perfurante | DES | corpo a corpo |
| Arco Longo | 1d8 perfurante | DES | à distância, duas mãos |
| Arco Curto | 1d6 perfurante | DES | à distância, duas mãos |
| Cajado | 1d6 concussão | FOR | corpo a corpo |
| Cimitarra | 1d6 cortante | DES | corpo a corpo |
| Artes Marciais | 1d6 concussão | DES | corpo a corpo |

Cores dos tipos de dano (números e efeitos): fogo `#e8701e` · frio `#6cc7f0` · elétrico `#f2d23a` · trovejante `#3a6fe0` · radiante `#e2b13c` · necrótico `#7a3fb0` · energia `#d23ab4` · psíquico `#ec6aa8` · veneno `#4fa83c` · ácido `#a6d62a` · cortante `#d8d8d8` · perfurante `#d8d8d8` · concussão `#d8d8d8` · cura `#3fbf5a`.

## 6. Baú do campeão e itens mágicos (versão 3)

- Episódios **5, 10, 15…**: depois da vitória o campeão abre um baú (cena de 4 s) e acha um item: d30, rerrola se for de um tipo que ele já tem ou se não for da classe dele. 1 item por tipo.
- Os itens ficam no `campeao.json` e valem nas lutas seguintes. **Quem derruba o portador pega os itens** (só tipos que ainda não tem e que são da sua classe) — "PEGOU O ITEM!".
- **Itens por classe:** quem luta à distância (classe à distância ou arma de disparo) não pega espada, machado nem escudo; quem luta corpo a corpo não pega cajado nem arco.
- Catálogo com ícones 16×16: composição `ArenaItens` → `arena-d20/itens.png`.

| Tipo | Item | Poder | Distância | Corpo a corpo | Cor |
| --- | --- | --- | --- | --- | --- |
| espada | Lâmina Rubra | o primeiro acerto de cada turno causa +1d6 de dano | não | sim | `#e04a4a` |
| espada | Lâmina Vampira | cada acerto recupera 1d4 PV | não | sim | `#8a2a5a` |
| espada | Lâmina do Inverno | cada acerto deixa o alvo lento (−10 pés) | não | sim | `#6ad0f0` |
| armadura | Couraça do Bastião | +2 na CA | sim | sim | `#9aa8c0` |
| armadura | Cota de Espinhos | quem acerta um golpe corpo a corpo leva 1d4 de volta | sim | sim | `#7a8a4a` |
| armadura | Armadura Rúnica | magias causam só metade do dano | sim | sim | `#5a7ae0` |
| elmo | Elmo da Última Chance | engana a morte: quando cairia, volta com 1 PV (1× por luta) | sim | sim | `#e8c040` |
| elmo | Elmo do Vigia | +5 na iniciativa: age antes de quase todos | sim | sim | `#c0c8d0` |
| elmo | Elmo da Mente Firme | vantagem em todas as salvaguardas | sim | sim | `#b07ae0` |
| botas | Botas Ligeiras | +10 pés de deslocamento e não provoca ataque de oportunidade | sim | sim | `#5ab0e0` |
| botas | Botas de Raiz | não pode ser empurrado nem puxado, e +1 na CA | sim | sim | `#7a5a3a` |
| botas | Botas do Vento | +3 na CA contra flechas, raios e magias de ataque | sim | sim | `#a0e0d0` |
| luvas | Manoplas Certeiras | crítico com 1 número a menos no d20 | sim | sim | `#e09a40` |
| luvas | Luvas da Precisão | +2 em todas as jogadas de ataque | sim | sim | `#e0e070` |
| luvas | Manoplas do Trovão | acertos críticos causam +2d8 de dano trovejante | sim | sim | `#4a6ae0` |
| capa | Capa das Sombras | ao ficar com metade dos PV, fica invisível por 2 turnos | sim | sim | `#8a5ae0` |
| capa | Capa da Miragem | o primeiro ataque contra ele em cada rodada tem desvantagem | sim | sim | `#5ac0c0` |
| capa | Capa da Seiva | recupera 2 PV no início de cada turno | sim | sim | `#5ac05a` |
| arco | Arco Sussurrante | dispara sozinho uma flecha (1d6) a cada turno | sim | não | `#7ac050` |
| arco | Arco das Chamas | ataques à distância causam +1d6 de fogo | sim | não | `#f07a2a` |
| arco | Arco do Caçador | vantagem contra quem está com metade dos PV ou menos | sim | não | `#3a8a4a` |
| machado | Machado Ceifador | ao derrubar alguém, recupera 1d8 PV | não | sim | `#c0703a` |
| machado | Machado da Ira | +1d6 de dano enquanto estiver com metade dos PV ou menos | não | sim | `#c02a2a` |
| machado | Machado Fendedor | ignora resistências: o dano nunca cai pela metade | não | sim | `#a0a0b0` |
| escudo | Escudo do Primeiro Golpe | bloqueia o primeiro ataque que causaria dano | não | sim | `#5ad0a0` |
| escudo | Escudo Espelhado | devolve metade do dano de magias de ataque a quem lançou | não | sim | `#d0e0f0` |
| escudo | Escudo Guardião | +1 na CA e todo dano recebido cai 2 | não | sim | `#e0b060` |
| cajado | Cajado Arcano | magias de ataque causam +1d6 de dano | sim | não | `#d23ab4` |
| cajado | Cajado da Sabedoria | +2 na CD das magias: fica mais difícil resistir | sim | não | `#6a8af0` |
| cajado | Cajado da Renovação | recupera um espaço de magia a cada 2 rodadas | sim | não | `#5ad08a` |

## 7. Chefes (versão 3, episódios 10, 20, 30…)

- Ordem: Minotauro → Grifo → Hidra → Gigante da Colina → Quimera → Dragão Vermelho (e repete). O Beholder não está no SRD, então o "de muitos olhos" virou a Quimera.
- Chefe-personagem (fora da ordem, `"chefe": "ALDRIC"`): Sir Aldric, Paladino 20 · Golias (SRD 5.2) — PV 204, CA 19, AURÉOLA PROFANA 11/turno, 1 turno por rodada; desenhado como herói 3× (REGRAS.md §10b).
- A luta é **sempre na caverna** e a caverna é **só** para chefe. O chefe entra como 17º lutador, no **centro** do círculo dos 16 heróis; é todos contra todos, mas os heróis preferem o chefe (`focoChefe`).
- Tamanho: sprite desenhado em 112×112 e mostrado **3× maior** no mundo (336×336), redesenhado em resolução 3× para o pixel do chefe ter o mesmo tamanho do pixel dos heróis. O corpo (alcance e espaço) acompanha: raio = coluna "Corpo".
- Age **2 vezes por rodada** (no seu número de iniciativa e no meio da ordem), todos os ataques em cada turno; especial com recarga (d6 ≥ recarga); não é empurrado; quem voa não provoca ataque de oportunidade. Não sobe acima de y = 640 px (a cabeça não some atrás do placar).
- **Quem derruba o chefe sobe 1 nível na hora e ganha um item** (da sua classe) — banner "CHEFE DERROTADO!" + rugido.
- Se o chefe vence: sem baú, pergaminho com a ficha do chefe, "A ARENA ESPERA UM NOVO CAMPEÃO", e `campeao.json` = `null` (próximo episódio sem campeão).
- Interface: barra de vida própria logo abaixo do HUD (retrato 16×16, nome em vermelho, "CHEFE", barra vermelha com PV).

| Chefe | Ficha | CA | PV | Desloc. | Voa | Corpo | Ataques | Especial (recarga) | Resiste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Minotauro | Minotaur (SRD 5.2) | 14 | 145 | 40 pés | não | 42 px | MACHADO GRANDE +6 2d12+4; CHIFRADA +6 2d8+4 | INVESTIDA: corre o dobro, +2d8, empurra (5–6) | — |
| Grifo | Griffon (SRD 5.2) | 12 | 135 | 40 pés | sim | 45 px | BICO +6 1d8+4; GARRAS +6 2d6+4 | RASANTE: voa até o alvo, vantagem (5–6) | — |
| Hidra | Hydra (SRD 5.2) | 15 | 120 | 30 pés | não | 54 px | MORDIDA +8 1d10+5; MORDIDA +8 1d10+5; MORDIDA +8 1d10+5 | FÚRIA DAS CABEÇAS: uma mordida em cada herói colado (5–6) | — |
| Gigante da Colina | Hill Giant (SRD 5.2) | 13 | 100 | 40 pés | não | 48 px | CLAVA GRANDE +8 3d8+5; CLAVA GRANDE +8 3d8+5 | ARREMESSO DE PEDRA: +8, 3d10+5 (4–6) | — |
| Quimera | Chimera (SRD 5.2) | 14 | 90 | 30 pés | sim | 48 px | MORDIDA +7 2d6+4; CHIFRES +7 1d12+4; GARRAS +7 2d6+4 | SOPRO DE FOGO: cone 7d8 fogo, DES CD 15, alcance 70 px além do corpo (5–6) | — |
| Dragão Vermelho | Young Red Dragon (SRD 5.2) | 18 | 110 | 40 pés | sim | 60 px | MORDIDA +9 2d10+6; GARRAS +9 2d6+6 | SOPRO DE FOGO: cone 6d6 fogo, DES CD 14, alcance 110 px além do corpo (5–6) | fogo |

PV calibrados (o SRD dá bem mais) para o chefe vencer ~30% (Dragão ~50%), em 50 lutas simuladas por chefe com o campeão do ep. 8.

## 8. Arenas

| Arena | Mundo | Área de luta (x0–x1, y0–y1) | Centro | Círculo inicial | Luz ambiente | Luzes |
| --- | --- | --- | --- | --- | --- | --- |
| calabouco | 360×640 | 46–314, 200–520 | 180, 360 | raio 118×140 | rgb(46, 66, 82) | 10 tochas |
| floresta | 360×640 | 46–314, 200–520 | 180, 360 | raio 118×140 | rgb(86, 112, 110) | 10 lanternas/fogueiras |
| caverna | 720×1280 | 92–628, 400–1040 | 360, 720 | raio 236×280 | rgb(58, 62, 80) | 8 tochas |

- **Calabouço** (padrão): lajotas com variação, paredes de pedra em cima e nos lados, portões, correntes, estandartes, 10 tochas com chama animada e luz quente, poças que refletem, ratos, poeira no ar.
- **Floresta**: clareira ao entardecer, grama e terra batida, linha de árvores, arcos de pedra em ruína, estandartes, lanternas e fogueiras, lagos, vaga-lumes, folhas caindo, coelhos.
- **Caverna** (só chefe): 4× a área (2× cada lado), paredes de rocha em superelipse, estalagmites, cristais que brilham, lago subterrâneo, ossadas, gotas, poeira e morcegos; escura, 8 tochas com raio de luz 1,7×. A área de luta é a das arenas normais em 2× e a câmera mostra a caverna inteira (vinheta na tela); no duelo aproxima até 1×.
- Luz: o mundo é escurecido pela luz ambiente e iluminado em modo aditivo pelas tochas/efeitos (cada luz tem raio, cor e tremulação); lutadores recebem brilho conforme a luz no ponto onde estão.
- Sempre: grão leve e vinheta. `centro: "livre"` tira o tablado de degraus e o altar d20 do meio.

## 9. Pixel art (motor próprio, tudo em código)

- `Tela`: buffer de **material** + **tom** por pixel. Formas: elipse, retângulo, polígono, cápsula (traço grosso redondo), linha. Cada forma recebe uma função de tom (volume esférico, cilíndrico ou fixo) e um padrão opcional (escamas, pelos, penas, tecido).
- Rampas: cada material vira uma rampa de 5 tons com **hue shifting** (sombras mais frias/azuladas, luzes mais quentes/amareladas), sombreamento em 4 tons + brilho.
- Contorno **sel-out** (contorno escuro colorido pelo material vizinho, nunca preto puro) e **rim light** na borda do lado da luz.
- Heróis: sprites **48×64**, âncora nos pés (24, 61), corpo chibi de ~2,5 cabeças; 4 direções (S, N, E, W); animações idle 4q, andar 6q, ataque 4q, magia 7q, dano 2q, derrota 4q, vitoria 4q; 7 expressões (neutra, foco, grito, dor, PV baixo, derrota, vitória); versão rasgada/suja com PV baixo.
- Peças por classe/espécie: armaduras (placas, malha, couro, manto, gi…), elmos/chapéus/capuzes, capas, tabardos, ombreiras, armas na mão, orelhas, chifres, presas, escamas; cores de pele/cabelo/olho/roupa sorteadas das paletas de `regras.ts`.
- Retratos **96×64** (busto, para cut-in, VS, vitória e pergaminho) e mini **16×16** (HUD, "CAIU!").
- Chefes: vista de lado, 112×112 no desenho, 3× no mundo; poses idle, andar, ataque, dano, derrota (tomba), vitória (rugido); retrato 96×64 recortado da cabeça e mini 16×16.
- Fontes bitmap próprias: grande 5×7 e pequena 3×5, com acentos do português, setas e sinal de menos; contorno de 1 px.
- Sombra elíptica no chão, coroa dourada no campeão anterior, contorno de luz atrás de cada sprite, flash branco ao levar dano, recuo de 1–2 px.

## 10. Interface

- **HUD** (topo, y 73–165, fundo escuro 78%): "ARENA D20 #N" em dourado, "RODADA r · VIVOS v"; grade 4×4 com mini retrato, primeiro nome, quadradinho da cor da classe, NV e barra de PV; quem está agindo pisca em dourado; caído = X vermelho e nome riscado; coroa no campeão.
- Sobre cada lutador: barra de PV de 16 px, etiquetas de condição (FÚR fúria, MRC marcado, INV invisível, ESC escudo, CNC concentrando, LNT lento…), ▼ dourada em quem está no turno.
- Golpe: caixa com o nome do golpe na cor do tipo, d20 girando com o resultado (verde acerto, cinza erro, dourado crítico, vermelho falha), números de dano flutuando (crítico maior), CURA em verde, "SALVOU"/"FALHA".
- Banners: "[NOME] CAIU!" (desliza, mini retrato cinza com X, empilha), cut-in (faixa diagonal na cor da classe, retrato 2× e linhas de velocidade), VS, vitória, "SUBIU DE NÍVEL!" com coluna de luz, "PEGOU O ITEM!" com ícones, "CHEFE DERROTADO!".
- Cores fixas: dourado `#ffd84a`, tinta `#1a1014`, papel do pergaminho `#e8d4a4`, tinta do pergaminho `#3a2418`, verde de ganho `#2e8a2e`.
- Área segura: nada importante abaixo de y ≈ 530 (interface do app cobre a base).

## 11. Áudio (`audio/arena.py`, 100% sintetizado com numpy, sem direito autoral)

- Trilha chiptune em **lá menor, 145 BPM**, em loop (pulso, triângulo e ruído); versão intensa no duelo, calma no pergaminho, recua no CTA.
- Ambiente por arena: calabouço e caverna = tochas crepitando, gotas e vento grave com eco; floresta = vento nas folhas, grilos, coruja ao longe e fogueiras crepitando.
- Um efeito por evento, ~4–6 dB acima da trilha, eco curto, limite de efeitos simultâneos. Eventos vêm de `public/arena/epNN-sons.json` (gerado pelo roteiro).
- Efeitos (40): rugido, passo, queda, dado, corte, swing, impacto, soco, flecha, fogo, gelo, trovao, raio, luz, sombra, energia, veneno, cura, zombaria, sopro, furia, brilho, conjura, whoosh, estalo, hit, sino, plim, bip, derrota, banner, conta, lutem, vs, fanfarra, levelup, papel, tique, bau, tesouro.
- Determinístico: rodar de novo gera o mesmo WAV. Sempre masterizar: `scripts/masterizar.sh` (−14 LUFS, −1 dBTP).

## 12. Arquivos e pipeline

| Arquivo | Papel |
| --- | --- |
| `remotion/src/arena/rng.ts` | sfc32 + cyrb128, rolagens com rótulo, `hash3` |
| `regras.ts` | classes, espécies, poderes, espaços de magia, nomes, paletas |
| `personagem.ts` | sorteio/leitura dos comentários, atributos, PV, CA, visual, campeão anterior, chefe como 17º, subida de nível |
| `combate.ts` | simulação completa (turnos em batidas mover/golpe/estado), IA, itens, chefes, geometria das arenas |
| `roteiro.ts` | batidas → quadros do vídeo (grupos de 4, congelamentos, cut-ins, VS, baú, história, pergaminho, sons) |
| `render.ts` | desenha cada quadro (mundo + interface) e a câmera |
| `pixel.ts`, `sprite.ts`, `chefes-arte.ts`, `fonte.ts`, `efeitos.ts` | motor de pixel art, sprites, chefes, fontes, efeitos de golpe |
| `cenario.ts`, `floresta.ts`, `caverna.ts` | arenas, luzes e vida no cenário |
| `itens.ts`, `chefes.ts` | itens (poderes, ícones, classe) e fichas dos chefes |
| `ArenaD20.tsx`, `CatalogoItens.tsx`, `Folhas.tsx` | composições: vídeo, catálogo de itens, sprite sheets |
| `remotion/scripts/arena.ts` | FICHA.md, campeao.json, lutadores.json, eventos de áudio |
| `remotion/scripts/escolher-seed.ts` | escolhe a seed pelo ritmo |
| `scripts/arena.sh` | pipeline completo de um episódio |

```bash
cd remotion && npm i && cd ..
scripts/arena.sh remotion/src/arena/episodios/epNN.json
# 0 seed pelo ritmo (se vazia) → 1 simulação + FICHA → 2 áudio → 3 vídeo → 4 master → 5 sprite sheets
# saída: remotion/out/arena-epNN-master.mp4 e arena-d20/epNN/ (FICHA.md, campeao.json, lutadores.json, sprites/)
```

Próximo episódio: copiar `arena-d20/epNN/campeao.json` para `campeaoAnterior`, `seed: ""`, `versao: 6`, `focoCampeao: "forte"`, `centro: "livre"`.

## 13. Nomes e sobrenomes

- Nomes (48): Thorin, Lyra, Kael, Mirela, Bruk, Seraphine, Doran, Vex, Elowen, Garruk, Isolde, Nyx, Zara, Ulric, Wren, Tamsin, Orrin, Rhea, Borin, Cassia, Faelan, Grom, Liora, Marek, Quill, Sable, Tobias, Yara, Azura, Brann, Edda, Fenris, Hale, Ivo, Juno, Korrin, Lorcan, Maeve, Nessa, Pike, Runa, Soren, Talia, Vesna, Ash, Kira, Dax, Oona.
- Sobrenomes (40): Pedraforte, Valeclaro, Corvonegro, Brasaviva, Martelo, Ventolargo, Lunasombra, Espinhadouro, Rocharrubra, Galhoverde, Fogaréu, Cinzafria, Dentelobo, Asaprata, Montanegra, Sombralonga, Marévoa, Trovão, Estrelagris, Raizfunda, Lâminarrubra, Folhaseca, Penhasco, Ouroverde, Brumaclara, Ossovelho, Pedranegra, Rubrafonte, Corvalho, Gelomanto, Solposto, Chamaviva, Serrabrava, Lagofundo, Águaclara, Ventobravo, Mantonegro, Ferrocinza, Torrealta, Pontavento.

## 14. Entregas por episódio

- MP4 masterizado; `FICHA.md` (seed, fichas, rolagens, iniciativa, log com tempo do vídeo, ordem de queda, ficha nova, crédito SRD); `campeao.json`; `lutadores.json`; sprite sheets e retratos por lutador.
- Texto de crédito obrigatório (na FICHA e na descrição):

---

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
