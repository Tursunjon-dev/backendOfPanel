import { Category } from '../models/Category';
import { Item } from '../models/Item';
import { Meta } from '../models/Meta';
import { env } from '../config/env';

export async function buildMenuJson() {
  const meta = await Meta.findOne().lean();
  const categories = await Category.find().sort({ sort: 1 }).lean();
  const items = await Item.find({ isActive: true }).sort({ id: 1 }).lean();

  return {
    meta: {
      exportedAt: meta?.exportedAt || '',
      totalItems: items.length,
      totalCategories: categories.length,
      categories: categories.map((c) => c.id),
      schemaVersion: meta?.schemaVersion || '1.0',
      checksum: meta?.checksum || ''
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      img: `${env.publicBaseUrl}/images/menu/${c.img}`
    })),
    items: items.map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      price: i.price,
      image: `${env.publicBaseUrl}/images/menu/${i.image}`
    }))
  };
}

export async function getVersionJson() {
  const meta = await Meta.findOne().lean();
  return {
    version: meta?.version || 0,
    exportedAt: meta?.exportedAt || '',
    checksum: meta?.checksum || ''
  };
}
