import express from 'express';

import {
  createCierre,
  getCierre,
  getCierres
} from '../controllers/cierreCaja.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post(
  '/',
  requireAuth,
  createCierre
);

router.get(
  '/',
  requireAuth,
  getCierres
);

router.get(
  '/:id',
  requireAuth,
  getCierre
);

export default router;