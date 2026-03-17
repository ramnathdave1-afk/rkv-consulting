const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `You are ATLAS Picks, an elite prediction market analyst specializing in Kalshi markets. You have deep expertise in:

- Probability assessment and calibration
- Market microstructure (bid/ask spreads, volume, liquidity)
- Current events analysis (politics, economics, weather, sports, culture)
- Identifying mispriced markets where the crowd is wrong
- Risk/reward analysis for binary options

Your job: Analyze today's Kalshi markets and select exactly 5 picks that have the best risk/reward profile. You look for EDGE - situations where your assessed probability differs meaningfully from the market price.

For each pick, you must provide:
1. The market ticker and title
2. Your recommended position (YES or NO)
3. Current market price vs your assessed probability
4. Expected value analysis
5. A clear, concise reasoning (2-3 sentences) explaining WHY this is a good bet
6. A confidence level (High/Medium/Low)

Focus on:
- Markets where you see mispricing (your probability estimate vs market price differs by 10%+)
- Markets with enough liquidity to actually trade
- Markets resolving soon (within 24-72 hours) so capital isn't tied up long
- Diverse categories (don't pick 5 weather markets)
- Higher conviction picks over marginal ones`;

/**
 * Analyze markets using Claude AI and return 5 best picks
 */
async function analyzePicks(marketsText) {
  const anthropic = getClient();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Today is ${today}. Here are today's most active and interesting Kalshi markets. Analyze them and give me your TOP 5 PICKS.

For each pick, format EXACTLY like this:

PICK [number]:
Market: [title]
Ticker: [ticker]
Position: [YES/NO]
Market Price: [current]c | My Probability: [your estimate]%
Expected Value: [+X.X%]
Confidence: [High/Medium/Low]
Reasoning: [2-3 sentence analysis]

After all 5 picks, add a brief "DAILY OUTLOOK" section (2-3 sentences) with your overall market assessment for the day.

Here are today's markets:

${marketsText}`,
      },
    ],
  });

  return message.content[0].text;
}

/**
 * Format the AI analysis into a Telegram-friendly message
 */
function formatTelegramMessage(analysis) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const header = [
    `\u{1F3B0} *ATLAS PICKS - Daily Kalshi Bets*`,
    `\u{1F4C5} ${today}`,
    `\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}`,
    '',
  ].join('\n');

  // Clean up the analysis for Telegram markdown
  let body = analysis
    .replace(/\*\*/g, '*')            // Double asterisks to single for Telegram
    .replace(/PICK (\d)/g, '\u{1F3AF} *PICK $1*') // Add emoji to picks
    .replace(/Market:/g, '\u{1F4CA} Market:')
    .replace(/Position: YES/g, '\u{1F7E2} Position: YES')
    .replace(/Position: NO/g, '\u{1F534} Position: NO')
    .replace(/Confidence: High/g, '\u{1F525} Confidence: High')
    .replace(/Confidence: Medium/g, '\u{26A0}\u{FE0F} Confidence: Medium')
    .replace(/Confidence: Low/g, '\u{1F4AD} Confidence: Low')
    .replace(/Expected Value:/g, '\u{1F4B0} EV:')
    .replace(/DAILY OUTLOOK/g, '\n\u{1F30D} *DAILY OUTLOOK*');

  const footer = [
    '',
    '\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}',
    '\u{26A0}\u{FE0F} _Not financial advice. Always DYOR._',
    '\u{1F916} _Powered by ATLAS AI_',
  ].join('\n');

  return header + body + footer;
}

module.exports = { analyzePicks, formatTelegramMessage };
