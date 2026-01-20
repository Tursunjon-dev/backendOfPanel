// src/services/seq.ts
import { Counter } from '../models/Counter';

export async function nextSeq(key: string, p0?: number) {
  const doc = await Counter.findOneAndUpdate(
    { key },
    {
      $inc: { seq: 1 },
      $setOnInsert: { key },
    },
    { new: true, upsert: true }
  ).lean();

  return doc?.seq ?? 1;
}

export async function setSeqAtLeast(key: string, min: number) {
  await Counter.updateOne({ key, seq: { $lt: min } }, { $set: { seq: min } });
}
