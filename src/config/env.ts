import 'dotenv/config';

function str(name: string, def = ''): string {
  const v = process.env[name];
  return (v ?? def).trim();
}

function num(name: string, def: number): number {
  const raw = str(name, String(def));
  const n = Number(raw);
  return Number.isFinite(n) ? n : def;
}

function csv(name: string, def = ''): string[] {
  const raw = str(name, def);
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Centralized, typed env access.
 * Keep this file build-safe (no placeholders / ellipsis).
 */
export const ENV = {
  NODE_ENV: str('NODE_ENV', 'production'),
  PORT: num('PORT', 8080),

  // Mongo
  MONGO_URI: str('MONGO_URI', str('MONGODB_URI', '')),

  // Public base url (used to build absolute image URLs in admin responses)
  PUBLIC_BASE_URL: str('PUBLIC_BASE_URL', ''),

  // Optional branding/dev contact shown in apps
  BRAND_NAME: str('BRAND_NAME', 'Coffee Fresh'),
  DEV_TELEGRAM: str('DEV_TELEGRAM', '@almaut01'),
  DEV_PHONE: str('DEV_PHONE', '+998 93 285 75 35'),

  // Admin auth
  ADMIN_EMAIL: str('ADMIN_EMAIL', ''),
  ADMIN_PASSWORD: str('ADMIN_PASSWORD', ''),
  JWT_SECRET: str('JWT_SECRET', 'change-me'),

  // CORS
  ADMIN_CORS_ORIGINS: csv('ADMIN_CORS_ORIGINS', 'http://localhost:5173,http://localhost:8081'),

  // Limits
  MAX_JSON_MB: num('MAX_JSON_MB', 5),

  // Optional caching (if you add caching later)
  CACHE_TTL_MS: num('CACHE_TTL_MS', 60_000),
} as const;

export type Env = typeof ENV;
