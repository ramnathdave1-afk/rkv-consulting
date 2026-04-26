# RKV Consulting — Autonomous Cold Outreach System
## Product Requirements Document (PRD)

**Version**: 1.0
**Date**: April 8, 2026
**Owner**: Dave Ramnath, RKV Consulting
**Status**: Approved for Build

---

## 1. Overview

### What We're Building
A fully autonomous AI-powered cold outreach system that finds property management companies with 500+ units, writes hyper-personalized emails, blasts 3,000+ per week across 20 Gmail accounts, monitors replies, books meetings, posts content to LinkedIn/TikTok/Facebook/Instagram, tracks intent signals, and self-optimizes weekly — all controlled by a voice agent in the CRM.

### The User Experience
Dave presses a microphone button in the CRM. He says "Find 3000 property managers in Florida and blast them." The system does everything else autonomously. His only other interaction is reviewing LinkedIn DMs before they send, and showing up to meetings. The system briefs him before each meeting, follows up after, and nudges until the deal closes.

### What We're Selling
RKV Consulting's AI-powered property management platform:
- **5 AI Agents**: Leasing AI (90-sec response), Voice AI (24/7 phone), Maintenance AI (auto-dispatch), Finance Agent (owner reports + collections), Acquisitions Agent (deal scoring)
- **Pricing**: $10/unit/month (Growth tier, up to 500 units). Enterprise: custom pricing for 500+.
- **Target**: Property management companies with 500+ units
- **Value Prop**: "5 AI agents replace your leasing coordinator, call center, maintenance dispatcher, bookkeeper, and acquisitions analyst — so 5 people run 200+ units"
- **Proven Results**: 96% occupancy, 90-sec response time, 97% AI resolution rate, 82% less delinquency
- **Implementation**: Live in 48 hours
- **Integrations**: AppFolio, Buildium, Yardi, RealPage, Entrata

---

## 2. Cost Structure — Under $30/Month Out of Pocket

### Real Operating Costs (Honest Numbers)
| Service | Monthly | Notes |
|---------|---------|-------|
| Claude API (30 agents, Haiku + Sonnet) | ~$40-65 | Scales with campaign volume. 1 campaign = ~$40, 2-3 = ~$65 |
| Apify (Starter plan) | $49 | 100 actor runs/month for scraping all platforms |
| n8n (self-hosted) | $5 | Railway/Render — crons need ~12,000 executions/month |
| ElevenLabs (Starter) | $5 | Voice agent + notifications |
| Deepgram (pay-as-you-go) | ~$2 | Voice STT |
| Gmail API | $0 | Free |
| Meta Marketing API | $0 | Free (ad spend is separate) |
| TikTok Content Posting API | $0 | Free |
| LinkedIn API | $0 | Free |
| Google Calendar API | $0 | Free |
| **TOTAL OUT OF POCKET** | **~$100-125/mo** | |

### On Business Card
| Service | Monthly |
|---------|---------|
| Google Workspace (20 email accounts) | $120 |
| Facebook/Instagram ad spend | Variable (your budget) |

### At Full Scale (3+ campaigns, 10,000+ emails/month)
| Service | Monthly |
|---------|---------|
| Claude API | ~$100-150 |
| Apify (Scale plan) | $99 |
| n8n | $5 |
| ElevenLabs | $5 |
| Deepgram | ~$5 |
| **Out of pocket** | **~$215-265/mo** |

### ROI Math
- System cost: ~$100-265/mo (scales with usage)
- ONE client at 500 units × $10/unit = $5,000/mo revenue
- **System pays for itself in 3 days of one client**
- 3 clients = $15,000/mo revenue vs ~$200/mo cost = **75x ROI**
- 5 clients = $25,000/mo, 10 clients = $50,000/mo

---

## 3. The 30 Agents

### Phase 1 — Prospecting (Find + Score + Trigger)
| # | Agent | AI Model | What It Does |
|---|-------|----------|--------------|
| 1 | Lead Scraper | Haiku + Apify | Scrapes Google Maps + LinkedIn + Facebook for PM companies |
| 2 | Company Enricher | Haiku + Apify | Crawls websites, extracts unit count, services, tech stack, website quality |
| 3 | Contact Finder | Haiku + Apify | Finds 2-3 decision-makers per company (CEO, VP Ops, Regional Manager) |
| 4 | Email Finder | Haiku + Apify | Discovers email addresses via pattern matching + Apify |
| 5 | Email Verifier | No AI | MX record + SMTP validation, catch-all detection, disposable filtering |
| 6 | ICP Scorer | Haiku (bulk) + Sonnet (top 10%) | Scores 0-100: unit count, website quality, pain signals, hiring, triggers |
| 26 | Trigger Monitor | Haiku + Apify | Weekly: monitors job postings, bad Google reviews, website changes, LinkedIn activity |

