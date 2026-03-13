import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { prisma } from '../lib/prisma';
import { AppError } from './errorHandler';

// Extend Express Request with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & { id: string };
    }
  }
}

/**
 * Authenticate JWT token from Authorization header or cookie
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Extract from Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    // Fallback to HTTP-only cookie
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true, isBanned: true },
    });

    if (!user) throw new AppError('User not found', 401);
    if (!user.isActive) throw new AppError('Account deactivated', 403);
    if (user.isBanned) throw new AppError('Account suspended', 403);

    req.user = { ...payload, id: payload.userId };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

/**
 * Require specific role(s)
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }
    next();
  };
};

/**
 * Optional authentication — sets req.user if valid token present
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      req.user = { ...payload, id: payload.userId };
    }
  } catch {
    // Silently ignore auth errors for optional routes
  }
  next();
};
