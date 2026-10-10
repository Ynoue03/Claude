// Definição visual dos 16 lutadores — cores (rampas próprias com hue shifting), cabelo em mechas,
// roupa e acessórios. Tudo desenhado do zero por código; nenhum pixel copiado de jogos oficiais.
//
// Camadas de acessórios (ordem de desenho): fundo → maoLonge → casaco → roupa → atrasCabeca →
// cabeca → topo → frente; e ainda 'manopla' (antebraço) e 'pe'.
import { hex } from '../img.mjs';

const R = Math.round;
export const PERSONAGENS = {};
const def = (d) => (PERSONAGENS[d.id] = d);

// ───────── utilitários compartilhados ─────────
const hxy = (c) => [c.hx ?? c.p.hx, c.hy ?? c.p.hy, c.e ?? 1];
const emCombate = (c) => ['ataque', 'especial'].includes(c.estado?.anim);

// marcas paralelas na bochecha (bigodes do Naruto, marcas do Itadori)
function riscosBochecha(t, g, cor, n = 3, larg = 3) {
  for (const ol of g.olhos) {
    if (g.lado && ol.longe) continue;
    const w = Math.max(2, R(larg * g.e * 0.8));
    const bx = ol.lado < 0 ? ol.x - R(g.e) : ol.x + ol.w - w + R(g.e);
    const passo = g.e >= 1.5 ? Math.max(2, R(1.4 * g.e)) : 2;
    const linhas = g.e >= 1.5 ? n : 2;
    for (let k = 0; k < linhas; k++) {
      const by = g.oy + g.eh + 1 + k * passo;
      for (let i = 0; i < w; i++) t.d(bx + i, by + (g.e >= 1.5 && ((ol.lado < 0 && i === 0) || (ol.lado > 0 && i === w - 1)) ? 1 : 0), cor);
    }
  }
}
function bainha(t, c, x0, y0, x1, y1, matBainha, matCabo) {
  const b = t.parte(c.M[matBainha], { limiar: 99 });
  t.capsula(b, x0, y0, x1, y1, 1.3);
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  const cb = t.parte(c.M[matCabo], { limiar: 99 });
  t.capsula(cb, x0 - (dx / L) * 1, y0 - (dy / L) * 1, x0 - (dx / L) * 5, y0 - (dy / L) * 5, 1.2);
  for (let i = 1; i < 5; i += 2) t.dTom(x0 - (dx / L) * i, y0 - (dy / L) * i, 0);
}
function faixaTesta(t, c, mat, y, alt = 3) {
  const [hx, hy, e] = hxy(c);
  const id = t.parte(c.M[mat], { limiar: 99 });
  const off = c.vista === 'lado' ? 0.5 * e : 0;
  t.poli(id, [[hx - 10.7 * e + off, hy + y * e], [hx + 10.7 * e + off, hy + y * e], [hx + 10.5 * e + off, hy + (y + alt) * e], [hx - 10.5 * e + off, hy + (y + alt) * e]]);
  return id;
}
// xadrez de 2 px (haori do Tanjiro)
const xadrez = (M, a, b, tam = 2) => (x, y) => ((Math.floor(x / tam) + Math.floor(y / tam)) % 2 ? M[a] : M[b]);

// ═════════════ NARUTO ═════════════
def({
  id: 'naruto', estilo: 'energia',
  cores: { cabelo: '#F6C833', roupa: '#F27A1A', roupa2: '#2B2B3D', calca: '#F27A1A', sapato: '#2F56A8', olho: '#2F8EEA', bandana: '#2E4F9E', metal: '#C3CCD8' },
  cabelo: {
    espetos: [[-95, 6, 6, -10], [-70, 8, 7, -8], [-45, 9, 7, -4], [-18, 10, 7, -3], [8, 10, 7, 3], [33, 9, 7, 6], [58, 9, 7, 8], [84, 7, 6, 12], [-120, 5, 5, -10]],
    franja: [[-6.5, 5, 5, -1], [-2, 6, 5, 0], [2.5, 5, 5, 1], [7, 4, 4, 2]],
    laterais: [[-1, 7, 4], [1, 7, 4]],
  },
  tronco: { gola: 'alta', matFn: (c) => (x, y) => (y < c.p.ombroY + 2 ? c.M.roupa2 : c.M.roupa) },
  braco: { manga: 'longa' },
  perna: { tipo: 'longa', larga: 0.3 },
  rosto: () => ({ semBlush: true, marcas: (t, g) => riscosBochecha(t, g, hex('#8A503C'), 3, 3) }),
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    const [hx, hy, e] = hxy(c);
    if (camada === 'cabeca' && vista !== 'costas') {
      faixaTesta(t, c, 'bandana', -7.2, 3);
      const pl = t.parte(M.metal, { limiar: 3, rim: false });
      const px = hx + (vista === 'lado' ? -2.5 * e : 0), y0 = hy - 8 * e;
      t.ret(pl, R(px - 4 * e), R(y0 + 0.5 * e), R(8 * e), R(3.6 * e));
      const esc = t.tom(M.metal, 0), br = t.tom(M.metal, 4);
      const cx = R(px), cy = R(y0 + 2.3 * e);
      t.d(cx, cy, esc); t.d(cx - 1, cy, esc); t.d(cx, cy - 1, esc);
      if (e > 1.5) { t.d(cx + 1, cy + 1, esc); t.d(cx - 2, cy + 1, esc); t.d(cx + 2, cy - 1, esc); t.d(cx + 1, cy - 2, esc); }
      t.d(R(px - 3.4 * e), R(y0 + 1 * e), br);
      t.d(R(px + 3 * e), R(y0 + 3.4 * e), esc);
    }
    if (camada === 'cabeca' && vista === 'costas') { faixaTesta(t, c, 'bandana', -6.5, 3); }
    if (camada === 'roupa' && vista !== 'costas') {
      const z = hex('#F2EEE6');
      for (let y = R(p.ombroY - 1); y < p.cinturaY + 1; y++) t.d(R(p.cx - (vista === 'lado' ? 2 : 0)), y, y % 2 ? z : t.tom(M.roupa, 0));
    }
  },
});

