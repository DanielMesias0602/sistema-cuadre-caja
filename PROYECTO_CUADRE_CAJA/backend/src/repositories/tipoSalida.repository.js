import { query } from './base.repository.js';

export const createTipoSalida = async ({
  nombre,
  descripcion = null,
  estado = true
}) => {
  const result = await query(
    `INSERT INTO tipo_salida
      (nombre, descripcion, estado)
     VALUES ($1, $2, $3)
     RETURNING
       id_tipo_salida,
       nombre,
       descripcion,
       estado`,
    [nombre, descripcion, estado]
  );

  return result.rows[0];
};

export const findTipoSalidaById = async (idTipoSalida) => {
  const result = await query(
    `SELECT
       id_tipo_salida,
       nombre,
       descripcion,
       estado
     FROM tipo_salida
     WHERE id_tipo_salida = $1`,
    [idTipoSalida]
  );

  return result.rows[0] ?? null;
};

export const findTiposSalida = async () => {
  const result = await query(
    `SELECT
       id_tipo_salida,
       nombre,
       descripcion,
       estado
     FROM tipo_salida
     ORDER BY nombre`
  );

  return result.rows;
};