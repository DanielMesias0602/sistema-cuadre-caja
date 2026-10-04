import {
  createOperacion,
  findOperacionById,
  findAllOperaciones
} from '../repositories/operacion.repository.js';

export const registerOperacion = async (data) => {
  return createOperacion(data);
};

export const getOperacionById = async (idOperacion) => {
  return findOperacionById(idOperacion);
};

export const getOperaciones = async () => {
  return findAllOperaciones();
};