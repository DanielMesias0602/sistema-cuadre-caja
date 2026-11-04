import { openAsBlob } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsearComprobante, parsearEvidencia } from './ocr/parser.js';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
const OCR_WORKER_URL = process.env.OCR_WORKER_URL || 'http://127.0.0.1:8000/ocr';
const OCR_TIMEOUT_MS = 180_000;
let colaOcr = Promise.resolve();
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const isTransferencia = (tipoEvidencia) => {
  const tipo = String(tipoEvidencia || '').trim().toUpperCase();

  return (
    tipo === 'TRANSFERENCIA' ||
    tipo === 'TRANSFERENCIA_BCP' ||
    tipo === 'TRANSFERENCIA_BBVA' ||
    tipo === 'TRANSFERENCIA_INTERBANK' ||
    tipo === 'TRANSFERENCIA_SCOTIABANK' ||
    tipo === 'TRANSFERENCIA_BANBIF' ||
    tipo === 'YAPE' ||
    tipo === 'PLIN'
  );
};

const ejecutarOcrHttp = async ({ filePath, mimeType, tipoEvidencia }) => {
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(PROJECT_ROOT, 'backend', filePath);
  const formData = new FormData();
  const archivo = await openAsBlob(absoluteFilePath, { type: mimeType });
  formData.append('archivo', archivo, path.basename(absoluteFilePath));
  formData.append('tipo_evidencia', tipoEvidencia);

  let response;
  try {
    response = await fetch(OCR_WORKER_URL, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(OCR_TIMEOUT_MS)
    });
  } catch (error) {
    const agotado = error.name === 'TimeoutError' || error.name === 'AbortError';
    const ocrError = new Error(
      agotado
        ? 'El procesamiento OCR excedió el tiempo máximo'
        : 'No se pudo conectar con el worker OCR'
    );
    ocrError.statusCode = agotado ? 504 : 503;
    throw ocrError;
  }

  const cuerpo = await response.text();
  let resultado;
  try {
    resultado = JSON.parse(cuerpo);
  } catch (error) {
    console.error('[OCR RapidOCR] El worker devolvió una respuesta JSON no válida:', error);
    const ocrError = new Error('El worker OCR devolvió una respuesta no válida');
    ocrError.statusCode = 502;
    throw ocrError;
  }

  if (!response.ok) {
    console.error('[OCR RapidOCR] El worker respondió con error:', response.status, resultado);
    const ocrError = new Error('No se pudo procesar la imagen con el motor OCR');
    ocrError.statusCode = response.status >= 500 ? 502 : response.status;
    throw ocrError;
  }

  if (
    !resultado
    || typeof resultado.texto_completo !== 'string'
    || !resultado.datos_extraidos
    || typeof resultado.datos_extraidos !== 'object'
  ) {
    const ocrError = new Error('El worker OCR devolvió una respuesta incompleta');
    ocrError.statusCode = 502;
    throw ocrError;
  }

  return `${resultado.texto_completo}\n\nDATOS EXTRAIDOS:\n${
    JSON.stringify(resultado.datos_extraidos)
  }`;
};

const ejecutarOcrEnCola = (parametros) => {
  const ejecucion = colaOcr.then(() => ejecutarOcrHttp(parametros));
  colaOcr = ejecucion.then(() => undefined, () => undefined);
  return ejecucion;
};

export const extractEvidenceData = async ({ filePath, mimeType, tipoEvidencia }) => {
  if (!filePath || !mimeType || !tipoEvidencia) {
    const error = new Error('filePath, mimeType y tipoEvidencia son obligatorios');
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    const error = new Error('El tipo de archivo no es compatible con OCR');
    error.statusCode = 400;
    throw error;
  }

  const transferencia = isTransferencia(tipoEvidencia);
  const salidaOcr = await ejecutarOcrEnCola({ filePath, mimeType, tipoEvidencia });
  const datosExtraidos = transferencia
    ? parsearEvidencia(salidaOcr)
    : parsearComprobante(salidaOcr);

  return {
    motor: 'RapidOCR ONNX Runtime',
    build: 'rapidocr-onnxruntime',
    estado: 'PROCESADO',
    confianza: null,
    texto_completo: salidaOcr,
    datos_extraidos: datosExtraidos,
    salida_ocr: salidaOcr,
    requiere_revision: true,
    requiere_confirmacion: true
  };
};
