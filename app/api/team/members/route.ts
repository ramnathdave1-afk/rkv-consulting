import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('org_id', profile.org_id)
    .order('created_at');

  return NextResponse.json({ members: members || [] });
}
