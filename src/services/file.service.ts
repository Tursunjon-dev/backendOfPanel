import fs from 'fs';
import path from 'path';

/**
 * Ensure directory exists (recursive).
 */
export async function ensureDir(dir: string): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true });
}

/**
 * Atomic JSON write:
 * - write to temp file
 * - fsync
 * - rename
 */
export async function writeJsonAtomic(absPath: string, data: unknown): Promise<void> {
  const dir = path.dirname(absPath);
  await ensureDir(dir);

  const tmp = absPath + '.tmp-' + Date.now();
  const json = JSON.stringify(data, null, 2);

  const fh = await fs.promises.open(tmp, 'w');
  try {
    await fh.writeFile(json, 'utf8');
    await fh.sync();
  } finally {
    await fh.close().catch(() => {});
  }
  await fs.promises.rename(tmp, absPath);
}

export async function readJson<T = any>(absPath: string): Promise<T> {
  const raw = await fs.promises.readFile(absPath, 'utf8');
  return JSON.parse(raw) as T;
}

/**
 * Delete image file inside /public/images/menu
 * (used by admin media endpoints).
 */
export async function deleteImageFile(absPath: string): Promise<void> {
  await fs.promises.unlink(absPath).catch(() => {});
}
