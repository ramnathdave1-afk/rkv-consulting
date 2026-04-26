const APIFY_BASE_URL = 'https://api.apify.com/v2';

interface ApifyRunResult {
  id: string;
  status: string;
  defaultDatasetId: string;
}

export async function runActor<T = Record<string, unknown>>(
  actorId: string,
  input: Record<string, unknown>,
  opts?: { timeoutSecs?: number; memoryMbytes?: number; pollIntervalMs?: number }
): Promise<T[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN not configured');

  const timeoutSecs = opts?.timeoutSecs ?? 300;
  const pollInterval = opts?.pollIntervalMs ?? 5000;

  // Start the actor run
  const startResponse = await fetch(
    `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${token}&timeout=${timeoutSecs}${opts?.memoryMbytes ? `&memory=${opts.memoryMbytes}` : ''}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );

  if (!startResponse.ok) {
    const err = await startResponse.text();
    throw new Error(`Apify actor start failed (${startResponse.status}): ${err}`);
  }

  const runData = (await startResponse.json()).data as ApifyRunResult;
  const runId = runData.id;

  // Poll until complete
  const maxPolls = Math.ceil((timeoutSecs * 1000) / pollInterval) + 5;
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const statusResponse = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
    );
    if (!statusResponse.ok) continue;

    const statusData = (await statusResponse.json()).data;
    if (statusData.status === 'SUCCEEDED') {
      return fetchDataset<T>(statusData.defaultDatasetId, token);
    }
    if (statusData.status === 'FAILED' || statusData.status === 'ABORTED' || statusData.status === 'TIMED-OUT') {
      throw new Error(`Apify actor run ${statusData.status}: ${actorId}`);
    }
  }

  throw new Error(`Apify actor run timed out after ${timeoutSecs}s: ${actorId}`);
}

async function fetchDataset<T>(datasetId: string, token: string): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await fetch(
      `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&offset=${offset}&limit=${limit}&format=json`
    );
    if (!response.ok) break;

    const batch = await response.json() as T[];
    if (!batch || batch.length === 0) break;

    items.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return items;
}

// Common Apify actor IDs
export const ACTORS = {
  GOOGLE_MAPS_SCRAPER: 'nwua9Gu5YrADL7ZDj',
  WEBSITE_CONTENT_CRAWLER: 'aYG0l9s7dbB7j3gbS',
  LINKEDIN_PEOPLE_SEARCH: 'VJCxaDMhSbr4b5VKi',
  LINKEDIN_COMPANY_SEARCH: 'wHMoznVs94gOcxcZl',
  EMAIL_FINDER: 'yl4EcECATfdhMtfmM',
  GOOGLE_REVIEWS_SCRAPER: 'Xb8osYTtOjlsgI6k9',
  INDEED_SCRAPER: 'hMvNSpz3JnHgl5jkh',
} as const;
