import { IMAGE_MAX_WIDTH } from '@webforge/shared';
import sharp from 'sharp';
import { HttpError } from '../../http/errors.js';

// Hospedagem compartilhada: pouca RAM e CPU, então sem cache e sem paralelismo interno
sharp.cache(false);
sharp.concurrency(1);

const MAX_INPUT_PIXELS = 50_000_000;
const WEBP_QUALITY = 80;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

// Uma imagem por vez, para limitar o uso de memória
let queue: Promise<unknown> = Promise.resolve();
function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.catch(() => undefined);
  return result;
}

const invalidImage = () =>
  new HttpError(415, 'UNSUPPORTED_MEDIA', 'Arquivo inválido. Envie JPG, PNG, WebP ou vídeo MP4.');

export interface ConvertedImage {
  width: number;
  height: number;
  size: number;
}

// Converte para uma única WebP de até IMAGE_MAX_WIDTH px, com a orientação aplicada.
// O sharp não copia metadados (EXIF/GPS) para a saída.
export function convertImage(sourcePath: string, targetPath: string): Promise<ConvertedImage> {
  return runExclusive(async () => {
    const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' } as const;
    try {
      const { format } = await sharp(sourcePath, options).metadata();
      if (!ACCEPTED_FORMATS.has(format)) throw invalidImage();

      const info = await sharp(sourcePath, options)
        .rotate()
        .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(targetPath);
      return { width: info.width, height: info.height, size: info.size };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw invalidImage();
    }
  });
}
