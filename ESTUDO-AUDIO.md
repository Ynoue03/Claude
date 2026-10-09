# Estudo de áudio — Reels de academia e alimentação (aesthetic)

> Objetivo: definir a identidade sonora dos vídeos (trilha + efeitos), como mixar, como entregar
> no volume certo para as plataformas e como evitar problemas de direito autoral.

## 1. O papel de cada camada

| Camada | Função | Regra de ouro |
| --- | --- | --- |
| **Trilha de fundo** | dá o clima e o ritmo do vídeo | fica *atrás*, nunca disputa com o acento |
| **Efeitos (SFX)** | "pontuam" o que acontece na tela (corte, item novo, destaque, fecho) | um som por **evento importante**, não por movimento |
| **Voz** (futuro) | explica | quando entrar, a trilha recua (*ducking*) |

O vídeo precisa funcionar **sem som** (muita gente assiste no mudo) e ficar **melhor com som**.
É por isso que todo texto já está na tela e o áudio é só reforço.

## 2. Trilha por tipo de conteúdo

Não achamos estudo confiável sobre BPM ideal por nicho; as faixas abaixo são **recomendação de produção**,
coerentes com o clima "quiet luxury" da marca (sem EDM agressivo, sem trap).

| Conteúdo | Gênero | BPM | Por quê |
| --- | --- | --- | --- |
| Treino (lista de exercícios) | deep house suave | 110–120 | energia de academia sem agressividade; o bumbo constante "puxa" a lista |
| Receita / alimentação | lo-fi jazz com *swing* | 80–90 | clima de cozinha calma, acolhedor; combina com ASMR de comida |
| Dica rápida / pré-treino | pop leve com marimba | 95–105 | animado e "manhã"; a marimba conversa com os toques de madeira |

Boas práticas:
- **Entrada abafada → clara**: o 1º compasso é só harmonia com filtro abrindo; a bateria entra quando o conteúdo começa.
- **Loop limpo**: Reels repete sozinho; a trilha não pode ter "buraco" no fim.
- **Fecho**: a música recua ~5 dB na chamada final para o sino respirar, e some em fade nos últimos 1,6 s.

## 3. Biblioteca de efeitos da marca

Todos sintetizados em `audio/gerar.py`, **afinados na tonalidade das trilhas** (soa como parte da música, não colado por cima).

| Efeito | Arquivo | Quando | Ideia |
| --- | --- | --- | --- |
| Whoosh de ar + grave | `transicao.wav` | cada troca de cena | pico em 0,45 s, alinhado ao **meio** do corte; atravessa da esquerda p/ direita |
| Sopro | `ar.wav` | título entrando | dá "ar" à revelação das palavras |
| Toque de madeira | `tique-1…10.wav` | cada exercício da lista | **sobe na escala pentatônica** — a lista "cresce" no ouvido |
| Bolha | `bolha-1…8.wav` | cada ingrediente | pop arredondado, cada um mais agudo |
| Lápis | `escrita.wav` | sublinhado à mão | riscos irregulares, sincronizado ao traço |
| Cintilar | `brilho.wav` | anel de calorias enchendo | brilho que sobe junto com o número |
| Papel | `cartao.wav` | cartões entrando | deslize + toque leve |
| Salvar | `salvar.wav` | ícone de marcador | clique duplo macio |
| Sino | `sino-treino.wav`, `sino-receita.wav` | fecho / CTA | assinatura sonora da marca |

Regras: no máximo ~1 efeito a cada 0,5 s; repetição sempre com variação (altura diferente);
nada de sons "meme" (boom, vine, risadas) — quebra o clima da marca.

## 4. Mixagem e volume de entrega

Medimos o vídeo final e ajustamos até os acentos ficarem **~4–6 dB acima da trilha** no momento em que tocam
(antes do ajuste, toques e sino ficavam a +0 dB, ou seja, escondidos).

| Item | Valor usado |
| --- | --- |
| Volume da trilha | treino 0,38 · receita 0,6 · pré-treino 0,45 (iguala as três em loudness) |
| Recuo no fecho | −5 dB a partir da última cena |
| Entrega (masterização) | **−14 LUFS integrado, pico real −1 dBTP** (`scripts/masterizar.sh`) |

