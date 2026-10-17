import multer from 'multer';

const storage = multer.diskStorage({
  destination: './tmp',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    console.log('[Upload] Archivo recibido:', file.originalname, 'Tamaño:', file.size, 'Tipo:', file.mimetype);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Tipo de archivo no permitido'));
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