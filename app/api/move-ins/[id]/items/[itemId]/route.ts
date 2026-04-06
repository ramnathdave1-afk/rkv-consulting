import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  const completed = !!body.completed;

  const { data, error } = await supabase
    .from('move_in_checklist_items')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: body.completed_by || null,
    })
    .eq('id', itemId)
    .eq('org_id', ORG_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if all items in this checklist are completed and auto-update status
  const { data: allItems } = await supabase
    .from('move_in_checklist_items')
    .select('completed')
    .eq('checklist_id', id)
    .eq('org_id', ORG_ID);

  if (allItems) {
    const total = allItems.length;
    const done = allItems.filter((i: { completed: boolean }) => i.completed).length;

    let newStatus: string | null = null;
    if (done === total && total > 0) {
      newStatus = 'completed';
    } else if (done > 0) {
      newStatus = 'in_progress';
    } else {
      newStatus = 'pending';
    }

    await supabase
      .from('move_in_checklists')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', ORG_ID);
  }

  return NextResponse.json({ item: data });
}
