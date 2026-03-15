/**
 * Data transformation utilities for ingestion connectors.
 * Handles normalization, geocoding, and schema mapping.
 */

// ─── State/FIPS Normalization ──────────────────────────────────────────────

const STATE_FIPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY',
};

const STATE_ABBREV_TO_FIPS = Object.fromEntries(
  Object.entries(STATE_FIPS).map(([fips, abbrev]) => [abbrev, fips]),
);

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/**
 * Convert FIPS code to state abbreviation.
 */
export function fipsToState(fips: string): string | null {
  return STATE_FIPS[fips.slice(0, 2)] || null;
}

/**
 * Convert state abbreviation to FIPS prefix.
 */
export function stateToFips(abbrev: string): string | null {
  return STATE_ABBREV_TO_FIPS[abbrev.toUpperCase()] || null;
}

/**
 * Get full state name from abbreviation.
 */
export function stateName(abbrev: string): string {
  return STATE_NAMES[abbrev.toUpperCase()] || abbrev;
}

/**
 * Extract county FIPS from a full FIPS code (first 5 digits = state + county).
 */
export function countyFips(fullFips: string): string {
  return fullFips.slice(0, 5);
}

// ─── Value Normalization ───────────────────────────────────────────────────

/**
 * Parse a numeric value, handling currency strings, commas, etc.
 */
export function parseNumeric(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  if (typeof value !== 'string') return null;

  const cleaned = value.replace(/[$,\s]/g, '');
  if (cleaned === '' || cleaned === 'N/A' || cleaned === '-') return null;

  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse acreage, handling sqft conversion if needed.
 */
export function parseAcreage(value: unknown, unit: 'acres' | 'sqft' = 'acres'): number | null {
  const num = parseNumeric(value);
  if (num == null) return null;
  return unit === 'sqft' ? num / 43560 : num;
}

/**
 * Normalize a zoning code to uppercase, trimmed.
 */
export function normalizeZoning(code: unknown): string | null {
  if (typeof code !== 'string' || !code.trim()) return null;
  return code.trim().toUpperCase();
}

/**
 * Categorize a zoning code into broad categories.
 */
export function categorizeZoning(code: string): string {
  const c = code.toUpperCase();
  if (/^R[-\s]?\d|^RES|^SF|^MF|^MH/.test(c)) return 'residential';
  if (/^C[-\s]?\d|^COM|^B[-\s]?\d|^BUS/.test(c)) return 'commercial';
  if (/^I[-\s]?\d|^IND|^M[-\s]?\d|^MFG/.test(c)) return 'industrial';
  if (/^A[-\s]?\d|^AG|^RU/.test(c)) return 'agricultural';
  if (/^MU|^MX|^PD|^PUD/.test(c)) return 'mixed_use';
  if (/^OS|^P[-\s]?\d|^PUB|^GOV/.test(c)) return 'special';
  return 'other';
}

// ─── FEMA Flood Zone Helpers ───────────────────────────────────────────────

/**
 * Map FEMA flood zone code to a severity level.
 */
export function floodZoneSeverity(zone: string): string {
  const z = zone.toUpperCase().trim();
  if (['V', 'VE', 'V1-30'].some((v) => z.startsWith(v))) return 'high';       // Coastal high-hazard
  if (['A', 'AE', 'AH', 'AO', 'AR', 'A1-30', 'A99'].some((v) => z.startsWith(v))) return 'high'; // 100-year
  if (z.startsWith('B') || z === '0.2 PCT ANNUAL CHANCE' || z === 'SHADED X') return 'moderate'; // 500-year
  if (z.startsWith('C') || z === 'X' || z === 'UNSHADED X') return 'minimal'; // Outside floodplain
  if (z.startsWith('D')) return 'low'; // Undetermined
  return 'low';
}

// ─── GeoJSON Helpers ───────────────────────────────────────────────────────

/**
 * Convert a GeoJSON geometry to WKT for PostGIS.
 * Simple implementation — handles Point, Polygon, MultiPolygon.
 */
export function geojsonToWkt(geojson: { type: string; coordinates: unknown }): string | null {
  if (!geojson?.type || !geojson?.coordinates) return null;

  switch (geojson.type) {
    case 'Point': {
      const [lng, lat] = geojson.coordinates as [number, number];
      return `SRID=4326;POINT(${lng} ${lat})`;
    }
    case 'Polygon': {
      const rings = geojson.coordinates as number[][][];
      const wktRings = rings.map((ring) =>
        '(' + ring.map(([lng, lat]) => `${lng} ${lat}`).join(',') + ')',
      );
      return `SRID=4326;POLYGON(${wktRings.join(',')})`;
    }
    case 'MultiPolygon': {
      const polygons = geojson.coordinates as number[][][][];
      const wktPolygons = polygons.map((polygon) => {
        const rings = polygon.map((ring) =>
          '(' + ring.map(([lng, lat]) => `${lng} ${lat}`).join(',') + ')',
        );
        return '(' + rings.join(',') + ')';
      });
      return `SRID=4326;MULTIPOLYGON(${wktPolygons.join(',')})`;
    }
    default:
      return null;
  }
}

/**
 * Calculate centroid of a GeoJSON polygon (simple average — not geodesic).
 */
export function simpleCentroid(geojson: { type: string; coordinates: unknown }): { lat: number; lng: number } | null {
  if (!geojson?.coordinates) return null;

  let coords: number[][] = [];

  if (geojson.type === 'Polygon') {
    coords = (geojson.coordinates as number[][][])[0]; // outer ring
  } else if (geojson.type === 'MultiPolygon') {
    coords = (geojson.coordinates as number[][][][])[0][0]; // first polygon outer ring
  } else if (geojson.type === 'Point') {
    const [lng, lat] = geojson.coordinates as [number, number];
    return { lat, lng };
  } else {
    return null;
  }

  if (coords.length === 0) return null;

  const sum = coords.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );

  return {
    lat: sum.lat / coords.length,
    lng: sum.lng / coords.length,
  };
}

// ─── Deduplication Key ─────────────────────────────────────────────────────

/**
 * Create a deterministic dedup key from record fields.
 */
export function dedupKey(...parts: (string | number | null | undefined)[]): string {
  return parts
    .map((p) => (p == null ? '' : String(p).trim().toLowerCase()))
    .join('|');
}