// ═════════════ SASUKE ═════════════
def({
  id: 'sasuke', estilo: 'soco',
  cores: { cabelo: '#2C2E4A', roupa: '#E6E4EE', calca: '#38324E', sapato: '#38324E', corda: '#8456C2', olho: '#34343F', sharingan: '#DA2A30' },
  olhoEspecial: 'sharingan',
  cabelo: {
    espetos: [[-60, 5, 7, 8], [-25, 6, 8, 25], [10, 8, 8, 35], [40, 10, 8, 40], [70, 10, 7, 35], [100, 8, 6, 30], [125, 6, 5, 25]],
    franja: [[-7, 9, 5, -1], [-3, 6, 5, 0], [3, 6, 4, 1], [7.5, 9, 5, 1]],
    laterais: [[-1, 10, 4, -0.5], [1, 10, 4, -0.5]],
    linha: -6,
  },
  tronco: { gola: 'v', golaFundo: 6, cinto: 'corda', cintoAlt: 3 },
  braco: { manga: 'longa', punho: 'calca' },
  perna: { tipo: 'longa', larga: 0.5 },
  rosto: (c) => ({ sharingan: !!c.estado?.especial }),
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    if (camada === 'roupa' && vista !== 'costas') {
      // nó da corda roxa + pontas penduradas
      const n = t.parte(M.corda, { limiar: 99 });
      const x = p.cx + (vista === 'lado' ? -3 : -2);
      t.elipse(n, x, p.cinturaY, 2.2, 1.8);
      t.capsula(n, x - 0.5, p.cinturaY + 1, x - 1.5, p.cinturaY + 6, 0.9);
      t.capsula(n, x + 0.5, p.cinturaY + 1, x + 1.5, p.cinturaY + 5, 0.9);
    }
  },
});

// ═════════════ GOKU ═════════════
def({
  id: 'goku', estilo: 'energia',
  cores: { cabelo: '#24222F', ouro: '#FFD93B', roupa: '#F47A1E', azul: '#2D52AA', calca: '#F47A1E', sapato: '#2D52AA', olho: '#24242C', olhoSSJ: '#3FC9B6' },
  olhoEspecial: 'olhoSSJ',
  cabelo: {
    espetos: [[-115, 7, 7, -18], [-85, 10, 8, -14], [-55, 11, 8, -8], [-25, 12, 8, -3], [8, 12, 8, 4], [40, 11, 8, 9], [70, 10, 8, 13], [100, 7, 7, 16], [130, 5, 6, 18]],
    franja: [[-5, 7, 5, -3], [0, 8, 4, 0], [4.5, 6, 4, 3]],
    laterais: [[-1, 5, 4], [1, 5, 4]],
  },
  cabeloEspecial: {
    mat: 'ouro',
    espetos: [[-90, 8, 7, -25], [-60, 12, 8, -15], [-32, 15, 8, -6], [-8, 16, 8, -1], [16, 15, 8, 4], [42, 13, 8, 12], [70, 10, 7, 20], [100, 7, 6, 25]],
    franja: [[-2, 9, 4, -2], [3, 5, 4, 2]],
    laterais: [[-1, 5, 4], [1, 5, 4]],
  },
  tronco: { gola: 'v', golaMat: 'azul', golaFundo: 6, cinto: 'azul', cintoAlt: 3 },
  braco: { manga: 'curta', mat: 'azul', comprManga: 0.55, punho: 'azul' },
  perna: { tipo: 'longa', larga: 0.7, boca: 0.4, meia: 3, meiaMat: 'azul' },
  rosto: (c) => ({ raiva: !!c.estado?.especial }),
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    if (camada === 'roupa' && vista !== 'costas') {
      // símbolo no peito: círculo branco com traço
      const x = R(p.cx + (vista === 'lado' ? 1 : 3.5)), y = R(p.ombroY + 3);
      const br = hex('#F4F1E8'), k = hex('#2A2A30');
      for (const [dx, dy] of [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [2, 0], [0, 1], [1, 1]]) t.d(x + dx, y + dy, br);
      t.d(x, y, k); t.d(x + 1, y, k);
    }
    if (camada === 'roupa' && vista === 'costas') {
      const x = R(p.cx), y = R(p.ombroY + 4), br = hex('#F4F1E8');
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) t.d(x + dx, y + dy, br);
    }
  },
});

// ═════════════ VEGETA ═════════════
def({
  id: 'vegeta', estilo: 'energia',
  cores: { cabelo: '#25222F', ouro: '#FFD93B', roupa: '#2D3F98', armadura: '#F2F0EA', amarelo: '#E3B43A', calca: '#2D3F98', luva: '#F2F0EA', sapato: '#F2F0EA', olho: '#22222A', olhoSSJ: '#3FC9B6' },
  olhoEspecial: 'olhoSSJ',
  cabelo: {
    espetos: [[-42, 13, 8, 6], [-20, 16, 8, 3], [2, 17, 9, 0], [24, 15, 8, -3], [45, 12, 7, -6], [-65, 8, 6, 10], [66, 8, 6, -10]],
    linha: -8, bico: 3.5, semBrilho: false,
  },
  cabeloEspecial: {
    mat: 'ouro',
    espetos: [[-42, 14, 8, 6], [-20, 17, 8, 3], [2, 18, 9, 0], [24, 16, 8, -3], [45, 13, 7, -6], [-65, 9, 6, 10], [66, 9, 6, -10]],
    linha: -8, bico: 3.5,
  },
  tronco: { cinto: 'amarelo', cintoAlt: 1 },
  braco: { manga: 'longa', luva: 'luva', punho: 'luva' },
  perna: { tipo: 'longa', meia: 4, meiaMat: 'sapato' },
  rosto: () => ({ raiva: true }),
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    if (camada === 'roupa') {
      // couraça branca com ombreiras amarelas
      const a = t.parte(M.armadura, { limiar: 6 });
      const w = p.ws / 2 + 0.5;
      t.poli(a, [[p.cx - w, p.ombroY - 1], [p.cx + w, p.ombroY - 1], [p.cx + p.wc / 2 + 0.5, p.cinturaY - 2], [p.cx - p.wc / 2 - 0.5, p.cinturaY - 2]]);
      const o = t.parte(M.amarelo, { limiar: 99 });
      t.elipse(o, p.cx - w + 1, p.ombroY, 2.6, 1.8);
      t.elipse(o, p.cx + w - 1, p.ombroY, 2.6, 1.8);
      if (vista !== 'costas') {
        t.dTom(p.cx, p.ombroY + 2, 1); t.dTom(p.cx, p.ombroY + 3, 1); t.dTom(p.cx - 3, p.cinturaY - 4, 1); t.dTom(p.cx + 3, p.cinturaY - 4, 1);
        t.d(R(p.cx - 3), R(p.ombroY + 1), t.tom(M.armadura, 4));
      }
    }
    if (camada === 'pe') { const { b } = c; t.d(R(b.p[0] - (vista === 'lado' ? 4 : 1)), R(b.p[1] + 1), t.tom(M.amarelo, 2)); t.d(R(b.p[0] - (vista === 'lado' ? 3 : 0)), R(b.p[1] + 1), t.tom(M.amarelo, 1)); }
  },
});

