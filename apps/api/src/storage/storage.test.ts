import { describe, expect, it } from 'vitest';
import { assertSafeKey, createDiskStorage } from './storage.js';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('assertSafeKey', () => {
  it.each(['abc-123/480.webp', 'a1b2/video.mp4'])('accepts %s', (key) => {
    expect(() => assertSafeKey(key)).not.toThrow();
  });

  it.each([
    '../fora.webp',
    'a/../../fora.webp',
    '/absoluto.webp',
    'a\\b.webp',
    'a//b.webp',
    '.tmp/arquivo',
    'ABC/Maiuscula.webp',
    'a/b.webp\0',
    '',
  ])('rejects %j', (key) => {
    expect(() => assertSafeKey(key)).toThrow(/inválida/);
  });
});

describe('disk storage', () => {
  it('saves, removes by prefix and never writes outside the root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'storage-test-'));
    try {
      const storage = createDiskStorage(root);
      await storage.saveBuffer('pasta/1.webp', Buffer.from('a'));
      await storage.saveBuffer('pasta/2.webp', Buffer.from('b'));
      await expect(storage.saveBuffer('../fora.webp', Buffer.from('x'))).rejects.toThrow();
      await expect(storage.removePrefix('..')).rejects.toThrow();

      await storage.removePrefix('pasta');
      expect(await readdir(root)).toEqual([]);
      expect(storage.publicPath('pasta/1.webp')).toBe('/uploads/pasta/1.webp');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('moves a file into storage', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'storage-test-'));
    try {
      const source = path.join(root, 'origem.tmp');
      await writeFile(source, 'video');

      await createDiskStorage(path.join(root, 'uploads')).saveFile('v1/video.mp4', source);

      expect(await readdir(path.join(root, 'uploads', 'v1'))).toEqual(['video.mp4']);
      expect(await readdir(root)).not.toContain('origem.tmp');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
