import { findByUsername } from '../repositories/usuario.repository.js';

export const authenticateUser = async (username) => {
  const user = await findByUsername(username);

  if (!user) {
    return null;
  }

  return user;
};