import {
  createPago,
  findPagoById,
  findPagosByOperacion,
  updatePago
} from '../repositories/pago.repository.js';

import {
  findOperacionById
} from '../repositories/operacion.repository.js';

import {
  findMedioPagoById
} from '../repositories/medioPago.repository.js';

import {
  withTransaction
} from '../repositories/base.repository.js';
import { emitirEvento } from './socket.service.js';

export const registerPago = async (data) => {
  const {
    id_operacion,
    id_medio_pago,
    monto,
    referencia_bancaria = null,
    observacion = null
  } = data;

  if (!id_operacion || !id_medio_pago || monto === undefined) {
    const error = new Error(
      'id_operacion, id_medio_pago y monto son obligatorios'
    );
    error.statusCode = 400;
    throw error;
  }

  if (Number(monto) <= 0) {
    const error = new Error(
      'El monto del pago debe ser mayor que cero'
    );
    error.statusCode = 400;
    throw error;
  }

  const pago = await withTransaction(async (client) => {
    const fechaOperacionResult = await client.query(
      `SELECT fecha
       FROM operacion
       WHERE id_operacion = $1`,
      [id_operacion]
    );

    if (fechaOperacionResult.rows.length === 0) {
      const error = new Error('La operación no existe');
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('caja-turno:' || $1::date::text, 0))`,
      [fechaOperacionResult.rows[0].fecha]
    );

    /*
     * Consultamos el medio de pago para determinar el estado inicial.
     * Lógica de Caja Real: El efectivo se auto-verifica (validación física en Cierre de Caja).
     * Los pagos virtuales quedan pendientes para verificar en Evidencias.
     */
    const medioPagoResult = await client.query(
      `SELECT es_efectivo
       FROM medio_pago
       WHERE id_medio_pago = $1`,
      [id_medio_pago]
    );

    if (medioPagoResult.rows.length === 0) {
      const error = new Error(
        'El medio de pago no existe'
      );
      error.statusCode = 404;
      throw error;
    }

    const esEfectivo = medioPagoResult.rows[0].es_efectivo;
    const estadoInicial = esEfectivo ? 'VERIFICADO' : 'REGISTRADO';

    console.log(`[registerPago] id_medio_pago: ${id_medio_pago}, esEfectivo: ${esEfectivo}, estadoInicial: ${estadoInicial}`);

    /*
     * Bloqueamos la operación durante toda la transacción.
     * Esto evita que dos pagos concurrentes puedan superar
     * el monto de la operación.
     */
    const operacionResult = await client.query(
      `SELECT
         id_operacion,
         monto,
         estado
       FROM operacion
       WHERE id_operacion = $1
       FOR UPDATE`,
      [id_operacion]
    );

    if (operacionResult.rows.length === 0) {
      const error = new Error(
        'La operación no existe'
      );
      error.statusCode = 404;
      throw error;
    }

    const operacion = operacionResult.rows[0];

    const cierreResult = await client.query(
      `SELECT cc.estado AS estado_cierre
       FROM operacion o
       LEFT JOIN cierre_caja cc ON cc.id_cierre = o.id_cierre
       WHERE o.id_operacion = $1`,
      [id_operacion]
    );
    const cierre = cierreResult.rows[0];

    if (String(cierre?.estado_cierre || '').toUpperCase() === 'CERRADO') {
      const error = new Error(
        'No se pueden agregar pagos a una operación que pertenece a un cierre ya cerrado. Reabra el turno primero.'
      );
      error.statusCode = 409;
      throw error;
    }

    /*
     * Recuperamos los pagos registrados dentro
     * de la misma transacción.
     */
    const pagosResult = await client.query(
      `SELECT
         monto,
         estado
       FROM pago
       WHERE id_operacion = $1`,
      [id_operacion]
    );

    const totalPagado = pagosResult.rows
      .filter((pago) => pago.estado !== 'ANULADO')
      .reduce(
        (total, pago) => total + Number(pago.monto),
        0
      );

    const nuevoTotal = totalPagado + Number(monto);
    const montoOperacion = Number(operacion.monto);

    /*
     * Regla oficial:
     *
     * SUM(PAGO.monto) <= OPERACION.monto
     */
    if (nuevoTotal > montoOperacion) {
      const error = new Error(
        'El total de pagos no puede superar el monto total de la operación'
      );
      error.statusCode = 400;
      throw error;
    }

    /*
     * Primero registramos el pago con el estado determinado.
     */
    const pago = await createPago(
      {
        id_operacion,
        id_medio_pago,
        monto,
        referencia_bancaria,
        observacion,
        estado: estadoInicial
      },
      client
    );

    /*
     * Cuando el total pagado alcanza exactamente
     * el monto de la operación, la operación pasa
     * a PAGADA.
     *
     * No cambiamos el estado durante un pago parcial.
     */
    if (nuevoTotal === montoOperacion) {
      await client.query(
        `UPDATE operacion
         SET estado = 'PAGADA', fecha_modificacion = CURRENT_TIMESTAMP
         WHERE id_operacion = $1`,
        [id_operacion]
      );
    }

    return pago;
  });

  emitirEvento('pago_actualizado', { id: pago.id_pago });
  return pago;
};

export const modifyPago = async (idPago, data) => {
  const {
    id_medio_pago,
    monto,
    referencia_bancaria,
    observacion,
    estado
  } = data;

  if (referencia_bancaria !== undefined &&
      referencia_bancaria != null &&
      String(referencia_bancaria).trim().length > 100) {
    const error = new Error('La referencia bancaria no puede superar los 100 caracteres');
    error.statusCode = 400;
    throw error;
  }
  if (observacion !== undefined &&
      observacion != null &&
      String(observacion).trim().length > 500) {
    const error = new Error('La observación no puede superar los 500 caracteres');
    error.statusCode = 400;
    throw error;
  }

  const estadosPermitidos = ['REGISTRADO', 'VERIFICADO', 'ANULADO'];
  if (estado !== undefined && !estadosPermitidos.includes(estado)) {
    const error = new Error('Estado de pago no válido');
    error.statusCode = 400;
    throw error;
  }

  if (monto !== undefined) {
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      const error = new Error('El monto del pago debe ser mayor que cero');
      error.statusCode = 400;
      throw error;
    }
  }

  const resultado = await withTransaction(async (client) => {
    const fechaOperacionResult = await client.query(
      `SELECT o.fecha
       FROM pago p
       INNER JOIN operacion o ON o.id_operacion = p.id_operacion
       WHERE p.id_pago = $1`,
      [idPago]
    );

    if (fechaOperacionResult.rows.length === 0) {
      const error = new Error('El pago no existe');
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('caja-turno:' || $1::date::text, 0))`,
      [fechaOperacionResult.rows[0].fecha]
    );

    // 1. Lock and find the payment
    const pagoResult = await client.query(
      `SELECT id_pago, id_operacion, id_medio_pago, monto, referencia_bancaria, observacion, estado
       FROM pago
       WHERE id_pago = $1
       FOR UPDATE`,
      [idPago]
    );

    if (pagoResult.rows.length === 0) {
      const error = new Error('El pago no existe');
      error.statusCode = 404;
      throw error;
    }

    const pagoActual = pagoResult.rows[0];

    const nuevoIdMedioPago = id_medio_pago !== undefined
      ? Number(id_medio_pago)
      : Number(pagoActual.id_medio_pago);
    const medioPagoResult = await client.query(
      `SELECT es_efectivo
       FROM medio_pago
       WHERE id_medio_pago = $1 AND estado = TRUE`,
      [nuevoIdMedioPago]
    );
    if (medioPagoResult.rows.length === 0) {
      const error = new Error('El medio de pago no existe o está inactivo');
      error.statusCode = 400;
      throw error;
    }

    const referenciaSolicitada = referencia_bancaria !== undefined
      ? (referencia_bancaria == null ? null : String(referencia_bancaria).trim() || null)
      : pagoActual.referencia_bancaria;
    const nuevaReferencia = medioPagoResult.rows[0].es_efectivo
      ? null
      : referenciaSolicitada;
    const referenciaCambio = (pagoActual.referencia_bancaria || null) !== nuevaReferencia;

    // 2. Lock the associated operation
    const operacionResult = await client.query(
      `SELECT id_operacion, monto, estado
       FROM operacion
       WHERE id_operacion = $1
       FOR UPDATE`,
      [pagoActual.id_operacion]
    );

    if (operacionResult.rows.length === 0) {
      const error = new Error('La operación asociada no existe');
      error.statusCode = 404;
      throw error;
    }

    const operacion = operacionResult.rows[0];

    if (operacion.estado === 'ANULADA') {
      const error = new Error('No se pueden modificar pagos de una operación anulada');
      error.statusCode = 409;
      throw error;
    }

    const cierreResult = await client.query(
      `SELECT cc.estado AS estado_cierre
       FROM operacion o
       LEFT JOIN cierre_caja cc ON cc.id_cierre = o.id_cierre
       WHERE o.id_operacion = $1`,
      [operacion.id_operacion]
    );
    const cierre = cierreResult.rows[0];

    if (String(cierre?.estado_cierre || '').toUpperCase() === 'CERRADO') {
      const error = new Error('No se puede editar una operación de un turno ya cerrado');
      error.statusCode = 400;
      throw error;
    }

    // 3. Get all other active payments for this operation
    const otrosPagosResult = await client.query(
      `SELECT id_pago, monto, estado
       FROM pago
       WHERE id_operacion = $1 AND id_pago != $2`,
      [operacion.id_operacion, idPago]
    );

    const totalOtrosPagos = otrosPagosResult.rows
      .filter((p) => p.estado !== 'ANULADO')
      .reduce((acc, p) => acc + Number(p.monto), 0);

    const nuevoMontoPago = monto !== undefined ? Number(monto) : Number(pagoActual.monto);
    const nuevoEstadoPago = estado !== undefined
      ? estado
      : referenciaCambio && !medioPagoResult.rows[0].es_efectivo
        ? 'REGISTRADO'
        : pagoActual.estado;

    const montoEfectivoPago = (nuevoEstadoPago !== 'ANULADO') ? nuevoMontoPago : 0;
    const nuevoTotalPagado = totalOtrosPagos + montoEfectivoPago;
    const montoOperacion = Number(operacion.monto);

    if (nuevoTotalPagado > montoOperacion) {
      const error = new Error('El total de pagos recalculado no puede superar el monto de la operación');
      error.statusCode = 400;
      throw error;
    }

    // 4. Update the payment
    const pagoActualizado = await updatePago(
      idPago,
      {
        id_medio_pago: nuevoIdMedioPago,
        monto: monto !== undefined ? nuevoMontoPago : undefined,
        referencia_bancaria: nuevaReferencia,
        observacion,
        estado: nuevoEstadoPago
      },
      client
    );

    if (referenciaCambio && !medioPagoResult.rows[0].es_efectivo) {
      await client.query(
        `UPDATE verificacion_pago
         SET estado_verificacion = 'PENDIENTE',
             observacion = 'Referencia bancaria actualizada; requiere nueva conciliación'
         WHERE id_pago = $1`,
        [idPago]
      );
    }

    // 5. Update operation status if needed
    let nuevoEstadoOperacion = operacion.estado;
    if (nuevoTotalPagado >= montoOperacion) {
      nuevoEstadoOperacion = 'PAGADA';
    } else {
      nuevoEstadoOperacion = 'PENDIENTE';
    }

    if (nuevoEstadoOperacion !== operacion.estado) {
      await client.query(
        `UPDATE operacion
         SET estado = $1,
             fecha_modificacion = CURRENT_TIMESTAMP
         WHERE id_operacion = $2`,
        [nuevoEstadoOperacion, operacion.id_operacion]
      );
    }

    return pagoActualizado;
  });

  emitirEvento('pago_actualizado', { id: resultado.id_pago });
  return resultado;
};

export const getPagoById = async (idPago) => {
  return findPagoById(idPago);
};

export const getPagosByOperacion = async (idOperacion) => {
  return findPagosByOperacion(idOperacion);
};