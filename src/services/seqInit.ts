// src/services/seqInit.ts
import { Counter } from '../models/Counter';
import Item from '../models/Item';

export async function ensureItemCounter() {
  const max = await Item.findOne().sort({ id: -1 }).select({ id: 1 }).lean();
  const maxId = max?.id ?? 0;

  await Counter.findOneAndUpdate(
    { key: 'item_id' },
    { $max: { seq: maxId }, $setOnInsert: { key: 'item_id' } },
    { upsert: true, new: true }
  );
}
