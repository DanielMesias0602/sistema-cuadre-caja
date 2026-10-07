import express from 'express';

import {
  createSalida,
  getSalida,
  getSalidasByCierre
} from '../controllers/salidaCaja.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post(
  '/',
  requireAuth,
  createSalida
);

router.get(
  '/cierre/:idCierre',
  requireAuth,
  getSalidasByCierre
);

router.get(
  '/:id',
  requireAuth,
  getSalida
);

export default router;