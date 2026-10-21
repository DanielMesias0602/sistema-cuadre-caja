import {
  registrarConciliacion,
  obtenerConciliacion,
  listarConciliaciones,
  obtenerPreCalculoConciliacion
} from '../services/conciliacion.service.js';

export const getPreCalculo = async (req, res, next) => {
  try {
    const { fecha } = req.query;
    const resultado = await obtenerPreCalculoConciliacion(fecha);
    res.json({ status: 'success', data: resultado });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ status: 'error', message: error.message });
    next(error);
  }
};

export const createConciliacion = async (req, res, next) => {
  try {
    const { fecha, diferencia_detectada, resultado, observacion } = req.body;
    const id_usuario = req.user.id_usuario;

    const conciliacion = await registrarConciliacion({
      id_usuario,
      fecha,
      diferencia_detectada,
      resultado,
      observacion
    });

    return res.status(201).json({ status: 'success', data: conciliacion });
  } catch (error) {
    next(error);
  }
};

export const getConciliacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conciliacion = await obtenerConciliacion(id);
    return res.status(200).json({ status: 'success', data: conciliacion });
  } catch (error) {
    next(error);
  }
};

export const getConciliaciones = async (req, res, next) => {
  try {
    const conciliaciones = await listarConciliaciones();
    return res.status(200).json({ status: 'success', data: conciliaciones });
  } catch (error) {
    next(error);
  }
};