### Phase 2 — Social Proof + Content
| # | Agent | AI Model | What It Does |
|---|-------|----------|--------------|
| 27 | Social Warmer | Haiku + Apify | Pre-warms prospects on LinkedIn: follow → like → comment → connect (14-day ramp) |
| 16 | LinkedIn Post Creator | Sonnet + Apify trends | 5 posts/week: thought leadership, case studies, hot takes, tips. Based on trending content. |
| 17 | TikTok Content Creator | Sonnet + Apify trends | 3 video scripts/week: educational, storytime, hot take. Auto-posted via TikTok API. |
| 18 | Facebook Ad Manager | Sonnet + Apify competitor ads | Generates ad copy, posts to Facebook + Instagram via Meta API. Competitor-informed. |
| 19 | Ad Creative Generator | Image MCP (nano-banana-2) | Generates ad images for Facebook/Instagram/LinkedIn |

### Phase 3 — Personalize + Write
| # | Agent | AI Model | What It Does |
|---|-------|----------|--------------|
| 7 | Personalization Researcher | Sonnet (top 10%) + Haiku | Finds hooks: pain points, portfolio details, trigger events, review excerpts |
| 8 | Email Copywriter | Sonnet (top 10%) + Haiku | Writes unique email per prospect. Role-specific (CEO vs VP vs Manager). |
| 9 | Subject Line Optimizer | Haiku | 3 A/B/C variants per email. Learns from AI Optimizer data. |
| 10 | Follow-Up Sequencer | Haiku | Manages 7-touch, 21-day multi-channel sequence: email → LinkedIn → SMS |
| 11 | LinkedIn Message Writer | Haiku | Connection request notes + DMs. Queued for review before sending. |
| 12 | Objection Handler | Sonnet | Industry-specific rebuttals: AppFolio integration, AI trust, pricing, timing |

### Phase 4 — Deliver
| # | Agent | AI Model | What It Does |
|---|-------|----------|--------------|
| 13 | Email Blaster | No AI | Sends via 20 Gmail accounts with rotation, warmup, timezone-aware scheduling |
| 14 | LinkedIn DM Sender | No AI (Apify) | Sends approved connection requests + DMs via Apify actors |
| 15 | Account Manager | No AI | Monitors 20 Gmail accounts: daily limits, warmup ramp, bounce rates, reputation |

### Phase 5 — Monitor + Respond
| # | Agent | AI Model | What It Does |
|---|-------|----------|--------------|
| 20 | Reply Classifier | Haiku | Classifies: interested, objection, question, not_interested, unsubscribe, OOO, wrong_person |
| 28 | Intent Scorer | Haiku | Tracks email opens, link clicks, website visits, LinkedIn views → heat score 0-100 |
| 21 | Lead Responder | Sonnet | Auto-replies in <2 min: meeting times for interested, rebuttals for objections, answers for questions |
| 22 | Meeting Booker | No AI (Calendar MCP) | Creates Google Calendar event + Google Meet link + sends invite |

### Phase 6 — Close + Learn
| # | Agent | AI Model | What It Does |
|---|-------|----------|--------------|
| 24 | Auto-Proposal Generator | Sonnet | Custom proposal: their unit count × $5, ROI calc, implementation timeline, case study |
| 30 | Deal Closer | Sonnet | Post-meeting follow-up: proposal email, 48hr nudge, 5-day value add, 10-day urgency |
| 23 | Competitor Spy | Haiku + Apify | Weekly: competitor ads, pricing changes, LinkedIn content, review sentiment |
| 29 | AI Optimizer | Sonnet | Weekly analysis: subject line A/B results, best send times, ICP weight tuning, cost efficiency |
| 25 | Campaign Orchestrator + Analytics | Sonnet | Coordinates all agents, tracks spending, generates voice updates |

---

## 4. The 10 n8n Workflows

### Workflow 1: Campaign Launch
**Trigger**: Webhook (voice command or CRM button)
**Input**: `{ industry, geo, count }`
**Flow**:
1. Create campaign record in Supabase
2. Apify Google Maps + LinkedIn + Facebook scrape (parallel)
3. Merge + deduplicate → ~5,000 raw prospects
4. Loop each prospect:
   - Apify website crawler → Company Enricher (Haiku) → extract units, services, website quality
   - Contact Finder (Haiku) → find 2-3 decision-makers via LinkedIn
   - Email Finder (Apify + Haiku) → discover emails
   - Email Verifier (code) → MX + SMTP check
   - ICP Scorer (Haiku, Sonnet for top 10%) → score 0-100
   - Filter: score > 40 passes, below = disqualified
5. Loop each qualified prospect:
   - Personalization Researcher → find hooks
   - Email Copywriter → unique email per prospect (role-specific for multi-thread)
   - Subject Line Optimizer → 3 A/B/C variants
   - Save to outreach_sends (status: queued)
6. Voice response: "Campaign ready. {count} qualified, {emails} emails queued."

