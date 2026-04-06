/**
 * SerpAPI Client — Real-time market data via Google/Zillow/Redfin scraping.
 * Provides live property comps, rental rates, market news, and property research.
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const BASE_URL = 'https://serpapi.com/search.json';

interface SerpApiParams {
  [key: string]: string | number | boolean | undefined;
}

async function serpFetch(params: SerpApiParams) {
  const url = new URL(BASE_URL);
  url.searchParams.set('api_key', SERPAPI_KEY || '');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);
  return res.json();
}

// ─── Market Comps ───────────────────────────────────────────────────

export interface PropertyComp {
  address: string;
  price: number | null;
  pricePerSqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  soldDate: string | null;
  source: string;
  link: string;
  thumbnail: string | null;
}

export async function getMarketComps(address: string, city: string, state: string, zip: string) {
  const query = `recently sold homes near ${address}, ${city}, ${state} ${zip}`;
  const [data, zillowData] = await Promise.all([
    serpFetch({ engine: 'google', q: query, num: 20 }),
    serpFetch({ engine: 'google', q: `site:zillow.com sold ${city}, ${state} ${zip}`, num: 10 }),
  ]);

  const comps: PropertyComp[] = [];

  for (const r of [...(data.organic_results || []).slice(0, 10), ...(zillowData.organic_results || []).slice(0, 5)]) {
    const priceMatch = r.snippet?.match(/\$[\d,]+/);
    if (!priceMatch) continue;
    if (comps.find(c => c.link === r.link)) continue;

    const price = parseInt(priceMatch[0].replace(/[$,]/g, ''));
    const sqftMatch = r.snippet?.match(/([\d,]+)\s*sq\s*ft/i);
    const sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null;
    const bedMatch = r.snippet?.match(/(\d+)\s*bed/i);
    const bathMatch = r.snippet?.match(/([\d.]+)\s*bath/i);
    const dateMatch = r.snippet?.match(/sold\s+([\w\s,]+\d{4})/i);

    comps.push({
      address: r.title?.split(/\s*[-|]\s*/)[0] || '',
      price,
      pricePerSqft: sqft ? Math.round(price / sqft) : null,
      bedrooms: bedMatch ? parseInt(bedMatch[1]) : null,
      bathrooms: bathMatch ? parseFloat(bathMatch[1]) : null,
      sqft,
      soldDate: dateMatch ? dateMatch[1].trim() : null,
      source: r.displayed_link?.includes('zillow') ? 'Zillow' : r.displayed_link?.includes('redfin') ? 'Redfin' : 'Google',
      link: r.link || '',
      thumbnail: r.thumbnail || null,
    });
  }

  const prices = comps.filter(c => c.price).map(c => c.price!).sort((a, b) => a - b);
  const ppsf = comps.filter(c => c.pricePerSqft).map(c => c.pricePerSqft!).sort((a, b) => a - b);

  return {
    comps,
    medianPrice: prices.length ? prices[Math.floor(prices.length / 2)] : null,
    medianPricePerSqft: ppsf.length ? ppsf[Math.floor(ppsf.length / 2)] : null,
    avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
  };
}

// ─── Rental Rates ───────────────────────────────────────────────────

export interface RentalComp {
  address: string;
  rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  source: string;
  link: string;
}

