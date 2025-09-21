import axios from 'axios';
import { ThrottlingError } from '../errors/ThrottlingError';

export interface RetryOptions {
  context?: string;
  maxAttempts?: number;
  baseDelayMs?: number;
}

function parseRetryAfter(header: string | string[] | undefined): number | undefined {
  if (!header) {
    return undefined;
  }

  const value = Array.isArray(header) ? header[0] : header;
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric * 1000;
  }

  const dateTime = Date.parse(value);
  if (!Number.isNaN(dateTime)) {
    return Math.max(dateTime - Date.now(), 0);
  }

  return undefined;
}

function getConfigValue(envKey: string, fallback: number): number {
  const value = Number(process.env[envKey]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  { context, maxAttempts, baseDelayMs }: RetryOptions = {}
): Promise<T> {
  const attempts = maxAttempts ?? getConfigValue('CONNECTOR_MAX_RETRIES', 3);
  const delay = baseDelayMs ?? getConfigValue('CONNECTOR_RETRY_BASE_DELAY_MS', 500);

  let attempt = 0;
  let lastError: unknown;

  while (attempt < attempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempt += 1;

      const isAxiosErr = axios.isAxiosError(error);
      const status = isAxiosErr ? error.response?.status : undefined;
      const shouldRetry = status === 429 || (status !== undefined && status >= 500);

      if (!shouldRetry || attempt >= attempts) {
        break;
      }

      const retryAfter = parseRetryAfter(
        isAxiosErr ? error.response?.headers?.['retry-after'] : undefined
      );
      const delayMs = retryAfter ?? delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (axios.isAxiosError(lastError)) {
    const status = lastError.response?.status;
    const retryAfter = parseRetryAfter(lastError.response?.headers?.['retry-after']);
    if (status === 429) {
      throw new ThrottlingError(
        context ? `${context} rate limit exceeded` : 'Rate limit exceeded',
        429,
        retryAfter
      );
    }
    if (status && status >= 500) {
      throw new ThrottlingError(
        context ? `${context} temporarily unavailable` : 'Service temporarily unavailable',
        status,
        retryAfter
      );
    }
  }

  throw lastError ?? new Error(context ? `${context} failed` : 'Operation failed');
}
