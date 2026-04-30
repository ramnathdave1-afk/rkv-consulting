import { NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';

interface PerLocRow {
  location_id: string | null;
  location_name: string;
  property_count: number;
  unit_count: number;
  occupied_units: number;
  occupancy_rate: number;
  active_leases: number;
  monthly_rent: number;
  open_work_orders: number;
}

/**
 * Side-by-side comparison of every location in the org.
 * Includes a "(Unassigned)" row for properties with no location_id.
 */
export async function GET() {
  const { user, orgId, supabase } = await getUserOrg();
  if (!user || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: locs }, { data: props }, { data: units }, { data: leases }, { data: wos }] = await Promise.all([
    supabase.from('locations').select('id, name').eq('org_id', orgId).order('name'),
    supabase.from('properties').select('id, location_id').eq('org_id', orgId),
    supabase.from('units').select('id, status, property_id').eq('org_id', orgId),
    supabase.from('leases').select('id, status, monthly_rent, property_id').eq('org_id', orgId).eq('status', 'active'),
    supabase.from('work_orders').select('id, status, property_id').eq('org_id', orgId).not('status', 'in', '("closed","cancelled")'),
  ]);

  const locations = (locs || []) as { id: string; name: string }[];
  const properties = (props || []) as { id: string; location_id: string | null }[];
  const allUnits = (units || []) as { id: string; status: string; property_id: string }[];
  const activeLeases = (leases || []) as { monthly_rent: number; property_id: string }[];
  const workOrders = (wos || []) as { property_id: string }[];

  // Map property_id -> location_id (null for unassigned)
  const propLoc: Record<string, string | null> = {};
  properties.forEach((p) => { propLoc[p.id] = p.location_id; });

  function aggregate(filterFn: (locId: string | null) => boolean, name: string, id: string | null): PerLocRow {
    const propIds = properties.filter((p) => filterFn(p.location_id)).map((p) => p.id);
    const propSet = new Set(propIds);
    const u = allUnits.filter((x) => propSet.has(x.property_id));
    const occ = u.filter((x) => x.status === 'occupied').length;
    const l = activeLeases.filter((x) => propSet.has(x.property_id));
    const w = workOrders.filter((x) => propSet.has(x.property_id));
    return {
      location_id: id,
      location_name: name,
      property_count: propIds.length,
      unit_count: u.length,
      occupied_units: occ,
      occupancy_rate: u.length > 0 ? Math.round((occ / u.length) * 100) : 0,
      active_leases: l.length,
      monthly_rent: l.reduce((s, x) => s + Number(x.monthly_rent || 0), 0),
      open_work_orders: w.length,
    };
  }

  const rows: PerLocRow[] = locations.map((loc) => aggregate((id) => id === loc.id, loc.name, loc.id));

  // Unassigned (legacy data without a location_id)
  const hasUnassigned = properties.some((p) => !p.location_id);
  if (hasUnassigned) {
    rows.push(aggregate((id) => !id, '(Unassigned)', null));
  }

  return NextResponse.json({ items: rows });
}
