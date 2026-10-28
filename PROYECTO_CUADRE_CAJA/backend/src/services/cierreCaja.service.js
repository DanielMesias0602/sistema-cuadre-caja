import {
  createCierreCaja,
  findCierreCajaById,
  findCierresCaja,
  getTotalesParaCierre,
  contarOperacionesSinEvidenciaEmpresa,
  updateEstadoCierre // <-- NUEVO
} from '../repositories/cierreCaja.repository.js';

import { withTransaction } from '../repositories/base.repository.js';
import {
  construirAsociacionOperacionesSql,
  obtenerEtiquetaTurno,
  obtenerRangoTurno,
} from '../utils/turnoCaja.js';

export const registrarCierreCaja = async ({
  fecha,
  turno,
  total_ingresos,
  total_no_efectivo,
  total_salidas,
  efectivo_fisico,
  estado = 'CERRADO',
  fecha_fin = null,
  id_usuario_responsable
}) => {
  if (!id_usuario_responsable) throw new Error('El usuario responsable es obligatorio');
  if (!fecha) throw new Error('La fecha es obligatoria');
  const turnoEtiqueta = obtenerEtiquetaTurno(turno);
  const rangoTurno = obtenerRangoTurno(turno);
  if (!turnoEtiqueta || !rangoTurno) {
    const error = new Error('El turno debe ser Mañana o Tarde');
    error.statusCode = 400;
    throw error;
  }

  const ingresos = Number(total_ingresos);
  const noEfectivo = Number(total_no_efectivo);
  const salidas = Number(total_salidas);
  const efectivoFisico = Number(efectivo_fisico);

  const valores = [
    ['total_ingresos', ingresos],
    ['total_no_efectivo', noEfectivo],
    ['total_salidas', salidas],
    ['efectivo_fisico', efectivoFisico]
  ];

  for (const [nombre, valor] of valores) {
    if (!Number.isFinite(valor)) throw new Error(`${nombre} debe ser numérico`);
    if (valor < 0) throw new Error(`${nombre} no puede ser negativo`);
  }

  const efectivoEsperado = ingresos - noEfectivo;
  if (efectivoEsperado < 0) throw new Error('El efectivo esperado no puede ser negativo');

  const efectivoDespuesSalidas = efectivoEsperado - salidas;
  if (efectivoDespuesSalidas < 0) throw new Error('El efectivo después de salidas no puede ser negativo');

  return withTransaction(async (client) => {
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('caja-turno:' || $1::date::text, 0))`,
      [fecha]
    );

    const totalesReales = await getTotalesParaCierre(fecha, turnoEtiqueta, client);
    const ingresosReales = Number(totalesReales.total_ingresos);
    const noEfectivoReal = Number(totalesReales.total_no_efectivo);
    const efectivoEsperadoReal = ingresosReales - noEfectivoReal;
    const efectivoDespuesSalidasReal = efectivoEsperadoReal - salidas;
    if (efectivoEsperadoReal < 0 || efectivoDespuesSalidasReal < 0) {
      throw new Error('Los totales calculados para el cierre no son válidos');
    }

    const cierre = await createCierreCaja({
      id_usuario_responsable,
      fecha,
      turno: turnoEtiqueta,
      total_ingresos: ingresosReales,
      total_no_efectivo: noEfectivoReal,
      efectivo_esperado: efectivoEsperadoReal,
      total_salidas: salidas,
      efectivo_despues_salidas: efectivoDespuesSalidasReal,
      efectivo_fisico: efectivoFisico,
      diferencia: efectivoFisico - efectivoDespuesSalidasReal,
      estado,
      fecha_fin
    }, client);

    const asociacion = construirAsociacionOperacionesSql(turnoEtiqueta);
    await client.query(asociacion.sql, [
      cierre.id_cierre,
      fecha,
      asociacion.rangoTurno.inicio,
      asociacion.rangoTurno.fin,
    ]);

    return cierre;
  });
};

export const obtenerCierreCaja = async (idCierre) => {
  const cierre = await findCierreCajaById(idCierre);
  if (!cierre) return null;

  const operaciones_pendientes_evidencia = await contarOperacionesSinEvidenciaEmpresa(idCierre);

  return {
    ...cierre,
    operaciones_pendientes_evidencia
  };
};

export const listarCierresCaja = async () => {
  return findCierresCaja();
};

export const obtenerPreCalculoCierre = async (fecha, turno) => {
  const etiquetaTurno = obtenerEtiquetaTurno(turno);
  if (!etiquetaTurno) {
    const error = new Error('El turno debe ser Mañana o Tarde');
    error.statusCode = 400;
    throw error;
  }
  const totales = await getTotalesParaCierre(fecha, etiquetaTurno);
  const ingresos = Number(totales.total_ingresos);
  const noEfectivo = Number(totales.total_no_efectivo);
  return {
    total_ingresos: ingresos,
    total_no_efectivo: noEfectivo,
    efectivo_esperado: ingresos - noEfectivo
  };
};

// NUEVO: Servicio para reabrir el turno
export const reabrirCierreCaja = async (idCierre) => {
  const cierre = await findCierreCajaById(idCierre);
  if (!cierre) {
    const error = new Error('El cierre de caja no existe');
    error.statusCode = 404;
    throw error;
  }

  if (cierre.estado !== 'CERRADO') {
    const error = new Error('El turno ya se encuentra abierto');
    error.statusCode = 400;
    throw error;
  }

  return updateEstadoCierre(idCierre, 'ABIERTO');
};