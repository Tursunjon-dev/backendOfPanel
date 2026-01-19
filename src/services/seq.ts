import { Counter } from '../models/Counter';

/**
 * Atomic, monotonic sequence by key.
 * Uses findOneAndUpdate with upsert.
 */
export async function nextSeq(key: string, startAt = 1) {
  const r = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 }, $setOnInsert: { seq: startAt - 1 } },
    { new: true, upsert: true }
  ).lean();
  return r!.seq;
}

export async function setSeqAtLeast(key: string, minValue: number) {
  await Counter.updateOne(
    { key, seq: { $lt: minValue } },
    { $set: { seq: minValue } },
    { upsert: true }
  );
}
