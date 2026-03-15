/**
 * OSM Connector — OpenStreetMap via Overpass API
 *
 * Ingests infrastructure data:
 * - Major roads and highways (for EV charging site analysis)
 * - Fiber optic routes (for data center connectivity)
 * - Rail lines (for industrial sites)
 * - Existing substations and power lines
 *
 * API: https://overpass-api.de/api/interpreter
 * Auth: None (free, open data)
 * Rate limit: Be reasonable — 1 req per 10 seconds recommended
 */

import { BaseConnector, type FetchResult, type TransformResult } from '../base-connector.js';

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
}

// Phoenix/Maricopa County bbox for initial ingestion
const MARICOPA_BBOX = [33.2, -113.3, 34.0, -111.0] as const;

export class OsmConnector extends BaseConnector {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';

  constructor() {
    super({
      sourceSlug: 'osm-infra',
      batchSize: 5000,
      rateLimitRpm: 6,     // Overpass: be very gentle
      maxRetries: 3,
      retryDelayMs: 15000,
      timeoutMs: 120000,
    });
  }

  protected async fetch(params: {
    bbox?: [number, number, number, number];
    cursor?: string;
    limit: number;
  }): Promise<FetchResult<OsmElement>> {
    // OSM queries are area-based, not paginated.
    // We use cursor to track which query type we're on.
    const queryIndex = params.cursor ? parseInt(params.cursor, 10) : 0;
    const queries = this.buildQueries(params.bbox);

    if (queryIndex >= queries.length) {
      return { records: [], hasMore: false };
    }

    const query = queries[queryIndex];
    await this.log(`Running Overpass query ${queryIndex + 1}/${queries.length}: ${query.label}`);

    const response = await this.httpFetch(this.overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query.overpassQL)}`,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Overpass API rate limited. Will retry.');
      }
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const json = await response.json() as { elements: OsmElement[] };
    const elements = json.elements || [];

    // Tag each element with our query category
    for (const el of elements) {
      if (!el.tags) el.tags = {};
      el.tags._mn_category = query.category;
    }

    return {
      records: elements,
      hasMore: queryIndex + 1 < queries.length,
      cursor: String(queryIndex + 1),
      metadata: { query: query.label, elements: elements.length },
    };
  }

  private buildQueries(bbox?: [number, number, number, number]): Array<{
    label: string;
    category: string;
    overpassQL: string;
  }> {
    // Default to Maricopa County if no bbox specified
    const [south, west, north, east] = bbox
      ? [bbox[0], bbox[1], bbox[2], bbox[3]]
      : MARICOPA_BBOX;

    const bboxStr = `${south},${west},${north},${east}`;

    return [
      {
        label: 'Substations & Power Infrastructure',
        category: 'power',
        overpassQL: `
          [out:json][timeout:90];
          (
            node["power"="substation"](${bboxStr});
            way["power"="substation"](${bboxStr});
            node["power"="plant"](${bboxStr});
            way["power"="plant"](${bboxStr});
          );
          out center tags;
        `,
      },
      {
        label: 'Transmission Lines',
        category: 'transmission',
        overpassQL: `
          [out:json][timeout:90];
          way["power"="line"]["voltage"](${bboxStr});
          out center tags;
        `,
      },
      {
        label: 'Major Roads & Highways',
        category: 'roads',
        overpassQL: `
          [out:json][timeout:90];
          (
            way["highway"="motorway"](${bboxStr});
            way["highway"="trunk"](${bboxStr});
            way["highway"="primary"](${bboxStr});
          );
          out center tags;
        `,
      },
      {
        label: 'Fiber & Telecom',
        category: 'fiber',
        overpassQL: `
          [out:json][timeout:60];
          (
            way["telecom"="data_center"](${bboxStr});
            node["telecom"="data_center"](${bboxStr});
            way["man_made"="communications_tower"](${bboxStr});
            node["man_made"="communications_tower"](${bboxStr});
          );
          out center tags;
        `,
      },
    ];
  }

  protected async transform(raw: OsmElement[]): Promise<TransformResult[]> {
    // Group by category
    const byCategory = new Map<string, OsmElement[]>();
    for (const el of raw) {
      const cat = el.tags?._mn_category || 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(el);
    }

    const results: TransformResult[] = [];

    // Power infrastructure → substations table
    const powerElements = byCategory.get('power') || [];
    if (powerElements.length > 0) {
      const substations = powerElements
        .filter((el) => {
          const lat = el.lat || el.center?.lat;
          const lng = el.lon || el.center?.lon;
          return lat && lng;
        })
        .map((el) => {
          const tags = el.tags || {};
          const lat = el.lat || el.center?.lat || 0;
          const lng = el.lon || el.center?.lon || 0;
          const name = tags.name || tags.operator || `OSM-${el.type}-${el.id}`;
          const voltage = this.parseVoltage(tags.voltage);

          return {
            name,
            lat,
            lng,
            state: 'AZ', // Will be geocoded properly in production
            voltage_kv: voltage,
            owner: tags.operator || null,
            status: 'active',
            capacity_mw: this.estimateCapacityFromVoltage(voltage),
            available_mw: Math.round(this.estimateCapacityFromVoltage(voltage) * 0.3),
          };
        });

      results.push({
        table: 'substations',
        records: substations,
        conflictColumns: ['name', 'state'],
      });
    }

    // Market intelligence for road density and infrastructure
    const roadElements = byCategory.get('roads') || [];
    const fiberElements = byCategory.get('fiber') || [];
    const transmissionElements = byCategory.get('transmission') || [];

    if (roadElements.length > 0 || fiberElements.length > 0) {
      const infraMetrics = [
        {
          metric: 'road_density',
          region: 'AZ-Maricopa',
          state: 'AZ',
          value: roadElements.length,
          vertical: null,
          iso_region: null,
          details: JSON.stringify({
            motorways: roadElements.filter((e) => e.tags?.highway === 'motorway').length,
            trunk: roadElements.filter((e) => e.tags?.highway === 'trunk').length,
            primary: roadElements.filter((e) => e.tags?.highway === 'primary').length,
          }),
          updated_at: new Date().toISOString(),
        },
        {
          metric: 'fiber_density',
          region: 'AZ-Maricopa',
          state: 'AZ',
          value: fiberElements.length,
          vertical: 'data_center',
          iso_region: null,
          details: JSON.stringify({
            data_centers: fiberElements.filter((e) => e.tags?.telecom === 'data_center').length,
            comm_towers: fiberElements.filter((e) => e.tags?.man_made === 'communications_tower').length,
          }),
          updated_at: new Date().toISOString(),
        },
        {
          metric: 'transmission_lines',
          region: 'AZ-Maricopa',
          state: 'AZ',
          value: transmissionElements.length,
          vertical: null,
          iso_region: 'WECC',
          details: JSON.stringify({
            high_voltage: transmissionElements.filter((e) => this.parseVoltage(e.tags?.voltage) >= 230).length,
            medium_voltage: transmissionElements.filter((e) => {
              const v = this.parseVoltage(e.tags?.voltage);
              return v >= 69 && v < 230;
            }).length,
          }),
          updated_at: new Date().toISOString(),
        },
      ];

      results.push({
        table: 'market_intelligence',
        records: infraMetrics,
        conflictColumns: ['metric', 'region'],
      });
    }

    return results;
  }

  private parseVoltage(voltage?: string): number {
    if (!voltage) return 0;
    // OSM voltage is in volts (e.g., "345000" or "345;138")
    const parts = voltage.split(';').map((v) => parseInt(v.trim(), 10));
    const maxVoltage = Math.max(...parts.filter((v) => !isNaN(v)));
    return maxVoltage > 1000 ? maxVoltage / 1000 : maxVoltage; // Convert V to kV
  }

  private estimateCapacityFromVoltage(voltageKv: number): number {
    if (voltageKv >= 500) return 2000;
    if (voltageKv >= 345) return 1000;
    if (voltageKv >= 230) return 500;
    if (voltageKv >= 138) return 200;
    if (voltageKv >= 69) return 50;
    return 10;
  }
}
