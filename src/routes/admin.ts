import { Router } from 'express';
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getCategories,
  getItems,
  importMenuFromPublicJson,
  login,
  media,
  publish,
  updateCategory,
  updateItem,
  uploadWebp,
  uploadWebpBulk,
} from '../controllers/admin.controller';
import { requireAdmin } from '../middleware/auth';
import { makeUploadTmp } from '../middleware/upload';
import { validate, Z } from '../middleware/validate';

// Express 4 does not automatically forward async errors.
// Wrap controllers to avoid unhandled promise rejections (which can restart the server on Render).
const a = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function adminRouter(publicDir: string) {
  const r = Router();
  const upload = makeUploadTmp(publicDir);

  r.post('/auth/login', validate(Z.login), a(login));

  r.use(requireAdmin);

  r.get('/categories', a(getCategories));
  r.post('/categories', validate(Z.categoryCreate), a(createCategory));
  r.put('/categories/:id', validate(Z.categoryUpdate), a(updateCategory));
  r.delete('/categories/:id', a(deleteCategory));

  r.get('/items', a(getItems));
  r.post('/items', validate(Z.itemCreate), a(createItem));
  r.put('/items/:id', validate(Z.itemUpdate), a(updateItem));
  r.delete('/items/:id', a(deleteItem));

  // Accept both field names: "image" (frontend) and legacy "file"
  r.post('/upload', upload.any(), a(uploadWebp));
  r.post('/upload/bulk', upload.any(), a(uploadWebpBulk));
  r.get('/media', a(media));
  r.post('/publish', a(publish));

  // ✅ NEW: JSON -> Mongo import
  // Reads: public/data/menu.json
  // Writes: Category + Item collections (upsert)
  r.post('/import/menu', a(importMenuFromPublicJson));

  return r;
}
