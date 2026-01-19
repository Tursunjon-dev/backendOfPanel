import fs from 'fs';
import multer from 'multer';
import path from 'path';

export function makeUploadTmp(publicDir: string) {
  const dir = path.join(publicDir, 'tmp');
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
      const base = (path.basename(file.originalname || 'upload', ext) || 'upload')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '_')
        .slice(0, 60);
      cb(null, `${base}_${Date.now()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  });
}
