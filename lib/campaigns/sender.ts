import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio/client';
import { sendEmail } from '@/lib/email/send';
import { layout } from '@/lib/email/templates';

const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || '+10000000000';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Render merge tags in a message body.
 * Supported: {tenant_name}, {property_name}, {unit_number}
 */
function renderMessage(
  template: string,
  vars: Record<string, string>,
): string {
  return template
    .replace(/\{tenant_name\}/g, vars.tenant_name || '')
    .replace(/\{property_name\}/g, vars.property_name || '')
    .replace(/\{unit_number\}/g, vars.unit_number || '');
}

/**
 * Send a campaign to all its recipients.
 * Loads campaign + recipients, sends via SMS / Email / Both,
 * and updates delivery statuses in the database.
 */
export async function sendCampaign(campaignId: string): Promise<{
  sent: number;
  delivered: number;
  failed: number;
}> {
  const supabase = createAdminClient();

  // Load campaign
  const { data: campaign, error: cErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (cErr || !campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  // Load recipients with tenant + lease + unit + property info
  const { data: recipients, error: rErr } = await supabase
    .from('campaign_recipients')
    .select(`
      id,
      tenant_id,
      contact_value,
      channel,
      status,
      tenants (
        first_name,
        last_name,
        phone,
        email,
        leases (
          units (
            unit_number,
            properties ( name )
          )
        )
      )
    `)
    .eq('campaign_id', campaignId)
    .eq('status', 'pending');

  if (rErr) {
    throw new Error(`Failed to load recipients: ${rErr.message}`);
  }

  // Update campaign status to sending
  await supabase
    .from('campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId);

  let sent = 0;
  let delivered = 0;
  let failed = 0;

  for (const recipient of recipients || []) {
    // Check if campaign was paused/cancelled
    const { data: latest } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (latest?.status === 'paused' || latest?.status === 'cancelled') {
      break;
    }

    const tenant = recipient.tenants as any;
    const tenantName = tenant
      ? `${tenant.first_name} ${tenant.last_name}`.trim()
      : '';

    // Resolve property/unit from first lease
    let propertyName = '';
    let unitNumber = '';
    if (tenant?.leases) {
      const leases = Array.isArray(tenant.leases)
        ? tenant.leases
        : [tenant.leases];
      const firstLease = leases[0];
      if (firstLease?.units) {
        const unit = Array.isArray(firstLease.units)
          ? firstLease.units[0]
          : firstLease.units;
        unitNumber = unit?.unit_number || '';
        if (unit?.properties) {
          const prop = Array.isArray(unit.properties)
            ? unit.properties[0]
            : unit.properties;
          propertyName = prop?.name || '';
        }
      }
    }

    const vars = {
      tenant_name: tenantName,
      property_name: propertyName,
      unit_number: unitNumber,
    };

    const renderedBody = renderMessage(campaign.message_body || '', vars);
    const renderedSubject = campaign.subject
      ? renderMessage(campaign.subject, vars)
      : '';

    let recipientStatus = 'sent';
    const now = new Date().toISOString();

    try {
      const channel = recipient.channel || campaign.channel;

      if (channel === 'sms' || channel === 'both') {
        const phone = recipient.contact_value || tenant?.phone;
        if (phone) {
          await sendSMS(phone, TWILIO_FROM, renderedBody);
        }
      }

      if (channel === 'email' || channel === 'both') {
        const email = recipient.contact_value || tenant?.email;
        if (email && renderedSubject) {
          const htmlBody = layout(`
            <div style="font-size: 14px; color: #F0F2F5; line-height: 1.7;">
              ${renderedBody.replace(/\n/g, '<br />')}
            </div>
          `);
          const result = await sendEmail({
            to: email,
            subject: renderedSubject,
            html: htmlBody,
          });
          if (!result.success) {
            recipientStatus = 'failed';
          }
        }
      }

      if (recipientStatus === 'sent') {
        sent++;
        delivered++;
      }
    } catch (err) {
      console.error(`[Campaign] Failed to send to recipient ${recipient.id}:`, err);
      recipientStatus = 'failed';
      failed++;
    }

    // Update recipient status
    await supabase
      .from('campaign_recipients')
      .update({
        status: recipientStatus,
        sent_at: recipientStatus !== 'failed' ? now : null,
        delivered_at: recipientStatus === 'sent' ? now : null,
        failed_at: recipientStatus === 'failed' ? now : null,
      })
      .eq('id', recipient.id);

    // Throttle: 100ms between sends
    await delay(100);
  }

  // Update campaign totals
  const finalStatus =
    failed === (recipients?.length || 0)
      ? 'failed'
      : 'completed';

  await supabase
    .from('campaigns')
    .update({
      status: finalStatus,
      sent_count: sent,
      delivered_count: delivered,
      failed_count: failed,
      completed_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  return { sent, delivered, failed };
}
