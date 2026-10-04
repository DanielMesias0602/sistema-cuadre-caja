import { query } from './base.repository.js';

export const findAllRoles = async () => {
  const result = await query(
    `SELECT
       id_rol,
       nombre,
       descripcion,
       estado
     FROM rol
     ORDER BY id_rol`
  );

  return result.rows;
};

export const findRoleById = async (idRol) => {
  const result = await query(
    `SELECT
       id_rol,
       nombre,
       descripcion,
       estado
     FROM rol
     WHERE id_rol = $1`,
    [idRol]
  );

  return result.rows[0] ?? null;
};