export async function getRentalRates(city: string, state: string, zip: string, bedrooms?: number) {
  const bedQuery = bedrooms ? `${bedrooms} bedroom` : '';
  const [data, avgData] = await Promise.all([
    serpFetch({ engine: 'google', q: `${bedQuery} apartments for rent ${city}, ${state} ${zip}`, num: 20 }),
    serpFetch({ engine: 'google', q: `average rent ${bedQuery} ${city}, ${state} ${zip} 2026`, num: 10 }),
  ]);

  const rentals: RentalComp[] = [];

  // Answer box (market average)
  if (avgData.answer_box?.answer) {
    const m = avgData.answer_box.answer.match(/\$[\d,]+/);
    if (m) rentals.push({ address: `Market Average - ${city}, ${state}`, rent: parseInt(m[0].replace(/[$,]/g, '')), bedrooms: bedrooms || null, bathrooms: null, sqft: null, source: 'Market Average', link: '' });
  }

  for (const r of (data.organic_results || [])) {
    const rentMatch = r.snippet?.match(/\$[\d,]+/);
    if (!rentMatch) continue;
    const rent = parseInt(rentMatch[0].replace(/[$,]/g, ''));
    if (rent < 200 || rent > 20000) continue;

    const sqftMatch = r.snippet?.match(/([\d,]+)\s*sq\s*ft/i);
    const bedMatch = r.snippet?.match(/(\d+)\s*bed/i);
    const bathMatch = r.snippet?.match(/([\d.]+)\s*bath/i);

    rentals.push({
      address: r.title?.split(/\s*[-|]\s*/)[0] || '',
      rent,
      bedrooms: bedMatch ? parseInt(bedMatch[1]) : null,
      bathrooms: bathMatch ? parseFloat(bathMatch[1]) : null,
      sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null,
      source: r.displayed_link || 'Google',
      link: r.link || '',
    });
  }

  const rents = rentals.filter(r => r.rent).map(r => r.rent!).sort((a, b) => a - b);
  return {
    rentals,
    medianRent: rents.length ? rents[Math.floor(rents.length / 2)] : null,
    avgRent: rents.length ? Math.round(rents.reduce((a, b) => a + b, 0) / rents.length) : null,
    lowRent: rents[0] ?? null,
    highRent: rents[rents.length - 1] ?? null,
  };
}

// ─── Property Research ──────────────────────────────────────────────

export interface PropertyResearch {
  estimatedValue: number | null;
  zestimate: number | null;
  lastSoldPrice: number | null;
  lastSoldDate: string | null;
  yearBuilt: number | null;
  lotSize: string | null;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  walkScore: number | null;
  schoolRating: string | null;
  sources: { title: string; link: string; snippet: string }[];
}

export async function getPropertyResearch(address: string, city: string, state: string, zip: string): Promise<PropertyResearch> {
  const full = `${address}, ${city}, ${state} ${zip}`;
  const [propData, hoodData] = await Promise.all([
    serpFetch({ engine: 'google', q: `"${full}" property details zillow redfin`, num: 15 }),
    serpFetch({ engine: 'google', q: `${city}, ${state} ${zip} walk score crime schools`, num: 10 }),
  ]);

  const result: PropertyResearch = { estimatedValue: null, zestimate: null, lastSoldPrice: null, lastSoldDate: null, yearBuilt: null, lotSize: null, sqft: null, bedrooms: null, bathrooms: null, walkScore: null, schoolRating: null, sources: [] };

  const all = [...(propData.organic_results || []), ...(hoodData.organic_results || [])];

  if (propData.answer_box?.answer) {
    const m = propData.answer_box.answer.match(/\$[\d,]+/);
    if (m) result.estimatedValue = parseInt(m[0].replace(/[$,]/g, ''));
  }

  for (const r of all) {
    const s = r.snippet || '';
    if (!result.zestimate && /zestimate/i.test(s)) { const m = s.match(/\$[\d,]+/); if (m) result.zestimate = parseInt(m[0].replace(/[$,]/g, '')); }
    if (!result.estimatedValue) { const m = s.match(/(?:estimated|value|worth)[:\s]*\$[\d,]+/i); if (m) { const p = m[0].match(/\$[\d,]+/); if (p) result.estimatedValue = parseInt(p[0].replace(/[$,]/g, '')); } }
    if (!result.lastSoldPrice) { const m = s.match(/sold[:\s]*(?:for\s*)?\$[\d,]+/i); if (m) { const p = m[0].match(/\$[\d,]+/); if (p) result.lastSoldPrice = parseInt(p[0].replace(/[$,]/g, '')); } const d = s.match(/sold\s+(?:on\s+)?([\w]+\s+\d{1,2},?\s+\d{4})/i); if (d) result.lastSoldDate = d[1]; }
    if (!result.sqft) { const m = s.match(/([\d,]+)\s*sq\s*ft/i); if (m) result.sqft = parseInt(m[1].replace(/,/g, '')); }
    if (!result.bedrooms) { const m = s.match(/(\d+)\s*bed/i); if (m) result.bedrooms = parseInt(m[1]); }
    if (!result.bathrooms) { const m = s.match(/([\d.]+)\s*bath/i); if (m) result.bathrooms = parseFloat(m[1]); }
    if (!result.yearBuilt) { const m = s.match(/built\s*(?:in\s*)?(\d{4})/i); if (m) result.yearBuilt = parseInt(m[1]); }
    if (!result.lotSize) { const m = s.match(/([\d,.]+)\s*(?:acres?|sq\s*ft)\s*lot/i); if (m) result.lotSize = m[0]; }
    if (!result.walkScore) { const m = s.match(/walk\s*score[:\s]*(\d+)/i); if (m) result.walkScore = parseInt(m[1]); }
    if (!result.schoolRating) { const m = s.match(/school[s]?\s*(?:rating|grade|score)[:\s]*([\w+\/\d]+)/i); if (m) result.schoolRating = m[1]; }
    if (r.link && result.sources.length < 8) result.sources.push({ title: r.title || '', link: r.link, snippet: s.slice(0, 200) });
  }

  return result;
}

