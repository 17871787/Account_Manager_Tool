import axios from 'axios';
import { HarvestConnector } from '../harvest.connector';

jest.mock('axios');

describe('HarvestConnector', () => {
  it('testConnection returns true on success', async () => {
    const getMock = jest.fn().mockResolvedValue({ data: {} });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HarvestConnector();
    await expect(connector.testConnection()).resolves.toBe(true);
    expect(getMock).toHaveBeenCalledWith('/company');
  });
});

