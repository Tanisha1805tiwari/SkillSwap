import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  getSessions, createSession, getSession,
  startSession, endSession, cancelSession,
} from '../controllers/session.controller';

const router = Router();

router.use(authenticate);
router.get('/', getSessions);
router.post('/', createSession);
router.get('/:id', getSession);
router.post('/:id/start', startSession);
router.post('/:id/end', endSession);
router.patch('/:id/cancel', cancelSession);

export default router;
