/**
 * Admin: append updates to / resolve a status incident.
 * Auth: profile.role === 'admin'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

export const runtime = 'nodejs';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, message: 'Not authenticated' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (!profile || profile.role !== 'admin')
    return { ok: false as const, status: 403, message: 'Forbidden' };
  return { ok: true as const };
}

const PatchSchema = z.object({
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).optional(),
  severity: z.enum(['minor', 'major', 'critical']).optional(),
  affected_components: z.array(z.string()).optional(),
  message: z.string().min(1).max(2000).optional(),
  resolve: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.format() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: existing, error: getErr } = await supabase
    .from('status_incidents')
    .select('*')
    .eq('id', id)
    .single();
  if (getErr || !existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const newStatus = parsed.data.resolve ? 'resolved' : parsed.data.status ?? existing.status;
  const updates = Array.isArray(existing.updates) ? existing.updates : [];

  if (parsed.data.message || parsed.data.status || parsed.data.resolve) {
    updates.push({
      timestamp: new Date().toISOString(),
      status: newStatus,
      message:
        parsed.data.message ??
        (parsed.data.resolve ? 'Incident resolved.' : `Status updated to ${newStatus}.`),
    });
  }

  const patch: Record<string, unknown> = {
    status: newStatus,
    updates,
  };
  if (parsed.data.severity) patch.severity = parsed.data.severity;
  if (parsed.data.affected_components) patch.affected_components = parsed.data.affected_components;
  if (newStatus === 'resolved' && !existing.resolved_at) patch.resolved_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('status_incidents')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incident: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('status_incidents').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
