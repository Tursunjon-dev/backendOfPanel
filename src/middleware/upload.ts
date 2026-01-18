import fs from 'fs';
import multer from 'multer';
import path from 'path';

export function makeUploadTmp(publicDir: string) {
  const dir = path.join(publicDir, 'tmp');
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const base = path
        .basename(file.originalname, ext)
        .replace(/[^A-Za-z0-9_-]+/g, '_')
        .slice(0, 60);
      cb(null, `${base || 'file'}_${Date.now()}${ext}`);
    },
  });

  const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype);
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG/PNG/WebP allowed'));
    }
  };

  return multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
}
