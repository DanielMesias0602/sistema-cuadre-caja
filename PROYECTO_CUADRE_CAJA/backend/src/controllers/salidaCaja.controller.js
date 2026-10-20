import {
  registrarSalidaCaja,
  obtenerSalidaCaja,
  listarSalidasPorCierre,
  listarSalidasCaja
} from '../services/salidaCaja.service.js';

export const getSalidas = async (req, res, next) => {
  try {
    const salidas = await listarSalidasCaja();

    return res.json({
      status: 'success',
      data: salidas
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }
    return next(error);
  }
};

export const createSalida = async (req, res, next) => {
  try {
    const resultado = await registrarSalidaCaja({
      ...req.body,
      id_usuario: req.user.id_usuario
    });

    return res.status(201).json({
      status: 'success',
      data: resultado
    });

  } catch (error) {

    // ============================
    // ERRORES CONTROLADOS
    // ============================

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }

    // ============================
    // ERROR REAL DEL SERVIDOR
    // ============================

    return next(error);
  }
};

export const getSalida = async (req, res, next) => {
  try {
    const salida = await obtenerSalidaCaja(
      Number(req.params.id)
    );

    if (!salida) {
      return res.status(404).json({
        status: 'error',
        message: 'Salida de caja no encontrada'
      });
    }

    return res.json({
      status: 'success',
      data: salida
    });

  } catch (error) {

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }

    return next(error);
  }
};

export const getSalidasByCierre = async (
  req,
  res,
  next
) => {
  try {
    const salidas = await listarSalidasPorCierre(
      Number(req.params.idCierre)
    );

    return res.json({
      status: 'success',
      data: salidas
    });

  } catch (error) {

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }

    return next(error);
  }
};