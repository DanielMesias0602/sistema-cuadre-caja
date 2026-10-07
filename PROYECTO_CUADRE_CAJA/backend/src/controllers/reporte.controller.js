import {
  obtenerReporteOperaciones,
  obtenerReportePagosPorMedio,
  obtenerReporteCierres,
  obtenerReporteDiferencias,
  obtenerReporteConciliacion,
  obtenerReporteSalidas,
  obtenerReporteEvidenciasVerificaciones,
  obtenerDashboard
} from '../services/reporte.service.js';

const responder = (res, data) =>
  res.json({
    status: 'success',
    data
  });

export const getOperacionesReport = async (req, res, next) => {
  try {
    responder(res, await obtenerReporteOperaciones(req.query));
  } catch (error) {
    next(error);
  }
};

export const getPagosPorMedioReport = async (req, res, next) => {
  try {
    responder(res, await obtenerReportePagosPorMedio(req.query));
  } catch (error) {
    next(error);
  }
};

export const getCierresReport = async (req, res, next) => {
  try {
    responder(res, await obtenerReporteCierres(req.query));
  } catch (error) {
    next(error);
  }
};

export const getDiferenciasReport = async (req, res, next) => {
  try {
    responder(res, await obtenerReporteDiferencias(req.query));
  } catch (error) {
    next(error);
  }
};

export const getConciliacionReport = async (req, res, next) => {
  try {
    responder(res, await obtenerReporteConciliacion(req.query));
  } catch (error) {
    next(error);
  }
};

export const getSalidasReport = async (req, res, next) => {
  try {
    responder(res, await obtenerReporteSalidas(req.query));
  } catch (error) {
    next(error);
  }
};

export const getEvidenciasVerificacionesReport = async (req, res, next) => {
  try {
    responder(res, await obtenerReporteEvidenciasVerificaciones(req.query));
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    responder(res, await obtenerDashboard(req.query));
  } catch (error) {
    next(error);
  }
};
