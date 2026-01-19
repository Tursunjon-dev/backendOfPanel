import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Brand } from '../models/Brand';
import Category from '../models/Category';
import Item from '../models/Item';

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

export async function exportAll(publicDir: string) {
  const dataDir = path.join(publicDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const brandDoc = (await Brand.findOne().lean()) || {
    name: 'Restoran',
    logo: '',
  };

  const categories = await Category.find().sort({ name: 1 }).lean();
  const items = await Item.find().sort({ id: 1 }).lean();

  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      totalItems: items.length,
      totalCategories: categories.length,
      schemaVersion: '1.0',
    },
    brand: {
      name: brandDoc.name || 'Restoran',
      logo: brandDoc.logo || '',
    },
    categories: categories.map((c: any) => ({
      slug: c.slug,
      name: c.name,
      image: c.image || '',
    })),
    items: items.map((it: any) => ({
      id: it.id,
      title: it.title,
      category: it.categorySlug,
      categoryName: it.categoryName,
      price: it.price,
      image: it.image || '',
      isActive: !!it.isActive,
    })),
  };

  const json = JSON.stringify(payload, null, 2);
  const checksum = sha1(json);

  const menuJson = { ...payload, meta: { ...payload.meta, checksum } };

  fs.writeFileSync(path.join(dataDir, 'menu.json'), JSON.stringify(menuJson, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(dataDir, 'brand.json'),
    JSON.stringify({ name: menuJson.brand.name, logo: menuJson.brand.logo }, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(dataDir, 'version.json'),
    JSON.stringify(
      { schemaVersion: '1.0', checksum, exportedAt: menuJson.meta.exportedAt },
      null,
      2
    ),
    'utf8'
  );

  return { ok: true, checksum, exportedAt: menuJson.meta.exportedAt };
}
