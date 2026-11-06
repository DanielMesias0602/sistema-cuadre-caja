import { withTransaction } from '../repositories/base.repository.js';
import { emitirEvento } from './socket.service.js';
import {
  createOperacion,
  updateOperacionMonto,
  findOperacionById,
  findAllOperaciones
} from '../repositories/operacion.repository.js';
import {
  createComprobante,
  updateComprobanteMonto
} from '../repositories/comprobante.repository.js';
import { createPago, updatePago } from '../repositories/pago.repository.js';
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

    const {
      index_pago: indexPagoPayload,
      index_pagos: indicesPagoPayload,
      ...datosEvidencia
    } = evidencia;
    const indicesPago = indicesPagoPayload !== undefined
      ? indicesPagoPayload
      : indexPagoPayload !== undefined && indexPagoPayload !== null && indexPagoPayload !== ''
        ? [indexPagoPayload]
        : [];
    if (!Array.isArray(indicesPago)) {
      const error = new Error('Los índices de pago asociados a evidencia no son válidos');
      error.statusCode = 400;
      throw error;
    }

    if (indicesPago.some(
      (indexPago) => indexPago === null || indexPago === undefined || indexPago === ''
    )) {
      const error = new Error('Índice de pago asociado a evidencia no válido');
      error.statusCode = 400;
      throw error;
    }

    const indicesPagoNormalizados = [...new Set(indicesPago.map(Number))];
    if (indicesPagoNormalizados.some(
      (indexPago) => !Number.isSafeInteger(indexPago) || indexPago < 0 || indexPago >= cantidadPagos
    )) {
      const error = new Error('Índice de pago asociado a evidencia no válido');
      error.statusCode = 400;
      throw error;
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

    if (indicesPagoNormalizados.length > 0) {
      const tipo = String(datosEvidencia.tipo_evidencia || '').toUpperCase();
      if (tipo === 'CLIENTE' || tipo === 'EMPRESA') {
        for (const indexPago of indicesPagoNormalizados) {
          const evidenciasDelPago = evidenciasPorPago.get(indexPago) || {};
          if (evidenciasDelPago[tipo]) {
            const error = new Error(`Solo se permite una evidencia ${tipo.toLowerCase()} por pago`);
            error.statusCode = 400;
            throw error;
          }
          evidenciasDelPago[tipo] = evidenciaCreada.id_evidencia;
          evidenciasPorPago.set(indexPago, evidenciasDelPago);
        }
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

export const actualizarRegistroOperacion = async (idOperacion, data, idUsuario) => {
  const id = Number(idOperacion);
  const idPago = Number(data?.id_pago);
  const idMedioPago = Number(data?.id_medio_pago);
  const montoComprobante = Number(data?.monto_comprobante);
  const montoPago = Number(data?.monto_pago);
  const referenciaEnviada = Object.prototype.hasOwnProperty.call(data || {}, 'referencia_bancaria');
  const observacionEnviada = Object.prototype.hasOwnProperty.call(data || {}, 'observacion');

  if (!Number.isSafeInteger(id) || id <= 0 ||
      !Number.isSafeInteger(idPago) || idPago <= 0 ||
      !Number.isSafeInteger(idMedioPago) || idMedioPago <= 0 ||
      !Number.isFinite(montoComprobante) || montoComprobante <= 0 ||
      !Number.isFinite(montoPago) || montoPago <= 0) {
    const error = new Error('Los datos del registro y del pago deben ser válidos');
    error.statusCode = 400;
    throw error;
  }

  const resultado = await withTransaction(async (client) => {
    const fechaResult = await client.query(
      'SELECT fecha FROM operacion WHERE id_operacion = $1',
      [id]
    );
    if (fechaResult.rows.length === 0) {
      const error = new Error('La operación no existe');
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('caja-turno:' || $1::date::text, 0))`,
      [fechaResult.rows[0].fecha]
    );

    const operacionResult = await client.query(
      `SELECT id_operacion, id_cierre, id_comprobante, fecha, estado
       FROM operacion
       WHERE id_operacion = $1
       FOR UPDATE`,
      [id]
    );
    const operacion = operacionResult.rows[0];

    if (!operacion) {
      const error = new Error('La operación no existe');
      error.statusCode = 404;
      throw error;
    }
    if (String(operacion.estado).toUpperCase() === 'ANULADA') {
      const error = new Error('No se puede editar una operación anulada');
      error.statusCode = 409;
      throw error;
    }

    if (operacion.id_cierre != null) {
      const cierreResult = await client.query(
        `SELECT estado
         FROM cierre_caja
         WHERE id_cierre = $1`,
        [operacion.id_cierre]
      );
      if (String(cierreResult.rows[0]?.estado || '').toUpperCase() === 'CERRADO') {
        const error = new Error('No se puede editar una operación de un turno ya cerrado');
        error.statusCode = 400;
        throw error;
      }
    }

    const pagosResult = await client.query(
      `SELECT id_pago, id_medio_pago, monto, referencia_bancaria, observacion, estado
       FROM pago
       WHERE id_operacion = $1
       ORDER BY id_pago
       FOR UPDATE`,
      [id]
    );
    const pagoActual = pagosResult.rows.find((pago) => Number(pago.id_pago) === idPago);
    if (!pagoActual) {
      const error = new Error('El pago no pertenece a la operación indicada');
      error.statusCode = 400;
      throw error;
    }

    const medioPagoResult = await client.query(
      `SELECT id_medio_pago,
              CASE
                WHEN LOWER(TRIM(nombre)) IN ('vale', 'deposito', 'depósito') THEN FALSE
                ELSE es_efectivo
              END AS es_efectivo
       FROM medio_pago
       WHERE id_medio_pago = $1 AND estado = TRUE`,
      [idMedioPago]
    );
    const medioPago = medioPagoResult.rows[0];
    if (!medioPago) {
      const error = new Error('El medio de pago no existe o está inactivo');
      error.statusCode = 400;
      throw error;
    }

    const montoComprobanteRedondeado = Math.round((montoComprobante + Number.EPSILON) * 100) / 100;
    const montoPagoRedondeado = Math.round((montoPago + Number.EPSILON) * 100) / 100;
    const totalOtrosPagosCentimos = pagosResult.rows
      .filter((pago) => Number(pago.id_pago) !== idPago && pago.estado !== 'ANULADO')
      .reduce((total, pago) => total + Math.round(Number(pago.monto) * 100), 0);
    const totalPagadoCentimos = totalOtrosPagosCentimos + Math.round(montoPagoRedondeado * 100);
    const montoComprobanteCentimos = Math.round(montoComprobanteRedondeado * 100);

    if (totalPagadoCentimos > montoComprobanteCentimos) {
      const error = new Error('El total de pagos no puede superar el monto del comprobante');
      error.statusCode = 400;
      throw error;
    }

    const estadoPago = medioPago.es_efectivo ? 'VERIFICADO' : 'REGISTRADO';
    const referenciaSolicitada = referenciaEnviada
      ? (data.referencia_bancaria == null ? null : String(data.referencia_bancaria).trim() || null)
      : pagoActual.referencia_bancaria;
    const referenciaBancaria = medioPago.es_efectivo
      ? null
      : referenciaSolicitada;
    const referenciaCambio = (pagoActual.referencia_bancaria || null) !== referenciaBancaria;
    const observacionSolicitada = observacionEnviada
      ? (data.observacion == null ? null : String(data.observacion).trim() || null)
      : pagoActual.observacion;
    const observacionPago = !medioPago.es_efectivo && referenciaCambio && !observacionEnviada
      ? 'Referencia actualizada; requiere nueva conciliación'
      : observacionSolicitada;
    if (referenciaBancaria != null && referenciaBancaria.length > 100) {
      const error = new Error('La referencia bancaria no puede superar los 100 caracteres');
      error.statusCode = 400;
      throw error;
    }
    if (observacionPago != null && observacionPago.length > 500) {
      const error = new Error('La observación no puede superar los 500 caracteres');
      error.statusCode = 400;
      throw error;
    }

    const comprobanteActualizado = await updateComprobanteMonto(
      operacion.id_comprobante,
      montoComprobanteRedondeado,
      client
    );
    const pagoActualizado = await updatePago(
      idPago,
      {
        id_medio_pago: idMedioPago,
        monto: montoPagoRedondeado,
        referencia_bancaria: referenciaBancaria,
        observacion: observacionPago,
        estado: estadoPago
      },
      client
    );

    const estadoOperacion = totalPagadoCentimos === montoComprobanteCentimos
      ? 'PAGADA'
      : 'PENDIENTE';
    const operacionActualizada = await updateOperacionMonto(
      id,
      montoComprobanteRedondeado,
      idUsuario,
      client
    );
    await client.query(
      `UPDATE operacion
       SET estado = $1
       WHERE id_operacion = $2`,
      [estadoOperacion, id]
    );
    operacionActualizada.estado = estadoOperacion;

    if (!medioPago.es_efectivo) {
      const observacionVerificacion = referenciaCambio
        ? 'Referencia bancaria actualizada; requiere nueva conciliación'
        : 'Pago actualizado; requiere nueva conciliación';
      const verificacionResult = await client.query(
        `SELECT id_verificacion
         FROM verificacion_pago
         WHERE id_pago = $1
         FOR UPDATE`,
        [idPago]
      );
      if (verificacionResult.rows.length > 0) {
        await client.query(
          `UPDATE verificacion_pago
           SET estado_verificacion = 'PENDIENTE',
               observacion = $1
           WHERE id_pago = $2`,
          [observacionVerificacion, idPago]
        );
      } else {
        await client.query(
          `INSERT INTO verificacion_pago
            (id_pago, id_usuario, monto_comparado, fecha_comparada,
             referencia_bancaria_comparada, estado_verificacion, observacion)
           VALUES ($1, $2, $3, $4, $5, 'PENDIENTE',
             $6)`,
          [
            idPago,
            idUsuario,
            montoPagoRedondeado,
            operacion.fecha,
            null,
            observacionVerificacion
          ]
        );
      }
    }

    return {
      operacion: operacionActualizada,
      comprobante: comprobanteActualizado,
      pago: pagoActualizado,
      total_pagado: totalPagadoCentimos / 100
    };
  });

  emitirEvento('operacion_actualizada', { id: Number(idOperacion) });
  emitirEvento('pago_actualizado', { id: resultado.pago.id_pago });
  return resultado;
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
    let totalPagosCentimos = 0;
    for (let index = 0; index < pagos.length; index += 1) {
      const pago = pagos[index];
      const medioPagoResult = await client.query(
        `SELECT
           id_medio_pago,
           nombre,
           CASE
             WHEN LOWER(TRIM(nombre)) IN ('vale', 'deposito', 'depósito') THEN FALSE
             ELSE es_efectivo
           END AS es_efectivo
         FROM medio_pago
         WHERE id_medio_pago = $1 AND estado = TRUE`,
        [pago.id_medio_pago]
      );

      const medioPago = medioPagoResult.rows[0];
      if (!medioPago) {
        const error = new Error('El medio de pago no existe o está inactivo');
        error.statusCode = 400;
        throw error;
      }

      const esVale = String(medioPago.nombre || '').trim().toLowerCase() === 'vale';
      const mediosParaRegistrar = [];
      if (esVale) {
        const montoEfectivo = Number(pago.monto_efectivo);
        const montoVirtual = Number(pago.monto_virtual);
        if (
          !Number.isFinite(montoEfectivo) ||
          !Number.isFinite(montoVirtual) ||
          montoEfectivo <= 0 ||
          montoVirtual <= 0
        ) {
          const error = new Error('El Vale requiere montos efectivo y virtual mayores que cero');
          error.statusCode = 400;
          throw error;
        }

        const mediosValeResult = await client.query(
          `SELECT id_medio_pago, LOWER(TRIM(nombre)) AS nombre_normalizado
           FROM medio_pago
           WHERE estado = TRUE
             AND LOWER(TRIM(nombre)) IN ('efectivo', 'vale')`
        );
        const idMedioEfectivo = mediosValeResult.rows.find(
          (medio) => medio.nombre_normalizado === 'efectivo'
        )?.id_medio_pago;
        const idMedioVale = mediosValeResult.rows.find(
          (medio) => medio.nombre_normalizado === 'vale'
        )?.id_medio_pago;
        if (!idMedioEfectivo || !idMedioVale) {
          const error = new Error('Se requieren medios de pago activos "Efectivo" y "Vale"');
          error.statusCode = 409;
          throw error;
        }

        let idMedioVirtual = idMedioVale;
        if (pago.id_medio_virtual !== undefined && pago.id_medio_virtual !== null) {
          const medioVirtualResult = await client.query(
            `SELECT id_medio_pago, nombre, es_efectivo
             FROM medio_pago
             WHERE id_medio_pago = $1 AND estado = TRUE`,
            [pago.id_medio_virtual]
          );
          const medioVirtual = medioVirtualResult.rows[0];
          if (
            !medioVirtual ||
            medioVirtual.es_efectivo ||
            String(medioVirtual.nombre || '').trim().toLowerCase() === 'vale'
          ) {
            const error = new Error('El medio virtual seleccionado no es válido');
            error.statusCode = 400;
            throw error;
          }
          idMedioVirtual = medioVirtual.id_medio_pago;
        }

        const totalValeCentimos = Math.round(montoEfectivo * 100) + Math.round(montoVirtual * 100);
        const montoEnviadoCentimos = Math.round(Number(pago.monto) * 100);
        if (!Number.isFinite(montoEnviadoCentimos) || montoEnviadoCentimos !== totalValeCentimos) {
          const error = new Error('El monto total del Vale no coincide con sus componentes');
          error.statusCode = 400;
          throw error;
        }

        totalPagosCentimos += totalValeCentimos;
        mediosParaRegistrar.push(
          {
            id_medio_pago: idMedioEfectivo,
            monto: montoEfectivo,
            referencia_bancaria: null,
            es_efectivo: true
          },
          {
            id_medio_pago: idMedioVirtual,
            monto: montoVirtual,
            referencia_bancaria: pago.referencia_bancaria ?? null,
            es_efectivo: false
          }
        );
      } else {
        const montoPago = Number(pago.monto);
        if (!Number.isFinite(montoPago) || montoPago <= 0) {
          const error = new Error('El monto del pago debe ser mayor que cero');
          error.statusCode = 400;
          throw error;
        }
        totalPagosCentimos += Math.round(montoPago * 100);
        mediosParaRegistrar.push({
          id_medio_pago: medioPago.id_medio_pago,
          monto: montoPago,
          referencia_bancaria: medioPago.es_efectivo ? null : pago.referencia_bancaria ?? null,
          es_efectivo: medioPago.es_efectivo
        });
      }

      for (const medio of mediosParaRegistrar) {
        const estadoInicial = medio.es_efectivo
          ? 'VERIFICADO'
          : (pago.estado || 'REGISTRADO');
        const pagoCreado = await createPago({
          ...pago,
          id_operacion: newOperacion.id_operacion,
          id_medio_pago: medio.id_medio_pago,
          monto: medio.monto,
          referencia_bancaria: medio.referencia_bancaria,
          estado: estadoInicial
        }, client);

        createdPagos.push(pagoCreado);
        pagosPorIndice.push({ index, pago, pagoCreado, esEfectivo: medio.es_efectivo });
      }
    }

    const montoOperacionCentimos = Math.round(Number(operacion?.monto || comprobante?.monto || 0) * 100);
    if (!Number.isFinite(montoOperacionCentimos) || totalPagosCentimos > montoOperacionCentimos) {
      const error = new Error('El total de pagos no puede superar el monto de la operación');
      error.statusCode = 400;
      throw error;
    }

    // Los índices de asociación solo se usan en memoria; no existen en evidencia.
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