# Web app improvements — how to do them

Concrete steps for the improvements we discussed. Use these as a checklist; do one at a time.

---

## 1. Error state + retry (done)

- **Done:** Dashboard now has `error` state, sets it in `fetchData` catch, and shows `EmptyState` with “Something went wrong”, message, and “Try again” that clears error and calls `fetchData()` again.
- **Apply elsewhere:** In any page that fetches in `useEffect`, add `const [error, setError] = useState<Error | null>(null)`, set it in the catch, and render a small error block (or `EmptyState` with retry) when `error` is set. Clear `error` at the start of the fetch and in the retry handler.

---

## 2. Nav dedupe (done)

- **Done:** “My Portfolio” renamed to “Portfolio”, duplicate “Properties” link removed from Management. One entry to `/properties` under Investments.
- **If you want both:** Keep “Portfolio” for the list view and add a distinct route for “Property details” or “Add property” instead of two links to the same URL.

---

## 3. Extract dashboard data into a hook

**Goal:** Shrink the dashboard page and make data loading testable.

**Steps:**

1. Create `hooks/useDashboardData.ts`.
2. Move into the hook:
   - All `useState` for: `properties`, `deals`, `tenants`, `rentPayments`, `maintenanceRequests`, `activities`, `alerts`, `transactions`, `portfolioSnapshots`, `loading`, `error`.
   - The whole `fetchData` callback (and its `useEffect`).
   - The snapshot `useEffect` (POST/GET portfolio snapshot).
3. Return from the hook:  
   `{ loading, error, fetchData, properties, deals, tenants, rentPayments, maintenanceRequests, activities, alerts, transactions, portfolioSnapshots }`.
4. In the page, call `const dashboard = useDashboardData()` and use `dashboard.loading`, `dashboard.error`, etc. Keep in the page: calculated metrics, chart data, `upcomingEvents`, JSX.

**Optional next step:** Move chart data (e.g. `cashFlowChartData`, `sparklinePortfolio`) into the hook or a small `useDashboardCharts(transactions, portfolioSnapshots, …)` so the page is mostly layout and composition.

---

## 4. Supabase client singleton (client-side)

**Goal:** Avoid creating a new Supabase client on every render in pages that do `const supabase = createClient()` inside the component.

**Option A (minimal):** In `lib/supabase/client.ts`, export a singleton:

```ts
let client: ReturnType<typeof createBrowserClient> | null = null;
export const createClient = () => {
  if (!client) client = createBrowserClient(url, key);
  return client;
};
```

Keep the existing env checks and mock proxy; the singleton is only for the real client path.

**Option B:** Use React context: e.g. `SupabaseProvider` that creates the client once and provides it. Then `useSupabase()` in components. More refactor, better if you have many client components that need it.

---

## 5. API auth: support Bearer token

**Goal:** Let the iOS app (or other clients) call your Next.js API with `Authorization: Bearer <access_token>` when there’s no cookie.

**Steps:**

1. Add a small helper, e.g. `lib/supabase/auth-server.ts`:
   - Accept `Request` (or `headers`).
   - Try cookie-based session first (existing server `createClient()` + `getUser()`).
   - If no user, read `Authorization: Bearer <token>`, verify with Supabase `auth.getUser(token)` (or create a client with that token and get user). Return user and optionally the Supabase client.
2. In each API route that needs auth, use this helper instead of only cookie-based `getUser()`. Then both browser (cookie) and mobile (Bearer) work.

---

## 6. Loading UX consistency

**Goal:** Same pattern everywhere: skeleton for lists, spinner for full-page, or Suspense boundaries.

**Steps:**

1. Pick one pattern per context, e.g.:
   - Full-page load: existing `loading.tsx` (Suspense) or a single spinner in the page.
   - Tables/lists: `<Skeleton className="h-10 w-full" />` repeated 5–10 times.
   - Metric cards: card-shaped skeletons (already used in dashboard for PortfolioChart).
2. Add a short note in your UI docs or a `components/loading/` readme: “Lists use X, full page uses Y.”
3. When adding new pages, reuse that pattern instead of a new one.

---

## 7. Types for API / Supabase

**Goal:** Fewer `as` casts and clearer contracts.

**Steps:**

1. Generate Supabase types: `npx supabase gen types typescript --project-id <id> > lib/database.types.ts` (or similar). Use `Database['public']['Tables']['properties']['Row']` etc. in app code.
2. For API responses, define small types or use the same Supabase types: e.g. `type DashboardResponse = { properties: Property[]; ... }`.
3. In routes, type the return: `NextResponse.json<DashboardResponse>(data)`. In fetchers, use `res.json() as Promise<DashboardResponse>` or a typed fetch wrapper until you have a generated client.

---

## 8. Break up other large pages

**Goal:** Easier to change and review (e.g. `properties/[id]/page.tsx`, `maintenance/page.tsx`).

**Pattern:**

1. Identify 3–5 sections (e.g. header, financials, tenants, documents, activity).
2. Extract each into a component in the same folder: `PropertyHeader.tsx`, `PropertyFinancials.tsx`, etc. Pass only the data each needs (e.g. `property`, `transactions`).
3. Optionally move the section’s data fetching into a hook: `useProperty(id)` that returns `{ property, loading, error }`, and have the page or a parent component fetch once and pass down.
4. Leave the page as: one fetch (or one hook), composition of sections, and URL/state handling.

Start with the page that hurts the most (e.g. property detail); then apply the same pattern to the next largest.

---

## Order of operations

1. ✅ Error + retry (dashboard done; replicate on other key pages).
2. ✅ Nav dedupe.
3. Extract `useDashboardData` (and optionally chart helpers).
4. Supabase client singleton.
5. API Bearer auth (when you need mobile to call web API).
6. Loading pattern doc + apply to new pages.
7. Supabase + API types.
8. Split large pages one by one.
