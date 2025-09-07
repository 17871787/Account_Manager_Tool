import axios from 'axios';
import { HubSpotConnector } from '../hubspot.connector';

jest.mock('axios');

describe('HubSpotConnector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, HUBSPOT_API_KEY: 'apiKey' };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  it('testConnection returns true on success', async () => {
    const getMock = jest.fn().mockResolvedValue({ data: { results: [] } });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HubSpotConnector();
    await expect(connector.testConnection()).resolves.toBe(true);
    expect(getMock).toHaveBeenCalledWith('/crm/v3/objects/companies', { params: { limit: 1 } });
  });

  it('throws an error when HUBSPOT_API_KEY is missing', () => {
    delete process.env.HUBSPOT_API_KEY;
    expect(() => new HubSpotConnector()).toThrow('HUBSPOT_API_KEY is not set');
  });
});

