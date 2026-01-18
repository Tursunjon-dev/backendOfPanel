import mongoose from 'mongoose';
import { ENV } from './env';

export async function connectMongo() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(ENV.MONGO_URI);
}
