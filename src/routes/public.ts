import { Router } from 'express';
import { menuJson, versionJson } from '../controllers/public.controller';

export const publicRouter = Router();

publicRouter.get('/data/menu.json', menuJson);
publicRouter.get('/data/version.json', versionJson);
