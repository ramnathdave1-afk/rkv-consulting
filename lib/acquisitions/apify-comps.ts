/**
 * Apify-based comps client for Acquisitions deal scoring.
 *
 * Uses Zillow scraper Actors on Apify (we already pay for Apify usage credits)
 * as a free-with-existing-subscription replacement for RentCast's paid AVM API.
 *
 * Trade-off vs RentCast:
 *   - Apify: free with our existing subscription, slower (~30 sec per scrape),
 *     Zillow data, no first-party AVM (we approximate from comps).
 *   - RentCast: $49/mo paid, faster (~2 sec), purpose-built AVM endpoints.
 *
 * Functions return null/empty array on any failure so the deal scorer can fall
 * back to RentCast (if configured) or "simulated" mode. All errors flow through
 * Sentry via captureException.
 */

import { captureException } from '@/lib/monitoring/sentry';

export interface PropertyAddress {
  address: string; // e.g. "123 Main St"
  city: string;
  state: string;
  zip: string;
}

export interface ApifyComparable {
  address: string;
  price: number;
  rent_estimate?: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  year_built?: number;
  sale_date?: string;
  distance_miles?: number;
  source: 'zillow' | 'realtor' | 'redfin';
}

export interface ApifyValueEstimate {
  /** Median sale price across returned comps. */
  value: number;
  value_high: number;
  value_low: number;
  comparables: ApifyComparable[];
}

export interface ApifyRentEstimate {
  /** Median monthly rent across returned rental comps. */
  rent: number;
  rent_high: number;
  rent_low: number;
  comparables: ApifyComparable[];
}

export interface ApifyMarketData {
  median_rent: number;
  median_value: number;
  cap_rate: number;
}

const APIFY_BASE = 'https://api.apify.com/v2';

// Default Zillow Actor IDs. The user can override via env if they want to swap
// to a different scraper (e.g. realtor.com or redfin Actors). These IDs use
// the slash form Apify accepts in run URLs (we URL-encode at call time).
const ZILLOW_SOLD_ACTOR =
  process.env.APIFY_ZILLOW_SOLD_ACTOR ?? 'maxcopell/zillow-search-scraper';
const ZILLOW_RENTAL_ACTOR =
  process.env.APIFY_ZILLOW_RENTAL_ACTOR ?? 'maxcopell/zillow-search-scraper';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30; // 30 * 2s = 60s max wait

interface ApifyRunResponse {
  data?: {
    id?: string;
    status?: string;
    defaultDatasetId?: string;
  };
}

/**
 * Run an Apify Actor synchronously: start the run, poll for completion, then
 * return the dataset items. Returns [] on any failure.
 */
