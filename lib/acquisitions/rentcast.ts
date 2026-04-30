/**
 * RentCast API client for real estate comps, AVMs, and market data.
 *
 * Endpoints used (https://developers.rentcast.io/):
 *   - GET /avm/rent/long-term     → rental estimate + comparables
 *   - GET /avm/value              → sale value estimate + comparables
 *   - GET /markets                → ZIP-level market statistics
 *
 * All functions return null on failure (missing API key, network error,
 * non-2xx response, or property not found) so callers can fall back gracefully.
 * Errors are reported via Sentry via the shared `captureException` helper.
 */

import { captureException } from '@/lib/monitoring/sentry';

const RENTCAST_BASE = 'https://api.rentcast.io/v1';

export interface PropertyAddress {
  address: string; // e.g. "123 Main St"
  city: string;
  state: string;
  zip: string;
}

export interface RentalComparable {
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  distance_miles: number;
}

export interface RentalEstimate {
  rent: number;
  rent_high: number;
  rent_low: number;
  comparables: RentalComparable[];
}

export interface SaleComparable {
  address: string;
  sale_price: number;
  sale_date: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  distance_miles: number;
}

export interface ValueEstimate {
  value: number;
  value_high: number;
  value_low: number;
  comparables: SaleComparable[];
}

export interface MarketData {
  median_rent: number;
  median_value: number;
  cap_rate: number;
}

function fmtAddress(addr: PropertyAddress): string {
  return `${addr.address}, ${addr.city}, ${addr.state} ${addr.zip}`;
}

function buildParams(
  addr: PropertyAddress,
  beds?: number,
  baths?: number,
  sqft?: number,
): URLSearchParams {
  const params = new URLSearchParams({ address: fmtAddress(addr) });
  if (beds !== undefined && beds !== null) params.set('bedrooms', String(beds));
  if (baths !== undefined && baths !== null) params.set('bathrooms', String(baths));
  if (sqft !== undefined && sqft !== null) params.set('squareFootage', String(sqft));
  return params;
}

async function rcFetch(
  path: string,
  apiKey: string,
  context: string,
): Promise<unknown | null> {
  try {
    const res = await fetch(`${RENTCAST_BASE}${path}`, {
      headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
    });
    if (!res.ok) {
      // 404 = property not found; not really an error worth alerting on
      if (res.status !== 404) {
        captureException(new Error(`RentCast ${context} failed: ${res.status}`), {
          context,
          status: res.status,
          path,
        });
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    captureException(err, { context });
    return null;
  }
}

/**
 * Long-term (annual) rent estimate + nearby rental comparables.
 */
export async function getRentEstimate(
  addr: PropertyAddress,
  beds?: number,
  baths?: number,
  sqft?: number,
  explicitKey?: string,
): Promise<RentalEstimate | null> {
  const apiKey = explicitKey ?? process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;

  const params = buildParams(addr, beds, baths, sqft);
  const data = (await rcFetch(
    `/avm/rent/long-term?${params}`,
    apiKey,
    'rentcast_rent',
  )) as
    | {
        rent?: number;
        rentRangeHigh?: number;
        rentRangeLow?: number;
        comparables?: Array<{
          formattedAddress?: string;
          rent?: number;
          bedrooms?: number;
          bathrooms?: number;
          squareFootage?: number;
          distance?: number;
        }>;
      }
    | null;

  if (!data || typeof data.rent !== 'number') return null;

  return {
    rent: data.rent,
    rent_high: data.rentRangeHigh ?? data.rent,
    rent_low: data.rentRangeLow ?? data.rent,
    comparables: (data.comparables ?? []).map((c) => ({
      address: c.formattedAddress ?? '',
      rent: c.rent ?? 0,
      bedrooms: c.bedrooms ?? 0,
      bathrooms: c.bathrooms ?? 0,
      square_feet: c.squareFootage ?? 0,
      distance_miles: c.distance ?? 0,
    })),
  };
}

/**
 * Property sale value (AVM) + nearby sold comparables.
 */
export async function getValueEstimate(
  addr: PropertyAddress,
  beds?: number,
  baths?: number,
  sqft?: number,
  explicitKey?: string,
): Promise<ValueEstimate | null> {
  const apiKey = explicitKey ?? process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;

  const params = buildParams(addr, beds, baths, sqft);
  const data = (await rcFetch(
    `/avm/value?${params}`,
    apiKey,
    'rentcast_value',
  )) as
    | {
        price?: number;
        priceRangeHigh?: number;
        priceRangeLow?: number;
        comparables?: Array<{
          formattedAddress?: string;
          price?: number;
          listedDate?: string;
          removedDate?: string;
          lastSeenDate?: string;
          bedrooms?: number;
          bathrooms?: number;
          squareFootage?: number;
          distance?: number;
        }>;
      }
    | null;

  if (!data || typeof data.price !== 'number') return null;

  return {
    value: data.price,
    value_high: data.priceRangeHigh ?? data.price,
    value_low: data.priceRangeLow ?? data.price,
    comparables: (data.comparables ?? []).map((c) => ({
      address: c.formattedAddress ?? '',
      sale_price: c.price ?? 0,
      sale_date: c.removedDate ?? c.lastSeenDate ?? c.listedDate ?? '',
      bedrooms: c.bedrooms ?? 0,
      bathrooms: c.bathrooms ?? 0,
      square_feet: c.squareFootage ?? 0,
      distance_miles: c.distance ?? 0,
    })),
  };
}

/**
 * ZIP-level market statistics: median rent, median value, derived cap rate.
 *
 * RentCast's /markets endpoint exposes saleData and rentalData blocks. We
 * derive cap rate as (annualized median rent / median value) × 100, which
 * is a rough gross cap rate (no expense adjustment) but matches what most
 * investor underwriting dashboards show at the market level.
 */
export async function getMarketData(zip: string, explicitKey?: string): Promise<MarketData | null> {
  const apiKey = explicitKey ?? process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;

  const data = (await rcFetch(
    `/markets?zipCode=${encodeURIComponent(zip)}&dataType=All`,
    apiKey,
    'rentcast_market',
  )) as
    | {
        saleData?: { medianPrice?: number };
        rentalData?: { medianRent?: number };
      }
    | null;

  if (!data) return null;

  const median_value = data.saleData?.medianPrice ?? 0;
  const median_rent = data.rentalData?.medianRent ?? 0;

  if (!median_value || !median_rent) return null;

  const cap_rate = Number(((median_rent * 12) / median_value) * 100);

  return {
    median_rent,
    median_value,
    cap_rate: Number.isFinite(cap_rate) ? Math.round(cap_rate * 100) / 100 : 0,
  };
}

/**
 * True if a RentCast API key is configured. Used by the deal scorer to
 * decide whether to attempt real-comp enrichment or skip straight to
 * Claude-only / "simulated" mode.
 *
 * Pass `explicitKey` to check a per-org key fetched from `integration_configs`.
 */
export function isRentCastConfigured(explicitKey?: string): boolean {
  return Boolean(explicitKey ?? process.env.RENTCAST_API_KEY);
}
