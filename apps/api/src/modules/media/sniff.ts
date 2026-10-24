import { open } from 'node:fs/promises';

export type VideoContainer = 'video/mp4' | 'video/webm';

// Brands de imagem que usam o container ISO-BMFF (mesmo "ftyp" do MP4)
const IMAGE_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif', 'avis']);

// Identifica o vídeo pelo conteúdo (assinatura do container), nunca pela extensão
export async function sniffVideo(filePath: string): Promise<VideoContainer | null> {
  const handle = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, 12, 0);
    if (bytesRead < 12) return null;

    if (header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
      return 'video/webm';
    }
    if (header.subarray(4, 8).toString('latin1') === 'ftyp') {
      const brand = header.subarray(8, 12).toString('latin1');
      return IMAGE_BRANDS.has(brand) ? null : 'video/mp4';
    }
    return null;
  } finally {
    await handle.close();
  }
}
