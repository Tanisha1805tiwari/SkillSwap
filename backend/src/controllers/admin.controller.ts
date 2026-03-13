import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * GET /api/admin/stats
 * Dashboard statistics
 */
export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersThisWeek,
      totalSessions,
      activeSessions,
      completedSessions,
      totalCreditsTransferred,
      avgSessionDuration,
      activeRooms,
      pendingReports,
      topSkills,
      recentUsers,
      sessionsByDay,
    ] = await prisma.$transaction([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.session.count(),
      prisma.session.count({ where: { status: 'ACTIVE' } }),
      prisma.session.count({ where: { status: 'COMPLETED' } }),
      prisma.creditTransaction.aggregate({
        where: { type: 'SESSION_SPENT', createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      prisma.session.aggregate({
        where: { status: 'COMPLETED', durationSecs: { not: null } },
        _avg: { durationSecs: true },
      }),
      prisma.videoRoom.count({ where: { status: 'ACTIVE' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.skill.findMany({
        where: { isActive: true },
        orderBy: { sessionsCount: 'desc' },
        take: 10,
        select: { id: true, title: true, category: true, sessionsCount: true, rating: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, email: true, avatar: true, credits: true, createdAt: true, role: true },
      }),
      // Sessions grouped by day for last 30 days
      prisma.$queryRaw<{ day: string; count: number }[]>`
        SELECT DATE_TRUNC('day', "scheduledAt") as day, COUNT(*) as count
        FROM sessions
        WHERE "scheduledAt" >= ${thirtyDaysAgo}
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          newUsersThisWeek,
          totalSessions,
          activeSessions,
          completedSessions,
          activeRooms,
          pendingReports,
          creditsTransferred: Math.abs(totalCreditsTransferred._sum.amount || 0),
          avgSessionDurationMins: Math.round((avgSessionDuration._avg.durationSecs || 0) / 60),
        },
        topSkills,
        recentUsers,
        sessionsByDay,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', q, status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: 'insensitive' } },
        { email: { contains: q as string, mode: 'insensitive' } },
      ];
    }
    if (status === 'banned') where.isBanned = true;
    if (status === 'active') where.isActive = true, where.isBanned = false;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, avatar: true,
          role: true, credits: true, isActive: true, isBanned: true,
          createdAt: true,
          _count: { select: { sessionsAsTeacher: true, sessionsAsLearner: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:id/ban
 */
export const banUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ban = true } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isBanned: ban },
      select: { id: true, name: true, isBanned: true },
    });
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports
 */
export const getReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        reportedUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ success: true, data: { reports } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/reports/:id
 */
export const updateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, resolution } = req.body;
    if (!['REVIEWING', 'RESOLVED', 'DISMISSED'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status, resolution },
    });

    res.json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
};
