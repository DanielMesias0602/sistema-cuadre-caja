import {
  createConciliacion,
  findConciliacionById,
  findAllConciliaciones
} from '../repositories/conciliacion.repository.js';

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const registrarConciliacion = async ({
  id_usuario,
  fecha,
  diferencia_detectada,
  resultado,
  observacion = null
}) => {

  // ============================
  // VALIDACIONES
  // ============================

  if (!id_usuario) {
    throw validationError(
      'El usuario es obligatorio'
    );
  }

  if (!fecha) {
    throw validationError(
      'La fecha de conciliación es obligatoria'
    );
  }

  const diferenciaNumerica =
    Number(diferencia_detectada);

  if (!Number.isFinite(diferenciaNumerica)) {
    throw validationError(
      'La diferencia detectada debe ser numérica'
    );
  }

  if (!resultado || !resultado.trim()) {
    throw validationError(
      'El resultado de la conciliación es obligatorio'
    );
  }

  if (resultado.trim().length > 30) {
    throw validationError(
      'El resultado no puede superar los 30 caracteres'
    );
  }

  return createConciliacion({
    id_usuario,
    fecha,
    diferencia_detectada: diferenciaNumerica,
    resultado: resultado.trim(),
    observacion:
      observacion?.trim() || null
  });
};

export const obtenerConciliacion = async (
  idConciliacion
) => {
  const conciliacion =
    await findConciliacionById(idConciliacion);

  if (!conciliacion) {
    const error = new Error(
      'La conciliación no existe'
    );

    error.statusCode = 404;

    throw error;
  }

  return conciliacion;
};

export const listarConciliaciones = async () => {
  return findAllConciliaciones();
};