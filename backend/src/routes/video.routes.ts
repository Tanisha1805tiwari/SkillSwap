import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { getRoomAccess, getActiveRooms } from '../controllers/video.controller';

const router = Router();

router.use(authenticate);
router.get('/room/:sessionId', getRoomAccess);
router.get('/active', requireRole('ADMIN'), getActiveRooms);

export default router;
