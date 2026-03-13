import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().optional(),
  avatar: z.string().url().optional(),
});

// Get public user profile
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, avatar: true, bio: true,
        createdAt: true, timezone: true,
        skillsOffered: {
          where: { isActive: true },
          include: { _count: { select: { sessions: true } } },
        },
        reviewsReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, avatar: true } } },
        },
        _count: {
          select: { sessionsAsTeacher: true, reviewsReceived: true },
        },
      },
    });
    if (!user) throw new AppError('User not found', 404);

    const avgRating = await prisma.review.aggregate({
      where: { targetId: req.params.id },
      _avg: { rating: true },
    });

    res.json({ success: true, data: { user: { ...user, avgRating: avgRating._avg.rating || 0 } } });
  } catch (e) { next(e); }
});

// Update own profile
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: { id: true, name: true, email: true, avatar: true, bio: true, timezone: true, credits: true },
    });
    res.json({ success: true, data: { user } });
  } catch (e) { next(e); }
});

// Get availability
router.get('/:id/availability', async (req, res, next) => {
  try {
    const availability = await prisma.availability.findMany({
      where: { userId: req.params.id, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json({ success: true, data: { availability } });
  } catch (e) { next(e); }
});

// Set availability
router.post('/me/availability', authenticate, async (req, res, next) => {
  try {
    const { slots } = req.body;
    await prisma.availability.deleteMany({ where: { userId: req.user!.id } });
    const availability = await prisma.availability.createMany({
      data: slots.map((s: any) => ({ ...s, userId: req.user!.id })),
    });
    res.json({ success: true, data: { availability } });
  } catch (e) { next(e); }
});

// Report user
router.post('/:id/report', authenticate, async (req, res, next) => {
  try {
    const { reason, description } = req.body;
    if (req.params.id === req.user!.id) throw new AppError('Cannot report yourself', 400);
    const report = await prisma.report.create({
      data: { reason, description, reportedById: req.user!.id, reportedUserId: req.params.id },
    });
    res.status(201).json({ success: true, data: { report } });
  } catch (e) { next(e); }
});

export default router;
