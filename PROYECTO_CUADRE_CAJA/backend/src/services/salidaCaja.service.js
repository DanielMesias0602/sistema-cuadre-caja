import {
  createSalidaCaja,
  findSalidaCajaById,
  findSalidasByCierre,
  findSalidasCaja
} from '../repositories/salidaCaja.repository.js';
import { createCierreCaja } from '../repositories/cierreCaja.repository.js';

import {
  query,
  withTransaction
} from '../repositories/base.repository.js';
import { emitirEvento } from './socket.service.js';

/**
 * Error controlado de negocio.
 */
class SalidaCajaError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'SalidaCajaError';
    this.statusCode = statusCode;
  }
}

const obtenerCierre = async (idCierre, db = { query }) => {
  const result = await db.query(
    `SELECT
       id_cierre,
       fecha,
       turno,
       total_ingresos,
       total_no_efectivo,
       efectivo_esperado,
       total_salidas,
       efectivo_despues_salidas,
       efectivo_fisico,
       diferencia,
       estado
     FROM cierre_caja
     WHERE id_cierre = $1`,
    [idCierre]
  );

  return result.rows[0] ?? null;
};

const obtenerTipoSalida = async (
  idTipoSalida,
  db = { query }
) => {
  const result = await db.query(
    `SELECT
       id_tipo_salida,
       nombre,
       estado
     FROM tipo_salida
     WHERE id_tipo_salida = $1`,
    [idTipoSalida]
  );

  return result.rows[0] ?? null;
};

