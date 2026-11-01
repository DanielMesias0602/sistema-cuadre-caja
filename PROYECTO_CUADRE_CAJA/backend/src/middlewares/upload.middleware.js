import { unlink } from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import multer from 'multer';

const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

const storage = multer.diskStorage({
  destination: './tmp',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    console.log('[Upload] Archivo recibido:', file.originalname, 'Tamaño:', file.size, 'Tipo:', file.mimetype);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error('Tipo de archivo no permitido');
    error.statusCode = 400;
    return cb(error);
  }

  cb(null, true);
};

export const uploadEvidence = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

export const validateUploadedFile = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const detectedType = await fileTypeFromFile(req.file.path);
    if (!detectedType || !allowedTypes.includes(detectedType.mime) || detectedType.mime !== req.file.mimetype) {
      await unlink(req.file.path);
      const error = new Error('El contenido del archivo no coincide con un tipo permitido.');
      error.statusCode = 400;
      return next(error);
    }

    return next();
  } catch (error) {
    try {
      await unlink(req.file.path);
    } catch (cleanupError) {
      console.error('No se pudo eliminar un archivo temporal inválido:', cleanupError);
    }
    return next(error);
  }
};