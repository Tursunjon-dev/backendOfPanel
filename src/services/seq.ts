// src/services/seq.ts
import { Counter } from '../models/Counter';

/**
 * Atomic increment counter without conflicting update operators.
 * Mongo conflict bo‘lmasligi uchun seq ga faqat $inc ishlatamiz.
 */
export async function nextSeq(key: string) {
  const doc = await Counter.findOneAndUpdate(
    { key },
    {
      $inc: { seq: 1 },
      $setOnInsert: { key }, // seq ni set qilmaymiz!
    },
    {
      new: true,
      upsert: true,
    }
  ).lean();

  return doc?.seq ?? 1;
}
