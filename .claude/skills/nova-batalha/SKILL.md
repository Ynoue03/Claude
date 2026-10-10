---
name: nova-batalha
description: Cria um vídeo novo da Arena D20 (batalha pixel art de RPG/D&D 5e com 16 personagens de nível 1, campeão que sobe de nível) a partir de comentários de seguidores. Use quando a pessoa colar comentários do TikTok/Instagram com nome e descrição de personagem, pedir "nova batalha", "próxima batalha", "arena", "roda os dados", ou quiser renderizar uma batalha da pasta arena-dnd/.
---

# Nova batalha da Arena D20

Projeto: `arena-dnd/` (leia o `README.md` de lá). Identidade visual própria (retrô pixel art) — as regras
"aesthetic" do `CLAUDE.md` da raiz **não** se aplicam aqui.

## 1. Comentários → fila

Para cada comentário colado pela pessoa, extraia **nome**, **descrição** e **@autor** e acrescente em
`arena-dnd/personagens/fila.json` (`{ "nome", "descricao", "autor" }`).

- Reescreva a descrição em palavras que o leitor entende (classe, espécie, cores com objeto: "capa vermelha",
  "cabelo azul", "armadura dourada", arma: "com machado"). Ex.: "um cara tipo Aragorn" → "patrulheiro humano
  de capa verde e cabelo castanho com espada".
- Personagem famoso/protegido (Gandalf, Drizzt, Goku…): use um nome próprio inspirado e descrição genérica;
  não use nomes ou visual de marca de terceiros.
- Recuse ofensas/nomes de pessoas reais sem consentimento; nunca invente atributos — **atributos, PV e golpes
  sempre saem dos dados**.
- Mais de 15? Os primeiros 15 entram (a 16ª vaga é do campeão anterior, em `campeoes/atual.json`), o resto fica na fila.

## 2. Rodar

```bash
cd arena-dnd
[ -d node_modules ] || npm i
[ -f public/audio/musica-batalha.wav ] || npm run audio
npm run batalha            # opções: --semente N, --titulo "...", --perfil @conta, --sem-fila, --sem-campeao
npm run render -- <nome>   # nome impresso pelo comando anterior → out/<nome>-final.mp4
```

## 3. Conferir e entregar

- Extraia 3–4 quadros (`ffmpeg -ss 2 / meio / fim`) e olhe: rótulos legíveis, vencedor no fim.
- Entregue: o MP4 final, a **legenda** e o **comentário fixado** sugeridos em `batalhas/<nome>-ficha.md`,
  e diga quem venceu, para que nível subiu e quem criou o personagem.
- O campeão é salvo automaticamente em `campeoes/atual.json` e entra no próximo episódio.
- Lembre do crédito do SRD 5.2 (está no fim da ficha) na bio ou na legenda.
