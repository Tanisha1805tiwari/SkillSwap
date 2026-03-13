import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const createSkillSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  category: z.string().min(2).max(50),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  tags: z.array(z.string()).max(10).default([]),
});

const SKILL_CATEGORIES = [
  'Programming', 'Design', 'Music', 'Language', 'Business',
  'Marketing', 'Photography', 'Writing', 'Cooking', 'Fitness',
  'Mathematics', 'Science', 'Art', 'Finance', 'Other'
];

/**
 * GET /api/skills
 * Search and list skills with filtering
 */
export const getSkills = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      q, category, level, page = '1', limit = '12', sort = 'createdAt'
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { isActive: true };

    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
        { tags: { has: q as string } },
      ];
    }
    if (category) where.category = category;
    if (level) where.level = level;

    // Exclude current user's skills
    if (req.user) {
      where.NOT = { teacherId: req.user.id };
    }

    const orderBy: any = {};
    if (sort === 'rating') orderBy.rating = 'desc';
    else if (sort === 'sessions') orderBy.sessionsCount = 'desc';
    else orderBy.createdAt = 'desc';

    const [skills, total] = await prisma.$transaction([
      prisma.skill.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy,
        include: {
          teacher: {
            select: { id: true, name: true, avatar: true, bio: true },
          },
          _count: { select: { sessions: true } },
        },
      }),
      prisma.skill.count({ where }),
    ]);

    res.json({
      success: true,
      data: { skills, total, categories: SKILL_CATEGORIES },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/skills
 * Create a skill listing
 */
export const createSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createSkillSchema.parse(req.body);

    // Limit to 10 active skills per user
    const count = await prisma.skill.count({
      where: { teacherId: req.user!.id, isActive: true },
    });
    if (count >= 10) throw new AppError('Maximum 10 active skills allowed', 400);

    const skill = await prisma.skill.create({
      data: { ...data, teacherId: req.user!.id },
      include: { teacher: { select: { id: true, name: true, avatar: true } } },
    });

    res.status(201).json({ success: true, data: { skill } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/skills/:id
 */
export const getSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
            createdAt: true,
            _count: { select: { sessionsAsTeacher: true, reviewsReceived: true } },
          },
        },
        sessions: {
          where: { status: 'COMPLETED' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            review: { select: { rating: true, comment: true } },
            learner: { select: { name: true, avatar: true } },
          },
        },
      },
    });

    if (!skill) throw new AppError('Skill not found', 404);

    res.json({ success: true, data: { skill } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/skills/:id
 */
export const updateSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createSkillSchema.partial().parse(req.body);

    const skill = await prisma.skill.findUnique({ where: { id: req.params.id } });
    if (!skill) throw new AppError('Skill not found', 404);
    if (skill.teacherId !== req.user!.id) throw new AppError('Not authorized', 403);

    const updated = await prisma.skill.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: { skill: updated } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/skills/:id
 */
export const deleteSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const skill = await prisma.skill.findUnique({ where: { id: req.params.id } });
    if (!skill) throw new AppError('Skill not found', 404);
    if (skill.teacherId !== req.user!.id && req.user!.role === 'USER') {
      throw new AppError('Not authorized', 403);
    }

    await prisma.skill.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Skill removed' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/skills/match/:userId
 * Smart matching - find skills user wants vs what they offer
 */
export const getMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get skills the user offers
    const mySkills = await prisma.skill.findMany({
      where: { teacherId: userId, isActive: true },
      select: { category: true, tags: true },
    });

    const myCategories = [...new Set(mySkills.flatMap(s => [s.category]))];
    const myTags = [...new Set(mySkills.flatMap(s => s.tags))];

    // Find users who want skills the user teaches,
    // and also teach skills the user might want
    const matches = await prisma.skill.findMany({
      where: {
        isActive: true,
        NOT: { teacherId: userId },
        OR: [
          { category: { in: myCategories } },
          { tags: { hasSome: myTags } },
        ],
      },
      take: 20,
      orderBy: { sessionsCount: 'desc' },
      include: {
        teacher: { select: { id: true, name: true, avatar: true, bio: true } },
      },
    });

    res.json({ success: true, data: { matches } });
  } catch (error) {
    next(error);
  }
};
