import express from 'express';

import {
  createTipoSalida,
  getTipoSalida,
  getTiposSalida
} from '../controllers/tipoSalida.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post(
  '/',
  requireAuth,
  createTipoSalida
);

router.get(
  '/',
  requireAuth,
  getTiposSalida
);

router.get(
  '/:id',
  requireAuth,
  getTipoSalida
);

export default router;