import {
  registerEvidencia,
  getEvidenciaById,
  getEvidenciasByOperacion
} from '../services/evidencia.service.js';

export const create = async (req, res, next) => {
  try {
    const evidencia = await registerEvidencia({
      ...req.body,
      id_usuario: req.user.id_usuario
    });

    res.status(201).json({
      status: 'ok',
      message: 'Evidencia registrada correctamente',
      data: evidencia
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const evidencia = await getEvidenciaById(req.params.id);

    if (!evidencia) {
      return res.status(404).json({
        status: 'error',
        message: 'Evidencia no encontrada'
      });
    }

    res.json({
      status: 'ok',
      data: evidencia
    });
  } catch (error) {
    next(error);
  }
};

export const getByOperacion = async (req, res, next) => {
  try {
    const evidencias = await getEvidenciasByOperacion(
      req.params.idOperacion
    );

    res.json({
      status: 'ok',
      data: evidencias
    });
  } catch (error) {
    next(error);
  }
};