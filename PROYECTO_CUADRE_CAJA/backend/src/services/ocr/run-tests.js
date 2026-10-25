import { parsearComprobante, parsearEvidencia } from './parser.js';
import { fixturesComprobantes, fixturesEvidencias } from './fixtures.js';

console.log('--- PRUEBAS OCR (13 CAMPOS) ---\n');

let passed = 0;
let failed = 0;
let erroresTotales = [];

fixturesComprobantes.forEach(f => {
  const r = parsearComprobante(f.textoReal);
  const errores = [];
  
  // Validar TODOS los campos
  if (r.tipo_comprobante !== f.esperado.tipo_comprobante) errores.push(`tipo: esperado ${f.esperado.tipo_comprobante}, recibido ${r.tipo_comprobante}`);
  if (r.serie !== f.esperado.serie) errores.push(`serie: esperado ${f.esperado.serie}, recibido ${r.serie}`);
  if (r.numero !== f.esperado.numero) errores.push(`numero: esperado ${f.esperado.numero}, recibido ${r.numero}`);
  if (r.fecha !== f.esperado.fecha) errores.push(`fecha: esperado ${f.esperado.fecha}, recibido ${r.fecha}`);
  if (r.hora !== f.esperado.hora) errores.push(`hora: esperado ${f.esperado.hora}, recibido ${r.hora}`);
  if (r.cliente !== f.esperado.cliente) errores.push(`cliente: esperado "${f.esperado.cliente}", recibido "${r.cliente}"`);
  if (r.vendedor !== f.esperado.vendedor) errores.push(`vendedor: esperado "${f.esperado.vendedor}", recibido "${r.vendedor}"`);
  if (r.monto !== f.esperado.monto) errores.push(`monto: esperado ${f.esperado.monto}, recibido ${r.monto}`);
  if (r.op_gravada !== f.esperado.op_gravada) errores.push(`op_gravada: esperado ${f.esperado.op_gravada}, recibido ${r.op_gravada}`);
  if (r.igv !== f.esperado.igv) errores.push(`igv: esperado ${f.esperado.igv}, recibido ${r.igv}`);
  if (r.moneda !== f.esperado.moneda) errores.push(`moneda: esperado ${f.esperado.moneda}, recibido ${r.moneda}`);
  if (r.items.length !== f.esperado.items_count) errores.push(`items: esperado ${f.esperado.items_count}, recibido ${r.items.length}`);
  
  if (errores.length === 0) {
    console.log(`[PASS] ${f.id} (13/13 campos correctos)`);
    passed++;
  } else {
    console.error(`[FAIL] ${f.id}`);
    errores.forEach(e => console.error(`       ${e}`));
    failed++;
    erroresTotales.push({ id: f.id, errores });
  }
});

fixturesEvidencias.forEach(f => {
  const r = parsearEvidencia(f.textoReal);
  const errores = [];
  
  if (r.monto !== f.esperado.monto) errores.push(`monto: esperado ${f.esperado.monto}, recibido ${r.monto}`);
  if (r.nro_operacion !== f.esperado.nro_operacion) errores.push(`nro_operacion: esperado ${f.esperado.nro_operacion}, recibido ${r.nro_operacion}`);
  
  if (errores.length === 0) {
    console.log(`[PASS] ${f.id} (2/2 campos correctos)`);
    passed++;
  } else {
    console.error(`[FAIL] ${f.id}`);
    errores.forEach(e => console.error(`       ${e}`));
    failed++;
  }
});

console.log(`\n--- RESULTADOS: ${passed} PASARON, ${failed} FALLARON ---`);
if (failed > 0) process.exit(1);