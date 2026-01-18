import cors, { CorsOptions } from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { ENV } from './config/env';
import { connectMongo } from './config/mongo';
import { errorHandler, notFound } from './middleware/error';
import { adminRouter } from './routes/admin';

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string | undefined, allowlist: string[]): boolean {
  // server-to-server / curl
  if (!origin) return true;

  // allow all
  if (allowlist.includes('*')) return true;

  // exact match
  if (allowlist.includes(origin)) return true;

  // allow any *.netlify.app (useful for deploy-preview)
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (host.endsWith('.netlify.app')) return true;
  } catch {
    // ignore parse errors
  }

  return false;
}

async function main() {
  await connectMongo();

  const app = express();
  const publicDir = path.join(process.cwd(), 'public');

  // Ensure required dirs exist
  fs.mkdirSync(path.join(publicDir, 'images', 'menu'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'tmp'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'data'), { recursive: true });

  app.set('publicDir', publicDir);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(morgan(ENV.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: `${ENV.MAX_JSON_MB}mb` }));
  app.use(express.urlencoded({ extended: true }));

  // ---- ADMIN CORS (Panel) ----
  const adminOrigins = parseOrigins(process.env.ADMIN_CORS_ORIGINS || '');

  const adminCorsOptions: CorsOptions = {
    origin: (origin, cb) => {
      const ok = isAllowedOrigin(origin, adminOrigins);
      // IMPORTANT: when blocked, return (null, false) (do NOT throw error),
      // otherwise preflight will fail with no headers and show confusing CORS error.
      return cb(null, ok);
    },
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };

  // Preflight must be handled BEFORE router
  app.options('/admin/*', cors(adminCorsOptions));
  app.use('/admin', cors(adminCorsOptions), adminRouter(publicDir));

  // ---- PUBLIC CORS (Mobile app / kiosk) ----
  const publicCors = cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  // Public static: image aliasing (old .jpg/.png names -> .webp)
  app.get('/images/menu/:name', publicCors, (req, res, next) => {
    const name = String(req.params.name || '');
    const filePath = path.join(publicDir, 'images', 'menu', name);

    if (fs.existsSync(filePath)) return res.sendFile(filePath);

    // If DB still references old "*.jpg"/"*.png" but we store as .webp, serve the webp.
    const ext = path.extname(name).toLowerCase();
    if (ext && ext !== '.webp') {
      const base = name.slice(0, -ext.length);
      const webpPath = path.join(publicDir, 'images', 'menu', `${base}.webp`);
      if (fs.existsSync(webpPath)) {
        res.setHeader('Content-Type', 'image/webp');
        return res.sendFile(webpPath);
      }
    }
    return next();
  });

  app.use(
    '/images/menu',
    publicCors,
    express.static(path.join(publicDir, 'images', 'menu'), {
      maxAge: '365d',
      immutable: true,
    })
  );

  app.use('/data', publicCors, express.static(path.join(publicDir, 'data'), { maxAge: '10m' }));
  app.get('/health', publicCors, (_req, res) => res.json({ ok: true }));

  app.use(notFound);
  app.use(errorHandler);

  app.listen(ENV.PORT, () => {
    console.log(`Backend running on port ${ENV.PORT}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