// ═════════════ LUFFY ═════════════
def({
  id: 'luffy', estilo: 'soco',
  pele: '#F1C39A',
  cores: { cabelo: '#201E2A', roupa: '#D92B33', faixa: '#EBC23C', calca: '#3E66BA', sapato: '#9A6238', chapeu: '#E9C66C', fita: '#C42B2E', olho: '#22222B', cicatriz: '#B0503E', gear: '#F49A9A' },
  peleEspecial: 'gear',
  cabelo: {
    espetos: [[-100, 4, 6, -20], [-70, 5, 7, -12], [70, 5, 7, 12], [100, 4, 6, 20]],
    franja: [[-6.5, 6, 5, -1], [-2, 7, 5, -1], [2.5, 6, 5, 1], [6.8, 6, 4, 2]],
    laterais: [[-1, 6, 4], [1, 6, 4]],
    semBrilho: true,
  },
  tronco: { gola: 'v', golaFundo: 12, cinto: 'faixa', cintoAlt: 2, matFn: (c) => (x) => (Math.abs(x + 0.5 - (c.p.cx - (c.vista === 'lado' ? 2 : 0))) < 2.6 && c.vista !== 'costas' ? c.M.pele : c.M.roupa) },
  braco: { manga: 'curta', comprManga: 0.6 },
  perna: { tipo: 'curta', acimaJoelho: -1, larga: 0.6, sola: false },
  rosto: () => ({
    marcas: (t, g) => {
      // cicatriz sob o olho esquerdo (lado direito da imagem): 2 pontos de sutura
      const ol = g.olhos[1];
      const x = ol.x + R(ol.w / 2) - 1, y = g.oy + g.eh + 1;
      const c = hex('#9A3A2E');
      t.d(x, y, c); t.d(x, y + 1, c); t.d(x - 1, y + 1, c); t.d(x + 1, y + 1, c);
      if (g.e > 1.5) { t.d(x, y + 2, c); t.d(x - 2, y + 1, c); t.d(x + 2, y + 1, c); t.d(x, y + 3, c); }
    },
  }),
  acessorios(t, c, camada) {
    const { p, M, vista, estado } = c;
    const [hx, hy, e] = hxy(c);
    if (camada === 'roupa' && vista !== 'costas') {
      // cicatriz em X no peito
      const x = R(p.cx - (vista === 'lado' ? 2 : 0)), y = R(p.ombroY + 4), k = t.tom(M.cicatriz, 1);
      for (let i = -2; i <= 2; i++) { t.d(x + i, y + i, k); t.d(x + i, y - i, k); }
    }
    if (camada === 'topo') {
      // chapéu de palha: aba + copa + fita vermelha, trama da palha
      const off = vista === 'lado' ? 1 * e : 0;
      const aba = t.parte(M.chapeu, { limiar: 99 });
      t.elipse(aba, hx + off, hy - 7.5 * e, 15 * e, 4.4 * e);
      const copa = t.parte(M.chapeu, { limiar: 6 });
      t.elipse(copa, hx + off, hy - 11.5 * e, 9 * e, 6.5 * e);
      t.ret(copa, R(hx + off - 9 * e), R(hy - 11.5 * e), R(18 * e), R(3.5 * e));
      const f = t.parte(M.fita, { limiar: 99 });
      t.ret(f, R(hx + off - 9 * e), R(hy - 10.5 * e), R(18 * e) + 1, Math.max(2, R(2.4 * e)), copa);
      for (let x = R(hx - 14 * e); x < hx + 15 * e; x += Math.max(2, R(2 * e))) t.dTom(x, R(hy - 6.2 * e), 1);
      for (let x = R(hx - 7 * e); x < hx + 8 * e; x += Math.max(3, R(3 * e))) t.dTom(x, R(hy - 15 * e), 1);
    }
    if (camada === 'pe') {
      // sandálias: tira sobre o pé de pele
      const { b } = c;
      const pe = t.parte(M.pele, { limiar: 99 });
      t.elipse(pe, b.p[0] - (vista === 'lado' ? 1.6 : 0), b.p[1] + 1.2, vista === 'lado' ? 3.6 : 3, 1.9);
      const s = t.parte(M.sapato, { limiar: 99 });
      t.ret(s, R(b.p[0] - 3), R(b.p[1] + 2.5), 6, 1);
      t.ret(s, R(b.p[0] - 1 - (vista === 'lado' ? 1 : 0)), R(b.p[1]), 2, 2);
    }
    if (camada === 'frente' && estado?.especial && c.estado.quadro >= 2) {
      // Gear Second: vapor saindo do corpo
      const v = t.parte(M.chapeu, { limiar: 99, semContorno: true });
      void v;
    }
  },
});

