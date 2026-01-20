import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';

/**
 * Public endpoints for mobile app / kiosk.
 * These serve the JSON files generated into <publicDir>/data.
 */

function readJsonFile(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function setCommonHeaders(res: Response) {
  // Avoid aggressive caching so the app sees updates fast.
  // (You can still rely on version.json checks.)
  res.setHeader('Cache-Control', 'no-store');
}

export async function menuJson(req: Request, res: Response) {
  try {
    const publicDir = req.app.get('publicDir') as string;
    const filePath = path.join(publicDir, 'data', 'menu.json');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'menu.json not found. Publish menu first.' });
    }
    const data = readJsonFile(filePath);
    setCommonHeaders(res);
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to read menu.json' });
  }
}

export async function versionJson(req: Request, res: Response) {
  try {
    const publicDir = req.app.get('publicDir') as string;
    const filePath = path.join(publicDir, 'data', 'version.json');
    if (!fs.existsSync(filePath)) {
      // If version does not exist yet, return a safe default.
      setCommonHeaders(res);
      return res.json({ version: 0, exportedAt: '', checksum: '' });
    }
    const data = readJsonFile(filePath);
    setCommonHeaders(res);
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to read version.json' });
  }
}
