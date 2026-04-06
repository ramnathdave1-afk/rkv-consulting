import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio/client';
import { sendEmail } from '@/lib/email/send';
import { showingFollowUpEmail } from '@/lib/email/templates';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rkv-consulting.vercel.app';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const ago48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  let smsSent = 0;
  let emailsSent = 0;

  // Find completed showings from 24-48h ago with no follow-up
  const { data: showings } = await supabase
    .from('showings')
    .select('id, org_id, prospect_name, prospect_phone, prospect_email, properties(name), units(unit_number)')
    .eq('status', 'completed')
    .eq('follow_up_status', 'pending')
    .gte('scheduled_at', ago48h)
    .lte('scheduled_at', ago24h);

  for (const showing of (showings || [])) {
    if (!showing.prospect_phone && !showing.prospect_email) continue;

    const name = showing.prospect_name || 'there';
    const property = (showing.properties as unknown as { name: string } | null)?.name || 'the property';
    const unit = (showing.units as unknown as { unit_number: string } | null)?.unit_number || '';
    const unitText = unit ? ` Unit ${unit}` : '';
    const applicationUrl = `${BASE_URL}/apply`;

    try {
      // Send SMS if phone available
      if (showing.prospect_phone) {
        const { data: orgPhone } = await supabase
          .from('org_phone_numbers')
          .select('phone_number')
          .eq('org_id', showing.org_id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (orgPhone) {
          const message = `Hi ${name}! Thanks for visiting ${property}${unitText}. We'd love to hear your thoughts! Are you interested in moving forward with an application? Reply YES or let us know if you have any questions.`;
          await sendSMS(showing.prospect_phone, orgPhone.phone_number, message);
          smsSent++;
        }
      }

      // Send follow-up email if email available
      if (showing.prospect_email) {
        const emailContent = showingFollowUpEmail(name, property, unit, applicationUrl);
        await sendEmail({
          to: showing.prospect_email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
        emailsSent++;
      }

      await supabase.from('showings').update({ follow_up_status: 'sent', follow_up_sent_at: now.toISOString() }).eq('id', showing.id);
    } catch (err) {
      console.error(`[Cron] Showing follow-up failed for ${showing.id}:`, err);
    }
  }

  return NextResponse.json({ success: true, sms_sent: smsSent, emails_sent: emailsSent });
}
