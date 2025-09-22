import { Request, Response, NextFunction } from 'express';
import { checkRateLimit, SESSION_COOKIE_NAME, verifySessionToken } from './auth';

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  /**
   * Optional prefix to namespace identifiers so multiple limiters
   * do not interfere with each other.
   */
  scope?: string;
  keyGenerator?: (req: Request) => string | null;
}

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_MS = 60_000;

function getForwardedAddress(header: string | string[] | undefined): string | null {
  if (!header) {
    return null;
  }
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) {
    return null;
  }
  return value.split(',')[0]?.trim() ?? null;
}

function defaultKeyGenerator(req: Request): string | null {
  return (
    getForwardedAddress(req.headers['x-forwarded-for']) ||
    req.ip ||
    req.socket.remoteAddress ||
    null
  );
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) {
    return undefined;
  }

  const cookies = header.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.split('=');
    if (rawName?.trim() === name) {
      return rest.join('=').trim();
    }
  }
  return undefined;
}

function getSessionToken(req: Request): string | undefined {
  const fromCookieParser = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE_NAME];
  if (fromCookieParser) {
    return fromCookieParser;
  }
  return parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
}

export function requireExpressAuth(req: Request, res: Response, next: NextFunction): void {
  const sessionToken = getSessionToken(req);

  verifySessionToken(sessionToken)
    .then((payload) => {
      if (payload) {
        next();
        return;
      }

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authentication required to access this endpoint',
      });
    })
    .catch((error) => {
      console.error('Failed to verify session token', error);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authentication required to access this endpoint',
      });
    });
}

export function createRateLimitMiddleware(options: RateLimitOptions = {}) {
  const {
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
    scope,
    keyGenerator = defaultKeyGenerator,
  } = options;

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const key = keyGenerator(req);
    if (!key) {
      next();
      return;
    }

    const identifier = scope ? `${scope}:${key}` : key;
    const allowed = checkRateLimit(identifier, limit, windowMs);
    if (allowed) {
      next();
      return;
    }

    res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  };
}

export function getClientIdentifier(req: Request): string {
  return defaultKeyGenerator(req) ?? 'unknown';
}
