import { Router } from 'express';
import {
  create,
  registrarUnificado,
  updateRegistro,
  getById,
  getAll
} from '../controllers/operacion.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', create);
router.post('/registrar-unificado', registrarUnificado); // <-- LA NUEVA RUTA ACID
router.put('/:id/registro', requireRole(1), updateRegistro);
router.get('/', getAll);
router.get('/:id', getById);

export default router;