Sobre o −14 LUFS: o Instagram não publica um alvo oficial; −14 LUFS / −1 dBTP é a referência prática mais usada
para redes sociais (há quem cite −16). Entregar em −14 evita que a plataforma abaixe ou distorça o áudio.

Resultado medido nos vídeos atuais: Treino −13,8 LUFS · Receita −13,5 LUFS · Pré-treino −14,8 LUFS (picos ≤ −0,9 dB).

## 5. Direito autoral — a decisão mais importante

| Opção | Custo | Risco | Observação |
| --- | --- | --- | --- |
| **Trilha própria (a nossa, gerada por código)** | zero | nenhum | é o padrão do projeto |
| YouTube Audio Library | grátis | baixo | algumas faixas exigem crédito (CC-BY) — filtrar |
| Pixabay Music | grátis | baixo | uso comercial liberado; conferir termos atuais |
| Epidemic Sound / Artlist | ~US$ 10–18/mês | baixo | licença cobre Reels e cross-post; guardar o comprovante |
| Música em alta do Instagram | grátis | **alto fora do app** | só pode ser adicionada **dentro do app**; contas comerciais têm acesso limitado (verificar no Meta Business) |

**Estratégia recomendada (duas versões de cada vídeo):**
1. **Versão completa** (trilha própria + efeitos) → para TikTok, Shorts, anúncios e site.
2. **Versão só com efeitos** → para postar no Instagram e escolher um **áudio em alta dentro do app**,
   que ganha alcance pelo algoritmo, sem perder os efeitos que pontuam a edição.

```bash
# versão só com efeitos (sem trilha)
npx remotion render TreinoDoDia out/treino-sfx.mp4 --props='{"musica":""}'
# versão muda (só trilha, sem efeitos)
npx remotion render TreinoDoDia out/treino-musica.mp4 --props='{"sfx":false}'
```

## 6. Como trocar ou criar sons

- **Ajustar volumes:** `remotion/src/components/Som.tsx` (`mix`) e prop `musicaVolume` do vídeo.
- **Usar música licenciada:** coloque o arquivo em `remotion/public/audio/musica/` e passe `"musica": "audio/musica/arquivo.mp3"` nas props.
- **Mudar timbre/tonalidade/BPM:** edite `audio/gerar.py` e rode `python3 audio/gerar.py` (regenera tudo, determinístico).
- **Entregar:** sempre `scripts/masterizar.sh out/video.mp4` antes de postar.

## 7. Próximos passos sugeridos

1. **Foley real para receitas (ASMR)**: gravar no celular faca cortando, óleo chiando, colher no bowl.
   Comida + ASMR é um formato forte no nicho e casa com o lo-fi.
2. **Foley de academia**: anilha encaixando, respiração, giz — usados com parcimônia no gancho.
3. **Narração** (voz própria ou TTS) com recuo automático da trilha.
4. **Cortes no tempo da música**: ajustar a duração das cenas para cair exatamente no compasso.

### Fontes
- [Audio Network — music for vertical video](https://blog.audionetwork.com/the-edit/music/music-for-vertical-video)
- [Soundverse — Reels music strategy](https://www.soundverse.ai/blog/article/instagram-reels-music-strategy-using-ai-0828)
- [PostSyncer — trending sounds on Instagram](https://postsyncer.com/blog/trending-sounds-on-instagram)
- [Vlogging Pro — audio loudness per platform](https://vloggingpro.com/tools/audio-loudness/)
- [Film & Flow — LUFS guide for social media](https://filmandflow.beehiiv.com/p/the-ultimate-lufs-guide-perfect-audio-for-social-media)
- [vidIQ — YouTube Audio Library](https://www.vidiq.com/blog/post/royalty-free-music-youtube-audio-library)
- [Stack Influence — royalty-free commercial music](https://stackinfluence.com/blog/find-royalty-free-commercial-music-for-tiktok)
- [Pixflow — royalty-free music for video](https://pixflow.net/blog/royalty-free-music-video)
