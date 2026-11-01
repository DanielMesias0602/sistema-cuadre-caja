import { withTransaction } from '../repositories/base.repository.js';
import { emitirEvento } from './socket.service.js';
import {
  createOperacion,
  findOperacionById,
  findAllOperaciones
} from '../repositories/operacion.repository.js';
import { createComprobante } from '../repositories/comprobante.repository.js';
import { createPago } from '../repositories/pago.repository.js';
import { createEvidencia } from '../repositories/evidencia.repository.js';
import { createVerificacionPago } from '../repositories/verificacionPago.repository.js';
import { createCierreCaja } from '../repositories/cierreCaja.repository.js';
import { generatePreauthenticatedRequest } from './ociStorage.service.js';
import {
  normalizarHoraCaja,
  obtenerEtiquetaTurno,
  obtenerTurnoPorHora
} from '../utils/turnoCaja.js';

// --- FUNCIONES EXISTENTES ---

const validarHorarioRegistro = async (client, fechaOperacion, horaComprobante, idUsuario) => {
  if (!fechaOperacion) {
    const error = new Error('La fecha de la operación es obligatoria');
    error.statusCode = 400;
    throw error;
  }

  await client.query(
    `SELECT pg_advisory_xact_lock(hashtextextended('caja-turno:' || $1::date::text, 0))`,
    [fechaOperacion]
  );

  const horaCheck = await client.query(
    `SELECT TO_CHAR(
       clock_timestamp() AT TIME ZONE 'America/Lima',
       'YYYY-MM-DD'
     ) AS hoy,
     CURRENT_TIMESTAMP AS fecha_fin`
  );
  const { hoy, fecha_fin: fechaFin } = horaCheck.rows[0];
  if (fechaOperacion > hoy) {
    const error = new Error('No se pueden registrar operaciones con fecha futura.');
    error.statusCode = 400;
    throw error;
  }

  if (fechaOperacion <= hoy) {
    const turnoComprobante = obtenerTurnoPorHora(horaComprobante || '12:00:00');
    if (!turnoComprobante) {
      const error = new Error('La hora del comprobante no es válida o está fuera del horario de caja (8:00 AM a 11:59 PM).');
      error.statusCode = 400;
      throw error;
    }

    const cierreResult = await client.query(
      `SELECT id_cierre, UPPER(estado) AS estado
       FROM cierre_caja
       WHERE fecha = $1
         AND TRANSLATE(UPPER(turno), 'ÑÁÉÍÓÚÜ', 'NAEIOUU') = $2`,
      [fechaOperacion, turnoComprobante]
    );

    let cierre = cierreResult.rows[0];
    if (cierre?.estado === 'CERRADO') {
      const turnoNombre = turnoComprobante === 'MANANA' ? 'Mañana' : 'Tarde';
      const error = new Error(
        `El turno ${turnoNombre} del ${fechaOperacion} ya está cerrado. Reabra el turno para registrar operaciones.`
      );
      error.statusCode = 409;
      throw error;
    }

    if (!cierre) {
      const turnoEtiqueta = obtenerEtiquetaTurno(turnoComprobante);
      cierre = await createCierreCaja({
        id_usuario_responsable: idUsuario,
        fecha: fechaOperacion,
        turno: turnoEtiqueta,
        total_ingresos: 0,
        total_no_efectivo: 0,
        efectivo_esperado: 0,
        total_salidas: 0,
        efectivo_despues_salidas: 0,
        efectivo_fisico: 0,
        diferencia: 0,
        estado: 'ABIERTO',
        fecha_fin: fechaFin
      }, client);
    }

    return cierre.id_cierre;
  }
};

const normalizarFechaComparada = (valor) => {
  const fecha = String(valor || '').trim();
  let iso;

  const fechaISO = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (fechaISO) {
    iso = `${fechaISO[1]}-${fechaISO[2]}-${fechaISO[3]}`;
  } else {
    const fechaNumerica = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (fechaNumerica) {
      iso = `${fechaNumerica[3]}-${fechaNumerica[2]}-${fechaNumerica[1]}`;
    } else {
      const fechaTexto = fecha
        .split(/[|,]/)[0]
        .toLowerCase()
        .replace(/\s+de\s+/g, ' ')
        .replace(/\./g, '')
        .trim();
      const fechaEnTexto = fechaTexto.match(/^(\d{1,2})\s+([a-záéíóúñ]+)\s+(\d{4})$/);
      if (!fechaEnTexto) return null;

      const meses = {
        ene: '01', enero: '01',
        feb: '02', febrero: '02',
        mar: '03', marzo: '03',
        abr: '04', abril: '04',
        may: '05', mayo: '05',
        jun: '06', junio: '06',
        jul: '07', julio: '07',
        ago: '08', agosto: '08',
        sep: '09', set: '09', septiembre: '09', setiembre: '09',
        oct: '10', octubre: '10',
        nov: '11', noviembre: '11',
        dic: '12', diciembre: '12',
      };
      const mes = meses[fechaEnTexto[2]];
      if (!mes) return null;
      iso = `${fechaEnTexto[3]}-${mes}-${fechaEnTexto[1].padStart(2, '0')}`;
    }
  }

  const [anio, mes, dia] = iso.split('-').map(Number);
  const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fechaUTC.getUTCFullYear() !== anio ||
    fechaUTC.getUTCMonth() !== mes - 1 ||
    fechaUTC.getUTCDate() !== dia
  ) {
    return null;
  }

  return iso;
};

