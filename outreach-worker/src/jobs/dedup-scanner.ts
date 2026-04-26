import { query, execute } from '../services/supabase.js';
import { findExactDuplicate, findFuzzyDuplicates, mergeLeads } from '../services/dedup.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('dedup-scanner');

/**
 * Deduplication scanner. Runs weekly Sunday 2 AM EST.
 * Groups by email (exact) and company+city+state (fuzzy).
 */
export async function runDedupScan(): Promise<void> {
  log.info('Dedup-scanner job started');

  try {
    let mergedCount = 0;
    let flaggedCount = 0;

    // 1. Exact email deduplication
    mergedCount += await deduplicateByEmail();

    // 2. Fuzzy company name deduplication
    flaggedCount += await flagFuzzyDuplicates();

    log.info(`Dedup-scanner complete. Merged: ${mergedCount}, Flagged: ${flaggedCount}`);
  } catch (error) {
    log.error(`Dedup-scanner job failed: ${error}`);
  }
}

/**
 * Find and merge leads with duplicate email addresses.
 */
async function deduplicateByEmail(): Promise<number> {
  // Fetch all leads grouped by email to find duplicates
  const { rows: leads } = await query(
    `SELECT id, email, status, score, created_at FROM outreach_leads
     WHERE status NOT IN ('archived', 'do_not_contact')
     ORDER BY created_at ASC
     LIMIT 5000`
  );

  if (leads.length === 0) {
    return 0;
  }

  // Group by normalized email
  const emailGroups = new Map<string, typeof leads>();
  for (const lead of leads) {
    const normalizedEmail = lead.email.toLowerCase().trim();
    const group = emailGroups.get(normalizedEmail) || [];
    group.push(lead);
    emailGroups.set(normalizedEmail, group);
  }

  let mergedCount = 0;

  for (const [email, group] of emailGroups) {
    if (group.length < 2) continue;

    // Pick the primary lead (highest score, or earliest created)
    const sorted = group.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const primary = sorted[0];
    const duplicates = sorted.slice(1);

    for (const dup of duplicates) {
      const result = await mergeLeads(primary.id, dup.id);
      if (result.success) {
        mergedCount++;
        log.info(`Merged duplicate: ${email} (${dup.id} -> ${primary.id})`);
      } else {
        log.warn(`Failed to merge ${dup.id} into ${primary.id}: ${result.error}`);
      }
    }
  }

  if (mergedCount > 0) {
    log.info(`Merged ${mergedCount} exact email duplicates`);
  }

  return mergedCount;
}

/**
 * Find and flag fuzzy duplicates (similar company name + same city/state).
 */
async function flagFuzzyDuplicates(): Promise<number> {
  // Get distinct city/state combinations with multiple leads
  const { rows: leads } = await query(
    `SELECT id, company_name, email, city, state, tags FROM outreach_leads
     WHERE status NOT IN ('archived', 'do_not_contact')
       AND city IS NOT NULL
       AND state IS NOT NULL
     LIMIT 3000`
  );

  if (leads.length === 0) {
    return 0;
  }

  // Group by city+state
  const locationGroups = new Map<string, typeof leads>();
  for (const lead of leads) {
    if (!lead.city || !lead.state) continue;
    const key = `${lead.city.toLowerCase().trim()}|${lead.state.toLowerCase().trim()}`;
    const group = locationGroups.get(key) || [];
    group.push(lead);
    locationGroups.set(key, group);
  }

  let flaggedCount = 0;
  const alreadyFlagged = new Set<string>();

  for (const [, group] of locationGroups) {
    if (group.length < 2) continue;

    // Check each pair for fuzzy company name match
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];

        // Skip if already flagged
        if (alreadyFlagged.has(a.id) || alreadyFlagged.has(b.id)) continue;

        // Skip if same email (already handled by exact dedup)
        if (a.email.toLowerCase() === b.email.toLowerCase()) continue;

        // Check fuzzy match using the dedup service
        const matches = await findFuzzyDuplicates(a.company_name, a.city, a.state);
        const isMatch = matches.some((m) => m.id === b.id);

        if (isMatch) {
          // Flag both for review
          for (const lead of [a, b]) {
            const tags = lead.tags || [];
            if (tags.includes('potential_duplicate')) continue;

            await execute(
              `UPDATE outreach_leads SET tags = $1 WHERE id = $2`,
              [[...tags, 'potential_duplicate'], lead.id]
            );

            alreadyFlagged.add(lead.id);
          }

          await execute(
            `INSERT INTO outreach_hygiene_log (action, lead_id, details)
             VALUES ($1, $2, $3)`,
            [
              'fuzzy_duplicate_flagged',
              a.id,
              JSON.stringify({
                lead_a: { id: a.id, company: a.company_name, email: a.email },
                lead_b: { id: b.id, company: b.company_name, email: b.email },
              }),
            ]
          );

          flaggedCount++;
          log.info(`Flagged potential duplicate: "${a.company_name}" / "${b.company_name}" in ${a.city}, ${a.state}`);
        }
      }
    }
  }

  if (flaggedCount > 0) {
    log.info(`Flagged ${flaggedCount} potential fuzzy duplicates`);
  }

  return flaggedCount;
}
