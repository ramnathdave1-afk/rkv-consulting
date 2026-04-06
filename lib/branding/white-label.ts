/**
 * White-Label Branding System
 * Loads org-specific branding (logo, colors, name) for white-label customers.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface OrgBranding {
  brand_name: string;
  brand_color: string;
  logo_url: string | null;
  email_from_name: string;
  email_from_address: string;
  white_label_enabled: boolean;
}

const DEFAULT_BRANDING: OrgBranding = {
  brand_name: 'RKV Consulting',
  brand_color: '#00D4AA',
  logo_url: null,
  email_from_name: 'RKV Consulting',
  email_from_address: 'noreply@rkvconsulting.com',
  white_label_enabled: false,
};

export async function getOrgBranding(orgId: string): Promise<OrgBranding> {
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('name, brand_name, brand_color, logo_url, email_from_name, email_from_address, white_label_enabled')
    .eq('id', orgId)
    .single();

  if (!org || !org.white_label_enabled) return DEFAULT_BRANDING;

  return {
    brand_name: org.brand_name || org.name || DEFAULT_BRANDING.brand_name,
    brand_color: org.brand_color || DEFAULT_BRANDING.brand_color,
    logo_url: org.logo_url || null,
    email_from_name: org.email_from_name || org.brand_name || org.name || DEFAULT_BRANDING.email_from_name,
    email_from_address: org.email_from_address || DEFAULT_BRANDING.email_from_address,
    white_label_enabled: true,
  };
}

export function generateCSS(branding: OrgBranding): string {
  return `:root { --brand-color: ${branding.brand_color}; --accent: ${branding.brand_color}; }`;
}
