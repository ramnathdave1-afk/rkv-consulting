import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const { id, findingId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['resolved', 'dismissed', 'open'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: resolved, dismissed, or open' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify finding belongs to this audit
    const { data: finding, error: findErr } = await supabase
      .from('lease_audit_findings')
      .update({
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', findingId)
      .eq('lease_audit_id', id)
      .select()
      .single();

    if (findErr || !finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    // Recalculate open issues count on the audit
    const { count: openCount } = await supabase
      .from('lease_audit_findings')
      .select('id', { count: 'exact', head: true })
      .eq('lease_audit_id', id)
      .eq('status', 'open');

    await supabase
      .from('lease_audits')
      .update({ issues_found: openCount || 0 })
      .eq('id', id);

    return NextResponse.json({ finding });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