async function callApifyActor<T = unknown>(
  actorId: string,
  input: unknown,
  context: string,
): Promise<T[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    captureException(new Error('APIFY_API_TOKEN not set'), { context });
    return [];
  }

  // Apify accepts actor IDs with the `/` URL-encoded as `~`.
  const encodedActor = actorId.replace('/', '~');

  try {
    const startRes = await fetch(
      `${APIFY_BASE}/acts/${encodedActor}/runs?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
    if (!startRes.ok) {
      captureException(new Error(`Apify start failed: ${startRes.status}`), {
        context,
        actorId,
        status: startRes.status,
      });
      return [];
    }
    const start = (await startRes.json()) as ApifyRunResponse;
    const runId = start.data?.id;
    if (!runId) return [];

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const statusRes = await fetch(
        `${APIFY_BASE}/actor-runs/${runId}?token=${encodeURIComponent(token)}`,
      );
      if (!statusRes.ok) continue;
      const status = (await statusRes.json()) as ApifyRunResponse;
      const s = status.data?.status;
      if (s === 'SUCCEEDED') {
        const datasetId = status.data?.defaultDatasetId;
        if (!datasetId) return [];
        const dataRes = await fetch(
          `${APIFY_BASE}/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=true&format=json`,
        );
        if (!dataRes.ok) return [];
        const items = (await dataRes.json()) as T[];
        return Array.isArray(items) ? items : [];
      }
      if (s && ['FAILED', 'TIMED-OUT', 'ABORTED'].includes(s)) {
        captureException(new Error(`Apify run ${s}`), { context, actorId, runId });
        return [];
      }
    }
    // Timed out waiting locally — Actor may still be running but we move on.
    return [];
  } catch (err) {
    captureException(err, { context, actorId });
    return [];
  }
}

/**
 * Apify Zillow Actors return loose, varying schemas. Normalize the few fields
 * we care about across the most common shapes.
 */
function normalizeZillowItem(r: Record<string, unknown>): ApifyComparable | null {
  const address =
    (r.address as { streetAddress?: string; full?: string } | undefined)?.streetAddress ??
    (r.address as { streetAddress?: string; full?: string } | undefined)?.full ??
    (r.streetAddress as string | undefined) ??
    (r.fullAddress as string | undefined) ??
    (typeof r.address === 'string' ? (r.address as string) : '') ??
    '';

  const price =
    (r.price as number | undefined) ??
    (r.lastSoldPrice as number | undefined) ??
    (r.zestimate as number | undefined) ??
    (r.unformattedPrice as number | undefined) ??
    0;

  if (!price || typeof price !== 'number') return null;

  return {
    address: String(address),
    price,
    rent_estimate: (r.rentZestimate as number | undefined) ?? undefined,
    bedrooms: (r.bedrooms as number | undefined) ?? (r.beds as number | undefined) ?? 0,
    bathrooms: (r.bathrooms as number | undefined) ?? (r.baths as number | undefined) ?? 0,
    square_feet:
      (r.livingArea as number | undefined) ??
      (r.area as number | undefined) ??
      (r.sqft as number | undefined) ??
      0,
    year_built: (r.yearBuilt as number | undefined) ?? undefined,
    sale_date:
      (r.dateSold as string | undefined) ??
      (r.lastSoldDate as string | undefined) ??
      undefined,
    source: 'zillow',
  };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function pct(nums: number[], p: number): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

/**
 * Fetch nearby sold comparables from Zillow via Apify.
 */
export async function getCompsViaApify(addr: PropertyAddress): Promise<ApifyComparable[]> {
  const searchQuery = `${addr.city}, ${addr.state} ${addr.zip}`;
  const url = `https://www.zillow.com/homes/recently_sold/${encodeURIComponent(searchQuery)}_rb/`;

  const results = await callApifyActor<Record<string, unknown>>(
    ZILLOW_SOLD_ACTOR,
    {
      searchUrls: [{ url }],
      maxItems: 20,
      extractionMethod: 'PAGINATION_WITH_ZOOM_IN',
    },
    'apify_comps_sold',
  );

  return results
    .map(normalizeZillowItem)
    .filter((c): c is ApifyComparable => c !== null && c.price > 0)
    .slice(0, 10);
}

/**
 * Approximate an AVM from Zillow comps: use the median sale price as the
 * point estimate, and the 25th/75th percentile as the low/high band.
 */
export async function getValueEstimateViaApify(
  addr: PropertyAddress,
): Promise<ApifyValueEstimate | null> {
  const comps = await getCompsViaApify(addr);
  if (comps.length === 0) return null;

  const prices = comps.map((c) => c.price).filter((p) => p > 0);
  if (prices.length === 0) return null;

  return {
    value: Math.round(median(prices)),
    value_low: Math.round(pct(prices, 0.25)),
    value_high: Math.round(pct(prices, 0.75)),
    comparables: comps,
  };
}

/**
 * Fetch nearby active rentals from Zillow via Apify and approximate a rent AVM.
 */
export async function getRentEstimateViaApify(
  addr: PropertyAddress,
): Promise<ApifyRentEstimate | null> {
  const searchQuery = `${addr.city}, ${addr.state} ${addr.zip}`;
  const url = `https://www.zillow.com/homes/for_rent/${encodeURIComponent(searchQuery)}_rb/`;

  const results = await callApifyActor<Record<string, unknown>>(
    ZILLOW_RENTAL_ACTOR,
    {
      searchUrls: [{ url }],
      maxItems: 20,
      extractionMethod: 'PAGINATION_WITH_ZOOM_IN',
    },
    'apify_comps_rent',
  );

  // For rentals, the "price" field on Zillow is monthly rent.
  const comps = results
    .map(normalizeZillowItem)
    .filter((c): c is ApifyComparable => c !== null && c.price > 0)
    .slice(0, 10);

  if (comps.length === 0) return null;

  const rents = comps.map((c) => c.price).filter((p) => p > 0);
  if (rents.length === 0) return null;

  return {
    rent: Math.round(median(rents)),
    rent_low: Math.round(pct(rents, 0.25)),
    rent_high: Math.round(pct(rents, 0.75)),
    // Reshape so the comparable's primary number is rent, not sale price.
    comparables: comps.map((c) => ({ ...c, rent_estimate: c.price })),
  };
}

/**
 * Approximate ZIP-level market data by aggregating both sold and rental comps.
 */
export async function getMarketDataViaApify(
  addr: PropertyAddress,
): Promise<ApifyMarketData | null> {
  const [valueEst, rentEst] = await Promise.all([
    getValueEstimateViaApify(addr),
    getRentEstimateViaApify(addr),
  ]);

  const median_value = valueEst?.value ?? 0;
  const median_rent = rentEst?.rent ?? 0;
  if (!median_value || !median_rent) return null;

  const cap_rate = ((median_rent * 12) / median_value) * 100;
  return {
    median_value,
    median_rent,
    cap_rate: Number.isFinite(cap_rate) ? Math.round(cap_rate * 100) / 100 : 0,
  };
}

export function isApifyConfigured(): boolean {
  return !!process.env.APIFY_API_TOKEN;
}
