#!/usr/bin/env bash
# ARENA D20 — gera um episódio completo a partir do JSON do episódio:
#   dados/ficha → áudio → vídeo (Remotion) → master (-14 LUFS) → sprite sheets
#
# Uso:   scripts/arena.sh [remotion/src/arena/episodios/ep01.json]
# Saída: remotion/out/arena-epNN-master.mp4  e  arena-d20/epNN/ (FICHA.md, campeao.json, sprites/)
# Sem internet para baixar o Chrome do Remotion? Exporte CHROME=/caminho/do/chrome-headless-shell
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
EP="$(cd "$(dirname "${1:-$RAIZ/remotion/src/arena/episodios/ep01.json}")" && pwd)/$(basename "${1:-ep01.json}")"
NN=$(python3 -c "import json;print(str(json.load(open('$EP'))['numero']).zfill(2))")
CHROME_ARG=()
[ -n "${CHROME:-}" ] && CHROME_ARG=(--browser-executable="$CHROME")

cd "$RAIZ/remotion"
SEED=$(python3 -c "import json;print(json.load(open('$EP')).get('seed',''))")
if [ -z "$SEED" ]; then
  echo "▸ 0/5 escolhendo a seed pelo ritmo (≥ 35 turnos, duelo de 3 a 8, sem compressão)"
  node --no-warnings scripts/escolher-seed.ts "$EP" | tail -2
fi
echo "▸ 1/5 simulação, ficha e eventos de áudio"
node --no-warnings scripts/arena.ts "$EP"
echo "▸ 2/5 trilha e efeitos"
python3 "$RAIZ/audio/arena.py" "$NN"
echo "▸ 3/5 vídeo (2700 quadros)"
npx remotion render ArenaD20 "out/arena-ep$NN.mp4" --props="$EP" --image-format=png --crf=16 "${CHROME_ARG[@]}"
echo "▸ 4/5 masterização"
"$RAIZ/scripts/masterizar.sh" "out/arena-ep$NN.mp4"
echo "▸ 5/5 sprite sheets e retratos"
SPR="$RAIZ/arena-d20/ep$NN/sprites"
rm -rf "$SPR" && mkdir -p "$SPR"
npx remotion render ArenaFolhas "$SPR" --props="$EP" --sequence --image-format=png "${CHROME_ARG[@]}"
python3 - "$SPR" "$RAIZ/arena-d20/ep$NN/lutadores.json" <<'PY'
import json, os, sys, unicodedata
pasta, lista = sys.argv[1], json.load(open(sys.argv[2]))
arqs = sorted(f for f in os.listdir(pasta) if f.endswith(".png"))
for i, f in enumerate(arqs):
    l = lista[i]
    nome = unicodedata.normalize("NFD", f"{i+1:02d}-{l['nome']}-{l['classe']}").encode("ascii", "ignore").decode().lower()
    os.rename(os.path.join(pasta, f), os.path.join(pasta, nome + ".png"))
PY
echo "✓ remotion/out/arena-ep$NN-master.mp4"
