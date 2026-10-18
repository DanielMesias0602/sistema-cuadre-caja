import { Router } from 'express';
import {
  create,
  registrarUnificado,
  getById,
  getAll
} from '../controllers/operacion.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', create);
router.post('/registrar-unificado', registrarUnificado); // <-- LA NUEVA RUTA ACID
router.get('/', getAll);
router.get('/:id', getById);

export default router;