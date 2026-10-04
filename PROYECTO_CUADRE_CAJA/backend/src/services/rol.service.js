import {
  findAllRoles,
  findRoleById
} from '../repositories/rol.repository.js';

export const getRoles = async () => {
  return findAllRoles();
};

export const getRoleById = async (idRol) => {
  return findRoleById(idRol);
};