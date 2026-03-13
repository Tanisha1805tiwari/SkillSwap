import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { getStats, getUsers, banUser, getReports, updateReport } from '../controllers/admin.controller';

const router = Router();
router.use(authenticate, requireRole('ADMIN', 'MODERATOR'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:id/ban', requireRole('ADMIN'), banUser);
router.get('/reports', getReports);
router.patch('/reports/:id', updateReport);

export default router;
