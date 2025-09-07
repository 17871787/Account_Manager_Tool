export interface ProfitabilityPoint {
  month: string;
  revenue: number;
  cost: number;
  margin: number;
}

export interface ExceptionItem {
  id: number;
  type: string;
  client: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  action: string;
}

export interface BudgetDatum {
  name: string;
  value: number;
  fill: string;
}

export type SyncSource = 'harvest' | 'hubspot' | 'sft';

export interface LastSync {
  harvest: Date | null;
  hubspot: Date | null;
  sft: Date | null;
}

export interface SyncError {
  source: string;
  message: string;
}

