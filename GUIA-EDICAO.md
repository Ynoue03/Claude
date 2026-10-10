# Guia de Edição — transições, efeitos sonoros e briefing

> **Base de toda edição nova.** O Claude lê este arquivo antes de criar qualquer vídeo.
> Atalho: digite **`/novo-video`** no Claude Code (skill em `.claude/skills/novo-video/`).
>
> Ordem: **1. Briefing** (perguntar) → **2. Vídeo modelo** (analisar, se houver) → **3. Preset do nicho**
> → **4. Escolher transições e sons nos catálogos** → **5. Plano de edição** (aprovar) → **6. Produzir e entregar**.

---

## 1. Briefing — perguntas obrigatórias

O Claude **não começa a editar** sem estas respostas. Perguntar em um bloco só, com opções clicáveis
quando possível. O que a pessoa não souber responder vira padrão do preset do nicho (seção 3).

| # | Pergunta | Opções / exemplo | Se não souber |
|---|---|---|---|
| 1 | **Qual o nicho do vídeo?** | academia · alimentação · beleza/skincare · moda · imobiliário · tecnologia/SaaS · finanças · educação · viagem · pets · outro | obrigatória |
| 2 | **Tem um vídeo modelo?** | arquivo (.mp4/.mov) na pasta `modelos/`, ou link | segue só o preset |
| 3 | Objetivo do vídeo | alcance/viral · salvar/compartilhar · vender/anúncio · ensinar · institucional | "salvar/compartilhar" |
| 4 | Onde vai ser postado | Reels · TikTok · Shorts · Stories · anúncio · YouTube (16:9) | Reels (9:16) |
| 5 | Duração | 7–10 s · 10–20 s · 20–40 s · 40–60 s | do preset |
| 6 | Roteiro / textos da tela | gancho, conteúdo, CTA (pode ser só o tema) | Claude propõe, pessoa aprova |
| 7 | Mídia própria | vídeos gravados, fotos, logo (colocar em `public/` ou `assets/`) | só motion graphics |
| 8 | Áudio | trilha própria · música licenciada (enviar arquivo) · **só efeitos** (para pôr áudio em alta no app) · com narração | trilha própria + efeitos |
| 9 | Identidade visual | usar a da marca (`CLAUDE.md`) · outra (cores/fontes/@) | a da marca |
| 10 | Referências do que **não** quer | "nada de glitch", "sem música agitada"… | — |

> **Link de Instagram/TikTok:** normalmente não dá para baixar daqui. Peça o arquivo (baixar no celular
> e enviar) ou um print de 3–4 momentos-chave.

As respostas são salvas em `briefings/AAAA-MM-DD-nome.md` (modelo em `briefings/_modelo.md`).

---

## 2. Vídeo modelo — como analisar

1. Coloque o arquivo em `modelos/` e rode:
   ```bash
   python3 scripts/analisar-modelo.py modelos/referencia.mp4
   ```
   Gera `modelos/referencia/ficha.md` + `quadros.png` (um quadro por cena) + `onda.png` (áudio com os cortes marcados).
2. O analisador mede automaticamente: duração e formato, **cortes por segundo e tipo** (seco/suave),
   duração média das cenas, **BPM provável + alternativas**, loudness e se os **cortes têm som junto**.
   (Calibrado nos vídeos do projeto: acertou todos os cortes; o BPM real aparece entre os candidatos — confirme de ouvido.)
3. O Claude abre `quadros.png`/`onda.png` e preenche na ficha: tipos de transição, estilo de texto,
   paleta, efeitos percebidos, **o que copiar** e **o que adaptar à marca**.
4. Traduzir para o plano: ritmo do modelo → duração das cenas; tipo de corte → transição do catálogo
   (seção 4); BPM → trilha (seção 6); ataques sonoros → efeitos (seção 5).

**Regra:** copiar a **estrutura e o ritmo**, nunca o conteúdo, a música ou a marca de outra pessoa.

---

## 3. Presets por nicho

Ponto de partida quando não há modelo (ou para completar o que o modelo não mostra).
"Cortes/s" = trocas de cena por segundo. Energia de 1 (calmo) a 5 (intenso).