### Workflow 2: Email Sender
**Trigger**: Cron every 15 minutes
**Flow**:
1. Get queued emails (ordered by ICP score — best prospects first)
2. Get active Gmail accounts with remaining daily capacity
3. Loop each email:
   - Pick Gmail account (round-robin, least-used first)
   - Pick subject line variant (A/B/C weighted by Optimizer data)
   - Send via Gmail API with tracking pixel + click redirect links
   - Record message_id + thread_id for reply tracking
   - Update account daily count
   - Random 3-5 second delay between sends
4. **Smart rules**: 7am-6pm recipient timezone only, max 1 email per domain per account per day, no Sundays, warmup ramp (20→50→100→200→500/day per account)

### Workflow 3: Reply Monitor
**Trigger**: Cron every 10 minutes
**Flow**:
1. Check all 20 Gmail inboxes for new unread messages
2. Match replies to outreach_sends (by thread_id)
3. Classify with Haiku: interested / objection / question / not_interested / unsubscribe / OOO / wrong_person
4. Stop all sequences for any reply (except OOO)
5. Route by classification:
   - **Interested**: Sonnet writes warm reply with 3 meeting times from Google Calendar. Send in <2 min. Generate proposal. Voice notify.
   - **Objection**: Pull rebuttal from playbook. Sonnet personalizes. Send reply. Keep in sequence (push back 5 days).
   - **Question**: Sonnet answers with product details specific to their company. Soft CTA.
   - **Not Interested**: Remove from everything. No reply. Log reason.
   - **Unsubscribe**: Remove from everything. Add to global suppression. Send confirmation.
   - **OOO**: Extract return date. Pause sequence. Resume day after return.
   - **Wrong Person**: Extract referral. Create new contact if referred. Reply with thanks.

### Workflow 4: Follow-Up Sequencer
**Trigger**: Cron 9am + 2pm ET, Monday-Friday
**Flow**: For each contact who hasn't replied and is past their next step date:
- **Day 3**: Email follow-up #1 (different angle, shorter, ~80 words)
- **Day 5**: LinkedIn connection request (queued for review)
- **Day 7**: Email follow-up #2 (case study of similar PM company)
- **Day 10**: LinkedIn DM if connected (queued for review)
- **Day 14**: Email follow-up #3 (breakup — leave door open)
- **Day 17**: SMS via Twilio (ONLY if ICP > 80)
- **Day 21**: Archive as cold
- **Stops immediately** on any reply on any channel

### Workflow 5: Trigger Monitor
**Trigger**: Weekly Monday 6am (full scan) + Daily 7am (review check)
**Flow**:
1. Apify scans for each prospect:
   - Indeed/LinkedIn job postings (hiring leasing agent, maintenance coordinator, etc.)
   - New Google reviews (1-3 stars mentioning maintenance, response time, etc.)
   - Website changes (new properties, lost properties, unit count changes)
   - LinkedIn activity (shared PM tech articles, job title changes)
2. Haiku scores each trigger event 1-10
3. Score >= 7: Sonnet writes trigger-specific email referencing the exact event
4. Queue as priority email (skips normal queue, sends next batch)
5. Bump ICP score +10 (trigger = buying signal)
6. Voice notify: "Trigger detected at {company} — {event}. Priority email queued."

### Workflow 6: Social Warmer
**Trigger**: Daily 8am ET
**Flow**: For prospects 7-14 days away from their first email:
- **Day -14**: Follow their LinkedIn profile (Apify)
- **Day -10**: Like one of their posts (Apify)
- **Day -7**: Comment on a post — Haiku writes genuine, non-salesy comment (Apify)
- **Day -5**: Like another post / share their content (Apify)
- **Day -3**: Connection request with note (queued for review)
- **Daily limits**: 30 follows, 40 likes, 15 comments, 20 connection requests
- By Day 0 email: they've seen your name 5 times on LinkedIn

### Workflow 7: Content Creator
**Trigger**: Sunday 9pm ET (weekly content generation)
**Flow**:
1. Apify scrapes trends: top LinkedIn PM posts, trending TikTok PM content, competitor Facebook ads
2. Haiku analyzes: what topics, formats, and tones are winning this week
3. Sonnet generates:
   - 5 LinkedIn posts (Mon-Fri: thought leadership, case study, hot take, tip, reflection)
   - 3 TikTok video scripts (Tue/Thu/Sat: educational, storytime, hot take) with hooks, captions, hashtags
   - 3 Facebook/Instagram ad variants (speed angle, cost angle, results angle)
4. Image MCP generates ad creatives
5. Schedule posts throughout the week via LinkedIn API, TikTok API, Meta API

