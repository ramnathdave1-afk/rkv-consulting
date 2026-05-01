/**
 * White-label brand loader.
 *
 * Resolves the per-organization brand identity used to theme the tenant portal,
 * transactional emails, login screen (via subdomain), and the settings preview.
 *
 * Two entry points:
 *   - getBrandForOrg(orgId)        — once you know the org (auth context)
 *   - getBrandBySubdomain(subdom)  — pre-auth (login pages on acmepm.rkv-consulting.com)
 *
 * Both resolve to a fully-populated Brand with sensible RKV defaults so callers
 * never have to null-check fields. Use DEFAULT_BRAND directly when no org is
 * available (anonymous root-domain visitors).
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface Brand {
  name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  email_sender_name: string;
  email_reply_to: string;
  email_signature: string;
}

export const DEFAULT_BRAND: Brand = {
  name: 'RKV Consulting',
  primary_color: '#0F172A',
  secondary_color: '#0369A1',
  logo_url: null,
  favicon_url: null,
  email_sender_name: 'RKV Consulting',
  email_reply_to: 'noreply@rkv-consulting.com',
  email_signature: 'Sent via RKV Consulting',
};

/**
 * Columns we read off the organizations table. We `select *` because the new
 * brand_* columns and the legacy ones (brand_color, email_from_*) coexist
 * during the migration window; reading both lets us fall back gracefully.
 */
type OrgBrandRow = {
  id?: string;
  name?: string | null;
  brand_name?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  brand_logo_url?: string | null;
  logo_url?: string | null;
  brand_favicon_url?: string | null;
  brand_email_sender_name?: string | null;
  brand_email_reply_to?: string | null;
  brand_email_signature?: string | null;
  // Legacy fields that the original white-label.ts wrote to.
  brand_color?: string | null;
  email_from_name?: string | null;
  email_from_address?: string | null;
  white_label_enabled?: boolean | null;
};

function rowToBrand(row: OrgBrandRow | null): Brand {
  if (!row) return DEFAULT_BRAND;

  return {
    name: row.brand_name ?? row.name ?? DEFAULT_BRAND.name,
    primary_color:
      row.brand_primary_color ?? row.brand_color ?? DEFAULT_BRAND.primary_color,
    secondary_color: row.brand_secondary_color ?? DEFAULT_BRAND.secondary_color,
    logo_url: row.brand_logo_url ?? row.logo_url ?? null,
    favicon_url: row.brand_favicon_url ?? null,
    email_sender_name:
      row.brand_email_sender_name ??
      row.email_from_name ??
      row.brand_name ??
      row.name ??
      DEFAULT_BRAND.email_sender_name,
    email_reply_to:
      row.brand_email_reply_to ??
      row.email_from_address ??
      DEFAULT_BRAND.email_reply_to,
    email_signature:
      row.brand_email_signature ?? DEFAULT_BRAND.email_signature,
  };
}

/** Get brand for a specific org. Falls back to DEFAULT_BRAND on miss/error. */
export async function getBrandForOrg(orgId: string): Promise<Brand> {
  if (!orgId) return DEFAULT_BRAND;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    if (error || !data) return DEFAULT_BRAND;
    return rowToBrand(data as OrgBrandRow);
  } catch {
    return DEFAULT_BRAND;
  }
}

/**
 * Resolve brand by subdomain — used by pre-auth pages (login, signup, forgot).
 * Returns null if no org claims this subdomain so callers can decide whether
 * to render the default RKV chrome or 404.
 */
export async function getBrandBySubdomain(
  subdomain: string,
): Promise<Brand | null> {
  if (!subdomain) return null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('brand_subdomain', subdomain)
      .maybeSingle();

    if (error || !data) return null;
    return rowToBrand(data as OrgBrandRow);
  } catch {
    return null;
  }
}

/** Resolve by custom domain (e.g., portal.acmepm.com). */
export async function getBrandByCustomDomain(
  domain: string,
): Promise<Brand | null> {
  if (!domain) return null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('brand_custom_domain', domain)
      .maybeSingle();

    if (error || !data) return null;
    return rowToBrand(data as OrgBrandRow);
  } catch {
    return null;
  }
}

/**
 * Best-effort host → brand resolver for unauthenticated requests.
 * Strips `www.` and treats `rkv-consulting.com` (or empty/localhost) as the
 * default brand.
 */
export async function getBrandFromHost(host: string): Promise<Brand> {
  if (!host) return DEFAULT_BRAND;

  // Strip port (localhost:3000 → localhost) and lowercase.
  const cleanHost = host.split(':')[0].toLowerCase().replace(/^www\./, '');

  // Custom domain match first (anything that isn't *.rkv-consulting.com).
  if (!cleanHost.endsWith('rkv-consulting.com')) {
    const byDomain = await getBrandByCustomDomain(cleanHost);
    if (byDomain) return byDomain;
    return DEFAULT_BRAND;
  }

  // *.rkv-consulting.com — extract subdomain.
  const parts = cleanHost.split('.');
  if (parts.length <= 2) return DEFAULT_BRAND; // root domain
  const subdomain = parts[0];
  if (subdomain === 'www' || subdomain === 'app') return DEFAULT_BRAND;

  const brand = await getBrandBySubdomain(subdomain);
  return brand ?? DEFAULT_BRAND;
}
