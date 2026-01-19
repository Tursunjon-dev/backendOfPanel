import { DefaultTimestampProps, Document, Types } from 'mongoose';
import Category from '../models/Category';
import { nextSeq } from '../utils/nextSeq';

export async function createCategory(
  req: { body: { name: any; image: any } },
  res: {
    status: (arg0: number) => {
      (): any;
      new (): any;
      json: { (arg0: { message: string }): any; new (): any };
    };
    json: (
      arg0: Document<
        unknown,
        {},
        { name: string; image: string; slug: string } & DefaultTimestampProps,
        {},
        { timestamps: true }
      > & { name: string; image: string; slug: string } & DefaultTimestampProps & {
          _id: Types.ObjectId;
        } & { __v: number }
    ) => any;
  }
) {
  const name = String(req.body?.name || '').trim();
  const image = String(req.body?.image || '').trim() || undefined;

  if (!name) return res.status(400).json({ message: 'Name required' });

  const id = await nextSeq('categories'); // <= MUHIM
  const slug = slugify(name); // sizdagi slugify funksiyangiz
  const doc = await Category.create({ id, name, slug, image });
  return res.json(doc);
}
function slugify(name: string) {
  throw new Error('Function not implemented.');
}
