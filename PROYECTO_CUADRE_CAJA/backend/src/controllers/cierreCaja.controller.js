import {
  registrarCierreCaja,
  obtenerCierreCaja,
  listarCierresCaja,
  obtenerPreCalculoCierre as obtenerPreCalculoCierreService
} from '../services/cierreCaja.service.js';

export const createCierre = async (req, res, next) => {
  try {
    const cierre = await registrarCierreCaja({
      ...req.body,
      id_usuario_responsable: req.user.id_usuario
    });

    return res.status(201).json({
      status: 'success',
      data: cierre
    });
  } catch (error) {
    next(error);
  }
};

export const getCierre = async (req, res, next) => {
  try {
    const cierre = await obtenerCierreCaja(Number(req.params.id));

    if (!cierre) {
      return res.status(404).json({
        status: 'error',
        message: 'Cierre de caja no encontrado'
      });
    }

    return res.json({
      status: 'success',
      data: cierre
    });
  } catch (error) {
    next(error);
  }
};

export const getCierres = async (req, res, next) => {
  try {
    const cierres = await listarCierresCaja();

    return res.json({
      status: 'success',
      data: cierres
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerPreCalculoCierre = async (req, res, next) => {
  try {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
      return res.status(400).json({
        status: 'error',
        message: 'Fecha y turno son requeridos'
      });
    }

    const preCalculo = await obtenerPreCalculoCierreService(fecha, turno);

    return res.json({
      status: 'success',
      data: preCalculo
    });
  } catch (error) {
    next(error);
  }
};