/**
 * FEMA Connector — National Flood Hazard Layer (NFHL)
 *
 * Ingests flood zone boundaries from FEMA's ArcGIS REST service.
 * Free, no API key required. Rate-limited by server.
 *
 * API: https://hazards.fema.gov/gis/nfhl/rest/services
 * Data: S_FLD_HAZ_AR (flood hazard areas)
 */

import { BaseConnector, type FetchResult, type TransformResult } from '../base-connector.js';
import { floodZoneSeverity, geojsonToWkt, simpleCentroid, parseNumeric } from '../transform.js';

interface FemaFloodFeature {
  attributes: {
    FLD_ZONE: string;
    ZONE_SUBTY: string;
    SFHA_TF: string;
    STATIC_BFE: number;
    DEPTH: number;
    LEN_UNIT: string;
    SOURCE_CIT: string;
    DFIRM_ID: string;
    OBJECTID: number;
    SHAPE_Length: number;
    SHAPE_Area: number;
  };
  geometry: {
    rings?: number[][][];
    type?: string;
    coordinates?: unknown;
  };
}

export class FemaConnector extends BaseConnector {
  private baseUrl = 'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28';

  constructor() {
    super({
      sourceSlug: 'fema-flood',
      batchSize: 1000,
      rateLimitRpm: 30,   // FEMA servers are slow; be gentle
      maxRetries: 5,
      retryDelayMs: 5000,
      timeoutMs: 120000,   // FEMA can be very slow
    });
  }

  protected async fetch(params: {
    states?: string[];
    counties?: string[];
    bbox?: [number, number, number, number];
    cursor?: string;
    limit: number;
  }): Promise<FetchResult<FemaFloodFeature>> {
    const offset = params.cursor ? parseInt(params.cursor, 10) : 0;

    // Build spatial query
    let where = '1=1';
    if (params.states?.length) {
      const dfirmIds = params.states.map((s) => `'${s}%'`).join(' OR DFIRM_ID LIKE ');
      where = `DFIRM_ID LIKE ${dfirmIds}`;
    }

    // Use bbox if provided (west, south, east, north)
    let geometry = '';
    if (params.bbox) {
      const [west, south, east, north] = params.bbox;
      geometry = `&geometry=${west},${south},${east},${north}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`;
    }

    const url = `${this.baseUrl}/query?where=${encodeURIComponent(where)}&outFields=*&returnGeometry=true&outSR=4326&f=geojson&resultOffset=${offset}&resultRecordCount=${params.limit}${geometry}`;

    const response = await this.httpFetch(url);

    if (!response.ok) {
      throw new Error(`FEMA API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as {
      type: string;
      features: Array<{
        properties: FemaFloodFeature['attributes'];
        geometry: { type: string; coordinates: unknown };
      }>;
      exceededTransferLimit?: boolean;
    };

    const features: FemaFloodFeature[] = (json.features || []).map((f) => ({
      attributes: f.properties,
      geometry: f.geometry,
    }));

    return {
      records: features,
      hasMore: json.exceededTransferLimit === true || features.length === params.limit,
      cursor: String(offset + features.length),
    };
  }

  protected async transform(raw: FemaFloodFeature[]): Promise<TransformResult[]> {
    const envLayers = raw
      .filter((f) => f.attributes.FLD_ZONE && f.geometry)
      .map((feature) => {
        const zone = feature.attributes.FLD_ZONE;
        const severity = floodZoneSeverity(zone);
        const centroid = simpleCentroid(feature.geometry as { type: string; coordinates: unknown });
        const areaAcres = parseNumeric(feature.attributes.SHAPE_Area);

        // Convert ESRI geometry to GeoJSON-style for WKT conversion
        const boundary = feature.geometry?.type
          ? geojsonToWkt(feature.geometry as { type: string; coordinates: unknown })
          : null;

        return {
          layer_type: 'flood_zone',
          severity,
          designation: zone,
          description: feature.attributes.ZONE_SUBTY
            ? `${zone} — ${feature.attributes.ZONE_SUBTY}`
            : `FEMA Flood Zone ${zone}`,
          source_agency: 'FEMA',
          area_acres: areaAcres ? areaAcres * 2.47105e-4 : null, // sq meters to acres (approximate)
          boundary: boundary,
          centroid: centroid
            ? `SRID=4326;POINT(${centroid.lng} ${centroid.lat})`
            : null,
          restrictions: JSON.stringify({
            sfha: feature.attributes.SFHA_TF === 'T',
            base_flood_elevation: feature.attributes.STATIC_BFE || null,
            flood_insurance_required: feature.attributes.SFHA_TF === 'T',
            development_restrictions: severity === 'high'
              ? 'Significant restrictions on development. Floodproofing and elevation required.'
              : severity === 'moderate'
                ? 'Moderate restrictions. Flood insurance recommended.'
                : 'Minimal restrictions.',
          }),
          mitigation_required: severity === 'high',
          raw_data: JSON.stringify(feature.attributes),
        };
      });

    return [{
      table: 'environmental_layers',
      records: envLayers,
      conflictColumns: ['layer_type', 'designation', 'source_agency'],
    }];
  }
}
