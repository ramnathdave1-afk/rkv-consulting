import type { PMConnector, SyncResult } from './base-connector';

export class AppFolioConnector implements PMConnector {
  platform = 'appfolio' as const;

  async testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!credentials.client_id || !credentials.client_secret) {
      return { success: false, error: 'Missing client_id or client_secret' };
    }
    // TODO: Make test API call to AppFolio OAuth endpoint
    return { success: false, error: 'AppFolio integration not yet implemented' };
  }

  async syncProperties(): Promise<SyncResult> {
    throw new Error('AppFolio syncProperties not yet implemented');
  }

  async syncUnits(): Promise<SyncResult> {
    throw new Error('AppFolio syncUnits not yet implemented');
  }

  async syncTenants(): Promise<SyncResult> {
    throw new Error('AppFolio syncTenants not yet implemented');
  }

  async syncLeases(): Promise<SyncResult> {
    throw new Error('AppFolio syncLeases not yet implemented');
  }

  async syncWorkOrders(): Promise<SyncResult> {
    throw new Error('AppFolio syncWorkOrders not yet implemented');
  }
}
