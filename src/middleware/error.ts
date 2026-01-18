import type { NextFunction, Request, Response } from 'express';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.statusCode || err?.status || 500);
  const message = status >= 500 ? 'Internal error' : String(err?.message || 'Request error');

  if (process.env.NODE_ENV !== 'test') {
    // keep console output minimal but useful
    console.error('[ERROR]', status, err);
  }

  res.status(status).json({ error: message });
}