// ═════════════ ZORO ═════════════
def({
  id: 'zoro', estilo: 'espada',
  cores: { cabelo: '#5DBF6C', roupa: '#F1F1EC', haramaki: '#2F7D3F', calca: '#2A2A34', sapato: '#2A2A34', bandana: '#1E1E28', olho: '#2A2A31', ouro: '#EBC244', caboW: '#F0EEE6', caboR: '#C23A3A', caboP: '#2E2E3A' },
  arma: { lamina: 17, caboMat: 'caboW', guardaMat: 'ouro' },
  cabelo: {
    espetos: [[-80, 3, 6, -10], [-50, 4, 7, -5], [-20, 4, 7, 0], [10, 4, 7, 0], [40, 4, 7, 5], [70, 3, 6, 10]],
    franja: [[-5, 3, 6, 0], [1, 3, 6, 0], [6, 3, 5, 1]],
    calota: { dy: -2, ry: 10 }, linha: -7,
  },
  tronco: { gola: 'v', golaFundo: 4, cinto: 'haramaki', cintoAlt: 5 },
  braco: { manga: 'curta', comprManga: 0.7 },
  perna: { tipo: 'longa', larga: 0.5, meia: 4, meiaMat: 'sapato' },
  rosto: () => ({
    olhoTipo: (ol) => (ol.lado > 0 ? 'fechado' : undefined),
    marcas: (t, g) => {
      // cicatriz vertical sobre o olho esquerdo (lado direito da imagem)
      const ol = g.olhos[1], c = hex('#8E3A35');
      const x = ol.x + R(ol.w / 2);
      for (let y = g.oy - R(2 * g.e); y <= g.oy + g.eh + R(1 * g.e); y++) t.d(x, y, c);
    },
  }),
  acessorios(t, c, camada) {
    const { p, M, vista, estado } = c;
    const [hx, hy, e] = hxy(c);
    const atacando = emCombate(c);
    if (camada === 'fundo' && !atacando) {
      // três katanas na cintura (lado esquerdo do corpo)
      const x = p.cx + (vista === 'lado' ? 3 : 7), y = p.cinturaY;
      bainha(t, c, x - 1, y - 2, x + 9, y + 9, 'caboP', 'caboW');
      bainha(t, c, x + 1, y - 3, x + 11, y + 7, 'caboR', 'caboP');
      bainha(t, c, x + 2, y - 1, x + 10, y + 11, 'caboP', 'caboR');
    }
    if (camada === 'cabeca' && vista !== 'costas') {
      // três brincos dourados na orelha esquerda (lado direito da imagem)
      const ox = vista === 'lado' ? hx + 6 * e : hx + 10.5 * e;
      for (let i = 0; i < 3; i++) t.dForte(R(ox), R(hy + (2.5 + i * 1.4) * e), t.tom(M.ouro, 3), t.parte(M.ouro, { limiar: 99 }));
    }
    if (camada === 'maoLonge' && atacando && vista === 'lado') {
      // segunda espada na mão de trás
      const ang = [320, 200, 150, 170][c.p.fase ?? 0];
      armaDe(t, c, c.p.bE.m, ang, { lamina: 15, caboMat: 'caboR', guardaMat: 'ouro' });
    }
    if (camada === 'frente' && atacando && vista === 'lado') {
      // terceira espada na boca (Santoryu)
      const x = hx - 4 * e, y = hy + 7.5 * e;
      const l = t.parte(M.metal, { limiar: 99, rim: false });
      t.ret(l, R(x - 12), R(y), 9, 1);
      const cb = t.parte(M.caboP, { limiar: 99 });
      t.ret(cb, R(x - 3), R(y), 6, 1);
      t.d(R(x - 10), R(y), 0xffffffff);
    }
    if (camada === 'roupa') {
      // bandana preta amarrada no braço esquerdo
      const b = vista === 'lado' ? null : c.p.bD;
      if (b) {
        const id = t.parte(M.bandana, { limiar: 99 });
        t.capsula(id, b.o[0] + 0.5, b.o[1] + 1.5, b.o[0] + 1, b.o[1] + 2.5, 2.9);
      }
    }
    void estado;
  },
});

// ═════════════ ICHIGO ═════════════
def({
  id: 'ichigo', estilo: 'espada',
  cores: { cabelo: '#F38A2C', roupa: '#24232E', branco: '#EEEDE6', calca: '#24232E', sapato: '#EEEDE6', olho: '#6E4A2C', faixa: '#F0EEE6', tira: '#B53A30', metal: '#B8C1CC' },
  arma: { lamina: 21, cutelo: 3.6, caboMat: 'faixa', guardaMat: 'calca', faixa: 'faixa', cabo: 5 },
  cabelo: {
    espetos: [[-110, 6, 6, -16], [-80, 8, 7, -12], [-50, 9, 8, -6], [-20, 10, 8, -2], [12, 10, 8, 4], [42, 9, 8, 9], [72, 8, 7, 14], [102, 6, 6, 18]],
    franja: [[-6, 7, 5, -2], [-1, 8, 5, -1], [4, 7, 5, 1], [7.5, 5, 4, 2]],
    laterais: [[-1, 7, 4], [1, 7, 4]],
  },
  tronco: { gola: 'v', golaMat: 'branco', golaFundo: 7, cinto: 'branco', cintoAlt: 2 },
  braco: { manga: 'longa' },
  perna: { tipo: 'longa', larga: 1.3, boca: 0.8 },
  rosto: () => ({ raiva: true }),
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    const atacando = emCombate(c) || c.p.arma;
    if (camada === 'fundo' && !atacando) {
      // Zangetsu nas costas, na diagonal
      const lado = vista === 'lado';
      armaDe(t, c, [p.cx + (lado ? 7 : 8), p.ombroY - 6], lado ? 105 : 115, { lamina: 23, cutelo: 3.6, caboMat: 'faixa', guardaMat: 'calca', cabo: 5 });
    }
    if (camada === 'roupa' && !atacando) {
      // tira vermelha cruzando o peito
      const tr = t.parte(M.tira, { limiar: 99 });
      t.capsula(tr, p.cx - p.ws / 2 + 1, p.ombroY - 1, p.cx + p.wc / 2, p.cinturaY - 2, 0.9);
    }
  },
});

