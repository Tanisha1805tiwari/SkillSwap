import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [transactions, total, balance] = await prisma.$transaction([
      prisma.creditTransaction.findMany({
        where: { userId: req.user!.id },
        skip, take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: { session: { select: { id: true, title: true } } },
      }),
      prisma.creditTransaction.count({ where: { userId: req.user!.id } }),
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { credits: true } }),
    ]);
    res.json({ success: true, data: { transactions, total, balance: balance?.credits ?? 0 } });
  } catch (e) { next(e); }
});

export default router;
