import 'dotenv/config';

function must(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`ENV missing: ${name}`);
  return v;
}

function csv(name: string, fallback: string) {
  return (process.env[name] ?? fallback)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),

  MONGO_URI: must('MONGO_URI'),

  ADMIN_EMAIL: must('ADMIN_EMAIL', 'admin@local.com'),
  ADMIN_PASSWORD: must('ADMIN_PASSWORD', 'admin12345'),
  JWT_SECRET: must('JWT_SECRET', 'change_me_please_use_32_chars_minimum'),

  // Comma-separated list is supported.
  ADMIN_CORS_ORIGINS: csv('ADMIN_CORS_ORIGIN', 'http://localhost:5173'),

  MAX_JSON_MB: Number(process.env.MAX_JSON_MB || 10),
};
