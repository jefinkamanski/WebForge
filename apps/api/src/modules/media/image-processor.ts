import { MEDIA_IMAGE_WIDTHS } from '@site/shared';
import sharp, { type Metadata } from 'sharp';
import { HttpError } from '../../http/errors.js';

// Hospedagem compartilhada: pouca RAM e CPU, então sem cache e sem paralelismo interno
sharp.cache(false);
sharp.concurrency(1);

const MAX_INPUT_PIXELS = 50_000_000;
const WEBP_QUALITY = 80;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export interface ProcessedVariant {
  width: number;
  height: number;
  data: Buffer;
}

// Processa uma imagem por vez para limitar o uso de memória
let queue: Promise<unknown> = Promise.resolve();
function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.catch(() => undefined);
  return result;
}

export function processImage(filePath: string): Promise<ProcessedVariant[]> {
  return runExclusive(async () => {
    const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' } as const;

    let metadata: Metadata;
    try {
      metadata = await sharp(filePath, options).metadata();
    } catch {
      throw invalidImage();
    }
    if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format) || !metadata.width) {
      throw invalidImage();
    }

    // Orientações EXIF 5-8 giram a imagem 90°, trocando largura e altura
    const swapped = (metadata.orientation ?? 1) >= 5;
    const sourceWidth = swapped ? (metadata.height ?? 0) : metadata.width;
    const maxWidth = MEDIA_IMAGE_WIDTHS[MEDIA_IMAGE_WIDTHS.length - 1] ?? 1920;
    const widths = [
      ...new Set([
        ...MEDIA_IMAGE_WIDTHS.filter((width) => width < sourceWidth),
        Math.min(sourceWidth, maxWidth),
      ]),
    ];

    const variants: ProcessedVariant[] = [];
    try {
      for (const width of widths) {
        // rotate() aplica a orientação EXIF; os metadados (EXIF/GPS) não são copiados
        const { data, info } = await sharp(filePath, options)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer({ resolveWithObject: true });
        variants.push({ width: info.width, height: info.height, data });
      }
    } catch {
      throw invalidImage();
    }
    return variants;
  });
}

function invalidImage(): HttpError {
  return new HttpError(
    415,
    'UNSUPPORTED_MEDIA',
    'Arquivo de imagem inválido. Envie JPG, PNG ou WebP.',
  );
}
