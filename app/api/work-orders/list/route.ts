import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('work_orders')
    .select('*, properties(name), units(unit_number), tenants(first_name, last_name), vendors(name, company)')
    .eq('org_id', ORG_ID)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
