import { Router } from 'express';
import { procesarComprobante } from '../controllers/ocr.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadEvidence } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/procesar', uploadEvidence.single('archivo'), procesarComprobante);

export default router;
