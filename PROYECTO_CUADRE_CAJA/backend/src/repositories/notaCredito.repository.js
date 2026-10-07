import { query } from './base.repository.js';

export const createNotaCredito = async ({
  id_comprobante_original,
  id_usuario,
  fecha,
  monto,
  motivo,
  observacion = null
}) => {
  const result = await query(
    `INSERT INTO nota_credito
      (
        id_comprobante_original,
        id_usuario,
        fecha,
        monto,
        motivo,
        observacion
      )
     VALUES
      ($1, $2, $3, $4, $5, $6)
     RETURNING
       id_nota_credito,
       id_comprobante_original,
       id_usuario,
       fecha,
       monto,
       motivo,
       observacion`,
    [
      id_comprobante_original,
      id_usuario,
      fecha,
      monto,
      motivo,
      observacion
    ]
  );

  return result.rows[0];
};

export const findNotaCreditoById = async (
  idNotaCredito
) => {
  const result = await query(
    `SELECT
       id_nota_credito,
       id_comprobante_original,
       id_usuario,
       fecha,
       monto,
       motivo,
       observacion
     FROM nota_credito
     WHERE id_nota_credito = $1`,
    [idNotaCredito]
  );

  return result.rows[0] ?? null;
};

export const findNotasCreditoByComprobante = async (
  idComprobante
) => {
  const result = await query(
    `SELECT
       id_nota_credito,
       id_comprobante_original,
       id_usuario,
       fecha,
       monto,
       motivo,
       observacion
     FROM nota_credito
     WHERE id_comprobante_original = $1
     ORDER BY id_nota_credito`,
    [idComprobante]
  );

  return result.rows;
};