import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logFormat = process.env.NODE_ENV === 'production'
  ? combine(timestamp(), errors({ stack: true }), json())
  : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), simple());

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'skillswap-api' },
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
      }),
    ] : []),
  ],
});
