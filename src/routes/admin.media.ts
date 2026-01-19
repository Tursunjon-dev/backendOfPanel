import { Router } from 'express';
import fs from 'fs';
import path from 'path';

export const adminMediaRouter = Router();

adminMediaRouter.get('/', async (_req, res) => {
  const dir = path.join(process.cwd(), 'public', 'images', 'menu');
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs
    .readdirSync(dir)
    .filter(f => /\.(webp|png|jpg|jpeg)$/i.test(f))
    .sort((a, b) => b.localeCompare(a));
  res.json(files);
});
