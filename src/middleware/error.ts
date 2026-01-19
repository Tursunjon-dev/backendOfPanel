import type { NextFunction, Request, Response } from 'express';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error('[ERROR]', err);
  const msg = err?.message || 'Server error';
  res.status(500).json({ error: msg });
}