export const registrarSalidaCaja = async ({
  id_cierre,
  id_tipo_salida,
  id_usuario,
  id_comprobante = null,
  fecha,
  monto,
  motivo,
  observacion = null,
  storage_key = null
}) => {

  // ============================
  // VALIDACIONES DE ENTRADA
  // ============================

  if (!id_tipo_salida) {
    throw new SalidaCajaError('El tipo de salida es obligatorio');
  }

  if (!id_usuario) {
    throw new SalidaCajaError('El usuario es obligatorio');
  }

  if (!fecha) {
    throw new SalidaCajaError('La fecha es obligatoria');
  }

  if (!motivo || !motivo.trim()) {
    throw new SalidaCajaError('El motivo es obligatorio');
  }

  const montoNumerico = Number(monto);

  if (!Number.isFinite(montoNumerico)) {
    throw new SalidaCajaError('El monto debe ser numérico');
  }

  if (montoNumerico <= 0) {
    throw new SalidaCajaError('El monto debe ser mayor que cero');
  }

  // ============================
  // TRANSACCIÓN
  // ============================

  const resultado = await withTransaction(async (client) => {
    const relojResult = await client.query(
      `SELECT
         TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS hoy,
         TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima', 'HH24:MI:SS') AS hora_actual,
         CURRENT_TIMESTAMP AS fecha_fin`
    );
    const {
      hoy: hoyStr,
      hora_actual: horaActual,
      fecha_fin: fechaFin
    } = relojResult.rows[0];
    const idCierreSolicitado = id_cierre == null || id_cierre === '' ? null : Number(id_cierre);
    let idCierreSalida = idCierreSolicitado;
    let fechaCierre = hoyStr;
    let turnoActual = null;

    if (
      idCierreSolicitado != null &&
      (!Number.isInteger(idCierreSolicitado) || idCierreSolicitado <= 0)
    ) {
      throw new SalidaCajaError('El cierre de caja no es válido');
    }

    if (idCierreSolicitado != null) {
      const cierreSolicitadoResult = await client.query(
        `SELECT TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha
         FROM cierre_caja
         WHERE id_cierre = $1`,
        [idCierreSolicitado]
      );
      if (!cierreSolicitadoResult.rows[0]) {
        throw new SalidaCajaError('El cierre de caja no existe', 404);
      }
      fechaCierre = cierreSolicitadoResult.rows[0].fecha;
    } else {
      if (fecha !== hoyStr) {
        throw new SalidaCajaError('La fecha de la salida debe corresponder al cierre seleccionado', 400);
      }

      if (horaActual >= '08:00:00' && horaActual < '14:00:00') {
        turnoActual = 'Mañana';
      } else if (horaActual >= '14:00:00') {
        turnoActual = 'Tarde';
      } else {
        throw new SalidaCajaError('No hay un turno de caja habilitado antes de las 8:00 AM', 409);
      }
    }

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('caja-turno:' || $1::date::text, 0))`,
      [fechaCierre]
    );
    
    // Solo validamos si la salida es para el día de HOY
    if (fechaCierre === hoyStr) {
      // Si es después de las 2:00 PM (14:00:00)
      if (horaActual > '14:00:00') {
        const cierreMananaResult = await client.query(
          `SELECT id_cierre, estado 
           FROM cierre_caja 
           WHERE fecha = $1 AND UPPER(turno) = 'MAÑANA' 
           LIMIT 1`,
          [hoyStr]
        );
        
        const cierreManana = cierreMananaResult.rows[0];
        
        if (!cierreManana || cierreManana.estado.toUpperCase() !== 'CERRADO') {
          throw new SalidaCajaError(
            'Debes cerrar la caja del Turno Mañana antes de registrar nuevas operaciones en la tarde. Por favor, dirígete al módulo de "Cierres de Caja" para realizarlo.', 
            409
          );
        }
      }
    }
    // =================================================================

    // ============================
    // 1. OBTENER Y BLOQUEAR CIERRE
    // ============================

    let cierre;
    if (idCierreSalida != null) {
      const cierreResult = await client.query(
        `SELECT
           id_cierre,
           fecha,
           turno,
           total_ingresos,
           total_no_efectivo,
           efectivo_esperado,
           total_salidas,
           efectivo_despues_salidas,
           efectivo_fisico,
           diferencia,
           estado
         FROM cierre_caja
         WHERE id_cierre = $1
         FOR UPDATE`,
        [idCierreSalida]
      );
      cierre = cierreResult.rows[0] ?? null;
    } else {
      const cierresResult = await client.query(
        `SELECT
           id_cierre,
           fecha,
           turno,
           total_ingresos,
           total_no_efectivo,
           efectivo_esperado,
           total_salidas,
           efectivo_despues_salidas,
           efectivo_fisico,
           diferencia,
           estado
         FROM cierre_caja
         WHERE fecha = $1 AND turno ILIKE $2
         ORDER BY id_cierre DESC
         FOR UPDATE`,
        [hoyStr, turnoActual]
      );
      cierre = cierresResult.rows.find(
        (registro) => String(registro.estado || '').toUpperCase() !== 'CERRADO'
      );

      if (!cierre) {
        if (cierresResult.rows.length > 0) {
          throw new SalidaCajaError('No se pueden registrar salidas en un turno que ya ha sido cerrado', 409);
        }

        cierre = await createCierreCaja({
          id_usuario_responsable: id_usuario,
          fecha: hoyStr,
          turno: turnoActual,
          total_ingresos: 0,
          total_no_efectivo: 0,
          efectivo_esperado: 0,
          total_salidas: 0,
          efectivo_despues_salidas: 0,
          efectivo_fisico: 0,
          diferencia: 0,
          estado: 'ABIERTO',
          fecha_fin: fechaFin
        }, client);
      }
      idCierreSalida = cierre.id_cierre;
    }

    if (!cierre) {
      throw new SalidaCajaError('El cierre de caja no existe', 404);
    }

    if (cierre.estado && cierre.estado.toUpperCase() === 'CERRADO') {
      throw new SalidaCajaError('No se pueden registrar salidas en un turno que ya ha sido cerrado', 400);
    }

    // ============================
    // 2. VALIDAR TIPO DE SALIDA
    // ============================

    const tipoSalida = await obtenerTipoSalida(id_tipo_salida, client);

    if (!tipoSalida) {
      throw new SalidaCajaError('El tipo de salida no existe', 404);
    }

    if (!tipoSalida.estado) {
      throw new SalidaCajaError('El tipo de salida está inactivo');
    }

    // ============================
    // 3. OBTENER SALIDAS ACTUALES
    // ============================

    const totalActualResult = await client.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_salidas
       FROM salida_caja
       WHERE id_cierre = $1`,
      [idCierreSalida]
    );

    const totalSalidasActuales = Number(totalActualResult.rows[0].total_salidas || 0);

    const totalesEfectivoResult = await client.query(
      `SELECT
         COALESCE(SUM(p.monto), 0) AS total_ingresos,
         COALESCE(
           SUM(CASE
             WHEN mp.es_efectivo = FALSE
               OR LOWER(TRIM(mp.nombre)) IN ('vale', 'deposito', 'depósito')
             THEN p.monto ELSE 0
           END),
           0
         ) AS total_no_efectivo
       FROM operacion o
       JOIN pago p ON p.id_operacion = o.id_operacion
       JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
       WHERE o.id_cierre = $1
         AND COALESCE(o.estado, '') <> 'ANULADA'
         AND COALESCE(p.estado, '') NOT IN ('ANULADO', 'ANULADA')`,
      [idCierreSalida]
    );

    // ============================
    // 4. CALCULAR NUEVOS TOTALES
    // ============================

    const efectivoEsperado = Number(totalesEfectivoResult.rows[0].total_ingresos || 0)
      - Number(totalesEfectivoResult.rows[0].total_no_efectivo || 0);
    const efectivoDisponible = Math.round(
      (efectivoEsperado - totalSalidasActuales) * 100
    ) / 100;

    // ============================
    // 5. VALIDAR EFECTIVO DISPONIBLE
    // ============================

    if (montoNumerico > efectivoDisponible) {
      throw new SalidaCajaError('No hay efectivo suficiente en caja para registrar esta salida', 400);
    }

    const nuevoTotalSalidas = Math.round(
      (totalSalidasActuales + montoNumerico) * 100
    ) / 100;
    const efectivoDespuesSalidas = Math.round(
      (efectivoDisponible - montoNumerico) * 100
    ) / 100;

    // ============================
    // 6. INSERTAR SALIDA
    // ============================

    const salida = await createSalidaCaja(
      {
        id_cierre: idCierreSalida,
        id_tipo_salida,
        id_usuario,
        id_comprobante,
        fecha: fechaCierre,
        monto: montoNumerico,
        motivo: motivo.trim(),
        observacion,
        storage_key
      },
      client
    );

    // ============================
    // 7. CALCULAR DIFERENCIA
    // ============================

    const efectivoFisico = Number(cierre.efectivo_fisico || 0);
    const diferencia = efectivoFisico - efectivoDespuesSalidas;

    // ============================
    // 8. ACTUALIZAR CIERRE
    // ============================

    const cierreActualizadoResult = await client.query(
      `UPDATE cierre_caja
       SET
         total_salidas = $1,
         efectivo_despues_salidas = $2,
         diferencia = $3
       WHERE id_cierre = $4
       RETURNING
         id_cierre,
         total_salidas,
         efectivo_despues_salidas,
         efectivo_fisico,
         diferencia`,
      [
        nuevoTotalSalidas,
        efectivoDespuesSalidas,
        diferencia,
        idCierreSalida
      ]
    );

    const cierreActualizado = cierreActualizadoResult.rows[0];

    // ============================
    // 9. RETORNAR
    // ============================

    return {
      salida,
      cierre: cierreActualizado
    };
  });

  emitirEvento('salida_creada', { id: resultado.salida.id_salida });
  emitirEvento('cierre_actualizado', { id: resultado.cierre.id_cierre });
  return resultado;
};

export const obtenerSalidaCaja = async (idSalida) => {
  return findSalidaCajaById(idSalida);
};

export const listarSalidasPorCierre = async (idCierre) => {
  const cierre = await obtenerCierre(idCierre);

  if (!cierre) {
    throw new SalidaCajaError('El cierre de caja no existe', 404);
  }

  return findSalidasByCierre(idCierre);
};

export const listarSalidasCaja = async () => {
  return findSalidasCaja();
};