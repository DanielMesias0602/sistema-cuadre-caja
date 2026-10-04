import {
  createComprobante,
  findComprobanteById,
  findAllComprobantes
} from '../repositories/comprobante.repository.js';

export const registerComprobante = async (data) => {
  return createComprobante(data);
};

export const getComprobanteById = async (idComprobante) => {
  return findComprobanteById(idComprobante);
};

export const getComprobantes = async () => {
  return findAllComprobantes();
};