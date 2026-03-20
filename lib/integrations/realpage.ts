import type { PMConnector, SyncResult } from './base-connector';

export class RealPageConnector implements PMConnector {
  platform = 'appfolio' as const; // placeholder until IntegrationPlatform type is extended

  async testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!credentials.api_key) return { success: false, error: 'Missing api_key' };
    return { success: false, error: 'RealPage integration not yet implemented' };
  }

  async syncProperties(): Promise<SyncResult> { throw new Error('RealPage syncProperties not yet implemented'); }
  async syncUnits(): Promise<SyncResult> { throw new Error('RealPage syncUnits not yet implemented'); }
  async syncTenants(): Promise<SyncResult> { throw new Error('RealPage syncTenants not yet implemented'); }
  async syncLeases(): Promise<SyncResult> { throw new Error('RealPage syncLeases not yet implemented'); }
  async syncWorkOrders(): Promise<SyncResult> { throw new Error('RealPage syncWorkOrders not yet implemented'); }
}
