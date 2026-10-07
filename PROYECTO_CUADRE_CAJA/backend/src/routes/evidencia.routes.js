import { Router } from 'express';

import {
  create,
  getById,
  getByOperacion
} from '../controllers/evidencia.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadEvidence } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  uploadEvidence.single('archivo'),
  create
);

router.get('/operacion/:idOperacion', getByOperacion);
router.get('/:id', getById);

export default router;