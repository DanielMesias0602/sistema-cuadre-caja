import {
  getUsuarios,
  getUsuarioById,
  registrarUsuario,
  modificarUsuario,
  cambiarEstadoUsuario,
  resetearPassword,
} from '../services/usuario.service.js';

export const listar = async (req, res, next) => {
  try {
    const usuarios = await getUsuarios();
    res.json({ status: 'ok', data: usuarios });
  } catch (error) {
    next(error);
  }
};

export const obtener = async (req, res, next) => {
  try {
    const usuario = await getUsuarioById(Number(req.params.id));
    res.json({ status: 'ok', data: usuario });
  } catch (error) {
    next(error);
  }
};

export const crear = async (req, res, next) => {
  try {
    const usuario = await registrarUsuario(req.body);
    res.status(201).json({ status: 'ok', data: usuario });
  } catch (error) {
    next(error);
  }
};

export const actualizar = async (req, res, next) => {
  try {
    const usuario = await modificarUsuario(Number(req.params.id), req.body);
    res.json({ status: 'ok', data: usuario });
  } catch (error) {
    next(error);
  }
};

export const cambiarEstado = async (req, res, next) => {
  try {
    const { estado } = req.body;
    const usuario = await cambiarEstadoUsuario(Number(req.params.id), estado);
    res.json({ status: 'ok', data: usuario });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    await resetearPassword(Number(req.params.id), password);
    res.json({ status: 'ok', message: 'Contraseña actualizada' });
  } catch (error) {
    next(error);
  }
};