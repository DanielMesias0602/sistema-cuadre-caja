import bcrypt from 'bcryptjs';

import {
  findAllUsers,
  findUserById,
  createUser,
  updateUser,
  updateEstado,
  updatePassword,
  existsByUsername,
} from '../repositories/usuario.repository.js';
import { findRoleById } from '../repositories/rol.repository.js';

const BCRYPT_ROUNDS = 10;
const PASSWORD_MIN_LENGTH = 8;

export const getUsuarios = async () => {
  return findAllUsers();
};

export const getUsuarioById = async (idUsuario) => {
  const user = await findUserById(idUsuario);
  if (!user) {
    const err = new Error('Usuario no encontrado');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

export const registrarUsuario = async ({
  id_rol,
  nombres,
  apellidos,
  usuario,
  password,
  condicion_personal,
}) => {
  if (!id_rol || !nombres || !apellidos || !usuario || !password || !condicion_personal) {
    const err = new Error('Todos los campos son obligatorios');
    err.statusCode = 400;
    throw err;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    const err = new Error(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
    err.statusCode = 400;
    throw err;
  }

  const rol = await findRoleById(id_rol);
  if (!rol) {
    const err = new Error('El rol especificado no existe');
    err.statusCode = 400;
    throw err;
  }

  const yaExiste = await existsByUsername(usuario);
  if (yaExiste) {
    const err = new Error('El nombre de usuario ya está en uso');
    err.statusCode = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  return createUser({
    id_rol,
    nombres,
    apellidos,
    usuario,
    password_hash,
    condicion_personal,
  });
};

export const modificarUsuario = async (idUsuario, data) => {
  const user = await findUserById(idUsuario);
  if (!user) {
    const err = new Error('Usuario no encontrado');
    err.statusCode = 404;
    throw err;
  }

  if (data.id_rol) {
    const rol = await findRoleById(data.id_rol);
    if (!rol) {
      const err = new Error('El rol especificado no existe');
      err.statusCode = 400;
      throw err;
    }
  }

  return updateUser(idUsuario, {
    id_rol: data.id_rol ?? user.id_rol,
    nombres: data.nombres ?? user.nombres,
    apellidos: data.apellidos ?? user.apellidos,
    condicion_personal: data.condicion_personal ?? user.condicion_personal,
  });
};

export const cambiarEstadoUsuario = async (idUsuario, estado) => {
  const user = await findUserById(idUsuario);
  if (!user) {
    const err = new Error('Usuario no encontrado');
    err.statusCode = 404;
    throw err;
  }

  if (typeof estado !== 'boolean') {
    const err = new Error('El estado debe ser true o false');
    err.statusCode = 400;
    throw err;
  }

  return updateEstado(idUsuario, estado);
};

export const resetearPassword = async (idUsuario, nuevaPassword, usuarioSolicitante = null) => {
  if (!nuevaPassword || nuevaPassword.length < PASSWORD_MIN_LENGTH) {
    const err = new Error(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
    err.statusCode = 400;
    throw err;
  }

  const user = await findUserById(idUsuario);
  if (!user) {
    const err = new Error('Usuario no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const esMismoUsuario = usuarioSolicitante?.id_usuario != null
    && Number(usuarioSolicitante.id_usuario) === Number(idUsuario);
  if (
    Number(usuarioSolicitante?.id_rol) === 1 &&
    Number(user.id_rol) === 1 &&
    !esMismoUsuario
  ) {
    const err = new Error('No tienes permisos para cambiar la contraseña de otro administrador');
    err.statusCode = 403;
    throw err;
  }

  const password_hash = await bcrypt.hash(nuevaPassword, BCRYPT_ROUNDS);
  return updatePassword(idUsuario, password_hash);
};

import { deleteUser } from '../repositories/usuario.repository.js'; // Asegúrate de importarlo arriba

export const eliminarUsuario = async (idUsuario) => {
  return deleteUser(idUsuario);
};