import {
  createSalidaCaja,
  findSalidaCajaById,
  findSalidasByCierre,
  findSalidasCaja
} from '../repositories/salidaCaja.repository.js';

import {
  query,
  withTransaction
} from '../repositories/base.repository.js';

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

  if (!id_cierre) {
    throw new SalidaCajaError('El cierre de caja es obligatorio');
  }

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

  return await withTransaction(async (client) => {

    // =================================================================
    // OPCIÓN A: BLOQUEO ESTRICTO DE TURNOS
    // =================================================================
    const dateCheck = await client.query(`SELECT CURRENT_DATE::text as hoy`);
    const hoyStr = dateCheck.rows[0].hoy;
    
    // Solo validamos si la salida es para el día de HOY
    if (fecha === hoyStr) {
      const timeCheck = await client.query(`SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::time::text as hora_actual`);
      const horaActual = timeCheck.rows[0].hora_actual;
      
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
      [id_cierre]
    );

    const cierre = cierreResult.rows[0] ?? null;

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
      [id_cierre]
    );

    const totalSalidasActuales = Number(totalActualResult.rows[0].total_salidas);

    // ============================
    // 4. CALCULAR NUEVOS TOTALES
    // ============================

    const nuevoTotalSalidas = totalSalidasActuales + montoNumerico;
    const efectivoEsperado = Number(cierre.efectivo_esperado || 0);
    const efectivoDespuesSalidas = efectivoEsperado - nuevoTotalSalidas;

    // ============================
    // 5. VALIDAR EFECTIVO DISPONIBLE
    // ============================

    if (efectivoDespuesSalidas < 0) {
      throw new SalidaCajaError('La salida supera el efectivo disponible del cierre', 400);
    }

    // ============================
    // 6. INSERTAR SALIDA
    // ============================

    const salida = await createSalidaCaja(
      {
        id_cierre,
        id_tipo_salida,
        id_usuario,
        id_comprobante,
        fecha,
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
        id_cierre
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