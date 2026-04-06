import { createAdminClient } from '@/lib/supabase/admin';

export type ActivityEventType =
  | 'call_inbound' | 'call_outbound'
  | 'sms_inbound' | 'sms_outbound'
  | 'maintenance_created' | 'maintenance_updated'
  | 'rent_payment' | 'lease_expiring' | 'lease_renewal_sent'
  | 'showing_scheduled' | 'showing_completed'
  | 'work_order_assigned' | 'work_order_completed'
  | 'collection_action' | 'move_in_created'
  | 'campaign_sent' | 'deal_stage_change'
  | 'ai_conversation' | 'tenant_created' | 'property_added';

export type ActivitySeverity = 'info' | 'success' | 'warning' | 'critical';

export type ActivityEntityType =
  | 'conversation' | 'work_order' | 'lease' | 'tenant'
  | 'property' | 'deal' | 'campaign' | 'showing' | 'payment';

export interface LogActivityParams {
  orgId: string;
  eventType: ActivityEventType;
  title: string;
  description?: string;
  severity?: ActivitySeverity;
  entityType?: ActivityEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget activity logger.
 * Inserts into activity_feed using service_role — do NOT await.
 */
export function logActivity(params: LogActivityParams): void {
  const supabase = createAdminClient();

  supabase
    .from('activity_feed')
    .insert({
      org_id: params.orgId,
      event_type: params.eventType,
      title: params.title,
      description: params.description ?? null,
      severity: params.severity ?? 'info',
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
      read: false,
    })
    .then(({ error }) => {
      if (error) console.error('[activity-log] Insert failed:', error.message);
    });
}
