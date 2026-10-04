import { Router } from 'express';

import {
  create,
  getById,
  getByOperacion,
  getResumenByOperacion
} from '../controllers/pago.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', create);
router.get('/operacion/:idOperacion/resumen', getResumenByOperacion);
router.get('/operacion/:idOperacion', getByOperacion);
router.get('/:id', getById);

export default router;