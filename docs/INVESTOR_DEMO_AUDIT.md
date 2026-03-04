# Investor Demo — What Works, What Doesn't

*Audit from the perspective of an investor walking through the product. Based on code paths, data sources, and API wiring. No opinions—facts only.*

*Last updated: March 2026*

---

## 1. AUTH & CORE INFRASTRUCTURE

| Area | Status | Notes |
|------|--------|------|
| **Sign up / Login** | ✅ Works | Supabase Auth (email + OAuth). `auth/callback` exchanges code for session. |
| **Session / cookies** | ✅ Works | Server `createClient()` reads cookies; API routes get user via `getUser()`. |
| **Protected routes** | ✅ Works | Dashboard and API routes gate on `user`; 401 when unauthenticated. |
| **Subscription / paywall** | ✅ Works | `subscriptions` table + `PLANS` in `lib/stripe/plans`; features gated (e.g. Deal Feed, AI Assistant). |

---

## 2. DASHBOARD

| Feature | Works? | Data source | Gaps |
|---------|--------|-------------|------|
| **Portfolio metrics** | ✅ | Supabase: `properties`, aggregated (value, equity, cash flow, ROI) | Real. |
| **Metric cards (4)** | ✅ | Same properties + derived | Values real; sparklines populate from `portfolio_snapshots` over time. Change% computed from snapshots when >=2 exist. |
| **Live Market Pulse** | ✅* | `/api/market/pulse` → FRED (10Y, 30Y mtg, permits, existing sales) | *Requires `FRED_API_KEY`. Without it, strip shows "Live" but no numbers. |
| **Portfolio chart** | ✅ | Properties real; cash flow chart shows zeros when no transactions (no fake data). |
| **Deals table / score** | ✅ | Supabase `deals` | Real. |
| **Activity feed** | ✅ | Built from `rent_payments`, maintenance, **agent_logs** | Real. |
| **AI Market Brief** | ✅ | POST `/api/ai/market-brief` (Claude) + portfolio summary | Real; plan-gated. |
| **Alerts** | ✅ | Derived from tenants, rent, maintenance | Real. |
| **Empty state** | ✅ | No properties → CTA to add first property | Correct. |

**Summary:** Dashboard is fully real. Sparklines and change% self-populate as `portfolio_snapshots` accumulate (daily on page visit).

---

## 3. PROPERTIES

| Feature | Works? | Notes |
|---------|--------|-------|
| **List / add / edit / delete** | ✅ | Supabase `properties`; forms and validation in place. |
| **Property detail** | ✅ | Single property load, notes update, delete. |
| **Bulk add (paste)** | ✅ | Parse paste → insert rows. |
| **Cash flow chart (12 months)** | ✅ | Shows real transaction data or zeros. |

---

## 4. DEALS & PIPELINE

| Feature | Works? | Data source | Notes |
|---------|--------|-------------|--------|
| **Deals page (list, add, score)** | ✅ | Supabase `deals` | CRUD + deal score API. |
| **Pipeline (Kanban-style)** | ✅ | Supabase `deals` (status: lead → closed/dead) | Real; drag-and-drop updates `deals`. |
| **Deal Feed** | ✅* | `feed_deals` + `wholesale_submissions`; refresh calls Zillow + Attom | *Requires plan with `dealFeed` + **RAPIDAPI_KEY**, **ATTOM_API_KEY**. Without keys, feed is empty or wholesale-only. |
| **Submit deal (wholesale)** | ✅ | POST to `wholesale_submissions`; approval can insert into `feed_deals` | Real. |
| **Market benchmarks on Deals** | ✅ | Fetched from `/api/market/live` (Rentcast + FRED) per deal zip/city | Falls back to conservative defaults if API unavailable. |
| **Deal usage limits** | ✅ | Read from subscription tier (Basic: 5, Pro: 50, Elite: unlimited) | Real. |

---

## 5. CRM (Sidebar → CRM)

