import { Counter } from '../models/Counter';

export async function nextSeq(key: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  return doc!.seq;
}

export async function ensureSeqAtLeast(key: string, minValue: number) {
  await Counter.updateOne(
    { key, seq: { $lt: minValue } },
    { $set: { seq: minValue } },
    { upsert: true }
  );
}
