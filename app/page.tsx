'use client'

import { useState, useEffect } from 'react'
import { Container, Card, Heading, Text, Button, Flex, Box, Badge, Tabs, Grid } from '@radix-ui/themes'
import { 
  TrendingUp, TrendingDown, AlertCircle, DollarSign, 
  Clock, FileText, Users, Activity, Download, RefreshCw 
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Dashboard() {
  const [selectedClient, setSelectedClient] = useState('Arla')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState({
    harvest: null as Date | null,
    hubspot: null as Date | null,
    sft: null as Date | null,
  })
  const [profitabilityData, setProfitabilityData] = useState([
    { month: 'Jul', revenue: 125000, cost: 85000, margin: 40000 },
    { month: 'Aug', revenue: 135000, cost: 88000, margin: 47000 },
    { month: 'Sep', revenue: 142000, cost: 92000, margin: 50000 },
    { month: 'Oct', revenue: 138000, cost: 91000, margin: 47000 },
    { month: 'Nov', revenue: 145000, cost: 94000, margin: 51000 },
    { month: 'Dec', revenue: 155000, cost: 98000, margin: 57000 },
  ])

  const [exceptions, setExceptions] = useState([
    { id: 1, type: 'Rate Mismatch', client: 'Arla', severity: 'high', description: 'Expected £150/hr, found £125/hr for Senior Consultant', action: 'Update rate in Harvest' },
    { id: 2, type: 'Budget Breach', client: 'Sainsburys', severity: 'medium', description: 'Project at 92% budget utilization', action: 'Review with PM' },
    { id: 3, type: 'Billable Conflict', client: 'ADM', severity: 'high', description: 'Data ingestion marked as billable', action: 'Reclassify as exclusion' },
  ])

  const budgetData = [
    { name: 'Used', value: 68, fill: '#3b82f6' },
    { name: 'Remaining', value: 32, fill: '#e5e7eb' },
  ]

  const handleSync = async (source: 'harvest' | 'hubspot' | 'sft') => {
    setSyncing(source)
    try {
      const endpoint = source === 'harvest' ? '/api/sync/harvest' :
                       source === 'hubspot' ? '/api/sync/hubspot' :
                       '/api/sync/sft'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          toDate: new Date().toISOString(),
        }),
      })
      
      if (response.ok) {
        setLastSync(prev => ({ ...prev, [source]: new Date() }))
        // Refresh data after sync
        // In a real app, you'd fetch updated data here
      }
    } catch (error) {
      console.error(`Failed to sync ${source}:`, error)
    } finally {
      setSyncing(null)
    }
  }

  return (
    <Container size="4" className="py-8">
      {/* Header */}
      <Flex justify="between" align="center" className="mb-8">
        <Box>
          <Heading size="8" className="mb-2">AM Copilot</Heading>
          <Text size="3" color="gray">Profitability & Billing Dashboard</Text>
        </Box>
        <Flex gap="3">
          <Button 
            variant="soft" 
            size="3"
            onClick={() => handleSync('harvest')}
            disabled={syncing === 'harvest'}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing === 'harvest' ? 'animate-spin' : ''}`} />
            {syncing === 'harvest' ? 'Syncing...' : 'Sync Harvest'}
          </Button>
          <Button 
            variant="soft" 
            size="3" 
            color="orange"
            onClick={() => handleSync('hubspot')}
            disabled={syncing === 'hubspot'}
          >
            <Activity className={`w-4 h-4 mr-2 ${syncing === 'hubspot' ? 'animate-pulse' : ''}`} />
            {syncing === 'hubspot' ? 'Syncing...' : 'Sync HubSpot'}
          </Button>
          <Button 
            variant="soft" 
            size="3" 
            color="purple"
            onClick={() => handleSync('sft')}
            disabled={syncing === 'sft'}
          >
            <TrendingUp className={`w-4 h-4 mr-2 ${syncing === 'sft' ? 'animate-pulse' : ''}`} />
            {syncing === 'sft' ? 'Syncing...' : 'Sync SFT'}
          </Button>
          <Button size="3">
            <Download className="w-4 h-4 mr-2" />
            Export Invoice
          </Button>
        </Flex>
      </Flex>

      {/* Key Metrics */}
      <Grid columns="4" gap="4" className="mb-8">
        <Card>
          <Flex direction="column" gap="2">
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Current Margin</Text>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </Flex>
            <Heading size="6">32.4%</Heading>
            <Text size="1" color="green">+2.3% from last month</Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Recognised Revenue</Text>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </Flex>
            <Heading size="6">£155,000</Heading>
            <Text size="1" color="gray">December 2024</Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Pending Exceptions</Text>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </Flex>
            <Heading size="6">3</Heading>
            <Text size="1" color="orange">2 high priority</Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Budget Utilization</Text>
              <Clock className="w-4 h-4 text-purple-500" />
            </Flex>
            <Heading size="6">68%</Heading>
            <Text size="1" color="gray">On track</Text>
          </Flex>
        </Card>
      </Grid>

      {/* Main Content Tabs */}
      <Tabs.Root defaultValue="profitability">
        <Tabs.List size="2">
          <Tabs.Trigger value="profitability">Profitability</Tabs.Trigger>
          <Tabs.Trigger value="exceptions">Exceptions</Tabs.Trigger>
          <Tabs.Trigger value="budget">Budget vs Burn</Tabs.Trigger>
          <Tabs.Trigger value="clients">Clients</Tabs.Trigger>
        </Tabs.List>

        <Box className="mt-6">
          <Tabs.Content value="profitability">
            <Card size="3">
              <Heading size="4" className="mb-4">Profitability Trend - {selectedClient}</Heading>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={profitabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" strokeWidth={2} />
                  <Line type="monotone" dataKey="cost" stroke="#ef4444" name="Cost" strokeWidth={2} />
                  <Line type="monotone" dataKey="margin" stroke="#10b981" name="Margin" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Tabs.Content>

          <Tabs.Content value="exceptions">
            <Card size="3">
              <Flex justify="between" align="center" className="mb-4">
                <Heading size="4">Exception Queue</Heading>
                <Badge color="orange" size="2">{exceptions.length} Pending</Badge>
              </Flex>
              
              <Flex direction="column" gap="3">
                {exceptions.map((exception) => (
                  <Card key={exception.id} variant="surface">
                    <Flex justify="between" align="start">
                      <Box className="flex-1">
                        <Flex gap="2" align="center" className="mb-2">
                          <Badge color={exception.severity === 'high' ? 'red' : 'orange'}>
                            {exception.severity.toUpperCase()}
                          </Badge>
                          <Text weight="bold">{exception.type}</Text>
                          <Text size="2" color="gray">• {exception.client}</Text>
                        </Flex>
                        <Text size="2" className="mb-2">{exception.description}</Text>
                        <Text size="1" color="blue">Suggested: {exception.action}</Text>
                      </Box>
                      <Flex gap="2">
                        <Button size="2" variant="soft" color="green">Approve</Button>
                        <Button size="2" variant="soft" color="red">Reject</Button>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </Card>
          </Tabs.Content>

          <Tabs.Content value="budget">
            <Grid columns="2" gap="4">
              <Card size="3">
                <Heading size="4" className="mb-4">Budget Utilization</Heading>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={budgetData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {budgetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <Flex justify="center" gap="4" className="mt-4">
                  <Flex align="center" gap="2">
                    <Box className="w-3 h-3 bg-blue-500 rounded"></Box>
                    <Text size="2">Used: 68%</Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <Box className="w-3 h-3 bg-gray-200 rounded"></Box>
                    <Text size="2">Remaining: 32%</Text>
                  </Flex>
                </Flex>
              </Card>

              <Card size="3">
                <Heading size="4" className="mb-4">Burn Rate Analysis</Heading>
                <Flex direction="column" gap="3">
                  <Flex justify="between">
                    <Text size="2">Monthly Budget</Text>
                    <Text weight="bold">£50,000</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text size="2">Current Spend</Text>
                    <Text weight="bold">£34,000</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text size="2">Days Remaining</Text>
                    <Text weight="bold">12</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text size="2">Projected Total</Text>
                    <Text weight="bold" color="green">£48,500</Text>
                  </Flex>
                  <Box className="pt-3 border-t">
                    <Badge size="2" color="green">On Track</Badge>
                  </Box>
                </Flex>
              </Card>
            </Grid>
          </Tabs.Content>

          <Tabs.Content value="clients">
            <Card size="3">
              <Heading size="4" className="mb-4">Client Portfolio</Heading>
              <Grid columns="3" gap="4">
                {['Arla', 'Sainsburys', 'ADM', 'McCain', 'Trewithen', 'Red Tractor'].map((client) => (
                  <Card key={client} variant="surface">
                    <Flex direction="column" gap="2">
                      <Heading size="3">{client}</Heading>
                      <Flex justify="between">
                        <Text size="2" color="gray">Margin</Text>
                        <Text size="2" weight="bold" color="green">28.5%</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2" color="gray">Revenue</Text>
                        <Text size="2" weight="bold">£125,000</Text>
                      </Flex>
                      <Button size="2" variant="soft">View Details</Button>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </Card>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Container>
  )
}