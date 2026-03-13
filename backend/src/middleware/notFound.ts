import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
};
