import { Request, Response } from 'express';
import { Brand } from '../models/Brand';

export async function getBrand(_req: Request, res: Response) {
  let b = await Brand.findOne({ key: 'default' }).lean();
  if (!b) b = await Brand.create({ key: 'default', name: 'Restoran', logo: '' });
  return res.json({ name: b.name, logo: b.logo || '' });
}

export async function updateBrand(req: Request, res: Response) {
  const name = String(req.body?.name || '').trim();
  const logo = String(req.body?.logo || '').trim();

  if (!name) return res.status(400).json({ error: 'Restoran nomi kerak' });

  const b = await Brand.findOneAndUpdate(
    { key: 'default' },
    { $set: { name, logo } },
    { upsert: true, new: true }
  ).lean();

  return res.json({ name: b?.name || name, logo: b?.logo || '' });
}
