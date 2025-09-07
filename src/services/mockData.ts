// Mock data that mimics Harvest and HubSpot API responses
import { addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';

// Harvest-style time entries
export const mockTimeEntries = [
  {
    id: 1436479358,
    spent_date: '2024-01-15',
    hours: 7.5,
    hours_without_timer: 7.5,
    rounded_hours: 7.5,
    notes: 'Implemented new authentication system',
    is_locked: false,
    locked_reason: null,
    is_closed: false,
    is_billed: true,
    timer_started_at: null,
    started_time: '9:00am',
    ended_time: '5:30pm',
    is_running: false,
    billable: true,
    budgeted: true,
    billable_rate: 175.0,
    cost_rate: 85.0,
    created_at: '2024-01-15T18:30:00Z',
    updated_at: '2024-01-15T18:30:00Z',
    user: {
      id: 3604547,
      name: 'Sarah Chen',
    },
    client: {
      id: 8348295,
      name: 'Arla',
      currency: 'GBP',
    },
    project: {
      id: 30827502,
      name: 'Q1 Digital Transformation',
      code: 'ARLA-2024-Q1',
    },
    task: {
      id: 16197516,
      name: 'Backend Development',
    },
    user_assignment: {
      id: 287511674,
      is_project_manager: false,
      is_active: true,
      use_default_rates: false,
      budget: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      hourly_rate: 175.0,
    },
    task_assignment: {
      id: 226053683,
      billable: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      hourly_rate: 175.0,
      budget: 50000.0,
    },
    invoice: {
      id: 26693239,
      number: 'INV-2024-001',
    },
    external_reference: null,
  },
  {
    id: 1436479359,
    spent_date: '2024-01-16',
    hours: 8.0,
    hours_without_timer: 8.0,
    rounded_hours: 8.0,
    notes: 'API integration and testing',
    is_locked: false,
    locked_reason: null,
    is_closed: false,
    is_billed: true,
    timer_started_at: null,
    started_time: '9:00am',
    ended_time: '6:00pm',
    is_running: false,
    billable: true,
    budgeted: true,
    billable_rate: 175.0,
    cost_rate: 85.0,
    created_at: '2024-01-16T18:30:00Z',
    updated_at: '2024-01-16T18:30:00Z',
    user: {
      id: 3604547,
      name: 'Sarah Chen',
    },
    client: {
      id: 8348295,
      name: 'Arla',
      currency: 'GBP',
    },
    project: {
      id: 30827502,
      name: 'Q1 Digital Transformation',
      code: 'ARLA-2024-Q1',
    },
    task: {
      id: 16197516,
      name: 'Backend Development',
    },
    user_assignment: {
      id: 287511674,
      is_project_manager: false,
      is_active: true,
      use_default_rates: false,
      budget: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-16T00:00:00Z',
      hourly_rate: 175.0,
    },
    task_assignment: {
      id: 226053683,
      billable: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-16T00:00:00Z',
      hourly_rate: 175.0,
      budget: 50000.0,
    },
    invoice: {
      id: 26693239,
      number: 'INV-2024-001',
    },
    external_reference: null,
  },
  {
    id: 1436479360,
    spent_date: '2024-01-17',
    hours: 6.0,
    hours_without_timer: 6.0,
    rounded_hours: 6.0,
    notes: 'Code review and documentation',
    is_locked: false,
    locked_reason: null,
    is_closed: false,
    is_billed: false,
    timer_started_at: null,
    started_time: '10:00am',
    ended_time: '4:00pm',
    is_running: false,
    billable: true,
    budgeted: true,
    billable_rate: 150.0,
    cost_rate: 75.0,
    created_at: '2024-01-17T16:30:00Z',
    updated_at: '2024-01-17T16:30:00Z',
    user: {
      id: 3604548,
      name: 'Mike Johnson',
    },
    client: {
      id: 8348295,
      name: 'Arla',
      currency: 'GBP',
    },
    project: {
      id: 30827502,
      name: 'Q1 Digital Transformation',
      code: 'ARLA-2024-Q1',
    },
    task: {
      id: 16197517,
      name: 'Code Review',
    },
    user_assignment: {
      id: 287511675,
      is_project_manager: true,
      is_active: true,
      use_default_rates: false,
      budget: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-17T00:00:00Z',
      hourly_rate: 150.0,
    },
    task_assignment: {
      id: 226053684,
      billable: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-17T00:00:00Z',
      hourly_rate: 150.0,
      budget: 50000.0,
    },
    invoice: null,
    external_reference: null,
  },
  // Different client
  {
    id: 1436479361,
    spent_date: '2024-01-18',
    hours: 4.5,
    hours_without_timer: 4.5,
    rounded_hours: 4.5,
    notes: 'Database optimization',
    is_locked: false,
    locked_reason: null,
    is_closed: false,
    is_billed: false,
    timer_started_at: null,
    started_time: '1:00pm',
    ended_time: '5:30pm',
    is_running: false,
    billable: true,
    budgeted: true,
    billable_rate: 200.0,
    cost_rate: 95.0,
    created_at: '2024-01-18T17:30:00Z',
    updated_at: '2024-01-18T17:30:00Z',
    user: {
      id: 3604547,
      name: 'Sarah Chen',
    },
    client: {
      id: 8348296,
      name: 'Saputo',
      currency: 'GBP',
    },
    project: {
      id: 30827503,
      name: 'Process Automation',
      code: 'SAP-2024-01',
    },
    task: {
      id: 16197518,
      name: 'Database Work',
    },
    user_assignment: {
      id: 287511676,
      is_project_manager: false,
      is_active: true,
      use_default_rates: false,
      budget: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-18T00:00:00Z',
      hourly_rate: 200.0,
    },
    task_assignment: {
      id: 226053685,
      billable: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-18T00:00:00Z',
      hourly_rate: 200.0,
      budget: 25000.0,
    },
    invoice: null,
    external_reference: null,
  },
];

// HubSpot-style deals
export const mockHubSpotDeals = [
  {
    id: '12029089094',
    properties: {
      dealname: 'Q1 Digital Transformation - Arla',
      amount: '50000',
      closedate: '2024-03-31T00:00:00Z',
      pipeline: 'default',
      dealstage: 'contractsent',
      createdate: '2024-01-01T00:00:00Z',
      hs_object_id: '12029089094',
      hs_lastmodifieddate: '2024-01-18T00:00:00Z',
    },
    associations: {
      companies: {
        results: [
          {
            id: '11381275319',
            type: 'deal_to_company',
          },
        ],
      },
    },
  },
  {
    id: '12029089095',
    properties: {
      dealname: 'Process Automation - Saputo',
      amount: '25000',
      closedate: '2024-02-29T00:00:00Z',
      pipeline: 'default',
      dealstage: 'closedwon',
      createdate: '2024-01-01T00:00:00Z',
      hs_object_id: '12029089095',
      hs_lastmodifieddate: '2024-01-18T00:00:00Z',
    },
    associations: {
      companies: {
        results: [
          {
            id: '11381275320',
            type: 'deal_to_company',
          },
        ],
      },
    },
  },
];

// HubSpot-style companies
export const mockHubSpotCompanies = [
  {
    id: '11381275319',
    properties: {
      name: 'Arla',
      domain: 'arla.com',
      industry: 'Dairy & Food Production',
      numberofemployees: '500',
      annualrevenue: '50000000',
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      createdate: '2023-01-01T00:00:00Z',
    },
  },
  {
    id: '11381275320',
    properties: {
      name: 'Saputo',
      domain: 'saputo.com',
      industry: 'Dairy Products',
      numberofemployees: '200',
      annualrevenue: '20000000',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      createdate: '2023-06-01T00:00:00Z',
    },
  },
];

// Generate profitability data
export const generateProfitabilityData = () => {
  const clients = [
    { id: '8348295', name: 'Arla', budget: 85000, spent: 72000, hours: 320 },
    { id: '8348296', name: 'Saputo', budget: 65000, spent: 48000, hours: 240 },
    { id: '8348297', name: 'Aldi', budget: 120000, spent: 95000, hours: 480 },
    { id: '8348298', name: 'Long Clawson', budget: 45000, spent: 38500, hours: 180 },
    { id: '8348299', name: 'Crediton', budget: 55000, spent: 42000, hours: 210 },
    { id: '8348300', name: 'Lactalis', budget: 95000, spent: 78000, hours: 390 },
    { id: '8348301', name: 'Leprino', budget: 75000, spent: 62000, hours: 310 },
  ];

  return clients.map(client => ({
    clientId: client.id,
    clientName: client.name,
    totalRevenue: client.spent,
    totalCost: client.spent * 0.45, // Assuming 45% cost ratio
    profitMargin: ((client.spent - (client.spent * 0.45)) / client.spent * 100).toFixed(1),
    hoursWorked: client.hours,
    budgetUtilization: ((client.spent / client.budget) * 100).toFixed(1),
    budget: client.budget,
    averageRate: Math.round(client.spent / client.hours),
  }));
};

// Generate exception data
export const generateExceptions = () => [
  {
    id: '1',
    type: 'budget_breach',
    severity: 'high',
    clientName: 'Aldi',
    projectName: 'Supply Chain Optimization',
    description: 'Project has exceeded 90% of allocated budget with 2 weeks remaining',
    suggestedAction: 'Review scope or request budget increase',
    amount: 95000,
    budget: 120000,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'rate_mismatch',
    severity: 'medium',
    clientName: 'Arla',
    projectName: 'Q1 Digital Transformation',
    description: 'Billing rate (£145) differs from contract rate (£165)',
    suggestedAction: 'Update billing rate in Harvest',
    amount: 145,
    expectedAmount: 165,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'unbilled_hours',
    severity: 'medium',
    clientName: 'Saputo',
    projectName: 'Process Automation',
    description: '32 hours from last week not yet invoiced',
    suggestedAction: 'Create invoice for pending hours',
    hours: 32,
    amount: 4800,
    createdAt: subDays(new Date(), 2).toISOString(),
  },
  {
    id: '4',
    type: 'low_utilization',
    severity: 'low',
    clientName: 'Crediton',
    projectName: 'ERP Integration',
    description: 'Team utilization at 65% for the past week',
    suggestedAction: 'Review resource allocation',
    utilization: 65,
    targetUtilization: 80,
    createdAt: subDays(new Date(), 1).toISOString(),
  },
];

// Generate time series data for charts
export const generateTimeSeriesData = (days = 30) => {
  const data = [];
  const startDate = subDays(new Date(), days);
  
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 5000) + 3000,
      cost: Math.floor(Math.random() * 2000) + 1500,
      profit: 0, // Will calculate
      hours: Math.floor(Math.random() * 40) + 20,
    });
    data[i].profit = data[i].revenue - data[i].cost;
  }
  
  return data;
};

// Mock API service
export const mockApiService = {
  async getTimeEntries(startDate?: string, endDate?: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockTimeEntries;
  },

  async getDeals() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockHubSpotDeals;
  },

  async getCompanies() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockHubSpotCompanies;
  },

  async getProfitabilityMetrics() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateProfitabilityData();
  },

  async getExceptions() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateExceptions();
  },

  async getTimeSeriesData(days = 30) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateTimeSeriesData(days);
  },
};