### Workflow 8: Intent Scorer
**Trigger**: Cron every 10 minutes
**Flow**:
1. Collect signals: email opens (tracking pixel), link clicks (redirect tracking), website visits (analytics pixel), LinkedIn profile views
2. Calculate heat score per prospect:
   - First open: +5, Re-open: +10, 3+ opens: +20
   - Link click: +25, Pricing page: +40, Demo page: +35
   - LinkedIn profile view: +15, Email forwarded: +30
   - Decay: -5/day of inactivity
3. Act on scores:
   - 80-100 (on fire): Voice notify + priority follow-up email immediately
   - 50-79 (warm): Accelerate sequence (next follow-up tomorrow instead of 3 days)
   - 20-49 (lukewarm): Normal sequence
   - 0-19 (cold): Deprioritize after Day 14

### Workflow 9: AI Optimizer
**Trigger**: Friday 11pm ET (weekly)
**Flow**:
1. Pull all week's data: email performance, reply analysis, meeting data, intent signals, social metrics, cost data
2. Sonnet deep analysis across 8 areas:
   - Subject line A/B/C winners → adjust weights
   - Best email angle (pain point vs case study vs ROI) → shift default
   - Best send time → adjust schedule
   - ICP signal correlation → reweight scorer
   - Sequence step performance → adjust timing/channels
   - Social warming effectiveness → expand or reduce
   - Trigger event ROI → prioritize best trigger types
   - Cost per meeting → optimize Sonnet vs Haiku allocation
3. Auto-apply changes to agent configs in Supabase
4. Log all changes with reasoning
5. Voice report: weekly summary of learnings + changes made

### Workflow 10: Deal Closer
**Trigger**: Webhook (meeting booked / completed) + Daily 9am cron (nudge check)
**Flow**:
- **Meeting booked**: Generate custom proposal (Sonnet) + objection prep + schedule pre-meeting briefing
- **30 min before meeting**: Voice briefing with prospect intel, key objections, strongest pitch angle
- **Meeting completed** (you mark outcome):
  - "Send proposal" → Email proposal + start nudge sequence
  - "Follow up later" → Schedule future check-in
  - "Closed won" → Record deal, remove from outreach, victory alert
  - "Not interested" → Move to 90-day nurture list
- **Nudge sequence** (no response to proposal):
  - 48 hours: Soft nudge ("any questions?")
  - 5 days: Value add (relevant industry stat)
  - 10 days: Urgency ("3 implementation slots left this month")
  - 14 days: Final check (leave door open)
  - 21 days: Archive to long-term nurture

---

## 5. Elite Features

### Feature 1: Trigger-Based Timing
Instead of emailing cold, email when something HAPPENS at their company. Monitored triggers:
- Hiring leasing/maintenance staff (Indeed + LinkedIn Jobs via Apify)
- Bad Google reviews mentioning maintenance/response time delays
- New property added to portfolio (website change detection)
- Lost property from portfolio (website change detection)
- Decision-maker shared PM tech article on LinkedIn
- Competitor raised prices (Competitor Spy detects)
- Lease renewal season approaching (calendar-based)

**Impact**: Trigger-based emails get 3-5x higher reply rates than generic cold email.

### Feature 2: Multi-Threading
Don't email one person. Surround the company:
- CEO/Owner: ROI + strategic pitch (email + LinkedIn)
- VP Operations: Operational improvement pitch (email)
- Regional/Property Manager: Pain-point pitch (LinkedIn DM)
- Stagger: CEO Day 0, VP Day 1, Manager Day 3
- When ANY reply → consolidate the company thread

**Impact**: 2-3x more meetings than single-threading.

### Feature 3: Social Proof Stacking
Pre-warm prospects 14 days before the email:
Day -14: Follow on LinkedIn → Day -10: Like post → Day -7: Comment on post → Day -5: Like again → Day -3: Connection request → Day 0: EMAIL LANDS
By Day 0, they've seen your name 5 times. Email doesn't feel cold.

**Impact**: 2-3x higher open + reply rates on warmed prospects.

### Feature 4: Intent Signals + AI Learning
Track: email opens (tracking pixel), link clicks (redirect tracking), website visits (analytics pixel), LinkedIn profile views. Calculate heat score 0-100.
- Heat 80+: Voice alert + priority follow-up
- Heat 50+: Accelerate sequence
- AI Optimizer: weekly analysis adjusts subject lines, send times, ICP weights, sequence timing automatically.

**Impact**: System gets smarter every week. By month 3, running campaigns you never could have designed.

### Feature 5: Deal Acceleration
Speed-to-lead: interested reply → auto-response with meeting times in <2 minutes → calendar invite → proposal generated before meeting. Pre-meeting voice briefing. Post-meeting auto follow-up with proposal + nudge sequence.

**Impact**: Converts interested replies to signed clients faster than any human process.

---

## 6. APIs & External Services

