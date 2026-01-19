import { Schema, model } from 'mongoose';

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: '' }, // optional
  },
  { timestamps: true }
);

export default model('Category', CategorySchema);
