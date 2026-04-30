/**
 * Tenant portal layout — applies the org's white-label brand.
 *
 * Wraps the tenant portal in a div that sets `--brand-primary` /
 * `--brand-secondary` CSS variables and renders a branded header (logo +
 * brand name) bound to the org's primary color. The portal itself remains
 * a client component; we only need server context here to look up the brand.
 */

import React from 'react';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { getBrandForOrg, DEFAULT_BRAND } from '@/lib/branding/get-brand';

export default async function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId } = await getUserOrg();
  const brand = orgId ? await getBrandForOrg(orgId) : DEFAULT_BRAND;

  const cssVars: React.CSSProperties = {
    // Custom CSS vars consumed by .tenant-portal scope (see globals.css).
    ['--brand-primary' as string]: brand.primary_color,
    ['--brand-secondary' as string]: brand.secondary_color,
  };

  return (
    <div className="tenant-portal" style={cssVars}>
      <header
        className="flex items-center gap-3 px-6 py-3 border-b border-border/40"
        style={{ background: brand.primary_color }}
      >
        {brand.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo_url}
            alt={brand.name}
            className="h-8 w-auto object-contain"
          />
        ) : null}
        <span className="text-sm font-semibold text-white">{brand.name}</span>
      </header>
      {children}
    </div>
  );
}
