import { Express, Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { sentryErrorMiddleware } from '../utils/sentry';

export const setupErrorHandlers = (app: Express): void => {
  app.use(sentryErrorMiddleware);

  app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);

    res.status(err.status ?? 500).json({
      error: err.message || 'Internal server error',
      timestamp: new Date(),
      errorId: res.locals.sentryId,
    });
  });
};

