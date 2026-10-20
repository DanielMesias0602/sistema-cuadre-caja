import express from 'express';
import {
  createCierre,
  getCierre,
  getCierres,
  obtenerPreCalculoCierre
} from '../controllers/cierreCaja.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', requireAuth, createCierre);
router.get('/', requireAuth, getCierres);

// ¡IMPORTANTE! Esta ruta va ANTES de '/:id' para que no haya conflicto
router.get('/pre-calculo', requireAuth, obtenerPreCalculoCierre);

router.get('/:id', requireAuth, getCierre);

export default router;