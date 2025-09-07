import axios from 'axios';
import { SFTConnector } from '../sft.connector';

jest.mock('axios');

describe('SFTConnector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MS_TENANT_ID: 'tenant',
      MS_CLIENT_ID: 'client',
      MS_CLIENT_SECRET: 'secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  it('getRecognisedRevenue returns mock data after authentication', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { access_token: 'token' } });

    const connector = new SFTConnector();
    const result = await connector.getRecognisedRevenue('Client', 'Project', '2023-01');

    expect(axios.post).toHaveBeenCalled();
    expect(result).toEqual({
      client: 'Client',
      project: 'Project',
      month: '2023-01',
      recognisedRevenue: 0,
    });
  });

  it('throws an error when MS_CLIENT_ID is missing', () => {
    delete process.env.MS_CLIENT_ID;
    expect(() => new SFTConnector()).toThrow('MS_CLIENT_ID is not set');
  });
});

