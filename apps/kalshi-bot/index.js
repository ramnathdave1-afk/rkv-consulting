require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { getTodaysBestMarkets, formatMarketsForAnalysis } = require('./kalshi');
const { analyzePicks, formatTelegramMessage } = require('./analyzer');

// ── Config ──────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 8 * * *'; // 8 AM daily

if (!BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env');
  process.exit(1);
}

// ── Bot Setup ───────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('ATLAS Picks Bot is running...');

// Track registered chat IDs for daily sends
const subscribedChats = new Set();
if (CHAT_ID) subscribedChats.add(CHAT_ID);

// ── Core: Generate and send picks ──────────────────────────────────
async function generateAndSendPicks(chatId) {
  try {
    await bot.sendMessage(chatId, '\u{1F50D} Scanning Kalshi markets...');

    // Step 1: Fetch today's best market candidates
    const markets = await getTodaysBestMarkets();

    if (markets.length === 0) {
      await bot.sendMessage(chatId, '\u{26A0}\u{FE0F} No active markets found right now. Try again later.');
      return;
    }

    await bot.sendMessage(chatId, `\u{1F4CA} Found ${markets.length} candidates. Running AI analysis...`);

    // Step 2: Format for AI
    const marketsText = formatMarketsForAnalysis(markets);

    // Step 3: AI analysis
    const analysis = await analyzePicks(marketsText);

    // Step 4: Format and send
    const message = formatTelegramMessage(analysis);

    // Telegram has a 4096 char limit, split if needed
    if (message.length > 4000) {
      const parts = splitMessage(message, 4000);
      for (const part of parts) {
        await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
      }
    } else {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error generating picks:', error);
    const errMsg = error.message || 'Unknown error';
    await bot.sendMessage(chatId, `\u{274C} Error generating picks: ${errMsg}`);
  }
}

function splitMessage(text, maxLen) {
  const parts = [];
  let current = '';
  const lines = text.split('\n');

  for (const line of lines) {
    if ((current + '\n' + line).length > maxLen) {
      parts.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) parts.push(current);
  return parts;
}

// ── Bot Commands ────────────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  subscribedChats.add(String(chatId));

  bot.sendMessage(chatId, [
    `\u{1F916} *Welcome to ATLAS Picks!*`,
    '',
    `Your Kalshi bet picking assistant powered by AI.`,
    '',
    `*Commands:*`,
    `/picks - Get today's 5 best Kalshi picks NOW`,
    `/subscribe - Subscribe to daily picks (8 AM EST)`,
    `/unsubscribe - Unsubscribe from daily picks`,
    `/markets - See today's top active markets`,
    `/help - Show this message`,
    '',
    `Your Chat ID: \`${chatId}\``,
    `_(Add this to your .env as TELEGRAM\\_CHAT\\_ID for auto-subscribe)_`,
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    `\u{1F916} *ATLAS Picks - Commands*`,
    '',
    `/picks - Generate 5 best Kalshi picks right now`,
    `/subscribe - Get daily picks at 8 AM EST`,
    `/unsubscribe - Stop daily picks`,
    `/markets - Preview today's top active markets`,
    `/help - Show this help message`,
    '',
    `*How it works:*`,
    `1. Scans all open Kalshi markets`,
    `2. Filters for high-volume, closing-soon markets`,
    `3. AI analyzes probability & finds mispriced bets`,
    `4. Delivers 5 best risk/reward picks with reasoning`,
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/picks/, (msg) => {
  generateAndSendPicks(msg.chat.id);
});

bot.onText(/\/subscribe/, (msg) => {
  const chatId = String(msg.chat.id);
  subscribedChats.add(chatId);
  bot.sendMessage(msg.chat.id, '\u{2705} Subscribed! You\'ll get daily picks at 8 AM EST.\n\nUse /picks to get picks right now.');
});

bot.onText(/\/unsubscribe/, (msg) => {
  const chatId = String(msg.chat.id);
  subscribedChats.delete(chatId);
  bot.sendMessage(msg.chat.id, '\u{274C} Unsubscribed from daily picks. Use /picks anytime for on-demand analysis.');
});

bot.onText(/\/markets/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, '\u{1F50D} Fetching active markets...');
    const markets = await getTodaysBestMarkets();

    if (markets.length === 0) {
      await bot.sendMessage(msg.chat.id, 'No active markets found.');
      return;
    }

    const preview = markets.slice(0, 10).map((m, i) => {
      const price = m.priceCents || m.last_price || '?';
      return `${i + 1}. *${m.title || m.ticker}*\n   Price: ${price}c | Vol: ${m.volume || 0}`;
    }).join('\n\n');

    await bot.sendMessage(msg.chat.id, [
      `\u{1F4CA} *Top 10 Active Markets*`,
      '',
      preview,
      '',
      `_Use /picks for full AI analysis_`,
    ].join('\n'), { parse_mode: 'Markdown' });
  } catch (error) {
    await bot.sendMessage(msg.chat.id, `\u{274C} Error fetching markets: ${error.message}`);
  }
});

// ── Daily Cron Job ──────────────────────────────────────────────────
cron.schedule(CRON_SCHEDULE, () => {
  console.log(`[${new Date().toISOString()}] Running daily picks...`);

  for (const chatId of subscribedChats) {
    generateAndSendPicks(chatId);
  }
}, {
  timezone: 'America/New_York',
});

console.log(`Daily picks scheduled: ${CRON_SCHEDULE} (EST)`);
console.log('Send /start to the bot to get started.');

// ── Graceful Shutdown ───────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('Shutting down bot...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  bot.stopPolling();
  process.exit(0);
});
