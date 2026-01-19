import { Request, Response } from 'express';
import Item from '../models/Item';
import Category from '../models/Category';

async function nextItemId() {
  const last = await Item.findOne().sort({ id: -1 }).lean();
  return (last?.id || 1000) + 1;
}

export async function listItems(_req: Request, res: Response) {
  const list = await Item.find().sort({ id: -1 }).lean();
  res.json(list);
}

export async function createItem(req: Request, res: Response) {
  const title = String(req.body?.title || '').trim();
  const categorySlug = String(req.body?.categorySlug || '').trim();
  const price = Number(req.body?.price || 0);
  const image = String(req.body?.image || '').trim();
  const isActive = Boolean(req.body?.isActive ?? true);

  if (!title) return res.status(400).json({ error: 'Mahsulot nomi kerak' });
  if (!categorySlug) return res.status(400).json({ error: 'Kategoriya tanlang' });
  if (!Number.isFinite(price) || price <= 0)
    return res.status(400).json({ error: 'Narx noto‘g‘ri' });

  const cat = await Category.findOne({ slug: categorySlug }).lean();
  if (!cat) return res.status(400).json({ error: 'Kategoriya topilmadi' });

  const id = await nextItemId();

  const doc = await Item.create({
    id,
    title,
    categorySlug: cat.slug,
    categoryName: cat.name,
    price,
    image,
    isActive,
  });

  res.json(doc);
}

export async function updateItem(req: Request, res: Response) {
  const _id = req.params.id;

  const patch: any = {};

  if (req.body?.title !== undefined) patch.title = String(req.body.title || '').trim();
  if (req.body?.price !== undefined) patch.price = Number(req.body.price || 0);
  if (req.body?.image !== undefined) patch.image = String(req.body.image || '').trim();
  if (req.body?.isActive !== undefined) patch.isActive = Boolean(req.body.isActive);

  if (req.body?.categorySlug !== undefined) {
    const categorySlug = String(req.body.categorySlug || '').trim();
    if (!categorySlug) return res.status(400).json({ error: 'Kategoriya tanlang' });
    const cat = await Category.findOne({ slug: categorySlug }).lean();
    if (!cat) return res.status(400).json({ error: 'Kategoriya topilmadi' });
    patch.categorySlug = cat.slug;
    patch.categoryName = cat.name;
  }

  if ('title' in patch && !patch.title)
    return res.status(400).json({ error: 'Mahsulot nomi kerak' });
  if ('price' in patch && (!Number.isFinite(patch.price) || patch.price <= 0))
    return res.status(400).json({ error: 'Narx noto‘g‘ri' });

  const doc = await Item.findByIdAndUpdate(_id, { $set: patch }, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: 'Mahsulot topilmadi' });

  res.json(doc);
}

export async function deleteItem(req: Request, res: Response) {
  const _id = req.params.id;
  await Item.findByIdAndDelete(_id);
  res.json({ ok: true });
}
