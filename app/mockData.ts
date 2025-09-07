import type { ProfitabilityPoint, ExceptionItem, BudgetDatum } from './types';

export const mockProfitabilityData: ProfitabilityPoint[] = [
  { month: 'Jul', revenue: 125000, cost: 85000, margin: 40000 },
  { month: 'Aug', revenue: 135000, cost: 88000, margin: 47000 },
  { month: 'Sep', revenue: 142000, cost: 92000, margin: 50000 },
  { month: 'Oct', revenue: 138000, cost: 91000, margin: 47000 },
  { month: 'Nov', revenue: 145000, cost: 94000, margin: 51000 },
  { month: 'Dec', revenue: 155000, cost: 98000, margin: 57000 },
];

export const mockExceptions: ExceptionItem[] = [
  { id: 1, type: 'Rate Mismatch', client: 'Arla', severity: 'high', description: 'Expected £150/hr, found £125/hr for Senior Consultant', action: 'Update rate in Harvest' },
  { id: 2, type: 'Budget Breach', client: 'Sainsburys', severity: 'medium', description: 'Project at 92% budget utilization', action: 'Review with PM' },
  { id: 3, type: 'Billable Conflict', client: 'ADM', severity: 'high', description: 'Data ingestion marked as billable', action: 'Reclassify as exclusion' },
];

export const mockBudgetData: BudgetDatum[] = [
  { name: 'Used', value: 68, fill: '#3b82f6' },
  { name: 'Remaining', value: 32, fill: '#e5e7eb' },
];

export const mockClients: string[] = ['Arla', 'Sainsburys', 'ADM', 'McCain', 'Trewithen', 'Red Tractor'];

