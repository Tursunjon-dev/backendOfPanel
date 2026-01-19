import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import Category from '../models/Category';
import Item from '../models/Item';

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

/**
 * DB -> payload (menu.json schema: categorySlug/categoryName)
 * Eslatma: appingiz shu formatni kutyapti:
 * items: { id,title,categorySlug,categoryName,price,image,isActive }
 * categories: { name,slug,image }
 */
export async function buildMenuPayload() {
  const categories = await Category.find().sort({ name: 1 }).lean();
  const items = await Item.find().sort({ id: 1 }).lean();

  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      totalItems: items.length,
      totalCategories: categories.length,
      schemaVersion: '1.0',
      checksum: '',
    },
    categories: categories.map((c: any) => ({
      name: c.name,
      slug: c.slug,
      image: c.image || '',
    })),
    items: items.map((it: any) => ({
      id: it.id,
      title: it.title,
      categorySlug: it.categorySlug,
      categoryName: it.categoryName,
      price: it.price,
      image: it.image || '',
      isActive: !!it.isActive,
    })),
  };

  const jsonForChecksum = JSON.stringify({ ...payload, meta: { ...payload.meta, checksum: '' } });
  const checksum = sha1(jsonForChecksum);

  payload.meta.checksum = checksum;
  return payload;
}

/** menu.json ni public/data ga yozadi */
export async function writeMenuFiles(publicDir: string) {
  const dataDir = path.join(publicDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const menu = await buildMenuPayload();

  fs.writeFileSync(path.join(dataDir, 'menu.json'), JSON.stringify(menu, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(dataDir, 'version.json'),
    JSON.stringify(
      {
        exportedAt: menu.meta.exportedAt,
        checksum: menu.meta.checksum,
        schemaVersion: menu.meta.schemaVersion,
      },
      null,
      2
    ),
    'utf8'
  );

  return { ok: true, exportedAt: menu.meta.exportedAt, checksum: menu.meta.checksum };
}

/** Agar bir joyda version.json qaytarish kerak bo‘lsa */
export async function getVersionJson(publicDir: string) {
  const filePath = path.join(publicDir, 'data', 'version.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  // yo‘q bo‘lsa DB dan build qilib qaytaramiz
  const menu = await buildMenuPayload();
  return {
    exportedAt: menu.meta.exportedAt,
    checksum: menu.meta.checksum,
    schemaVersion: menu.meta.schemaVersion,
  };
}
