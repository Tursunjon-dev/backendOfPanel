import { Router } from 'express';

export const adminBrandRouter = Router();

// Minimal: frontend yiqilmasin
adminBrandRouter.get('/', async (_req, res) => {
  res.json({
    name: 'Restoran',
    logo: '', // filename (webp) bo‘lsa /images/menu/<logo> orqali ko‘rsatiladi
  });
});

// Optional: brand update (agar sizda dashboardda logo/name edit bo‘lsa)
adminBrandRouter.put('/', async (req, res) => {
  const name = String(req.body?.name || '').trim() || 'Restoran';
  const logo = String(req.body?.logo || '').trim() || '';
  res.json({ name, logo });
});
