import {
  findOperacionesReport,
  findPagosPorMedioReport,
  findCierresReport,
  findDiferenciasReport,
  findConciliacionReport,
  findSalidasReport,
  findEvidenciasVerificacionesReport,
  findDashboardReport,
  findIndicadoresCompletos
} from '../repositories/reporte.repository.js';

const validarFecha = (valor, nombre) => {
  if (valor === undefined || valor === null || valor === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const error = new Error(`${nombre} debe tener formato YYYY-MM-DD`);
    error.statusCode = 400;
    throw error;
  }
  const fecha = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime())) {
    const error = new Error(`${nombre} no es una fecha válida`);
    error.statusCode = 400;
    throw error;
  }
  return valor;
};

const construirFiltros = (queryParams = {}) => {
  const fecha_desde = validarFecha(queryParams.fecha_desde, 'fecha_desde');
  const fecha_hasta = validarFecha(queryParams.fecha_hasta, 'fecha_hasta');
  if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta) {
    const error = new Error('fecha_desde no puede ser posterior a fecha_hasta');
    error.statusCode = 400;
    throw error;
  }
  let id_medio_pago = null;
  if (queryParams.id_medio_pago !== undefined && queryParams.id_medio_pago !== '') {
    id_medio_pago = Number(queryParams.id_medio_pago);
    if (!Number.isInteger(id_medio_pago) || id_medio_pago <= 0) {
      const error = new Error('id_medio_pago debe ser un entero positivo');
      error.statusCode = 400;
      throw error;
    }
  }
  return {
    fecha_desde,
    fecha_hasta,
    turno: queryParams.turno?.trim() || null,
    estado: queryParams.estado?.trim() || null,
    id_medio_pago,
    comprobante: queryParams.comprobante?.trim() || null
  };
};

export const obtenerReporteOperaciones = async (queryParams) => findOperacionesReport(construirFiltros(queryParams));
export const obtenerReportePagosPorMedio = async (queryParams) => findPagosPorMedioReport(construirFiltros(queryParams));
export const obtenerReporteCierres = async (queryParams) => findCierresReport(construirFiltros(queryParams));
export const obtenerReporteDiferencias = async (queryParams) => findDiferenciasReport(construirFiltros(queryParams));
export const obtenerReporteConciliacion = async (queryParams) => findConciliacionReport(construirFiltros(queryParams));
export const obtenerReporteSalidas = async (queryParams) => findSalidasReport(construirFiltros(queryParams));
export const obtenerReporteEvidenciasVerificaciones = async (queryParams) => findEvidenciasVerificacionesReport(construirFiltros(queryParams));
export const obtenerDashboard = async (queryParams) => findDashboardReport(construirFiltros(queryParams));
export const obtenerIndicadoresCompletos = async (queryParams) => findIndicadoresCompletos(construirFiltros(queryParams));