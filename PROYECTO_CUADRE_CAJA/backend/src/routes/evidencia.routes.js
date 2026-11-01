import { Router } from 'express';
import { 
  create, 
  uploadOnly, 
  getById, 
  getByOperacion 
} from '../controllers/evidencia.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadEvidence, validateUploadedFile } from '../middlewares/upload.middleware.js';

const router = Router();
router.use(requireAuth);

router.post('/', uploadEvidence.single('archivo'), validateUploadedFile, create);
// NUEVA RUTA SOLO PARA SUBIR A OCI
router.post('/upload', uploadEvidence.single('archivo'), validateUploadedFile, uploadOnly);

router.get('/:id', getById);
router.get('/operacion/:idOperacion', getByOperacion);

export default router;