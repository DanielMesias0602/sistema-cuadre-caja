import { Router } from 'express';
import { procesarComprobante } from '../controllers/ocr.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadEvidence, validateUploadedFile } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/procesar', uploadEvidence.single('archivo'), validateUploadedFile, procesarComprobante);

export default router;
