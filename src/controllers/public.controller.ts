import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

function getPublicDir(req: Request) {
  const publicDir = req.app.get('publicDir') as string | undefined;
  if (!publicDir) throw new Error('publicDir is not set on app');
  return publicDir;
}

export function menuJson(req: Request, res: Response) {
  try {
    const publicDir = getPublicDir(req);
    const filePath = path.join(publicDir, 'data', 'menu.json');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'menu.json not found. Run Publish first.' });
    }

    // Cache buzilmasin (tez update uchun)
    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(filePath);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to read menu.json' });
  }
}

export function versionJson(req: Request, res: Response) {
  try {
    const publicDir = getPublicDir(req);
    const filePath = path.join(publicDir, 'data', 'version.json');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'version.json not found. Run Publish first.' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(filePath);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to read version.json' });
  }
}