| Feature | Works? | Data source | Notes |
|---------|--------|-------------|-------|
| **Contacts tab** | ✅ | `/api/crm/contacts` → Supabase `contacts` + `deal_contacts` join | Real. dealCount and totalDealVolume computed from DB. |
| **Deals tab (Kanban + list)** | ✅ | `/api/crm/deals` → Supabase `deals` + `deal_contacts` join | Real. ATLAS scores from `analysis_data`, daysInStage from `stage_entered_at`, dealType derived from deal data. |
| **Activity feed tab** | ✅ | `/api/crm/activities` → Supabase `contact_activities` + joins | Real. POST endpoint for logging calls/notes. |

**Note:** Both CRM and Contacts pages now read from the same Supabase tables.

---

## 6. MARKET INTELLIGENCE

| Feature | Works? | Data source | Notes |
|---------|--------|-------------|-------|
| **Watched markets** | ✅ | Supabase `watched_markets` | Load/save real. |
| **Live Market Pulse (full card)** | ✅* | Same as dashboard; FRED | *`FRED_API_KEY` required for numbers. |
| **Interest rate tracker** | ✅* | `fetchFREDData` (30Y, 15Y, Fed funds) | *FRED key. |
| **Economic indicators** | ✅* | FRED + BLS (unemployment, permits, etc.) | *`FRED_API_KEY`; BLS needs `BLS_API_KEY` for some. |
| **Map + heat map** | ✅ | `MAJOR_METROS` + `liveDataMap` | Real when Rentcast returns data. |
| **Rentcast (per-market)** | ✅* | `fetchRentcastMarketData(city, state, zip)` | *`RENTCAST_API_KEY` required. |
| **BLS (city-level)** | ✅* | `/api/market/bls` → BLS API | *`BLS_API_KEY`. |
| **Alerts (opportunity)** | ✅ | Derived from `liveDataMap` | Logic real; depends on Rentcast data. |
| **Market comparison** | ✅ | From same market data | Real when data loaded. |

**Summary:** Feature set is wired for production. All "live" and "daily" data depend on env keys (FRED, Rentcast, BLS).

---

## 7. TENANTS & SCREENING

| Feature | Works? | Notes |
|---------|--------|-------|
| **Tenants list** | ✅ | Supabase `tenants` + `properties`. |
| **Tenant detail** | ✅ | Real tenant + property; extended data (emergency contact, vehicle, payment method, etc.) from DB columns. |
| **Rent payments** | ✅ | Supabase `rent_payments`. |
| **Tenant screening (apply by token)** | ✅ | `screening_applications`; token-based apply flow. |
| **Tenant portal (by property)** | ✅ | `tenant/[propertyId]`; maintenance message flow. |

---

## 8. VACANCIES

| Feature | Works? | Notes |
|---------|--------|-------|
| **Properties list** | ✅ | Supabase `properties`. |
| **Inquiries** | ✅ | `/api/vacancy/inquiries` → Supabase `vacancy_inquiries`. Empty state when no inquiries. |
| **Showings** | ✅ | `/api/vacancy/showings` → Supabase `showing_appointments` (GET + POST). |
| **Listing status** | ✅ | `/api/vacancy/listings` → Supabase `vacancy_listings`. Real per-property status. |
| **AI listing generator** | ✅ | POST `/api/ai/listing` (Claude). Toast error on failure instead of silent fallback. |

---

## 9. MAINTENANCE

| Feature | Works? | Notes |
|---------|--------|-------|
| **Requests list / create / update** | ✅ | Supabase (maintenance requests). |
| **Kanban (by status)** | ✅ | Real. |
| **Suggested contractors** | ✅ | Live matching API (`/api/contractors/match`). |

---

## 10. ACCOUNTING

