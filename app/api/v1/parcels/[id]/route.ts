import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess } from '../../middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * GET /api/v1/parcels/:id
 *
 * Get detailed parcel information including environmental data and nearby infrastructure.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request);
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: parcel, error } = await supabase
    .from('parcels')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !parcel) return apiError('Parcel not found', 404);

  // Fetch related data in parallel
  const [zoningRes, envRes, permitRes] = await Promise.all([
    supabase
      .from('zoning_districts')
      .select('zone_code, zone_name, zone_category, permitted_uses, conditional_uses, max_building_height_ft, max_lot_coverage_pct')
      .eq('state', parcel.state)
      .ilike('zone_code', parcel.zoning ? `%${parcel.zoning}%` : '%')
      .limit(3),
    supabase
      .from('environmental_layers')
      .select('layer_type, severity, designation, restrictions, mitigation_required')
      .eq('state', parcel.state)
      .limit(10),
    supabase
      .from('permits')
      .select('permit_number, permit_type, status, issued_date, estimated_value')
      .eq('parcel_id', id)
      .order('issued_date', { ascending: false })
      .limit(10),
  ]);

  // Find nearest substations
  const { data: nearbySubstations } = await supabase
    .from('substations')
    .select('id, name, capacity_mw, available_mw, voltage_kv, iso_region')
    .eq('state', parcel.state)
    .order('available_mw', { ascending: false })
    .limit(5);

  return apiSuccess({
    parcel,
    zoning_details: zoningRes.data || [],
    environmental: envRes.data || [],
    permits: permitRes.data || [],
    nearby_substations: nearbySubstations || [],
  });
}
