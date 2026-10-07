import {
  registrarDetalleConciliacion,
  obtenerDetalleConciliacion,
  listarDetallesPorConciliacion
} from '../services/detalleConciliacion.service.js';

export const createDetalleConciliacion = async (
  req,
  res,
  next
) => {
  try {
    const {
      id_conciliacion,
      id_operacion,
      observacion,
      resultado
    } = req.body;

    const detalle =
      await registrarDetalleConciliacion({
        id_conciliacion,
        id_operacion,
        observacion,
        resultado
      });

    return res.status(201).json({
      status: 'success',
      data: detalle
    });

  } catch (error) {
    next(error);
  }
};

export const getDetalleConciliacion = async (
  req,
  res,
  next
) => {
  try {
    const {
      id
    } = req.params;

    const detalle =
      await obtenerDetalleConciliacion(id);

    return res.status(200).json({
      status: 'success',
      data: detalle
    });

  } catch (error) {
    next(error);
  }
};

export const getDetallesPorConciliacion = async (
  req,
  res,
  next
) => {
  try {
    const {
      id_conciliacion
    } = req.params;

    const detalles =
      await listarDetallesPorConciliacion(
        id_conciliacion
      );

    return res.status(200).json({
      status: 'success',
      data: detalles
    });

  } catch (error) {
    next(error);
  }
};