export const crearEvidenciasOperacion = async ({
  listaEvidencias,
  id_operacion,
  id_usuario,
  cantidadPagos,
  client
}) => {
  const evidenciasPorPago = new Map();
  const createdEvidencias = [];

  for (const evidencia of listaEvidencias) {
    if (!evidencia || typeof evidencia !== 'object') {
      const error = new Error('La evidencia enviada no es válida');
      error.statusCode = 400;
      throw error;
    }

    const { index_pago: indexPagoPayload, ...datosEvidencia } = evidencia;
    let indexPago = null;
    if (indexPagoPayload !== undefined && indexPagoPayload !== null && indexPagoPayload !== '') {
      indexPago = Number(indexPagoPayload);
      if (!Number.isSafeInteger(indexPago) || indexPago < 0 || indexPago >= cantidadPagos) {
        const error = new Error('Índice de pago asociado a evidencia no válido');
        error.statusCode = 400;
        throw error;
      }
    }

    const evidenciaCreada = await createEvidencia({
      id_operacion,
      id_usuario,
      tipo_evidencia: datosEvidencia.tipo_evidencia,
      storage_key: datosEvidencia.storage_key,
      fecha_evidencia: datosEvidencia.fecha_evidencia,
      observacion: datosEvidencia.observacion,
      texto_ocr: datosEvidencia.texto_ocr,
      datos_ocr: datosEvidencia.datos_ocr
    }, client);
    createdEvidencias.push(evidenciaCreada);

    if (indexPago !== null) {
      const tipo = String(datosEvidencia.tipo_evidencia || '').toUpperCase();
      const evidenciasDelPago = evidenciasPorPago.get(indexPago) || {};
      if ((tipo === 'CLIENTE' || tipo === 'EMPRESA') && evidenciasDelPago[tipo]) {
        const error = new Error(`Solo se permite una evidencia ${tipo.toLowerCase()} por pago`);
        error.statusCode = 400;
        throw error;
      }
      if (tipo === 'CLIENTE' || tipo === 'EMPRESA') {
        evidenciasDelPago[tipo] = evidenciaCreada.id_evidencia;
        evidenciasPorPago.set(indexPago, evidenciasDelPago);
      }
    }
  }

  return { createdEvidencias, evidenciasPorPago };
};

export const crearVerificacionesPendientesPorPago = async ({
  pagosPorIndice,
  evidenciasPorPago,
  id_usuario,
  fechaOperacion,
  client
}) => {
  for (const { index, pago, pagoCreado, esEfectivo } of pagosPorIndice) {
    if (esEfectivo) continue;

    const fechaComparada = normalizarFechaComparada(pago.fecha_operacion || fechaOperacion);
    if (!fechaComparada) {
      const error = new Error('La fecha de operación del pago no es válida');
      error.statusCode = 400;
      throw error;
    }

    await createVerificacionPago({
      id_pago: pagoCreado.id_pago,
      id_evidencia_cliente: evidenciasPorPago.get(index)?.CLIENTE ?? null,
      id_evidencia_empresa: evidenciasPorPago.get(index)?.EMPRESA ?? null,
      id_usuario,
      monto_comparado: Number(pagoCreado.monto),
      fecha_comparada: fechaComparada,
      referencia_bancaria_comparada: pagoCreado.referencia_bancaria ?? null,
      estado_verificacion: 'PENDIENTE',
      observacion: 'Verificación pendiente al registrar la operación'
    }, client);
  }
};

export const registerOperacion = async (data) => {
  const operacion = await withTransaction(async (client) => {
    const comprobanteResult = await client.query(
      'SELECT hora FROM comprobante WHERE id_comprobante = $1',
      [data.id_comprobante]
    );
    const idCierre = await validarHorarioRegistro(
      client,
      data.fecha,
      comprobanteResult.rows[0]?.hora,
      data.id_usuario
    );
    return createOperacion({ ...data, id_cierre: idCierre }, client);
  });

  emitirEvento('operacion_creada', { id: operacion.id_operacion });
  return operacion;
};

