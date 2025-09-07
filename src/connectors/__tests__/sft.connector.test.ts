import axios from 'axios';
import { SFTConnector } from '../sft.connector';

jest.mock('axios');

describe('SFTConnector', () => {
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
});

