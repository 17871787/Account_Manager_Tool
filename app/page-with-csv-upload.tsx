'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Flex, Grid, Text, Button, Select, Badge, Heading, Box, Tabs } from '@radix-ui/themes';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PoundSterling,
  Clock,
  Users,
  Activity,
  FileText,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import Link from "next/link";
import { subDays, format } from 'date-fns';
import { apiService } from '../src/services/api.service';

// Metric Card Component
import { HarvestSummary } from "./components/HarvestSummary";

type ProfitabilityRecord = {
  client: string;
  project: string;
  recognisedRevenue: number;
  billableCost: number;
  exclusionCost: number;
  margin: number;
  marginPercentage: number;
  exceptionsCount: number;
};

type ExceptionRecord = {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestedAction: string;
  entityLabel?: string;
};

type TimeSeriesPoint = {
  date: string;
  revenue: number;
  cost: number;
  margin: number;
  utilization: number;
  totalHours: number;
  billableHours: number;
};

type ProfitabilityApiRow = {
  client?: string;
  client_name?: string;
  project?: string;
  project_name?: string;
  recognisedRevenue?: number;
  recognised_revenue?: number;
  billableCost?: number;
  billable_cost?: number;
  exclusionCost?: number;
  exclusion_cost?: number;
  margin?: number;
  marginPercentage?: number;
  margin_percentage?: number;
  exceptionsCount?: number;
  exceptions_count?: number;
};

type ExceptionApiRow = {
  id?: string;
  entryId?: string;
  type?: string;
  severity?: string;
  description?: string;
  suggestedAction?: string;
  suggested_action?: string;
  entityLabel?: string;
  entity_label?: string;
  entityType?: string;
  entityId?: string;
};

