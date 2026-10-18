import { Router } from 'express';
import { 
  create, 
  uploadOnly, 
  getById, 
  getByOperacion 
} from '../controllers/evidencia.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadEvidence } from '../middlewares/upload.middleware.js';

const router = Router();
router.use(requireAuth);

router.post('/', uploadEvidence.single('archivo'), create);
// NUEVA RUTA SOLO PARA SUBIR A OCI
router.post('/upload', uploadEvidence.single('archivo'), uploadOnly);

router.get('/:id', getById);
router.get('/operacion/:idOperacion', getByOperacion);

export default router;