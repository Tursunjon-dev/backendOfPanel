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
import { nextSeq, setSeqAtLeast } from '../services/seq';
import { publishAll } from '../services/publish';
import { slugify } from '../services/slug';

let passHash: string | null = null;
async function ensureHash() {
  if (!passHash) passHash = await bcrypt.hash(ENV.ADMIN_PASSWORD, 10);
}

// -----------------
// Auth
// -----------------
export async function login(req: Request, res: Response) {
  await ensureHash();
  const { email, password } = req.body as { email: string; password: string };

  if (email !== ENV.ADMIN_EMAIL) return res.status(401).json({ error: 'Login yoki parol xato' });
  const ok = await bcrypt.compare(password, passHash!);
  if (!ok) return res.status(401).json({ error: 'Login yoki parol xato' });

  const token = jwt.sign({ role: 'admin', email }, ENV.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token });
}

// -----------------
// Categories
// -----------------
export async function getCategories(_req: Request, res: Response) {
  const list = await Category.find().sort({ name: 1 }).lean();
  const base = ENV.PUBLIC_BASE_URL || '';
  return res.json(
    list.map((c: any) => ({
      ...c,
      // legacy UI compatibility
      category: c.slug,
      img: c.image || '',
      imageUrl: c.image ? `${base}/images/menu/${encodeURIComponent(c.image)}` : '',
    }))
  );
}

export async function createCategory(req: Request, res: Response) {
  const { name, image } = req.body as { name: string; image?: string };
  const base = slugify(name);
  if (!base) return res.status(400).json({ error: 'Kategoriya nomi noto\'g\'ri' });

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
    if (!base) return res.status(400).json({ error: 'Kategoriya nomi noto\'g\'ri' });

    let slug = base;
    for (let i = 1; i < 50; i++) {
      const exists = await Category.findOne({ slug, _id: { $ne: doc._id } }).lean();
      if (!exists) break;
      slug = `${base}-${i}`;
    }

    doc.name = newName;
    doc.slug = slug;

    // items: sync old slug -> new slug
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
  if (count > 0) return res.status(400).json({ error: 'Avval shu kategoriyadagi mahsulotlarni o\'chiring' });

  await Category.deleteOne({ _id: id });
  return res.json({ ok: true });
}

// -----------------
// Items
// -----------------
async function ensureItemSeqAtLeastMaxId() {
  const max = await Item.findOne().sort({ id: -1 }).select({ id: 1 }).lean();
  const maxId = typeof max?.id === 'number' ? max.id : 0;
  await setSeqAtLeast('item_id', maxId);
}

export async function getItems(_req: Request, res: Response) {
  const items = await Item.find().sort({ id: -1 }).lean();
  const base = ENV.PUBLIC_BASE_URL || '';
  return res.json(
    items.map((i: any) => ({
      ...i,
      // legacy UI compatibility
      category: i.categorySlug,
      imageUrl: i.image ? `${base}/images/menu/${encodeURIComponent(i.image)}` : '',
    }))
  );
}

export async function createItem(req: Request, res: Response) {
  const { title, categorySlug, price, image, isActive } = req.body as any;

  const cat = await Category.findOne({ slug: String(categorySlug || '').trim() }).lean();
  if (!cat) return res.status(400).json({ error: 'Kategoriya topilmadi' });

  const payload = {
    title: String(title || '').trim() || 'Nomsiz',
    categorySlug: cat.slug,
    categoryName: cat.name,
    price: typeof price === 'number' ? price : Number(price) || 0,
    image: (image || '').trim(),
    isActive: isActive !== false,
  };

  // Defensive: sequence can drift after imports/manual DB edits.
  // Try a few times if Mongo reports duplicate id.
  for (let attempt = 0; attempt < 3; attempt++) {
    await ensureItemSeqAtLeastMaxId();
    const id = await nextSeq('item_id', 1001);
    try {
      const doc = await Item.create({ id, ...payload });
      return res.status(201).json(doc);
    } catch (err: any) {
      if (err?.code === 11000 && String(err?.message || '').includes('id_1')) {
        // sync counter and retry
        continue;
      }
      throw err;
    }
  }
  return res.status(500).json({ error: 'Item ID conflict. Try again.' });
}