// ─── Market News ────────────────────────────────────────────────────

export interface MarketNewsItem {
  title: string;
  snippet: string;
  link: string;
  source: string;
  date: string | null;
  thumbnail: string | null;
}

export async function getMarketNews(city: string, state: string): Promise<MarketNewsItem[]> {
  const data = await serpFetch({ engine: 'google', q: `${city} ${state} real estate market news 2026`, tbm: 'nws', num: 15 });
  return (data.news_results || []).slice(0, 12).map((r: Record<string, unknown>) => ({
    title: r.title || '',
    snippet: r.snippet || '',
    link: r.link || '',
    source: (r.source as Record<string, string>)?.name || r.source || '',
    date: r.date || null,
    thumbnail: r.thumbnail || null,
  }));
}

// ─── Market Stats ───────────────────────────────────────────────────

export interface MarketStats {
  medianHomePrice: number | null;
  medianRent: number | null;
  vacancyRate: string | null;
  appreciationRate: string | null;
  population: string | null;
  medianIncome: string | null;
  insights: string[];
}

export async function getMarketStats(city: string, state: string): Promise<MarketStats> {
  const [housing, econ] = await Promise.all([
    serpFetch({ engine: 'google', q: `${city} ${state} housing market statistics 2026 median home price vacancy rate`, num: 15 }),
    serpFetch({ engine: 'google', q: `${city} ${state} economy population median income`, num: 10 }),
  ]);

  const stats: MarketStats = { medianHomePrice: null, medianRent: null, vacancyRate: null, appreciationRate: null, population: null, medianIncome: null, insights: [] };

  if (housing.answer_box?.answer) { const m = housing.answer_box.answer.match(/\$[\d,]+/); if (m) stats.medianHomePrice = parseInt(m[0].replace(/[$,]/g, '')); }

  for (const r of [...(housing.organic_results || []), ...(econ.organic_results || [])]) {
    const s = r.snippet || '';
    if (!stats.medianHomePrice) { const m = s.match(/median\s*(?:home|sale)?\s*price[:\s]*\$[\d,]+/i); if (m) { const p = m[0].match(/\$[\d,]+/); if (p) stats.medianHomePrice = parseInt(p[0].replace(/[$,]/g, '')); } }
    if (!stats.medianRent) { const m = s.match(/median\s*rent[:\s]*\$[\d,]+/i); if (m) { const p = m[0].match(/\$[\d,]+/); if (p) stats.medianRent = parseInt(p[0].replace(/[$,]/g, '')); } }
    if (!stats.vacancyRate) { const m = s.match(/vacancy\s*rate[:\s]*([\d.]+%)/i); if (m) stats.vacancyRate = m[1]; }
    if (!stats.appreciationRate) { const m = s.match(/(?:appreciation|growth)[:\s]*([\d.]+%)/i); if (m) stats.appreciationRate = m[1]; }
    if (!stats.population) { const m = s.match(/population[:\s]*([\d,]+)/i); if (m) stats.population = m[1]; }
    if (!stats.medianIncome) { const m = s.match(/median\s*(?:household\s*)?income[:\s]*\$[\d,]+/i); if (m) { const p = m[0].match(/\$[\d,]+/); if (p) stats.medianIncome = p[0]; } }
    if (s.length > 50 && stats.insights.length < 5) stats.insights.push(s.slice(0, 250));
  }

  return stats;
}
