import {
  createEvidencia,
  findEvidenciaById,
  findEvidenciasByOperacion
} from '../repositories/evidencia.repository.js';

import {
  findOperacionById
} from '../repositories/operacion.repository.js';

export const registerEvidencia = async (data) => {
  const {
    id_operacion,
    id_usuario,
    tipo_evidencia,
    storage_key,
    fecha_evidencia,
    observacion = null
  } = data;

  if (
    !id_operacion ||
    !id_usuario ||
    !tipo_evidencia ||
    !storage_key ||
    !fecha_evidencia
  ) {
    const error = new Error(
      'id_operacion, id_usuario, tipo_evidencia, storage_key y fecha_evidencia son obligatorios'
    );

    error.statusCode = 400;
    throw error;
  }

  const operacion = await findOperacionById(id_operacion);

  if (!operacion) {
    const error = new Error('La operación no existe');
    error.statusCode = 404;
    throw error;
  }

  try {
  return await createEvidencia({
    id_operacion,
    id_usuario,
    tipo_evidencia,
    storage_key,
    fecha_evidencia,
    observacion
  });
} catch (error) {
  if (error.code === '23505' && error.constraint === 'uq_evidencia_storage_key') {
    const conflictError = new Error(
      'El storage_key de la evidencia ya existe'
    );
    conflictError.statusCode = 409;
    throw conflictError;
  }

  throw error;
}
    
};

export const getEvidenciaById = async (idEvidencia) => {
  return findEvidenciaById(idEvidencia);
};

export const getEvidenciasByOperacion = async (idOperacion) => {
  return findEvidenciasByOperacion(idOperacion);
};