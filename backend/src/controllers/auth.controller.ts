import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /api/auth/register
 * Create new user account with 5 free credits
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        credits: 5,
        creditTransactions: {
          create: {
            amount: 5,
            type: 'SIGNUP_BONUS',
            description: 'Welcome bonus credits',
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        credits: true,
        createdAt: true,
      },
    });

    logger.info(`New user registered: ${user.email}`);

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, accessToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        credits: true,
        passwordHash: true,
        isActive: true,
        isBanned: true,
      },
    });

    if (!user || !user.passwordHash) throw new AppError('Invalid credentials', 401);
    if (!user.isActive) throw new AppError('Account deactivated', 403);
    if (user.isBanned) throw new AppError('Account suspended', 403);

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: { user: userWithoutPassword, accessToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/google
 * Google OAuth sign-in / sign-up
 */
export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError('Google token required', 400);

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) throw new AppError('Invalid Google token', 400);

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
    });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub, emailVerified: true },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          avatar: payload.picture,
          googleId: payload.sub,
          emailVerified: true,
          credits: 5,
          creditTransactions: {
            create: {
              amount: 5,
              type: 'SIGNUP_BONUS',
              description: 'Welcome bonus credits',
            },
          },
        },
      });
      logger.info(`New Google user registered: ${user.email}`);
    }

    if (user.isBanned) throw new AppError('Account suspended', 403);

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          credits: user.credits,
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Exchange refresh token for new access token
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw new AppError('Refresh token required', 401);

    const payload = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true, isBanned: true },
    });

    if (!user || !user.isActive || user.isBanned) {
      throw new AppError('Invalid session', 401);
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        timezone: true,
        role: true,
        credits: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            skillsOffered: true,
            sessionsAsTeacher: true,
            sessionsAsLearner: true,
            reviewsReceived: true,
          },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};
