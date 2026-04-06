import { createAdminClient } from '@/lib/supabase/admin';

export interface AudienceFilter {
  property_id?: string;
  tenant_status?: string[];
  lease_active?: boolean;
}

export interface AudienceMember {
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * Resolve an audience from filter criteria.
 * Queries tenants with optional joins to leases/units/properties.
 */
export async function resolveAudience(
  orgId: string,
  filter: AudienceFilter,
): Promise<AudienceMember[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('tenants')
    .select(`
      id,
      first_name,
      last_name,
      phone,
      email,
      status,
      leases!inner (
        id,
        status,
        unit_id,
        units!inner (
          id,
          property_id,
          unit_number,
          properties!inner (
            id,
            name
          )
        )
      )
    `)
    .eq('org_id', orgId);

  // Filter by tenant status
  if (filter.tenant_status && filter.tenant_status.length > 0) {
    query = query.in('status', filter.tenant_status);
  }

  // Filter by active lease
  if (filter.lease_active) {
    query = query.eq('leases.status', 'active');
  }

  const { data: tenants, error } = await query;

  if (error) {
    console.error('[Audience] Error resolving audience:', error);
    return [];
  }

  if (!tenants) return [];

  // Filter by property if specified
  let filtered = tenants as any[];
  if (filter.property_id) {
    filtered = filtered.filter((t) => {
      const leases = Array.isArray(t.leases) ? t.leases : [t.leases];
      return leases.some((l: any) => {
        const units = Array.isArray(l.units) ? l.units : [l.units];
        return units.some((u: any) => {
          const props = Array.isArray(u.properties) ? u.properties : [u.properties];
          return props.some((p: any) => p.id === filter.property_id);
        });
      });
    });
  }

  // Deduplicate by tenant id
  const seen = new Set<string>();
  const members: AudienceMember[] = [];

  for (const t of filtered) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    members.push({
      tenant_id: t.id,
      name: `${t.first_name} ${t.last_name}`.trim(),
      phone: t.phone || null,
      email: t.email || null,
    });
  }

  return members;
}
