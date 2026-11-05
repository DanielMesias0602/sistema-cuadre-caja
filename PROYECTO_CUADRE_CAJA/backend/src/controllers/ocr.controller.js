import { unlink } from 'node:fs/promises';
import { extractEvidenceData } from '../services/ocr.service.js';

export const procesarComprobante = async (req, res, next) => {
  let filePath;
  try {
    console.log('[OCR Controller] req.file:', req.file ? 'presente' : 'AUSENTE');
    console.log('[OCR Controller] req.file.path:', req.file?.path);
    console.log('[OCR Controller] req.file.mimetype:', req.file?.mimetype);
    console.log('[OCR Controller] req.file.originalname:', req.file?.originalname);
    console.log('[OCR Controller] req.file.size:', req.file?.size);
    console.log('[OCR Controller] req.body.tipoEvidencia:', req.body.tipoEvidencia);

    if (!req.file) {
      const error = new Error('No se ha proporcionado ninguna imagen');
      error.statusCode = 400;
      throw error;
    }

    filePath = req.file.path;
    const mimeType = req.file.mimetype;

    // El tipo de evidencia viene del body; default COMPROBANTE
    const tipoEvidencia =
      (req.body.tipoEvidencia || 'COMPROBANTE').toUpperCase();

    const data = await extractEvidenceData({
      filePath,
      mimeType,
      tipoEvidencia,
      cantidadDepositos: req.body.cantidad_depositos,
    });

    // ==========================================
    // DEBUG: MOSTRAR TEXTO CRUDO DEL OCR
    // ==========================================
    console.log('=== OCR DEBUG ===');
    console.log('TEXTO CRUDO:');
    console.log(data.texto_completo);
    console.log('DATOS EXTRAIDOS:');
    console.log(JSON.stringify(data.datos_extraidos, null, 2));
    console.log('=== FIN OCR DEBUG ===');
    // ==========================================

    res.json({
      status: 'ok',
      message: 'Comprobante procesado correctamente',
      data,
    });
  } catch (error) {
    next(error);
  } finally {
    if (filePath) {
      try {
        await unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('[OCR Controller] No se pudo eliminar el archivo temporal:', error);
        }
      }
    }
  }
};