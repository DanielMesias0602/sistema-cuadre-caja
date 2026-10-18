import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

/*
 * ============================================================
 * CONFIGURACIÓN DE BUILDS OCR
 * ============================================================
 *
 * Build 1.7  -> BOLETA / FACTURA
 * Build 1.11 -> TRANSFERENCIA
 */

const OCR_IMAGE_COMPROBANTE = 'ocr-cuadre-caja:1.7';
const OCR_IMAGE_TRANSFERENCIA = 'ocr-cuadre-caja:1.11';

const OCR_DOCKER_PATH =
  process.env.OCR_DOCKER_PATH || 'docker';

/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

const limpiarValor = (valor) => {
  if (valor === undefined || valor === null) {
    return null;
  }

  const limpio = String(valor).trim();

  // El parser Python devuelve el string "None" cuando no encuentra el campo.
  if (!limpio || limpio === 'None' || limpio === 'null') {
    return null;
  }

  return limpio;
};

const parsearMonto = (valor) => {
  if (valor === null || valor === undefined) {
    return null;
  }

  const texto = String(valor)
    .replace(/S\/\s*/gi, '')
    .replace(/\s/g, '')
    .replace(/,/g, '');

  const numero = Number.parseFloat(texto);

  return Number.isFinite(numero) ? numero : null;
};

const extraerCampo = (texto, patron) => {
  if (!texto) {
    return null;
  }

  const match = texto.match(patron);

  return match
    ? limpiarValor(match[1])
    : null;
};

/*
 * Extrae una sección del output del OCR.
 */
const extraerSeccion = (texto, nombre) => {
  if (!texto) {
    return '';
  }

  const regex = new RegExp(
    `===\\s*${nombre}\\s*===([\\s\\S]*?)(?====\\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\\s]*\\s*===|$)`,
    'i'
  );

  const match = texto.match(regex);

  return match ? match[1].trim() : '';
};

/*
 * Normaliza texto con mojibake de UTF-8.
 */
const normalizar = (texto) => {
  if (!texto) {
    return '';
  }

  try {
    return String(texto)
      .normalize('NFC')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã‘/g, 'Ñ');
  } catch (_) {
    return String(texto);
  }
};

const normalizarHora = (horaTexto) => {
  if (!horaTexto) {
    return null;
  }
  
  // Formato "HH:MM:SS p.m." o "HH:MM p.m."
  const match12h = String(horaTexto).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
  
  if (match12h) {
    let hora = parseInt(match12h[1], 10);
    const min = match12h[2];
    const seg = match12h[3] || '00';
    const periodo = match12h[4].toLowerCase();
    
    if (periodo.includes('p') && hora < 12) {
      hora += 12;
    }
    
    if (periodo.includes('a') && hora === 12) {
      hora = 0;
    }
    
    return `${String(hora).padStart(2, '0')}:${min}:${seg}`;
  }
  
  // Formato ya 24h "HH:MM:SS"
  const match24h = String(horaTexto).match(/(\d{2}:\d{2}(?::\d{2})?)/);
  
  if (match24h) {
    return match24h[1];
  }
  
  return null;
};

/*
 * ============================================================
 * LIMPIEZA INTELIGENTE DE DESCRIPCIÓN
 * ============================================================
 */
const limpiarDescripcion = (desc) => {
  if (!desc) {
    return null;
  }
  
  let limpio = String(desc);
  
  // Elimina las variaciones del logo Pagoda y palabras sueltas
  limpio = limpio.replace(/\b(Pagoda|agoda|oda|goda|Pagodo|Pacod|Dagoda|Pag|pago|Pago|PC|DC|PE|pca|dc)\b/gi, '');
  
  // Elimina letras sueltas manteniendo unidades de medida
  const unidades = new Set([
    'kg', 'mt', 'cm', 'ml', 'lt', 'un', 'pc', 'pz', 'caj', 'und', 'gr', 'm2'
  ]);
  
  limpio = limpio.replace(/\b([a-z]{1,2})\b/gi, (match) => {
    if (unidades.has(match.toLowerCase())) {
      return match;
    }
    return ''; 
  });

  // Quita símbolos huérfanos y espacios dobles
  limpio = limpio.replace(/[\.\-]\s*$/g, '');
  limpio = limpio.replace(/\s+/g, ' ').trim();
  
  return limpio || null;
};

