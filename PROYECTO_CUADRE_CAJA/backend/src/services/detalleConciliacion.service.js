import {
  createDetalleConciliacion,
  findDetalleConciliacionById,
  findDetallesByConciliacion
} from '../repositories/detalleConciliacion.repository.js';

import {
  findConciliacionById
} from '../repositories/conciliacion.repository.js';

import {
  query,
  withTransaction
} from '../repositories/base.repository.js';

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

export const registrarDetalleConciliacion = async ({
  id_conciliacion,
  id_operacion,
  observacion = null,
  resultado
}) => {

  if (!id_conciliacion) {
    throw validationError(
      'La conciliación es obligatoria'
    );
  }

  if (!id_operacion) {
    throw validationError(
      'La operación es obligatoria'
    );
  }

  if (!resultado || !resultado.trim()) {
    throw validationError(
      'El resultado del detalle de conciliación es obligatorio'
    );
  }

  if (resultado.trim().length > 30) {
    throw validationError(
      'El resultado no puede superar los 30 caracteres'
    );
  }

  if (
    observacion !== null &&
    observacion !== undefined &&
    observacion.trim().length > 500
  ) {
    throw validationError(
      'La observación no puede superar los 500 caracteres'
    );
  }

  return withTransaction(async (client) => {

    const conciliacionResult = await client.query(
      `SELECT
         id_conciliacion
       FROM conciliacion
       WHERE id_conciliacion = $1
       FOR SHARE`,
      [id_conciliacion]
    );

    if (conciliacionResult.rows.length === 0) {
      throw notFoundError(
        'La conciliación no existe'
      );
    }

    const operacionResult = await client.query(
      `SELECT
         id_operacion
       FROM operacion
       WHERE id_operacion = $1
       FOR SHARE`,
      [id_operacion]
    );

    if (operacionResult.rows.length === 0) {
      throw notFoundError(
        'La operación no existe'
      );
    }

    return createDetalleConciliacion(
      {
        id_conciliacion,
        id_operacion,
        observacion:
          observacion?.trim() || null,
        resultado:
          resultado.trim()
      },
      client
    );
  });
};

export const obtenerDetalleConciliacion = async (
  idDetalle
) => {
  const detalle =
    await findDetalleConciliacionById(idDetalle);

  if (!detalle) {
    throw notFoundError(
      'El detalle de conciliación no existe'
    );
  }

  return detalle;
};

export const listarDetallesPorConciliacion = async (
  idConciliacion
) => {
  if (!idConciliacion) {
    throw validationError(
      'La conciliación es obligatoria'
    );
  }

  const conciliacion =
    await findConciliacionById(idConciliacion);

  if (!conciliacion) {
    throw notFoundError(
      'La conciliación no existe'
    );
  }

  return findDetallesByConciliacion(
    idConciliacion
  );
};