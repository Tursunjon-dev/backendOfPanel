import crypto from 'crypto';

import Category from '../models/Category';
import Item from '../models/Item';

function sha1(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

export type MenuExport = {
  meta: {
    exportedAt: string;
    totalItems: number;
    totalCategories: number;
    schemaVersion: string;
    checksum: string;
  };
  categories: Array<{ name: string; slug: string; image: string }>;
  items: Array<{
    id: number;
    title: string;
    categorySlug: string;
    categoryName: string;
    price: number;
    image: string;
    isActive: boolean;
  }>;
};

/**
 * DB -> menu.json payload.
 * App kutadigan schema:
 *  categories: { name, slug, image }
 *  items: { id, title, categorySlug, categoryName, price, image, isActive }
 */
export async function buildMenuExport(): Promise<MenuExport> {
  const exportedAt = new Date().toISOString();

  const [categoriesRaw, itemsRaw] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Item.find().sort({ id: 1 }).lean(),
  ]);

  const categories = categoriesRaw.map((c: any) => ({
    name: String(c.name ?? '').trim(),
    slug: String(c.slug ?? '').trim(),
    image: String(c.image ?? '').trim(),
  }));

  const items = itemsRaw.map((it: any) => ({
    id: Number(it.id),
    title: String(it.title ?? '').trim(),
    categorySlug: String(it.categorySlug ?? '').trim(),
    categoryName: String(it.categoryName ?? '').trim(),
    price: Number(it.price),
    image: String(it.image ?? '').trim(),
    isActive: it.isActive !== false,
  }));

  // checksum must ignore itself
  const base: Omit<MenuExport, 'meta'> & { meta: Omit<MenuExport['meta'], 'checksum'> } = {
    meta: {
      exportedAt,
      totalItems: items.length,
      totalCategories: categories.length,
      schemaVersion: '1.0',
    },
    categories,
    items,
  };

  const checksum = sha1(JSON.stringify(base));

  return {
    ...base,
    meta: { ...base.meta, checksum },
  };
}

/**
 * Backward-compatible export used by publish service.
 * Returns { menu, checksum } where checksum matches menu.meta.checksum.
 */
export async function exportMenu(exportedAt: string): Promise<{ menu: any; checksum: string }> {
  const menu = await buildMenuExport();
  const checksum = String(menu?.meta?.checksum || '');
  return { menu, checksum };
}
