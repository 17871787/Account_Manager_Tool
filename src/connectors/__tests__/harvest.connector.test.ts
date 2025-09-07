import axios from 'axios';
import { HarvestConnector } from '../harvest.connector';

jest.mock('axios');

describe('HarvestConnector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      HARVEST_ACCESS_TOKEN: 'token',
      HARVEST_ACCOUNT_ID: 'account',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
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
});