// ═════════════ TANJIRO ═════════════
def({
  id: 'tanjiro', estilo: 'espada',
  cores: { cabelo: '#6E2430', ponta: '#B4402F', verde: '#2F9460', preto: '#1F2026', roupa: '#24252F', calca: '#24252F', sapato: '#EDEBE3', branco: '#EDEBE3', olho: '#B4442F', caixa: '#A9764A', lamina: '#2E2E38', cicatriz: '#A5402F' },
  arma: { lamina: 16, mat: 'lamina', caboMat: 'preto', guardaMat: 'metal' },
  cabelo: {
    espetos: [[-105, 6, 6, -14], [-75, 7, 7, -10], [-45, 8, 8, -5], [-15, 9, 8, -1], [15, 9, 8, 3], [45, 8, 8, 7], [75, 7, 7, 12], [105, 6, 6, 15]],
    franja: [[-6, 6, 5, -2], [-1.5, 5, 4, -1], [6, 6, 5, 2]],
    laterais: [[-1, 6, 4], [1, 6, 4]],
    pontaMat: 'ponta', pontaRaio: 14, linha: -6.5,
  },
  tronco: { cinto: 'branco', cintoAlt: 2, matFn: (c) => { const f = xadrez(c.M, 'verde', 'preto'); return (x, y) => (Math.abs(x + 0.5 - (c.p.cx - (c.vista === 'lado' ? 2 : 0))) < 2.6 && c.vista !== 'costas' ? c.M.roupa : f(x, y)); } },
  braco: { manga: 'longa', mat: 'verde', padrao: (c, x, y) => xadrez(c.M, 'verde', 'preto')(x, y) },
  perna: { tipo: 'longa', meia: 5, meiaMat: 'branco' },
  rosto: () => ({
    marcas: (t, g) => {
      if (g.lado) return;
      // cicatriz na testa (lado esquerdo dele = direita da imagem)
      const c = hex('#A3402F');
      const x = R(g.hx + 3 * g.e), y = R(g.hy - 6 * g.e);
      for (let j = 0; j < Math.max(2, R(2 * g.e)); j++) for (let i = 0; i < Math.max(2, R(3 * g.e)); i++) if ((i + j) % 3 !== 2) t.d(x + i, y + j, c);
    },
  }),
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    const [hx, hy, e] = hxy(c);
    if (camada === 'fundo') {
      // caixa de madeira nas costas
      const cx = p.cx + (vista === 'lado' ? 6 : 0), y0 = p.ombroY - 10;
      const cx2 = t.parte(M.caixa, { limiar: 6 });
      t.ret(cx2, R(cx - 7), R(y0), 14, 19);
      for (let y = R(y0) + 4; y < y0 + 19; y += 5) for (let x = R(cx - 7); x < cx + 7; x++) t.dTom(x, y, 0);
      t.dTom(R(cx - 6), R(y0 + 1), 3); t.dTom(R(cx - 5), R(y0 + 1), 3);
      if (vista === 'costas') { for (let y = R(y0); y < y0 + 19; y++) t.dTom(R(cx), y, 1); }
    }
    if (camada === 'casaco') {
      // abas do haori abaixo da cintura
      const h = t.parte(M.verde, { limiar: 99, pano: true, matFn: xadrez(M, 'verde', 'preto') });
      const y0 = p.cinturaY, w = p.wq / 2 + 1.5;
      t.poli(h, [[p.cx - w, y0], [p.cx + w, y0], [p.cx + w + 1.5, y0 + 9], [p.cx - w - 1.5, y0 + 9]]);
      if (vista !== 'costas') for (let y = R(y0); y < y0 + 10; y++) t.limpa(R(p.cx - (vista === 'lado' ? 2 : 0)), y), t.limpa(R(p.cx - (vista === 'lado' ? 2 : 0)) + 1, y);
    }
    if (camada === 'fundo' && vista === 'lado' && !emCombate(c)) bainha(t, c, p.cx - 2, p.cinturaY - 1, p.cx - 11, p.cinturaY + 8, 'preto', 'preto');
    if (camada === 'cabeca' && vista !== 'costas') {
      // brincos hanafuda
      for (const s of vista === 'lado' ? [1] : [-1, 1]) {
        const ox = vista === 'lado' ? hx + 5.8 * e : hx + s * 10.4 * e;
        const id = t.parte(M.branco, { limiar: 99 });
        t.ret(id, R(ox - 0.8 * e), R(hy + 3.6 * e), Math.max(2, R(1.8 * e)), Math.max(3, R(3.4 * e)));
        t.d(R(ox), R(hy + 4.8 * e), hex('#D8333A'));
      }
    }
  },
});

// ═════════════ ZENITSU ═════════════
def({
  id: 'zenitsu', estilo: 'espada',
  cores: { cabelo: '#F8D640', ponta: '#F28C2A', haori: '#F2C230', branco: '#F5F2E6', roupa: '#24252F', calca: '#24252F', sapato: '#F5F2E6', olho: '#A06A26' },
  arma: { lamina: 16, caboMat: 'roupa', guardaMat: 'haori' },
  cabelo: {
    espetos: [[-110, 6, 6, -10], [-80, 8, 7, -8], [-50, 8, 8, -4], [-20, 8, 8, 0], [10, 8, 8, 2], [40, 8, 8, 6], [70, 8, 7, 9], [100, 7, 6, 12]],
    franja: [[-6.5, 7, 5, -2], [-2, 8, 5, -1], [2.5, 7, 5, 1], [7, 7, 4, 2]],
    laterais: [[-1, 9, 4, -0.5], [1, 9, 4, -0.5]],
    pontaMat: 'ponta', pontaRaio: 13.5,
  },
  tronco: {
    cinto: 'branco', cintoAlt: 2,
    matFn: (c) => (x, y) => {
      if (Math.abs(x + 0.5 - (c.p.cx - (c.vista === 'lado' ? 2 : 0))) < 2.6 && c.vista !== 'costas') return c.M.roupa;
      const ly = (y - 1) % 5, lx = ((x % 6) + 6) % 6;
      return ly >= 2 && Math.abs(lx - 2.5) <= (ly - 2) * 1 + 0.5 ? c.M.branco : c.M.haori;
    },
  },
  braco: { manga: 'longa', mat: 'haori' },
  perna: { tipo: 'longa', meia: 5, meiaMat: 'branco' },
  rosto: (c) => ({ olhoTipo: () => (c.estado?.especial ? 'fechado' : undefined) }),
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    if (camada === 'casaco') {
      const h = t.parte(M.haori, { limiar: 99, pano: true, matFn: (x, y) => { const ly = (y - 1) % 5, lx = ((x % 6) + 6) % 6; return ly >= 2 && Math.abs(lx - 2.5) <= ly - 2 + 0.5 ? M.branco : M.haori; } });
      const y0 = p.cinturaY, w = p.wq / 2 + 1.5;
      t.poli(h, [[p.cx - w, y0], [p.cx + w, y0], [p.cx + w + 1.5, y0 + 9], [p.cx - w - 1.5, y0 + 9]]);
      if (vista !== 'costas') for (let y = R(y0); y < y0 + 10; y++) t.limpa(R(p.cx - (vista === 'lado' ? 2 : 0)), y), t.limpa(R(p.cx - (vista === 'lado' ? 2 : 0)) + 1, y);
    }
    if (camada === 'fundo' && vista !== 'costas' && !emCombate(c)) bainha(t, c, p.cx - 2, p.cinturaY - 1, p.cx - 11, p.cinturaY + 8, 'roupa', 'haori');
  },
});

