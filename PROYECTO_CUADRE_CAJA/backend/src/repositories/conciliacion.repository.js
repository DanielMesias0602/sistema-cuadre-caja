import { query } from './base.repository.js';

export const createConciliacion = async ({
  id_usuario,
  fecha,
  diferencia_detectada,
  resultado,
  observacion = null
}) => {
  const result = await query(
    `INSERT INTO conciliacion
      (
        id_usuario,
        fecha,
        diferencia_detectada,
        resultado,
        observacion
      )
     VALUES
      ($1, $2, $3, $4, $5)
     RETURNING
       id_conciliacion,
       id_usuario,
       fecha,
       diferencia_detectada,
       resultado,
       observacion,
       fecha_registro`,
    [
      id_usuario,
      fecha,
      diferencia_detectada,
      resultado,
      observacion
    ]
  );

  return result.rows[0];
};

export const findConciliacionById = async (idConciliacion) => {
  const result = await query(
    `SELECT
       id_conciliacion,
       id_usuario,
       fecha,
       diferencia_detectada,
       resultado,
       observacion,
       fecha_registro
     FROM conciliacion
     WHERE id_conciliacion = $1`,
    [idConciliacion]
  );

  return result.rows[0] ?? null;
};

export const findAllConciliaciones = async () => {
  const result = await query(
    `SELECT
       id_conciliacion,
       id_usuario,
       fecha,
       diferencia_detectada,
       resultado,
       observacion,
       fecha_registro
     FROM conciliacion
     ORDER BY fecha DESC, id_conciliacion DESC`
  );

  return result.rows;
};