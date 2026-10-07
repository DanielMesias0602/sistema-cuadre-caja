import { query } from './base.repository.js';

export const createSalidaCaja = async ({
  id_cierre,
  id_tipo_salida,
  id_usuario,
  id_comprobante = null,
  fecha,
  monto,
  motivo,
  observacion = null,
  storage_key = null
}, db = { query }) => {

  const result = await db.query(
    `INSERT INTO salida_caja
      (
        id_cierre,
        id_tipo_salida,
        id_usuario,
        id_comprobante,
        fecha,
        monto,
        motivo,
        observacion,
        storage_key
      )
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING
       id_salida,
       id_cierre,
       id_tipo_salida,
       id_usuario,
       id_comprobante,
       fecha,
       monto,
       motivo,
       observacion,
       storage_key,
       fecha_registro`,
    [
      id_cierre,
      id_tipo_salida,
      id_usuario,
      id_comprobante,
      fecha,
      monto,
      motivo,
      observacion,
      storage_key
    ]
  );

  return result.rows[0];
};

export const findSalidaCajaById = async (idSalida) => {
  const result = await query(
    `SELECT
       id_salida,
       id_cierre,
       id_tipo_salida,
       id_usuario,
       id_comprobante,
       fecha,
       monto,
       motivo,
       observacion,
       storage_key,
       fecha_registro
     FROM salida_caja
     WHERE id_salida = $1`,
    [idSalida]
  );

  return result.rows[0] ?? null;
};

export const findSalidasByCierre = async (idCierre) => {
  const result = await query(
    `SELECT
       id_salida,
       id_cierre,
       id_tipo_salida,
       id_usuario,
       id_comprobante,
       fecha,
       monto,
       motivo,
       observacion,
       storage_key,
       fecha_registro
     FROM salida_caja
     WHERE id_cierre = $1
     ORDER BY id_salida`,
    [idCierre]
  );

  return result.rows;
};