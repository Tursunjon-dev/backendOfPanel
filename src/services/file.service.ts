import fs from 'fs/promises';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads', 'menu');

export async function deleteImageFile(filename: string): Promise<void> {
  try {
    await fs.unlink(path.join(uploadDir, filename));
  } catch (err) {
    console.warn(`Could not delete file ${filename}:`, (err as Error).message);
  }
}