### Already Integrated (in RKV Consulting codebase)
| Service | File | Status |
|---------|------|--------|
| Anthropic Claude | `lib/ai/claude.ts` | Working — extend with model param + cost tracking |
| Resend (email) | `lib/email/send.ts` | Working — keep as fallback, Gmail API is primary |
| Twilio (SMS) | `lib/twilio/client.ts` | Working — used for Day 17 SMS to hot leads |
| Deepgram (STT) | `lib/voice-ai/stt.ts` | Working — adapt for browser voice agent |
| ElevenLabs (TTS) | `lib/voice-ai/tts.ts` | Working — adapt for browser voice agent |
| SerpAPI | `lib/serpapi/client.ts` | Working — supplements Apify for Google searches |
| Gmail OAuth2 | `lib/integrations/gmail.ts` | Code exists, needs GOOGLE_CLIENT_ID + SECRET |
| Supabase | `lib/supabase/server.ts` | Working — add 20+ new tables |

### MCPs Available
| MCP | Used By | Purpose |
|-----|---------|---------|
| `mcp__claude_ai_Gmail` | Reply Monitor, ad-hoc email checks | Read/send Gmail from terminal |
| `mcp__claude_ai_Google_Calendar` | Meeting Booker | Create events, check availability |
| `mcp__nano-banana-2` | Ad Creative Generator | Generate ad images |

### New Integrations to Build
| Service | What to Build | Env Vars Needed |
|---------|--------------|-----------------|
| Gmail API (20 accounts) | Multi-account OAuth2 flow + token storage + rotation | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| Apify | HTTP client wrapper for actor runs | APIFY_API_TOKEN |
| Meta Marketing API | OAuth2 + page posting + ad creation | META_APP_ID, META_APP_SECRET |
| TikTok Content API | OAuth2 + video posting | TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET |
| LinkedIn API | OAuth2 + organic posting | LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET |
| ElevenLabs Conversational AI | Browser voice agent | ELEVENLABS_API_KEY (already have) |
| Open/click tracking | Tracking pixel + redirect endpoint | (built into our API routes) |

### Apify Actors Used
| Actor | Used By | Purpose |
|-------|---------|---------|
| Google Maps Scraper | Lead Scraper | Find PM companies by location |
| LinkedIn People Scraper | Contact Finder | Find decision-makers |
| LinkedIn Search | Lead Scraper | Find PM companies on LinkedIn |
| Website Content Crawler | Company Enricher | Scrape prospect websites |
| Email Finder | Email Finder | Discover email addresses |
| Facebook Pages Scraper | Lead Scraper, Ad Manager | Find PM Facebook pages |
| Facebook Ads Library | Competitor Spy, Ad Manager | Scrape competitor ads |
| TikTok Scraper | Content Creator | Find trending PM TikTok content |
| LinkedIn Post Scraper | Content Creator, Social Warmer | Trending posts + prospect posts |
| LinkedIn Profile Follow/Like/Comment | Social Warmer | Pre-warm engagement actions |
| LinkedIn Message Sender | LinkedIn DM Sender | Send approved DMs |
| Indeed/LinkedIn Jobs Scraper | Trigger Monitor | Detect hiring triggers |
| Google Reviews Monitor | Trigger Monitor | Detect bad review triggers |

### Accounts to Create (One-Time Setup)
| Account | URL | Cost | Setup Time |
|---------|-----|------|-----------|
| Google Workspace (20 accounts) | workspace.google.com | $120/mo | 1 hour |
| Google Cloud Console | console.cloud.google.com | Free | 30 min |
| Apify | apify.com | Free (upgrade to $49 later) | 15 min |
| Meta Business Suite | business.facebook.com | Free | 30 min |
| Meta Developer App | developers.facebook.com | Free | 1 hour + 3-5 day review |
| TikTok Developer | developers.tiktok.com | Free | 1 hour + 5-10 day review |
| LinkedIn Developer | linkedin.com/developers | Free | 30 min |

---

## 7. Database Schema

### New Tables (20)

**Core Outreach**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `outreach_prospects` | Companies found by Lead Scraper | company_name, industry, website, unit_count, icp_score, status |
| `outreach_contacts` | Decision-makers (2-3 per company) | first_name, last_name, title, email, linkedin_url, role_type (ceo/vp/manager) |
| `outreach_campaigns` | Campaign definitions | name, industry_target, geo_target, status, daily_send_limit |
| `outreach_sequences` | Multi-step follow-up definitions | campaign_id, step_number, channel, delay_days |
| `outreach_sends` | Every email/SMS sent | contact_id, channel, subject, body, status (queued/sent/opened/replied/bounced), sending_domain, message_id, thread_id, subject_variant |
| `outreach_replies` | Inbound replies | send_id, body, classification, sentiment_score, buying_signals, objection_type |

**Meetings & Deals**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `outreach_meetings` | Booked meetings | contact_id, calendar_event_id, scheduled_at, status, meeting_link |
| `outreach_proposals` | Auto-generated proposals | contact_id, meeting_id, content (markdown), pricing, estimated_roi |
| `outreach_deals` | Deal tracking pipeline | contact_id, stage (meeting_scheduled/proposal_sent/negotiation/closed_won/closed_lost), value |

