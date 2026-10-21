import {
  registrarAnulacion,
  obtenerAnulacion,
  obtenerAnulacionPorComprobante,
  listarAnulaciones
} from '../services/anulacion.service.js';

export const createAnulacion = async (req, res, next) => {
  try {
    const anulacion = await registrarAnulacion({
      ...req.body,
      id_usuario: req.user.id_usuario
    });
    return res.status(201).json({ status: 'success', data: anulacion });
  } catch (error) {
    next(error);
  }
};

export const getAnulacion = async (req, res, next) => {
  try {
    const anulacion = await obtenerAnulacion(Number(req.params.id));
    if (!anulacion) {
      return res.status(404).json({ status: 'error', message: 'Anulación no encontrada' });
    }
    return res.json({ status: 'success', data: anulacion });
  } catch (error) {
    next(error);
  }
};

export const getAnulacionByComprobante = async (req, res, next) => {
  try {
    const anulacion = await obtenerAnulacionPorComprobante(Number(req.params.idComprobante));
    if (!anulacion) {
      return res.status(404).json({ status: 'error', message: 'El comprobante no tiene una anulación registrada' });
    }
    return res.json({ status: 'success', data: anulacion });
  } catch (error) {
    next(error);
  }
};

export const getAnulaciones = async (req, res, next) => {
  try {
    const anulaciones = await listarAnulaciones();
    return res.json({ status: 'success', data: anulaciones });
  } catch (error) {
    next(error);
  }
};