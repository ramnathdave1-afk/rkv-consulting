import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runLeaseAudit } from '@/lib/lease-audits/scanner';
import { getUserOrg } from '@/lib/auth/get-user-org';

export async function GET() {
  try {
    const { orgId } = await getUserOrg();
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: audits, error } = await supabase
      .from('lease_audits')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ audits: audits || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { orgId } = await getUserOrg();
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runLeaseAudit(orgId);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
