import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const createSessionSchema = z.object({
  skillId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
  creditAmount: z.number().int().min(1).max(10).default(1),
});

const MIN_SESSION_SECS_FOR_CREDITS = 300; // 5 minutes

/**
 * GET /api/sessions
 * List user sessions (as teacher or learner)
 */
export const getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      OR: [
        { teacherId: req.user!.id },
        { learnerId: req.user!.id },
      ],
    };

    if (role === 'teacher') delete where.OR, where.teacherId = req.user!.id;
    if (role === 'learner') delete where.OR, where.learnerId = req.user!.id;
    if (status) where.status = status;

    const [sessions, total] = await prisma.$transaction([
      prisma.session.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { scheduledAt: 'desc' },
        include: {
          teacher: { select: { id: true, name: true, avatar: true } },
          learner: { select: { id: true, name: true, avatar: true } },
          skill: { select: { id: true, title: true, category: true } },
          videoRoom: { select: { id: true, roomToken: true, status: true } },
          review: { select: { id: true, rating: true, comment: true } },
        },
      }),
      prisma.session.count({ where }),
    ]);

    res.json({
      success: true,
      data: { sessions, total, page: parseInt(page as string), limit: parseInt(limit as string) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sessions
 * Book a new session
 */
export const createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createSessionSchema.parse(req.body);

    const skill = await prisma.skill.findUnique({
      where: { id: data.skillId },
      include: { teacher: { select: { id: true, credits: true } } },
    });

    if (!skill) throw new AppError('Skill not found', 404);
    if (!skill.isActive) throw new AppError('Skill is not available', 400);
    if (skill.teacherId === req.user!.id) throw new AppError('Cannot book your own skill', 400);

    // Check learner has enough credits
    const learner = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { credits: true },
    });

    if (!learner || learner.credits < data.creditAmount) {
      throw new AppError('Insufficient credits', 400);
    }

    // Check for scheduling conflicts
    const scheduledDate = new Date(data.scheduledAt);
    const conflictWindow = new Date(scheduledDate.getTime() - 60 * 60 * 1000); // 1 hour before

    const conflict = await prisma.session.findFirst({
      where: {
        OR: [{ teacherId: skill.teacherId }, { learnerId: req.user!.id }],
        scheduledAt: { gte: conflictWindow, lte: new Date(scheduledDate.getTime() + 60 * 60 * 1000) },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (conflict) throw new AppError('Scheduling conflict detected', 409);

    // Create video room
    const videoRoom = await prisma.videoRoom.create({
      data: {
        roomToken: uuidv4(),
        maxParticipants: 2,
      },
    });

    const session = await prisma.session.create({
      data: {
        title: `${skill.title} Session`,
        teacherId: skill.teacherId,
        learnerId: req.user!.id,
        skillId: data.skillId,
        scheduledAt: scheduledDate,
        notes: data.notes,
        creditAmount: data.creditAmount,
        videoRoomId: videoRoom.id,
        status: 'CONFIRMED',
      },
      include: {
        teacher: { select: { id: true, name: true, avatar: true, email: true } },
        learner: { select: { id: true, name: true, avatar: true } },
        skill: { select: { id: true, title: true, category: true } },
        videoRoom: { select: { id: true, roomToken: true } },
      },
    });

    // Create notification for teacher
    await prisma.notification.create({
      data: {
        userId: skill.teacherId,
        type: 'SESSION_BOOKED',
        title: 'New Session Booked!',
        body: `${session.learner.name} booked a session for ${skill.title}`,
        data: { sessionId: session.id },
      },
    });

    logger.info(`Session created: ${session.id}`);

    res.status(201).json({ success: true, data: { session } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sessions/:id
 */
export const getSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: { select: { id: true, name: true, avatar: true, bio: true } },
        learner: { select: { id: true, name: true, avatar: true } },
        skill: true,
        videoRoom: true,
        review: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    if (!session) throw new AppError('Session not found', 404);

    // Only participants can view session details
    if (session.teacherId !== req.user!.id && session.learnerId !== req.user!.id && req.user!.role === 'USER') {
      throw new AppError('Access denied', 403);
    }

    res.json({ success: true, data: { session } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sessions/:id/start
 * Mark session as active and record start time
 */
export const startSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { videoRoom: true },
    });

    if (!session) throw new AppError('Session not found', 404);
    if (session.teacherId !== req.user!.id && session.learnerId !== req.user!.id) {
      throw new AppError('Access denied', 403);
    }
    if (session.status !== 'CONFIRMED') {
      throw new AppError(`Cannot start session with status ${session.status}`, 400);
    }

    const [updatedSession] = await prisma.$transaction([
      prisma.session.update({
        where: { id: session.id },
        data: { status: 'ACTIVE', startedAt: new Date() },
      }),
      prisma.videoRoom.update({
        where: { id: session.videoRoomId! },
        data: { status: 'ACTIVE', startedAt: new Date() },
      }),
    ]);

    res.json({ success: true, data: { session: updatedSession } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sessions/:id/end
 * End session and process credit transfer
 */
export const endSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: { select: { id: true, credits: true } },
        learner: { select: { id: true, credits: true } },
      },
    });

    if (!session) throw new AppError('Session not found', 404);
    if (session.teacherId !== req.user!.id && session.learnerId !== req.user!.id) {
      throw new AppError('Access denied', 403);
    }
    if (session.status !== 'ACTIVE') {
      throw new AppError('Session is not active', 400);
    }

    const endedAt = new Date();
    const durationSecs = session.startedAt
      ? Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : 0;

    const shouldTransferCredits = durationSecs >= MIN_SESSION_SECS_FOR_CREDITS;

    // Build atomic transaction
    const txOps: any[] = [
      prisma.session.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          endedAt,
          durationSecs,
        },
      }),
      prisma.videoRoom.updateMany({
        where: { id: session.videoRoomId || '' },
        data: { status: 'ENDED', endedAt },
      }),
    ];

    if (shouldTransferCredits) {
      txOps.push(
        // Deduct from learner
        prisma.user.update({
          where: { id: session.learnerId },
          data: { credits: { decrement: session.creditAmount } },
        }),
        // Add to teacher
        prisma.user.update({
          where: { id: session.teacherId },
          data: { credits: { increment: session.creditAmount } },
        }),
        // Credit transaction records
        prisma.creditTransaction.create({
          data: {
            userId: session.learnerId,
            sessionId: session.id,
            amount: -session.creditAmount,
            type: 'SESSION_SPENT',
            description: `Session payment`,
          },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: session.teacherId,
            sessionId: session.id,
            amount: session.creditAmount,
            type: 'SESSION_EARNED',
            description: `Teaching payment`,
          },
        }),
        // Update skill stats
        prisma.skill.update({
          where: { id: session.skillId },
          data: { sessionsCount: { increment: 1 } },
        })
      );
    }

    await prisma.$transaction(txOps);

    logger.info(`Session ${session.id} ended. Duration: ${durationSecs}s. Credits transferred: ${shouldTransferCredits}`);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        durationSecs,
        creditsTransferred: shouldTransferCredits ? session.creditAmount : 0,
        message: shouldTransferCredits
          ? `${session.creditAmount} credits transferred`
          : 'Session too short for credit transfer',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/sessions/:id/cancel
 */
export const cancelSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = req.body;
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });

    if (!session) throw new AppError('Session not found', 404);
    if (session.teacherId !== req.user!.id && session.learnerId !== req.user!.id) {
      throw new AppError('Access denied', 403);
    }
    if (!['PENDING', 'CONFIRMED'].includes(session.status)) {
      throw new AppError('Session cannot be cancelled', 400);
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { status: 'CANCELLED', cancelReason: reason },
    });

    res.json({ success: true, message: 'Session cancelled' });
  } catch (error) {
    next(error);
  }
};
