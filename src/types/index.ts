export interface AppError extends Error {
  status?: number;
}

export interface HarvestTimeEntry {
  entryId: string;
  date: Date;
  client: string;
  project: string;
  task: string;
  notes: string;
  hours: number;
  billableFlag: boolean;
  invoicedFlag: boolean;
  firstName: string;
  lastName: string;
  role: string;
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

export interface RatePolicyRow {
  rate: number;
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
  entityType: string;
  entityId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  helpdeskTicketId?: string;
  metadata?: Record<string, unknown>;
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
  oldValue?: unknown;
  newValue?: unknown;
  helpdeskTicketId?: string;
}

export interface BudgetVsBurn {
  budget: number;
  budgetHours: number;
  actualHours: number;
  actualCost: number;
  monthProgress: number;
  hoursUtilization: number;
  costUtilization: number;
  burnRate: number;
  forecastToCompletion: number;
  status: 'over-budget' | 'at-risk' | 'on-track';
}

export interface MonthlyReportProject {
  projectName: string;
  profitability?: ProfitabilityMetric;
  budgetVsBurn?: BudgetVsBurn | null;
}

export interface MonthlyReport {
  clientId: string;
  month: string;
  projects: MonthlyReportProject[];
  generatedAt: Date;
}

export interface TimeEntryRecord {
  id: string;
  person_id: string;
  client_id: string;
  project_id: string;
  task_id: string;
  date: Date;
  hours: number;
  billable_rate: number;
  cost_rate: number;
  billable_flag: boolean;
  task_name?: string;
}

export interface HarvestTimeEntryApiResponse {
  id: number;
  spent_date: string;
  client?: { name: string };
  project?: { name: string };
  task?: { name: string };
  notes?: string;
  hours: number;
  billable: boolean;
  is_locked: boolean;
  user?: { first_name: string; last_name: string };
  user_assignment?: { role: string };
  billable_rate?: number;
  cost_rate?: number;
  external_reference?: { id: string };
}
