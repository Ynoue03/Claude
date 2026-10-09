#!/usr/bin/env bash
# ANIME PIXEL ARENA — gera um episódio completo: simulação → áudio → vídeo → masterização.
#
# Uso: scripts/arena.sh [episodio.json] [nome]
#   episodio.json  campos que mudam em relação a remotion/src/arena/arena-padrao.json
#                  (ex.: {"seed": 7, "vencedor": "GOJO"}); vazio = episódio padrão
#   nome           nome do arquivo de saída (padrão: arena)
# Saída: remotion/out/<nome>.mp4 e remotion/out/<nome>-master.mp4 (−14 LUFS / −1 dBTP)
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
EP="${1:-}"
NOME="${2:-arena}"
[ -n "$EP" ] && EP="$(cd "$(dirname "$EP")" && pwd)/$(basename "$EP")"
cd "$RAIZ/remotion"
mkdir -p out public/audio/arena

# 1. simulação fora do navegador → deixas de áudio (mesmo código e seed do vídeo)
npx esbuild src/arena/cli.ts --bundle --platform=node --format=esm --outfile=out/arena-cli.mjs --log-level=warning
node out/arena-cli.mjs "$EP" "out/$NOME-deixas.json"

# 2. trilha + efeitos sincronizados
python3 "$RAIZ/audio/arena.py" "out/$NOME-deixas.json" "public/audio/arena/$NOME.wav"

# 3. props do render = episódio + caminho do áudio
node -e '
const fs = require("fs");
const [ep, nome] = process.argv.slice(1);
const p = ep ? JSON.parse(fs.readFileSync(ep, "utf8")) : {};
p.audio = `audio/arena/${nome}.wav`;
fs.writeFileSync(`out/${nome}-props.json`, JSON.stringify(p));
' "$EP" "$NOME"

# 4. vídeo (usa o Chromium local se o download do Remotion estiver bloqueado)
NAV=()
[ -x /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell ] && \
  NAV=(--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell)
npx remotion render AnimePixelArena "out/$NOME.mp4" --props="out/$NOME-props.json" \
  --jpeg-quality=95 --crf=16 "${NAV[@]}"

# 5. masterização
"$RAIZ/scripts/masterizar.sh" "out/$NOME.mp4"
