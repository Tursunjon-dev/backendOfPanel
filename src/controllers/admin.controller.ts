import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';
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

function safeStr(v: any, max = 255) {
  const s = (v ?? '').toString().trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function safeNum(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function buildPublicBase(req: Request) {
  // Prefer ENV.PUBLIC_BASE_URL; fallback to request origin
  const envBase = safeStr((ENV as any).PUBLIC_BASE_URL);
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function imageAbs(req: Request, v: string) {
  const base = buildPublicBase(req);
  const s = safeStr(v);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/images/')) return `${base}${s}`;
  return `${base}/images/menu/${encodeURIComponent(s)}`;
}

/* Auth */
export async function login(req: Request, res: Response) {
  await ensureHash();
  const { email, password } = req.body as { email: string; password: string };

  if (email !== ENV.ADMIN_EMAIL) return res.status(401).json({ error: 'Login yoki parol xato' });
  const ok = await bcrypt.compare(password, passHash!);
  if (!ok) return res.status(401).json({ error: 'Login yoki parol xato' });

  const token = jwt.sign({ role: 'admin', email }, ENV.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token });
}

/* --------------------------
   Categories
-------------------------- */
export async function getCategories(req: Request, res: Response) {
  const list = await Category.find().sort({ name: 1 }).lean();

  // ✅ Aliases for different frontends:
  // - image (db)
  // - img (legacy UI)
  // - category (legacy UI expects slug/category field)
  // - imageUrl (absolute url to render <img src="..."> safely)
  const out = list.map((c: any) => ({
    ...c,
    img: c.image || '',
    category: c.slug || c.name || '',
    imageUrl: c.image ? imageAbs(req, c.image) : '',
  }));

  return res.json(out);
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
    image: safeStr(image),
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

/* --------------------------
   Items
-------------------------- */
export async function getItems(_req: Request, res: Response) {
  const items = await Item.find().sort({ id: -1 }).lean();

  // ✅ Alias for old app schema: "category"
  const out = items.map((it: any) => ({
    ...it,
    category: it.categorySlug || it.categoryName || '',
  }));

  return res.json(out);
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
    price: safeNum(price, 0),
    image: safeStr(image),
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

/* --------------------------
   Upload: category/item images
-------------------------- */
export async function uploadWebp(req: Request, res: Response) {
  // Multer may populate req.file (single) or req.files (any/fields).
  const f =
    ((req as any).file as Express.Multer.File | undefined) ??
    ((req as any).files as Express.Multer.File[] | undefined)?.[0];

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

  const url = `/images/menu/${filename}`;
  return res.json({
    success: true,
    filename,
    url,
    absoluteUrl: imageAbs(req, url),
  });
}

/* --------------------------
   Media
-------------------------- */
export async function media(req: Request, res: Response) {
  const publicDir = req.app.get('publicDir') as string;
  return res.json(listMediaFiles(publicDir));
}

/* --------------------------
   Publish
-------------------------- */
export async function publish(req: Request, res: Response) {
  const publicDir = req.app.get('publicDir') as string;
  const r = await publishAll(publicDir);
  return res.json(r);
}

/* --------------------------
   ✅ NEW: Import public/data/menu.json -> Mongo
   - upsert categories by slug
   - upsert items by id (NOT _id)
-------------------------- */
export async function importMenuFromPublicJson(req: Request, res: Response) {
  try {
    const publicDir = (req.app.get('publicDir') as string) || path.join(process.cwd(), 'public');
    const filePath = path.join(publicDir, 'data', 'menu.json');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'menu.json not found', filePath });
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    const categoriesRaw = Array.isArray(data?.categories) ? data.categories : [];
    const itemsRaw = Array.isArray(data?.items) ? data.items : [];

    if (!itemsRaw.length) return res.status(400).json({ error: 'menu.json items is empty' });

    // Normalize categories (supports {name,slug,image} and legacy)
    const catBySlug = new Map<string, { name: string; slug: string; image: string }>();
    for (const c of categoriesRaw) {
      const name = safeStr(c?.name ?? c?.category, 80);
      const slug = safeStr(c?.slug ?? c?.category, 120) || slugify(name);
      const image = safeStr(c?.image ?? c?.img, 255);
      if (!name || !slug) continue;
      catBySlug.set(slug, { name, slug, image });
    }

    // Normalize items (supports your schema)
    const normalizedItems = itemsRaw
      .map((it: any) => {
        const id = safeNum(it?.id, NaN);
        const title = safeStr(it?.title, 140);
        const categorySlug =
          safeStr(it?.categorySlug, 120) || slugify(safeStr(it?.categoryName ?? it?.category, 80));
        const categoryName = safeStr(it?.categoryName ?? it?.category, 80) || categorySlug;
        const price = safeNum(it?.price, 0);
        const image = safeStr(it?.image, 255);
        const isActive = typeof it?.isActive === 'boolean' ? it.isActive : true;

        if (!Number.isFinite(id) || !title || !categorySlug) return null;

        // Ensure category exists
        if (!catBySlug.has(categorySlug)) {
          catBySlug.set(categorySlug, { name: categoryName, slug: categorySlug, image: '' });
        }

        return { id, title, categorySlug, categoryName, price, image, isActive };
      })
      .filter(Boolean) as Array<{
      id: number;
      title: string;
      categorySlug: string;
      categoryName: string;
      price: number;
      image: string;
      isActive: boolean;
    }>;

    if (!normalizedItems.length) {
      return res.status(400).json({ error: 'No valid items after normalization' });
    }

    const categoriesToUpsert = Array.from(catBySlug.values());

    const catOps = categoriesToUpsert.map(c => ({
      updateOne: {
        filter: { slug: c.slug },
        update: { $set: { name: c.name, slug: c.slug, image: c.image } },
        upsert: true,
      },
    }));

    const itemOps = normalizedItems.map(it => ({
      updateOne: {
        filter: { id: it.id },
        update: { $set: it },
        upsert: true,
      },
    }));

    const [catResult, itemResult] = await Promise.all([
      Category.bulkWrite(catOps, { ordered: false }),
      Item.bulkWrite(itemOps, { ordered: false }),
    ]);

    return res.json({
      ok: true,
      source: filePath,
      imported: {
        categories: categoriesToUpsert.length,
        items: normalizedItems.length,
      },
      mongo: {
        categories: {
          upserted: (catResult as any).upsertedCount ?? 0,
          modified: (catResult as any).modifiedCount ?? 0,
          matched: (catResult as any).matchedCount ?? 0,
        },
        items: {
          upserted: (itemResult as any).upsertedCount ?? 0,
          modified: (itemResult as any).modifiedCount ?? 0,
          matched: (itemResult as any).matchedCount ?? 0,
        },
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'import failed' });
  }
}
