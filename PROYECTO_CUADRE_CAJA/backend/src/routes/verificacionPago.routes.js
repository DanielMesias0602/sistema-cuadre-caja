import express from 'express';

import {
  createVerificacion,
  getVerificacion,
  getVerificacionesByPago
} from '../controllers/verificacionPago.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post(
  '/',
  requireAuth,
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