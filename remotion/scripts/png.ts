// Encoder PNG mínimo (RGBA 8 bits) usando o zlib do Node.
import { deflateSync } from "zlib";
import { writeFileSync } from "fs";

const tabela = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc = (buf: Buffer) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = tabela[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const bloco = (tipo: string, dados: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const td = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

export const png = (w: number, h: number, rgba: Uint8ClampedArray | Uint8Array): Buffer => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const cru = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    cru[y * (w * 4 + 1)] = 0;
    for (let i = 0; i < w * 4; i++) {
      let v = rgba[y * w * 4 + i];
      if (i % 4 === 3 && v === 254) v = 255; // marca de emissivo vira opaco no arquivo
      cru[y * (w * 4 + 1) + 1 + i] = v;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(cru)),
    bloco("IEND", Buffer.alloc(0)),
  ]);
};

/** imagem RGBA simples para montar pranchas */
export class Prancha {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  constructor(w: number, h: number, fundo: [number, number, number, number] = [0, 0, 0, 0]) {
    this.w = w;
    this.h = h;
    this.rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) this.rgba.set(fundo, i * 4);
  }
  colar(src: { w: number; h: number; rgba: Uint8ClampedArray }, x: number, y: number, escala = 1) {
    for (let sy = 0; sy < src.h * escala; sy++)
      for (let sx = 0; sx < src.w * escala; sx++) {
        const j = (Math.floor(sy / escala) * src.w + Math.floor(sx / escala)) * 4;
        if (src.rgba[j + 3] === 0) continue;
        const dx = x + sx;
        const dy = y + sy;
        if (dx < 0 || dy < 0 || dx >= this.w || dy >= this.h) continue;
        const i = (dy * this.w + dx) * 4;
        this.rgba[i] = src.rgba[j];
        this.rgba[i + 1] = src.rgba[j + 1];
        this.rgba[i + 2] = src.rgba[j + 2];
        this.rgba[i + 3] = 255;
      }
  }
  salvar(caminho: string, escala = 1) {
    if (escala === 1) return writeFileSync(caminho, png(this.w, this.h, this.rgba));
    const g = new Prancha(this.w * escala, this.h * escala);
    g.colar(this, 0, 0, escala);
    writeFileSync(caminho, png(g.w, g.h, g.rgba));
  }
}
