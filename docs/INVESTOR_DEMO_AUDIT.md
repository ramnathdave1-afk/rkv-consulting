# Investor Demo — What Works, What Doesn’t

*Audit from the perspective of an investor walking through the product. Based on code paths, data sources, and API wiring. No opinions—facts only.*

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
| **Metric cards (4)** | ✅ | Same properties + derived | Values real; **sparklines and “vs last quarter” are mock** (TODO: historical snapshots). |
| **Live Market Pulse** | ✅* | `/api/market/pulse` → FRED (10Y, 30Y mtg, permits, existing sales) | *Requires `FRED_API_KEY`. Without it, strip shows “Live” but no numbers. |
| **Portfolio chart** | ⚠️ | Properties real; **12‑month trend is mock** (random variance on current cash flow). |
| **Deals table / score** | ✅ | Supabase `deals` | Real. |
| **Activity feed** | ✅ | Built from `rent_payments`, maintenance, **agent_logs** | Real. |
| **AI Market Brief** | ✅ | POST `/api/ai/market-brief` (Claude) + portfolio summary | Real; plan-gated. |
| **Alerts** | ✅ | Derived from tenants, rent, maintenance | Real. |
| **Empty state** | ✅ | No properties → CTA to add first property | Correct. |

**Summary:** Dashboard is usable and real for portfolio and activity. Trend/chart and comparison numbers are not yet backed by historical data.

---

## 3. PROPERTIES

| Feature | Works? | Notes |
|---------|--------|-------|
| **List / add / edit / delete** | ✅ | Supabase `properties`; forms and validation in place. |
| **Property detail** | ✅ | Single property load, notes update, delete. |
| **Bulk add (paste)** | ✅ | Parse paste → insert rows. |
| **Cash flow chart (12 months)** | ⚠️ | **Mock trend** (comment: “12 months, mock trend”). |

---

## 4. DEALS & PIPELINE

| Feature | Works? | Data source | Notes |
|---------|--------|-------------|--------|
| **Deals page (list, add, score)** | ✅ | Supabase `deals` | CRUD + deal score API. |
| **Pipeline (Kanban-style)** | ✅ | Supabase `deals` (status: lead → closed/dead) | Real; drag-and-drop updates `deals`. |
| **Deal Feed** | ✅* | `feed_deals` + `wholesale_submissions`; refresh calls Zillow + Attom | *Requires plan with `dealFeed` + **RAPIDAPI_KEY**, **ATTOM_API_KEY**. Without keys, feed is empty or wholesale-only. |
| **Submit deal (wholesale)** | ✅ | POST to `wholesale_submissions`; approval can insert into `feed_deals` | Real. |
| **Market averages on Deals** | ⚠️ | **Placeholder benchmarks** (comment in code). |

---

## 5. CRM (Sidebar → CRM)

| Feature | Works? | Data source | Notes |
|---------|--------|-------------|-------|
| **Contacts tab** | ⚠️ Mock | `lib/crm-data` (static) + `lib/crm-store` (Zustand) | **Not Supabase.** Add/edit/detail only affect in-memory state; refresh loses changes. |
| **Deals tab (Kanban + list)** | ⚠️ Mock | Same; `getCRMDeals()`, `moveDealToStage` in store | Same as above. |
| **Activity feed tab** | ⚠️ Mock | `getCRMActivities()` from crm-data | Static list. |

**Important:** The **Contacts** page under a different nav path (`/contacts`) uses **Supabase** (`contacts`, `contact_activities`, `deal_contacts`). So there are two contact/deal experiences: **CRM = demo/mock**; **Contacts = real DB**.

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

**Summary:** Feature set is wired for production. All “live” and “daily” data depend on env keys (FRED, Rentcast, BLS).

---

## 7. TENANTS & SCREENING

| Feature | Works? | Notes |
|---------|--------|-------|
| **Tenants list** | ✅ | Supabase `tenants` + `properties`. |
| **Tenant detail** | ✅ | Real tenant + property; **extended tenant data is mock** (comment in code). |
| **Rent payments** | ✅ | Supabase `rent_payments`. |
| **Tenant screening (apply by token)** | ✅ | `screening_applications`; token-based apply flow. |
| **Tenant portal (by property)** | ✅ | `tenant/[propertyId]`; maintenance message flow. |

