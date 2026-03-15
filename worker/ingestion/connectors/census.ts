/**
 * Census Connector — US Census Bureau / ACS
 *
 * Ingests demographic and economic data at the county level:
 * - Population density
 * - Median household income
 * - Housing units
 * - Employment data
 *
 * API: https://api.census.gov/data
 * Auth: API key (free, register at census.gov)
 * Rate limit: ~500 req/day per key
 */

import { BaseConnector, type FetchResult, type TransformResult } from '../base-connector.js';
import { fipsToState, stateName, stateToFips } from '../transform.js';

interface CensusRecord {
  state_fips: string;
  county_fips: string;
  county_name: string;
  state_abbrev: string;
  population: number;
  median_income: number;
  housing_units: number;
  land_area_sqmi: number;
  population_density: number;
}

export class CensusConnector extends BaseConnector {
  private apiKey: string;

  constructor() {
    super({
      sourceSlug: 'census-acs',
      batchSize: 500,
      rateLimitRpm: 8,    // Census is very rate-limited
      maxRetries: 3,
      retryDelayMs: 10000,
      timeoutMs: 60000,
    });
    this.apiKey = process.env.CENSUS_API_KEY || '';
  }

  protected async fetch(params: {
    states?: string[];
    cursor?: string;
    limit: number;
  }): Promise<FetchResult<CensusRecord>> {
    if (!this.apiKey) {
      throw new Error('CENSUS_API_KEY environment variable is required');
    }

    // Census API returns all counties for a state in one call
    const stateIndex = params.cursor ? parseInt(params.cursor, 10) : 0;
    const statesToFetch = params.states || [
      'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
      'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
      'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
      'WV', 'WI', 'WY',
    ];

    if (stateIndex >= statesToFetch.length) {
      return { records: [], hasMore: false };
    }

    const state = statesToFetch[stateIndex];
    const fips = stateToFips(state);
    if (!fips) {
      return {
        records: [],
        hasMore: stateIndex + 1 < statesToFetch.length,
        cursor: String(stateIndex + 1),
      };
    }

    // ACS 5-Year variables:
    // B01003_001E = Total population
    // B19013_001E = Median household income
    // B25001_001E = Housing units
    const variables = 'B01003_001E,B19013_001E,B25001_001E,NAME';
    const url = `https://api.census.gov/data/2023/acs/acs5?get=${variables}&for=county:*&in=state:${fips}&key=${this.apiKey}`;

    const response = await this.httpFetch(url);

    if (!response.ok) {
      throw new Error(`Census API error: ${response.status} for state ${state}`);
    }

    const json = await response.json() as string[][];

    // First row is headers, rest is data
    const [_headers, ...rows] = json;

    const records: CensusRecord[] = rows.map((row) => {
      const population = parseInt(row[0], 10) || 0;
      const income = parseInt(row[1], 10) || 0;
      const housing = parseInt(row[2], 10) || 0;
      const name = row[3] || '';
      const stateFips = row[4];
      const countyFips = row[5];
      const countyName = name.split(',')[0]?.replace(' County', '').trim() || '';

      return {
        state_fips: stateFips,
        county_fips: `${stateFips}${countyFips}`,
        county_name: countyName,
        state_abbrev: state,
        population,
        median_income: income,
        housing_units: housing,
        land_area_sqmi: 0, // Would need a separate geography call
        population_density: 0,
      };
    });

    return {
      records,
      hasMore: stateIndex + 1 < statesToFetch.length,
      cursor: String(stateIndex + 1),
      metadata: { state, counties: records.length },
    };
  }

  protected async transform(raw: CensusRecord[]): Promise<TransformResult[]> {
    const marketRecords = raw.flatMap((r) => [
      {
        metric: 'population',
        region: `${r.state_abbrev}-${r.county_name}`,
        state: r.state_abbrev,
        value: r.population,
        vertical: null,
        iso_region: null,
        details: JSON.stringify({
          county_fips: r.county_fips,
          county_name: r.county_name,
          housing_units: r.housing_units,
        }),
        updated_at: new Date().toISOString(),
      },
      {
        metric: 'median_income',
        region: `${r.state_abbrev}-${r.county_name}`,
        state: r.state_abbrev,
        value: r.median_income,
        vertical: null,
        iso_region: null,
        details: JSON.stringify({
          county_fips: r.county_fips,
          county_name: r.county_name,
        }),
        updated_at: new Date().toISOString(),
      },
    ]);

    return [{
      table: 'market_intelligence',
      records: marketRecords,
      conflictColumns: ['metric', 'region'],
    }];
  }
}