**Infrastructure**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `outreach_domains` | 20 Gmail sending accounts | email_address, daily_limit, current_daily_count, warmup_day, reputation_score, oauth_credentials |
| `outreach_agent_runs` | Execution log for every agent | agent_name, status, tokens_used, cost_usd, duration_ms |
| `outreach_agent_status` | Live dashboard status per agent | agent_name, status (idle/running/error), last_run_at, total_cost_usd, config (JSONB) |

**Elite Features**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `outreach_trigger_events` | Detected triggers (jobs, reviews, changes) | prospect_id, trigger_type, detail, score, acted_on |
| `outreach_social_touches` | LinkedIn warmup actions | prospect_id, type (follow/like/comment/connect), date |
| `outreach_linkedin_queue` | DMs waiting for review | contact_id, linkedin_url, message_type, message_text, status (queued/approved/sent) |
| `outreach_intent_signals` | Raw open/click/visit signals | contact_id, signal_type, detail, timestamp |
| `outreach_heat_scores` | Real-time prospect heat score | contact_id, score, last_signal, signal_count |
| `outreach_social_posts` | Content for all platforms | platform, content, image_url, scheduled_date, status (draft/scheduled/posted) |
| `outreach_optimization_log` | What AI Optimizer changed weekly | area, finding, action_taken, expected_impact |
| `outreach_competitor_reports` | Weekly competitor intelligence | competitor_name, ads_data, pricing_changes, review_sentiment |

All tables: UUID primary keys, org_id FK, RLS enabled, created_at/updated_at timestamps.

---

## 8. File Structure

### n8n Workflows (JSON imports)
```
n8n-workflows/
├── 01-campaign-launch.json
├── 02-email-sender.json
├── 03-reply-monitor.json
├── 04-follow-up-sequencer.json
├── 05-trigger-monitor.json
├── 06-social-warmer.json
├── 07-content-creator.json
├── 08-intent-scorer.json
├── 09-ai-optimizer.json
└── 10-deal-closer.json
```

### Backend (Next.js API Routes)
```
app/api/outreach/
├── campaigns/route.ts              # CRUD campaigns
├── campaigns/[id]/route.ts         # Campaign detail
├── campaigns/[id]/launch/route.ts  # Launch (triggers n8n WF1)
├── prospects/route.ts              # List prospects
├── prospects/[id]/route.ts         # Prospect detail
├── contacts/route.ts               # List contacts
├── replies/route.ts                # List replies
├── replies/[id]/route.ts           # Reply detail + respond
├── meetings/route.ts               # List meetings
├── deals/route.ts                  # Deal pipeline
├── deals/[id]/route.ts             # Deal detail + update stage
├── domains/route.ts                # Gmail account management
├── agents/route.ts                 # All 30 agent statuses
├── agents/[name]/route.ts          # Individual agent control
├── linkedin/queue/route.ts         # LinkedIn DM review queue
├── linkedin/approve/route.ts       # Bulk approve DMs
├── social/posts/route.ts           # Content calendar
├── social/post/route.ts            # Create social post
├── analytics/route.ts              # Dashboard analytics
├── analytics/weekly/route.ts       # AI Optimizer report
├── voice/route.ts                  # Voice command endpoint
├── track/open/[id]/route.ts        # Email open tracking pixel
├── track/click/[id]/route.ts       # Link click redirect tracker
├── meta/auth/route.ts              # Meta OAuth
├── meta/callback/route.ts          # Meta OAuth callback
├── gmail/auth/route.ts             # Gmail OAuth (for 20 accounts)
├── gmail/callback/route.ts         # Gmail OAuth callback
└── webhooks/
    ├── n8n/route.ts                # n8n → app webhooks
    └── meeting-completed/route.ts  # Meeting outcome webhook
```

### Library Modules
```
lib/outreach/
├── types.ts                        # All TypeScript interfaces
├── base-agent.ts                   # Abstract BaseAgent class
├── agent-registry.ts               # Maps agent names → modules
├── cost-tracker.ts                 # Cost tracking + alerting (no hard cap — optimize for deals)
├── claude-client.ts                # callHaiku() + callSonnet() with cost tracking
├── gmail-sender.ts                 # Multi-account Gmail API sender with rotation
├── apify-client.ts                 # Apify actor runner wrapper
├── meta-api.ts                     # Meta Business API (FB/IG posting + ads)
├── tiktok-api.ts                   # TikTok Content Posting API
├── linkedin-api.ts                 # LinkedIn posting API
├── tracking.ts                     # Open pixel + click redirect logic
├── voice-command-parser.ts         # Parse voice → structured intent
└── agents/                         # (Agent logic called by n8n via HTTP)
    ├── 01-lead-scraper.ts
    ├── 02-company-enricher.ts
    ├── ... (all 30 agents)
    └── 30-deal-closer.ts
```

