import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/types';

export async function requireRole(allowedRoles: UserRole[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
    redirect('/dashboard');
  }

  return { user, profile };
}
