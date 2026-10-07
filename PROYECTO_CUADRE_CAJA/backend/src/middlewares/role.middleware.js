export const requireRole = (...allowedRoleIds) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'No autenticado'
      });
    }

    if (!Number.isInteger(req.user.id_rol)) {
      return res.status(403).json({
        status: 'error',
        message: 'Rol de usuario no válido'
      });
    }

    if (!allowedRoleIds.includes(req.user.id_rol)) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
};