### CRM Dashboard Pages
```
app/(app)/outreach/
├── layout.tsx                      # Sub-nav: Dashboard | Campaigns | Prospects | Agents | Analytics | Deals | Content | LinkedIn Queue
├── page.tsx                        # Main dashboard: KPI bar + agent grid + pipeline flow + activity feed
├── campaigns/page.tsx              # Campaign list + create
├── campaigns/[id]/page.tsx         # Campaign detail + launch
├── prospects/page.tsx              # Prospect list with ICP scores
├── agents/page.tsx                 # 30-agent status grid (5x6, color-coded)
├── analytics/page.tsx              # Charts: open rates, reply rates, cost, funnel
├── deals/page.tsx                  # Deal pipeline (kanban board)
├── content/page.tsx                # Content calendar (LinkedIn, TikTok, FB)
├── linkedin/page.tsx               # LinkedIn DM review queue
└── domains/page.tsx                # 20 Gmail account status + warmup progress
```

### Components
```
components/outreach/
├── AgentStatusCard.tsx             # Agent card with status dot
├── AgentGrid.tsx                   # 30-agent grid (5x6)
├── PipelineFlow.tsx                # Animated prospect flow visualization
├── CampaignCard.tsx                # Campaign summary
├── ProspectTable.tsx               # Prospect list with ICP + heat score
├── ReplyInbox.tsx                  # Reply list with classification badges
├── LinkedInQueue.tsx               # DM review + approve/reject
├── SequenceTimeline.tsx            # Visual follow-up step timeline
├── HeatIndicator.tsx               # Heat score gauge (0-100)
├── DeliverabilityChart.tsx         # Bounce/spam rates per domain
├── DealKanban.tsx                  # Deal stage kanban board
├── ContentCalendar.tsx             # Weekly content schedule
├── OutreachKPIBar.tsx              # Top-level KPIs
├── VoiceAgent.tsx                  # Floating mic button + chat overlay
└── SocialPostComposer.tsx          # Create/edit social posts
```

---

## 9. Voice Agent (ElevenLabs Conversational AI)

### Implementation
- Floating microphone button in bottom-right of CRM (always visible on /outreach pages)
- Built with ElevenLabs Conversational AI SDK
- States: idle (gray) → listening (blue pulse) → thinking (yellow) → speaking (green)
- Conversation history stored in `outreach_voice_commands` table
- The voice agent has access to all 30 agents as "tools" — it can trigger any workflow

### Commands It Understands
| Command | What Happens |
|---------|-------------|
| "Find 3000 property managers in Florida and blast them" | Triggers Workflow 1 (Campaign Launch) |
| "What's my update" | Analytics Reporter generates spoken summary |
| "Show me interested replies" | Reads back top interested replies |
| "Post an ad on Facebook about our $10/unit offer" | Triggers content creation + Meta API posting |
| "Pause the Florida campaign" | Orchestrator pauses all sends |
| "How much have I spent this week" | Cost tracker reports AI + email spend |
| "Approve the LinkedIn DMs" | Marks queued messages as approved, Apify sends |
| "Start a Texas campaign, same angle but mention the market" | Launches new campaign with custom copy instructions |
| "Brief me on my next meeting" | Reads prospect intel, proposal summary, objection prep |
| "Meeting with John went well, send the proposal" | Triggers Deal Closer post-meeting flow |

---

## 10. Multi-Channel Sequence (The 21-Day Playbook)

| Day | Channel | Action | Notes |
|-----|---------|--------|-------|
| -14 | LinkedIn | Follow their profile | Social Warmer starts |
| -10 | LinkedIn | Like their post | Building familiarity |
| -7 | LinkedIn | Comment on their post (genuine, no pitch) | They see your name again |
| -5 | LinkedIn | Like another post | Reinforcing presence |
| -3 | LinkedIn | Connection request with note | They now recognize you |
| 0 | Email | Initial cold email (hyper-personalized) | They've seen you 5 times already |
| 1 | Email | VP Ops gets their version (multi-thread) | Surrounding the company |
| 3 | Email | Follow-up #1 (different angle, 80 words) | Shorter, punchier |
| 5 | LinkedIn | DM if connected / 2nd connection attempt if not | Multi-channel pressure |
| 7 | Email | Follow-up #2 (case study) | Social proof |
| 10 | LinkedIn | DM (if connected) | Conversational, question-based |
| 14 | Email | Follow-up #3 (breakup) | Leave door open |
| 17 | SMS | Only for ICP > 80 | Last resort, high-value only |
| 21 | — | Archive as cold | Sequence complete |

**Stops immediately on any reply on any channel.**

---

## 11. Email Copy Strategy

