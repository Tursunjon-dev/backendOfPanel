import { Schema, model } from 'mongoose';

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: '' }, // filename (.webp) or empty
  },
  { timestamps: true }
);

export default model('Category', CategorySchema);
