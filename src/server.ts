import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { ENV } from './config/env';
import { connectMongo } from './config/mongo';
import { errorHandler, notFound } from './middleware/error';
import { adminRouter } from './routes/admin';

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

  // Admin: strict CORS (panel)
  app.use(
    '/admin',
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const ok = ENV.ADMIN_CORS_ORIGINS.includes(origin);
        return cb(ok ? null : new Error('CORS blocked'), ok);
      },
      credentials: false,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      optionsSuccessStatus: 204,
      maxAge: 86400,
    }),
    adminRouter(publicDir)
  );

  // Public: allow GET from anywhere (mobile app)
  const publicCors = cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  // Public static: image aliasing (old .jpg/.png -> .webp)
  app.get('/images/menu/:name', publicCors, (req, res, next) => {
    const name = String(req.params.name || '');
    const filePath = path.join(publicDir, 'images', 'menu', name);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);

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
  // Menu JSON must update immediately after publish; disable caching.
  app.use(
    '/data',
    publicCors,
    express.static(path.join(publicDir, 'data'), {
      maxAge: 0,
      setHeaders: res => {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
      },
    })
  );
  app.get('/health', publicCors, (_req, res) => res.json({ ok: true }));

  app.use(notFound);
  app.use(errorHandler);

  app.listen(ENV.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running: http://localhost:${ENV.PORT}`);
  });
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
