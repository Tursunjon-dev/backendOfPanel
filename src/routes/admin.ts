import { Router } from 'express';

import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getCategories,
  getItems,
  importMenu,
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

  // Protected routes
  r.use(requireAdmin);

  r.get('/categories', getCategories);
  r.post('/categories', validate(Z.categoryCreate), createCategory);
  r.put('/categories/:id', validate(Z.categoryUpdate), updateCategory);
  r.delete('/categories/:id', deleteCategory);

  r.get('/items', getItems);
  r.post('/items', validate(Z.itemCreate), createItem);
  r.put('/items/:id', validate(Z.itemUpdate), updateItem);
  r.delete('/items/:id', deleteItem);

  // Upload: accept both "image" and legacy "file" (upload.any will pick first)
  r.post('/upload', upload.any(), uploadWebp);

  // Admin utilities
  r.get('/media', media);
  r.post('/publish', publish);
  r.post('/import/menu', importMenu);

  return r;
}
