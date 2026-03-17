/**
 * Standalone script for GitHub Actions: fetch markets, analyze, send via Telegram.
 * Usage: TELEGRAM_BOT_TOKEN=xxx ANTHROPIC_API_KEY=xxx TELEGRAM_CHAT_ID=xxx node send-picks.js
 */

const axios = require('axios');
const { getTodaysBestMarkets, formatMarketsForAnalysis } = require('./kalshi');
const { analyzePicks, formatTelegramMessage } = require('./analyzer');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API_KEY = process.env.ANTHROPIC_API_KEY;

async function sendTelegram(chatId, text) {
  // Split long messages (Telegram limit: 4096 chars)
  const parts = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > 4000) {
      parts.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) parts.push(current);

  for (const part of parts) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: part,
      parse_mode: 'Markdown',
    });
  }
}

async function getChatId() {
  // If no CHAT_ID set, try to get it from recent messages to the bot
  if (CHAT_ID) return CHAT_ID;

  console.log('No TELEGRAM_CHAT_ID set. Checking recent messages...');
  const { data } = await axios.get(
    `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`,
    { params: { limit: 10 } }
  );

  if (data.result && data.result.length > 0) {
    const chatId = String(data.result[0].message.chat.id);
    console.log(`Found chat ID: ${chatId}`);
    return chatId;
  }

  throw new Error(
    'No TELEGRAM_CHAT_ID set and no messages found. Send /start to the bot first on Telegram, then re-run.'
  );
}

async function main() {
  if (!BOT_TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN');
  if (!API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');

  const chatId = await getChatId();
  console.log(`Sending picks to chat ${chatId}...`);

  await sendTelegram(chatId, '🔍 Scanning Kalshi markets...');

  const markets = await getTodaysBestMarkets();
  if (markets.length === 0) {
    await sendTelegram(chatId, '⚠️ No active markets found right now.');
    return;
  }

  console.log(`Found ${markets.length} market candidates`);
  await sendTelegram(chatId, `📊 Found ${markets.length} candidates. Running AI analysis...`);

  const marketsText = formatMarketsForAnalysis(markets);
  const analysis = await analyzePicks(marketsText);
  const message = formatTelegramMessage(analysis);

  await sendTelegram(chatId, message);
  console.log('Picks sent successfully!');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
