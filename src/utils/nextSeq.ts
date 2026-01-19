import { Counter } from '../models/Counter';

export async function nextSeq(name: string) {
  const c = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return c.seq;
}
