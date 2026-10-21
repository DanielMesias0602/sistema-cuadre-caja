import express from 'express';
import {
  createAnulacion,
  getAnulacion,
  getAnulacionByComprobante,
  getAnulaciones
} from '../controllers/anulacion.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireAuth, getAnulaciones);
router.post('/', requireAuth, createAnulacion);
router.get('/comprobante/:idComprobante', requireAuth, getAnulacionByComprobante);
router.get('/:id', requireAuth, getAnulacion);

export default router;