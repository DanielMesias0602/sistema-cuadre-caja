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

export const createUser = async ({
  id_rol,
  nombres,
  apellidos,
  usuario,
  password_hash,
  condicion_personal,
  estado = true,
}) => {
  const result = await query(
    `INSERT INTO usuario
       (id_rol, nombres, apellidos, usuario, password_hash, condicion_personal, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING
       id_usuario, id_rol, nombres, apellidos, usuario,
       condicion_personal, estado, fecha_creacion`,
    [id_rol, nombres, apellidos, usuario, password_hash, condicion_personal, estado]
  );
  return result.rows[0];
};

export const updateUser = async (idUsuario, {
  id_rol,
  nombres,
  apellidos,
  condicion_personal,
}) => {
  const result = await query(
    `UPDATE usuario
       SET id_rol = $1,
           nombres = $2,
           apellidos = $3,
           condicion_personal = $4
     WHERE id_usuario = $5
     RETURNING
       id_usuario, id_rol, nombres, apellidos, usuario,
       condicion_personal, estado, fecha_creacion`,
    [id_rol, nombres, apellidos, condicion_personal, idUsuario]
  );
  return result.rows[0] ?? null;
};

export const updateEstado = async (idUsuario, estado) => {
  const result = await query(
    `UPDATE usuario
       SET estado = $1
     WHERE id_usuario = $2
     RETURNING
       id_usuario, id_rol, nombres, apellidos, usuario,
       condicion_personal, estado, fecha_creacion`,
    [estado, idUsuario]
  );
  return result.rows[0] ?? null;
};

export const updatePassword = async (idUsuario, passwordHash) => {
  const result = await query(
    `UPDATE usuario
       SET password_hash = $1
     WHERE id_usuario = $2
     RETURNING id_usuario, usuario`,
    [passwordHash, idUsuario]
  );
  return result.rows[0] ?? null;
};

export const existsByUsername = async (username) => {
  const result = await query(
    `SELECT 1 FROM usuario WHERE usuario = $1 LIMIT 1`,
    [username]
  );
  return result.rows.length > 0;
};