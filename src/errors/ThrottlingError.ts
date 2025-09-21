export class ThrottlingError extends Error {
  public readonly statusCode: number;
  public readonly retryAfterMs?: number;

  constructor(message: string, statusCode = 429, retryAfterMs?: number) {
    super(message);
    this.name = 'ThrottlingError';
    this.statusCode = statusCode;
    this.retryAfterMs = retryAfterMs;
  }
}
