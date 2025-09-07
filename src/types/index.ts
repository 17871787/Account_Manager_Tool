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
  metadata?: any;
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

export interface TimeEntryRecord {
  id: string;
  person_id: string;
  client_id: string;
  project_id: string;
  task_id: string;
  billable_rate: number;
  billable_flag: boolean;
  cost_rate: number;
  cost_amount: number;
  hours: number;
  date: Date;
  task_name?: string;
  task_category?: string;
  person_name?: string;
}

export interface RatePolicyRecord {
  rate: number;
}

export interface HarvestProject {
  id: string;
  name: string;
  is_active: boolean;
}

export interface HarvestClient {
  id: string;
  name: string;
  is_active: boolean;
}

export interface HarvestTask {
  id: string;
  name: string;
  billable_by_default: boolean;
  is_active: boolean;
}

export interface HarvestUser {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export interface HarvestProjectBudget {
  budget: number;
  budgetBy: string;
  budgetIsMonthly: boolean;
}

export interface HarvestAPITimeEntry {
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

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount: string;
    closedate: string;
    dealstage: string;
    pipeline: string;
    hs_arr: string;
    hs_mrr: string;
    hs_tcv: string;
    hs_acv: string;
  };
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name: string;
    domain: string;
    industry: string;
    annualrevenue: string;
    numberofemployees: string;
    lifecyclestage: string;
  };
}

export interface HubSpotAssociation {
  id: string;
}

export interface RevenueMetrics {
  companyName: string;
  annualRevenue: number;
  closedRevenue: number;
  pipelineValue: number;
  dealCount: number;
  closedDealCount: number;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
}