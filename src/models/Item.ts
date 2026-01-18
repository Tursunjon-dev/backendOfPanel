import { Schema, model } from 'mongoose';

const ItemSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },

    categorySlug: { type: String, required: true, index: true },
    categoryName: { type: String, required: true },

    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model('Item', ItemSchema);