### High-ICP Email (Sonnet writes, ~150 words)
```
{name}, I was looking at {company}'s portfolio — {units} units across 
{locations}. Impressive scale.

{trigger_hook OR pain_point_hook OR general_hook}

We built 5 AI agents that handle exactly this:
- Leasing AI responds to every inquiry in 90 seconds
- Voice AI answers tenant calls 24/7 (sounds human, not a phone tree)
- Maintenance AI triages and dispatches to vendors automatically

A {similar_size}-unit operator in {state} cut response time from 
4 hours to 90 seconds and hit 96% occupancy.

At $10/unit, that's ${monthly_cost}/month to run your operation 
with half the staff hours.

Worth 15 minutes to see how it works for a portfolio like yours?

— Dave, RKV Consulting
```

### Standard Email (Haiku writes, ~100 words)
```
{name}, managing {units}+ units means your team spends hours on 
leasing calls, maintenance dispatch, and owner reports.

Our 5 AI agents handle all of that — 90-second leasing response, 
24/7 phone coverage, automated maintenance dispatch, collections, 
and owner reports. $10/unit, live in 48 hours.

A similar-sized operator went from 81% to 96% occupancy.

Worth a quick look?

— Dave, RKV Consulting
```

### Trigger-Based Emails (Sonnet writes)
- **Hiring trigger**: "Before you commit to a $55k/year salary..."
- **Bad review trigger**: "I came across a review from {date}..."
- **Expansion trigger**: "Congrats on adding {property}..."
- **Competitor price change**: "{competitor} just went to ${price}/unit. We're still at $5."

### Follow-Up Angles
- FU#1: Different pain point, shorter
- FU#2: Case study with specific numbers
- FU#3: Breakup (friendly, leave door open)

### Objection Rebuttals
- "Already use AppFolio" → "We integrate on top. AI handles what they don't."
- "Too expensive" → "One prevented vacancy pays for 6 months."
- "Don't trust AI" → "Fair Housing compliant. 97% resolution. One-click staff takeover."
- "No time to implement" → "We do setup. Live in 48 hours. Zero disruption."
- "Current system works" → "How fast do you respond to leasing inquiries right now?"

---

## 12. Build Phases

| Phase | What | Priority | Dependencies |
|-------|------|----------|-------------|
| 1 | Supabase migration (20 tables) | CRITICAL | None |
| 2 | n8n Workflow 1 (Campaign Launch) + Workflow 2 (Email Sender) | CRITICAL | Phase 1 |
| 3 | Gmail OAuth2 multi-account setup + gmail-sender.ts | CRITICAL | Google Cloud project created |
| 4 | n8n Workflow 3 (Reply Monitor) + Workflow 4 (Follow-Up Sequencer) | CRITICAL | Phase 2 |
| 5 | API routes (tracking pixel, click redirect, webhooks) | HIGH | Phase 2 |
| 6 | n8n Workflow 5 (Trigger Monitor) + Workflow 6 (Social Warmer) | HIGH | Apify account |
| 7 | n8n Workflow 8 (Intent Scorer) | HIGH | Phase 5 (tracking) |
| 8 | n8n Workflow 7 (Content Creator) | MEDIUM | Meta/TikTok/LinkedIn API setup |
| 9 | n8n Workflow 10 (Deal Closer) | MEDIUM | Phase 4 |
| 10 | n8n Workflow 9 (AI Optimizer) | MEDIUM | Needs 1-2 weeks of data first |
| 11 | CRM Dashboard (all pages + components) | MEDIUM | Phase 1-5 |
| 12 | Voice Agent (ElevenLabs) | MEDIUM | All workflows built |
| 13 | Meta API integration (Facebook/Instagram ads) | LOW (needs app review) | Meta Developer account |
| 14 | TikTok API integration | LOW (needs app review) | TikTok Developer account |

**Minimum Viable Launch (Phases 1-5)**: Find prospects → write emails → send → monitor replies → book meetings. Everything else enhances but isn't required to start getting clients.

---

## 13. Success Metrics

### Week 1
- 3,000-5,000 prospects scraped and scored
- 1,000+ emails sent (warmup phase across 20 accounts)
- First replies coming in
- 3-5 meetings booked

### Week 2
- 3,000+ emails sent (full speed)
- 10+ meetings booked
- First proposal sent
- Social warming active

### Month 1
- 12,000+ emails sent
- 30-40 meetings booked
- 3-5 proposals sent
- 1-2 clients signed ($5,000-10,000/mo new revenue)
- AI Optimizer has first 4 weeks of data

### Month 3
- System self-optimized across subject lines, timing, angles
- 8-15% reply rate on cold email (with social warming + triggers)
- 5-10 clients ($25,000-50,000/mo revenue)
- ~$100/mo AI + services, $120/mo Google Workspace = ~$220/mo total
- ROI: 85-170x

---

*This document is the single source of truth for the entire outreach system build. Every workflow, agent, API, database table, and cost is documented here.*
