import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearComprobante, parsearEvidencia } from '../src/services/ocr/parser.js';

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

test('normalizes numeric dates with two-digit years from OCR text and JSON', () => {
  const datosDesdeTexto = parsearEvidencia(`S/ 500.00
27/10/26`);
  const datosDesdeJson = parsearEvidencia(`DATOS EXTRAIDOS:
{
  "fecha_operacion": "27/10/26"
}`);

  assert.equal(datosDesdeTexto.fecha_operacion, '27/10/2026');
  assert.equal(datosDesdeJson.fecha_operacion, '27/10/2026');
});

test('preserves Python customer and seller values instead of replacing them with raw OCR text', () => {
  const salida = `=== DATOS DEL COMPROBANTE ===
Tipo: BOLETA
Serie: BE03
Número: 00002937
Vendedor: LIZFRANCESCA
Cliente: LIZFRANCESCALOZAAYBAR

DATOS EXTRAIDOS:
{
  "tipo_comprobante": "BOLETA",
  "serie": "BE03",
  "numero": "00002937",
  "vendedor": "LIZ FRANCESCA",
  "cliente": "LIZ FRANCESCA LOZA AYBAR",
  "total": 2279,
  "igv": 347.64,
  "op_gravada": 1931.36,
  "productos": []
}

[0.98] CLIENTE:LIZFRANCESCALOZAAYBAR
[0.97] VENDEDOR(A):LIZFRANCESCA`;

  const datos = parsearComprobante(salida);

  assert.equal(datos.cliente, 'LIZ FRANCESCA LOZA AYBAR');
  assert.equal(datos.vendedor, 'LIZ FRANCESCA');
  assert.equal(datos.monto, 2279);
});

test('preserves Spanish Ñ from Python JSON through Node parsing and serialization', () => {
  const salida = `DATOS EXTRAIDOS:
{
  "tipo_comprobante": "BOLETA",
  "vendedor": "LORENA PEÑA",
  "cliente": "ALEXANDRA PEÑA",
  "total": 8,
  "igv": 1.22,
  "op_gravada": 6.78
}
[0.98] CLIENTE:ALEXANDRA PENA`;

  const datos = parsearComprobante(salida);
  const serializado = JSON.stringify(datos);

  assert.equal(datos.cliente, 'ALEXANDRA PEÑA');
  assert.equal(datos.vendedor, 'LORENA PEÑA');
  assert.match(serializado, /ALEXANDRA PEÑA/);
  assert.doesNotMatch(serializado, /ALEXANDRA PENA/);
});

test('uses Python receipt totals instead of recalculating from conflicting text', () => {
  const salida = `=== TOTALES ===
IGV: S/ 18.45
Total: S/ 690.31

DATOS EXTRAIDOS:
{
  "total": 792.80,
  "igv": 120.94,
  "op_gravada": 671.86
}`;

  const datos = parsearComprobante(salida);

  assert.equal(datos.monto, 792.80);
  assert.equal(datos.igv, 120.94);
  assert.equal(datos.op_gravada, 671.86);
});

test('does not replace explicit null name fields from Python with raw OCR guesses', () => {
  const salida = `DATOS EXTRAIDOS:
{
  "cliente": null,
  "vendedor": null
}
[0.98] CLIENTE:NOMBREOCRINCORRECTO
[0.97] VENDEDOR(A):VENDEDORINCORRECTO`;

  const datos = parsearComprobante(salida);

  assert.equal(datos.cliente, null);
  assert.equal(datos.vendedor, null);
});
