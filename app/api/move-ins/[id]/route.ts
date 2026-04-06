import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('move_in_checklists')
    .select(`
      *,
      tenants ( id, first_name, last_name, email, phone ),
      properties ( id, name, address_line1 ),
      units ( id, unit_number ),
      move_in_checklist_items ( id, item_type, label, completed, completed_at, completed_by, notes, sort_order )
    `)
    .eq('id', id)
    .eq('org_id', ORG_ID)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Sort items by sort_order
  if (data.move_in_checklist_items) {
    (data.move_in_checklist_items as { sort_order: number }[]).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
  }

  return NextResponse.json({ checklist: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  const allowedFields: Record<string, unknown> = {};
  if (body.status !== undefined) allowedFields.status = body.status;
  if (body.move_in_date !== undefined) allowedFields.move_in_date = body.move_in_date;
  if (body.welcome_email_sent !== undefined) allowedFields.welcome_email_sent = body.welcome_email_sent;

  if (allowedFields.status === 'completed') {
    allowedFields.completed_at = new Date().toISOString();
  }

  allowedFields.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('move_in_checklists')
    .update(allowedFields)
    .eq('id', id)
    .eq('org_id', ORG_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checklist: data });
}
