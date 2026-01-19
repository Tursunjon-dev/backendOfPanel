import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email va parol kerak' });

  if (email !== ENV.ADMIN_EMAIL || password !== ENV.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Login yoki parol noto‘g‘ri' });
  }

  const token = jwt.sign({ role: 'admin', email }, ENV.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token });
}
