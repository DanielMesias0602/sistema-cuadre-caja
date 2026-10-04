import {
  registerComprobante,
  getComprobanteById,
  getComprobantes
} from '../services/comprobante.service.js';

export const create = async (req, res, next) => {
  try {
    const comprobante = await registerComprobante(req.body);

    res.status(201).json({
      status: 'ok',
      message: 'Comprobante registrado correctamente',
      data: comprobante
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const comprobante = await getComprobanteById(req.params.id);

    if (!comprobante) {
      return res.status(404).json({
        status: 'error',
        message: 'Comprobante no encontrado'
      });
    }

    res.json({
      status: 'ok',
      data: comprobante
    });
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const comprobantes = await getComprobantes();

    res.json({
      status: 'ok',
      data: comprobantes
    });
  } catch (error) {
    next(error);
  }
};