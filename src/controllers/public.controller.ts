import path from 'path';
import type { Request, Response } from 'express';

import { ENV } from '../config/env';

function sendFileNoCache(res: Response, absPath: string) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.sendFile(absPath);
}

export async function getBrand(_req: Request, res: Response) {
  // Public info shown in app (Sync Settings / Dev Contact)
  return res.json({
    name: ENV.BRAND_NAME,
    telegram: ENV.DEV_TELEGRAM,
    phone: ENV.DEV_PHONE,
  });
}

export async function getMenuJson(req: Request, res: Response) {
  const publicDir = req.app.get('publicDir') as string;
  const abs = path.join(publicDir, 'data', 'menu.json');
  return sendFileNoCache(res, abs);
}

export async function getVersionJson(req: Request, res: Response) {
  const publicDir = req.app.get('publicDir') as string;
  const abs = path.join(publicDir, 'data', 'version.json');
  return sendFileNoCache(res, abs);
}

// Backward-compatible exports expected by routes/public.ts
export const menuJson = getMenuJson;
export const versionJson = getVersionJson;
