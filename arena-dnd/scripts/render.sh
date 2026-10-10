#!/usr/bin/env bash
# Renderiza uma batalha gerada por `npm run batalha` e masteriza o áudio (−14 LUFS).
# Uso: npm run render -- batalha-001
set -euo pipefail
NOME="${1:?informe o nome da batalha, ex.: batalha-001}"
cd "$(dirname "$0")/.."
[ -f "batalhas/$NOME.json" ] || { echo "batalhas/$NOME.json não existe (rode npm run batalha)"; exit 1; }
# sem internet para baixar o Chrome do Remotion: usa o Chromium do Playwright se existir
if [ -z "${CHROME:-}" ]; then
  for c in /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell; do [ -x "$c" ] && export CHROME="$c"; done
fi
mkdir -p out
npx remotion render Arena "out/$NOME.mp4" --props="batalhas/$NOME.json" --concurrency=4
# volume padrão das redes (script do repositório)
if [ -x ../scripts/masterizar.sh ]; then ../scripts/masterizar.sh "out/$NOME.mp4" "out/$NOME-final.mp4"; fi