export async function updateItem(req: Request, res: Response) {
  const { id } = req.params; // mongo _id
  const patch = req.body as any;

  const doc = await Item.findById(id);
  if (!doc) return res.status(404).json({ error: 'Mahsulot topilmadi' });

  if (typeof patch.title === 'string') {
    const t = patch.title.trim();
    if (t) doc.title = t;
  }
  if (typeof patch.price === 'number' && patch.price >= 0) doc.price = patch.price;
  if (typeof patch.price === 'string') {
    const n = Number(patch.price.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n) && n >= 0) doc.price = n;
  }
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

// -----------------
// Upload (category / item images) -> /public/images/menu/*.webp
// -----------------
export async function uploadWebp(req: Request, res: Response) {
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

  return res.json({ filename, url: `/images/menu/${filename}`, success: true });
}

// -----------------
// Media list
// -----------------
export async function media(req: Request, res: Response) {
  const publicDir = req.app.get('publicDir') as string;
  return res.json(listMediaFiles(publicDir));
}

// -----------------
// Publish to /public/data
// -----------------
export async function publish(req: Request, res: Response) {
  const publicDir = req.app.get('publicDir') as string;
  const r = await publishAll(publicDir);
  return res.json(r);
}

// -----------------
// Import from /public/data/menu.json -> Mongo (upsert) + fix counters
// -----------------
export async function importMenu(req: Request, res: Response) {
  const publicDir = req.app.get('publicDir') as string;
  const menuPath = path.join(publicDir, 'data', 'menu.json');
  if (!fs.existsSync(menuPath)) return res.status(404).json({ error: 'menu.json topilmadi' });

  const raw = await fs.promises.readFile(menuPath, 'utf8');
  const data = JSON.parse(raw);

  const cats = Array.isArray(data?.categories) ? data.categories : [];
  const items = Array.isArray(data?.items) ? data.items : [];

  let catMatched = 0;
  let catModified = 0;
  let catUpserted = 0;

  for (const c of cats) {
    const slug = String(c?.slug || '').trim();
    const name = String(c?.name || c?.categoryName || '').trim();
    const image = String(c?.image || '').trim();
    if (!slug || !name) continue;

    const r = await Category.updateOne(
      { slug },
      { $set: { name, slug, image } },
      { upsert: true }
    );
    catMatched += (r as any).matchedCount ?? 0;
    catModified += (r as any).modifiedCount ?? 0;
    catUpserted += (r as any).upsertedCount ?? 0;
  }

  let itemMatched = 0;
  let itemModified = 0;
  let itemUpserted = 0;

  for (const it of items) {
    const id = typeof it?.id === 'number' ? it.id : Number(it?.id);
    const title = String(it?.title || '').trim();
    const categorySlug = String(it?.categorySlug || it?.category || '').trim();
    const categoryName = String(it?.categoryName || '').trim();
    const price = typeof it?.price === 'number' ? it.price : Number(it?.price);
    const image = String(it?.image || '').trim();
    const isActive = it?.isActive !== false;
    if (!Number.isFinite(id) || !title || !categorySlug || !Number.isFinite(price) || !image) continue;

    // If categoryName missing, fetch from categories
    let catName = categoryName;
    if (!catName) {
      const c = await Category.findOne({ slug: categorySlug }).lean();
      catName = c?.name || categorySlug;
    }

    const r = await Item.updateOne(
      { id },
      {
        $set: {
          id,
          title,
          categorySlug,
          categoryName: catName,
          price,
          image,
          isActive,
        },
      },
      { upsert: true }
    );
    itemMatched += (r as any).matchedCount ?? 0;
    itemModified += (r as any).modifiedCount ?? 0;
    itemUpserted += (r as any).upsertedCount ?? 0;
  }

  // fix item counter to max id
  await ensureItemSeqAtLeastMaxId();

  return res.json({
    ok: true,
    imported: { categories: cats.length, items: items.length },
    mongo: {
      categories: { matched: catMatched, modified: catModified, upserted: catUpserted },
      items: { matched: itemMatched, modified: itemModified, upserted: itemUpserted },
    },
  });
}
