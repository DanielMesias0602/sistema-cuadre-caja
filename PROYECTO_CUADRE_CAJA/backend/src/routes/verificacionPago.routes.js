import express from 'express';

import {
  createVerificacion,
  getVerificacion,
  getVerificacionesByPago
} from '../controllers/verificacionPago.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = express.Router();

router.post(
  '/',
  requireAuth,
  requireRole(1),
  createVerificacion
);

router.get(
  '/pago/:idPago',
  requireAuth,
  getVerificacionesByPago
);

router.get(
  '/:id',
  requireAuth,
  getVerificacion
);

export default router;