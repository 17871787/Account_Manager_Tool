export interface HarvestProject {
  id: number;
  name: string;
  code?: string;
  clientId: number;
  isActive: boolean;
}

export interface HarvestClient {
  id: number;
  name: string;
  isActive: boolean;
}

export interface HarvestTask {
  id: number;
  name: string;
  billableByDefault: boolean;
  defaultHourlyRate?: number;
  isActive: boolean;
}

export interface HarvestUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}
