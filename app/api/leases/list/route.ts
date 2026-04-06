import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('leases')
    .select('id, unit_id, tenant_id, lease_start, lease_end, monthly_rent, security_deposit, status, units(unit_number, property_id, properties(name)), tenants(first_name, last_name)')
    .eq('org_id', ORG_ID)
    .order('lease_end', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