---

## 8. VACANCIES

| Feature | Works? | Notes |
|---------|--------|-------|
| **Properties list** | ✅ | Supabase `properties`. |
| **Inquiries / showings** | ❌ Mock | Generated from `PROSPECT_*`, `INQUIRY_*` arrays; not from DB. |
| **AI listing generator** | ❌ Mock | `generateListing()` is local function; no AI API call. |

---

## 9. MAINTENANCE

| Feature | Works? | Notes |
|---------|--------|-------|
| **Requests list / create / update** | ✅ | Supabase (maintenance requests). |
| **Kanban (by status)** | ✅ | Real. |
| **Suggested contractors** | ⚠️ | **Placeholder data** (comment in code). |

---

## 10. ACCOUNTING

| Feature | Works? | Notes |
|---------|--------|-------|
| **Transactions** | ✅ | Supabase `transactions`; income/expense. |
| **YTD P&L, charts** | ✅ | From transactions. |
| **Prior year comparison** | ⚠️ | **Mock** (e.g. 88%/92% of current YTD). |
| **Depreciation** | ⚠️ | **Placeholder** (comment: “Depreciation data (placeholder)”). |
| **1031 / Schedule E** | ✅ | UI and forms present; storage path not fully traced here. |

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
| **Settings** | ✅ | Profile/preferences; typical form + Supabase. |
| **Financing hub** | ✅ | Properties from Supabase; UI for financing views. |

---

## 13. DEPENDENCIES (ENV) — WHAT MUST BE SET

| Env var | Used for | If missing |
|---------|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth, all DB | App broken. |
| `FRED_API_KEY` | Live pulse, rates, economic indicators | Pulse/rates empty or fallback. |
| `RENTCAST_API_KEY` | Market Intelligence per-market data | Map/heat map no live data. |
| `BLS_API_KEY` | BLS labor/city data | BLS indicators fail. |
| `ANTHROPIC_API_KEY` | ATLAS, market brief, other AI | AI routes fail. |
| `RAPIDAPI_KEY` (Zillow), `ATTOM_API_KEY` | Deal Feed refresh | Feed empty or wholesale-only. |
| Stripe (webhook, checkout) | Billing, subscriptions | Plans/paywall may not reflect real billing. |

---

## 14. SMOOTH VS NOT SMOOTH (SYSTEMS)

**Runs smooth (real DB + APIs, no mock/placeholder in critical path):**

- Auth and session.
- Properties CRUD and list.
- Deals and Pipeline (Supabase `deals`).
- Contacts (the Supabase-backed Contacts page, not CRM).
- Tenant list, screening, apply flow, tenant portal.
- Maintenance requests.
- Documents and calendar.
- Market Intelligence *when FRED/Rentcast/BLS keys are set*.
- Live Market Pulse *when FRED_API_KEY is set*.
- ATLAS (AI Assistant) when plan + Anthropic key set.
- Dashboard metrics and activity (excluding sparklines/trend).

**Runs with gaps or mock/placeholder:**

- **Dashboard:** Sparklines and “vs last quarter” = mock; no historical series.
- **CRM (sidebar CRM):** All data mock; not persisted.
- **Vacancies:** Inquiries and AI listing = mock.
- **Accounting:** Prior-year comparison = mock; depreciation = placeholder.
- **Maintenance:** Suggested contractors = placeholder.
- **Deal Feed:** Depends on Zillow/Attom keys and plan.
- **Deals page:** Market averages = placeholder.

---

## 15. ONE-LINE SUMMARY

**Works:** Auth, properties, Supabase-backed deals/pipeline/contacts, tenants, screening, maintenance, documents, calendar, settings, financing hub, and (with keys) market intelligence, live pulse, and ATLAS.  

**Doesn’t (or mock/placeholder):** CRM (in-memory only), dashboard/chart trends, vacancies inquiries/AI listing, accounting prior-year and depreciation, maintenance contractor suggestions, and deal-feed external ingestion without API keys.
