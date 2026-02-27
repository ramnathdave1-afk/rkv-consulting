// ============================================================================
// Market Data — Metric Configs & Live Data Fetching
// Ported metric configs from /Users/daveramnath/az-heatmap/lib/types.ts
// Adds live data fetching from Rentcast, FRED, BLS APIs
// ============================================================================

import type { HeatMapMetricConfig, HeatMapCityMarketData } from '@/types';

// ─── Metric Configuration ────────────────────────────────────────────

export const HEAT_MAP_METRIC_CONFIGS: HeatMapMetricConfig[] = [
  {
    key: 'medianPrice',
    label: 'Median Home Price',
    shortLabel: 'Med. Price',
    format: (v: number) => `$${(v / 1000).toFixed(0)}K`,
    colorScale: 'price',
    description: 'Median sale price of homes',
    unit: '$',
  },
  {
    key: 'pricePerSqft',
    label: 'Price Per Sq Ft',
    shortLabel: '$/Sqft',
    format: (v: number) => `$${v.toFixed(0)}`,
    colorScale: 'price',
    description: 'Average price per square foot',
    unit: '$/sqft',
  },
  {
    key: 'daysOnMarket',
    label: 'Days on Market',
    shortLabel: 'DOM',
    format: (v: number) => `${v.toFixed(0)}d`,
    colorScale: 'speed',
    description: 'Average days a listing stays active',
    unit: 'days',
  },
  {
    key: 'activeInventory',
    label: 'Active Inventory',
    shortLabel: 'Inventory',
    format: (v: number) => v.toLocaleString(),
    colorScale: 'inventory',
    description: 'Number of active listings',
    unit: 'listings',
  },
  {
    key: 'monthsOfSupply',
    label: 'Months of Supply',
    shortLabel: 'Supply',
    format: (v: number) => `${v.toFixed(1)}mo`,
    colorScale: 'inventory',
    description: 'Months to sell current inventory at current pace',
    unit: 'months',
  },
  {
    key: 'yoyChange',
    label: 'Year-over-Year Change',
    shortLabel: 'YoY %',
    format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    colorScale: 'diverging',
    description: 'Price change vs same period last year',
    unit: '%',
  },
  {
    key: 'medianRent',
    label: 'Median Rent',
    shortLabel: 'Med. Rent',
    format: (v: number) => `$${v.toLocaleString()}`,
    colorScale: 'price',
    description: 'Median monthly rental price',
    unit: '$/mo',
  },
  {
    key: 'populationGrowth',
    label: 'Population Growth',
    shortLabel: 'Pop Growth',
    format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    colorScale: 'diverging',
    description: 'Annual population growth rate',
    unit: '%',
  },
];

// ─── US States Data ──────────────────────────────────────────────────

export const US_STATES: { code: string; name: string; center: [number, number] }[] = [
  { code: 'AL', name: 'Alabama', center: [32.806671, -86.791130] },
  { code: 'AK', name: 'Alaska', center: [61.370716, -152.404419] },
  { code: 'AZ', name: 'Arizona', center: [33.729759, -111.431221] },
  { code: 'AR', name: 'Arkansas', center: [34.969704, -92.373123] },
  { code: 'CA', name: 'California', center: [36.116203, -119.681564] },
  { code: 'CO', name: 'Colorado', center: [39.059811, -105.311104] },
  { code: 'CT', name: 'Connecticut', center: [41.597782, -72.755371] },
  { code: 'DE', name: 'Delaware', center: [39.318523, -75.507141] },
  { code: 'FL', name: 'Florida', center: [27.766279, -81.686783] },
  { code: 'GA', name: 'Georgia', center: [33.040619, -83.643074] },
  { code: 'HI', name: 'Hawaii', center: [21.094318, -157.498337] },
  { code: 'ID', name: 'Idaho', center: [44.240459, -114.478828] },
  { code: 'IL', name: 'Illinois', center: [40.349457, -88.986137] },
  { code: 'IN', name: 'Indiana', center: [39.849426, -86.258278] },
  { code: 'IA', name: 'Iowa', center: [42.011539, -93.210526] },
  { code: 'KS', name: 'Kansas', center: [38.526600, -96.726486] },
  { code: 'KY', name: 'Kentucky', center: [37.668140, -84.670067] },
  { code: 'LA', name: 'Louisiana', center: [31.169546, -91.867805] },
  { code: 'ME', name: 'Maine', center: [44.693947, -69.381927] },
  { code: 'MD', name: 'Maryland', center: [39.063946, -76.802101] },
  { code: 'MA', name: 'Massachusetts', center: [42.230171, -71.530106] },
  { code: 'MI', name: 'Michigan', center: [43.326618, -84.536095] },
  { code: 'MN', name: 'Minnesota', center: [45.694454, -93.900192] },
  { code: 'MS', name: 'Mississippi', center: [32.741646, -89.678696] },
  { code: 'MO', name: 'Missouri', center: [38.456085, -92.288368] },
  { code: 'MT', name: 'Montana', center: [46.921925, -110.454353] },
  { code: 'NE', name: 'Nebraska', center: [41.125370, -98.268082] },
  { code: 'NV', name: 'Nevada', center: [38.313515, -117.055374] },
  { code: 'NH', name: 'New Hampshire', center: [43.452492, -71.563896] },
  { code: 'NJ', name: 'New Jersey', center: [40.298904, -74.521011] },
  { code: 'NM', name: 'New Mexico', center: [34.840515, -106.248482] },
  { code: 'NY', name: 'New York', center: [42.165726, -74.948051] },
  { code: 'NC', name: 'North Carolina', center: [35.630066, -79.806419] },
  { code: 'ND', name: 'North Dakota', center: [47.528912, -99.784012] },
  { code: 'OH', name: 'Ohio', center: [40.388783, -82.764915] },
  { code: 'OK', name: 'Oklahoma', center: [35.565342, -96.928917] },
  { code: 'OR', name: 'Oregon', center: [44.572021, -122.070938] },
  { code: 'PA', name: 'Pennsylvania', center: [40.590752, -77.209755] },
  { code: 'RI', name: 'Rhode Island', center: [41.680893, -71.511780] },
  { code: 'SC', name: 'South Carolina', center: [33.856892, -80.945007] },
  { code: 'SD', name: 'South Dakota', center: [44.299782, -99.438828] },
  { code: 'TN', name: 'Tennessee', center: [35.747845, -86.692345] },
  { code: 'TX', name: 'Texas', center: [31.054487, -97.563461] },
  { code: 'UT', name: 'Utah', center: [40.150032, -111.862434] },
  { code: 'VT', name: 'Vermont', center: [44.045876, -72.710686] },
  { code: 'VA', name: 'Virginia', center: [37.769337, -78.169968] },
  { code: 'WA', name: 'Washington', center: [47.400902, -121.490494] },
  { code: 'WV', name: 'West Virginia', center: [38.491226, -80.954456] },
  { code: 'WI', name: 'Wisconsin', center: [44.268543, -89.616508] },
  { code: 'WY', name: 'Wyoming', center: [42.755966, -107.302490] },
  { code: 'DC', name: 'District of Columbia', center: [38.897438, -77.026817] },
];

