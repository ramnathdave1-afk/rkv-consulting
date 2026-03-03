# RKV Consulting — iOS

iOS version of the RKV platform. Same design system and **motion system** as the web app.

## Motion (mirrors `lib/motion.ts`)

- **`lib/motion.ts`** — Easing, durations, variants, `useReducedMotion()`, `useEntranceFromBelow()`.
- Respects **Reduce Motion** (Accessibility).
- Stagger delays: `staggerDelay` (60ms), same as web.

## Theme

- **`theme.ts`** — Colors match web `globals.css`: `#0A0A0F`, `#00B4D8`, etc.

## Same backend as web — links to web

- **Auth:** Same Supabase project. Sign in with the same email/password as the web app; session is stored in SecureStore.
- **Data:** Dashboard, Portfolio, and Deals load from Supabase (properties, deals) so data is identical to the web app.
- **More tab:** Each row opens the web app in the browser (Market Intelligence, Tenants, CRM, Accounting, etc.). Set `EXPO_PUBLIC_WEB_APP_URL` to your deployed web URL so “Open in browser” and “Open full site” point to the right place.

## Env

Create `.env` (or set in app.config.js):

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (same as web).
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (same as web).
- `EXPO_PUBLIC_WEB_APP_URL` — Web app base URL (e.g. `https://yourapp.vercel.app`) for the More tab links.

## Run

```bash
cd apps/rkv-mobile
npm install
npx expo start
# Then press i for iOS simulator
```

## Assets

Add `apps/rkv-mobile/assets/icon.png` (1024×1024) and `adaptive-icon.png` for the app icon, or use `npx expo prebuild` and replace in `ios/`.
