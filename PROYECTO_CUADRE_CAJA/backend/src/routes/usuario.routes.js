import { Router } from 'express';

import {
  listar,
  obtener,
  crear,
  actualizar,
  cambiarEstado,
  resetPassword,
} from '../controllers/usuario.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole(1)); // Solo ADMINISTRADOR

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', crear);
router.put('/:id', actualizar);
router.patch('/:id/estado', cambiarEstado);
router.patch('/:id/password', resetPassword);

export default router;