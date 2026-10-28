import {
  createComprobante,
  findComprobanteById,
  findAllComprobantes,
  findComprobanteByTipoSerieNumero // <-- NUEVO IMPORT
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

// NUEVA FUNCIÓN: Verificar si existe un comprobante por sus datos únicos
export const checkComprobanteExistente = async (tipo, serie, numero) => {
  return findComprobanteByTipoSerieNumero(tipo, serie, numero);
};