import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Category from '../models/Category';
import Item from '../models/Item';
import { nextSeq, setSeqAtLeast } from './seq';

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

/**
 * Writes /public/data/menu.json and /public/data/version.json
 * version.json has monotonic "version" so mobile apps can check updates easily.
 */
export async function publishAll(publicDir: string) {
  const dataDir = path.join(publicDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const [cats, items] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Item.find().sort({ id: 1 }).lean(),
  ]);

  const payload: any = {
    meta: {
      exportedAt: new Date().toISOString(),
      totalItems: items.length,
      totalCategories: cats.length,
      schemaVersion: '1.0',
      checksum: '',
    },
    categories: cats.map((c: any) => ({
      name: c.name,
      slug: c.slug,
      image: c.image || '',
    })),
    items: items.map((i: any) => ({
      id: i.id,
      title: i.title,
      categorySlug: i.categorySlug,
      categoryName: i.categoryName,
      price: i.price,
      image: i.image || '',
      isActive: !!i.isActive,
    })),
  };

  // checksum is computed with checksum field empty
  const checksum = sha1(JSON.stringify({ ...payload, meta: { ...payload.meta, checksum: '' } }));
  payload.meta.checksum = checksum;

  // monotonic version
  const version = await nextSeq('menu_version', 1);

  fs.writeFileSync(path.join(dataDir, 'menu.json'), JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(dataDir, 'version.json'),
    JSON.stringify({ version, exportedAt: payload.meta.exportedAt, checksum }, null, 2),
    'utf8'
  );

  return { ok: true, version, exportedAt: payload.meta.exportedAt, checksum };
}

/**
 * Optional helper if you import a menu from disk and want to bump version.
 */
export async function bumpMenuVersion(minVersion?: number) {
  if (typeof minVersion === 'number' && Number.isFinite(minVersion)) {
    await setSeqAtLeast('menu_version', Math.floor(minVersion));
  }
  return nextSeq('menu_version');
}
