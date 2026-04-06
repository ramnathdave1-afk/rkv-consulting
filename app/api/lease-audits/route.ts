import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runLeaseAudit } from '@/lib/lease-audits/scanner';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: audits, error } = await supabase
      .from('lease_audits')
      .select('*')
      .eq('org_id', ORG_ID)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ audits: audits || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await runLeaseAudit(ORG_ID);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
