import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { findByUsername } from '../repositories/usuario.repository.js';

export const authenticateUser = async (username, password) => {
  const user = await findByUsername(username);

  if (!user) {
    return null;
  }

  if (!user.estado || !user.rol_estado) {
    return null;
  }

  const passwordValid = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordValid) {
    return null;
  }

  const token = jwt.sign(
    {
      id_usuario: user.id_usuario,
      id_rol: user.id_rol,
      rol: user.rol_nombre,
      usuario: user.usuario
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '8h'
    }
  );

  return {
    token,
    user: {
      id_usuario: user.id_usuario,
      id_rol: user.id_rol,
      rol: user.rol_nombre,
      usuario: user.usuario,
      condicion_personal: user.condicion_personal
    }
  };
};