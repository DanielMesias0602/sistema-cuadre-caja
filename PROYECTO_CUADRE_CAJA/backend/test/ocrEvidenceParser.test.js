import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearEvidencia } from '../src/services/ocr/parser.js';

const salidaOcrConFechaHoraNoEstructurada = `DATOS EXTRAIDOS:
{
  "monto": 500.00,
  "aplicacion_banco": "YAPE",
  "referencia_bancaria": "06902044",
  "fecha_operacion": null,
  "hora_operacion": null,
  "destinatario": "Distribuidora De Ceramica Y Acabados S.a.c"
}

[0.99] S/ 500.00
[0.97] 27 oct. 2026 | 08:15 a. m.
[0.96] Nro. de operación 06902044`;

test('recovers the transfer date and time from Spanish OCR text when build JSON returns null', () => {
  const datos = parsearEvidencia(salidaOcrConFechaHoraNoEstructurada);

  assert.equal(datos.fecha_operacion, '27/10/2026');
  assert.equal(datos.hora_operacion, '08:15');
  assert.equal(datos.monto, 500);
  assert.equal(datos.referencia_bancaria, '06902044');
});

test('normalizes date and time values provided directly by the OCR JSON', () => {
  const salida = `DATOS EXTRAIDOS:
{
  "fecha_operacion": "27 oct. 2026",
  "hora_operacion": "08:15 a. m."
}
[0.99] 28 oct. 2026 | 09:00 a. m.`;

  const datos = parsearEvidencia(salida);
  assert.equal(datos.fecha_operacion, '27/10/2026');
  assert.equal(datos.hora_operacion, '08:15');
});

test('recovers the transfer date and time without a Python JSON block', () => {
  const datos = parsearEvidencia(`S/ 500.00
27 oct. 2026 | 08:15 a. m.`);

  assert.equal(datos.fecha_operacion, '27/10/2026');
  assert.equal(datos.hora_operacion, '08:15');
});
