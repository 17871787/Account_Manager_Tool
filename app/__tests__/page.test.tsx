import { render, screen, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import Page from '../page';

jest.mock('recharts', () => {
  const MockComponent = ({ children }: any) => <div>{children}</div>;

  return {
    ResponsiveContainer: MockComponent,
    LineChart: MockComponent,
    Line: () => <div />,
    BarChart: MockComponent,
    Bar: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    PieChart: MockComponent,
    Pie: MockComponent,
    Cell: () => <div />,
    AreaChart: MockComponent,
    Area: () => <div />,
  };
});

// Mock the real API service used by the dashboard
jest.mock('../../src/services/api.service', () => ({
  apiService: {
    getPortfolioProfitability: jest.fn().mockResolvedValue([
      {
        client: 'Client A',
        project: 'Project Alpha',
        recognisedRevenue: 120000,
        billableCost: 75000,
        exclusionCost: 5000,
        margin: 40000,
        marginPercentage: 33.3,
        exceptionsCount: 2,
      },
    ]),
    getPendingExceptions: jest.fn().mockResolvedValue([
      {
        id: 'ex-1',
        type: 'billing_issue',
        severity: 'medium',
        description: 'Billing discrepancy detected',
        suggestedAction: 'Review billing entries',
        entityLabel: 'Project Alpha',
      },
    ]),
    getHarvestTimeEntries: jest.fn().mockResolvedValue({
      time_entries: [
        {
          spent_date: '2024-05-01',
          hours: 6,
          billable: true,
          billable_rate: 150,
          cost_rate: 80,
        },
        {
          spent_date: '2024-05-02',
          hours: 4,
          billable: false,
          billable_rate: 150,
          cost_rate: 80,
        },
      ],
    }),
    syncHarvest: jest.fn().mockResolvedValue({ status: 'queued' }),
    syncHubSpot: jest.fn().mockResolvedValue({ status: 'queued' }),
  },
}));

describe('Dashboard Page', () => {
  it('renders heading', async () => {
    render(
      <Theme>
        <Page />
      </Theme>
    );

    // Wait for the content to load
    await waitFor(() => {
      expect(screen.getByText('AM Copilot Dashboard')).toBeTruthy();
    });
  });
});
