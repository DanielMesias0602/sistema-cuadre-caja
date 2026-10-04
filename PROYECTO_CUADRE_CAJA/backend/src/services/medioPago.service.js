import {
  findAllMediosPago,
  findMedioPagoById
} from '../repositories/medioPago.repository.js';

export const getMediosPago = async () => {
  return findAllMediosPago();
};

export const getMedioPagoById = async (idMedioPago) => {
  return findMedioPagoById(idMedioPago);
};