| Nicho | Clima | Energia | Cortes/s | Trilha (gênero · BPM) | Transições preferidas | Sons-assinatura | Evitar |
|---|---|---|---|---|---|---|---|
| **Academia (aesthetic)** ✅ | editorial, calmo, motivador | 3 | 0,2–0,4 | deep house suave · 110–120 | soft rise, fade, push | whoosh de ar, toques de madeira subindo, sino | glitch, sirene, "boom" |
| **Alimentação (aesthetic)** ✅ | acolhedor, cozinha calma | 2 | 0,2–0,3 | lo-fi jazz · 80–90 | soft rise, slide de baixo, dissolve | bolhas, cintilar, papel, **foley real** (faca, chiado) | cortes secos rápidos |
| Academia (hardcore/hype) | intenso, competitivo | 5 | 1,0–2,0 | phonk / trap / drum'n'bass · 130–170 | corte seco no beat, zoom punch, whip, flash | impacto grave, riser, anilha, respiração | lo-fi, transições lentas |
| Beleza / skincare | limpo, luxuoso, sensorial | 2 | 0,3–0,5 | R&B suave / ambient · 70–95 | dissolve, blur slide, íris, light leak | brilho, "pop" suave, água/gota | cores saturadas, sons de meme |
| Moda | confiante, ritmado | 4 | 0,8–1,5 | house / pop / afrobeat · 115–125 | corte seco no beat, push, flip, match cut | estalo, swoosh de tecido, shutter de câmera | slides lentos |
| Imobiliário | sofisticado, aspiracional | 2 | 0,2–0,4 | piano / cinematic · 70–100 | dissolve, wipe, zoom suave (Ken Burns) | swell, sino suave, porta/chave (foley) | efeitos chamativos |
| Tecnologia / SaaS | claro, moderno, preciso | 3 | 0,5–1,0 | electro-pop / synthwave leve · 100–120 | slide, push, zoom in/out, máscara | clique de UI, toggle, digitação, ding | ruído excessivo |
| Finanças | confiável, didático | 2 | 0,3–0,6 | corporate / lo-fi · 85–105 | wipe, slide, push | tique em números, "caixa registradora" sutil, ding | humor exagerado |
| Educação | didático, leve | 2 | 0,3–0,6 | lo-fi / acústico · 80–100 | fade, slide, push | lápis, página virando, pop | trilha que disputa com a voz |
| Viagem | aventureiro, aberto | 4 | 0,8–1,5 | indie / tropical house · 100–125 | whip pan, match cut, zoom blur, light leak | vento, avião, swoosh, riser | transições "de PowerPoint" |
| Pets | divertido, fofo | 3 | 0,5–1,0 | ukulele / pop leve · 100–120 | pop/escala, swap, push | boing, pop, latido/miado (foley) | sons agressivos |
| **Games / RPG (pixel art)** ✅ | retrô, tenso, divertido | 4 | contínuo (a câmera é a arena) | chiptune 8/16 bits, tom menor · 144 | cut-in diagonal, flash branco, tremor, zoom 1,2× no duelo | dado rolando, blips, golpe por elemento, arpejos | glitch digital, sons de meme |

✅ = preset implementado neste repositório (templates `TreinoDoDia`, `ReceitaFit`, `pre-treino`, `ArenaD20`).
Novo nicho? Adicione uma linha aqui depois de aprovado o primeiro vídeo.

---

## 4. Catálogo de transições

**Como escolher:** energia do nicho → coluna "Energia"; sempre parear com o som da coluna "Som".
Duração típica: suaves 0,5–0,8 s · rápidas 0,15–0,3 s · corte seco 0 s.

