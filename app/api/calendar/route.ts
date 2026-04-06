import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { format } from 'date-fns';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

interface RawEvent {
  id: string;
  name: string;
  time: string;
  datetime: string;
  category: string;
  day: string;
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch data from multiple tables in parallel
    const [showingsRes, workOrdersRes, voiceCallsRes, leasesRes, campaignsRes] =
      await Promise.all([
        // Showings
        supabase
          .from('showings')
          .select('id, prospect_name, scheduled_at, status, properties(name), units(unit_number)')
          .eq('org_id', ORG_ID)
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: true }),

        // Work orders with a scheduled date
        supabase
          .from('work_orders')
          .select('id, title, scheduled_date, priority, status, properties(name), units(unit_number)')
          .eq('org_id', ORG_ID)
          .not('scheduled_date', 'is', null)
          .order('scheduled_date', { ascending: true }),

        // Voice conversations
        supabase
          .from('conversations')
          .select('id, lead_name, created_at, channel')
          .eq('org_id', ORG_ID)
          .eq('channel', 'voice')
          .order('created_at', { ascending: false })
          .limit(200),

        // Leases expiring within 90 days from today
        supabase
          .from('leases')
          .select('id, lease_end, monthly_rent, status, tenants(first_name, last_name), units(unit_number, properties(name))')
          .eq('org_id', ORG_ID)
          .eq('status', 'active')
          .gte('lease_end', format(new Date(), 'yyyy-MM-dd'))
          .lte(
            'lease_end',
            format(
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              'yyyy-MM-dd',
            ),
          ),

        // Campaigns with a scheduled_at
        supabase
          .from('campaigns')
          .select('id, name, scheduled_at, status, channel')
          .eq('org_id', ORG_ID)
          .not('scheduled_at', 'is', null)
          .order('scheduled_at', { ascending: true }),
      ]);

    const rawEvents: RawEvent[] = [];

    // Process showings
    if (showingsRes.data) {
      for (const s of showingsRes.data as any[]) {
        const dt = new Date(s.scheduled_at);
        const propName = s.properties?.name || 'Property';
        const unitNum = s.units?.unit_number ? ` Unit ${s.units.unit_number}` : '';
        rawEvents.push({
          id: `showing-${s.id}`,
          name: `Showing: ${s.prospect_name || 'Prospect'} @ ${propName}${unitNum}`,
          time: format(dt, 'h:mm a'),
          datetime: s.scheduled_at,
          category: 'showing',
          day: format(dt, 'yyyy-MM-dd'),
        });
      }
    }

    // Process work orders
    if (workOrdersRes.data) {
      for (const wo of workOrdersRes.data as any[]) {
        const dt = new Date(wo.scheduled_date);
        const propName = wo.properties?.name || 'Property';
        const unitNum = wo.units?.unit_number ? ` Unit ${wo.units.unit_number}` : '';
        rawEvents.push({
          id: `wo-${wo.id}`,
          name: `${wo.priority === 'emergency' ? '🚨 ' : ''}Maintenance: ${wo.title} @ ${propName}${unitNum}`,
          time: '',
          datetime: wo.scheduled_date,
          category: 'maintenance',
          day: format(dt, 'yyyy-MM-dd'),
        });
      }
    }

    // Process voice calls
    if (voiceCallsRes.data) {
      for (const c of voiceCallsRes.data as any[]) {
        const dt = new Date(c.created_at);
        rawEvents.push({
          id: `call-${c.id}`,
          name: `Voice Call: ${c.lead_name || 'Unknown Caller'}`,
          time: format(dt, 'h:mm a'),
          datetime: c.created_at,
          category: 'call',
          day: format(dt, 'yyyy-MM-dd'),
        });
      }
    }

    // Process lease expirations
    if (leasesRes.data) {
      for (const l of leasesRes.data as any[]) {
        const dt = new Date(l.lease_end);
        const tenantName =
          l.tenants?.first_name && l.tenants?.last_name
            ? `${l.tenants.first_name} ${l.tenants.last_name}`
            : 'Tenant';
        const propName = l.units?.properties?.name || 'Property';
        const unitNum = l.units?.unit_number ? ` Unit ${l.units.unit_number}` : '';
        rawEvents.push({
          id: `lease-${l.id}`,
          name: `Lease Expires: ${tenantName} @ ${propName}${unitNum}`,
          time: '',
          datetime: l.lease_end,
          category: 'lease_expiration',
          day: format(dt, 'yyyy-MM-dd'),
        });
      }
    }

    // Process campaigns
    if (campaignsRes.data) {
      for (const camp of campaignsRes.data as any[]) {
        const dt = new Date(camp.scheduled_at);
        rawEvents.push({
          id: `campaign-${camp.id}`,
          name: `Campaign: ${camp.name} (${camp.channel || 'multi'})`,
          time: format(dt, 'h:mm a'),
          datetime: camp.scheduled_at,
          category: 'campaign',
          day: format(dt, 'yyyy-MM-dd'),
        });
      }
    }

    // Group by day
    const dayMap = new Map<string, RawEvent[]>();
    for (const evt of rawEvents) {
      const existing = dayMap.get(evt.day) || [];
      existing.push(evt);
      dayMap.set(evt.day, existing);
    }

    // Sort events within each day by datetime
    const events = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, evts]) => ({
        day,
        events: evts
          .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
          .map(({ day: _d, ...rest }) => rest),
      }));

    return NextResponse.json({ events });
  } catch (err: any) {
    console.error('[Calendar API Error]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
