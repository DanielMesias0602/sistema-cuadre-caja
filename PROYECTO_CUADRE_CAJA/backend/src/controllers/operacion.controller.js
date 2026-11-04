import {
  registerOperacion,
  registerOperacionUnificada,
  actualizarRegistroOperacion,
  getOperacionById,
  getOperaciones
} from '../services/operacion.service.js';

export const create = async (req, res, next) => {
  try {
    const operacion = await registerOperacion({
      ...req.body,
      id_usuario: req.user.id_usuario
    });

    res.status(201).json({
      status: 'ok',
      message: 'Operación registrada correctamente',
      data: operacion
    });
  } catch (error) {
    next(error);
  }
};

// NUEVO CONTROLADOR: Transacción ACID Unificada
export const registrarUnificado = async (req, res, next) => {
  try {
    const id_usuario = req.user.id_usuario;
    const payload = req.body;
    
    const resultado = await registerOperacionUnificada({ 
      ...payload, 
      id_usuario 
    });

    res.status(201).json({ 
      status: 'ok', 
      message: 'Operación registrada con trazabilidad OCR completa',
      data: resultado 
    });
  } catch (error) {
    next(error);
  }
};

export const updateRegistro = async (req, res, next) => {
  try {
    const resultado = await actualizarRegistroOperacion(
      req.params.id,
      req.body,
      req.user.id_usuario
    );

    res.json({
      status: 'ok',
      message: 'Registro actualizado correctamente',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const operacion = await getOperacionById(req.params.id);

    if (!operacion) {
      return res.status(404).json({
        status: 'error',
        message: 'Operación no encontrada'
      });
    }

    res.json({
      status: 'ok',
      data: operacion
    });
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const operaciones = await getOperaciones();

    res.json({
      status: 'ok',
      data: operaciones
    });
  } catch (error) {
    next(error);
  }
};