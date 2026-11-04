import { query } from './base.repository.js';

export const findAllMediosPago = async () => {
  const result = await query(
    `SELECT
       id_medio_pago,
       nombre,
       CASE
         WHEN LOWER(TRIM(nombre)) IN ('vale', 'deposito', 'depósito') THEN FALSE
         ELSE es_efectivo
       END AS es_efectivo,
       estado
     FROM medio_pago
     WHERE estado = TRUE
     ORDER BY id_medio_pago`
  );

  return result.rows;
};

export const findMedioPagoById = async (idMedioPago) => {
  const result = await query(
    `SELECT
       id_medio_pago,
       nombre,
       CASE
         WHEN LOWER(TRIM(nombre)) IN ('vale', 'deposito', 'depósito') THEN FALSE
         ELSE es_efectivo
       END AS es_efectivo,
       estado
     FROM medio_pago
     WHERE id_medio_pago = $1`,
    [idMedioPago]
  );

  return result.rows[0] ?? null;
};