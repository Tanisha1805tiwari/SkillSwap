import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
});

// Create review after session
router.post('/session/:sessionId', async (req, res, next) => {
  try {
    const data = reviewSchema.parse(req.body);
    const session = await prisma.session.findUnique({ where: { id: req.params.sessionId } });
    if (!session) throw new AppError('Session not found', 404);
    if (session.status !== 'COMPLETED') throw new AppError('Session not completed', 400);
    if (session.learnerId !== req.user!.id) throw new AppError('Only learner can review', 403);

    const existing = await prisma.review.findUnique({ where: { sessionId: session.id } });
    if (existing) throw new AppError('Already reviewed', 409);

    const review = await prisma.review.create({
      data: { ...data, sessionId: session.id, authorId: req.user!.id, targetId: session.teacherId },
    });

    // Update teacher's average rating
    const avg = await prisma.review.aggregate({
      where: { targetId: session.teacherId },
      _avg: { rating: true },
    });
    await prisma.skill.updateMany({
      where: { teacherId: session.teacherId },
      data: { rating: avg._avg.rating || 0 },
    });

    res.status(201).json({ success: true, data: { review } });
  } catch (e) { next(e); }
});

// Get reviews for a user
router.get('/user/:userId', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { targetId: req.params.userId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    res.json({ success: true, data: { reviews } });
  } catch (e) { next(e); }
});

export default router;
