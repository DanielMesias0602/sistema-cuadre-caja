import { Router } from 'express';
import { procesarComprobante } from '../controllers/ocr.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadEvidencia } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/procesar', uploadEvidencia, procesarComprobante);

export default router;
