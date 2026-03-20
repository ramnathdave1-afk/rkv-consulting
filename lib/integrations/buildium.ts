import type { PMConnector, SyncResult } from './base-connector';

export class BuildiumConnector implements PMConnector {
  platform = 'buildium' as const;

  async testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!credentials.api_key) {
      return { success: false, error: 'Missing api_key' };
    }
    // TODO: Make test API call to Buildium REST API
    return { success: false, error: 'Buildium integration not yet implemented' };
  }

  async syncProperties(): Promise<SyncResult> {
    throw new Error('Buildium syncProperties not yet implemented');
  }

  async syncUnits(): Promise<SyncResult> {
    throw new Error('Buildium syncUnits not yet implemented');
  }

  async syncTenants(): Promise<SyncResult> {
    throw new Error('Buildium syncTenants not yet implemented');
  }

  async syncLeases(): Promise<SyncResult> {
    throw new Error('Buildium syncLeases not yet implemented');
  }

  async syncWorkOrders(): Promise<SyncResult> {
    throw new Error('Buildium syncWorkOrders not yet implemented');
  }
}
