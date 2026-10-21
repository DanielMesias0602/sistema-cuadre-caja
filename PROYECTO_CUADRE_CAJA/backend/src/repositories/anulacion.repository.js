import { query } from './base.repository.js';

export const createAnulacion = async ({
  id_comprobante,
  id_usuario,
  fecha,
  motivo,
  observacion = null
}, client = null) => {
  const executor = client ?? { query };

  const result = await executor.query(
    `INSERT INTO anulacion
      (id_comprobante, id_usuario, fecha, motivo, observacion)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_anulacion, id_comprobante, id_usuario, fecha, motivo, observacion`,
    [id_comprobante, id_usuario, fecha, motivo, observacion]
  );

  return result.rows[0];
};

export const findAnulacionById = async (idAnulacion) => {
  const result = await query(
    `SELECT id_anulacion, id_comprobante, id_usuario, fecha, motivo, observacion
     FROM anulacion
     WHERE id_anulacion = $1`,
    [idAnulacion]
  );
  return result.rows[0] ?? null;
};

export const findAnulacionByComprobante = async (idComprobante) => {
  const result = await query(
    `SELECT id_anulacion, id_comprobante, id_usuario, fecha, motivo, observacion
     FROM anulacion
     WHERE id_comprobante = $1`,
    [idComprobante]
  );
  return result.rows[0] ?? null;
};

export const findAllAnulaciones = async () => {
  const result = await query(
    `SELECT
       a.id_anulacion,
       a.id_comprobante,
       a.id_usuario,
       TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
       a.motivo,
       a.observacion,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       u.nombres || ' ' || u.apellidos AS usuario
     FROM anulacion a
     INNER JOIN comprobante c ON c.id_comprobante = a.id_comprobante
     INNER JOIN usuario u ON u.id_usuario = a.id_usuario
     ORDER BY a.fecha DESC, a.id_anulacion DESC`
  );
  return result.rows;
};