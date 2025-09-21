import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

export interface Deal {
  id?: string;
  name: string;
  stage?: string;
  amount?: number;
  closeDate?: string;
  owner?: string;
  company?: string;
  status?: string;
  [key: string]: unknown;
}

const STORAGE_ENV_KEY = 'HUBSPOT_DEALS_STORAGE_DIR';
const STORAGE_FILENAME = 'imported_deals.json';

function getStorageDirectory() {
  const baseDir =
    process.env[STORAGE_ENV_KEY] ?? path.join(os.tmpdir(), 'hubspot-deals');
  return baseDir;
}

function getStorageFilePath() {
  return path.join(getStorageDirectory(), STORAGE_FILENAME);
}

async function ensureStorageDirectory() {
  await fs.mkdir(getStorageDirectory(), { recursive: true });
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === 'object' && 'code' in error);
}

export async function loadStoredDeals(): Promise<Deal[]> {
  try {
    const data = await fs.readFile(getStorageFilePath(), 'utf-8');
    return JSON.parse(data) as Deal[];
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function storeDeals(deals: Deal[]): Promise<void> {
  await ensureStorageDirectory();
  await fs.writeFile(
    getStorageFilePath(),
    JSON.stringify(deals, null, 2),
    'utf-8'
  );
}

export async function clearStoredDeals(): Promise<void> {
  try {
    await fs.unlink(getStorageFilePath());
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}
