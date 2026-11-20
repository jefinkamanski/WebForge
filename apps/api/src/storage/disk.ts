import { constants } from 'node:fs';
import { copyFile, mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';

// Chaves geradas pelo servidor: "<pasta>/<arquivo>", só minúsculas, números, ponto e hífen
const SAFE_KEY = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.-]*$/;

// Pasta dos uploads temporários do multer (o ponto a esconde de /uploads)
export const TMP_FOLDER = '.tmp';

export function createDiskStorage(rootDir: string) {
  const root = path.resolve(rootDir);

  // Defesa contra path traversal: a chave precisa ter o formato esperado e cair dentro da raiz
  function resolve(key: string): string {
    const target = path.resolve(root, key);
    if (!SAFE_KEY.test(key) || !target.startsWith(root + path.sep)) {
      throw new Error(`Chave de armazenamento inválida: ${key}`);
    }
    return target;
  }

  return {
    root,
    tmpDir: path.join(root, TMP_FOLDER),

    // Caminho de destino de uma chave nova, com a pasta já criada
    async prepare(key: string): Promise<string> {
      const target = resolve(key);
      await mkdir(path.dirname(target), { recursive: true });
      return target;
    },

    // Move um arquivo temporário para a chave
    async moveIn(sourcePath: string, key: string): Promise<void> {
      const target = await this.prepare(key);
      try {
        await rename(sourcePath, target);
      } catch {
        // rename falha entre volumes diferentes: copia e apaga a origem
        await copyFile(sourcePath, target, constants.COPYFILE_EXCL);
        await rm(sourcePath, { force: true });
      }
    },

    // Remove a pasta da chave (cada mídia tem a sua)
    async remove(key: string): Promise<void> {
      await rm(path.dirname(resolve(key)), { recursive: true, force: true });
    },
  };
}

export type DiskStorage = ReturnType<typeof createDiskStorage>;
