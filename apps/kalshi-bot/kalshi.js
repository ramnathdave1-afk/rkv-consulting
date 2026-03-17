const axios = require('axios');

const BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Accept': 'application/json' },
});

/**
 * Fetch open markets from Kalshi (public, no auth required)
 */
async function getMarkets(limit = 200) {
  const { data } = await api.get('/markets', {
    params: { limit, status: 'open' },
  });
  return data.markets || [];
}

/**
 * Fetch a single event with nested markets
 */
async function getEvent(eventTicker) {
  const { data } = await api.get(`/events/${eventTicker}`, {
    params: { with_nested_markets: true },
  });
  return data.event;
}

/**
 * Fetch markets for a specific event
 */
async function getEventMarkets(eventTicker) {
  const { data } = await api.get('/markets', {
    params: { event_ticker: eventTicker, status: 'open', limit: 100 },
  });
  return data.markets || [];
}

/**
 * Fetch orderbook for a market to get bid/ask spread
 */
async function getOrderbook(ticker) {
  try {
    const { data } = await api.get(`/markets/${ticker}/orderbook`);
    return data.orderbook;
  } catch {
    return null;
  }
}

/**
 * Get today's most interesting markets:
 * - High volume
 * - Closing soon (within 24-72 hours)
 * - Good liquidity (tight spreads)
 * - Mid-range probabilities (more interesting than 95%+ or 5%-)
 */
async function getTodaysBestMarkets() {
  const allMarkets = await getMarkets(1000);

  const now = Date.now();
  const in72Hours = now + 72 * 60 * 60 * 1000;
  const in1Hour = now + 1 * 60 * 60 * 1000;

  // Filter for markets that are active and interesting
  const candidates = allMarkets.filter((m) => {
    // Must be open
    if (m.status !== 'open') return false;

    // Has price data (yes_ask or last_price)
    const price = m.last_price || m.yes_ask;
    if (!price) return false;

    // Closing within 72 hours but not within 1 hour (need time to act)
    const closeTime = new Date(m.close_time || m.expected_expiration_time).getTime();
    if (closeTime < in1Hour || closeTime > in72Hours) return false;

    return true;
  });

  // Score each market for "pickability"
  const scored = candidates.map((m) => {
    const price = m.last_price || m.yes_ask || 50;
    const priceCents = typeof price === 'number' && price <= 1 ? Math.round(price * 100) : price;

    // Prefer mid-range probabilities (30-70 cents) - more edge to find
    const midRangeScore = 100 - Math.abs(priceCents - 50) * 2;

    // Volume score
    const volume = m.volume || 0;
    const volumeScore = Math.min(volume / 100, 100);

    // Liquidity (tighter spread = better)
    const spread = (m.yes_ask && m.yes_bid) ? (m.yes_ask - m.yes_bid) : 10;
    const spreadCents = typeof spread === 'number' && spread <= 1 ? Math.round(spread * 100) : spread;
    const liquidityScore = Math.max(0, 100 - spreadCents * 10);

    const totalScore = midRangeScore * 0.4 + volumeScore * 0.3 + liquidityScore * 0.3;

    return { ...m, priceCents, totalScore, volume };
  });

  // Sort by score and return top candidates
  scored.sort((a, b) => b.totalScore - a.totalScore);

  return scored.slice(0, 30); // Top 30 candidates for AI to analyze
}

/**
 * Format market data for AI analysis
 */
function formatMarketsForAnalysis(markets) {
  return markets.map((m, i) => {
    const price = m.priceCents || m.last_price || 'N/A';
    const closeTime = m.close_time || m.expected_expiration_time || 'Unknown';
    const hoursLeft = closeTime !== 'Unknown'
      ? ((new Date(closeTime).getTime() - Date.now()) / (1000 * 60 * 60)).toFixed(1)
      : '?';

    return [
      `${i + 1}. ${m.title || m.ticker}`,
      `   Ticker: ${m.ticker}`,
      `   Event: ${m.event_ticker || 'N/A'}`,
      `   Current Price (YES): ${price}c`,
      `   Volume: ${m.volume || 0} contracts`,
      `   Yes Bid/Ask: ${m.yes_bid || '?'}c / ${m.yes_ask || '?'}c`,
      `   No Bid/Ask: ${m.no_bid || '?'}c / ${m.no_ask || '?'}c`,
      `   Closes in: ${hoursLeft} hours (${closeTime})`,
      `   Subtitle: ${m.subtitle || 'N/A'}`,
    ].join('\n');
  }).join('\n\n');
}

module.exports = {
  getMarkets,
  getEvent,
  getEventMarkets,
  getOrderbook,
  getTodaysBestMarkets,
  formatMarketsForAnalysis,
};
