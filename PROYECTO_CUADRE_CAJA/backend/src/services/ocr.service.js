import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { parsearComprobante, parsearEvidencia } from './ocr/parser.js';

const execFileAsync = promisify(execFile);

/*
 * ============================================================
 * CONFIGURACIÓN DE BUILDS OCR
 * ============================================================
 *
 * Build 1.7  -> BOLETA / FACTURA
 * Build 1.11 -> TRANSFERENCIA (Yape, Plin, BCP, BBVA)
 */

const OCR_IMAGE_COMPROBANTE = 'ocr-cuadre-caja:1.7';
const OCR_IMAGE_TRANSFERENCIA = 'ocr-cuadre-caja:1.11';

const OCR_DOCKER_PATH = process.env.OCR_DOCKER_PATH || 'docker';

/*
 * ============================================================
 * EJECUCIÓN DEL CONTENEDOR OCR
 * ============================================================
 */

const runOcrContainer = async ({ dockerImage, filePath, script }) => {
  if (!dockerImage || !filePath || !script) {
    const error = new Error('dockerImage, filePath y script son obligatorios');
    error.statusCode = 400;
    throw error;
  }

  const absoluteFilePath = path.resolve(filePath);
  const extension = path.extname(absoluteFilePath).toLowerCase();

  if (!extension) {
    const error = new Error('La imagen o documento OCR debe tener una extensión válida');
    error.statusCode = 400;
    throw error;
  }

  const dockerInputPath = `/input/evidencia${extension}`;

  const args = [
    'run',
    '--rm',
    '-e',
    'PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True',
    '-v',
    `${absoluteFilePath}:${dockerInputPath}:ro`,
    '-v',
    'ocr-cuadre-caja-modelos:/root/.paddlex',
    dockerImage,
    'python',
    script,
    dockerInputPath
  ];

  try {
    console.log('[OCR] Ejecutando Docker:', OCR_DOCKER_PATH);
    console.log('[OCR] Args:', args.join(' '));

    const { stdout, stderr } = await execFileAsync(
      OCR_DOCKER_PATH,
      args,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    console.log('[OCR] Docker respondió. stdout length:', stdout?.length);

    return { stdout, stderr };
  } catch (error) {
    const mensaje = 
      error.stderr ||
      error.stdout ||
      error.message ||
      'Error desconocido ejecutando OCR';

    const ocrError = new Error(`Error ejecutando OCR: ${mensaje}`);
    ocrError.statusCode = 500;
    throw ocrError;
  }
};

/*
 * ============================================================
 * DETECCIÓN DE TIPO DE EVIDENCIA
 * ============================================================
 */

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

/*
 * ============================================================
 * SERVICIO PRINCIPAL OCR
 * ============================================================
 */

export const extractEvidenceData = async ({ filePath, mimeType, tipoEvidencia }) => {
  console.log('[OCR] Solicitud recibida. tipoEvidencia:', tipoEvidencia);
  console.log('[OCR] filePath:', filePath);
  console.log('[OCR] mimeType:', mimeType);

  if (!filePath || !mimeType || !tipoEvidencia) {
    const error = new Error('filePath, mimeType y tipoEvidencia son obligatorios');
    error.statusCode = 400;
    throw error;
  }

  const esTransferencia = isTransferencia(tipoEvidencia);

  const resultado = await runOcrContainer({
    dockerImage: esTransferencia ? OCR_IMAGE_TRANSFERENCIA : OCR_IMAGE_COMPROBANTE,
    filePath,
    script: esTransferencia ? 'app/main_transferencia.py' : 'app/main.py'
  });

  // El parser se encarga de interpretar el texto crudo
  const datosExtraidos = esTransferencia 
    ? parsearEvidencia(resultado.stdout) 
    : parsearComprobante(resultado.stdout);

  return {
    motor: 'PaddleOCR',
    build: esTransferencia ? OCR_IMAGE_TRANSFERENCIA : OCR_IMAGE_COMPROBANTE,
    estado: 'PROCESADO',
    confianza: null,
    texto_completo: resultado.stdout,
    datos_extraidos: datosExtraidos,
    salida_ocr: resultado.stdout,
    requiere_revision: true,
    requiere_confirmacion: true
  };
};