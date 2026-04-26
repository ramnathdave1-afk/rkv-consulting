import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { runActor, ACTORS } from '../apify-client';
import type { AgentName, AgentRunResult, AgentInput } from '../types';

interface GoogleMapsResult {
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  totalScore?: number;
  reviewsCount?: number;
  categoryName?: string;
  url?: string;
}

class LeadScraper extends BaseAgent {
  name: AgentName = 'lead_scraper';
  description = 'Mass-scrapes Google Maps + LinkedIn for PM companies by geo';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const geo = (input.geo as string) || 'Florida';
    const count = (input.count as number) || 5000;
    const campaignId = input.campaign_id as string | undefined;

    await this.log('info', `Starting scrape for "${geo}" — target: ${count} leads`);

    // Scrape Google Maps for property management companies
    const searchQueries = [
      `property management companies in ${geo}`,
      `property management ${geo}`,
      `apartment management companies ${geo}`,
      `residential property management ${geo}`,
    ];

    let allResults: GoogleMapsResult[] = [];

    for (const searchQuery of searchQueries) {
      try {
        await this.updateStatus('running', `Scraping Google Maps: "${searchQuery}"`);

        const results = await runActor<GoogleMapsResult>(ACTORS.GOOGLE_MAPS_SCRAPER, {
          searchStringsArray: [searchQuery],
          maxCrawledPlacesPerSearch: Math.ceil(count / searchQueries.length),
          language: 'en',
          includeWebResults: false,
        }, { timeoutSecs: 600 });

        allResults.push(...results);
        await this.log('info', `Found ${results.length} results for "${searchQuery}"`);
      } catch (err) {
        await this.log('warning', `Scrape failed for "${searchQuery}": ${(err as Error).message}`);
      }
    }

    // Deduplicate by website or company name
    const seen = new Set<string>();
    const unique: GoogleMapsResult[] = [];
    for (const r of allResults) {
      const key = (r.website || r.title || '').toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    }

    await this.log('info', `${allResults.length} raw results → ${unique.length} unique after dedup`);

    // Use Haiku to filter — only keep property management companies
    const batches = chunkArray(unique, 20);
    let inserted = 0;

    for (const batch of batches) {
      const batchDescriptions = batch.map((r, i) =>
        `${i + 1}. "${r.title}" — ${r.categoryName || 'unknown'} — ${r.address || 'no address'}`
      ).join('\n');

      const { data: filtered } = await this.callHaikuJSON<{ pm_indices: number[] }>(
        `Which of these businesses are property management companies (manage rental properties for owners)? Return ONLY the indices (1-based) that are property management companies. Exclude real estate agents, HOAs, self-storage, commercial-only, and developers.\n\n${batchDescriptions}`,
        'You filter Google Maps results to find property management companies. Return JSON: {"pm_indices": [1, 3, 7]}',
        { maxTokens: 256 }
      );

      const pmIndices = new Set(filtered.pm_indices || []);

      for (let i = 0; i < batch.length; i++) {
        if (!pmIndices.has(i + 1)) continue;
        const r = batch[i];

        try {
          await query(
            `INSERT INTO outreach_leads
             (org_id, campaign_id, company_name, industry, website, address, city, state, zip, phone,
              google_rating, review_count, source, source_url, status)
             VALUES ($1, $2, $3, 'property_management', $4, $5, $6, $7, $8, $9, $10, $11, 'google_maps', $12, 'raw')
             ON CONFLICT DO NOTHING`,
            [
              ORG_ID, campaignId || null,
              r.title || 'Unknown',
              r.website || null,
              r.address || null,
              r.city || extractCity(r.address),
              r.state || extractState(r.address, geo),
              r.zip || null,
              r.phone || null,
              r.totalScore || null,
              r.reviewsCount || 0,
              r.url || null,
            ]
          );
          inserted++;
        } catch {
          // Skip duplicates
        }
      }
    }

    // Update campaign counts
    if (campaignId) {
      await query(
        `UPDATE outreach_campaigns SET total_leads = $1, status = 'enriching' WHERE id = $2`,
        [inserted, campaignId]
      );
    }

    await this.log('success', `Scrape complete: ${inserted} leads inserted from ${geo}`);

    return {
      success: true,
      data: { leadsFound: unique.length, leadsInserted: inserted, geo },
    };
  }
}

function extractCity(address?: string): string | null {
  if (!address) return null;
  const parts = address.split(',');
  return parts.length >= 2 ? parts[parts.length - 2]?.trim() || null : null;
}

function extractState(address?: string, fallbackGeo?: string): string | null {
  if (address) {
    const match = address.match(/\b([A-Z]{2})\s+\d{5}/);
    if (match) return match[1];
  }
  // Map common geo names to state codes
  const stateMap: Record<string, string> = {
    florida: 'FL', texas: 'TX', arizona: 'AZ', california: 'CA',
    georgia: 'GA', 'north carolina': 'NC', tennessee: 'TN',
    colorado: 'CO', ohio: 'OH', pennsylvania: 'PA',
  };
  return stateMap[(fallbackGeo || '').toLowerCase()] || fallbackGeo || null;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default new LeadScraper();
