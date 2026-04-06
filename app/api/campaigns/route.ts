import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAudience } from '@/lib/campaigns/audience-resolver';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

/**
 * GET /api/campaigns — List all campaigns with aggregated stats.
 */
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let query = supabase
    .from('campaigns')
    .select(`
      *,
      campaign_recipients ( id, status )
    `)
    .eq('org_id', ORG_ID)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: campaigns, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate stats per campaign
  const result = (campaigns || []).map((c: any) => {
    const recipients = c.campaign_recipients || [];
    const total = recipients.length;
    const sentCount = recipients.filter((r: any) => r.status === 'sent' || r.status === 'delivered').length;
    const deliveredCount = recipients.filter((r: any) => r.status === 'delivered').length;
    const failedCount = recipients.filter((r: any) => r.status === 'failed').length;

    return {
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      subject: c.subject,
      message_body: c.message_body,
      audience_filter: c.audience_filter,
      recipients_count: total,
      sent_count: c.sent_count ?? sentCount,
      delivered_count: c.delivered_count ?? deliveredCount,
      failed_count: c.failed_count ?? failedCount,
      scheduled_at: c.scheduled_at,
      completed_at: c.completed_at,
      created_at: c.created_at,
    };
  });

  // Client-side search filter
  let filtered = result;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c: any) => c.name?.toLowerCase().includes(q) || c.subject?.toLowerCase().includes(q),
    );
  }

  // Compute KPIs
  const totalCampaigns = filtered.length;
  const activeCampaigns = filtered.filter(
    (c: any) => c.status === 'active' || c.status === 'sending' || c.status === 'scheduled',
  ).length;
  const totalRecipientsReached = filtered.reduce(
    (sum: number, c: any) => sum + (c.delivered_count || 0),
    0,
  );

  return NextResponse.json({
    campaigns: filtered,
    kpis: {
      total: totalCampaigns,
      active: activeCampaigns,
      recipients_reached: totalRecipientsReached,
    },
  });
}

/**
 * POST /api/campaigns — Create a new campaign, resolve audience, insert recipients.
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  const body = await request.json();
  const {
    name,
    channel,
    subject,
    message_body,
    audience_filter,
    scheduled_at,
  } = body;

  if (!name || !channel || !message_body) {
    return NextResponse.json(
      { error: 'name, channel, and message_body are required' },
      { status: 400 },
    );
  }

  // Resolve audience
  const audience = await resolveAudience(ORG_ID, audience_filter || {});

  if (audience.length === 0) {
    return NextResponse.json(
      { error: 'No matching recipients found for the given audience filters' },
      { status: 400 },
    );
  }

  // Determine initial status
  const status = scheduled_at ? 'scheduled' : 'draft';

  // Create campaign
  const { data: campaign, error: cErr } = await supabase
    .from('campaigns')
    .insert({
      org_id: ORG_ID,
      name,
      channel,
      subject: subject || null,
      message_body,
      audience_filter: audience_filter || {},
      status,
      scheduled_at: scheduled_at || null,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
    })
    .select()
    .single();

  if (cErr || !campaign) {
    return NextResponse.json(
      { error: cErr?.message || 'Failed to create campaign' },
      { status: 500 },
    );
  }

  // Insert recipients
  const recipientRows = audience.map((m) => ({
    campaign_id: campaign.id,
    tenant_id: m.tenant_id,
    contact_value: channel === 'sms' ? m.phone : channel === 'email' ? m.email : m.email || m.phone,
    channel,
    status: 'pending',
  }));

  const { error: rErr } = await supabase
    .from('campaign_recipients')
    .insert(recipientRows);

  if (rErr) {
    return NextResponse.json(
      { error: `Campaign created but failed to insert recipients: ${rErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    campaign: {
      ...campaign,
      recipients_count: audience.length,
    },
  });
}
