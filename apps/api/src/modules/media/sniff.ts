import { open } from 'node:fs/promises';

// Brands de imagem que usam o mesmo container do MP4 (ISO-BMFF, caixa "ftyp")
const IMAGE_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif', 'avis']);

// Reconhece MP4 pelo conteúdo (caixa "ftyp" no início), nunca pela extensão
export async function isMp4(filePath: string): Promise<boolean> {
  const handle = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, 12, 0);
    if (bytesRead < 12 || header.subarray(4, 8).toString('latin1') !== 'ftyp') return false;
    return !IMAGE_BRANDS.has(header.subarray(8, 12).toString('latin1'));
  } finally {
    await handle.close();
  }
}
