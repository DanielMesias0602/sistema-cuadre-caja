import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, getAuthenticatedUser } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Demasiados intentos, intente más tarde'
  }
});

router.post('/login', loginRateLimit, login);
router.get('/me', requireAuth, getAuthenticatedUser);

export default router;