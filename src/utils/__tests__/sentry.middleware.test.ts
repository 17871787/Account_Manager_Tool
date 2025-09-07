import { sentryErrorMiddleware } from '../sentry';
import type { AppError } from '../../types';

const captureException = jest.fn();
const withScope = jest.fn((callback: unknown) =>
  (callback as (scope: { setContext: jest.Mock }) => void)({ setContext: jest.fn() })
);

jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  withScope: (...args: unknown[]) => withScope(...args),
}));

describe('sentryErrorMiddleware', () => {
  const req: any = {
    url: '/test',
    method: 'GET',
    headers: {},
    query: {},
    body: {},
  };
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {},
  };

  const finalHandler = (err: AppError) => {
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      timestamp: new Date(),
      errorId: res.locals.sentryId,
    });
  };

  beforeEach(() => {
    captureException.mockClear();
    withScope.mockClear();
    res.status.mockClear();
    res.json.mockClear();
  });

  it('returns provided status code', () => {
    const error = new Error('fail') as AppError;
    error.status = 418;

    sentryErrorMiddleware(error, req, res, (err) => finalHandler(err));

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'fail' })
    );
  });

  it('defaults to 500 and captures error', () => {
    const error = new Error('boom') as AppError;

    sentryErrorMiddleware(error, req, res, (err) => finalHandler(err));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(captureException).toHaveBeenCalledWith(error);
  });
});

