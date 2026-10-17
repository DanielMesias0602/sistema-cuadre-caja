import {
  getRoles,
  getRoleById,
} from '../services/rol.service.js';

export const listar = async (req, res, next) => {
  try {
    const roles = await getRoles();
    res.json({ status: 'ok', data: roles });
  } catch (error) {
    next(error);
  }
};

export const obtener = async (req, res, next) => {
  try {
    const rol = await getRoleById(Number(req.params.id));
    if (!rol) {
      return res.status(404).json({
        status: 'error',
        message: 'Rol no encontrado',
      });
    }
    res.json({ status: 'ok', data: rol });
  } catch (error) {
    next(error);
  }
};