import {
  createPago,
  findPagoById,
  findPagosByOperacion
} from '../repositories/pago.repository.js';

import {
  findOperacionById
} from '../repositories/operacion.repository.js';

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
      .filter((pago) => pago.estado)
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
     * Primero registramos el pago.
     */
    const pago = await createPago(
      {
        id_operacion,
        id_medio_pago,
        monto,
        referencia_bancaria,
        observacion
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
         SET estado = 'PAGADA'
         WHERE id_operacion = $1`,
        [id_operacion]
      );
    }

    return pago;
  });
};

export const getPagoById = async (idPago) => {
  return findPagoById(idPago);
};

export const getPagosByOperacion = async (idOperacion) => {
  return findPagosByOperacion(idOperacion);
};