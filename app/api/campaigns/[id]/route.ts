import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/campaigns/[id] — Get campaign detail with recipients.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: campaign, error: cErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (cErr || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const { data: recipients, error: rErr } = await supabase
    .from('campaign_recipients')
    .select(`
      id,
      tenant_id,
      contact_value,
      channel,
      status,
      sent_at,
      delivered_at,
      failed_at,
      tenants (
        first_name,
        last_name,
        phone,
        email
      )
    `)
    .eq('campaign_id', id)
    .order('sent_at', { ascending: false, nullsFirst: false });

  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  // Compute stats
  const allRecipients = recipients || [];
  const total = allRecipients.length;
  const sentCount = allRecipients.filter((r: any) => r.status === 'sent' || r.status === 'delivered').length;
  const deliveredCount = allRecipients.filter((r: any) => r.status === 'delivered').length;
  const failedCount = allRecipients.filter((r: any) => r.status === 'failed').length;
  const openedCount = allRecipients.filter((r: any) => r.status === 'opened').length;

  return NextResponse.json({
    campaign: {
      ...campaign,
      recipients_count: total,
      sent_count: campaign.sent_count ?? sentCount,
      delivered_count: campaign.delivered_count ?? deliveredCount,
      failed_count: campaign.failed_count ?? failedCount,
      opened_count: openedCount,
    },
    recipients: allRecipients.map((r: any) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      name: r.tenants
        ? `${r.tenants.first_name} ${r.tenants.last_name}`.trim()
        : 'Unknown',
      contact: r.contact_value || r.tenants?.email || r.tenants?.phone || '',
      channel: r.channel,
      status: r.status,
      sent_at: r.sent_at,
      delivered_at: r.delivered_at,
      failed_at: r.failed_at,
    })),
    stats: {
      total,
      sent: sentCount,
      delivered: deliveredCount,
      opened: openedCount,
      failed: failedCount,
    },
  });
}

/**
 * PATCH /api/campaigns/[id] — Pause, resume, or cancel a campaign.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const body = await request.json();
  const { action } = body;

  if (!action || !['pause', 'resume', 'cancel'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be one of: pause, resume, cancel' },
      { status: 400 },
    );
  }

  const statusMap: Record<string, string> = {
    pause: 'paused',
    resume: 'active',
    cancel: 'cancelled',
  };

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .update({ status: statusMap[action] })
    .eq('id', id)
    .select()
    .single();

  if (error || !campaign) {
    return NextResponse.json(
      { error: error?.message || 'Campaign not found' },
      { status: 500 },
    );
  }

  return NextResponse.json({ campaign });
}
