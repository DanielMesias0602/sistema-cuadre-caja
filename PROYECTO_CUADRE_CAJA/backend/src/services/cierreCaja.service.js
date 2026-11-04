import {
  createCierreCaja,
  findCierreCajaById,
  findCierresCaja,
  getTotalesParaCierre,
  getTotalSalidasParaCierre,
  contarOperacionesSinEvidenciaEmpresa
} from '../repositories/cierreCaja.repository.js';

import { withTransaction } from '../repositories/base.repository.js';
import { emitirEvento } from './socket.service.js';
import {
  construirAsociacionOperacionesSql,
  obtenerEtiquetaTurno,
  obtenerRangoTurno,
} from '../utils/turnoCaja.js';

export const registrarCierreCaja = async ({
  fecha,
  turno,
  efectivo_fisico,
  estado = 'CERRADO',
  fecha_fin = null,
  id_usuario_responsable,
  id_cierre = null
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

  const efectivoFisico = Number(efectivo_fisico);

  if (!Number.isFinite(efectivoFisico)) throw new Error('efectivo_fisico debe ser numérico');
  if (efectivoFisico < 0) throw new Error('efectivo_fisico no puede ser negativo');

  const cierre = await withTransaction(async (client) => {
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('caja-turno:' || $1::date::text, 0))`,
      [fecha]
    );

    let cierreExistente;
    if (id_cierre != null) {
      const cierrePorIdResult = await client.query(
        `SELECT id_cierre, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, turno, estado
         FROM cierre_caja
         WHERE id_cierre = $1
         FOR UPDATE`,
        [id_cierre]
      );
      cierreExistente = cierrePorIdResult.rows[0];

      if (!cierreExistente) {
        const error = new Error('El cierre de caja no existe');
        error.statusCode = 404;
        throw error;
      }

      const turnoExistente = obtenerEtiquetaTurno(cierreExistente.turno);
      if (cierreExistente.fecha !== fecha || turnoExistente !== turnoEtiqueta) {
        const error = new Error('El cierre no corresponde a la fecha y turno enviados');
        error.statusCode = 400;
        throw error;
      }
    } else {
      const cierreExistenteResult = await client.query(
        `SELECT id_cierre, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, turno, estado
         FROM cierre_caja
         WHERE fecha = $1
           AND turno ILIKE $2
         FOR UPDATE`,
        [fecha, turnoEtiqueta]
      );
      cierreExistente = cierreExistenteResult.rows[0];
    }

    if (cierreExistente && String(cierreExistente.estado).toUpperCase() === 'CERRADO') {
      const error = new Error('Este turno ya fue cerrado');
      error.statusCode = 409;
      throw error;
    }
    if (cierreExistente && String(cierreExistente.estado).toUpperCase() !== 'ABIERTO') {
      const error = new Error('El estado del cierre no permite finalizar este turno');
      error.statusCode = 409;
      throw error;
    }

    if (cierreExistente) {
      await client.query(
        'UPDATE operacion SET id_cierre = NULL WHERE id_cierre = $1',
        [cierreExistente.id_cierre]
      );
    }

    const totalesReales = await getTotalesParaCierre(fecha, turnoEtiqueta, client);
    const ingresosReales = Number(totalesReales.total_ingresos);
    const noEfectivoReal = Number(totalesReales.total_no_efectivo);
    const salidasReales = cierreExistente
      ? await getTotalSalidasParaCierre(cierreExistente.id_cierre, client)
      : 0;
    const efectivoEsperadoReal = ingresosReales - noEfectivoReal;
    const efectivoDespuesSalidasReal = efectivoEsperadoReal - salidasReales;
    if (efectivoEsperadoReal < 0 || efectivoDespuesSalidasReal < 0) {
      throw new Error('Los totales calculados para el cierre no son válidos');
    }

    const valoresCierre = [
      id_usuario_responsable,
      ingresosReales,
      noEfectivoReal,
      efectivoEsperadoReal,
      salidasReales,
      efectivoDespuesSalidasReal,
      efectivoFisico,
      efectivoFisico - efectivoDespuesSalidasReal,
      fecha_fin
    ];
    const cierre = cierreExistente
      ? (await client.query(
        `UPDATE cierre_caja
         SET id_usuario_responsable = $1,
             total_ingresos = $2,
             total_no_efectivo = $3,
             efectivo_esperado = $4,
             total_salidas = $5,
             efectivo_despues_salidas = $6,
             efectivo_fisico = $7,
             diferencia = $8,
             estado = 'CERRADO',
             fecha_fin = $9
         WHERE id_cierre = $10
         RETURNING id_cierre, id_usuario_responsable, fecha, turno, total_ingresos,
                   total_no_efectivo, efectivo_esperado, total_salidas,
                   efectivo_despues_salidas, efectivo_fisico, diferencia, estado, fecha_fin`,
        [...valoresCierre, cierreExistente.id_cierre]
      )).rows[0]
      : await createCierreCaja({
        id_usuario_responsable,
        fecha,
        turno: turnoEtiqueta,
        total_ingresos: ingresosReales,
        total_no_efectivo: noEfectivoReal,
        efectivo_esperado: efectivoEsperadoReal,
        total_salidas: salidasReales,
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

  emitirEvento('cierre_actualizado', { id: cierre.id_cierre });
  return cierre;
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

export const obtenerPreCalculoCierre = async (fecha, turno, id_cierre = null) => {
  const etiquetaTurno = obtenerEtiquetaTurno(turno);
  if (!etiquetaTurno) {
    const error = new Error('El turno debe ser Mañana o Tarde');
    error.statusCode = 400;
    throw error;
  }
  const totales = await getTotalesParaCierre(fecha, etiquetaTurno, null, id_cierre);
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

  const cierreReabierto = await withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE cierre_caja
       SET estado = $1
       WHERE id_cierre = $2
       RETURNING id_cierre, estado`,
      ['ABIERTO', idCierre]
    );
    return result.rows[0] ?? null;
  });

  emitirEvento('cierre_actualizado', { id: cierreReabierto?.id_cierre ?? Number(idCierre) });
  return cierreReabierto;
};