/**
 * Socket.io Realtime Event Stubs
 * Defines event types for live dashboard updates and conversation push notifications.
 *
 * In production, this would use Socket.io server + client.
 * For Vercel deployment, we use Supabase Realtime as the WebSocket layer instead,
 * since Vercel serverless doesn't support persistent WebSocket connections.
 *
 * This file defines the event contract that both approaches implement.
 */

// ── Event Types ──

export type RealtimeEventType =
  | 'conversation:new_message'
  | 'conversation:escalated'
  | 'conversation:status_change'
  | 'work_order:created'
  | 'work_order:status_change'
  | 'work_order:vendor_response'
  | 'work_order:completed'
  | 'showing:scheduled'
  | 'showing:reminder'
  | 'lease:renewal_response'
  | 'deal:stage_change'
  | 'deal:scored'
  | 'alert:variance'
  | 'alert:delinquency'
  | 'report:generated'
  | 'sync:completed'
  | 'sync:error';

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  org_id: string;
  payload: T;
  timestamp: string;
}

// ── Payload Types ──

export interface NewMessagePayload {
  conversation_id: string;
  message_id: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'tenant' | 'staff' | 'ai' | 'system';
  content_preview: string;
  channel: string;
}

export interface WorkOrderPayload {
  work_order_id: string;
  property_name: string;
  title: string;
  status: string;
  priority: string;
  vendor_name?: string;
}

export interface AlertPayload {
  alert_id: string;
  alert_type: string;
  severity: string;
  message: string;
  property_id?: string;
}

// ── Supabase Realtime Helper ──
// Use Supabase's built-in realtime subscriptions instead of Socket.io on Vercel

export function getRealtimeChannelName(orgId: string, topic: string): string {
  return `org:${orgId}:${topic}`;
}

export function formatRealtimeEvent<T>(type: RealtimeEventType, orgId: string, payload: T): RealtimeEvent<T> {
  return {
    type,
    org_id: orgId,
    payload,
    timestamp: new Date().toISOString(),
  };
}

// ── Broadcast Helper (for API routes to push events) ──

export async function broadcastEvent<T>(
  supabaseAdmin: { channel: (name: string) => { send: (msg: { type: string; event: string; payload: unknown }) => Promise<unknown> } },
  orgId: string,
  type: RealtimeEventType,
  payload: T
): Promise<void> {
  const channel = supabaseAdmin.channel(getRealtimeChannelName(orgId, 'events'));
  await channel.send({
    type: 'broadcast',
    event: type,
    payload: formatRealtimeEvent(type, orgId, payload),
  });
}
