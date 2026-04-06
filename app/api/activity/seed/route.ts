import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

const SEED_ENTRIES = [
  {
    event_type: 'call_inbound',
    title: 'Inbound call from Maria Santos',
    description: 'Tenant called about parking spot reassignment at Sunset Ridge #204',
    severity: 'info',
    entity_type: 'conversation',
    created_at: hoursAgo(0.5),
    read: false,
  },
  {
    event_type: 'maintenance_created',
    title: 'New maintenance request — AC not cooling',
    description: 'Unit 312 at Desert Springs. Tenant reports AC blowing warm air.',
    severity: 'warning',
    entity_type: 'work_order',
    created_at: hoursAgo(1),
    read: false,
  },
  {
    event_type: 'rent_payment',
    title: 'Rent payment received — $1,450',
    description: 'James Wilson paid April rent for Unit 108, Sunset Ridge',
    severity: 'success',
    entity_type: 'payment',
    created_at: hoursAgo(2),
    read: false,
  },
  {
    event_type: 'ai_conversation',
    title: 'AI handled leasing inquiry',
    description: 'Prospect asked about 2BR availability. AI provided tour options and pricing.',
    severity: 'info',
    entity_type: 'conversation',
    created_at: hoursAgo(3),
    read: false,
  },
  {
    event_type: 'work_order_completed',
    title: 'Work order completed — Plumbing repair',
    description: 'Vendor ABC Plumbing fixed kitchen sink leak at Cactus Court #105',
    severity: 'success',
    entity_type: 'work_order',
    created_at: hoursAgo(4),
    read: false,
  },
  {
    event_type: 'lease_expiring',
    title: 'Lease expiring in 30 days',
    description: 'Sarah Johnson at Desert Springs #201 — lease ends April 28',
    severity: 'warning',
    entity_type: 'lease',
    created_at: hoursAgo(5),
    read: true,
  },
  {
    event_type: 'showing_scheduled',
    title: 'Showing scheduled — 2BR at Sunset Ridge',
    description: 'Tour booked for tomorrow at 2:00 PM with prospect David Kim',
    severity: 'info',
    entity_type: 'showing',
    created_at: hoursAgo(6),
    read: true,
  },
  {
    event_type: 'sms_outbound',
    title: 'Lease renewal reminder sent',
    description: '90-day renewal reminder sent to tenant Robert Chen at Unit 415',
    severity: 'info',
    entity_type: 'lease',
    created_at: hoursAgo(8),
    read: true,
  },
  {
    event_type: 'deal_stage_change',
    title: 'Deal moved to Due Diligence',
    description: '4820 N 32nd St — MAO $425K, moved from Evaluation to Due Diligence',
    severity: 'info',
    entity_type: 'deal',
    created_at: hoursAgo(10),
    read: true,
  },
  {
    event_type: 'collection_action',
    title: 'Late payment notice sent',
    description: 'Auto-sent 5-day late notice to Michael Brown, Unit 302 — $1,200 overdue',
    severity: 'critical',
    entity_type: 'payment',
    created_at: hoursAgo(12),
    read: true,
  },
  {
    event_type: 'tenant_created',
    title: 'New tenant application received',
    description: 'Emily Zhang applied for 1BR at Cactus Court. Background check pending.',
    severity: 'info',
    entity_type: 'tenant',
    created_at: hoursAgo(14),
    read: true,
  },
  {
    event_type: 'campaign_sent',
    title: 'Email campaign delivered',
    description: 'Spring renewal promo sent to 47 tenants — 68% open rate',
    severity: 'success',
    entity_type: 'campaign',
    created_at: hoursAgo(18),
    read: true,
  },
  {
    event_type: 'property_added',
    title: 'New property added',
    description: 'Mesa View Townhomes — 12 units, 85201. Import from AppFolio complete.',
    severity: 'success',
    entity_type: 'property',
    created_at: hoursAgo(22),
    read: true,
  },
  {
    event_type: 'work_order_assigned',
    title: 'Work order assigned to vendor',
    description: 'Electrical issue at Sunset Ridge #118 assigned to Spark Electric LLC',
    severity: 'info',
    entity_type: 'work_order',
    created_at: hoursAgo(26),
    read: true,
  },
  {
    event_type: 'showing_completed',
    title: 'Showing completed — positive feedback',
    description: 'Tour with Lisa Park at Desert Springs. Prospect rated 5/5, application sent.',
    severity: 'success',
    entity_type: 'showing',
    created_at: hoursAgo(30),
    read: true,
  },
  {
    event_type: 'sms_inbound',
    title: 'Tenant SMS received',
    description: 'Jake Torres: "Hey, the gate code isn\'t working again" — Cactus Court',
    severity: 'info',
    entity_type: 'conversation',
    created_at: hoursAgo(34),
    read: true,
  },
  {
    event_type: 'maintenance_updated',
    title: 'Maintenance priority escalated',
    description: 'Water heater leak at Unit 220 escalated to emergency priority',
    severity: 'critical',
    entity_type: 'work_order',
    created_at: hoursAgo(38),
    read: true,
  },
  {
    event_type: 'move_in_created',
    title: 'Move-in scheduled',
    description: 'New tenant Ana Rivera — move-in April 1 at Sunset Ridge #310',
    severity: 'info',
    entity_type: 'tenant',
    created_at: hoursAgo(42),
    read: true,
  },
  {
    event_type: 'lease_renewal_sent',
    title: 'Lease renewal offer sent',
    description: '12-month renewal at $1,525/mo (+3.4%) sent to Kevin Park, Unit 402',
    severity: 'info',
    entity_type: 'lease',
    created_at: hoursAgo(44),
    read: true,
  },
  {
    event_type: 'call_outbound',
    title: 'Outbound call — vendor follow-up',
    description: 'Called Premier HVAC to confirm Tuesday appointment for Unit 312 AC repair',
    severity: 'info',
    entity_type: 'conversation',
    created_at: hoursAgo(46),
    read: true,
  },
];

export async function POST() {
  const supabase = createAdminClient();

  // Clear existing seed data
  await supabase.from('activity_feed').delete().eq('org_id', ORG_ID);

  const rows = SEED_ENTRIES.map((entry) => ({
    ...entry,
    org_id: ORG_ID,
    metadata: {},
  }));

  const { data, error } = await supabase
    .from('activity_feed')
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ seeded: data?.length || 0 });
}