// ─── Major Metro Areas ───────────────────────────────────────────────

export const MAJOR_METROS: { name: string; state: string; center: [number, number]; population: number }[] = [
  { name: 'New York', state: 'NY', center: [40.7128, -74.0060], population: 8336817 },
  { name: 'Los Angeles', state: 'CA', center: [34.0522, -118.2437], population: 3979576 },
  { name: 'Chicago', state: 'IL', center: [41.8781, -87.6298], population: 2693976 },
  { name: 'Houston', state: 'TX', center: [29.7604, -95.3698], population: 2320268 },
  { name: 'Phoenix', state: 'AZ', center: [33.4484, -112.0740], population: 1680992 },
  { name: 'Philadelphia', state: 'PA', center: [39.9526, -75.1652], population: 1603797 },
  { name: 'San Antonio', state: 'TX', center: [29.4241, -98.4936], population: 1547253 },
  { name: 'San Diego', state: 'CA', center: [32.7157, -117.1611], population: 1423851 },
  { name: 'Dallas', state: 'TX', center: [32.7767, -96.7970], population: 1343573 },
  { name: 'Austin', state: 'TX', center: [30.2672, -97.7431], population: 1028225 },
  { name: 'Jacksonville', state: 'FL', center: [30.3322, -81.6557], population: 954614 },
  { name: 'San Jose', state: 'CA', center: [37.3382, -121.8863], population: 1021795 },
  { name: 'Fort Worth', state: 'TX', center: [32.7555, -97.3308], population: 918915 },
  { name: 'Columbus', state: 'OH', center: [39.9612, -82.9988], population: 905748 },
  { name: 'Charlotte', state: 'NC', center: [35.2271, -80.8431], population: 874579 },
  { name: 'Indianapolis', state: 'IN', center: [39.7684, -86.1581], population: 887642 },
  { name: 'San Francisco', state: 'CA', center: [37.7749, -122.4194], population: 873965 },
  { name: 'Seattle', state: 'WA', center: [47.6062, -122.3321], population: 737015 },
  { name: 'Denver', state: 'CO', center: [39.7392, -104.9903], population: 715522 },
  { name: 'Nashville', state: 'TN', center: [36.1627, -86.7816], population: 689447 },
  { name: 'Oklahoma City', state: 'OK', center: [35.4676, -97.5164], population: 681054 },
  { name: 'Las Vegas', state: 'NV', center: [36.1699, -115.1398], population: 641903 },
  { name: 'Portland', state: 'OR', center: [45.5152, -122.6784], population: 652503 },
  { name: 'Memphis', state: 'TN', center: [35.1495, -90.0490], population: 633104 },
  { name: 'Louisville', state: 'KY', center: [38.2527, -85.7585], population: 633045 },
  { name: 'Baltimore', state: 'MD', center: [39.2904, -76.6122], population: 585708 },
  { name: 'Milwaukee', state: 'WI', center: [43.0389, -87.9065], population: 577222 },
  { name: 'Albuquerque', state: 'NM', center: [35.0844, -106.6504], population: 564559 },
  { name: 'Tucson', state: 'AZ', center: [32.2226, -110.9747], population: 542629 },
  { name: 'Fresno', state: 'CA', center: [36.7378, -119.7871], population: 542107 },
  { name: 'Sacramento', state: 'CA', center: [38.5816, -121.4944], population: 524943 },
  { name: 'Atlanta', state: 'GA', center: [33.7490, -84.3880], population: 498715 },
  { name: 'Miami', state: 'FL', center: [25.7617, -80.1918], population: 467963 },
  { name: 'Raleigh', state: 'NC', center: [35.7796, -78.6382], population: 467665 },
  { name: 'Tampa', state: 'FL', center: [27.9506, -82.4572], population: 399700 },
  { name: 'Minneapolis', state: 'MN', center: [44.9778, -93.2650], population: 429606 },
  { name: 'Cleveland', state: 'OH', center: [41.4993, -81.6944], population: 372624 },
  { name: 'Pittsburgh', state: 'PA', center: [40.4406, -79.9959], population: 302407 },
  { name: 'St. Louis', state: 'MO', center: [38.6270, -90.1994], population: 301578 },
  { name: 'Orlando', state: 'FL', center: [28.5383, -81.3792], population: 307573 },
  { name: 'Boise', state: 'ID', center: [43.6150, -116.2023], population: 235684 },
  { name: 'Salt Lake City', state: 'UT', center: [40.7608, -111.8910], population: 200133 },
  { name: 'Richmond', state: 'VA', center: [37.5407, -77.4360], population: 226610 },
  { name: 'Birmingham', state: 'AL', center: [33.5186, -86.8104], population: 200733 },
  { name: 'Pottstown', state: 'PA', center: [40.2454, -75.6496], population: 22670 },
];

