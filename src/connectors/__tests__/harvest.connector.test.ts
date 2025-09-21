import axios from 'axios';
import { HarvestConnector, HarvestRetryError } from '../harvest.connector';

jest.mock('axios');

describe('HarvestConnector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      HARVEST_ACCESS_TOKEN: 'token',
      HARVEST_ACCOUNT_ID: 'account',
    };
    (axios.isAxiosError as jest.Mock).mockImplementation((error: unknown) => {
      return Boolean((error as any)?.isAxiosError);
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('testConnection returns true on success', async () => {
    const getMock = jest.fn().mockResolvedValue({ data: {} });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HarvestConnector();
    await expect(connector.testConnection()).resolves.toBe(true);
    expect(getMock).toHaveBeenCalledWith('/company');
  });

  it('throws an error when HARVEST_ACCESS_TOKEN is missing', () => {
    delete process.env.HARVEST_ACCESS_TOKEN;
    expect(() => new HarvestConnector()).toThrow('HARVEST_ACCESS_TOKEN is not set');
  });

  it('throws an error when HARVEST_ACCOUNT_ID is missing', () => {
    delete process.env.HARVEST_ACCOUNT_ID;
    expect(() => new HarvestConnector()).toThrow('HARVEST_ACCOUNT_ID is not set');
  });

  describe('getTimeEntries', () => {
    const baseResponse = {
      data: { time_entries: [], next_page: null },
    };

    const createAxiosRateError = (status: number, headers: Record<string, string> = {}) => ({
      isAxiosError: true,
      response: { status, headers },
      toJSON: () => ({}),
    });

    it('retries when rate limited and respects Retry-After header', async () => {
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const getMock = jest
        .fn()
        .mockRejectedValueOnce(createAxiosRateError(429, { 'retry-after': '3' }))
        .mockResolvedValue(baseResponse);

      (axios.create as jest.Mock).mockReturnValue({ get: getMock });

      const connector = new HarvestConnector();

      const promise = connector.getTimeEntries(new Date('2024-01-01'), new Date('2024-01-02'));

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(3000);

      const result = await promise;
      const delays = setTimeoutSpy.mock.calls.map(([, delay]) => delay);

      expect(result.entries).toHaveLength(0);
      expect(result.retry.attempts).toBe(2);
      expect(result.retry.totalDelayMs).toBe(3000);
      expect(result.retry.lastStatusCode).toBe(429);
      expect(delays).toEqual([3000]);

      setTimeoutSpy.mockRestore();
    });

    it('applies capped exponential backoff for repeated failures', async () => {
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const getMock = jest
        .fn()
        .mockRejectedValueOnce(createAxiosRateError(503))
        .mockRejectedValueOnce(createAxiosRateError(503))
        .mockResolvedValue(baseResponse);

      (axios.create as jest.Mock).mockReturnValue({ get: getMock });

      const connector = new HarvestConnector();

      const promise = connector.getTimeEntries(
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        undefined,
        undefined,
        { baseDelayMs: 100, maxDelayMs: 150, maxAttempts: 4 }
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(150);

      const result = await promise;
      const delays = setTimeoutSpy.mock.calls.map(([, delay]) => delay);

      expect(result.retry.attempts).toBe(3);
      expect(result.retry.totalDelayMs).toBe(250);
      expect(result.retry.lastDelayMs).toBe(150);
      expect(result.retry.lastStatusCode).toBe(503);
      expect(delays).toEqual([100, 150]);

      setTimeoutSpy.mockRestore();
    });

    it('throws HarvestRetryError when retry attempts are exhausted', async () => {
      jest.useFakeTimers();

      const getMock = jest.fn().mockRejectedValue(createAxiosRateError(503));
      (axios.create as jest.Mock).mockReturnValue({ get: getMock });

      const connector = new HarvestConnector();

      const promise = connector.getTimeEntries(
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        undefined,
        undefined,
        { maxAttempts: 1, baseDelayMs: 100 }
      );

      await expect(promise).rejects.toBeInstanceOf(HarvestRetryError);
    });
  });
});

