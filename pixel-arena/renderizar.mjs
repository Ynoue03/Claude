// Renderiza o episódio: simulação → quadros 1080×1920 → ffmpeg (H.264) + trilha/efeitos sintetizados
// → mux → masterização (−14 LUFS / −1 dBTP).
//
// Uso: node renderizar.mjs [dados/episodio-01.json] [--saida out/anime-pixel-arena.mp4] [--de 0 --ate 2700] [--sem-audio]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simular, TEMPO, FPS } from './src/sim.mjs';
import { criarRenderizador, SAIDA_W, SAIDA_H } from './src/render.mjs';
import { gerarAudio } from './src/audio.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const arqDados = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? 'dados/episodio-01.json';
const dados = JSON.parse(readFileSync(arqDados, 'utf8'));
const saida = opt('--saida', 'out/anime-pixel-arena.mp4');
const de = +opt('--de', 0), ate = +opt('--ate', TEMPO.total);
mkdirSync(dirname(saida), { recursive: true });

console.log(`▶ simulando (seed ${dados.seed}${dados.vencedor ? `, vencedor forçado: ${dados.vencedor}` : ''})…`);
const sim = simular(dados);
console.log(`  vencedor: ${dados.lutadores[sim.vencedor].nome} · eliminações: ${sim.anuncios.map((a) => `${dados.lutadores[a.i].nome}@${(a.f0 / FPS).toFixed(1)}s`).join(', ')}`);
writeFileSync(saida.replace(/\.mp4$/, '-roteiro.json'), JSON.stringify({
  vencedor: dados.lutadores[sim.vencedor].nome,
  eliminacoes: sim.anuncios.map((a) => ({ segundo: +(a.f0 / FPS).toFixed(2), lutador: dados.lutadores[a.i].nome, por: dados.lutadores[a.por].nome })),
  cutins: sim.cutins.map((c) => ({ segundo: +(c.f0 / FPS).toFixed(2), lutador: c.duplo ? c.duplo.map((i) => dados.lutadores[i].nome).join(' VS ') : dados.lutadores[c.i].nome, golpe: c.golpe?.nome ?? 'FINAL DUEL' })),
}, null, 2));

const semAudio = args.includes('--sem-audio');
const wav = saida.replace(/\.mp4$/, '.wav');
if (!semAudio) {
  console.log('▶ sintetizando trilha e efeitos…');
  writeFileSync(wav, gerarAudio(sim, dados, { de, ate }));
}

const video = saida.replace(/\.mp4$/, '-video.mp4');
console.log(`▶ renderizando quadros ${de}–${ate - 1}…`);
const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${SAIDA_W}x${SAIDA_H}`, '-r', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video], { stdio: ['pipe', 'inherit', 'inherit'] });
const r = criarRenderizador(dados, sim);
const t0 = Date.now();
for (let f = de; f < ate; f++) {
  const buf = r.quadro(f);
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  if (!ff.stdin.write(Buffer.from(b))) await new Promise((ok) => ff.stdin.once('drain', ok));
  if ((f - de) % 150 === 0) process.stdout.write(`  ${((f - de) / (ate - de) * 100).toFixed(0)}% (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
}
ff.stdin.end();
await new Promise((ok, erro) => ff.on('close', (c) => (c === 0 ? ok() : erro(new Error('ffmpeg falhou')))));

if (semAudio) { execFileSync('mv', [video, saida]); console.log(`✓ ${saida}`); process.exit(0); }
// pré-limitação: leva a mix para perto de −14 LUFS com picos abaixo de −1,5 dBFS (a masterização fecha em −1 dBTP)
const lufs = await new Promise((ok) => { const p = spawn('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128', '-f', 'null', '-']); let e = ''; p.stderr.on('data', (d) => (e += d)); p.on('close', () => ok(+(/I:\s+(-?[\d.]+) LUFS/.exec(e.split('Summary:')[1] ?? '')?.[1] ?? -16))); });
const wavLim = wav.replace(/\.wav$/, '-lim.wav');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', `volume=${(-14 - lufs + 2).toFixed(2)}dB,alimiter=limit=0.6:attack=1:release=50:level=false`, wavLim]);
const bruto = saida.replace(/\.mp4$/, '-bruto.mp4');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-i', wavLim, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', bruto]);
console.log('▶ masterizando (−14 LUFS, −1 dBTP)…');
execFileSync(resolve(AQUI, '../scripts/masterizar.sh'), [bruto, saida], { stdio: 'inherit' });
console.log(`✓ ${saida}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
