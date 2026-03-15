/**
 * EIA Connector — US Energy Information Administration
 *
 * Ingests:
 * - Power plants (operating generators with capacity data)
 * - Substations (via plant location + grid mapping)
 *
 * API: https://api.eia.gov/v2
 * Auth: API key (free, register at eia.gov)
 * Rate limit: ~100 req/min
 */

import { BaseConnector, type FetchResult, type TransformResult } from '../base-connector.js';
import { parseNumeric, fipsToState } from '../transform.js';

interface EiaPlant {
  plantCode: number;
  plantName: string;
  state: string;
  county: string;
  latitude: number;
  longitude: number;
  sector: string;
  entityName: string;
  nameplatecapacity: number;
  'net-summer-capacity': number;
  'net-winter-capacity': number;
  'operating-year-month': string;
  technology: string;
  energy_source_code: string;
  prime_mover_code: string;
  balancing_authority_code: string;
  status: string;
}

export class EiaConnector extends BaseConnector {
  private apiKey: string;

  constructor() {
    super({
      sourceSlug: 'eia-energy',
      batchSize: 5000,
      rateLimitRpm: 80,
      maxRetries: 3,
      retryDelayMs: 3000,
      timeoutMs: 60000,
    });
    this.apiKey = process.env.EIA_API_KEY || '';
  }

  protected async fetch(params: {
    states?: string[];
    cursor?: string;
    limit: number;
  }): Promise<FetchResult<EiaPlant>> {
    if (!this.apiKey) {
      throw new Error('EIA_API_KEY environment variable is required');
    }

    const offset = params.cursor ? parseInt(params.cursor, 10) : 0;

    // Build facets filter for states
    const facets: string[] = [];
    if (params.states?.length) {
      for (const state of params.states) {
        facets.push(`facets[stateid][]=${state}`);
      }
    }

    const url = new URL('https://api.eia.gov/v2/electricity/operating-generator-capacity/data/');
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('frequency', 'monthly');
    url.searchParams.set('data[0]', 'nameplate-capacity-mw');
    url.searchParams.set('data[1]', 'net-summer-capacity-mw');
    url.searchParams.set('data[2]', 'net-winter-capacity-mw');
    url.searchParams.set('sort[0][column]', 'plantCode');
    url.searchParams.set('sort[0][direction]', 'asc');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('length', String(params.limit));

    // Add state filters
    if (params.states?.length) {
      for (const state of params.states) {
        url.searchParams.append('facets[stateid][]', state);
      }
    }

    // Only get operating plants
    url.searchParams.append('facets[status][]', 'OP');

    const response = await this.httpFetch(url.toString());

    if (!response.ok) {
      throw new Error(`EIA API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as {
      response: {
        data: EiaPlant[];
        total: number;
      };
    };

    const data = json.response?.data || [];
    const total = json.response?.total || 0;
    const nextOffset = offset + data.length;

    return {
      records: data,
      hasMore: nextOffset < total,
      cursor: String(nextOffset),
      metadata: { total },
    };
  }

  protected async transform(raw: EiaPlant[]): Promise<TransformResult[]> {
    // Deduplicate plants by plantCode (EIA returns one row per generator)
    const plantMap = new Map<number, EiaPlant & { totalCapacity: number; generatorCount: number }>();

    for (const record of raw) {
      const existing = plantMap.get(record.plantCode);
      if (existing) {
        existing.totalCapacity += parseNumeric(record.nameplatecapacity) || 0;
        existing.generatorCount += 1;
      } else {
        plantMap.set(record.plantCode, {
          ...record,
          totalCapacity: parseNumeric(record.nameplatecapacity) || 0,
          generatorCount: 1,
        });
      }
    }

    // Map to substations table (power plants with grid capacity)
    const substations = Array.from(plantMap.values())
      .filter((p) => p.latitude && p.longitude && p.totalCapacity > 0)
      .map((plant) => {
        const capacityMw = Math.round(plant.totalCapacity);
        // Estimate available capacity (30-70% of nameplate based on technology)
        const utilizationFactor = this.getUtilizationFactor(plant.technology);
        const availableMw = Math.round(capacityMw * (1 - utilizationFactor));

        return {
          name: plant.plantName,
          state: plant.state,
          county: plant.county || null,
          lat: plant.latitude,
          lng: plant.longitude,
          capacity_mw: capacityMw,
          available_mw: availableMw,
          voltage_kv: this.estimateVoltage(capacityMw),
          iso_zone: plant.balancing_authority_code || null,
          iso_region: this.mapBalancingAuthToIso(plant.balancing_authority_code),
          owner: plant.entityName || null,
          status: 'active',
        };
      });

    return [{
      table: 'substations',
      records: substations,
      conflictColumns: ['name', 'state'],
    }];
  }

  private getUtilizationFactor(technology: string): number {
    const t = (technology || '').toLowerCase();
    if (t.includes('solar')) return 0.25;
    if (t.includes('wind')) return 0.35;
    if (t.includes('natural gas') || t.includes('combustion')) return 0.55;
    if (t.includes('nuclear')) return 0.92;
    if (t.includes('coal')) return 0.50;
    if (t.includes('hydro')) return 0.40;
    return 0.50;
  }

  private estimateVoltage(capacityMw: number): number {
    if (capacityMw >= 1000) return 500;
    if (capacityMw >= 500) return 345;
    if (capacityMw >= 100) return 230;
    if (capacityMw >= 20) return 138;
    return 69;
  }

  private mapBalancingAuthToIso(ba: string): string {
    if (!ba) return 'unknown';
    const mapping: Record<string, string> = {
      PJM: 'PJM', MISO: 'MISO', ERCO: 'ERCOT', CISO: 'CAISO',
      ISNE: 'ISO-NE', NYIS: 'NYISO', SWPP: 'SPP', NWMT: 'NWPP',
      BPAT: 'NWPP', WACM: 'NWPP', AECI: 'SERC', SOCO: 'SERC',
      SRP: 'WECC', APS: 'WECC', TEP: 'WECC',
    };
    return mapping[ba] || 'other';
  }
}