// ═════════════ GOJO ═════════════
def({
  id: 'gojo', estilo: 'energia',
  cores: { cabelo: '#EEF1F8', roupa: '#1D1E2C', calca: '#1D1E2C', sapato: '#1D1E2C', venda: '#14141C', olho: '#55D6FF', olhoSeis: '#7FE6FF' },
  olhoEspecial: 'olhoSeis',
  rampas: { cabelo: { sombraAlvo: 230 } },
  cabelo: {
    espetos: [[-95, 6, 6, -10], [-70, 8, 7, -6], [-45, 11, 8, -3], [-20, 13, 8, -1], [5, 13, 8, 2], [30, 12, 8, 4], [55, 10, 7, 7], [82, 7, 6, 10]],
    franja: [[-6, 4, 5, -1], [-1, 5, 5, 0], [4, 4, 5, 1], [7.5, 4, 4, 2]],
    laterais: [[-1, 6, 4], [1, 6, 4]],
  },
  tronco: { cinto: 'roupa', cintoAlt: 1 },
  braco: { manga: 'longa' },
  perna: { tipo: 'longa', larga: 0.3 },
  rosto: (c) => (c.estado?.especial ? { olhoTipo: () => 'brilho', corLinhaOlho: '#EEF1F8' } : { semSobrancelha: true }),
  acessorios(t, c, camada) {
    const { p, M, vista, estado } = c;
    if (camada === 'cabeca' && !estado?.especial && vista !== 'costas') faixaTesta(t, c, 'venda', -1.2, 5.2);
    if (camada === 'cabeca' && vista === 'costas') faixaTesta(t, c, 'venda', -0.5, 4);
    if (camada === 'roupa') {
      // gola alta
      const g = t.parte(M.roupa, { limiar: 99 });
      t.ret(g, R(p.cx - 4 + (vista === 'lado' ? -1 : 0)), R(p.ombroY - 5), 8, 5);
      if (vista !== 'costas') t.d(R(p.cx - (vista === 'lado' ? 1 : 0)), R(p.ombroY - 1), t.tom(M.metal, 3));
    }
  },
});

// ═════════════ ITADORI ═════════════
def({
  id: 'itadori', estilo: 'soco',
  cores: { cabelo: '#F29AB0', escuro: '#3A2B33', roupa: '#1F2442', capuz: '#C9313B', calca: '#1F2442', sapato: '#C9313B', olho: '#7C4B2E', marca: '#2B1E26' },
  cabelo: {
    espetos: [[-95, 5, 6, -10], [-65, 6, 7, -6], [-35, 7, 8, -3], [-5, 8, 8, 0], [25, 7, 8, 4], [55, 6, 7, 7], [85, 5, 6, 10]],
    franja: [[-5, 5, 5, -2], [0, 6, 5, 0], [5, 5, 5, 2]],
  },
  tronco: { gola: 'redonda', golaMat: 'capuz', cinto: 'roupa', cintoAlt: 1 },
  braco: { manga: 'longa' },
  perna: { tipo: 'longa', larga: 0.4 },
  rosto: (c) => ({
    marcas: c.estado?.especial ? (t, g) => {
      // marcas sob os olhos (Black Flash)
      for (const ol of g.olhos) { if (g.lado && ol.longe) continue; for (let i = 0; i < ol.w; i++) t.d(ol.x + i, g.oy + g.eh + 1 + (i === 0 || i === ol.w - 1 ? 0 : 1) * (g.e > 1.5 ? 1 : 0), hex('#2B1E26')); }
    } : undefined,
  }),
  matFnCabelo: null,
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    const [hx, hy, e] = hxy(c);
    if (camada === 'cabeca') {
      // laterais escuras (undercut) logo acima das orelhas
      for (const s of vista === 'lado' ? [1] : [-1, 1]) {
        const id = t.parte(M.escuro, { limiar: 99 });
        const x = vista === 'lado' ? hx + 5 * e : hx + s * 10 * e;
        t.elipse(id, x, hy - 0.5 * e, 1.4 * e, 2.4 * e, c.partesCabelo);
      }
    }
    if (camada === 'roupa') {
      // capuz vermelho embolado atrás do pescoço
      const id = t.parte(M.capuz, { limiar: 99 });
      t.elipse(id, p.cx + (vista === 'lado' ? 2.5 : 0), p.ombroY - 1, vista === 'lado' ? 4 : 6.5, 2.4);
      if (vista !== 'costas') for (let y = R(p.ombroY + 1); y < p.cinturaY; y++) t.dTom(R(p.cx - (vista === 'lado' ? 2 : 0)), y, 0);
    }
  },
});

