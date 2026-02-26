import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy({} as Record<string, unknown>, handler) as any
  }

  return createBrowserClient(url, key)
}
