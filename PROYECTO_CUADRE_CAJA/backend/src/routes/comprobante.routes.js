import { Router } from 'express';
import {
  create,
  update,
  getById,
  getAll,
  checkExists // <-- Importamos el nuevo controlador
} from '../controllers/comprobante.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.post('/', create);
router.put('/:id', update);
router.get('/', getAll);
router.get('/check', checkExists); // <-- NUEVA RUTA
router.get('/:id', getById);

export default router;