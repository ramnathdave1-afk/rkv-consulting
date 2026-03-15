import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 });
  }

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

  // TODO: Send invitation email via Resend

  return NextResponse.json({ invitation }, { status: 201 });
}
