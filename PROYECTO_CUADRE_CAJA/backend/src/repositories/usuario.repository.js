import { query } from './base.repository.js';

export const findByUsername = async (username) => {
  const result = await query(
    `SELECT
       id_usuario,
       id_rol,
       usuario,
       password_hash,
       condicion_personal,
       fecha_creacion
     FROM usuario
     WHERE usuario = $1`,
    [username]
  );

  return result.rows[0] ?? null;
};