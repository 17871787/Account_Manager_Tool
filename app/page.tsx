'use client';

import { useState, useEffect } from 'react';
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
  Download
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
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
import { mockApiService } from '../src/services/mockData';

// Metric Card Component
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
  icon: any; 
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
function ExceptionAlert({ exception }: { exception: any }) {
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
        <Text size="2" color="gray">{exception.clientName} - {exception.projectName}</Text>
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
  const [profitabilityData, setProfitabilityData] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [profitData, exceptionsData, tsData] = await Promise.all([
        mockApiService.getProfitabilityMetrics(),
        mockApiService.getExceptions(),
        mockApiService.getTimeSeriesData(parseInt(selectedPeriod))
      ]);
      
      setProfitabilityData(profitData);
      setExceptions(exceptionsData);
      setTimeSeriesData(tsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (source: string) => {
    setSyncing(source);
    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    await loadDashboardData();
    setSyncing(null);
  };

  // Calculate summary metrics
  const totalRevenue = profitabilityData.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalProfit = profitabilityData.reduce((sum, d) => sum + (d.totalRevenue - d.totalCost), 0);
  const avgMargin = profitabilityData.length > 0 
    ? (profitabilityData.reduce((sum, d) => sum + parseFloat(d.profitMargin), 0) / profitabilityData.length).toFixed(1)
    : '0';
  const totalHours = profitabilityData.reduce((sum, d) => sum + d.hoursWorked, 0);

  // Prepare chart data
  const pieData = profitabilityData.map(d => ({
    name: d.clientName,
    value: d.totalRevenue
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
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </Flex>
        </Flex>
      </div>

      {/* Key Metrics */}
      <Grid columns="4" gap="4" className="mb-8">
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
                        dataKey="profit" 
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
                    <Tooltip formatter={(value: any) => `£${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
          </Tabs.Content>

          {/* Profitability Tab */}
          <Tabs.Content value="profitability">
            <Card className="p-6">
              <Text weight="medium" size="4" className="mb-4">Client Profitability Analysis</Text>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Client</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Cost</th>
                      <th className="text-right py-2">Profit</th>
                      <th className="text-right py-2">Margin</th>
                      <th className="text-right py-2">Budget Used</th>
                      <th className="text-right py-2">Hours</th>
                      <th className="text-right py-2">Avg Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitabilityData.map((client) => {
                      const profit = client.totalRevenue - client.totalCost;
                      return (
                        <tr key={client.clientId} className="border-b hover:bg-gray-50">
                          <td className="py-3">
                            <Text weight="medium">{client.clientName}</Text>
                          </td>
                          <td className="text-right py-3">
                            <Text color="green">£{client.totalRevenue.toLocaleString()}</Text>
                          </td>
                          <td className="text-right py-3">
                            <Text color="red">£{client.totalCost.toLocaleString()}</Text>
                          </td>
                          <td className="text-right py-3">
                            <Text weight="medium">£{profit.toLocaleString()}</Text>
                          </td>
                          <td className="text-right py-3">
                            <Badge color={parseFloat(client.profitMargin) > 50 ? 'green' : 'orange'}>
                              {client.profitMargin}%
                            </Badge>
                          </td>
                          <td className="text-right py-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    parseFloat(client.budgetUtilization) > 90 ? 'bg-red-500' : 
                                    parseFloat(client.budgetUtilization) > 75 ? 'bg-orange-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(100, parseFloat(client.budgetUtilization))}%` }}
                                />
                              </div>
                              <Text size="2">{client.budgetUtilization}%</Text>
                            </div>
                          </td>
                          <td className="text-right py-3">
                            {client.hoursWorked}
                          </td>
                          <td className="text-right py-3">
                            £{client.averageRate}/hr
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
              {profitabilityData.map((client) => {
                const profit = client.totalRevenue - client.totalCost;
                return (
                  <Card key={client.clientId} className="p-4">
                    <Flex direction="column" gap="3">
                      <Heading size="4">{client.clientName}</Heading>
                      <Flex justify="between">
                        <Text size="2" color="gray">Revenue</Text>
                        <Text size="2" weight="bold">£{client.totalRevenue.toLocaleString()}</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2" color="gray">Profit</Text>
                        <Text size="2" weight="bold" color="green">£{profit.toLocaleString()}</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2" color="gray">Margin</Text>
                        <Badge color={parseFloat(client.profitMargin) > 50 ? 'green' : 'orange'}>
                          {client.profitMargin}%
                        </Badge>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2" color="gray">Hours</Text>
                        <Text size="2" weight="bold">{client.hoursWorked}</Text>
                      </Flex>
                      <Button size="2" variant="soft">View Details</Button>
                    </Flex>
                  </Card>
                );
              })}
            </Grid>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </div>
  );
}