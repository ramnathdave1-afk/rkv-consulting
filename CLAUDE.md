# RKV Consulting - AI-Powered Real Estate Investment Platform

## What This Is
RKV Consulting is an AI-powered **real estate investment operating system** for serious investors. It provides deal analysis, property management, tenant screening, market intelligence, portfolio optimization, and an AI assistant (ATLAS) powered by Claude.

## Tech Stack
- **Frontend:** Next.js 14 (App Router), React 18, TailwindCSS, Framer Motion, Zustand
- **Backend:** Next.js API routes, Supabase (PostgreSQL + Auth)
- **Payments:** Stripe (Basic/Pro/Elite tiers)
- **AI:** Anthropic Claude API (ATLAS assistant, market briefs, listing generation)
- **Maps:** React Leaflet, React Simple Maps, D3-geo
- **Charts:** Recharts
- **PDF/Export:** jsPDF, html2canvas, PapaParse (CSV)
- **SMS/Voice:** Twilio
- **Email:** Resend
- **Mobile:** React Native (Expo 52) in `apps/rkv-mobile/`

## Key Directories
```
app/(dashboard)/     # Protected dashboard pages (properties, deals, tenants, etc.)
app/(auth)/          # Login, signup, password reset
app/(marketing)/     # Public marketing pages
app/api/             # API routes (ai, stripe, market, properties, tenants, etc.)
components/          # Reusable React components
hooks/               # Custom React hooks
lib/                 # Utilities, API wrappers, Supabase clients, AI functions
types/index.ts       # All TypeScript types (Supabase schema + app types)
middleware.ts        # Auth middleware (JWT + httpOnly cookies)
apps/rkv-mobile/     # React Native iOS app (Expo Router)
docs/                # WEB_IMPROVEMENTS.md, INVESTOR_DEMO_AUDIT.md
```

## Core Features
- **Dashboard:** Portfolio metrics, sparklines, live market pulse (FRED), AI market brief, alerts
- **Properties:** CRUD, bulk import, cash flow charts, documents, calendar
- **Deals & Pipeline:** Deal scoring, Kanban pipeline, deal feed (Zillow/ATTOM), deal analyzer
- **CRM:** Contacts, deal tracking, activity feed (calls, notes, emails)
- **Tenants:** Screening, rent payments, tenant portal, maintenance requests
- **Market Intelligence:** Watched markets, interest rates, economic indicators, heatmap, comparisons
- **Vacancies:** Listings, inquiries, showings, AI listing generator
- **Maintenance:** Request tracking, Kanban board, contractor matching
- **Accounting:** Transactions, P&L, depreciation, Schedule E, 1031 exchange tracker
- **AI Assistant (ATLAS):** Streaming Claude chat with portfolio context
- **Subscriptions:** Stripe billing (Basic: 5 deals, Pro: 50, Elite: unlimited)

## Architecture Patterns
- **Auth:** Supabase JWT in httpOnly cookies, validated by Next.js middleware
- **Data Fetching:** React Query (client) + Next.js API routes (server)
- **Styling:** TailwindCSS with dark mode by default
- **State:** Zustand for CRM, React hooks elsewhere
- **API Keys:** Server-side only in `lib/apis/`

## Database Tables (Supabase)
profiles, properties, deals, tenants, rent_payments, maintenance_requests, transactions, portfolio_snapshots, contacts, contact_activities, documents, subscriptions, tenant_screening, vacancy_listings, showing_appointments, vacancy_inquiries, ai_usage, wholesale_submissions, exchanges, watched_markets

## Required Environment Variables
See `.env.example` for full list. Key ones:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY` (ATLAS AI)
- `TWILIO_*` (SMS/voice), `RESEND_*` (email)
- Optional: `FRED_API_KEY`, `RENTCAST_API_KEY`, `BLS_API_KEY`, `RAPIDAPI_KEY`, `ATTOM_API_KEY`

## Commands
```bash
npm run dev    # Start development server
npm run build  # Production build
npm run start  # Start production server
npm run lint   # Run ESLint
```

## Development Notes
- All features are production-ready and Supabase-backed (no mock data)
- Dashboard sparklines auto-populate over ~30 days via portfolio_snapshots
- Deal usage limits enforced by subscription tier
- Feature gating via subscription plan checks
- See `docs/WEB_IMPROVEMENTS.md` for refactoring checklist
