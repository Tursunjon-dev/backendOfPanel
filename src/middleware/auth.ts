import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const h = String(req.headers.authorization || '');
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as any;
    if (payload?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    (req as any).admin = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