export const getOperacionById = async (idOperacion) => {
  return findOperacionById(idOperacion);
};

// --- FUNCIÓN DE LISTADO CON ENLACES SEGUROS A OCI ---

export const getOperaciones = async () => {
  const operaciones = await findAllOperaciones();

  const operacionesConLinks = await Promise.all(operaciones.map(async (op) => {
    const pagosConLinks = await Promise.all((op.pagos || []).map(async (pago) => {
      if (pago.evidencia_url && pago.evidencia_url !== 'None') {
        try {
          const signedUrl = await generatePreauthenticatedRequest(pago.evidencia_url, 24);
          if (signedUrl) {
            return { ...pago, evidencia_url: signedUrl };
          }
          return pago;
        } catch (err) {
          console.error("Error generando enlace para evidencia de pago:", err);
          return pago;
        }
      }
      return pago;
    }));

    const evidenciasConLinks = await Promise.all((op.evidencias || []).map(async (evidencia) => {
      if (evidencia.storage_key && evidencia.storage_key !== 'None') {
        try {
          const signedUrl = await generatePreauthenticatedRequest(evidencia.storage_key, 24);
          if (signedUrl) {
            return { ...evidencia, url_firmada: signedUrl };
          }
          return evidencia;
        } catch (err) {
          console.error("Error generando enlace para evidencia:", err);
          return evidencia;
        }
      }
      return evidencia;
    }));

    return {
      ...op,
      pagos: pagosConLinks,
      evidencias: evidenciasConLinks
    };
  }));

  return operacionesConLinks;
};

// --- FUNCIÓN TRANSACCIONAL (Para guardar todo de golpe) ---

export const registerOperacionUnificada = async (data) => {
  const {
    comprobante,
    operacion,
    pagos,
    id_usuario
  } = data;

  const listaEvidencias = Array.isArray(data.evidencias)
    ? data.evidencias
    : [];

  if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
    const error = new Error('La operación debe tener al menos un pago asociado');
    error.statusCode = 400;
    throw error;
  }

  const horaNormalizada = comprobante?.hora
    ? normalizarHoraCaja(comprobante.hora)
    : comprobante?.hora;
  const comprobanteNormalizado = horaNormalizada
    ? { ...comprobante, hora: horaNormalizada }
    : comprobante;

  const resultado = await withTransaction(async (client) => {
    const idCierre = await validarHorarioRegistro(
      client,
      operacion?.fecha,
      comprobanteNormalizado?.hora,
      id_usuario
    );
    
    // 1. Crear Comprobante con datos de OCR
    const newComprobante = await createComprobante(comprobanteNormalizado, client);

    // 2. Crear Operación
    const newOperacion = await createOperacion({
      ...operacion,
      id_cierre: idCierre,
      id_comprobante: newComprobante.id_comprobante,
      id_usuario: id_usuario
    }, client);

    // 3. Crear pagos secuencialmente y conservar su índice de entrada.
    const createdPagos = [];
    const pagosPorIndice = [];
    for (let index = 0; index < pagos.length; index += 1) {
      const pago = pagos[index];
      const medioPagoResult = await client.query(
        `SELECT es_efectivo
         FROM medio_pago
         WHERE id_medio_pago = $1`,
        [pago.id_medio_pago]
      );

      const esEfectivo = medioPagoResult.rows.length > 0 && medioPagoResult.rows[0].es_efectivo;
      const estadoInicial = esEfectivo ? 'VERIFICADO' : (pago.estado || 'REGISTRADO');
      const pagoCreado = await createPago({
        ...pago,
        id_operacion: newOperacion.id_operacion,
        estado: estadoInicial
      }, client);

      createdPagos.push(pagoCreado);
      pagosPorIndice.push({ index, pago, pagoCreado, esEfectivo });
    }

    // index_pago solo se usa para vincular en memoria; no existe en evidencia.
    const { createdEvidencias, evidenciasPorPago } = await crearEvidenciasOperacion({
      listaEvidencias,
      id_operacion: newOperacion.id_operacion,
      id_usuario,
      cantidadPagos: pagos.length,
      client
    });

    // 4. Crear una verificación pendiente por pago no efectivo.
    await crearVerificacionesPendientesPorPago({
      pagosPorIndice,
      evidenciasPorPago,
      id_usuario,
      fechaOperacion: operacion?.fecha,
      client
    });

    return {
      id_operacion: newOperacion.id_operacion,
      comprobante: newComprobante,
      pagos: createdPagos,
      evidencias: createdEvidencias
    };
  });

  emitirEvento('operacion_creada', { id: resultado.id_operacion });
  return resultado;
};