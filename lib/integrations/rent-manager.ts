import type { PMConnector, SyncResult } from './base-connector';

export class RentManagerConnector implements PMConnector {
  platform = 'rent_manager' as const;

  async testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!credentials.api_key) return { success: false, error: 'Missing api_key' };
    return { success: false, error: 'Rent Manager integration not yet implemented' };
  }

  async syncProperties(): Promise<SyncResult> { throw new Error('Rent Manager syncProperties not yet implemented'); }
  async syncUnits(): Promise<SyncResult> { throw new Error('Rent Manager syncUnits not yet implemented'); }
  async syncTenants(): Promise<SyncResult> { throw new Error('Rent Manager syncTenants not yet implemented'); }
  async syncLeases(): Promise<SyncResult> { throw new Error('Rent Manager syncLeases not yet implemented'); }
  async syncWorkOrders(): Promise<SyncResult> { throw new Error('Rent Manager syncWorkOrders not yet implemented'); }
}
