import type { PMConnector, SyncResult } from './base-connector';

export class EntrataConnector implements PMConnector {
  platform = 'appfolio' as const; // placeholder

  async testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!credentials.api_key) return { success: false, error: 'Missing api_key' };
    return { success: false, error: 'Entrata integration not yet implemented' };
  }

  async syncProperties(): Promise<SyncResult> { throw new Error('Entrata syncProperties not yet implemented'); }
  async syncUnits(): Promise<SyncResult> { throw new Error('Entrata syncUnits not yet implemented'); }
  async syncTenants(): Promise<SyncResult> { throw new Error('Entrata syncTenants not yet implemented'); }
  async syncLeases(): Promise<SyncResult> { throw new Error('Entrata syncLeases not yet implemented'); }
  async syncWorkOrders(): Promise<SyncResult> { throw new Error('Entrata syncWorkOrders not yet implemented'); }
}
