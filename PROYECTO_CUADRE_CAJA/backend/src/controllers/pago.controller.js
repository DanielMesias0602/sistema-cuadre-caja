import {
  registerPago,
  getPagoById,
  getPagosByOperacion,
  modifyPago
} from '../services/pago.service.js';

import {
  getOperacionById
} from '../services/operacion.service.js';

export const create = async (req, res, next) => {
  try {
    const pago = await registerPago(req.body);

    res.status(201).json({
      status: 'ok',
      message: 'Pago registrado correctamente',
      data: pago
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const idPago = Number(req.params.id);
    const pago = await modifyPago(idPago, req.body);

    res.json({
      status: 'ok',
      message: 'Pago actualizado correctamente',
      data: pago
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const pago = await getPagoById(req.params.id);

    if (!pago) {
      return res.status(404).json({
        status: 'error',
        message: 'Pago no encontrado'
      });
    }

    res.json({
      status: 'ok',
      data: pago
    });
  } catch (error) {
    next(error);
  }
};

export const getByOperacion = async (req, res, next) => {
  try {
    const pagos = await getPagosByOperacion(req.params.idOperacion);

    res.json({
      status: 'ok',
      data: pagos
    });
  } catch (error) {
    next(error);
  }
};

export const getResumenByOperacion = async (req, res, next) => {
  try {
    const idOperacion = req.params.idOperacion;

    const operacion = await getOperacionById(idOperacion);

    if (!operacion) {
      return res.status(404).json({
        status: 'error',
        message: 'Operación no encontrada'
      });
    }

    const pagos = await getPagosByOperacion(idOperacion);

    const totalPagado = pagos
      .filter((pago) => pago.estado !== 'ANULADO')
      .reduce((total, pago) => total + Number(pago.monto), 0);

    const montoOperacion = Number(operacion.monto);

    res.json({
      status: 'ok',
      data: {
        id_operacion: operacion.id_operacion,
        monto_operacion: montoOperacion,
        total_pagado: totalPagado,
        saldo_pendiente: montoOperacion - totalPagado,
        pago_completo: totalPagado === montoOperacion,
        pagos
      }
    });
  } catch (error) {
    next(error);
  }
};