import express from 'express';
import {
  createCierre,
  getCierre,
  getCierres,
  obtenerPreCalculoCierre,
  reabrirCierre // <-- NUEVO
} from '../controllers/cierreCaja.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js'; // <-- IMPORTANTE PARA SEGURIDAD

const router = express.Router();

router.post('/', requireAuth, createCierre);
router.get('/', requireAuth, getCierres);

router.get('/pre-calculo', requireAuth, obtenerPreCalculoCierre);

router.put('/:id/reabrir', requireAuth, requireRole(1), reabrirCierre);

router.get('/:id', requireAuth, getCierre);

export default router;