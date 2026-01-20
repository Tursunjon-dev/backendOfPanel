// src/services/seq.ts
import { Counter } from '../models/Counter';

/**
 * Ensures counter is at least `min`.
 * (Mongo conflict bo‘lmasligi uchun $max ishlatamiz)
 */
export async function setSeqAtLeast(key: string, min: number) {
  const n = Number.isFinite(min) ? Math.floor(min) : 0;
  await Counter.findOneAndUpdate(
    { key },
    {
      $max: { seq: n },
      $setOnInsert: { key },
    },
    { upsert: true, new: true }
  );
}

/**
 * Atomic increment with optional starting value.
 * startAt=1001 bo‘lsa: birinchi qiymat 1001 bo‘ladi.
 */
export async function nextSeq(key: string, startAt?: number) {
  // startAt berilsa: seq kamida (startAt - 1) bo‘lsin, keyin +1 qilinadi
  if (typeof startAt === 'number' && Number.isFinite(startAt)) {
    await setSeqAtLeast(key, Math.floor(startAt) - 1);
  }

  const doc = await Counter.findOneAndUpdate(
    { key },
    {
      $inc: { seq: 1 },
      $setOnInsert: { key },
    },
    { new: true, upsert: true }
  ).lean();

  return doc?.seq ?? (typeof startAt === 'number' ? Math.floor(startAt) : 1);
}
