/**
 * Ingestion Runner — Orchestrates connector execution.
 *
 * Reads data_sources from the database, matches them to connectors,
 * and runs scheduled or manual ingestion jobs.
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';
import { EiaConnector } from './connectors/eia.js';
import { FemaConnector } from './connectors/fema.js';
import { NrelConnector } from './connectors/nrel.js';
import { RegridConnector } from './connectors/regrid.js';
import { CensusConnector } from './connectors/census.js';
import { OsmConnector } from './connectors/osm.js';
import type { BaseConnector } from './base-connector.js';

type ConnectorFactory = () => BaseConnector;

const CONNECTOR_MAP: Record<string, ConnectorFactory> = {
  'eia-energy': () => new EiaConnector(),
  'fema-flood': () => new FemaConnector(),
  'nrel-resources': () => new NrelConnector(),
  'regrid-parcels': () => new RegridConnector(),
  'census-acs': () => new CensusConnector(),
  'osm-infra': () => new OsmConnector(),
};

/**
 * Run ingestion for a specific data source by slug.
 */
export async function runIngestion(
  sourceSlug: string,
  options?: {
    states?: string[];
    counties?: string[];
    bbox?: [number, number, number, number];
    triggeredBy?: string;
  },
): Promise<void> {
  const factory = CONNECTOR_MAP[sourceSlug];
  if (!factory) {
    await logActivity('zeta' as any, `Unknown data source: ${sourceSlug}`);
    return;
  }

  const connector = factory();

  try {
    const result = await connector.run(options);
    await logActivity('zeta' as any, `Ingestion complete for ${sourceSlug}`, {
      source: sourceSlug,
      ...result,
    });
  } catch (err) {
    await logActivity('zeta' as any, `Ingestion failed for ${sourceSlug}: ${err instanceof Error ? err.message : 'Unknown'}`, {
      source: sourceSlug,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

/**
 * Run all active data sources that are due for refresh.
 * Called by the cron scheduler.
 */
export async function runScheduledIngestion(): Promise<void> {
  await logActivity('zeta' as any, 'Checking for scheduled ingestion jobs');

  const { data: sources, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('status', 'active')
    .not('refresh_schedule', 'is', null);

  if (error || !sources?.length) {
    await logActivity('zeta' as any, 'No active data sources to process');
    return;
  }

  for (const source of sources) {
    if (!CONNECTOR_MAP[source.slug]) {
      continue;
    }

    // Check if there's already a running job for this source
    const { data: runningJobs } = await supabase
      .from('ingestion_jobs')
      .select('id')
      .eq('source_id', source.id)
      .eq('status', 'running')
      .limit(1);

    if (runningJobs?.length) {
      await logActivity('zeta' as any, `Skipping ${source.slug} — already running`);
      continue;
    }

    await runIngestion(source.slug, {
      states: source.coverage_states || undefined,
      triggeredBy: 'schedule',
    });
  }
}

/**
 * Run initial Phoenix/Maricopa County data seeding.
 * This is the bootstrap for the first geography.
 */
export async function seedPhoenixData(): Promise<void> {
  await logActivity('zeta' as any, 'Starting Phoenix/Maricopa County data seed');

  const phoenixOpts = {
    states: ['AZ'],
    counties: ['Maricopa'],
    bbox: [-113.3, 33.2, -111.0, 34.0] as [number, number, number, number],
    triggeredBy: 'seed',
  };

  // Run connectors that don't need API keys first
  const freeConnectors = ['osm-infra', 'fema-flood'];
  const paidConnectors = ['eia-energy', 'regrid-parcels', 'nrel-resources', 'census-acs'];

  for (const slug of freeConnectors) {
    try {
      await runIngestion(slug, phoenixOpts);
    } catch (err) {
      console.error(`[SEED] Failed ${slug}:`, err);
    }
  }

  for (const slug of paidConnectors) {
    try {
      await runIngestion(slug, phoenixOpts);
    } catch (err) {
      // Expected if API keys aren't configured yet
      console.warn(`[SEED] Skipped ${slug} (likely missing API key):`, err instanceof Error ? err.message : err);
    }
  }

  await logActivity('zeta' as any, 'Phoenix/Maricopa data seed complete');
}