type HarvestTimeEntryApiRow = {
  spent_date?: string;
  date?: string;
  hours?: number;
  billable?: boolean;
  billable_rate?: number;
  cost_rate?: number;
};
function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  trend
}: {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const TrendIcon = trend === 'up' ? ChevronUp : trend === 'down' ? ChevronDown : null;

  return (
    <Card className="p-4">
      <Flex direction="column" gap="2">
        <Flex justify="between" align="center">
          <Text size="2" color="gray">{title}</Text>
          <Icon className="h-4 w-4 text-gray-500" />
        </Flex>
        <Text size="6" weight="bold">{value}</Text>
        {change && (
          <Flex align="center" gap="1">
            {TrendIcon && <TrendIcon className={`h-4 w-4 ${trendColor}`} />}
            <Text size="2" className={trendColor}>
              {change}
            </Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
}

// Exception Alert Component
function ExceptionAlert({ exception }: { exception: ExceptionRecord }) {
  const severityColors = {
    high: 'red',
    medium: 'orange',
    low: 'yellow'
  };

  return (
    <Card className="p-4 mb-3">
      <Flex direction="column" gap="2">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <Text weight="medium">{exception.type.replace(/_/g, ' ').toUpperCase()}</Text>
          </Flex>
          <Badge color={severityColors[exception.severity as keyof typeof severityColors]}>
            {exception.severity}
          </Badge>
        </Flex>
        {exception.entityLabel && (
          <Text size="2" color="gray">{exception.entityLabel}</Text>
        )}
        <Text size="2">{exception.description}</Text>
        <Text size="1" color="gray">Suggested: {exception.suggestedAction}</Text>
        <Flex gap="2" className="mt-2">
          <Button size="1" variant="soft" color="green">Approve</Button>
          <Button size="1" variant="soft" color="red">Reject</Button>
        </Flex>
      </Flex>
    </Card>
  );
}

export default function Dashboard() {
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityRecord[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const periodDays = Number.parseInt(selectedPeriod, 10) || 30;
      const endDate = new Date();
      const startDate = subDays(endDate, Math.max(periodDays - 1, 0));
      const [profitData, exceptionsData, harvestData] = await Promise.all([
        apiService.getPortfolioProfitability(format(endDate, 'yyyy-MM')) as Promise<ProfitabilityApiRow[]>,
        apiService.getPendingExceptions() as Promise<ExceptionApiRow[]>,
        apiService.getHarvestTimeEntries(
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd')
        ) as Promise<{ time_entries?: HarvestTimeEntryApiRow[] } | HarvestTimeEntryApiRow[]>
      ]);

      const normalizedProfitability: ProfitabilityRecord[] = (profitData ?? []).map((item) => ({
        client: item.client ?? item.client_name ?? 'Unknown client',
        project: item.project ?? item.project_name ?? 'Unknown project',
        recognisedRevenue: Number(item.recognisedRevenue ?? item.recognised_revenue ?? 0),
        billableCost: Number(item.billableCost ?? item.billable_cost ?? 0),
        exclusionCost: Number(item.exclusionCost ?? item.exclusion_cost ?? 0),
        margin: Number(item.margin ?? 0),
        marginPercentage: Number(item.marginPercentage ?? item.margin_percentage ?? 0),
        exceptionsCount: Number(item.exceptionsCount ?? item.exceptions_count ?? 0),
      }));

      const normalizedExceptions: ExceptionRecord[] = (exceptionsData ?? []).map((exception) => {
        const severity =
          exception.severity === 'high' || exception.severity === 'low' || exception.severity === 'medium'
            ? exception.severity
            : 'medium';
        return {
          id:
            exception.id ??
            exception.entryId ??
            `${exception.type ?? 'exception'}-${exception.entityId ?? Math.random().toString(36).slice(2)}`,
          type: exception.type ?? 'unknown',
          severity,
        description: exception.description ?? 'No description provided',
        suggestedAction:
          exception.suggestedAction ?? exception.suggested_action ?? 'Review exception details',
        entityLabel:
          exception.entityLabel ??
          exception.entity_label ??
          (exception.entityType && exception.entityId
            ? `${exception.entityType} ${exception.entityId}`
            : exception.entityId ?? undefined),
        };
      });

      const harvestResponse = harvestData as { time_entries?: HarvestTimeEntryApiRow[] } | HarvestTimeEntryApiRow[];
      const harvestEntries: HarvestTimeEntryApiRow[] = Array.isArray(harvestResponse)
        ? harvestResponse
        : Array.isArray(harvestResponse?.time_entries)
          ? harvestResponse.time_entries ?? []
          : [];

      const seriesMap = new Map<string, { revenue: number; cost: number; totalHours: number; billableHours: number }>();
      for (const entry of harvestEntries) {
        const date = entry.spent_date ?? entry.date;
        if (!date) continue;
        const hours = Number(entry.hours ?? 0);
        const billableRate = Number(entry.billable_rate ?? 0);
        const costRate = Number(entry.cost_rate ?? 0);
        const revenue = entry.billable ? hours * billableRate : 0;
        const cost = hours * costRate;

        const existing = seriesMap.get(date) ?? {
          revenue: 0,
          cost: 0,
          totalHours: 0,
          billableHours: 0,
        };

        existing.revenue += revenue;
        existing.cost += cost;
        existing.totalHours += hours;
        if (entry.billable) {
          existing.billableHours += hours;
        }

        seriesMap.set(date, existing);
      }

      const normalizedSeries: TimeSeriesPoint[] = Array.from(seriesMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([date, values]) => {
          const margin = values.revenue - values.cost;
          const utilization = values.totalHours > 0 ? (values.billableHours / values.totalHours) * 100 : 0;
          return {
            date: format(new Date(date), 'MMM dd'),
            revenue: values.revenue,
            cost: values.cost,
            margin,
            utilization,
            totalHours: values.totalHours,
            billableHours: values.billableHours,
          };
        });

      setProfitabilityData(normalizedProfitability);
      setExceptions(normalizedExceptions);
      setTimeSeriesData(normalizedSeries);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const handleSync = async (source: string) => {
    setSyncing(source);
    try {
      if (source === 'harvest') {
        const periodDays = Number.parseInt(selectedPeriod, 10) || 30;
        const endDate = new Date();
        const startDate = subDays(endDate, Math.max(periodDays - 1, 0));
        await apiService.syncHarvest(
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd')
        );
      } else if (source === 'hubspot') {
        await apiService.syncHubSpot();
      }
      await loadDashboardData();
    } catch (error) {
      console.error(`Failed to sync ${source}:`, error);
    } finally {
      setSyncing(null);
    }
  };

  // Calculate summary metrics
  const totalRevenue = profitabilityData.reduce((sum, d) => sum + d.recognisedRevenue, 0);
  const totalCost = profitabilityData.reduce(
    (sum, d) => sum + d.billableCost + d.exclusionCost,
    0
  );
  const totalProfit = profitabilityData.reduce((sum, d) => sum + d.margin, 0);
  const avgMargin = profitabilityData.length > 0
    ? (
        profitabilityData.reduce((sum, d) => sum + d.marginPercentage, 0) /
        profitabilityData.length
      ).toFixed(1)
    : '0';
  const totalHours = timeSeriesData.reduce((sum, d) => sum + d.totalHours, 0);

  // Prepare chart data
  const pieData = profitabilityData.map(d => ({
    name: d.client,
    value: d.recognisedRevenue
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Text size="4">Loading dashboard...</Text>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <Flex justify="between" align="center" className="mb-4">
          <div>
            <Heading size="8" className="mb-2">AM Copilot Dashboard</Heading>
            <Text color="gray">Real-time profitability tracking for Map of Ag</Text>
          </div>
          <Flex gap="3">
            <Select.Root value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <Select.Trigger placeholder="Select period" />
              <Select.Content>
                <Select.Item value="7">Last 7 days</Select.Item>
                <Select.Item value="30">Last 30 days</Select.Item>
                <Select.Item value="90">Last 90 days</Select.Item>
              </Select.Content>
            </Select.Root>
            <Button
              variant="soft"
              onClick={() => handleSync('harvest')}
              disabled={syncing === 'harvest'}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing === 'harvest' ? 'animate-spin' : ''}`} />
              Sync Harvest
            </Button>
            <Button
              variant="soft"
              color="orange"
              onClick={() => handleSync('hubspot')}
              disabled={syncing === 'hubspot'}
            >
              <Activity className={`h-4 w-4 mr-2 ${syncing === 'hubspot' ? 'animate-pulse' : ''}`} />
              Sync HubSpot
            </Button>
            <Link href="/upload">
              <Button variant="soft" color="blue">
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </Link>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </Flex>
        </Flex>
      </div>

      {/* Key Metrics */}
      <Grid columns="5" gap="4" className="mb-8">
        <MetricCard
          title="Total Revenue"
          value={`£${totalRevenue.toLocaleString()}`}
          change="+12.5% from last period"
          icon={PoundSterling}
          trend="up"
        />
        <MetricCard
          title="Net Profit"
          value={`£${totalProfit.toLocaleString()}`}
          change="+8.3% from last period"
          icon={TrendingUp}
          trend="up"
        />
        <MetricCard
          title="Profit Margin"
          value={`${avgMargin}%`}
          change="-2.1% from last period"
          icon={Activity}
          trend="down"
        />
        <MetricCard
          title="Hours Tracked"
          value={totalHours.toLocaleString()}
          change="+18 hours this week"
          icon={Clock}
          trend="up"
        />
        <MetricCard
          title="Total Cost"
          value={`£${totalCost.toLocaleString()}`}
          change="Includes billable + exclusion"
          icon={TrendingDown}
          trend="down"
        />
      </Grid>

      {/* Tabs for different views */}
      <Tabs.Root defaultValue="overview">
        <Tabs.List size="2">
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="profitability">Profitability</Tabs.Trigger>
          <Tabs.Trigger value="exceptions">
            Exceptions
            {exceptions.length > 0 && (
              <Badge color="red" className="ml-2">{exceptions.length}</Badge>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value="timetracking">Time Tracking</Tabs.Trigger>
          <Tabs.Trigger value="clients">Clients</Tabs.Trigger>
        </Tabs.List>

        <Box className="mt-6">
          {/* Overview Tab */}
          <Tabs.Content value="overview">
            <Grid columns="3" gap="4">
              {/* Revenue Trend Chart */}
              <div className="col-span-2">
                <Card className="p-6">
                  <Text weight="medium" size="4" className="mb-4">Revenue & Profit Trend</Text>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stackId="1"
                        stroke="#0088FE"
                        fill="#0088FE"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="margin"
                        stackId="2"
                        stroke="#00C49F"
                        fill="#00C49F"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Revenue Distribution */}
              <Card className="p-6">
                <Text weight="medium" size="4" className="mb-4">Revenue by Client</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number | string) => `£${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
          </Tabs.Content>

          {/* Profitability Tab */}
          <Tabs.Content value="profitability">
            <Card className="p-6">
              <Flex justify="between" align="center" className="mb-4">
                <Text weight="medium" size="4">Client Profitability Analysis</Text>
                <Link href="/dashboard">
                  <Button variant="soft" size="2">
                    <FileText className="h-4 w-4 mr-2" />
                    View Simple Dashboard
                  </Button>
                </Link>
              </Flex>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Client</th>
                      <th className="text-left py-2">Project</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Cost</th>
                      <th className="text-right py-2">Margin</th>
                      <th className="text-right py-2">Margin %</th>
                      <th className="text-right py-2">Exceptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitabilityData.map((metric) => {
                      const cost = metric.billableCost + metric.exclusionCost;
                      const marginPercent = metric.marginPercentage.toFixed(1);
                      return (
                        <tr
                          key={`${metric.client}-${metric.project}`}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-3">
                            <Text weight="medium">{metric.client}</Text>
                          </td>
                          <td className="py-3">
                            <Text color="gray">{metric.project}</Text>
                          </td>
                          <td className="text-right py-3">
                            <Text color="green">£{metric.recognisedRevenue.toLocaleString()}</Text>
                          </td>
                          <td className="text-right py-3">
                            <Text color="red">£{cost.toLocaleString()}</Text>
                          </td>
                          <td className="text-right py-3">
                            <Text weight="medium">£{metric.margin.toLocaleString()}</Text>
                          </td>
                          <td className="text-right py-3">
                            <Badge color={metric.marginPercentage > 50 ? 'green' : metric.marginPercentage > 25 ? 'orange' : 'red'}>
                              {marginPercent}%
                            </Badge>
                          </td>
                          <td className="text-right py-3">
                            <Text>{metric.exceptionsCount}</Text>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </Tabs.Content>

          {/* Exceptions Tab */}
          <Tabs.Content value="exceptions">
            <Grid columns="2" gap="4">
              <div>
                <Card className="p-4">
                  <Flex justify="between" align="center" className="mb-4">
                    <Text weight="medium" size="4">Active Exceptions</Text>
                    <Badge color="red">{exceptions.length} Total</Badge>
                  </Flex>
                  <div className="max-h-[600px] overflow-y-auto">
                    {exceptions.length > 0 ? (
                      exceptions.map((exception) => (
                        <ExceptionAlert key={exception.id} exception={exception} />
                      ))
                    ) : (
                      <Text color="gray" size="2">No exceptions to report</Text>
                    )}
                  </div>
                </Card>
              </div>

              <div>
                <Card className="p-4 mb-4">
                  <Text weight="medium" size="4" className="mb-4">Exception Summary</Text>
                  <Flex direction="column" gap="3">
                    <Flex justify="between">
                      <Text size="2">High Priority</Text>
                      <Badge color="red">{exceptions.filter(e => e.severity === 'high').length}</Badge>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2">Medium Priority</Text>
                      <Badge color="orange">{exceptions.filter(e => e.severity === 'medium').length}</Badge>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2">Low Priority</Text>
                      <Badge color="yellow">{exceptions.filter(e => e.severity === 'low').length}</Badge>
                    </Flex>
                  </Flex>
                </Card>

                <Card className="p-4">
                  <Text weight="medium" size="4" className="mb-4">Quick Actions</Text>
                  <Flex direction="column" gap="2">
                    <Button variant="soft" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Invoice
                    </Button>
                    <Button variant="soft" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Update Client Rates
                    </Button>
                    <Link href="/upload" className="w-full">
                      <Button variant="soft" className="w-full justify-start">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload CSV Data
                      </Button>
                    </Link>
                    <Button variant="soft" className="w-full justify-start">
                      <Activity className="h-4 w-4 mr-2" />
                      Run Profitability Report
                    </Button>
                    <Button variant="soft" className="w-full justify-start">
                      <Clock className="h-4 w-4 mr-2" />
                      Review Time Entries
                    </Button>
                  </Flex>
                </Card>
              </div>
            </Grid>
          </Tabs.Content>

          {/* Clients Tab */}
          <Tabs.Content value="clients">
            <Grid columns="3" gap="4">
              {profitabilityData.map((metric) => {
                const cost = metric.billableCost + metric.exclusionCost;
                return (
                  <Card key={`${metric.client}-${metric.project}`} className="p-4">
                    <Flex direction="column" gap="3">
                      <Heading size="4">{metric.client}</Heading>
                      <Text size="2" color="gray">{metric.project}</Text>
                      <Flex justify="between">
                        <Text size="2" color="gray">Revenue</Text>
                        <Text size="2" weight="bold">£{metric.recognisedRevenue.toLocaleString()}</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2" color="gray">Cost</Text>
                        <Text size="2" weight="bold" color="red">£{cost.toLocaleString()}</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2" color="gray">Margin</Text>
                        <Badge color={metric.marginPercentage > 50 ? 'green' : metric.marginPercentage > 25 ? 'orange' : 'red'}>
                          {metric.marginPercentage.toFixed(1)}%
                        </Badge>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2" color="gray">Exceptions</Text>
                        <Text size="2" weight="bold">{metric.exceptionsCount}</Text>
                      </Flex>
                      <Button size="2" variant="soft">View Details</Button>
                    </Flex>
                  </Card>
                );
              })}
            </Grid>
          </Tabs.Content>

          {/* Time Tracking Tab */}
          <Tabs.Content value="timetracking">
            <Grid columns="2" gap="4">
              <div className="col-span-2">
                <HarvestSummary />
              </div>
              <Card className="p-4">
                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">Quick Actions</Text>
                  <Flex direction="column" gap="2">
                    <Link href="/harvest">
                      <Button variant="soft" className="w-full">
                        <Clock className="mr-2 h-4 w-4" />
                        View Full Time Entries
                      </Button>
                    </Link>
                    <Link href="/upload">
                      <Button variant="soft" className="w-full">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload CSV Data
                      </Button>
                    </Link>
                    <Button variant="soft" disabled className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      Export Time Report (Coming Soon)
                    </Button>
                  </Flex>
                </Flex>
              </Card>
              <Card className="p-4">
                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">Integration Status</Text>
                  <Flex direction="column" gap="2">
                    <Flex justify="between">
                      <Text size="2">Harvest API</Text>
                      <Badge color="green">Connected</Badge>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2">Account</Text>
                      <Text size="2" weight="medium">Cinder Hill</Text>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2">Last Sync</Text>
                      <Text size="2" color="gray">Just now</Text>
                    </Flex>
                  </Flex>
                </Flex>
              </Card>
            </Grid>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </div>
  );
}