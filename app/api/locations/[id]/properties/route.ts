import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, orgId, supabase } = await getUserOrg();
  if (!user || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('org_id', orgId)
    .eq('location_id', id)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

/**
 * Reassign a list of properties to this location.
 * Body: { property_ids: string[] }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, orgId, role, supabase } = await getUserOrg();
  if (!user || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  // Verify the location belongs to the same org
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();
  if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const propertyIds: string[] = Array.isArray(body.property_ids) ? body.property_ids : [];
  if (propertyIds.length === 0) {
    return NextResponse.json({ error: 'property_ids is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('properties')
    .update({ location_id: id })
    .eq('org_id', orgId)
    .in('id', propertyIds)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: data?.length || 0 });
}