/*
 * ============================================================
 * SEPARADOR DE PRODUCTOS MEZCLADOS
 * ============================================================
 */
const dividirDescripcionMezclada = (desc) => {
  if (!desc) return { principal: null, sobrante: null };

  const dimensiones = desc.match(/\d+\s*X\s*\d+/gi);
  
  if (dimensiones && dimensiones.length > 1) {
    const splitIndex = desc.indexOf(dimensiones[1]);
    
    if (splitIndex > 0) {
      const principal = desc.substring(0, splitIndex).trim();
      const sobrante = desc.substring(splitIndex).trim();
      
      return { principal, sobrante };
    }
  }
  
  return { principal: desc, sobrante: null };
};

/*
 * ============================================================
 * EJECUCIÓN DEL CONTENEDOR OCR
 * ============================================================
 */

const runOcrContainer = async ({
  dockerImage,
  filePath,
  script
}) => {
  if (!dockerImage || !filePath || !script) {
    const error = new Error(
      'dockerImage, filePath y script son obligatorios'
    );

    error.statusCode = 400;
    throw error;
  }

  const absoluteFilePath = path.resolve(filePath);
  const extension = path.extname(absoluteFilePath).toLowerCase();

  if (!extension) {
    const error = new Error(
      'La imagen o documento OCR debe tener una extensión válida'
    );

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
      {
        maxBuffer: 10 * 1024 * 1024
      }
    );

    console.log('[OCR] Docker respondió. stdout length:', stdout?.length);

    return {
      stdout,
      stderr
    };
  } catch (error) {
    const mensaje = 
      error.stderr ||
      error.stdout ||
      error.message ||
      'Error desconocido ejecutando OCR';

    const ocrError = new Error(
      `Error ejecutando OCR: ${mensaje}`
    );

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
  const tipo = String(tipoEvidencia)
    .trim()
    .toUpperCase();

  return (
    tipo === 'TRANSFERENCIA' ||
    tipo === 'TRANSFERENCIA_BCP' ||
    tipo === 'TRANSFERENCIA_BBVA' ||
    tipo === 'TRANSFERENCIA_INTERBANK' ||
    tipo === 'TRANSFERENCIA_SCOTIABANK' ||
    tipo === 'TRANSFERENCIA_BANBIF'
  );
};

/*
 * ============================================================
 * PARSER DE ITEMS (DETALLE DE PRODUCTOS)
 * ============================================================
 */

const parsearItems = (seccionProductos) => {
  if (!seccionProductos) {
    return [];
  }

  const normalizado = normalizar(seccionProductos);

  const bloques = normalizado
    .split(/Producto\s+\d+\s*/i)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  const items = [];
  let sobranteAnterior = null;

  for (const bloque of bloques) {
    let descRaw = extraerCampo(
      bloque,
      /Descripci[oó]n:\s*(.+)/i
    );

    if (sobranteAnterior) {
      if (descRaw) {
        descRaw = `${sobranteAnterior} ${descRaw}`;
      } else {
        descRaw = sobranteAnterior;
      }
      sobranteAnterior = null;
    }

    let principal = descRaw;
    
    if (descRaw) {
      const dividido = dividirDescripcionMezclada(descRaw);
      principal = dividido.principal;
      sobranteAnterior = dividido.sobrante;
    }

    const cantidadTexto = extraerCampo(
      bloque,
      /Cantidad:\s*([\d.,]+)/i
    );

    const precioTexto = extraerCampo(
      bloque,
      /Precio\s+unitario:\s*S\/\s*([\d.,]+)/i
    );

    const totalTexto = extraerCampo(
      bloque,
      /Total:\s*S\/\s*([\d.,]+)/i
    );

    if (principal || totalTexto) {
      items.push({
        descripcion: limpiarDescripcion(principal),
        cantidad: parsearMonto(cantidadTexto),
        precio_unitario: parsearMonto(precioTexto),
        total: parsearMonto(totalTexto)
      });
    }
  }

  return items;
};

