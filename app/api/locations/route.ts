import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { requireFeature, requireLocationLimit } from '@/lib/billing/gate';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'location';
}

export async function GET() {
  const { user, orgId, supabase } = await getUserOrg();
  if (!user || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .eq('org_id', orgId)
    .order('is_default', { ascending: false })
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach property counts (single round-trip)
  const ids = (locations || []).map((l: { id: string }) => l.id);
  const counts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: props } = await supabase
      .from('properties')
      .select('location_id')
      .eq('org_id', orgId)
      .in('location_id', ids);
    for (const p of (props as { location_id: string | null }[]) || []) {
      if (p.location_id) counts[p.location_id] = (counts[p.location_id] || 0) + 1;
    }
  }

  const enriched = (locations || []).map((l: { id: string }) => ({
    ...l,
    property_count: counts[l.id] || 0,
  }));

  return NextResponse.json({ items: enriched });
}

export async function POST(request: NextRequest) {
  const { user, orgId, role, supabase } = await getUserOrg();
  if (!user || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  // Multi-location requires the feature flag AND room under the location cap.
  const featureGate = await requireFeature(orgId, 'multi_location');
  if (!featureGate.allowed) return featureGate.response;

  const limitGate = await requireLocationLimit(orgId);
  if (!limitGate.allowed) return limitGate.response;

  const body = await request.json();
  const name = (body.name || '').toString().trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const slug = (body.slug ? body.slug.toString() : slugify(name));

  // If is_default true, unset previous defaults in this org
  if (body.is_default) {
    await supabase.from('locations').update({ is_default: false }).eq('org_id', orgId);
  }

  const insertPayload = {
    org_id: orgId,
    name,
    slug,
    address_line1: body.address_line1 || null,
    city: body.city || null,
    state: body.state || null,
    zip: body.zip || null,
    phone: body.phone || null,
    email: body.email || null,
    manager_user_id: body.manager_user_id || null,
    is_default: !!body.is_default,
    is_active: body.is_active !== false,
    metadata: body.metadata || {},
  };

  const { data, error } = await supabase
    .from('locations')
    .insert(insertPayload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ location: data }, { status: 201 });
}
