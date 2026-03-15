import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, stageTransitionEmail } from '@/lib/email/send';
import type { PipelineStage } from '@/lib/types';

export async function handleStageTransition(
  siteId: string,
  fromStage: PipelineStage | null,
  toStage: PipelineStage,
  movedBy: string,
  orgId: string,
) {
  const supabase = createAdminClient();

  // Get site name
  const { data: site } = await supabase
    .from('sites')
    .select('name')
    .eq('id', siteId)
    .single();

  if (!site) return;

  // Get org members for notifications
  const { data: members } = await supabase
    .from('profiles')
    .select('email, role, full_name')
    .eq('org_id', orgId);

  const admins = (members || []).filter((m) => m.role === 'admin');
  const analysts = (members || []).filter((m) => m.role === 'analyst' || m.role === 'admin');

  const emailContent = stageTransitionEmail(site.name, fromStage || '', toStage, movedBy);

  switch (toStage) {
    case 'due_diligence':
      // Notify team
      for (const member of analysts) {
        await sendEmail({ to: member.email, ...emailContent });
      }
      break;

    case 'loi':
      // Generate preliminary report + notify analysts
      for (const member of analysts) {
        await sendEmail({ to: member.email, ...emailContent });
      }
      break;

    case 'under_contract':
      // Generate full report + notify all admins
      for (const admin of admins) {
        await sendEmail({ to: admin.email, ...emailContent });
      }
      break;

    case 'closed':
      // Final report + summary email to all admins
      for (const admin of admins) {
        await sendEmail({ to: admin.email, ...emailContent });
      }
      break;
  }

  // Log email activity
  const recipientCount = toStage === 'under_contract' || toStage === 'closed' ? admins.length : analysts.length;
  await supabase.from('agent_activity_log').insert({
    action: `Stage transition email: ${site.name} → ${toStage} (${recipientCount} recipients)`,
    details: { site_id: siteId, from: fromStage, to: toStage, recipients: recipientCount },
    org_id: orgId,
    site_id: siteId,
  });
}
