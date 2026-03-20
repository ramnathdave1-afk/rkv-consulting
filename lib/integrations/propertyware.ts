import type { PMConnector, SyncResult } from './base-connector';

export class PropertywareConnector implements PMConnector {
  platform = 'propertyware' as const;

  async testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!credentials.api_key) return { success: false, error: 'Missing api_key' };
    // TODO: Test Propertyware REST API connection
    return { success: false, error: 'Propertyware integration not yet implemented — awaiting API credentials' };
  }

  async syncProperties(): Promise<SyncResult> { throw new Error('Propertyware syncProperties not yet implemented'); }
  async syncUnits(): Promise<SyncResult> { throw new Error('Propertyware syncUnits not yet implemented'); }
  async syncTenants(): Promise<SyncResult> { throw new Error('Propertyware syncTenants not yet implemented'); }
  async syncLeases(): Promise<SyncResult> { throw new Error('Propertyware syncLeases not yet implemented'); }
  async syncWorkOrders(): Promise<SyncResult> { throw new Error('Propertyware syncWorkOrders not yet implemented'); }
}
