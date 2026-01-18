import { Schema, model } from 'mongoose';

const CounterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const Counter = model('Counter', CounterSchema);
