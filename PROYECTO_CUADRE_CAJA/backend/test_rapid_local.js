import path from 'node:path';
import { access } from 'node:fs/promises';

const TIPOS_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

const main = async () => {
  const inicioTotal = process.hrtime.bigint();
  const [rutaImagen, tipoEvidencia = 'COMPROBANTE'] = process.argv.slice(2);
  if (!rutaImagen) {
    console.error(
      'Uso: node test_rapid_local.js <ruta_imagen> [tipo_evidencia]'
    );
    process.exitCode = 2;
    return;
  }

  const filePath = path.resolve(rutaImagen);
  const mimeType = TIPOS_MIME[path.extname(filePath).toLowerCase()];
  if (!mimeType) {
    throw new Error('Extensión no compatible. Use JPG, PNG, WEBP o PDF.');
  }

  await access(filePath);
  const inicioCargaServicio = process.hrtime.bigint();
  const { extractEvidenceData } = await import('./src/services/ocr.service.js');
  const tiempoCargaServicio = process.hrtime.bigint() - inicioCargaServicio;

  const inicioOcr = process.hrtime.bigint();
  const resultado = await extractEvidenceData({
    filePath,
    mimeType,
    tipoEvidencia
  });
  const tiempoOcr = process.hrtime.bigint() - inicioOcr;
  console.log(JSON.stringify(resultado, null, 2));
  const tiempoTotal = process.hrtime.bigint() - inicioTotal;

  console.log('\n--- Tiempos de procesamiento ---');
  console.log(
    `Tiempo de carga del servicio: ${(Number(tiempoCargaServicio) / 1e9).toFixed(2)} segundos`
  );
  console.log(
    `Tiempo de inferencia OCR: ${(Number(tiempoOcr) / 1e9).toFixed(2)} segundos`
  );
  console.log(
    `Tiempo total del proceso: ${(Number(tiempoTotal) / 1e9).toFixed(2)} segundos`
  );
};

main().catch((error) => {
  console.error(error.message || 'Falló la prueba local de RapidOCR');
  process.exitCode = 1;
});