| Transição | O que faz | Energia | Duração | Quando usar | Som pareado | Remotion | HyperFrames |
|---|---|---|---|---|---|---|---|
| **Soft rise** (marca) | sai subindo e desfocando, entra de baixo | 2 | 0,7 s | troca de cena padrão (aesthetic) | whoosh de ar | `softRise()` (`components/SoftRise.tsx`) | helpers `sair`/`entrar` |
| Corte seco | troca instantânea | 1–5 | 0 | no beat da música; ritmo rápido | batida/impacto no corte | sem `Transition` | `data-start` encostado |
| Fade (cross-dissolve) | uma imagem some na outra | 1 | 0,4–0,8 s | calmo, passagem de tempo | swell suave / nada | `fade()` | `css-dissolve` |
| Dissolve | dissolve com textura | 2 | 0,6–1 s | beleza, imobiliário | brilho | `@remotion/transitions/dissolve` | `css-dissolve` |
| Slide | nova cena empurra de um lado | 2–3 | 0,4–0,6 s | listas, passos, "próximo" | swoosh curto | `slide({direction})` | `css-push` |
| Push / push-cut | empurra com corte no meio | 3 | 0,3–0,5 s | tecnologia, moda | swoosh + clique | `push-cut` | `css-push` |
| Wipe | cortina revela a próxima | 2–3 | 0,4–0,6 s | finanças, antes/depois | swoosh | `wipe()` | `css-cover` |
| Clock wipe / Íris | revelação circular | 2 | 0,5–0,8 s | revelar resultado, produto | brilho / pop | `clock-wipe`, `iris` | `css-radial` |
| Blur slide / linear blur | desliza com desfoque de movimento | 3 | 0,3–0,5 s | dinâmico mas elegante | whoosh | `blur-slide`, `linear-blur` | `css-blur` |
| Zoom in/out · cross-zoom | aproxima e troca | 4 | 0,3–0,5 s | ênfase, ritmo | riser curto + impacto | `zoom-in-out`, `cross-zoom`, `zoom-blur` | `css-scale` |
| Zoom punch | "soco" de zoom rápido no beat | 5 | 0,1–0,2 s | hype, moda, gancho | impacto grave | `scale` com `spring` | `hyperframes-keyframes` |
| Whip pan | chicote horizontal borrado | 5 | 0,15–0,3 s | viagem, energia alta | whip / swoosh forte | `blur-slide` rápido | `hyperframes-keyframes` |
| Flip / book flip | gira como carta/página | 3 | 0,5–0,7 s | revelar "antes/depois", cardápio | página virando | `flip()`, `book-flip` | `css-3d` |
| Swap | cenas trocam de lugar | 3 | 0,4–0,6 s | comparação | swoosh duplo | `swap` | `css-push` |
| Match cut | forma/movimento continua na próxima cena | 3 | 0 | storytelling, viagem | som contínuo (sem acento) | planejar na gravação | idem |
| Light leak | luz quente atravessa o corte | 2 | 0,8–1 s | aesthetic, nostalgia (sobreposição) | swell / nada | `Vazamentos` / `@remotion/effects/light-leak` | `#vazamento` (index.html) |
| Film burn / dreamy zoom | queima de filme / sonho | 3 | 0,6–1 s | memórias, viagem | swell | `film-burn`, `dreamy-zoom` | `css-light` |
| Ripple / crosswarp | distorção líquida | 4 | 0,5–0,8 s | água, skincare, bebidas | gota / bolha | `ripple`, `crosswarp` | `css-distortion` |
| Flash branco | clarão de 2–4 quadros | 5 | 0,1 s | impacto, "antes/depois" | impacto / shutter | sólido branco com `opacity` | `css-light` |
| Glitch | interferência digital | 5 | 0,2 s | tech/gamer (**nunca no aesthetic**) | glitch/estática | `@remotion/effects` (chromatic aberration) | registry: `glitch` |
| J-cut / L-cut | o som da próxima cena entra antes (J) ou continua depois (L) | — | 0,3–1 s | com narração ou foley | — | `Sequence` de áudio antecipada | `data-start` do `<audio>` |

**Regras de ouro**
- Escolha **1 transição principal + 1 de ênfase** por vídeo. Misturar 5 tipos parece amador.
- Transição longa demais "trava" o vídeo: nunca > 1 s em Reels.
- Corte seco **sempre no tempo da música** (na batida ou no início do compasso).
- A transição de ênfase vai no momento mais importante (revelação, resultado, CTA).

---

## 5. Catálogo de efeitos sonoros

**Biblioteca própria** (gerada por `audio/gerar.py`, em `remotion/public/audio/sfx/` e `hyperframes/assets/audio/sfx/`).
"A criar" = ainda não existe: gerar em `audio/gerar.py` (receita indicada) ou usar banco licenciado.

| Família | Efeito | Arquivo | Evento visual | Volume (`mix`) |
|---|---|---|---|---|
| **Transição** | Whoosh de ar + grave | `transicao.wav` (pico em 0,45 s) | troca de cena | 0,5 |
| | Sopro | `ar.wav` | título entrando | 0,4 |
| | Riser (subida de tensão) | *a criar* — ruído com filtro subindo 1–2 s, termina no corte | antes de uma revelação | — |
| | Impacto grave / boom suave | *a criar* — seno 60→35 Hz + ruído curto | corte seco no beat, zoom punch | — |
| | Reverse (swell invertido) | *a criar* — reverb invertido | entrada de cena, flash | — |
| | Whip | *a criar* — whoosh 0,2 s mais agudo | whip pan | — |
| **Interface / lista** | Toque de madeira (escala) | `tique-1…10.wav` | item de lista (sobe a cada item) | 0,6 |
| | Bolha / pop | `bolha-1…8.wav` | marcador, ícone, elemento aparecendo | 0,55 |
| | Papel / cartão | `cartao.wav` | cartão, painel deslizando | 0,55 |
| | Clique / salvar | `salvar.wav` | ícone salvar, botão, check | 0,6 |
| | Toggle / switch | *a criar* — dois cliques com tons diferentes | antes/depois, liga/desliga | — |
| **Texto** | Lápis | `escrita.wav` | sublinhado, círculo à mão | 0,6 |
| | Digitação | *a criar* — cliques curtos aleatórios | texto letra a letra | — |
| **Ênfase / dado** | Cintilar subindo | `brilho.wav` | gráfico enchendo, contador, "resultado" | 0,7 |
| | Sino (assinatura) | `sino-treino.wav`, `sino-receita.wav` | fecho / CTA | 0,85 |
| | Ding | *a criar* — sino curto 0,5 s | acerto, número final | — |
| **Foley** (gravar no celular) | Cozinha: faca, chiado, colher, água | *gravar* | cenas de receita (ASMR) | ~0,6 |
| | Academia: anilha, halter no chão, respiração, giz | *gravar* | gancho de treino | ~0,5 |
| **Evitar** | memes (vine boom, bruh, risada) | — | só em nicho de humor | — |

