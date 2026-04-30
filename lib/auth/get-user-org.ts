import { createClient } from '@/lib/supabase/server';

/**
 * Returns the authenticated user, their org_id (resolved from the profiles table),
 * and a Supabase server client bound to the request cookies.
 *
 * If the request is unauthenticated or the user has no profile row, `user` and
 * `orgId` will be null. Routes should always reject the request when `orgId`
 * is null to prevent leaking cross-tenant data.
 */
export async function getUserOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, orgId: null as string | null, role: null as string | null, supabase };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    user,
    orgId: (profile?.org_id ?? null) as string | null,
    role: (profile?.role ?? null) as string | null,
    supabase,
  };
}
