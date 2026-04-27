import { Pool, QueryResult, PoolClient } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.OUTREACH_DB_HOST,
      port: parseInt(process.env.OUTREACH_DB_PORT || '5432'),
      database: process.env.OUTREACH_DB_NAME || 'outreach',
      user: process.env.OUTREACH_DB_USER || 'outreach',
      password: process.env.OUTREACH_DB_PASSWORD,
      ssl: process.env.OUTREACH_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[Outreach DB] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 2000) {
    console.warn(`[Outreach DB] Slow query (${duration}ms):`, text.slice(0, 100));
  }
  return result;
}

export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Org context for the outreach worker. In multi-tenant operation each call
// path should pass an orgId explicitly (derived from auth/session or a
// Twilio phone-number lookup). Until every caller is refactored, this is
// configured via env so no UUID is hardcoded in source.
export function getOutreachOrgId(): string {
  return process.env.OUTREACH_ORG_ID ?? '';
}

// Backwards-compat re-export. Prefer getOutreachOrgId() at new call sites.
export const ORG_ID: string = getOutreachOrgId();
