import { Router } from 'express';
import {
  createConciliacion,
  getConciliacion,
  getConciliaciones,
  getPreCalculo,
  revisarConciliacion
} from '../controllers/conciliacion.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole(1));

router.post('/', createConciliacion);
router.get('/', getConciliaciones);
router.get('/pre-calculo', getPreCalculo);
router.put('/:id/revisar', revisarConciliacion);
router.put('/:id/revertir', revisarConciliacion);
router.get('/:id', getConciliacion);

export default router;