import { query } from './base.repository.js';

export const createDetalleConciliacion = async ({
  id_conciliacion,
  id_operacion,
  observacion = null,
  resultado
}, db = { query }) => {
  const result = await db.query(
    `INSERT INTO detalle_conciliacion
      (
        id_conciliacion,
        id_operacion,
        observacion,
        resultado
      )
     VALUES
      ($1, $2, $3, $4)
     RETURNING
       id_detalle,
       id_conciliacion,
       id_operacion,
       observacion,
       resultado`,
    [
      id_conciliacion,
      id_operacion,
      observacion,
      resultado
    ]
  );

  return result.rows[0];
};

export const findDetalleConciliacionById = async (
  idDetalle
) => {
  const result = await query(
    `SELECT
       id_detalle,
       id_conciliacion,
       id_operacion,
       observacion,
       resultado
     FROM detalle_conciliacion
     WHERE id_detalle = $1`,
    [idDetalle]
  );

  return result.rows[0] ?? null;
};

export const findDetallesByConciliacion = async (
  idConciliacion
) => {
  const result = await query(
    `SELECT
       id_detalle,
       id_conciliacion,
       id_operacion,
       observacion,
       resultado
     FROM detalle_conciliacion
     WHERE id_conciliacion = $1
     ORDER BY id_detalle ASC`,
    [idConciliacion]
  );

  return result.rows;
};