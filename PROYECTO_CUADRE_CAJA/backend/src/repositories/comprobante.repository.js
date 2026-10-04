import { query } from './base.repository.js';

export const createComprobante = async ({
  tipo_comprobante,
  serie,
  numero,
  fecha,
  monto
}) => {
  const result = await query(
    `INSERT INTO comprobante
      (tipo_comprobante, serie, numero, fecha, monto)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING
       id_comprobante,
       tipo_comprobante,
       serie,
       numero,
       fecha,
       monto`,
    [
      tipo_comprobante,
      serie,
      numero,
      fecha,
      monto
    ]
  );

  return result.rows[0];
};

export const findComprobanteById = async (idComprobante) => {
  const result = await query(
    `SELECT
       id_comprobante,
       tipo_comprobante,
       serie,
       numero,
       fecha,
       monto
     FROM comprobante
     WHERE id_comprobante = $1`,
    [idComprobante]
  );

  return result.rows[0] ?? null;
};

export const findAllComprobantes = async () => {
  const result = await query(
    `SELECT
       id_comprobante,
       tipo_comprobante,
       serie,
       numero,
       fecha,
       monto
     FROM comprobante
     ORDER BY id_comprobante DESC`
  );

  return result.rows;
};