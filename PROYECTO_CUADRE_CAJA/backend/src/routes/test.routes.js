import { Router } from 'express';

import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.get(
  '/admin',
  requireAuth,
  requireRole(1),
  (req, res) => {
    res.json({
      status: 'ok',
      message: 'Acceso autorizado por rol',
      data: {
        id_usuario: req.user.id_usuario,
        id_rol: req.user.id_rol,
        usuario: req.user.usuario
      }
    });
  }
);

export default router;