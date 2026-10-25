import { Router } from 'express';

import {
  create,
  getById,
  getByOperacion,
  getResumenByOperacion,
  update
} from '../controllers/pago.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', create);
router.put('/:id', requireRole(1), update);  // Solo ADMINISTRADOR puede verificar/modificar pagos
router.get('/operacion/:idOperacion/resumen', getResumenByOperacion);
router.get('/operacion/:idOperacion', getByOperacion);
router.get('/:id', getById);

export default router;