import dotenv from 'dotenv';

dotenv.config();

function must(name: string, v: string | undefined) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function splitCsv(v: string | undefined) {
  return (v ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),

  MONGO_URI: must('MONGO_URI', process.env.MONGO_URI),
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || '',

  ADMIN_EMAIL: must('ADMIN_EMAIL', process.env.ADMIN_EMAIL),
  ADMIN_PASSWORD: must('ADMIN_PASSWORD', process.env.ADMIN_PASSWORD),
  JWT_SECRET: must('JWT_SECRET', process.env.JWT_SECRET),

  ADMIN_CORS_ORIGINS: splitCsv(process.env.ADMIN_CORS_ORIGINS),
  MAX_JSON_MB: Number(process.env.MAX_JSON_MB || 5),
  CACHE_TTL_MS: Number(process.env.CACHE_TTL_MS || 30000),
} as const;
