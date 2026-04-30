/**
 * GET  /api/settings/branding — return the current org's branding (or defaults).
 * PUT  /api/settings/branding — update branding fields. Admin role required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { getBrandForOrg, DEFAULT_BRAND } from '@/lib/branding/get-brand';
import { createAdminClient } from '@/lib/supabase/admin';

const EDITABLE_FIELDS = [
  'brand_name',
  'brand_primary_color',
  'brand_secondary_color',
  'brand_logo_url',
  'brand_favicon_url',
  'brand_email_sender_name',
  'brand_email_reply_to',
  'brand_email_signature',
  'brand_custom_domain',
  'brand_subdomain',
  // Legacy mirrors so the old white-label path keeps working.
  'brand_color',
  'logo_url',
  'email_from_name',
  'email_from_address',
  'white_label_enabled',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function GET() {
  const { user, orgId } = await getUserOrg();
  if (!user || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brand = await getBrandForOrg(orgId);

  // Also return the raw row so the form can show fields the resolver doesn't
  // expose (e.g., subdomain, custom domain).
  const supabase = createAdminClient();
  const { data: raw } = await supabase
    .from('organizations')
    .select(
      'brand_name, brand_primary_color, brand_secondary_color, brand_logo_url, brand_favicon_url, brand_email_sender_name, brand_email_reply_to, brand_email_signature, brand_custom_domain, brand_subdomain, brand_color, logo_url, email_from_name, email_from_address, white_label_enabled',
    )
    .eq('id', orgId)
    .maybeSingle();

  return NextResponse.json({ brand, raw: raw ?? {}, defaults: DEFAULT_BRAND });
}

export async function PUT(request: NextRequest) {
  const { user, orgId, role } = await getUserOrg();
  if (!user || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can edit branding' },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist filter — never trust the client to set arbitrary columns.
  const update: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) update[key as EditableField] = body[key];
  }

  // Basic shape validation.
  for (const colorKey of [
    'brand_primary_color',
    'brand_secondary_color',
    'brand_color',
  ] as const) {
    const v = update[colorKey];
    if (v != null && (typeof v !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(v))) {
      return NextResponse.json(
        { error: `${colorKey} must be a hex color` },
        { status: 400 },
      );
    }
  }

  if (
    typeof update.brand_subdomain === 'string' &&
    update.brand_subdomain &&
    !/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(update.brand_subdomain)
  ) {
    return NextResponse.json(
      { error: 'Subdomain must be lowercase, alphanumeric with hyphens, max 32 chars' },
      { status: 400 },
    );
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const brand = await getBrandForOrg(orgId);
  return NextResponse.json({ ok: true, brand });
}

export async function DELETE() {
  // "Reset to defaults" — null out all brand_* columns.
  const { user, orgId, role } = await getUserOrg();
  if (!user || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can reset branding' }, { status: 403 });
  }

  const reset: Record<string, null | boolean> = {
    brand_name: null,
    brand_primary_color: null,
    brand_secondary_color: null,
    brand_logo_url: null,
    brand_favicon_url: null,
    brand_email_sender_name: null,
    brand_email_reply_to: null,
    brand_email_signature: null,
    brand_custom_domain: null,
    brand_subdomain: null,
    brand_color: null,
    email_from_name: null,
    email_from_address: null,
    white_label_enabled: false,
  };

  const supabase = createAdminClient();
  const { error } = await supabase.from('organizations').update(reset).eq('id', orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const brand = await getBrandForOrg(orgId);
  return NextResponse.json({ ok: true, brand });
}
