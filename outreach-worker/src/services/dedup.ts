import { query, queryOne, execute } from './supabase.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('dedup');

/**
 * Simple Levenshtein distance implementation.
 */
export function levenshtein(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const matrix: number[][] = [];

  for (let i = 0; i <= aLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[aLen][bLen];
}

/**
 * Normalize a string for comparison: lowercase, trim, collapse whitespace.
 */
function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Find an exact duplicate by email address.
 */
export async function findExactDuplicate(
  email: string
): Promise<{ id: string; email: string } | null> {
  const data = await queryOne(
    'SELECT id, email FROM outreach_leads WHERE email = $1 LIMIT 1',
    [email.toLowerCase().trim()]
  );

  return data as { id: string; email: string } | null;
}

/**
 * Find fuzzy duplicates by company name + city + state.
 * Returns leads where company name Levenshtein distance < 3 and same city/state.
 */
export async function findFuzzyDuplicates(
  companyName: string,
  city: string,
  state: string
): Promise<Array<{ id: string; company_name: string; email: string; distance: number }>> {
  // Fetch candidates from same city/state
  const { rows: data } = await query(
    `SELECT id, company_name, email, city, state FROM outreach_leads
     WHERE city ILIKE $1 AND state ILIKE $2
     LIMIT 500`,
    [city.trim(), state.trim()]
  );

  if (data.length === 0) {
    return [];
  }

  const normalizedTarget = normalize(companyName);
  const matches: Array<{ id: string; company_name: string; email: string; distance: number }> = [];

  for (const row of data) {
    const distance = levenshtein(normalizedTarget, normalize(row.company_name));
    if (distance < 3 && distance > 0) {
      matches.push({
        id: row.id,
        company_name: row.company_name,
        email: row.email,
        distance,
      });
    }
  }

  return matches.sort((a, b) => a.distance - b.distance);
}

/**
 * Merge two lead records: keep primary, transfer emails/replies from secondary, archive secondary.
 */
export async function mergeLeads(
  primaryId: string,
  secondaryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Transfer emails to primary
    await execute(
      'UPDATE outreach_emails SET lead_id = $1 WHERE lead_id = $2',
      [primaryId, secondaryId]
    );

    // Transfer replies to primary
    await execute(
      'UPDATE outreach_replies SET lead_id = $1 WHERE lead_id = $2',
      [primaryId, secondaryId]
    );

    // Transfer tasks to primary
    await execute(
      'UPDATE outreach_tasks SET lead_id = $1 WHERE lead_id = $2',
      [primaryId, secondaryId]
    );

    // Archive secondary
    await execute(
      `UPDATE outreach_leads
       SET status = 'archived', tags = $1, updated_at = $2
       WHERE id = $3`,
      [['merged_duplicate'], new Date().toISOString(), secondaryId]
    );

    log.info(`Merged lead ${secondaryId} into ${primaryId}`);

    // Log to hygiene_log
    await execute(
      `INSERT INTO outreach_hygiene_log (action, lead_id, details)
       VALUES ($1, $2, $3)`,
      [
        'merge_duplicate',
        secondaryId,
        JSON.stringify({ primary_id: primaryId, secondary_id: secondaryId }),
      ]
    );

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error(`Failed to merge leads: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}
