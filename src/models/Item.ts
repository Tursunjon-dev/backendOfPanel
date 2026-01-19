import { Schema, model } from 'mongoose';

const ItemSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true }, // auto-increment display id
    title: { type: String, required: true, trim: true },
    categorySlug: { type: String, required: true, index: true },
    categoryName: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: '' }, // optional
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model('Item', ItemSchema);
