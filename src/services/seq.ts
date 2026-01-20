import { Counter } from '../models/Counter';

/**
 * Atomic, monotonic sequence by key.
 * IMPORTANT: Uses an aggregation-pipeline update to avoid
 * "ConflictingUpdateOperators" when combining $inc + $setOnInsert on the same field.
 */
export async function nextSeq(key: string, startAt = 1) {
  const start = Math.max(1, Math.floor(startAt));

  const doc = await Counter.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,
          seq: {
            $add: [{ $ifNull: ['$seq', start - 1] }, 1],
          },
        },
      },
    ],
    { new: true, upsert: true }
  ).lean();

  return typeof doc?.seq === 'number' ? doc.seq : start;
}

/**
 * Ensure counter is at least minValue.
 * Safe for both existing and non-existing documents.
 */
export async function setSeqAtLeast(key: string, minValue: number) {
  const min = Math.max(0, Math.floor(minValue));
  await Counter.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,
          seq: {
            $cond: [
              { $gte: [{ $ifNull: ['$seq', 0] }, min] },
              { $ifNull: ['$seq', min] },
              min,
            ],
          },
        },
      },
    ],
    { upsert: true, new: true }
  );
}
