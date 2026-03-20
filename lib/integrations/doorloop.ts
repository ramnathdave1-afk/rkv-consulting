import type { PMConnector, SyncResult } from './base-connector';

export class DoorLoopConnector implements PMConnector {
  platform = 'doorloop' as unknown as 'appfolio';

  async testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    if (!credentials.api_key) return { success: false, error: 'Missing api_key' };
    return { success: false, error: 'DoorLoop integration not yet implemented' };
  }

  async syncProperties(): Promise<SyncResult> { throw new Error('DoorLoop syncProperties not yet implemented'); }
  async syncUnits(): Promise<SyncResult> { throw new Error('DoorLoop syncUnits not yet implemented'); }
  async syncTenants(): Promise<SyncResult> { throw new Error('DoorLoop syncTenants not yet implemented'); }
  async syncLeases(): Promise<SyncResult> { throw new Error('DoorLoop syncLeases not yet implemented'); }
  async syncWorkOrders(): Promise<SyncResult> { throw new Error('DoorLoop syncWorkOrders not yet implemented'); }
}