**Regras de sincronia**
1. O som acompanha o **evento visual**, não o tempo do relógio: posicione o efeito **dentro da cena** que o dispara
   (`<Som arquivo em volume>` no Remotion; `<audio data-start>` local no HyperFrames).
2. **Whoosh: o pico no meio do corte**, não no início (`em = meio_do_corte − 0,45 s`).
   **Riser: termina no corte.** **Impacto: exatamente no corte.**
3. **Densidade:** no máximo ~1 efeito a cada 0,5 s. Lista com 10 itens? Um toque por item, mas mais baixo.
4. **Variação:** som repetido muda de altura (escala, bolhas cada vez mais agudas) — nunca o mesmo arquivo em sequência.
5. **Nível:** acentos **4–6 dB acima da trilha** no momento em que tocam; a trilha **recua** no fecho e quando há voz.
6. **Caudas** (sino, reverb) nunca terminam cortadas: fade automático no fim do vídeo (já embutido no `<Som>`).
7. Se não há evento visual, **não há som**. Silêncio também é edição.

---

## 6. Trilha e ritmo

- Escolher a trilha **pelo nicho** (seção 3) ou **pelo BPM do modelo** (seção 2).
- **Cortes no tempo:** duração de cena em múltiplos da batida → `60 / BPM` segundos.
  Ex.: 112 BPM → batida 0,536 s, compasso 2,14 s; cena de ~3 s ≈ 6 batidas (3,21 s).
- Trilhas próprias prontas: `treino-house` (112) · `receita-lofi` (84) · `pre-treino-pop` (100).
  Nova trilha: adicionar chamada `trilha(...)` em `audio/gerar.py` (gênero: `house`, `lofi` ou `pop`, BPM, acordes).
- Música licenciada: arquivo em `public/audio/musica/` + prop `musica`. Áudio em alta: renderizar **só efeitos**
  (`--props='{"musica":""}'`) e adicionar a música no app.

---

## 7. Mapa rápido — evento → transição + som

| Evento na tela | Transição/animação | Som |
|---|---|---|
| Abertura / gancho | título palavra a palavra, palavra-fantasma | sopro (`ar`) ou impacto (hype) |
| Troca de cena | soft rise / do preset | whoosh no meio do corte |
| Item de lista | reveal + linha desenhando | toque de madeira subindo |
| Ingrediente / marcador | pop com mola | bolha |
| Número / gráfico | contador + anel/barras | cintilar |
| Destaque no texto | sublinhado à mão | lápis |
| Antes/depois | wipe, flip ou flash | toggle / impacto |
| Revelação de resultado | íris, zoom, light leak | riser → impacto |
| CTA / fecho | ícone salvar + título | clique + sino; trilha recua |

---

## 8. Plano de edição (o Claude apresenta antes de produzir)

```
Vídeo: <nome> · nicho <x> · <duração> s · <formato> · motor: Remotion | HyperFrames
Modelo: <arquivo ou "nenhum"> → copiar: <ritmo/estrutura>; adaptar: <marca>
Trilha: <arquivo> (<BPM>) · Áudio de entrega: completo | só efeitos
Cena | Tempo | Conteúdo na tela | Animação | Transição de saída | Sons (tempo local)
1    | 0–3 s | gancho "..."     | palavra a palavra | soft rise | ar @0,35
2    | ...
```

A pessoa aprova (ou ajusta) o plano → o Claude produz → entrega com checklist abaixo.

---

## 9. Checklist de entrega

- [ ] Plano aprovado e briefing salvo em `briefings/`
- [ ] Texto dentro da área segura (96 px laterais, 220 topo, 320 base)
- [ ] 1 transição principal + no máximo 1 de ênfase
- [ ] Cada efeito sonoro tem um evento visual; nenhum som "meme" fora do nicho de humor
- [ ] Remotion: `npm run lint` limpo · HyperFrames: `npm run check` aprovado
- [ ] Quadros-chave conferidos (stills/snapshot) e ao menos uma transição vista no MP4
- [ ] `scripts/masterizar.sh` aplicado (−14 LUFS, −1 dBTP)
- [ ] Versões: completa + só efeitos (se for postar com áudio em alta)
