import type { IntegrationPlatform, SyncEntityType } from '@/lib/types';

export interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errored: number;
  errors: string[];
}

export interface PMConnector {
  platform: IntegrationPlatform;
  testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }>;
  syncProperties(orgId: string): Promise<SyncResult>;
  syncUnits(orgId: string): Promise<SyncResult>;
  syncTenants(orgId: string): Promise<SyncResult>;
  syncLeases(orgId: string): Promise<SyncResult>;
  syncWorkOrders(orgId: string): Promise<SyncResult>;
}

export function emptySyncResult(): SyncResult {
  return { fetched: 0, created: 0, updated: 0, skipped: 0, errored: 0, errors: [] };
}
