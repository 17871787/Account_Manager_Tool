export interface HarvestTimeEntry {
  entryId: string;
  date: Date;
  client: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  task: {
    id: string;
    name: string;
  };
  notes: string;
  hours: number;
  billableFlag: boolean;
  invoicedFlag: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  billableRate: number;
  billableAmount: number;
  costRate: number;
  costAmount: number;
  currency: string;
  externalRef?: string;
}

export interface SFTRevenue {
  client: string;
  project: string;
  month: string;
  recognisedRevenue: number;
}

export interface Client {
  id: string;
  name: string;
  harvestId?: string;
  sftId?: string;
  hubspotId?: string;
  isActive: boolean;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  harvestId?: string;
  budget: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface Task {
  id: string;
  name: string;
  harvestId?: string;
  defaultBillable: boolean;
  category: 'billable' | 'exclusion' | 'non-billable';
  isActive: boolean;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  harvestId?: string;
  defaultCostRate: number;
  isActive: boolean;
}

export interface RatePolicy {
  id: string;
  personId: string;
  clientId: string;
  rate: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface ProfitabilityMetric {
  month: string;
  client: string;
  project: string;
  billableCost: number;
  exclusionCost: number;
  recognisedRevenue: number;
  margin: number;
  marginPercentage: number;
  exceptionsCount: number;
}

export interface Exception {
  id: string;
  entryId?: string;
  type: 'rate_mismatch' | 'billable_conflict' | 'budget_breach' | 'deprecated_task' | 'missing_rate';
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestedAction: string;
  entityType: 'time_entry' | 'project';
  entityId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  helpdeskTicketId?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export interface BudgetTracking {
  projectId: string;
  month: string;
  budgetedHours: number;
  actualHours: number;
  budgetedCost: number;
  actualCost: number;
  burnRate: number;
  forecastToCompletion: number;
}

export interface InvoiceExport {
  client: string;
  project: string;
  period: string;
  billableLines: InvoiceLine[];
  exclusionsSummary: ExclusionSummary;
  totalBillable: number;
  generatedAt: Date;
  generatedBy: string;
}

export interface InvoiceLine {
  task: string;
  hours: number;
  rate: number;
  amount: number;
  notes?: string;
}

export interface ExclusionSummary {
  totalHours: number;
  totalCost: number;
  coveredBySubscription: boolean;
  details: Array<{
    task: string;
    hours: number;
    cost: number;
  }>;
}

export type UserRole = 'admin' | 'finance' | 'account_manager' | 'ops' | 'leadership';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  assignedClients: string[];
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  helpdeskTicketId?: string;
}