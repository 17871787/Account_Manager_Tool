import * as Sentry from '@sentry/nextjs';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

export const sentryErrorMiddleware = (
  err: AppError,
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  Sentry.withScope((scope) => {
    scope.setContext('request', {
      url: req.url,
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });
    Sentry.captureException(err);
  });
  next(err);
};

// Helper to capture exceptions with additional context
export const captureException = (
  error: Error | unknown,
  context?: Record<string, unknown>
) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
};

// Helper to capture messages with level
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureMessage(message, level);
  });
};

// Helper to track API performance
export const trackAPIPerformance = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  return Sentry.startSpan({ op: 'api', name: operation }, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: 1 });
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: 'internal_error' });
      throw error;
    }
  });
};

// Helper to add user context
export const setUserContext = (user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    segment: user.role,
  });
};

// Helper to add breadcrumbs
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, unknown>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
};
