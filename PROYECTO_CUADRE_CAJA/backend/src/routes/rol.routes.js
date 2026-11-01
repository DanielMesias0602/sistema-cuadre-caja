import { Router } from 'express';

import { listar, obtener } from '../controllers/rol.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(requireAuth, requireRole(1));

router.get('/', listar);
router.get('/:id', obtener);

export default router;