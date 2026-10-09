#!/usr/bin/env bash
# Masteriza o áudio de um vídeo para Reels/TikTok/Shorts: -14 LUFS integrado, pico real -1 dBTP.
# O vídeo não é recodificado (cópia direta); só o áudio passa pelo loudnorm (2 passadas, preciso).
#
# Uso: scripts/masterizar.sh entrada.mp4 [saida.mp4]
set -euo pipefail
ENTRADA="$1"
SAIDA="${2:-${ENTRADA%.mp4}-master.mp4}"
ALVO="I=-14:TP=-1:LRA=11"

# 1ª passada: medir
MEDIDAS=$(ffmpeg -hide_banner -nostats -i "$ENTRADA" -af "loudnorm=$ALVO:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
campo() { echo "$MEDIDAS" | grep "\"$1\"" | sed -E 's/.*: "?([^",]*)"?,?/\1/'; }

# 2ª passada: aplicar com as medidas (linear, sem "bombear")
ffmpeg -hide_banner -loglevel error -y -i "$ENTRADA" -c:v copy \
  -af "loudnorm=$ALVO:measured_I=$(campo input_i):measured_TP=$(campo input_tp):measured_LRA=$(campo input_lra):measured_thresh=$(campo input_thresh):offset=$(campo target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 256k "$SAIDA"

echo "✓ $SAIDA"
ffmpeg -hide_banner -nostats -i "$SAIDA" -af ebur128=peak=true -f null - 2>&1 | grep -E " I:| Peak:" | tail -2