// ═════════════ DEKU ═════════════
def({
  id: 'deku', estilo: 'soco',
  cores: { cabelo: '#2D5C3E', roupa: '#3FA16C', preto: '#1F2B25', calca: '#3FA16C', sapato: '#D9323B', luva: '#E8EBEF', olho: '#2F8C4C', mascara: '#9AA3AF', raio: '#7CFF8A' },
  cabelo: {
    cachos: true,
    espetos: [[-70, 3, 6, -8], [-30, 3, 6, 0], [10, 3, 6, 0], [50, 3, 6, 8]],
    franja: [[-6, 5, 5, -1], [-1.5, 6, 5, 1], [3.5, 5, 5, -1], [7.5, 5, 4, 2]],
    laterais: [[-1, 6, 4], [1, 6, 4]],
  },
  tronco: { gola: 'redonda', golaMat: 'preto', cinto: 'preto', cintoAlt: 2 },
  braco: { manga: 'longa', luva: 'luva', punho: 'preto' },
  perna: { tipo: 'longa', larga: 0.3, meia: 1, meiaMat: 'preto' },
  rosto: () => ({
    marcas: (t, g) => {
      // sardas
      const c = hex('#B9805E');
      for (const ol of g.olhos) {
        if (g.lado && ol.longe) continue;
        const bx = ol.lado < 0 ? ol.x : ol.x + ol.w - 3;
        const by = g.oy + g.eh + 1;
        t.d(bx, by, c); t.d(bx + 2, by, c); t.d(bx + 1, by + 1, c);
      }
    },
  }),
  acessorios(t, c, camada) {
    const { p, M, vista, estado } = c;
    if (camada === 'roupa') {
      // aparelho bucal abaixado no pescoço
      const id = t.parte(M.mascara, { limiar: 99 });
      t.ret(id, R(p.cx - 3.5 + (vista === 'lado' ? -1 : 0)), R(p.ombroY - 3), 7, 3);
      if (vista !== 'costas') { t.d(R(p.cx - 2 + (vista === 'lado' ? -1 : 0)), R(p.ombroY - 2), t.tom(M.mascara, 0)); t.d(R(p.cx + 1 + (vista === 'lado' ? -1 : 0)), R(p.ombroY - 2), t.tom(M.mascara, 0)); }
      // linhas pretas do traje
      for (let y = R(p.ombroY); y < p.cinturaY; y += 1) { t.dTom(R(p.cx - p.ws / 2 + 2), y, 0); }
    }
    if (camada === 'frente' && estado?.especial) {
      // raios verdes pelo corpo (One For All)
      const cor = t.tom(M.raio, 3);
      const z = [[p.bD.o[0], p.bD.o[1]], [p.bD.c[0] - 1, p.bD.c[1] - 1], [p.bD.c[0] + 1, p.bD.c[1] + 1], [p.bD.m[0], p.bD.m[1]]];
      for (let i = 0; i < z.length - 1; i++) t.dLinha(R(z[i][0]), R(z[i][1]), R(z[i + 1][0]), R(z[i + 1][1]), cor);
      t.dLinha(R(p.pE.q[0]), R(p.pE.q[1] + 1), R(p.pE.j[0] + 1), R(p.pE.j[1] - 1), cor);
      t.dLinha(R(p.cx - 2), R(p.ombroY + 2), R(p.cx + 2), R(p.cinturaY - 3), cor);
    }
  },
});

// ═════════════ BAKUGO ═════════════
def({
  id: 'bakugo', estilo: 'soco',
  cores: { cabelo: '#F1E3A4', roupa: '#26262F', laranja: '#F07C1E', calca: '#26262F', sapato: '#26262F', olho: '#DA2A2E', mascara: '#16161E', metal: '#BFC7D1' },
  cabelo: {
    espetos: [[-120, 7, 6, -14], [-95, 9, 7, -12], [-70, 10, 7, -8], [-45, 11, 7, -4], [-20, 12, 7, -2], [5, 12, 7, 2], [30, 11, 7, 4], [55, 11, 7, 8], [80, 10, 7, 12], [105, 8, 6, 14], [128, 6, 6, 16]],
    franja: [[-6.5, 6, 4, -2], [-3, 7, 4, -1], [0.5, 6, 4, 0], [4, 7, 4, 1], [7.5, 6, 4, 2]],
    laterais: [[-1, 6, 4, 1], [1, 6, 4, 1]],
  },
  tronco: { cinto: 'laranja', cintoAlt: 2 },
  braco: { manga: 'nenhuma', manopla: true },
  perna: { tipo: 'longa', larga: 0.4 },
  rosto: () => ({
    raiva: true,
    antesOlhos: (t, g) => {
      // máscara preta em volta dos olhos com borda laranja
      for (const ol of g.olhos) {
        const m = Math.max(1, R(g.e * 0.8));
        for (let j = -m; j <= g.eh; j++) for (let i = -m; i < ol.w + m; i++) {
          const ext = ol.lado < 0 ? i < 0 : i >= ol.w;
          if (j > 1 && !ext && j < g.eh) continue;
          if (j === g.eh && !ext) continue;
          t.d(ol.x + i, g.oy + j, ext && j <= 0 ? hex('#F07C1E') : hex('#1A1A22'));
        }
      }
    },
  }),
  acessorios(t, c, camada) {
    const { p, M, vista, b, perto } = c;
    if (camada === 'roupa' && vista !== 'costas') {
      // X laranja no peito
      const x = R(p.cx - (vista === 'lado' ? 2 : 0)), y = R(p.ombroY + 4);
      const k = t.tom(M.laranja, 2), k2 = t.tom(M.laranja, 1);
      for (let i = -4; i <= 4; i++) { t.d(x + i, y + i, k); t.d(x + i, y - i, k); t.d(x + i + 1, y + i, k2); t.d(x + i + 1, y - i, k2); }
    }
    if (camada === 'manopla') {
      // manopla em forma de granada no antebraço
      const g = t.parte(M.laranja, { limiar: 5 });
      t.elipse(g, (b.c[0] + b.m[0]) / 2, (b.c[1] + b.m[1]) / 2, 3.6, 3.4);
      t.dTom(R((b.c[0] + b.m[0]) / 2) - 1, R((b.c[1] + b.m[1]) / 2) - 1, 3);
      const anel = t.parte(M.roupa, { limiar: 99 });
      t.capsula(anel, b.c[0], b.c[1], b.c[0] + (b.m[0] - b.c[0]) * 0.15, b.c[1] + (b.m[1] - b.c[1]) * 0.15, 2.4);
      if (perto) { const pino = t.parte(M.metal, { limiar: 99 }); t.elipse(pino, b.c[0] + 2, b.c[1] - 2, 1, 1); }
    }
  },
});

