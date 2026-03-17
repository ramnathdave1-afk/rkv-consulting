# ATLAS Picks - Kalshi Bet Picking Bot

AI-powered Telegram bot that scans Kalshi prediction markets daily and delivers 5 high-conviction picks with probability analysis.

## Setup

1. Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the bot:
   ```bash
   npm start
   ```

4. Open Telegram, find your bot (`@Daveramnath_openclawbot`), and send `/start`

5. Use `/picks` to get your first 5 picks immediately

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message + your chat ID |
| `/picks` | Generate 5 best Kalshi picks right now |
| `/subscribe` | Get daily picks at 8 AM EST automatically |
| `/unsubscribe` | Stop daily picks |
| `/markets` | Preview top 10 active markets |
| `/help` | Show all commands |

## How It Works

1. **Scan** - Fetches all open Kalshi markets via their public API
2. **Filter** - Scores markets by volume, liquidity, time-to-close, and probability range
3. **Analyze** - Claude AI evaluates the top 30 candidates for mispricing and edge
4. **Pick** - Delivers 5 best bets with position (YES/NO), probability assessment, EV, and reasoning
5. **Schedule** - Runs daily at 8 AM EST for subscribers

## Required API Keys

- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `ANTHROPIC_API_KEY` - From console.anthropic.com
