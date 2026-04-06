import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('org_id', ORG_ID)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
