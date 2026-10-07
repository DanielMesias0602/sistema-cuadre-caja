import {
  registrarTipoSalida,
  obtenerTipoSalida,
  listarTiposSalida
} from '../services/tipoSalida.service.js';

export const createTipoSalida = async (req, res, next) => {
  try {
    const tipoSalida = await registrarTipoSalida(req.body);

    return res.status(201).json({
      status: 'success',
      data: tipoSalida
    });
  } catch (error) {
    next(error);
  }
};

export const getTipoSalida = async (req, res, next) => {
  try {
    const tipoSalida = await obtenerTipoSalida(
      Number(req.params.id)
    );

    if (!tipoSalida) {
      return res.status(404).json({
        status: 'error',
        message: 'Tipo de salida no encontrado'
      });
    }

    return res.json({
      status: 'success',
      data: tipoSalida
    });
  } catch (error) {
    next(error);
  }
};

export const getTiposSalida = async (req, res, next) => {
  try {
    const tiposSalida = await listarTiposSalida();

    return res.json({
      status: 'success',
      data: tiposSalida
    });
  } catch (error) {
    next(error);
  }
};