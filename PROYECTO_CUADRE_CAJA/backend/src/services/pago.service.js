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

  return withTransaction(async (client) => {
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
};

export const modifyPago = async (idPago, data) => {
  const {
    id_medio_pago,
    monto,
    referencia_bancaria,
    observacion,
    estado
  } = data;

  if (monto !== undefined) {
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      const error = new Error('El monto del pago debe ser mayor que cero');
      error.statusCode = 400;
      throw error;
    }
  }

  return withTransaction(async (client) => {
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
    const nuevoEstadoPago = estado !== undefined ? estado : pagoActual.estado;

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
        id_medio_pago,
        monto: monto !== undefined ? nuevoMontoPago : undefined,
        referencia_bancaria,
        observacion,
        estado: nuevoEstadoPago
      },
      client
    );

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
};

export const getPagoById = async (idPago) => {
  return findPagoById(idPago);
};

export const getPagosByOperacion = async (idOperacion) => {
  return findPagosByOperacion(idOperacion);
};