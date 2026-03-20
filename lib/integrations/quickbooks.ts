/**
 * QuickBooks Online Integration
 * Exports financial data to QuickBooks for PM companies that use it.
 * Requires: OAuth 2.0 via Intuit Developer Portal
 */

export interface QBExportResult {
  exported: number;
  skipped: number;
  errors: string[];
}

export async function testQuickBooksConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  if (!credentials.client_id || !credentials.client_secret || !credentials.refresh_token) {
    return { success: false, error: 'Missing OAuth credentials (client_id, client_secret, refresh_token)' };
  }
  return { success: false, error: 'QuickBooks integration not yet implemented — requires Intuit Developer Portal OAuth setup' };
}

export async function exportTransactionsToQB(_orgId: string, _periodStart: string, _periodEnd: string): Promise<QBExportResult> {
  throw new Error('QuickBooks export not yet implemented');
}

export async function syncChartOfAccounts(_orgId: string): Promise<void> {
  throw new Error('QuickBooks chart of accounts sync not yet implemented');
}
