import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { invitationEmail } from '@/lib/email/templates';
import { logAuditEvent, requestContext } from '@/lib/audit/log-action';
import { requireUserLimit } from '@/lib/billing/gate';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rkv-consulting.com';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, full_name')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 });
  }

  // Block invites once the org hits the user cap on its plan.
  const limitGate = await requireUserLimit(profile.org_id);
  if (!limitGate.allowed) return limitGate.response;

  const body = await request.json();
  const { email, role } = body;

  if (!email || !role || !['admin', 'analyst', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid email or role' }, { status: 400 });
  }

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      org_id: profile.org_id,
      email,
      role,
      invited_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch org name and send invitation email
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.org_id)
    .single();

  const inviteUrl = `${BASE_URL}/signup?token=${invitation.token}`;
  const { subject, html } = invitationEmail(
    profile.full_name || 'A team member',
    org?.name || 'your organization',
    inviteUrl,
  );

  await sendEmail({ to: email, subject, html, orgId: profile.org_id });

  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'invite_user',
    resource_type: 'user',
    resource_id: invitation.id,
    metadata: { email, role },
    ...requestContext(request),
  });

  return NextResponse.json({ invitation }, { status: 201 });
}
