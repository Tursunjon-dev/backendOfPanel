import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';

import { ENV } from '../config/env';
import Category from '../models/Category';
import Item from '../models/Item';
import { listMediaFiles } from '../services/media';
import { nextSeq } from '../services/nextId';
import { publishAll } from '../services/publish';
import { slugify } from '../services/slug';

let passHash: string | null = null;
async function ensureHash() {
  if (!passHash) passHash = await bcrypt.hash(ENV.ADMIN_PASSWORD, 10);
}

export async function login(req: Request, res: Response) {
  await ensureHash();
  const { email, password } = req.body as { email: string; password: string };

  if (email !== ENV.ADMIN_EMAIL) return res.status(401).json({ error: 'Login yoki parol xato' });
  const ok = await bcrypt.compare(password, passHash!);
  if (!ok) return res.status(401).json({ error: 'Login yoki parol xato' });

  const token = jwt.sign({ role: 'admin', email }, ENV.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token });
}

/* Categories */
export async function getCategories(_req: Request, res: Response) {
  const list = await Category.find().sort({ name: 1 }).lean();
  return res.json(list);
}

export async function createCategory(req: Request, res: Response) {
  const { name, image } = req.body as { name: string; image?: string };
  const base = slugify(name);
  if (!base) return res.status(400).json({ error: 'Kategoriya nomi noto‘g‘ri' });

  let slug = base;
  for (let i = 1; i < 50; i++) {
    const exists = await Category.findOne({ slug }).lean();
    if (!exists) break;
    slug = `${base}-${i}`;
  }

  const doc = await Category.create({
    name: name.trim(),
    slug,
    image: (image || '').trim(),
  });

  return res.status(201).json(doc);
}

export async function updateCategory(req: Request, res: Response) {
  const { id } = req.params;
  const patch = req.body as { name?: string; image?: string };

  const doc = await Category.findById(id);
  if (!doc) return res.status(404).json({ error: 'Kategoriya topilmadi' });

  const oldSlug = doc.slug;

  if (typeof patch.name === 'string' && patch.name.trim()) {
    const newName = patch.name.trim();
    const base = slugify(newName);
    if (!base) return res.status(400).json({ error: 'Kategoriya nomi noto‘g‘ri' });

    let slug = base;
    for (let i = 1; i < 50; i++) {
      const exists = await Category.findOne({ slug, _id: { $ne: doc._id } }).lean();
      if (!exists) break;
      slug = `${base}-${i}`;
    }

    doc.name = newName;
    doc.slug = slug;

    // Items: sync old slug -> new slug
    await Item.updateMany(
      { categorySlug: oldSlug },
      { $set: { categorySlug: slug, categoryName: newName } }
    );
  }

  if (typeof patch.image === 'string') doc.image = patch.image.trim();

  await doc.save();
  return res.json(doc);
}

export async function deleteCategory(req: Request, res: Response) {
  const { id } = req.params;
  const doc = await Category.findById(id).lean();
  if (!doc) return res.status(404).json({ error: 'Kategoriya topilmadi' });

  const count = await Item.countDocuments({ categorySlug: doc.slug });
  if (count > 0) {
    return res.status(400).json({ error: 'Avval shu kategoriyadagi mahsulotlarni o‘chiring' });
  }

  await Category.deleteOne({ _id: id });
  return res.json({ ok: true });
}

/* Items */
export async function getItems(_req: Request, res: Response) {
  const items = await Item.find().sort({ id: -1 }).lean();
  return res.json(items);
}

export async function createItem(req: Request, res: Response) {
  const { title, categorySlug, price, image, isActive } = req.body as any;

  const cat = await Category.findOne({ slug: categorySlug }).lean();
  if (!cat) return res.status(400).json({ error: 'Kategoriya topilmadi' });

  const id = await nextSeq('item_id');
  const doc = await Item.create({
    id,
    title: String(title).trim(),
    categorySlug: cat.slug,
    categoryName: cat.name,
    price,
    image: (image || '').trim(),
    isActive: isActive !== false,
  });

  return res.status(201).json(doc);
}

export async function updateItem(req: Request, res: Response) {
  const { id } = req.params;
  const patch = req.body as any;

  const doc = await Item.findById(id);
  if (!doc) return res.status(404).json({ error: 'Mahsulot topilmadi' });

  if (typeof patch.title === 'string' && patch.title.trim()) doc.title = patch.title.trim();
  if (typeof patch.price === 'number' && patch.price >= 0) doc.price = patch.price;
  if (typeof patch.image === 'string') doc.image = patch.image.trim();
  if (typeof patch.isActive === 'boolean') doc.isActive = patch.isActive;

  if (typeof patch.categorySlug === 'string' && patch.categorySlug.trim()) {
    const cat = await Category.findOne({ slug: patch.categorySlug.trim() }).lean();
    if (!cat) return res.status(400).json({ error: 'Kategoriya topilmadi' });
    doc.categorySlug = cat.slug;
    doc.categoryName = cat.name;
  }

  await doc.save();
  return res.json(doc);
}

export async function deleteItem(req: Request, res: Response) {
  const { id } = req.params;
  await Item.deleteOne({ _id: id });
  return res.json({ ok: true });
}

/* Upload: category/item images */
export async function uploadWebp(req: Request, res: Response) {
  // Multer may populate req.file (single) or req.files (any/fields).
  const f = ((req as any).file as Express.Multer.File | undefined)
    ?? (((req as any).files as Express.Multer.File[] | undefined)?.[0]);

  if (!f) return res.status(400).json({ error: 'No file uploaded. Field name must be "image".' });

  const publicDir = req.app.get('publicDir') as string;
  const outDir = path.join(publicDir, 'images', 'menu');
  fs.mkdirSync(outDir, { recursive: true });

  const safeBase = (f.originalname || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')
    .slice(0, 80);

  const filename = `${safeBase || 'image'}_${Date.now()}.webp`;
  const outPath = path.join(outDir, filename);

  await sharp(f.path)
    .rotate()
    .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(outPath);

  await fs.promises.unlink(f.path).catch(() => {});

  return res.json({ filename, url: `/images/menu/${filename}` });
}

/* Media */
export async function media(req: Request, res: Response) {
  const publicDir = req.app.get('publicDir') as string;
  return res.json(listMediaFiles(publicDir));
}

/* Publish */
export async function publish(req: Request, res: Response) {
  const publicDir = req.app.get('publicDir') as string;
  const r = await publishAll(publicDir);
  return res.json(r);
}
