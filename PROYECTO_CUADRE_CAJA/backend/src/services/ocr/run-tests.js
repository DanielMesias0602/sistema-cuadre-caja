import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsearComprobante, parsearEvidencia } from './parser.js';
import {
  fixturesComprobantes,
  fixturesEvidencias,
  fixturesPythonComprobantes,
  fixturesPythonEvidencias
} from './fixtures.js';

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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const pythonExecutable = process.env.PYTHON_BIN
  || (process.platform === 'win32' ? 'python' : 'python3');
const pythonParserProbe = `
import ast
import json
import sys
from pathlib import Path

def load_extractor(filename):
    source_path = Path(filename)
    tree = ast.parse(source_path.read_text(encoding="utf-8-sig"), filename=str(source_path))
    body = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            modules = (
                [alias.name.split(".")[0] for alias in node.names]
                if isinstance(node, ast.Import)
                else [(node.module or "").split(".")[0]]
            )
            if "paddleocr" not in modules:
                body.append(node)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.name not in {"get_ocr", "procesar_archivo", "main"}:
                body.append(node)

    module = ast.Module(body=body, type_ignores=[])
    ast.fix_missing_locations(module)
    namespace = {"__name__": "_ocr_parser_regression"}
    exec(compile(module, str(source_path), "exec"), namespace)
    return namespace

transfer_cases = json.loads(sys.argv[1])
receipt_cases = json.loads(sys.argv[2])
transfer_parser = load_extractor(sys.argv[3])
receipt_parser = load_extractor(sys.argv[4])
results = {
    "transferencias": [
        transfer_parser["extract_transfer_data"](case["lineasOCR"])
        for case in transfer_cases
    ],
    "comprobantes": [
        receipt_parser["extraer_datos_comprobante"](case["lineasOCR"])
        for case in receipt_cases
    ],
}
print(json.dumps(results, ensure_ascii=False))
`;

try {
  const salidaPython = execFileSync(pythonExecutable, [
    '-c',
    pythonParserProbe,
    JSON.stringify(fixturesPythonEvidencias),
    JSON.stringify(fixturesPythonComprobantes),
    path.join(projectRoot, 'main_transferencia_1_11.py'),
    path.join(projectRoot, 'main_ocr_1_7.py')
  ], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    maxBuffer: 8 * 1024 * 1024
  });
  const resultadosPython = JSON.parse(salidaPython);

  const validarCasoPython = (caso, recibido, campos) => {
    const errores = [];
    for (const campo of campos) {
      if (recibido[campo] !== caso.esperado[campo]) {
        errores.push(`${campo}: esperado ${caso.esperado[campo]}, recibido ${recibido[campo]}`);
      }
    }

    if (errores.length === 0) {
      console.log(`[PASS] Python ${caso.id}`);
      passed++;
    } else {
      console.error(`[FAIL] Python ${caso.id}`);
      errores.forEach(error => console.error(`       ${error}`));
      failed++;
      erroresTotales.push({ id: caso.id, errores });
    }
  };

  fixturesPythonEvidencias.forEach((caso, indice) => {
    const campos = [
      'monto',
      'referencia_bancaria',
      'fecha_operacion',
      'hora_operacion',
      'destinatario'
    ];
    if (Object.hasOwn(caso.esperado, 'cuenta_destino')) {
      campos.push('cuenta_destino');
    }
    validarCasoPython(
      caso,
      resultadosPython.transferencias[indice],
      campos
    );
  });

  fixturesPythonComprobantes.forEach((caso, indice) => {
    validarCasoPython(
      caso,
      resultadosPython.comprobantes[indice],
      ['fecha', 'hora', 'op_gravada', 'igv', 'total', 'cliente', 'vendedor']
    );
  });
} catch (error) {
  console.error('[FAIL] No se pudieron ejecutar las regresiones de los parsers Python.');
  console.error(error.stderr?.toString() || error.message);
  failed++;
}

console.log(`\n--- RESULTADOS: ${passed} PASARON, ${failed} FALLARON ---`);
if (failed > 0) process.exit(1);