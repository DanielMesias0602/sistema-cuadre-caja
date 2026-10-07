import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Token de autenticación requerido'
      });
    }

    const token = authorization.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Token de autenticación inválido o expirado'
    });
  }
};