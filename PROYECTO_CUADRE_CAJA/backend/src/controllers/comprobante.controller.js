import {
  registerComprobante,
  actualizarComprobante,
  getComprobanteById,
  getComprobantes,
  checkComprobanteExistente // <-- NUEVO IMPORT
} from '../services/comprobante.service.js';

export const update = async (req, res, next) => {
  try {
    const comprobante = await actualizarComprobante(req.params.id, req.body);

    res.json({
      status: 'ok',
      message: 'Comprobante actualizado correctamente',
      data: comprobante
    });
  } catch (error) {
    next(error);
  }
};

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

// NUEVO CONTROLADOR: Verificar si un comprobante ya existe
export const checkExists = async (req, res, next) => {
  try {
    const { tipo_comprobante, serie, numero } = req.query;

    if (!tipo_comprobante || !serie || !numero) {
      return res.status(400).json({
        status: 'error',
        message: 'Faltan parámetros para verificar el comprobante'
      });
    }

    const comprobante = await checkComprobanteExistente(tipo_comprobante, serie, numero);

    res.json({
      status: 'ok',
      exists: !!comprobante,
      data: comprobante || null
    });
  } catch (error) {
    next(error);
  }
};