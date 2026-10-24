import { constants } from 'node:fs';
import { copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface StorageProvider {
  saveBuffer(key: string, data: Buffer): Promise<void>;
  // Move um arquivo local (upload temporário) para o armazenamento
  saveFile(key: string, sourcePath: string): Promise<void>;
  // Remove tudo que está sob o prefixo (ex.: todas as variantes de uma mídia)
  removePrefix(prefix: string): Promise<void>;
  publicPath(key: string): string;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/;

// Chaves são geradas pelo servidor; a checagem é a defesa contra path traversal
export function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key) || key.includes('..')) {
    throw new Error(`Chave de armazenamento inválida: ${key}`);
  }
}

export const PUBLIC_UPLOADS_PATH = '/uploads';

export function createDiskStorage(rootDir: string): StorageProvider {
  const root = path.resolve(rootDir);

  function resolveKey(key: string): string {
    assertSafeKey(key);
    const target = path.resolve(root, key);
    if (!target.startsWith(root + path.sep)) {
      throw new Error(`Chave de armazenamento fora da pasta de uploads: ${key}`);
    }
    return target;
  }

  return {
    async saveBuffer(key, data) {
      const target = resolveKey(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data, { flag: 'wx' });
    },

    async saveFile(key, sourcePath) {
      const target = resolveKey(key);
      await mkdir(path.dirname(target), { recursive: true });
      try {
        await rename(sourcePath, target);
      } catch {
        // rename falha entre volumes diferentes: copia e apaga a origem
        await copyFile(sourcePath, target, constants.COPYFILE_EXCL);
        await rm(sourcePath, { force: true });
      }
    },

    async removePrefix(prefix) {
      await rm(resolveKey(prefix), { recursive: true, force: true });
    },

    publicPath(key) {
      assertSafeKey(key);
      return `${PUBLIC_UPLOADS_PATH}/${key}`;
    },
  };
}
