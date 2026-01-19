import mongoose from 'mongoose';
import { ENV } from './env';

export async function connectMongo() {
  await mongoose.connect(ENV.MONGO_URI);
}
