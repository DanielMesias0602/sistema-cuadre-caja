import { Router } from 'express';
import { login, getAuthenticatedUser } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', requireAuth, getAuthenticatedUser);

export default router;