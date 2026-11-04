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
  "cliente": "CLARA TORNERO DIAZ",
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
  "vendedor": "JEFFERSON",
  "cliente": "LIZ FRANCESCA LOZA AYBAR",
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
      op_gravada: 3,
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
      monto: null,
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
  "vendedor": "LORENA",
  "cliente": "GLORIA ESMERALDA DE PAZ DE CORTEZ",
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
      op_gravada: null,
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
  "vendedor": "JEFFERSON",
  "cliente": "GRUPO DEL RIOS E.I.R.L.",
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
      op_gravada: null,
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

export const fixturesPythonEvidencias = [
  {
    id: 'Depósito en efectivo',
    lineasOCR: [
      'Depositoenefectivo',
      '31deoctubrede2026,17:04',
      'PEN10.00',
      'ABONOINMEDIATOOO2MARILYNYESELA',
      'ASC',
      'RESUMEN',
      'Cuenta deorigen',
      '002',
      'Concepto',
      'ABONOINMEDIATOOO2MARILYNYESELAASC',
      'DATOSADICIONALES',
      'Numerodemovimiento',
      '7344',
      'Fechadeoperacion',
      '31deoctubrede2026.17:04',
      'Compartir'
    ],
    esperado: {
      monto: 10,
      referencia_bancaria: '7344',
      fecha_operacion: '31/10/2026',
      hora_operacion: '17:04',
      destinatario: null
    }
  },
  {
    id: 'BBVA con código alfanumérico',
    lineasOCR: [
      '12:510',
      'Operacion',
      'exitosa',
      '17octubre2026,12:51h',
      'Importeenviado',
      'S/40.00',
      'Entidad de destino',
      'Yape',
      'Comision',
      'S/0.00',
      'Numerodeoperacion',
      '8A9D5FBBD8CB',
      'Tipo d',
      'eracion',
      'Envioa contactos',
      'Contacto',
      'Distribuidora d',
      'acabadoss',
      '·5583',
      'Salir'
    ],
    esperado: {
      monto: 40,
      referencia_bancaria: '8A9D5FBBD8CB',
      fecha_operacion: '17/10/2026',
      hora_operacion: '12:51',
      destinatario: 'Distribuidora d'
    }
  },
  {
    id: 'Interbank con fecha y referencia',
    lineasOCR: [
      '9:19日',
      'l4G',
      'appmovil@cmacica.com.pe',
      'Ahora',
      'Constancia:Transferencia Interbancaria Inmediata-..',
      'Hola ANABEL NATALY.Esta es la Constancia de fu',
      'operacion:Transterenca interbanearia mmediata Codig..',
      'Operacionexitosa',
      'Leenviaremos su comprobantedepago a su correo',
      'electronico',
      'Transferencia Interbancaria Inmediata',
      'Numerodeoperacion:209050808',
      'Fecha y hora:',
      '23/10/20269:18:49AM',
      'Cuenta de origen',
      '*************18558',
      'Entidad financiera destino:',
      'BBVA',
      'CCIdestino:',
      '01121500010002102011',
      'Beneficiario(s):',
      'DISTRIBUIDORADECERAMICAY',
      'ACABADOSSAC',
      'Moneda ymonto',
      'ComisionCaja lca',
      'S/1,920.00',
      'S/4.00',
      'ITF (Cuenta origen)',
      'S/ 0.05',
      'Comision destino:',
      'S/ 0.80'
    ],
    esperado: {
      monto: 1920,
      referencia_bancaria: '209050808',
      fecha_operacion: '23/10/2026',
      hora_operacion: '09:18:49',
      destinatario: 'DISTRIBUIDORADECERAMICAY ACABADOSSAC',
      cuenta_destino: '01121500010002102011'
    }
  },
  {
    id: 'Yape con banner publicitario',
    lineasOCR: [
      'iYapeaste!',
      'S/ 20',
      'Distribuidora De CeramicaY',
      'AcabadosS.a.c',
      '31oct.2026105:04p.m.',
      'DATOS DE LA TRANSACCION',
      'Destino',
      'Yape',
      'Nro.deoperacion',
      '04543200',
      'S/20',
      'S/60,00',
      'Impulsa',
      'tusproyecto',
      'IraCreditos'
    ],
    esperado: {
      monto: 20,
      referencia_bancaria: '04543200',
      fecha_operacion: '31/10/2026',
      hora_operacion: '17:04',
      destinatario: 'Distribuidora De CeramicaY'
    }
  },
  {
    id: 'Banco de la Nación y Yape',
    lineasOCR: [
      'iGracias,Edwin!',
      'Le operacionfue realizada con exito',
      '20/10/202617:39:59',
      'Nro.operacion:2679277',
      'S/54.00',
      'Entidad destino:YAPE',
      'Beneficiario:DISTRIBUIDORADE',
      'CERAMICAYAC',
      'Cuenta origen:04-010-660756',
      'Banco de la Nacion',
      'Comision:Gratis',
      'Monto cargado:S/54.00',
      'Nro.transferencia:000000000005685',
      'Compartir',
      'Irainicio'
    ],
    esperado: {
      monto: 54,
      referencia_bancaria: '000000000005685',
      fecha_operacion: '20/10/2026',
      hora_operacion: '17:39:59',
      destinatario: 'DISTRIBUIDORADE CERAMICAYAC'
    }
  },
  {
    id: 'Transferencia BCP con destinatario en varias líneas',
    lineasOCR: [
      '5:339',
      'Xe 1l 36',
      'iTransferencia exitosa!',
      'S/ 2,279.00',
      'Lunes,190ctubre2026-05:33p.m.',
      'Compartir',
      '+Descargar',
      'Enviadoa',
      'Distribuidora De CeramicaY',
      'AcabadosS.',
      '****5010',
      'Moneda Soles',
      'CuentasDeAhorro',
      'Desde',
      '****6038',
      '04894831',
      'Numero de operacion',
      'SEGURO',
      'ONCORESPALDO'
    ],
    esperado: {
      monto: 2279,
      referencia_bancaria: '04894831',
      fecha_operacion: '19/10/2026',
      hora_operacion: '17:33',
      destinatario: 'Distribuidora De CeramicaY AcabadosS.'
    }
  },
  {
    id: 'Culqi con monto mal reconocido y fecha pegada',
    lineasOCR: [
      'Culqi',
      'Tota1:s/ 72.50',
      '27/10/2607:54PM',
      'VENTA ID: 12345678'
    ],
    esperado: {
      monto: 72.5,
      referencia_bancaria: '12345678',
      fecha_operacion: '27/10/2026',
      hora_operacion: '07:54 PM',
      destinatario: 'Distribuidora de CerÐ“ÐŽmica y Acabados'
    }
  },
  {
    id: 'Culqi con Total convencional',
    lineasOCR: ['Culqi', 'Total: S/ 72.50', 'VENTA ID: 12345678'],
    esperado: {
      monto: 72.5,
      referencia_bancaria: '12345678',
      fecha_operacion: null,
      hora_operacion: null,
      destinatario: 'Distribuidora de CerÐ“ÐŽmica y Acabados'
    }
  },
  {
    id: 'Culqi con TOTAL en mayúsculas',
    lineasOCR: ['Culqi', 'TOTAL:S/ 72.50', 'VENTA ID: 12345678'],
    esperado: {
      monto: 72.5,
      referencia_bancaria: '12345678',
      fecha_operacion: null,
      hora_operacion: null,
      destinatario: 'Distribuidora de CerÐ“ÐŽmica y Acabados'
    }
  },
  {
    id: 'Culqi con letra I confundida con L',
    lineasOCR: ['Culqi', 'TotaI:s/ 72.50', 'VENTA ID: 12345678'],
    esperado: {
      monto: 72.5,
      referencia_bancaria: '12345678',
      fecha_operacion: null,
      hora_operacion: null,
      destinatario: 'Distribuidora de CerÐ“ÐŽmica y Acabados'
    }
  },
  {
    id: 'Culqi con L final reconocida en mayúscula',
    lineasOCR: ['Culqi', 'TotaL:s/ 72.50', 'VENTA ID: 12345678'],
    esperado: {
      monto: 72.5,
      referencia_bancaria: '12345678',
      fecha_operacion: null,
      hora_operacion: null,
      destinatario: 'Distribuidora de CerÐ“ÐŽmica y Acabados'
    }
  }
];

