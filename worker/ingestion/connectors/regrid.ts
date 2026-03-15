/**
 * Regrid Connector — Nationwide Parcel Data
 *
 * Ingests parcel boundaries, ownership, and assessment data.
 * This is the core data layer for the platform.
 *
 * API: https://app.regrid.com/api/v2
 * Auth: API key (paid — ~$0.01/parcel for bulk)
 * Rate limit: varies by plan
 *
 * Coverage: ~155M parcels across all 50 states
 */

import { BaseConnector, type FetchResult, type TransformResult } from '../base-connector.js';
import { parseNumeric, parseAcreage, normalizeZoning, categorizeZoning } from '../transform.js';

interface RegridParcel {
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: unknown;
  } | null;
  properties: {
    parcelnumb: string;
    parcelnumb_no_formatting: string;
    state2: string;
    county: string;
    situs_address: string;
    situs_address2: string;
    situs_city: string;
    situs_state: string;
    situs_zip: string;
    owner: string;
    mail_addres: string;
    mail_city: string;
    mail_state2: string;
    mail_zip: string;
    zoning: string;
    zoning_description: string;
    usecode: string;
    usedesc: string;
    struct: boolean;
    multistruct: boolean;
    structno: number;
    yearbuilt: number;
    numstories: number;
    numunits: number;
    numrooms: number;
    numbedrooms: number;
    numbaths: number;
    lotsize_acres: number;
    lotsize_sf: number;
    livingarea_sf: number;
    assessed_value: number;
    appraised_value: number;
    market_value: number;
    tax_amount: number;
    tax_year: number;
    latitude: number;
    longitude: number;
    fips: string;
    census_tract: string;
    census_block: string;
    geoid: string;
    ll_gisacre: number;
  };
}

export class RegridConnector extends BaseConnector {
  private apiKey: string;

  constructor() {
    super({
      sourceSlug: 'regrid-parcels',
      batchSize: 500,
      rateLimitRpm: 30,
      maxRetries: 3,
      retryDelayMs: 3000,
      timeoutMs: 60000,
    });
    this.apiKey = process.env.REGRID_API_KEY || '';
  }

  protected async fetch(params: {
    states?: string[];
    counties?: string[];
    bbox?: [number, number, number, number];
    cursor?: string;
    limit: number;
  }): Promise<FetchResult<RegridParcel>> {
    if (!this.apiKey) {
      throw new Error('REGRID_API_KEY environment variable is required');
    }

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/json',
    };

    let url: string;

    if (params.cursor) {
      // Regrid uses cursor-based pagination
      url = params.cursor;
    } else if (params.bbox) {
      const [west, south, east, north] = params.bbox;
      url = `https://app.regrid.com/api/v2/parcels?bbox=${west},${south},${east},${north}&limit=${params.limit}&return_geometry=true`;
    } else if (params.counties?.length && params.states?.length) {
      // Query by state + county FIPS
      const state = params.states[0];
      const county = params.counties[0];
      url = `https://app.regrid.com/api/v2/parcels?state2=${state}&county=${encodeURIComponent(county)}&limit=${params.limit}&return_geometry=true`;
    } else if (params.states?.length) {
      url = `https://app.regrid.com/api/v2/parcels?state2=${params.states[0]}&limit=${params.limit}&return_geometry=true`;
    } else {
      throw new Error('Regrid connector requires at least a state, county, or bbox filter');
    }

    // Add field selection for efficiency
    url += '&fields=parcelnumb,state2,county,situs_address,owner,zoning,usecode,usedesc,lotsize_acres,lotsize_sf,assessed_value,market_value,tax_amount,tax_year,yearbuilt,latitude,longitude,fips,ll_gisacre';

    const response = await this.httpFetch(url, { headers });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Regrid API error ${response.status}: ${body.slice(0, 200)}`);
    }

    const json = await response.json() as {
      type: string;
      features: RegridParcel[];
      links?: {
        next?: string;
      };
    };

    const features = json.features || [];

    return {
      records: features,
      hasMore: !!json.links?.next,
      cursor: json.links?.next || undefined,
      metadata: { featureCount: features.length },
    };
  }

  protected async transform(raw: RegridParcel[]): Promise<TransformResult[]> {
    const parcels = raw
      .filter((f) => f.properties?.state2 && (f.properties?.latitude || f.geometry))
      .map((feature) => {
        const p = feature.properties;
        const acreage = parseAcreage(p.ll_gisacre || p.lotsize_acres) ||
                        parseAcreage(p.lotsize_sf, 'sqft');
        const zoning = normalizeZoning(p.zoning);

        return {
          apn: p.parcelnumb || p.parcelnumb_no_formatting || null,
          address: p.situs_address || null,
          acreage,
          zoning,
          owner: p.owner || null,
          state: p.state2,
          county: p.county || '',
          lat: p.latitude,
          lng: p.longitude,
          fips_code: p.fips || null,
          assessed_value: parseNumeric(p.assessed_value),
          market_value: parseNumeric(p.market_value),
          tax_amount: parseNumeric(p.tax_amount),
          tax_year: p.tax_year || null,
          lot_size_sqft: parseNumeric(p.lotsize_sf),
          year_built: p.yearbuilt || null,
          land_use_code: p.usecode || null,
          land_use_desc: p.usedesc || null,
          raw_data: JSON.stringify({
            regrid_id: feature.id,
            zoning_description: p.zoning_description,
            struct: p.struct,
            stories: p.numstories,
            units: p.numunits,
          }),
          updated_at: new Date().toISOString(),
        };
      });

    // Also extract zoning info if present
    const zoningRecords = raw
      .filter((f) => f.properties?.zoning && f.properties?.county)
      .reduce((acc, feature) => {
        const p = feature.properties;
        const zoneCode = normalizeZoning(p.zoning);
        if (!zoneCode) return acc;

        const key = `${p.state2}-${p.county}-${zoneCode}`;
        if (!acc.has(key)) {
          acc.set(key, {
            jurisdiction: p.county,
            state: p.state2,
            county: p.county,
            zone_code: zoneCode,
            zone_name: p.zoning_description || null,
            zone_category: categorizeZoning(zoneCode),
            updated_at: new Date().toISOString(),
          });
        }
        return acc;
      }, new Map<string, Record<string, unknown>>());

    const results: TransformResult[] = [{
      table: 'parcels',
      records: parcels,
      conflictColumns: ['apn', 'state', 'county'],
    }];

    if (zoningRecords.size > 0) {
      results.push({
        table: 'zoning_districts',
        records: Array.from(zoningRecords.values()),
        conflictColumns: ['jurisdiction', 'state', 'zone_code'],
      });
    }

    return results;
  }
}
