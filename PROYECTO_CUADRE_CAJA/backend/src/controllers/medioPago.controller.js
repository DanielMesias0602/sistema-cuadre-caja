import {
  getMediosPago,
  getMedioPagoById
} from '../services/medioPago.service.js';

export const getAll = async (req, res, next) => {
  try {
    const medios = await getMediosPago();

    res.json({
      status: 'ok',
      data: medios
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const medio = await getMedioPagoById(req.params.id);

    if (!medio) {
      return res.status(404).json({
        status: 'error',
        message: 'Medio de pago no encontrado'
      });
    }

    res.json({
      status: 'ok',
      data: medio
    });
  } catch (error) {
    next(error);
  }
};