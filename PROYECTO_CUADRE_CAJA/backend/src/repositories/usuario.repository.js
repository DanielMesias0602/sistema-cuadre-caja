import { query } from './base.repository.js';

export const findByUsername = async (username) => {
  const result = await query(
    `SELECT
       u.id_usuario,
       u.id_rol,
       u.nombres,
       u.apellidos,
       u.usuario,
       u.password_hash,
       u.condicion_personal,
       u.estado,
       u.fecha_creacion,
       r.nombre AS rol_nombre,
       r.estado AS rol_estado
     FROM usuario u
     INNER JOIN rol r
       ON r.id_rol = u.id_rol
     WHERE u.usuario = $1`,
    [username]
  );

  return result.rows[0] ?? null;
};

export const findAllUsers = async () => {
  const result = await query(
    `SELECT
       u.id_usuario,
       u.id_rol,
       u.nombres,
       u.apellidos,
       u.usuario,
       u.condicion_personal,
       u.estado,
       u.fecha_creacion,
       r.nombre AS rol_nombre,
       r.estado AS rol_estado
     FROM usuario u
     INNER JOIN rol r
       ON r.id_rol = u.id_rol
     ORDER BY u.id_usuario`
  );

  return result.rows;
};

export const findUserById = async (idUsuario) => {
  const result = await query(
    `SELECT
       u.id_usuario,
       u.id_rol,
       u.nombres,
       u.apellidos,
       u.usuario,
       u.condicion_personal,
       u.estado,
       u.fecha_creacion,
       r.nombre AS rol_nombre,
       r.estado AS rol_estado
     FROM usuario u
     INNER JOIN rol r
       ON r.id_rol = u.id_rol
     WHERE u.id_usuario = $1`,
    [idUsuario]
  );

  return result.rows[0] ?? null;
};