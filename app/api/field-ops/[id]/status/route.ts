import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 });
  }

  const validStatuses = ['assigned', 'in_progress', 'parts_needed', 'completed', 'closed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Build update payload with timestamps
  const update: Record<string, unknown> = { status };
  const now = new Date().toISOString();

  if (status === 'in_progress') {
    update.vendor_response_at = now;
  }
  if (status === 'completed') {
    update.completed_date = now.split('T')[0];
  }

  const { data, error } = await supabase
    .from('work_orders')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ work_order: data });
}
