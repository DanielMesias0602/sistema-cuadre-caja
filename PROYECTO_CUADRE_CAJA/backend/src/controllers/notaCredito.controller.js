import {
  registrarNotaCredito,
  obtenerNotaCredito,
  listarNotasCreditoPorComprobante,
  listarTodasNotasCredito,
  modificarNotaCredito
} from '../services/notaCredito.service.js';

export const createNotaCredito = async (req, res, next) => {
  try {
    const notaCredito = await registrarNotaCredito({
      ...req.body,
      id_usuario: req.user.id_usuario
    });
    return res.status(201).json({ status: 'success', data: notaCredito });
  } catch (error) {
    next(error);
  }
};

export const getNotaCredito = async (req, res, next) => {
  try {
    const notaCredito = await obtenerNotaCredito(Number(req.params.id));
    if (!notaCredito) {
      return res.status(404).json({ status: 'error', message: 'Nota de Crédito no encontrada' });
    }
    return res.json({ status: 'success', data: notaCredito });
  } catch (error) {
    next(error);
  }
};

export const getNotasCreditoByComprobante = async (req, res, next) => {
  try {
    const notas = await listarNotasCreditoPorComprobante(Number(req.params.idComprobante));
    return res.json({ status: 'success', data: notas });
  } catch (error) {
    next(error);
  }
};

export const getNotasCredito = async (req, res, next) => {
  try {
    const notas = await listarTodasNotasCredito();
    return res.json({ status: 'success', data: notas });
  } catch (error) {
    next(error);
  }
};

export const updateNotaCredito = async (req, res, next) => {
  try {
    const nota = await modificarNotaCredito(Number(req.params.id), req.body);
    return res.json({ status: 'success', data: nota });
  } catch (error) {
    next(error);
  }
};