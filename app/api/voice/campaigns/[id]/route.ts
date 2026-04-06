import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { action } = body as { action: 'pause' | 'resume' };

    if (!action || !['pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "pause" or "resume"' },
        { status: 400 },
      );
    }

    const newStatus = action === 'pause' ? 'paused' : 'running';

    const { data: campaign, error } = await supabase
      .from('voice_campaigns')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ campaign });
  } catch (err) {
    console.error('Voice campaign PATCH error:', err);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 },
    );
  }
}
