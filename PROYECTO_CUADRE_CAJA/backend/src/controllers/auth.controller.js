import { authenticateUser } from '../services/auth.service.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Usuario y contraseña son obligatorios'
      });
    }

    const result = await authenticateUser(username, password);

    if (!result) {
      return res.status(401).json({
        status: 'error',
        message: 'Usuario o contraseña incorrectos'
      });
    }

    res.json({
      status: 'ok',
      message: 'Autenticación exitosa',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getAuthenticatedUser = (req, res) => {
  res.json({
    status: 'ok',
    data: {
      id_usuario: req.user.id_usuario,
      id_rol: req.user.id_rol,
      rol: req.user.rol,
      usuario: req.user.usuario
    }
  });
};