import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  scheduleRentReminderCalls,
  scheduleMaintenanceUpdateCalls,
} from '@/lib/automations/voice-campaigns';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET() {
  const supabase = createAdminClient();

  try {
    const { data: campaigns, error } = await supabase
      .from('voice_campaigns')
      .select('*')
      .eq('org_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ campaigns: campaigns || [] });
  } catch (err) {
    console.error('Voice campaigns GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { type, name } = body as { type: string; name?: string };

    if (!type) {
      return NextResponse.json({ error: 'Campaign type is required' }, { status: 400 });
    }

    const validTypes = ['rent_reminder', 'maintenance_update', 'lease_renewal', 'showing_confirmation'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Create campaign record
    const campaignName = name || `${type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Campaign`;

    const { data: campaign, error: insertError } = await supabase
      .from('voice_campaigns')
      .insert({
        org_id: ORG_ID,
        name: campaignName,
        type,
        status: 'running',
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Trigger the actual calls
    let results: any[] = [];
    try {
      if (type === 'rent_reminder') {
        results = await scheduleRentReminderCalls(ORG_ID);
      } else if (type === 'maintenance_update') {
        results = await scheduleMaintenanceUpdateCalls(ORG_ID);
      }
      // lease_renewal and showing_confirmation don't have dedicated schedulers yet;
      // the campaign record is created but calls would be triggered by the cron job.

      // Update campaign with call counts
      await supabase
        .from('voice_campaigns')
        .update({
          total_calls: results.length,
          successful_calls: results.length,
          status: results.length > 0 ? 'completed' : 'completed',
        })
        .eq('id', campaign.id);
    } catch (callErr) {
      console.error('Campaign call execution error:', callErr);
      await supabase
        .from('voice_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaign.id);
    }

    return NextResponse.json({ campaign, callResults: results }, { status: 201 });
  } catch (err) {
    console.error('Voice campaigns POST error:', err);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 },
    );
  }
}
