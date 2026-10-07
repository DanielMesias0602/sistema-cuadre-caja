import express from 'express';

import {
  createNotaCredito,
  getNotaCredito,
  getNotasCreditoByComprobante
} from '../controllers/notaCredito.controller.js';

import {
  requireAuth
} from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post(
  '/',
  requireAuth,
  createNotaCredito
);

router.get(
  '/comprobante/:idComprobante',
  requireAuth,
  getNotasCreditoByComprobante
);

router.get(
  '/:id',
  requireAuth,
  getNotaCredito
);

export default router;