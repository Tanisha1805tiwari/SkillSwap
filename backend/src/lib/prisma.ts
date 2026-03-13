import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
      : ['warn', 'error'],
    errorFormat: 'pretty',
  });
};

export const prisma: PrismaClient = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;
  // Log slow queries in development
  (prisma as any).$on('query', (e: any) => {
    if (e.duration > 100) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}
