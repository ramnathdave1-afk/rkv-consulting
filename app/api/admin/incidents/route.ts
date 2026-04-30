/**
 * Admin: list + create status incidents.
 * Auth: caller must be a profile with role='admin'.
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

  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, status: 403, message: 'Forbidden' };
  }
  return { ok: true as const, user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('status_incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incidents: data ?? [] });
}

const CreateSchema = z.object({
  title: z.string().min(3).max(200),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).default('investigating'),
  severity: z.enum(['minor', 'major', 'critical']).default('minor'),
  affected_components: z.array(z.string()).default([]),
  message: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const json = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.format() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('status_incidents')
    .insert({
      title: parsed.data.title,
      status: parsed.data.status,
      severity: parsed.data.severity,
      affected_components: parsed.data.affected_components,
      updates: [
        {
          timestamp: new Date().toISOString(),
          status: parsed.data.status,
          message: parsed.data.message ?? `Incident opened (${parsed.data.severity}).`,
        },
      ],
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incident: data }, { status: 201 });
}
