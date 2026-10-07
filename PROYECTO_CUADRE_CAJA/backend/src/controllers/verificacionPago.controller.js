import {
  registrarVerificacionPago,
  obtenerVerificacionPago,
  listarVerificacionesPago
} from '../services/verificacionPago.service.js';

export const createVerificacion = async (req, res, next) => {
  try {
    const verificacion = await registrarVerificacionPago({
      ...req.body,
      id_usuario: req.user.id_usuario
    });

    return res.status(201).json({
      status: 'success',
      data: verificacion
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificacion = async (req, res, next) => {
  try {
    const verificacion = await obtenerVerificacionPago(
      Number(req.params.id)
    );

    if (!verificacion) {
      return res.status(404).json({
        status: 'error',
        message: 'Verificación no encontrada'
      });
    }

    return res.json({
      status: 'success',
      data: verificacion
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificacionesByPago = async (
  req,
  res,
  next
) => {
  try {
    const verificaciones = await listarVerificacionesPago(
      Number(req.params.idPago)
    );

    return res.json({
      status: 'success',
      data: verificaciones
    });
  } catch (error) {
    next(error);
  }
};