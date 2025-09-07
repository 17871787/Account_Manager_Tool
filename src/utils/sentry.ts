import * as Sentry from '@sentry/nextjs';

// Helper to capture exceptions with additional context
export const captureException = (
  error: Error | unknown,
  context?: Record<string, any>
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
  context?: Record<string, any>
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
  return Sentry.startSpan({ name: operation, op: 'api' }, async () => {
    return fn();
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
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
};