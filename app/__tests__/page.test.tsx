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

// Mock the mockApiService
jest.mock('../../src/services/mockData', () => ({
  mockApiService: {
    getMetrics: jest.fn().mockResolvedValue({
      revenue: 250000,
      profit: 85000,
      margin: 34,
      utilizationRate: 78,
      outstandingInvoices: 45000,
      projectsAtRisk: 3
    }),
    getProfitabilityTrends: jest.fn().mockResolvedValue([]),
    getClientPerformance: jest.fn().mockResolvedValue([]),
    getProjectsHealth: jest.fn().mockResolvedValue([]),
    getTaskBreakdown: jest.fn().mockResolvedValue([]),
    getRecentExceptions: jest.fn().mockResolvedValue([]),
  }
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
