import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

// Singleton: reuse the same client instance to prevent unstable references
// that cause infinite useEffect re-runs across all dashboard pages.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedClient: any = null

export const createClient = () => {
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a mock client during build/prerender when env vars are missing
    const noop = () => ({ data: null, error: null, count: null })
    const chainable: Record<string, unknown> = {}
    const handler: ProxyHandler<Record<string, unknown>> = {
      get: (_target, prop) => {
        if (prop === 'auth') {
          return {
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
            signUp: noop,
            signInWithPassword: noop,
            signOut: noop,
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          }
        }
        if (prop === 'from') {
          return () => new Proxy(chainable, handler)
        }
        if (prop === 'storage') {
          return { from: () => new Proxy(chainable, handler) }
        }
        if (typeof prop === 'string') {
          return (..._args: unknown[]) => new Proxy(chainable, handler)
        }
        return undefined
      },
    }
    // Don't cache the mock — it should be recreated if env vars appear later
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy({} as Record<string, unknown>, handler) as any
  }

  cachedClient = createBrowserClient(url, key)
  return cachedClient
}