/*
 * ============================================================
 * PARSER DE BOLETA / FACTURA
 * ============================================================
 */

const parsearComprobante = (salidaOcr) => {
  const textoOriginal = String(salidaOcr || '').replace(/\[\d+\.\d+\]/g, '');
  const texto = normalizar(textoOriginal);

  const textoLimpio = texto
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ');

  const seccionDatos = extraerSeccion(texto, 'DATOS DEL COMPROBANTE');
  const seccionProductos = extraerSeccion(texto, 'DETALLE DE PRODUCTOS');
  const seccionTotales = extraerSeccion(texto, 'TOTALES');

  const fuenteDatos = seccionDatos || texto;
  const fuenteTotales = seccionTotales || texto;

  const tipo_comprobante = extraerCampo(fuenteDatos, /Tipo:\s*(.+)/i);

  // SERIE Y NÚMERO
  let serie = extraerCampo(fuenteDatos, /Serie:\s*(.+)/i);
  let numero = extraerCampo(fuenteDatos, /N[uúÃ]{1,3}mero:\s*(.+)/i);
  
  if (!serie || !numero) {
    const matchSerieNumero = texto.match(/([A-Z0-9]{2,4})-(\d{6,})/i);
    if (matchSerieNumero) {
      if (!serie) serie = matchSerieNumero[1];
      if (!numero) numero = matchSerieNumero[2];
    }
  }

  // FECHA
  let fecha = extraerCampo(fuenteDatos, /Fecha:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (!fecha) {
    fecha = extraerCampo(texto, /(?:FECHA|EMISI[OÓ]N)[\s\S]{0,60}?(\d{2}\/\d{2}\/\d{4})/i);
  }

  // HORA Y VENDEDOR
  const horaTexto = extraerCampo(fuenteDatos, /Hora:\s*(\d{2}:\d{2}(?::\d{2})?)/i);
  const hora = normalizarHora(horaTexto);
  const vendedor = extraerCampo(fuenteDatos, /Vendedor(?:\(A\))?:\s*(.+)/i);
  
  /*
   * ----------------------------------------------------------
   * CLIENTE (Lógica corregida RUC vs DNI)
   * ----------------------------------------------------------
   */
  // Detectamos qué tipo de documento tiene el comprobante
  const tieneRuc = /RUC\/PASAPORTE\/CARNET EXT\.|RUC\.\s*N°/i.test(texto);
  const tieneDni = /DNI\/OTROS|DNI\s*:/i.test(texto);
  
  // Extraemos ambos campos posibles
  const nombreField = extraerCampo(texto, /NOMBRE\s*:?\s*([^\n]+)/i);
  const clienteField = extraerCampo(texto, /CLIENTE\s*:?\s*([^\n]+)/i);
  
  let cliente = null;
  
  if (tieneRuc && nombreField) {
    // Si es RUC, la empresa está en el campo NOMBRE
    cliente = nombreField;
  } else if (tieneDni && clienteField) {
    // Si es DNI, la persona está en el campo CLIENTE
    cliente = clienteField;
  } else if (nombreField) {
    cliente = nombreField;
  } else if (clienteField) {
    cliente = clienteField;
  }

  if (cliente) {
    cliente = cliente.replace(/^[^a-zA-Z0-9]+/, '').trim();
  }

  /*
   * ----------------------------------------------------------
   * TOTALES (IGV, OP GRAVADA, TOTAL, EFECTIVO)
   * ----------------------------------------------------------
   */
  let igvTexto = extraerCampo(textoLimpio, /I\.?G\.?V\.?\s*S\/.*?([\d.,]+)/i);
  let opGravadaTexto = extraerCampo(textoLimpio, /OP\.?\s*GRAVADA\s*S\/.*?([\d.,]+)/i);
  const efectivoTexto = extraerCampo(fuenteTotales, /Efectivo:\s*S\/\s*([\d.,]+)/i);
  
  let totalTexto = extraerCampo(fuenteTotales, /Total:\s*S\/\s*([\d.,]+)/i);
  
  if (!totalTexto || totalTexto === 'None') {
    const matchPlanB = 
      textoLimpio.match(/TOTAL S\/\s*:?\s*([\d.,]+)/i) || 
      textoLimpio.match(/([\d.,]+)\s*TOTAL S\//i);
      
    if (matchPlanB) {
      totalTexto = matchPlanB[1];
    } else if (efectivoTexto) {
      totalTexto = efectivoTexto;
    }
  }

  const moneda = extraerCampo(fuenteTotales, /Moneda:\s*([A-Z]+)/i) || 'PEN';

  // ITEMS
  const items = parsearItems(seccionProductos);

  /*
   * ----------------------------------------------------------
   * MEDIO DE PAGO
   * ----------------------------------------------------------
   */
  let medio_pago = null;
  const textoLower = texto.toLowerCase();

  if (textoLower.includes('bbva')) {
    medio_pago = 'BBVA';
  } else if (textoLower.includes('bcp')) {
    medio_pago = 'BCP';
  } else if (textoLower.includes('yape')) {
    medio_pago = 'YAPE';
  } else if (textoLower.includes('interbank')) {
    medio_pago = 'INTERBANK';
  } else if (textoLower.includes('scotiabank')) {
    medio_pago = 'SCOTIABANK';
  } else if (efectivoTexto && efectivoTexto !== 'None' && parsearMonto(efectivoTexto) > 0) {
    medio_pago = 'EFECTIVO';
  } else if (/FORMA DE PAGO\s*:?\s*TARJETA/i.test(texto)) {
    medio_pago = 'TARJETA';
  } else if (textoLower.includes('contado')) {
    medio_pago = 'CONTADO';
  }

  return {
    tipo_comprobante: limpiarValor(tipo_comprobante),
    serie: limpiarValor(serie),
    numero: limpiarValor(numero),
    fecha: limpiarValor(fecha),
    hora: hora,
    monto: parsearMonto(totalTexto),
    moneda: moneda,
    medio_pago: medio_pago,
    referencia_bancaria: null,
    titular: null,
    receptor: null,
    vendedor: limpiarValor(vendedor),
    cliente: limpiarValor(cliente),
    igv: parsearMonto(igvTexto),
    op_gravada: parsearMonto(opGravadaTexto),
    efectivo: parsearMonto(efectivoTexto),
    items
  };
};

/*
 * ============================================================
 * PARSER DE TRANSFERENCIA
 * ============================================================
 */

const parsearTransferencia = (salidaOcr) => {
  const texto = normalizar(String(salidaOcr || '').replace(/\[\d+\.\d+\]/g, ''));
  const datos = { tipo_evidencia: 'TRANSFERENCIA' };

  const campos = [
    { clave: 'aplicacion_banco', patron: /Aplicaci[oó]n\s*\/\s*banco:\s*(.+)/i },
    { clave: 'estado_transferencia', patron: /Estado de transferencia:\s*(.+)/i },
    { clave: 'fecha_operacion', patron: /Fecha de operaci[oó]n:\s*(\d{2}\/\d{2}\/\d{4})/i },
    { clave: 'hora_operacion', patron: /Hora de operaci[oó]n:\s*(\d{2}:\d{2})/i },
    { clave: 'destinatario', patron: /Destinatario:\s*(.+)/i },
    { clave: 'cuenta_destino', patron: /Cuenta destino:\s*(.+)/i },
    { clave: 'tipo_cuenta_origen', patron: /^Tipo de cuenta origen:\s*(.+)$/im },
    { clave: 'cuenta_origen', patron: /^Cuenta origen:\s*(.+)$/im },
    { clave: 'mensaje', patron: /Mensaje:\s*(.+)/i },
    { clave: 'descripcion', patron: /Descripci[oó]n:\s*(.+)/i },
    { clave: 'sucursal_agencia', patron: /Sucursal\/agencia:\s*(.+)/i },
    { clave: 'cuenta_movimiento', patron: /Cuenta movimiento:\s*(.+)/i }
  ];

  for (const campo of campos) {
    const valor = extraerCampo(texto, campo.patron);
    if (valor !== null) {
      datos[campo.clave] = valor;
    }
  }

  const montoEstructurado = extraerCampo(texto, /Monto:\s*S\/\s*([\d.,]+)/i);

  if (montoEstructurado !== null) {
    datos.monto = parsearMonto(montoEstructurado);
  } else {
    const montoOcr = texto.match(/\bS\/\s*([\d.,]+)\b/i);
    if (montoOcr) {
      datos.monto = parsearMonto(montoOcr[1]);
    }
  }

  const moneda = extraerCampo(texto, /Moneda:\s*(.+)/i);
  if (moneda !== null) {
    const monedaNormalizada = moneda.toUpperCase();
    if (monedaNormalizada.includes('SOL') || monedaNormalizada.includes('PEN')) {
      datos.moneda = 'PEN';
    } else {
      datos.moneda = moneda;
    }
  }

  const numeroInvertido = extraerCampo(texto, /(\d{6,})\s*\n\s*(?:\[\d+\.\d+\]\s*)?N[uúÃ]{1,3}mero de operaci[oó]n/i);
  if (numeroInvertido !== null) {
    datos.referencia_bancaria = numeroInvertido;
    datos.numero_operacion = numeroInvertido;
  }

  const referenciaNormalizada = extraerCampo(texto, /Referencia normalizada:\s*(.+)/i);
  const referenciaBancaria = extraerCampo(texto, /Referencia bancaria:\s*(.+)/i);
  const numeroOperacion = extraerCampo(texto, /N[uúÃ]{1,3}mero de operaci[oó]n:\s*(.+)/i);

  if (referenciaNormalizada !== null) {
    datos.referencia_bancaria = referenciaNormalizada;
  } else if (referenciaBancaria !== null) {
    datos.referencia_bancaria = referenciaBancaria;
  } else if (numeroOperacion !== null) {
    datos.referencia_bancaria = numeroOperacion;
  }

  if (datos.referencia_bancaria === undefined) datos.referencia_bancaria = null;
  if (datos.numero_operacion === undefined) datos.numero_operacion = null;

  return datos;
};

/*
 * ============================================================
 * SERVICIO PRINCIPAL OCR
 * ============================================================
 */

export const extractEvidenceData = async ({
  filePath,
  mimeType,
  tipoEvidencia
}) => {
  console.log('[OCR] Solicitud recibida. tipoEvidencia:', tipoEvidencia);
  console.log('[OCR] filePath:', filePath);
  console.log('[OCR] mimeType:', mimeType);

  if (!filePath || !mimeType || !tipoEvidencia) {
    const error = new Error(
      'filePath, mimeType y tipoEvidencia son obligatorios'
    );
    error.statusCode = 400;
    throw error;
  }

  if (isTransferencia(tipoEvidencia)) {
    const resultado = await runOcrContainer({
      dockerImage: OCR_IMAGE_TRANSFERENCIA,
      filePath,
      script: 'app/main_transferencia.py'
    });

    return {
      motor: 'PaddleOCR',
      build: OCR_IMAGE_TRANSFERENCIA,
      estado: 'PROCESADO',
      confianza: null,
      texto_completo: resultado.stdout,
      datos_extraidos: parsearTransferencia(resultado.stdout),
      salida_ocr: resultado.stdout,
      requiere_revision: true,
      requiere_confirmacion: true
    };
  }

  const resultado = await runOcrContainer({
    dockerImage: OCR_IMAGE_COMPROBANTE,
    filePath,
    script: 'app/main.py'
  });

  const datosExtraidos = parsearComprobante(resultado.stdout);

  return {
    motor: 'PaddleOCR',
    build: OCR_IMAGE_COMPROBANTE,
    estado: 'PROCESADO',
    confianza: null,
    texto_completo: resultado.stdout,
    datos_extraidos: datosExtraidos,
    salida_ocr: resultado.stdout,
    requiere_revision: true,
    requiere_confirmacion: true
  };
};