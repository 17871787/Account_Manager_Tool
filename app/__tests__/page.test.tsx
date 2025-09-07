import { render, screen } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import Page from '../page';

const MockComponent: FC<{ children?: ReactNode }> = ({ children }) => (
  <div>{children}</div>
);

jest.mock('recharts', () => ({
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
}));

describe('Dashboard Page', () => {
  it('renders heading', () => {
    render(<Page />);
    expect(screen.getByText('AM Copilot')).toBeTruthy();
  });
});
