/**
 * Audit Logging for SOC 2 Compliance
 * Logs all significant actions for security review.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export async function logAuditEvent(params: {
  orgId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('audit_log').insert({
    org_id: params.orgId,
    user_id: params.userId || null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    details: params.details || {},
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
  });
}
