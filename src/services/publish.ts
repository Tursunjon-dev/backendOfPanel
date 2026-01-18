import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Category from '../models/Category';
import Item from '../models/Item';

function sha256(obj: unknown) {
  const s = JSON.stringify(obj);
  return crypto.createHash('sha256').update(s).digest('hex');
}

export async function publishAll(publicDir: string) {
  const dataDir = path.join(publicDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const [cats, items] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Item.find().sort({ id: 1 }).lean(),
  ]);

  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      totalItems: items.length,
      totalCategories: cats.length,
      schemaVersion: '1.0',
    },
    categories: cats.map(c => ({
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
      image: c.image || '',
    })),
    items: items.map(i => ({
      _id: String(i._id),
      id: i.id,
      title: i.title,
      categorySlug: i.categorySlug,
      categoryName: i.categoryName,
      price: i.price,
      image: i.image || '',
      isActive: !!i.isActive,
    })),
  };

  const checksum = sha256(payload);
  const menuJson = { ...payload, meta: { ...payload.meta, checksum } };

  fs.writeFileSync(path.join(dataDir, 'menu.json'), JSON.stringify(menuJson, null, 2), 'utf8');

  const version = {
    updatedAt: menuJson.meta.exportedAt,
    checksum,
    totalItems: payload.meta.totalItems,
    totalCategories: payload.meta.totalCategories,
  };
  fs.writeFileSync(path.join(dataDir, 'version.json'), JSON.stringify(version, null, 2), 'utf8');

  return { ok: true, checksum, version };
}
