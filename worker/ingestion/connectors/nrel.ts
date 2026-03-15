/**
 * NREL Connector — National Renewable Energy Laboratory
 *
 * Ingests solar irradiance (GHI/DNI) and wind speed data.
 * Used for scoring solar and wind vertical sites.
 *
 * APIs:
 * - Solar Resource: https://developer.nrel.gov/api/solar/solar_resource/v1
 * - Wind Resource: (Wind Toolkit via HSDS or summary endpoints)
 *
 * Auth: API key (free, register at developer.nrel.gov)
 * Rate limit: 1000 req/hour
 */

import { BaseConnector, type FetchResult, type TransformResult } from '../base-connector.js';
import { supabase } from '../../lib/supabase.js';

interface NrelSolarData {
  lat: number;
  lng: number;
  state: string;
  county: string;
  ghi: number;          // Global Horizontal Irradiance (kWh/m²/day)
  dni: number;          // Direct Normal Irradiance (kWh/m²/day)
  tilt_lat: number;     // Irradiance at latitude tilt
  capacity_factor: number;
}

interface NrelWindData {
  lat: number;
  lng: number;
  state: string;
  county: string;
  wind_speed_50m: number;   // m/s at 50m hub height
  wind_speed_80m: number;   // m/s at 80m
  wind_speed_100m: number;  // m/s at 100m
  wind_capacity_factor: number;
  wind_power_class: number;
}

type NrelRecord = NrelSolarData | NrelWindData;

export class NrelConnector extends BaseConnector {
  private apiKey: string;

  constructor() {
    super({
      sourceSlug: 'nrel-resources',
      batchSize: 100,     // Point-based API, so small batches
      rateLimitRpm: 15,   // 1000/hour ≈ 16.6/min, leave margin
      maxRetries: 3,
      retryDelayMs: 5000,
      timeoutMs: 30000,
    });
    this.apiKey = process.env.NREL_API_KEY || '';
  }

  protected async fetch(params: {
    states?: string[];
    bbox?: [number, number, number, number];
    cursor?: string;
    limit: number;
  }): Promise<FetchResult<NrelRecord>> {
    if (!this.apiKey) {
      throw new Error('NREL_API_KEY environment variable is required');
    }

    // NREL's solar resource API is point-based. We query for each site's location.
    // Fetch sites that need solar/wind resource data.
    const offset = params.cursor ? parseInt(params.cursor, 10) : 0;

    let query = supabase
      .from('sites')
      .select('id, lat, lng, state, county, vertical')
      .in('vertical', ['solar', 'wind', 'data_center'])
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .range(offset, offset + params.limit - 1);

    if (params.states?.length) {
      query = query.in('state', params.states);
    }

    const { data: sites, error } = await query;

    if (error) throw new Error(`Failed to fetch sites: ${error.message}`);
    if (!sites?.length) return { records: [], hasMore: false };

    const results: NrelRecord[] = [];

    for (const site of sites) {
      try {
        const solarData = await this.fetchSolarResource(site.lat, site.lng);
        if (solarData) {
          results.push({
            ...solarData,
            state: site.state,
            county: site.county || '',
          });
        }
      } catch {
        this.warnings.push(`Failed to fetch NREL data for site at ${site.lat},${site.lng}`);
      }
    }

    return {
      records: results,
      hasMore: sites.length === params.limit,
      cursor: String(offset + sites.length),
    };
  }

  private async fetchSolarResource(lat: number, lng: number): Promise<Omit<NrelSolarData, 'state' | 'county'> | null> {
    const url = `https://developer.nrel.gov/api/solar/solar_resource/v1.json?api_key=${this.apiKey}&lat=${lat}&lon=${lng}`;

    const response = await this.httpFetch(url);
    if (!response.ok) return null;

    const json = await response.json() as {
      outputs: {
        avg_ghi: { annual: number };
        avg_dni: { annual: number };
        avg_lat_tilt: { annual: number };
      };
    };

    if (!json.outputs) return null;

    const ghi = json.outputs.avg_ghi?.annual || 0;
    const dni = json.outputs.avg_dni?.annual || 0;
    const tiltLat = json.outputs.avg_lat_tilt?.annual || 0;

    // Estimate capacity factor from GHI (rough: GHI 5.5 → ~20% CF)
    const capacityFactor = Math.min(0.30, (ghi / 5.5) * 0.20);

    return {
      lat,
      lng,
      ghi,
      dni,
      tilt_lat: tiltLat,
      capacity_factor: Math.round(capacityFactor * 1000) / 1000,
    };
  }

  protected async transform(raw: NrelRecord[]): Promise<TransformResult[]> {
    // Store solar/wind resource data as market intelligence records
    const records = raw.map((r) => {
      if ('ghi' in r) {
        return {
          metric: 'solar_resource',
          region: `${r.state}-${r.county}`,
          state: r.state,
          value: r.ghi,
          iso_region: null,
          vertical: 'solar',
          details: JSON.stringify({
            ghi: r.ghi,
            dni: r.dni,
            tilt_lat: r.tilt_lat,
            capacity_factor: r.capacity_factor,
            lat: r.lat,
            lng: r.lng,
          }),
          updated_at: new Date().toISOString(),
        };
      }

      // Wind data
      const wind = r as NrelWindData;
      return {
        metric: 'wind_resource',
        region: `${wind.state}-${wind.county}`,
        state: wind.state,
        value: wind.wind_speed_100m,
        iso_region: null,
        vertical: 'wind',
        details: JSON.stringify({
          wind_speed_50m: wind.wind_speed_50m,
          wind_speed_80m: wind.wind_speed_80m,
          wind_speed_100m: wind.wind_speed_100m,
          capacity_factor: wind.wind_capacity_factor,
          power_class: wind.wind_power_class,
          lat: wind.lat,
          lng: wind.lng,
        }),
        updated_at: new Date().toISOString(),
      };
    });

    return [{
      table: 'market_intelligence',
      records,
      conflictColumns: ['metric', 'region'],
    }];
  }
}
