import { Router } from 'express';

import {
  getAll,
  getById
} from '../controllers/medioPago.controller.js';

import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getAll);
router.get('/:id', getById);

export default router;