import { model, Schema, Types } from 'mongoose';

export type BrandDoc = {
  _id: Types.ObjectId;
  key: 'default';
  name: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
};

const BrandSchema = new Schema<BrandDoc>(
  {
    key: { type: String, enum: ['default'], unique: true, required: true },
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Brand = model<BrandDoc>('Brand', BrandSchema);
