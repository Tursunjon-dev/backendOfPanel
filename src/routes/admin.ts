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
} from '../controllers/admin.controller';
import { requireAdmin } from '../middleware/auth';
import { makeUploadTmp } from '../middleware/upload';
import { validate, Z } from '../middleware/validate';

export function adminRouter(publicDir: string) {
  const r = Router();
  const upload = makeUploadTmp(publicDir);

  r.post('/auth/login', validate(Z.login), login);

  r.use(requireAdmin);

  r.get('/categories', getCategories);
  r.post('/categories', validate(Z.categoryCreate), createCategory);
  r.put('/categories/:id', validate(Z.categoryUpdate), updateCategory);
  r.delete('/categories/:id', deleteCategory);

  r.get('/items', getItems);
  r.post('/items', validate(Z.itemCreate), createItem);
  r.put('/items/:id', validate(Z.itemUpdate), updateItem);
  r.delete('/items/:id', deleteItem);

  // Accept both field names: "image" (frontend) and legacy "file"
  r.post('/upload', upload.any(), uploadWebp);
  r.get('/media', media);
  r.post('/publish', publish);

  // ✅ NEW: JSON -> Mongo import
  // Reads: public/data/menu.json
  // Writes: Category + Item collections (upsert)
  r.post('/import/menu', importMenuFromPublicJson);

  return r;
}
