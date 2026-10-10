// Exporta, para cada lutador, as folhas de sprites em PNG + um JSON com o layout:
//   sprites/<id>/folha.png       todas as animações × vistas (normal e "ferido" <30% HP), quadros 64×72
//   sprites/<id>/expressoes.png  as 7 expressões no sprite e no retrato
//   sprites/<id>/retratos.png    cut-in 96×64 (grito), vitória e mini-retratos do HUD 16×16
//   sprites/<id>/folha.json      posição de cada animação na folha
// Uso: node exportar-sprites.mjs [id ...] [--destino sprites] [--escala 1]
import { mkdirSync, writeFileSync } from 'node:fs';
import { Img, hex } from './src/img.mjs';
import { png } from './src/png.mjs';
import { texto } from './src/fonte.mjs';
import { PERSONAGENS, ORDEM } from './src/sprites/personagens.mjs';
import { materiais, montar, retrato, ANIMS, SW, SH } from './src/sprites/corpo.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const destino = opt('--destino', 'sprites');
const escala = +opt('--escala', 1);
const ids = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const lista = ids.length ? ids : ORDEM;
const EXPR = { idle: 'foco', andar: 'foco', ataque: 'grito', especial: 'grito', dano: 'dor', derrota: 'derrota', vitoria: 'vitoria' };
const EXPRESSOES = ['neutra', 'foco', 'grito', 'dor', 'cansado', 'derrota', 'vitoria'];
const LINHAS = [
  ['frente', false, ['idle', 'andar', 'derrota', 'vitoria']],
  ['lado', false, ['idle', 'andar', 'ataque', 'especial', 'dano', 'derrota']],
  ['lado', true, ['idle', 'andar', 'ataque', 'especial', 'dano', 'derrota']],
  ['costas', false, ['idle', 'andar']],
];
const fundo = 0; // transparente

for (const id of lista) {
  const def = PERSONAGENS[id];
  const { mats, M } = materiais(def);
  const dir = `${destino}/${id}`;
  mkdirSync(dir, { recursive: true });
  // ── folha de animações ──
  const layout = { quadro: { w: SW, h: SH, pe: { x: 32, y: 68 } }, animacoes: [] };
  const linhas = [];
  for (const ferido of [false, true]) for (const [vista, flip, anims] of LINHAS) {
    const lin = [];
    for (const anim of anims) {
      const n = ANIMS[anim];
      layout.animacoes.push({ anim, vista: vista === 'lado' ? (flip ? 'direita' : 'esquerda') : vista === 'frente' ? 'baixo' : 'cima', ferido, linha: linhas.length, coluna: lin.length, quadros: n });
      for (let q = 0; q < n; q++) {
        const expr = ferido && (anim === 'idle' || anim === 'andar') ? 'cansado' : EXPR[anim];
        lin.push(montar(def, mats, M, { anim, quadro: q, vista, flip, ferido, expr, especial: anim === 'especial' }));
      }
    }
    linhas.push(lin);
  }
  const cols = Math.max(...linhas.map((l) => l.length));
  const folha = new Img(cols * SW, linhas.length * SH).fill(fundo);
  linhas.forEach((l, j) => l.forEach((s, i) => folha.blit(s, i * SW, j * SH)));
  writeFileSync(`${dir}/folha.png`, png(folha, escala));
  writeFileSync(`${dir}/folha.json`, JSON.stringify(layout, null, 1));
  // ── expressões ──
  const ex = new Img(EXPRESSOES.length * 100, SH + 64 + 14).fill(hex('#2A2440'));
  EXPRESSOES.forEach((e, k) => {
    ex.blit(montar(def, mats, M, { anim: 'idle', quadro: 0, vista: 'frente', expr: e, ferido: e === 'cansado' }), k * 100 + 18, 0);
    ex.blit(retrato(def, mats, M, { expr: e, ferido: e === 'cansado' }), k * 100 + 2, SH);
    texto(ex, e.toUpperCase(), k * 100 + 50, SH + 66, { pequena: true, centro: true, cor: hex('#FFFFFF') });
  });
  writeFileSync(`${dir}/expressoes.png`, png(ex, escala));
  // ── retratos ──
  const rt = new Img(350 + 4 * 18, 104).fill(fundo);
  rt.blit(retrato(def, mats, M, { expr: 'grito', especial: true }), 0, 0);
  rt.blit(retrato(def, mats, M, { expr: 'grito' }), 98, 0);
  rt.blit(retrato(def, mats, M, { w: 150, h: 104, e: 3.1, hx: 75, hy: 50, expr: 'vitoria' }), 196, 0);
  ['neutra', 'foco', 'cansado', 'derrota'].forEach((e, k) => rt.blit(retrato(def, mats, M, { w: 16, h: 16, e: 0.7, hx: 8, hy: 9.5, expr: e, ferido: e === 'cansado' }), 350 + k * 18, 0));
  writeFileSync(`${dir}/retratos.png`, png(rt, escala));
  // contagem de cores da folha (paleta efetiva)
  const cores = new Set();
  for (const c of folha.d) if (c >>> 24) cores.add(c);
  console.log(`✓ ${id.padEnd(9)} ${linhas.length} linhas × ${cols} quadros · ${cores.size} cores na folha`);
}
