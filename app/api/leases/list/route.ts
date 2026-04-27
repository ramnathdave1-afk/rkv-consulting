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

  const { data, error } = await supabase
    .from('leases')
    .select('id, unit_id, tenant_id, lease_start, lease_end, monthly_rent, security_deposit, status, units(unit_number, property_id, properties(name)), tenants(first_name, last_name)')
    .eq('org_id', profile.org_id)
    .order('lease_end', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
