import { Router } from 'express';

import {
  createDetalleConciliacion,
  getDetalleConciliacion,
  getDetallesPorConciliacion
} from '../controllers/detalleConciliacion.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  createDetalleConciliacion
);

router.get(
  '/conciliacion/:id_conciliacion',
  getDetallesPorConciliacion
);

router.get(
  '/:id',
  getDetalleConciliacion
);

export default router;