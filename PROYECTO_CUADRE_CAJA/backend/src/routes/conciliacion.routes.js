import { Router } from 'express';

import {
  createConciliacion,
  getConciliacion,
  getConciliaciones
} from '../controllers/conciliacion.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  createConciliacion
);

router.get(
  '/',
  getConciliaciones
);

router.get(
  '/:id',
  getConciliacion
);

export default router;