export const fixturesPythonComprobantes = [
  {
    id: 'Boleta con IGV y operación gravada correctos',
    lineasOCR: [
      'BOLETA DE VENTA ELECTRONICA',
      'BE03-00002774',
      'FECHADEEMISION:06/10/2026 HORA:19:57:31',
      'OP.GRAVADAS/:',
      '343.22',
      'I.G.V. S/ :',
      '61.78',
      'TOTAL S/ :',
      '405.00',
      'EFECTIVO S/:',
      '405.00',
      'CLIENTE:ZENON IRENE SORIANO CUSTODIO'
    ],
    esperado: {
      tipo_comprobante: 'BOLETA',
      fecha: '06/10/2026',
      hora: '19:57:31',
      op_gravada: 343.22,
      igv: 61.78,
      total: 405,
      cliente: 'ZENON IRENE SORIANO CUSTODIO',
      vendedor: null
    }
  },
  {
    id: 'IGV duplicado corregido por validación matemática',
    lineasOCR: [
      'BOLETA DE VENTA ELECTRONICA',
      'OP.GRAVADAS/:',
      '343.22',
      'I.G.V. S/ :',
      '343.22',
      'TOTAL S/ :',
      '405.00'
    ],
    esperado: {
      tipo_comprobante: 'BOLETA',
      fecha: null,
      hora: null,
      op_gravada: 343.22,
      igv: 61.78,
      total: 405,
      cliente: null,
      vendedor: null
    }
  },
  {
    id: 'Totales desordenados con etiquetas agrupadas',
    lineasOCR: [
      'BOLETA DE VENTA ELECTRONICA',
      '[0.93] OP.GRAVADA S/:',
      '[0.94] I.G.V.S/:',
      '[1.00] 671.86',
      '[0.97] TOTALS/:',
      '[1.00] 120.94',
      '[1.00] 792.80'
    ],
    esperado: {
      tipo_comprobante: 'BOLETA',
      fecha: null,
      hora: null,
      op_gravada: 671.86,
      igv: 120.94,
      total: 792.8,
      cliente: null,
      vendedor: null
    }
  },
  {
    id: 'Nombres españoles con Ñ leída como N',
    lineasOCR: [
      'BOLETA DE VENTA ELECTRONICA',
      'CLIENTE: ALEXANDRA PENA MUNOZ CANAS NINO',
      'VENDEDOR(A): PENA MUNOZ CANAS NINO'
    ],
    esperado: {
      tipo_comprobante: 'BOLETA',
      fecha: null,
      hora: null,
      op_gravada: null,
      igv: null,
      total: null,
      cliente: 'ALEXANDRA PEÑA MUÑOZ CAÑAS NIÑO',
      vendedor: 'PEÑA MUÑOZ CAÑAS NIÑO'
    }
  },
  {
    id: 'Nombres españoles con Ñ original conservada',
    lineasOCR: [
      'BOLETA DE VENTA ELECTRONICA',
      'CLIENTE: ALEXANDRA PEÑA',
      'VENDEDOR(A): PEÑA'
    ],
    esperado: {
      tipo_comprobante: 'BOLETA',
      fecha: null,
      hora: null,
      op_gravada: null,
      igv: null,
      total: null,
      cliente: 'ALEXANDRA PEÑA',
      vendedor: 'PEÑA'
    }
  },
  {
    id: 'Nombre cliente y vendedor sin espacios',
    lineasOCR: [
      'BOLETA DE VENTA ELECTRONICA',
      'CLIENTE:LIZFRANCESCALOZAAYBAR',
      'VENDEDOR(A):LIZFRANCESCA'
    ],
    esperado: {
      tipo_comprobante: 'BOLETA',
      fecha: null,
      hora: null,
      op_gravada: null,
      igv: null,
      total: null,
      cliente: 'LIZ FRANCESCA LOZA AYBAR',
      vendedor: 'LIZ FRANCESCA'
    }
  },
  {
    id: 'Nombre con espacios existentes no se modifica',
    lineasOCR: [
      'BOLETA DE VENTA ELECTRONICA',
      'CLIENTE: ALEXANDRA PEÑA',
      'VENDEDOR(A): LORENA'
    ],
    esperado: {
      tipo_comprobante: 'BOLETA',
      fecha: null,
      hora: null,
      op_gravada: null,
      igv: null,
      total: null,
      cliente: 'ALEXANDRA PEÑA',
      vendedor: 'LORENA'
    }
  },
  {
    id: 'Factura tolerante con razón social y vendedor en una línea',
    lineasOCR: [
      'F A C T U R A ELECTRÓNICA',
      'CLIENTE: ODONTOMIA S.A.C.',
      'VENDEDOR(A): LORENA'
    ],
    esperado: {
      tipo_comprobante: 'FACTURA',
      fecha: null,
      hora: null,
      op_gravada: null,
      igv: null,
      total: null,
      cliente: 'ODONTOMIA S.A.C.',
      vendedor: 'LORENA'
    }
  },
  {
    id: 'Factura con campos separados en varias líneas',
    lineasOCR: [
      '[0.98] f a c t u r a e l e c t r ó n i c a',
      '[0.97] CLIENTE',
      'ODONTOMIA',
      'S.A.C.',
      'VENDEDOR:',
      'LORENA'
    ],
    esperado: {
      tipo_comprobante: 'FACTURA',
      fecha: null,
      hora: null,
      op_gravada: null,
      igv: null,
      total: null,
      cliente: 'ODONTOMIA S.A.C.',
      vendedor: 'LORENA'
    }
  },
  {
    id: 'Factura con JSON contaminante y prefijo OCR en la serie',
    lineasOCR: [
      '[0.98] FACTURA ELECTRÓNICA',
      '[0.97] NFE03-00001234',
      '[0.96] 10:11:24',
      '[0.95] CLIENTE: ODONTOMIA S.A.C."*cliente"*null,"productos":[]',
      '[0.94] VENDEDOR(A): LORENA,"cliente":null,"productos":[]'
    ],
    esperado: {
      tipo_comprobante: 'FACTURA',
      serie: 'FE03',
      numero: '00001234',
      fecha: null,
      hora: '10:11:24',
      op_gravada: null,
      igv: null,
      total: null,
      cliente: 'ODONTOMIA S.A.C.',
      vendedor: 'LORENA'
    }
  },
  {
    id: 'Cliente no absorbe representacion impresa en la siguiente línea',
    lineasOCR: [
      'FACTURA ELECTRONICA',
      'CLIENTE: GRUPO DEL RIOS E.I.R.L.',
      'Representacion impresa del comprobante electronico',
      'PEDIDOS: 01-234-5678',
      'VENDEDOR(A): LORENA'
    ],
    esperado: {
      tipo_comprobante: 'FACTURA',
      fecha: null,
      hora: null,
      op_gravada: null,
      igv: null,
      total: null,
      cliente: 'GRUPO DEL RIOS E.I.R.L.',
      vendedor: 'LORENA'
    }
  },
  {
    id: 'Cliente se limita a 60 caracteres',
    lineasOCR: [
      'FACTURA ELECTRONICA',
      `CLIENTE: ${'A'.repeat(70)}`,
      'VENDEDOR(A): LORENA'
    ],
    esperado: {
      tipo_comprobante: 'FACTURA',
      fecha: null,
      hora: null,
      op_gravada: null,
      igv: null,
      total: null,
      cliente: 'A'.repeat(60),
      vendedor: 'LORENA'
    }
  }
];