import { Router } from 'express';
import {
  create,
  getById,
  getAll
} from '../controllers/operacion.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', create);
router.get('/', getAll);
router.get('/:id', getById);

export default router;