// ─── Live Data Fetching Functions ────────────────────────────────────

/**
 * Fetch market data for a specific location from Rentcast API
 */
export async function fetchRentcastMarketData(
  city: string,
  state: string,
  zip?: string
): Promise<Partial<HeatMapCityMarketData['byType']['all']> | null> {
  try {
    const params = new URLSearchParams();
    if (zip) {
      params.set('zipCode', zip);
    } else {
      params.set('city', city);
      params.set('state', state);
    }

    const res = await fetch(`/api/market/live?${params.toString()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch economic data from FRED API (interest rates, unemployment, etc.)
 */
export async function fetchFREDData(
  seriesId: string,
  limit = 12
): Promise<{ date: string; value: number }[] | null> {
  try {
    const res = await fetch(`/api/market/historical?series=${seriesId}&limit=${limit}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// FRED Series IDs for common economic indicators
export const FRED_SERIES = {
  MORTGAGE_30YR: 'MORTGAGE30US',
  MORTGAGE_15YR: 'MORTGAGE15US',
  FED_FUNDS_RATE: 'FEDFUNDS',
  UNEMPLOYMENT: 'UNRATE',
  CPI: 'CPIAUCSL',
  GDP_GROWTH: 'A191RL1Q225SBEA',
  HOUSING_STARTS: 'HOUST',
  NEW_HOME_SALES: 'HSN1F',
  EXISTING_HOME_SALES: 'EXHOSLUSM495S',
  CASE_SHILLER: 'CSUSHPINSA',
} as const;

/**
 * Calculate investment potential score (0-100) for a market
 * Based on: cap rate vs avg, rent growth, appreciation, vacancy, job growth, population growth
 */
export function calculateInvestmentPotentialScore(data: {
  capRate?: number;
  rentGrowth?: number;
  appreciation?: number;
  vacancyRate?: number;
  jobGrowth?: number;
  populationGrowth?: number;
  priceToRentRatio?: number;
}): number {
  let score = 50; // Start at neutral

  // Cap rate (higher is better for investors)
  if (data.capRate !== undefined) {
    if (data.capRate >= 8) score += 15;
    else if (data.capRate >= 6) score += 10;
    else if (data.capRate >= 4) score += 5;
    else if (data.capRate < 3) score -= 10;
  }

  // Rent growth (positive is good)
  if (data.rentGrowth !== undefined) {
    score += Math.min(10, Math.max(-10, data.rentGrowth * 3));
  }

  // Appreciation (moderate is best)
  if (data.appreciation !== undefined) {
    if (data.appreciation >= 3 && data.appreciation <= 8) score += 8;
    else if (data.appreciation > 8) score += 3; // Too hot, might correct
    else if (data.appreciation < 0) score -= 5;
  }

  // Vacancy (lower is better)
  if (data.vacancyRate !== undefined) {
    if (data.vacancyRate < 3) score += 8;
    else if (data.vacancyRate < 5) score += 4;
    else if (data.vacancyRate > 8) score -= 8;
  }

  // Job growth
  if (data.jobGrowth !== undefined) {
    score += Math.min(8, Math.max(-5, data.jobGrowth * 2));
  }

  // Population growth
  if (data.populationGrowth !== undefined) {
    score += Math.min(8, Math.max(-5, data.populationGrowth * 3));
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
