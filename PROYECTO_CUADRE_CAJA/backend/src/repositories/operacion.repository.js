import { query } from './base.repository.js';

export const createOperacion = async ({
  id_comprobante,
  id_usuario,
  id_cierre = null,
  fecha,
  monto,
  estado,
  observacion = null
}) => {
  const result = await query(
    `INSERT INTO operacion
      (
        id_usuario,
        id_cierre,
        id_comprobante,
        fecha,
        monto,
        estado,
        observacion
      )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING
       id_operacion,
       id_usuario,
       id_cierre,
       id_comprobante,
       TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
       monto,
       estado,
       observacion,
       fecha_registro,
       fecha_modificacion,
       id_usuario_modificacion`,
    [
      id_usuario,
      id_cierre,
      id_comprobante,
      fecha,
      monto,
      estado,
      observacion
    ]
  );

  return result.rows[0];
};

export const findOperacionById = async (idOperacion) => {
  const result = await query(
    `SELECT
       id_operacion,
       id_usuario,
       id_cierre,
       id_comprobante,
       TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
       monto,
       estado,
       observacion,
       fecha_registro,
       fecha_modificacion,
       id_usuario_modificacion
     FROM operacion
     WHERE id_operacion = $1`,
    [idOperacion]
  );

  return result.rows[0] ?? null;
};

export const findAllOperaciones = async () => {
  const result = await query(
    `SELECT
       o.id_operacion,
       o.id_usuario,
       o.id_cierre,
       o.id_comprobante,
       TO_CHAR(o.fecha, 'YYYY-MM-DD') AS fecha,
       o.monto,
       o.estado,
       o.observacion,
       o.fecha_registro,
       o.fecha_modificacion,
       o.id_usuario_modificacion,
       u.nombres,
       u.apellidos,
       c.tipo_comprobante,
       c.serie,
       c.numero
     FROM operacion o
     INNER JOIN usuario u
       ON u.id_usuario = o.id_usuario
     INNER JOIN comprobante c
       ON c.id_comprobante = o.id_comprobante
     ORDER BY o.id_operacion DESC`
  );

  return result.rows;
};