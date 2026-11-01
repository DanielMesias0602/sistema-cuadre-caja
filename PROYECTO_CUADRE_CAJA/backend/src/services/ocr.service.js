import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parsearComprobante, parsearEvidencia } from './ocr/parser.js';

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://ocr-service:8000/ocr';
const OCR_TIMEOUT_MS = 180_000;

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

const obtenerSalidaOcr = async ({ filePath, mimeType, tipoEvidencia }) => {
  const archivo = await readFile(filePath);
  const formulario = new FormData();
  formulario.append(
    'archivo',
    new Blob([archivo], { type: mimeType }),
    path.basename(filePath)
  );
  formulario.append('tipo', tipoEvidencia);

  let response;
  try {
    response = await fetch(OCR_SERVICE_URL, {
      method: 'POST',
      body: formulario,
      signal: AbortSignal.timeout(OCR_TIMEOUT_MS)
    });
  } catch (error) {
    const ocrError = new Error(
      error.name === 'TimeoutError'
        ? 'El servicio OCR excedió el tiempo máximo de procesamiento'
        : 'No se pudo conectar con el servicio OCR'
    );
    ocrError.statusCode = error.name === 'TimeoutError' ? 504 : 502;
    throw ocrError;
  }

  let resultado;
  try {
    resultado = await response.json();
  } catch {
    const error = new Error('El servicio OCR devolvió una respuesta no válida');
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(resultado.error || 'Error procesando el archivo en OCR');
    error.statusCode = response.status === 504 ? 504 : 502;
    throw error;
  }

  if (typeof resultado.salida_ocr !== 'string') {
    const error = new Error('El servicio OCR no devolvió el resultado esperado');
    error.statusCode = 502;
    throw error;
  }

  return resultado;
};

export const extractEvidenceData = async ({ filePath, mimeType, tipoEvidencia }) => {
  if (!filePath || !mimeType || !tipoEvidencia) {
    const error = new Error('filePath, mimeType y tipoEvidencia son obligatorios');
    error.statusCode = 400;
    throw error;
  }

  const transferencia = isTransferencia(tipoEvidencia);
  const resultado = await obtenerSalidaOcr({ filePath, mimeType, tipoEvidencia });
  const datosExtraidos = transferencia
    ? parsearEvidencia(resultado.salida_ocr)
    : parsearComprobante(resultado.salida_ocr);

  return {
    motor: 'PaddleOCR',
    build: resultado.build,
    estado: 'PROCESADO',
    confianza: null,
    texto_completo: resultado.salida_ocr,
    datos_extraidos: datosExtraidos,
    salida_ocr: resultado.salida_ocr,
    requiere_revision: true,
    requiere_confirmacion: true
  };
};
