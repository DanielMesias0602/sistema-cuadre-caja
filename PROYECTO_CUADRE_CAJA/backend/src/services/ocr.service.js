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

  return limpio || null;
};

const parsearMonto = (valor) => {
  if (!valor) {
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
  const match = texto.match(patron);

  return match
    ? limpiarValor(match[1])
    : null;
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

  /*
   * Es importante conservar la extensión original.
   *
   * PaddleOCR valida la extensión del archivo recibido.
   *
   * Ejemplo:
   * imagen.jpg -> /input/evidencia.jpg
   * imagen.png -> /input/evidencia.png
   * documento.pdf -> /input/evidencia.pdf
   */
  const extension = path.extname(absoluteFilePath).toLowerCase();

  if (!extension) {
    const error = new Error(
      'La imagen o documento OCR debe tener una extensión válida'
    );

    error.statusCode = 400;
    throw error;
  }

  const dockerInputPath =
    `/input/evidencia${extension}`;

  const args = [
    'run',
    '--rm',

    /*
     * Evidencia que será procesada.
     */
    '-v',
    `${absoluteFilePath}:${dockerInputPath}:ro`,

    /*
     * Volumen persistente de modelos PaddleOCR.
     *
     * Evita descargar nuevamente los modelos
     * cada vez que se ejecuta un OCR.
     */
    '-v',
    'ocr-cuadre-caja-modelos:/root/.paddlex',

    dockerImage,

    'python',
    script,
    dockerInputPath
  ];

  try {
    const { stdout, stderr } = await execFileAsync(
      OCR_DOCKER_PATH,
      args,
      {
        maxBuffer: 10 * 1024 * 1024
      }
    );

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
 * PARSER DE BOLETA / FACTURA
 * ============================================================
 */

const parsearComprobante = (salidaOcr) => {
  const texto = String(salidaOcr || '');

  const tipo_comprobante = extraerCampo(
    texto,
    /Tipo:\s*(.+)/i
  );

  const serie = extraerCampo(
    texto,
    /Serie:\s*(.+)/i
  );

  const numero = extraerCampo(
    texto,
    /Número:\s*(.+)/i
  );

  const fecha = extraerCampo(
    texto,
    /Fecha:\s*(\d{2}\/\d{2}\/\d{4})/i
  );

  const hora = extraerCampo(
    texto,
    /Hora:\s*(\d{2}:\d{2}:\d{2})/i
  );

  const vendedor = extraerCampo(
    texto,
    /Vendedor:\s*(.+)/i
  );

  const igvTexto = extraerCampo(
    texto,
    /IGV:\s*S\/\s*([\d.,]+)/i
  );

  const efectivoTexto = extraerCampo(
    texto,
    /Efectivo:\s*S\/\s*([\d.,]+)/i
  );

  const totalTexto = extraerCampo(
    texto,
    /Total:\s*S\/\s*([\d.,]+)/i
  );

  const moneda = extraerCampo(
    texto,
    /Moneda:\s*([A-Z]+)/i
  );

  return {
    tipo_comprobante,
    serie,
    numero,
    fecha,
    hora,

    /*
     * Para la operación utilizamos el total
     * identificado por el OCR.
     */
    monto: parsearMonto(totalTexto),

    moneda,

    /*
     * No se infiere "CONTADO" como efectivo.
     * Solo se identifica EFECTIVO cuando el OCR
     * encontró el campo correspondiente.
     */
    medio_pago: efectivoTexto
      ? 'EFECTIVO'
      : null,

    referencia_bancaria: null,
    titular: null,
    receptor: null,

    vendedor,

    igv: parsearMonto(igvTexto),

    efectivo: parsearMonto(
      efectivoTexto
    )
  };
};

const parsearTransferencia = (salidaOcr) => {
  const texto = String(salidaOcr || '');

  const datos = {
    tipo_evidencia: 'TRANSFERENCIA'
  };

  const campos = [
    {
      clave: 'aplicacion_banco',
      patron: /Aplicación\s*\/\s*banco:\s*(.+)/i
    },
    {
      clave: 'estado_transferencia',
      patron: /Estado de transferencia:\s*(.+)/i
    },
    {
      clave: 'fecha_operacion',
      patron: /Fecha de operación:\s*(\d{2}\/\d{2}\/\d{4})/i
    },
    {
      clave: 'hora_operacion',
      patron: /Hora de operación:\s*(\d{2}:\d{2})/i
    },
    {
      clave: 'destinatario',
      patron: /Destinatario:\s*(.+)/i
    },
    {
      clave: 'cuenta_destino',
      patron: /Cuenta destino:\s*(.+)/i
    },
    {
  clave: 'tipo_cuenta_origen',
  patron: /^Tipo de cuenta origen:\s*(.+)$/im
},
{
  clave: 'cuenta_origen',
  patron: /^Cuenta origen:\s*(.+)$/im
},
    {
      clave: 'mensaje',
      patron: /Mensaje:\s*(.+)/i
    },
    {
      clave: 'descripcion',
      patron: /Descripción:\s*(.+)/i
    },
    {
      clave: 'sucursal_agencia',
      patron: /Sucursal\/agencia:\s*(.+)/i
    },
    {
      clave: 'cuenta_movimiento',
      patron: /Cuenta movimiento:\s*(.+)/i
    }
  ];

  for (const campo of campos) {
    const valor = extraerCampo(
      texto,
      campo.patron
    );

    if (valor !== null) {
      datos[campo.clave] = valor;
    }
  }

  /*
   * Monto
   *
   * El build 1.11 puede devolver:
   * Monto: S/ 922.00
   *
   * Si no aparece en la sección estructurada,
   * buscamos el monto directamente en el OCR.
   */
  const montoEstructurado = extraerCampo(
    texto,
    /Monto:\s*S\/\s*([\d.,]+)/i
  );

  if (montoEstructurado !== null) {
    datos.monto = parsearMonto(
      montoEstructurado
    );
  } else {
    const montoOcr = texto.match(
      /\bS\/\s*([\d.,]+)\b/i
    );

    if (montoOcr) {
      datos.monto = parsearMonto(
        montoOcr[1]
      );
    }
  }

  /*
   * Moneda
   *
   * No inventamos la moneda.
   * Solo la agregamos cuando el OCR la identifica.
   */
  const moneda = extraerCampo(
    texto,
    /Moneda:\s*(.+)/i
  );

  if (moneda !== null) {
    const monedaNormalizada =
      moneda.toUpperCase();

    if (
      monedaNormalizada.includes('SOL') ||
      monedaNormalizada.includes('PEN')
    ) {
      datos.moneda = 'PEN';
    } else {
      datos.moneda = moneda;
    }
  }

  /*
   * Referencia bancaria
   *
   * El build puede devolver:
   * Referencia normalizada: ...
   * o
   * Referencia bancaria: ...
   */
  const referenciaNormalizada =
    extraerCampo(
      texto,
      /Referencia normalizada:\s*(.+)/i
    );

  const referenciaBancaria =
    extraerCampo(
      texto,
      /Referencia bancaria:\s*(.+)/i
    );

  const numeroOperacion =
    extraerCampo(
      texto,
      /Número de operación:\s*(.+)/i
    );

  if (referenciaNormalizada !== null) {
    datos.referencia_bancaria =
      referenciaNormalizada;
  } else if (referenciaBancaria !== null) {
    datos.referencia_bancaria =
      referenciaBancaria;
  } else if (numeroOperacion !== null) {
    datos.referencia_bancaria =
      numeroOperacion;
  }

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
  /*
   * ----------------------------------------------------------
   * VALIDACIÓN DE ENTRADA
   * ----------------------------------------------------------
   */

  if (!filePath || !mimeType || !tipoEvidencia) {
    const error = new Error(
      'filePath, mimeType y tipoEvidencia son obligatorios'
    );

    error.statusCode = 400;
    throw error;
  }

  /*
   * ----------------------------------------------------------
   * TRANSFERENCIAS
   * ----------------------------------------------------------
   *
   * Build oficial:
   * ocr-cuadre-caja:1.11
   *
   * Script:
   * app/main_transferencia.py
   */

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

      /*
       * La estructura detallada de transferencia
       * se integrará con el parser específico
       * del build 1.11.
       */
      datos_extraidos:
  parsearTransferencia(resultado.stdout),

      salida_ocr: resultado.stdout,

      /*
       * Regla obligatoria del proyecto:
       * el OCR nunca confirma automáticamente
       * información crítica.
       */
      requiere_revision: true,
      requiere_confirmacion: true
    };
  }

  /*
   * ----------------------------------------------------------
   * BOLETA / FACTURA
   * ----------------------------------------------------------
   *
   * Build oficial:
   * ocr-cuadre-caja:1.7
   *
   * Script:
   * app/main.py
   */

  const resultado = await runOcrContainer({
    dockerImage: OCR_IMAGE_COMPROBANTE,
    filePath,
    script: 'app/main.py'
  });

  const datosExtraidos =
    parsearComprobante(resultado.stdout);

  return {
    motor: 'PaddleOCR',
    build: OCR_IMAGE_COMPROBANTE,
    estado: 'PROCESADO',
    confianza: null,

    texto_completo: resultado.stdout,

    datos_extraidos: datosExtraidos,

    salida_ocr: resultado.stdout,

    /*
     * Regla obligatoria del proyecto:
     * revisión humana + confirmación humana.
     */
    requiere_revision: true,
    requiere_confirmacion: true
  };
};