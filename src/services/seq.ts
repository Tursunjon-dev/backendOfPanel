// src/services/seq.ts
import { Counter } from '../models/Counter';

/**
 * Atomically increments a named counter and returns the new value.
 *
 * If `startAt` is provided, we first ensure the counter is at least `startAt - 1`
 * before incrementing. This avoids MongoDB update operator conflicts.
 */
export async function nextSeq(key: string, startAt?: number): Promise<number> {
  if (typeof startAt === 'number' && Number.isFinite(startAt) && startAt > 1) {
    await setSeqAtLeast(key, startAt - 1);
  }

  const doc = await Counter.findOneAndUpdate(
    { key },
    {
      $inc: { seq: 1 },
      $setOnInsert: { key },
    },
    { new: true, upsert: true }
  ).lean();

  return typeof doc?.seq === 'number' ? doc!.seq : 1;
}

/** Ensure counter `seq` is >= min (creates doc if missing). */
export async function setSeqAtLeast(key: string, min: number): Promise<void> {
  if (!Number.isFinite(min)) return;
  await Counter.updateOne(
    { key },
    {
      $setOnInsert: { key },
      $max: { seq: min },
    },
    { upsert: true }
  );
}
