export const fixturesComprobantes = [
  { 
    id: 'BE03-00002773', 
    textoReal: `=== DATOS DEL COMPROBANTE ===
Tipo: BOLETA
Serie: BE03
Número: 00002773
Fecha: None
Hora: 19:19:17
Vendedor: JEFFERSON

=== DETALLE DE PRODUCTOS ===
Producto 1
Descripción: LLG36001C CERAMICA CAJAS
Cantidad: 1.08
Precio unitario: S/ 138.89
Total: S/ 150.00

Producto 2
Descripción: COMISION POR VENTA da PC CON TARJETA Pagodo
Cantidad: 1.0
Precio unitario: S/ 5.00
Total: S/ 5.00

=== TOTALES ===
IGV: S/ 23.64
Efectivo: None
Total: S/ 155.00
Moneda: PEN

DATOS EXTRAIDOS:
{
  "tipo_comprobante": "BOLETA",
  "serie": "BE03",
  "numero": "00002773",
  "fecha": "None",
  "hora": "19:19:17",
  "vendedor": "JEFFERSON",
  "cliente": null,
  "monto": 155,
  "igv": 23.64,
  "efectivo": null,
  "moneda": "PEN",
  "op_gravada": 131.36,
  "items": []
}

[1.00] FECHA
[0.82] Rgoda
[1.00] DE
[1.00] EMISIÓN
[1.00] :06/10/2026
[0.98] HORA : 19:19:17
[0.99] OP. GRAVADA S/ :
[0.49] 3
[1.00] 131.36
[0.99] DNI/OTROS :
[1.00] 44782223
[1.00] CLIENTE
[0.60] oda
[1.00] CLARA TORNERO DIAZ
[0.97] VENDEDOR(A) : JEFFERSON`,
    esperado: {
      tipo_comprobante: 'BOLETA',
      serie: 'BE03',
      numero: '00002773',
      fecha: '06/10/2026',
      hora: '19:19:17',
      cliente: 'CLARA TORNERO DIAZ',
      vendedor: 'JEFFERSON',
      monto: 155.00,
      op_gravada: 131.36,
      igv: 23.64,
      moneda: 'PEN',
      items_count: 2
    } 
  },
  { 
    id: 'BE03-00002937', 
    textoReal: `=== DATOS DEL COMPROBANTE ===
Tipo: BOLETA
Serie: BE03
Número: 00002937
Fecha: 19/10/2026
Hora: 17:34:01
Vendedor: JEFFERSON

=== DETALLE DE PRODUCTOS ===
Producto 1
Descripción: LPY66024 FLOOR TILE
Cantidad: 61.92
Precio unitario: S/ 36.81
Total: S/ 2279.00

=== TOTALES ===
IGV: S/ 347.64
Efectivo: S/ 2279.00
Total: S/ 2279.00
Moneda: PEN

DATOS EXTRAIDOS:
{
  "tipo_comprobante": "BOLETA",
  "serie": "BE03",
  "numero": "00002937",
  "fecha": "19/10/2026",
  "hora": "17:34:01",
  "vendedor": null,
  "cliente": "oda",
  "monto": 2279,
  "igv": 347.64,
  "op_gravada": 3,
  "efectivo": 2279,
  "moneda": "PEN",
  "items": []
}

CLIENTE : LIZ FRANCESCA LOZA AYBAR
OP. GRAVADA S/ :
1,931.36`,
    esperado: {
      tipo_comprobante: 'BOLETA',
      serie: 'BE03',
      numero: '00002937',
      fecha: '19/10/2026',
      hora: '17:34:01',
      cliente: 'LIZ FRANCESCA LOZA AYBAR',
      vendedor: 'JEFFERSON',
      monto: 2279.00,
      op_gravada: 1931.36,
      igv: 347.64,
      moneda: 'PEN',
      items_count: 1
    } 
  },
  { 
    id: 'FE03-00000387', 
    textoReal: `=== DATOS DEL COMPROBANTE ===
Tipo: FACTURA
Serie: None
Número: None
Fecha: 06/10/2026
Hora: 10:11:24
Vendedor: LORENA

=== DETALLE DE PRODUCTOS ===
Producto 1
Descripción: 45X45 SAN LORENZO goda PC PARQUET SCALONI MIX 2.29 de 27X45 CAVERNET DC
Cantidad: 9.16
Precio unitario: S/ 24.89
Total: S/ 228.00

Producto 2
Descripción: BEIGE 2.07 -CO Pagodo
Cantidad: 4.14
Precio unitario: S/ 23.19
Total: S/ 96.00

Producto 3
Descripción: PEGAMENTO CHEMITA C BLANCO EXTRAFUERTE - 25 KG Pago
Cantidad: 4.0
Precio unitario: S/ 37.00
Total: S/ 148.00

Producto 4
Descripción: PERFIL PVC 8.5MM X 1.85MTS - CUERO CLARO . Pacod
Cantidad: 13.0
Precio unitario: S/ 3.00
Total: S/ 39.00

Producto 5
Descripción: COMISION POR VENTA Dagoda CON TARJETA
Cantidad: 1.0
Precio unitario: S/ 17.90
Total: S/ 17.90

=== TOTALES ===
IGV: S/ 80.68
Efectivo: S/ 528.90
Total: None
Moneda: None

DATOS EXTRAIDOS:
{
  "tipo_comprobante": "FACTURA",
  "serie": null,
  "numero": null,
  "fecha": "06/10/2026",
  "hora": "10:11:24",
  "vendedor": "LORENA",
  "cliente": "ODONTOMIA S.A.C.",
  "monto": null,
  "igv": 80.68,
  "efectivo": 528.9,
  "moneda": "PEN",
  "op_gravada": 448.22,
  "items": []
}

FE03-00000387
OP. GRAVADA S/ :
448.22
528.90
528.90
NOMBRE
ODONTOMIA S.A.C.`,
    esperado: {
      tipo_comprobante: 'FACTURA',
      serie: 'FE03',
      numero: '00000387',
      fecha: '06/10/2026',
      hora: '10:11:24',
      cliente: 'ODONTOMIA S.A.C.',
      vendedor: 'LORENA',
      monto: 528.90,
      op_gravada: 448.22,
      igv: 80.68,
      moneda: 'PEN',
      items_count: 5
    } 
  },
  { 
    id: 'BE02-00024034', 
    textoReal: `=== DATOS DEL COMPROBANTE ===
Tipo: BOLETA
Serie: BE02
Número: 00024034
Fecha: 29/09/2026
Hora: 08:32:39
Vendedor: LORENA

=== DETALLE DE PRODUCTOS ===
Producto 1
Descripción: PERFIL PVC 8.5MM X 1.85MTS - ALUMINIO
Cantidad: 10.00
Precio unitario: S/ 3.00
Total: S/ 30.00

=== TOTALES ===
IGV: S/ 4.58
Efectivo: S/ 30.00
Total: S/ 30.00
Moneda: PEN

DATOS EXTRAIDOS:
{
  "tipo_comprobante": "BOLETA",
  "serie": "BE02",
  "numero": "00024034",
  "fecha": "29/09/2026",
  "hora": "08:32:39",
  "vendedor": null,
  "cliente": null,
  "monto": 30,
  "igv": 4.58,
  "op_gravada": null,
  "efectivo": 30,
  "moneda": "PEN",
  "items": []
}

CLIENTE : GLORIA ESMERALDA DE PAZ DE CORTEZ
OP. GRAVADA S/ :
25.42`,
    esperado: {
      tipo_comprobante: 'BOLETA',
      serie: 'BE02',
      numero: '00024034',
      fecha: '29/09/2026',
      hora: '08:32:39',
      cliente: 'GLORIA ESMERALDA DE PAZ DE CORTEZ',
      vendedor: 'LORENA',
      monto: 30.00,
      op_gravada: 25.42,
      igv: 4.58,
      moneda: 'PEN',
      items_count: 1
    } 
  },
  { 
    id: 'FE02-00002548', 
    textoReal: `=== DATOS DEL COMPROBANTE ===
Tipo: FACTURA
Serie: FE02
Número: 00002548
Fecha: 29/09/2026
Hora: 02:20:36
Vendedor: JEFFERSON

=== DETALLE DE PRODUCTOS ===
Producto 1
Descripción: 30X60 SAN LORENZO ARTIC BLANCO BRILLO
Cantidad: 36.00
Precio unitario: S/ 40.89
Total: S/ 1472.00

=== TOTALES ===
IGV: S/ 224.54
Efectivo: S/ 1472.00
Total: S/ 1472.00
Moneda: PEN

DATOS EXTRAIDOS:
{
  "tipo_comprobante": "FACTURA",
  "serie": "FE02",
  "numero": "00002548",
  "fecha": "29/09/2026",
  "hora": "02:20:36",
  "vendedor": null,
  "cliente": null,
  "monto": 1472,
  "igv": 224.54,
  "op_gravada": null,
  "efectivo": null,
  "moneda": "PEN",
  "items": []
}

RUC/PASAPORTE/CARNET EXT. : 20600518969
NOMBRE : GRUPO DEL RIOS E.I.R.L.
OP. GRAVADA S/ :
1,247.46`,
    esperado: {
      tipo_comprobante: 'FACTURA',
      serie: 'FE02',
      numero: '00002548',
      fecha: '29/09/2026',
      hora: '02:20:36',
      cliente: 'GRUPO DEL RIOS E.I.R.L.',
      vendedor: 'JEFFERSON',
      monto: 1472.00,
      op_gravada: 1247.46,
      igv: 224.54,
      moneda: 'PEN',
      items_count: 1
    } 
  }
];

export const fixturesEvidencias = [
  { id: 'Yape 65', textoReal: `S/ 65\nNro. de operación 06823113`, esperado: { monto: 65.00, nro_operacion: '06823113' } },
  { id: 'Plin 394', textoReal: `S/ 394.00\nCódigo de operación: 79546982`, esperado: { monto: 394.00, nro_operacion: '79546982' } },
  { id: 'BBVA 500', textoReal: `S/ 500.00\nNúmero de operación 9AABEEBA2B13`, esperado: { monto: 500.00, nro_operacion: '9AABEEBA2B13' } },
  { id: 'BCP 2279', textoReal: `S/ 2,279.00\nNúmero de operación 04894831`, esperado: { monto: 2279.00, nro_operacion: '04894831' } }
];