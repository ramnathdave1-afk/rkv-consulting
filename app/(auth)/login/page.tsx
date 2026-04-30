/**
 * Login page — server component.
 *
 * Resolves the white-label brand from the request host (e.g.,
 * `acmepm.rkv-consulting.com` → "Acme PM" brand) and renders the client form
 * with the resolved brand. Falls back to the default RKV brand for the
 * apex domain, www, and unknown subdomains.
 */

import { headers } from 'next/headers';
import LoginClient, { type LoginBrand } from './_LoginClient';
import { getBrandFromHost, DEFAULT_BRAND } from '@/lib/branding/get-brand';

export default async function LoginPage() {
  const h = await headers();
  const host = h.get('host') ?? '';

  let brand;
  try {
    brand = await getBrandFromHost(host);
  } catch {
    brand = DEFAULT_BRAND;
  }

  const loginBrand: LoginBrand = {
    name: brand.name,
    accent: brand.primary_color,
    logo_url: brand.logo_url,
  };

  return <LoginClient brand={loginBrand} />;
}
