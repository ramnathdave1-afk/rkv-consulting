import type { PMConnector, SyncResult } from './base-connector';

export class ResManConnector implements PMConnector {
  platform = 'resman' as const;

  async testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!credentials.api_key) return { success: false, error: 'Missing api_key' };
    // TODO: Test ResMan API connection
    return { success: false, error: 'ResMan integration not yet implemented — awaiting API credentials' };
  }

  async syncProperties(): Promise<SyncResult> { throw new Error('ResMan syncProperties not yet implemented'); }
  async syncUnits(): Promise<SyncResult> { throw new Error('ResMan syncUnits not yet implemented'); }
  async syncTenants(): Promise<SyncResult> { throw new Error('ResMan syncTenants not yet implemented'); }
  async syncLeases(): Promise<SyncResult> { throw new Error('ResMan syncLeases not yet implemented'); }
  async syncWorkOrders(): Promise<SyncResult> { throw new Error('ResMan syncWorkOrders not yet implemented'); }
}
