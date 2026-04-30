/**
 * Comprehensive audit logging.
 *
 * Writes to the new `audit_logs` table (see migration 20260424_sla.sql).
 * The older `audit_log` table + `logAuditEvent` helper still exist for
 * backwards-compatible callers; new mutations should call `logAuditEvent`
 * from this file.
 *
 * Failures are swallowed and logged to console — audit logging must never
 * block a primary mutation.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { NextRequest } from 'next/server';

export type AuditAction =
  // CRUD
  | 'create'
  | 'update'
  | 'delete'
  // Auth
  | 'login'
  | 'logout'
  | 'sso_attempt'
  | 'sso_success'
  | 'sso_failure'
  | 'password_change'
  // Team
  | 'invite_user'
  | 'change_role'
  | 'remove_user'
  // Integrations
  | 'integration_connect'
  | 'integration_disconnect'
  | 'integration_sync'
  // Data access
  | 'view'
  | 'export'
  | 'download'
  // Billing
  | 'billing_update'
  | 'subscription_change'
  // Generic
  | 'state_change';

export type AuditResourceType =
  | 'property'
  | 'unit'
  | 'lease'
  | 'tenant'
  | 'work_order'
  | 'vendor'
  | 'user'
  | 'role'
  | 'integration'
  | 'sso_configuration'
  | 'sla_policy'
  | 'subscription'
  | 'location'
  | 'branding'
  | 'audit_log'
  | 'export'
  | 'deal'
  | 'showing'
  | 'report'
  | string;

export interface AuditLogParams {
  orgId: string;
  userId?: string | null;
  action: AuditAction | string;
  resource_type?: AuditResourceType;
  resource_id?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export async function logAuditEvent(opts: AuditLogParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('audit_logs').insert({
      org_id: opts.orgId,
      user_id: opts.userId ?? null,
      action: opts.action,
      resource_type: opts.resource_type ?? null,
      resource_id: opts.resource_id ?? null,
      changes: opts.changes ?? {},
      metadata: opts.metadata ?? {},
      ip_address: opts.ip_address ?? null,
      user_agent: opts.user_agent ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Audit logging must never break the primary request.
    // eslint-disable-next-line no-console
    console.error('[audit] logAuditEvent failed', err);
  }
}

/**
 * Compute a `changes` diff between a previous and next record. Only fields
 * present in either object that differ are included.
 */
export function diffChanges<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: T | null | undefined,
  ignoreKeys: string[] = ['updated_at'],
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  for (const k of keys) {
    if (ignoreKeys.includes(k)) continue;
    const a = before?.[k];
    const b = after?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out[k] = { from: a, to: b };
    }
  }
  return out;
}

/** Pull IP + user agent from a NextRequest for audit metadata. */
export function requestContext(req: NextRequest | Request): {
  ip_address?: string;
  user_agent?: string;
} {
  const headers = req.headers;
  const ip =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    undefined;
  const ua = headers.get('user-agent') ?? undefined;
  return { ip_address: ip, user_agent: ua };
}
