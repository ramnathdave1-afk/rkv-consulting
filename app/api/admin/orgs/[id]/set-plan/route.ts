/**
 * Admin: manually set an organization's plan_tier.
 *
 * Caller must be a profile with role='super_admin'. This is the single source
 * of truth for plan changes now that public Stripe Checkout is disabled — the
 * Stripe webhook no longer auto-mutates plan_tier. Audit-logged on every call.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent, requestContext } from '@/lib/audit/log-action';
import { PLAN_TIER_ORDER } from '@/lib/billing/plans';

export const runtime = 'nodejs';

const BodySchema = z.object({
  tier: z.enum(['trial', 'starter', 'growth', 'enterprise']),
  reason: z.string().max(500).optional(),
});

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, message: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'super_admin') {
    return { ok: false as const, status: 403, message: 'Forbidden: super_admin only' };
  }
  return { ok: true as const, user, profile };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id: orgId } = await ctx.params;
  if (!orgId) return NextResponse.json({ error: 'Missing org id' }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', details: parsed.error.format() },
      { status: 400 },
    );
  }
  const { tier, reason } = parsed.data;

  if (!PLAN_TIER_ORDER.includes(tier)) {
    return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Read current tier so we can audit-diff.
  const { data: org, error: readErr } = await admin
    .from('organizations')
    .select('id, plan_tier')
    .eq('id', orgId)
    .single();

  if (readErr || !org) {
    return NextResponse.json({ error: 'org_not_found' }, { status: 404 });
  }

  if (org.plan_tier === tier) {
    return NextResponse.json({ ok: true, unchanged: true, tier });
  }

  const { error: updErr } = await admin
    .from('organizations')
    .update({ plan_tier: tier, updated_at: new Date().toISOString() })
    .eq('id', orgId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await logAuditEvent({
    orgId,
    userId: auth.user.id,
    action: 'subscription_change',
    resource_type: 'subscription',
    resource_id: orgId,
    changes: { plan_tier: { from: org.plan_tier, to: tier } },
    metadata: {
      source: 'admin_manual',
      reason: reason ?? null,
      actor_role: 'super_admin',
    },
    ...requestContext(req),
  });

  return NextResponse.json({ ok: true, tier });
}
