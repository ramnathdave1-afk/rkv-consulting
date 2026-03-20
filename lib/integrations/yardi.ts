import type { PMConnector, SyncResult } from './base-connector';

export class YardiConnector implements PMConnector {
  platform = 'yardi' as const;

  async testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!credentials.client_id || !credentials.client_secret) return { success: false, error: 'Missing OAuth credentials' };
    return { success: false, error: 'Yardi integration not yet implemented' };
  }

  async syncProperties(): Promise<SyncResult> { throw new Error('Yardi syncProperties not yet implemented'); }
  async syncUnits(): Promise<SyncResult> { throw new Error('Yardi syncUnits not yet implemented'); }
  async syncTenants(): Promise<SyncResult> { throw new Error('Yardi syncTenants not yet implemented'); }
  async syncLeases(): Promise<SyncResult> { throw new Error('Yardi syncLeases not yet implemented'); }
  async syncWorkOrders(): Promise<SyncResult> { throw new Error('Yardi syncWorkOrders not yet implemented'); }
}
