import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function uploadWebp(req: Request, res: Response) {
  // multer tmp file
  const f = (req as any).file as Express.Multer.File | undefined;
  if (!f) return res.status(400).json({ message: 'No file. Field name must be "file".' });

  const publicDir = path.join(process.cwd(), 'public');
  const outDir = path.join(publicDir, 'images', 'menu');
  fs.mkdirSync(outDir, { recursive: true });

  const safeBase =
    (f.originalname || 'image')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/\.(png|jpg|jpeg|webp|gif)$/i, '') || 'image';

  const filename = `${safeBase}_${Date.now()}.webp`;
  const outPath = path.join(outDir, filename);

  // convert to webp
  await sharp(f.path)
    .rotate()
    .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(outPath);

  // remove tmp file (EPERM safe)
  await fs.promises.unlink(f.path).catch(() => {});

  res.json({ filename });
}
