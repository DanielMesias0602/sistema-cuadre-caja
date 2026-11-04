import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsearComprobante, parsearEvidencia } from './ocr/parser.js';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
const RAPID_OCR_SCRIPT = path.join(PROJECT_ROOT, 'ocr-service', 'rapid_ocr_service.py');
const PYTHON_EXECUTABLE = process.env.PYTHON_BIN
  || (process.platform === 'win32' ? 'python' : 'python3');
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

const ejecutarOcrLocal = ({ filePath, tipoEvidencia }) => new Promise((resolve, reject) => {
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(PROJECT_ROOT, 'backend', filePath);

  const proceso = spawn(
    PYTHON_EXECUTABLE,
    [RAPID_OCR_SCRIPT, absoluteFilePath, tipoEvidencia],
    {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8'
      }
    }
  );

  let salida = '';
  let errores = '';
  let agotado = false;
  let finalizado = false;
  let killTimer;

  const timeout = setTimeout(() => {
    agotado = true;
    proceso.kill('SIGTERM');
    killTimer = setTimeout(() => proceso.kill('SIGKILL'), 5_000);
    killTimer.unref();
  }, OCR_TIMEOUT_MS);

  const finalizar = (callback, valor) => {
    if (finalizado) return;
    finalizado = true;
    clearTimeout(timeout);
    clearTimeout(killTimer);
    callback(valor);
  };

  proceso.stdout.setEncoding('utf8');
  proceso.stderr.setEncoding('utf8');
  proceso.stdout.on('data', (fragmento) => {
    salida += fragmento;
  });
  proceso.stderr.on('data', (fragmento) => {
    errores += fragmento;
  });

  proceso.on('error', (error) => {
    console.error('[OCR RapidOCR] No se pudo iniciar Python:', error);
    const ocrError = new Error('No se pudo iniciar el motor OCR local');
    ocrError.statusCode = 500;
    finalizar(reject, ocrError);
  });

  proceso.on('close', (codigo) => {
    if (agotado) {
      const error = new Error('El procesamiento OCR excedió el tiempo máximo');
      error.statusCode = 504;
      finalizar(reject, error);
      return;
    }

    if (codigo !== 0) {
      console.error('[OCR RapidOCR] El proceso Python falló:', errores.trim());
      const error = new Error('No se pudo procesar la imagen con el motor OCR');
      error.statusCode = 500;
      finalizar(reject, error);
      return;
    }

    if (!salida.includes('DATOS EXTRAIDOS:')) {
      const error = new Error('El motor OCR devolvió una respuesta no válida');
      error.statusCode = 502;
      finalizar(reject, error);
      return;
    }

    finalizar(resolve, salida);
  });
});

const ejecutarOcrEnCola = (parametros) => {
  const ejecucion = colaOcr.then(() => ejecutarOcrLocal(parametros));
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
  const salidaOcr = await ejecutarOcrEnCola({ filePath, tipoEvidencia });
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