// ═════════════ TODOROKI ═════════════
def({
  id: 'todoroki', estilo: 'energia',
  cores: { cabelo: '#F2F3F7', vermelho: '#D9353B', roupa: '#2F4F90', cinto: '#5B5248', calca: '#2F4F90', sapato: '#2A2A34', olho: '#6F7883', olho2: '#2FC2C9', queimadura: '#B4464C' },
  rampas: { cabelo: { sombraAlvo: 230 } },
  cabelo: {
    metade: 'vermelho',
    espetos: [[-90, 4, 7, -6], [-60, 5, 8, -4], [-30, 5, 8, -2], [0, 5, 8, 0], [30, 5, 8, 2], [60, 5, 8, 4], [90, 4, 7, 6]],
    franja: [[-7, 9, 5, -1], [-3, 8, 5, 0], [1.5, 9, 5, 1], [6, 8, 5, 1], [9, 6, 4, 1]],
    laterais: [[-1, 9, 4, -0.5], [1, 9, 4, -0.5]],
    linha: -6,
  },
  tronco: { cinto: 'cinto', cintoAlt: 3 },
  braco: { manga: 'longa' },
  perna: { tipo: 'longa', larga: 0.3, meia: 2, meiaMat: 'sapato' },
  rosto: () => ({
    antesOlhos: (t, g) => {
      // cicatriz de queimadura em volta do olho esquerdo (direita da imagem)
      const ol = g.olhos[1];
      const c = hex('#B9474E'), c2 = hex('#9C3A44');
      for (let j = -R(2.5 * g.e); j <= g.eh + R(1.5 * g.e); j++) for (let i = -R(1.5 * g.e); i <= ol.w + R(1.5 * g.e); i++) {
        if ((i * 7 + j * 3) % 11 === 0 && (j < 0 || j > g.eh)) continue;
        t.d(ol.x + i, g.oy + j, (i + j) % 4 === 0 ? c2 : c);
      }
    },
  }),
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    if (camada === 'roupa') {
      // bolsinhas no cinto
      const id = t.parte(M.cinto, { limiar: 99 });
      for (const dx of vista === 'lado' ? [3] : [-5, 4]) t.ret(id, R(p.cx + dx), R(p.cinturaY - 1), 3, 4);
    }
  },
});

// ═════════════ GON ═════════════
def({
  id: 'gon', estilo: 'soco',
  cores: { cabelo: '#1F1E27', ponta: '#2F8C4A', roupa: '#3A9C4C', calca: '#3A9C4C', sapato: '#C9692E', olho: '#6E4A2C', vara: '#9C6B3A', linhaPesca: '#E8E4DA' },
  cabelo: {
    espetos: [[-75, 8, 6, -8], [-50, 11, 7, -6], [-25, 14, 8, -3], [0, 15, 8, 0], [25, 14, 8, 3], [50, 11, 7, 6], [75, 8, 6, 8], [-100, 5, 5, -10], [100, 5, 5, 10]],
    franja: [[-5, 5, 5, -1], [0, 6, 5, 0], [5, 5, 5, 1]],
    pontaMat: 'ponta', pontaRaio: 16.5,
  },
  tronco: { gola: 'redonda', golaMat: 'roupa', cinto: 'calca', cintoAlt: 1 },
  braco: { manga: 'curta', comprManga: 0.8 },
  perna: { tipo: 'curta', acimaJoelho: 1, larga: 0.4, meia: 5, meiaMat: 'sapato' },
  acessorios(t, c, camada) {
    const { p, M, vista } = c;
    if (camada === 'fundo') {
      // vara de pesca nas costas
      const id = t.parte(M.vara, { limiar: 99 });
      const x0 = p.cx + (vista === 'lado' ? 9 : -9), y0 = p.ombroY - 16;
      t.capsula(id, x0, y0, p.cx + (vista === 'lado' ? -2 : 8), p.cinturaY + 2, 0.8, 1.2);
      const r = t.parte(M.metal, { limiar: 99 });
      t.elipse(r, p.cx + (vista === 'lado' ? 0 : 6), p.cinturaY - 2, 1.6, 1.6);
    }
    if (camada === 'roupa' && vista !== 'costas') {
      // bolso e detalhe amarelo da jaqueta
      t.dTom(R(p.cx - 4), R(p.cinturaY - 3), 1); t.dTom(R(p.cx - 3), R(p.cinturaY - 3), 1);
      for (let y = R(p.ombroY - 1); y < p.cinturaY; y++) t.dTom(R(p.cx - (vista === 'lado' ? 2 : 0)), y, 0);
    }
  },
});

// ═════════════ KILLUA ═════════════
def({
  id: 'killua', estilo: 'soco',
  cores: { cabelo: '#EAEDF5', roupa: '#7B4DAA', calca: '#4A4458', sapato: '#7B4DAA', olho: '#3C82DA' },
  rampas: { cabelo: { sombraAlvo: 240 } },
  cabelo: {
    espetos: [[-120, 7, 7, -18], [-95, 9, 8, -14], [-70, 9, 8, -10], [-45, 9, 8, -6], [-20, 9, 8, -2], [5, 9, 8, 3], [30, 9, 8, 7], [55, 9, 8, 11], [80, 9, 8, 14], [105, 8, 7, 18], [128, 6, 6, 20]],
    franja: [[-6.5, 7, 5, -2], [-2, 8, 5, -1], [2.5, 7, 5, 1], [7, 7, 4, 2]],
    laterais: [[-1, 7, 4], [1, 7, 4]],
  },
  cabeloEspecial: {
    espetos: [[-100, 9, 7, -8], [-75, 11, 8, -6], [-50, 12, 8, -4], [-25, 13, 8, -2], [0, 13, 8, 0], [25, 13, 8, 2], [50, 12, 8, 4], [75, 11, 8, 6], [100, 9, 7, 8]],
    franja: [[-6, 5, 5, -2], [-1, 6, 5, 0], [4, 5, 5, 2]],
    laterais: [[-1, 6, 4], [1, 6, 4]],
  },
  tronco: { gola: 'redonda', golaMat: 'roupa', compr: 3, barra: 0.5 },
  braco: { manga: 'longa' },
  perna: { tipo: 'curta', acimaJoelho: 0, larga: 0.5, meia: 3, meiaMat: 'sapato' },
  acessorios(t, c, camada) {
    const { p, vista } = c;
    if (camada === 'roupa' && vista !== 'costas') {
      // gola dupla
      t.dTom(R(p.cx - 3 - (vista === 'lado' ? 1.5 : 0)), R(p.ombroY - 1), 0); t.dTom(R(p.cx + 3 - (vista === 'lado' ? 1.5 : 0)), R(p.ombroY - 1), 0);
    }
  },
});

// espada com definição própria (Zoro 2ª lâmina, Zangetsu nas costas)
import { arma as armaBase } from './corpo.mjs';
function armaDe(t, c, mao, ang, A) { armaBase(t, c, mao, ang, A); }

export const ORDEM = ['naruto', 'sasuke', 'goku', 'vegeta', 'luffy', 'zoro', 'ichigo', 'tanjiro', 'zenitsu', 'gojo', 'itadori', 'deku', 'bakugo', 'todoroki', 'gon', 'killua'];
