import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function POST() {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('activity_feed')
    .update({ read: true })
    .eq('org_id', ORG_ID)
    .eq('read', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
