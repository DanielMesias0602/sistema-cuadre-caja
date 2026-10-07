import { extractEvidenceData } from '../services/ocr.service.js';

export const procesarComprobante = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No se ha proporcionado ninguna imagen');
      error.statusCode = 400;
      throw error;
    }

    // Default build is 1.7
    const build = req.body.build || '1.7';

    const data = await extractEvidenceData(req.file.path, build);

    res.json({
      status: 'ok',
      message: 'Comprobante procesado correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};
