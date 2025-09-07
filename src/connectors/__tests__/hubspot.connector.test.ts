import axios from 'axios';
import { HubSpotConnector } from '../hubspot.connector';

jest.mock('axios');

describe('HubSpotConnector', () => {
  it('testConnection returns true on success', async () => {
    const getMock = jest.fn().mockResolvedValue({ data: { results: [] } });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HubSpotConnector();
    await expect(connector.testConnection()).resolves.toBe(true);
    expect(getMock).toHaveBeenCalledWith('/crm/v3/objects/companies', { params: { limit: 1 } });
  });
});

