import { query } from './base.repository.js';

export const createAnulacion = async ({
  id_comprobante,
  id_usuario,
  fecha,
  motivo,
  observacion = null
}) => {
  const result = await query(
    `INSERT INTO anulacion
      (
        id_comprobante,
        id_usuario,
        fecha,
        motivo,
        observacion
      )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING
       id_anulacion,
       id_comprobante,
       id_usuario,
       fecha,
       motivo,
       observacion`,
    [
      id_comprobante,
      id_usuario,
      fecha,
      motivo,
      observacion
    ]
  );

  return result.rows[0];
};

export const findAnulacionById = async (idAnulacion) => {
  const result = await query(
    `SELECT
       id_anulacion,
       id_comprobante,
       id_usuario,
       fecha,
       motivo,
       observacion
     FROM anulacion
     WHERE id_anulacion = $1`,
    [idAnulacion]
  );

  return result.rows[0] ?? null;
};

export const findAnulacionByComprobante = async (idComprobante) => {
  const result = await query(
    `SELECT
       id_anulacion,
       id_comprobante,
       id_usuario,
       fecha,
       motivo,
       observacion
     FROM anulacion
     WHERE id_comprobante = $1`,
    [idComprobante]
  );

  return result.rows[0] ?? null;
};