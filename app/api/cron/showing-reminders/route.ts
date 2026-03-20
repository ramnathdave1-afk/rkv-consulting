import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio/client';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  let sent = 0;

  // Find showings within next 24 hours that haven't had reminders sent
  const { data: showings } = await supabase
    .from('showings')
    .select('id, org_id, prospect_name, prospect_phone, scheduled_at, properties(name), units(unit_number)')
    .in('status', ['scheduled', 'confirmed'])
    .eq('reminder_sent', false)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', in24h);

  for (const showing of (showings || [])) {
    if (!showing.prospect_phone) continue;

    const { data: orgPhone } = await supabase
      .from('org_phone_numbers')
      .select('phone_number')
      .eq('org_id', showing.org_id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!orgPhone) continue;

    const time = new Date(showing.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const date = new Date(showing.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const property = (showing.properties as unknown as { name: string } | null)?.name || 'our property';
    const unit = (showing.units as unknown as { unit_number: string } | null)?.unit_number;
    const unitText = unit ? ` Unit ${unit}` : '';

    const message = `Reminder: You have a showing tomorrow at ${property}${unitText} on ${date} at ${time}. Reply CANCEL if you need to reschedule.`;

    try {
      await sendSMS(showing.prospect_phone, orgPhone.phone_number, message);
      await supabase.from('showings').update({ reminder_sent: true }).eq('id', showing.id);
      sent++;
    } catch (err) {
      console.error(`[Cron] Showing reminder failed for ${showing.id}:`, err);
    }
  }

  return NextResponse.json({ success: true, reminders_sent: sent });
}
