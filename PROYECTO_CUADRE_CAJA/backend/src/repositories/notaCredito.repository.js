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
      (id_comprobante_original, id_usuario, fecha, monto, motivo, observacion)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_nota_credito, id_comprobante_original, id_usuario, fecha, monto, motivo, observacion`,
    [id_comprobante_original, id_usuario, fecha, monto, motivo, observacion]
  );
  return result.rows[0];
};

export const findNotaCreditoById = async (idNotaCredito) => {
  const result = await query(
    `SELECT id_nota_credito, id_comprobante_original, id_usuario, fecha, monto, motivo, observacion
     FROM nota_credito
     WHERE id_nota_credito = $1`,
    [idNotaCredito]
  );
  return result.rows[0] ?? null;
};

export const findNotasCreditoByComprobante = async (idComprobante) => {
  const result = await query(
    `SELECT id_nota_credito, id_comprobante_original, id_usuario, fecha, monto, motivo, observacion
     FROM nota_credito
     WHERE id_comprobante_original = $1
     ORDER BY id_nota_credito`,
    [idComprobante]
  );
  return result.rows;
};

export const findAllNotasCredito = async () => {
  const result = await query(
    `SELECT
       n.id_nota_credito,
       n.id_comprobante_original,
       n.id_usuario,
       TO_CHAR(n.fecha, 'YYYY-MM-DD') AS fecha,
       n.monto,
       n.motivo,
       n.observacion,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       c.monto AS monto_comprobante_original,
       u.nombres || ' ' || u.apellidos AS usuario
     FROM nota_credito n
     INNER JOIN comprobante c ON c.id_comprobante = n.id_comprobante_original
     INNER JOIN usuario u ON u.id_usuario = n.id_usuario
     ORDER BY n.fecha DESC, n.id_nota_credito DESC`
  );
  return result.rows;
};

export const updateNotaCredito = async (idNotaCredito, { motivo, observacion }) => {
  const result = await query(
    `UPDATE nota_credito
     SET motivo = $1, observacion = $2
     WHERE id_nota_credito = $3
     RETURNING id_nota_credito, id_comprobante_original, id_usuario, fecha, monto, motivo, observacion`,
    [motivo, observacion, idNotaCredito]
  );
  return result.rows[0] ?? null;
};