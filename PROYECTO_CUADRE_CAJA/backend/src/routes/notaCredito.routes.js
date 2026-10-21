import express from 'express';
import {
  createNotaCredito,
  getNotaCredito,
  getNotasCreditoByComprobante,
  getNotasCredito
} from '../controllers/notaCredito.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// NUEVA RUTA: Listar todas las notas
router.get('/', requireAuth, getNotasCredito);

router.post('/', requireAuth, createNotaCredito);

router.get('/comprobante/:idComprobante', requireAuth, getNotasCreditoByComprobante);

router.get('/:id', requireAuth, getNotaCredito);

export default router;