| Feature | Works? | Notes |
|---------|--------|-------|
| **Transactions** | ✅ | Supabase `transactions`; income/expense. |
| **YTD P&L, charts** | ✅ | From transactions. |
| **Prior year comparison** | ✅ | Real — reads from transactions table, filters by prior year dates. Shows "No prior year data" when none exist. |
| **Depreciation** | ✅ | Uses `land_value` column from properties (with 20% fallback marked as "est."). |
| **Tax rate** | ✅ | Reads `effective_tax_rate` from user profile (configurable in Settings). Default 30%. |
| **1031 Exchange Tracker** | ✅ | Full CRUD via `/api/exchanges`. Countdown timers, color-coded deadlines, modal for creating exchanges. |
| **Schedule E** | ✅ | UI and forms present, real data from transactions. |

---

## 11. AI ASSISTANT (ATLAS)

| Feature | Works? | Notes |
|---------|--------|-------|
| **Chat** | ✅ | POST `/api/ai/assistant`; Claude stream; plan-gated; `ai_usage` tracked. |
| **Data limits disclaimer** | ✅ | System prompt states no real-time feeds, knowledge cutoff; directs users to external sources. |
| **Portfolio context** | ✅ | Can pull properties for context. |

---

## 12. DOCUMENTS, CALENDAR, SETTINGS, FINANCING HUB

| Area | Works? | Notes |
|------|--------|-------|
| **Documents** | ✅ | Supabase `documents` + storage; link to properties/tenants/deals. |
| **Calendar** | ✅ | Events from `properties` + `deals`; Supabase. |
| **Settings** | ✅ | Profile/preferences + tax rate input; typical form + Supabase. |
| **Financing hub** | ✅ | Properties from Supabase; UI for financing views. |

---

## 13. DEPENDENCIES (ENV) — WHAT MUST BE SET

| Env var | Used for | If missing |
|---------|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth, all DB | App broken. |
| `FRED_API_KEY` | Live pulse, rates, economic indicators | Pulse/rates empty or fallback. |
| `RENTCAST_API_KEY` | Market Intelligence per-market data, deal benchmarks | Map/heat map no live data; deal benchmarks use defaults. |
| `BLS_API_KEY` | BLS labor/city data | BLS indicators fail. |
| `ANTHROPIC_API_KEY` | ATLAS, market brief, other AI | AI routes fail. |
| `RAPIDAPI_KEY` (Zillow), `ATTOM_API_KEY` | Deal Feed refresh | Feed empty or wholesale-only. |
| Stripe (webhook, checkout) | Billing, subscriptions | Plans/paywall may not reflect real billing. |

---

## 14. SMOOTH VS NOT SMOOTH (SYSTEMS)

**Runs smooth (real DB + APIs, no mock/placeholder in critical path):**

- Auth and session.
- Properties CRUD and list.
- Deals, Pipeline, and Deal Analyzer (Supabase `deals`, market benchmarks from API).
- CRM — contacts, deals, activities (all Supabase-backed).
- Contacts page (Supabase-backed).
- Tenant list, detail (with extended data), screening, apply flow, tenant portal.
- Vacancies — inquiries, showings, listings, AI listing generator (all DB + API).
- Maintenance requests and contractor matching.
- Accounting — transactions, P&L, prior-year comparison, depreciation, tax estimates, 1031 tracker, Schedule E.
- Documents and calendar.
- Settings (including tax rate).
- Market Intelligence *when FRED/Rentcast/BLS keys are set*.
- Live Market Pulse *when FRED_API_KEY is set*.
- ATLAS (AI Assistant) when plan + Anthropic key set.
- Dashboard metrics, activity, and change%.

**Minor gaps (self-resolving or API-key dependent):**

- **Dashboard sparklines:** Populate as `portfolio_snapshots` accumulate (~30 days of visits).
- **Deal Feed:** Depends on Zillow/Attom keys and plan.

---

## 15. ONE-LINE SUMMARY

**Works:** All core features — auth, properties, deals/pipeline, CRM, tenants, vacancies, maintenance, accounting (with tax rates, depreciation, 1031 tracker), documents, calendar, settings, financing hub, and (with API keys) market intelligence, live pulse, deal feed, and ATLAS.

**Self-resolving:** Dashboard sparklines (need ~30 days of snapshots to populate).
