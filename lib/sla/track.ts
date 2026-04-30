/**
 * SLA tracking helpers.
 *
 * Lifecycle:
 *   startSlaTracking(...)  -> creates sla_event row with created_at=now
 *   recordAcknowledgment   -> stamps acknowledged_at + breach flag
 *   recordFirstResponse    -> stamps first_response_at + breach flag
 *   recordResolution       -> stamps resolved_at + breach flag
 *
 * All breach flags are computed against the policy that was bound at start
 * time (sla_events.policy_id). Any helper is safe to call multiple times —
 * already-stamped fields are skipped.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type SlaResourceType =
  | 'work_order'
  | 'tenant_message'
  | 'maintenance_request'
  | 'lease_inquiry';

export type SlaPriority = 'emergency' | 'high' | 'standard' | 'low';

interface SlaPolicyRow {
  id: string;
  acknowledge_within_min: number | null;
  first_response_within_min: number | null;
  resolve_within_min: number | null;
}

interface SlaEventRow {
  id: string;
  created_at: string;
  policy_id: string | null;
  acknowledged_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  sla_policies: SlaPolicyRow | null;
}

async function findPolicy(
  orgId: string,
  resourceType: SlaResourceType,
  priority?: SlaPriority,
): Promise<SlaPolicyRow | null> {
  const supabase = createAdminClient();

  // 1) priority-specific match
  if (priority) {
    const { data } = await supabase
      .from('sla_policies')
      .select('id, acknowledge_within_min, first_response_within_min, resolve_within_min')
      .eq('org_id', orgId)
      .eq('resource_type', resourceType)
      .eq('priority', priority)
      .eq('enabled', true)
      .limit(1)
      .maybeSingle();
    if (data) return data as SlaPolicyRow;
  }

  // 2) catch-all (priority is null)
  const { data } = await supabase
    .from('sla_policies')
    .select('id, acknowledge_within_min, first_response_within_min, resolve_within_min')
    .eq('org_id', orgId)
    .eq('resource_type', resourceType)
    .is('priority', null)
    .eq('enabled', true)
    .limit(1)
    .maybeSingle();
  return (data as SlaPolicyRow) || null;
}

export async function startSlaTracking(opts: {
  orgId: string;
  resourceType: SlaResourceType;
  resourceId: string;
  priority?: SlaPriority;
}): Promise<void> {
  const supabase = createAdminClient();

  // Don't double-create if a tracking row already exists
  const { data: existing } = await supabase
    .from('sla_events')
    .select('id')
    .eq('resource_type', opts.resourceType)
    .eq('resource_id', opts.resourceId)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const policy = await findPolicy(opts.orgId, opts.resourceType, opts.priority);

  await supabase.from('sla_events').insert({
    org_id: opts.orgId,
    resource_type: opts.resourceType,
    resource_id: opts.resourceId,
    policy_id: policy?.id ?? null,
    priority: opts.priority ?? null,
    created_at: new Date().toISOString(),
  });
}

async function loadEvent(
  resourceType: string,
  resourceId: string,
): Promise<SlaEventRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('sla_events')
    .select(
      'id, created_at, policy_id, acknowledged_at, first_response_at, resolved_at, sla_policies(id, acknowledge_within_min, first_response_within_min, resolve_within_min)',
    )
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  // Supabase returns embedded relations as arrays in some configs; normalize.
  const policy = Array.isArray((data as { sla_policies?: unknown }).sla_policies)
    ? ((data as unknown as { sla_policies: SlaPolicyRow[] }).sla_policies[0] ?? null)
    : ((data as unknown as { sla_policies: SlaPolicyRow | null }).sla_policies ?? null);
  return { ...(data as Omit<SlaEventRow, 'sla_policies'>), sla_policies: policy };
}

function elapsedMinutes(fromIso: string): number {
  return (Date.now() - new Date(fromIso).getTime()) / 60_000;
}

export async function recordAcknowledgment(
  resourceType: string,
  resourceId: string,
): Promise<void> {
  const event = await loadEvent(resourceType, resourceId);
  if (!event || event.acknowledged_at) return;

  const target = event.sla_policies?.acknowledge_within_min ?? null;
  const elapsed = elapsedMinutes(event.created_at);
  const breached = target ? elapsed > target : false;

  const supabase = createAdminClient();
  await supabase
    .from('sla_events')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledge_breached: breached,
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.id);
}

export async function recordFirstResponse(
  resourceType: string,
  resourceId: string,
): Promise<void> {
  const event = await loadEvent(resourceType, resourceId);
  if (!event || event.first_response_at) return;

  const target = event.sla_policies?.first_response_within_min ?? null;
  const elapsed = elapsedMinutes(event.created_at);
  const breached = target ? elapsed > target : false;

  const supabase = createAdminClient();
  await supabase
    .from('sla_events')
    .update({
      first_response_at: new Date().toISOString(),
      first_response_breached: breached,
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.id);
}

export async function recordResolution(
  resourceType: string,
  resourceId: string,
): Promise<void> {
  const event = await loadEvent(resourceType, resourceId);
  if (!event || event.resolved_at) return;

  const target = event.sla_policies?.resolve_within_min ?? null;
  const elapsed = elapsedMinutes(event.created_at);
  const breached = target ? elapsed > target : false;

  const supabase = createAdminClient();
  await supabase
    .from('sla_events')
    .update({
      resolved_at: new Date().toISOString(),
      resolve_breached: breached,
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.id);
}

/** Default SLA policies — used to seed an org or as suggested defaults in UI. */
export const DEFAULT_SLA_POLICIES: Array<{
  name: string;
  resource_type: SlaResourceType;
  priority: SlaPriority | null;
  acknowledge_within_min: number;
  first_response_within_min: number;
  resolve_within_min: number;
}> = [
  {
    name: 'Emergency work orders',
    resource_type: 'work_order',
    priority: 'emergency',
    acknowledge_within_min: 30,
    first_response_within_min: 30,
    resolve_within_min: 240, // 4h
  },
  {
    name: 'High-priority work orders',
    resource_type: 'work_order',
    priority: 'high',
    acknowledge_within_min: 120,
    first_response_within_min: 120,
    resolve_within_min: 1440, // 24h
  },
  {
    name: 'Standard work orders',
    resource_type: 'work_order',
    priority: 'standard',
    acknowledge_within_min: 1440,
    first_response_within_min: 1440,
    resolve_within_min: 4320, // 72h
  },
  {
    name: 'Low-priority work orders',
    resource_type: 'work_order',
    priority: 'low',
    acknowledge_within_min: 4320,
    first_response_within_min: 4320,
    resolve_within_min: 10080, // 7d
  },
  {
    name: 'Tenant messages — first response',
    resource_type: 'tenant_message',
    priority: null,
    acknowledge_within_min: 30,
    first_response_within_min: 30,
    resolve_within_min: 1440,
  },
  {
    name: 'Lease inquiries',
    resource_type: 'lease_inquiry',
    priority: null,
    acknowledge_within_min: 60,
    first_response_within_min: 60,
    resolve_within_min: 2880,
  },
];
