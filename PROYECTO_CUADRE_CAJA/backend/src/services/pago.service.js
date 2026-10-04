import {
  createPago,
  findPagoById,
  findPagosByOperacion
} from '../repositories/pago.repository.js';

import {
  findOperacionById
} from '../repositories/operacion.repository.js';

export const registerPago = async (data) => {
  const {
    id_operacion,
    id_medio_pago,
    monto,
    referencia_bancaria = null
  } = data;

  if (!id_operacion || !id_medio_pago || monto === undefined) {
    const error = new Error(
      'id_operacion, id_medio_pago y monto son obligatorios'
    );
    error.statusCode = 400;
    throw error;
  }

  if (Number(monto) <= 0) {
    const error = new Error('El monto del pago debe ser mayor que cero');
    error.statusCode = 400;
    throw error;
  }

  const operacion = await findOperacionById(id_operacion);

  if (!operacion) {
    const error = new Error('La operación no existe');
    error.statusCode = 404;
    throw error;
  }

  const pagosActuales = await findPagosByOperacion(id_operacion);

  const totalPagado = pagosActuales
    .filter((pago) => pago.estado)
    .reduce((total, pago) => total + Number(pago.monto), 0);

  const nuevoTotal = totalPagado + Number(monto);

  if (nuevoTotal > Number(operacion.monto)) {
    const error = new Error(
      'El total de pagos no puede superar el monto total de la operación'
    );
    error.statusCode = 400;
    throw error;
  }

  return createPago({
    id_operacion,
    id_medio_pago,
    monto,
    referencia_bancaria
  });
};

export const getPagoById = async (idPago) => {
  return findPagoById(idPago);
};

export const getPagosByOperacion = async (idOperacion) => {
  return findPagosByOperacion(idOperacion);
};