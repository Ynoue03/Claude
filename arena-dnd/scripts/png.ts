// Gravador de PNG mínimo (sem dependências) para as prévias de sprites.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const crcTab = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTab[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const bloco = (tipo: string, dados: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const td = Buffer.concat([Buffer.from(tipo), dados]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

export const salvarPng = (arquivo: string, w: number, h: number, rgba: Uint8Array) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const linhas = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    linhas[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(linhas, y * (w * 4 + 1) + 1);
  }
  writeFileSync(arquivo, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco("IHDR", ihdr), bloco("IDAT", deflateSync(linhas)), bloco("IEND", Buffer.alloc(0))]));
};
