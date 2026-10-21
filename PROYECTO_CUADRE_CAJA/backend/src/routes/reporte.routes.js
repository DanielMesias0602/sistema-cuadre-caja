import express from 'express';
import {
  getOperacionesReport,
  getPagosPorMedioReport,
  getCierresReport,
  getDiferenciasReport,
  getConciliacionReport,
  getSalidasReport,
  getEvidenciasVerificacionesReport,
  getDashboard,
  getIndicadores
} from '../controllers/reporte.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/operaciones', requireAuth, getOperacionesReport);
router.get('/pagos-por-medio', requireAuth, getPagosPorMedioReport);
router.get('/cierres', requireAuth, getCierresReport);
router.get('/diferencias', requireAuth, getDiferenciasReport);
router.get('/conciliacion', requireAuth, getConciliacionReport);
router.get('/salidas', requireAuth, getSalidasReport);
router.get('/evidencias-verificaciones', requireAuth, getEvidenciasVerificacionesReport);
router.get('/dashboard', requireAuth, getDashboard);
router.get('/indicadores', requireAuth, getIndicadores);

export default router;