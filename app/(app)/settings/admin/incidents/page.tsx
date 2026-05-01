import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { IncidentsManager } from './IncidentsManager';
import { SettingsShell } from '@/components/settings/SettingsShell';

export const dynamic = 'force-dynamic';

interface Incident {
  id: string;
  title: string;
  status: string;
  severity: string;
  affected_components: string[];
  created_at: string;
  resolved_at: string | null;
  updates: Array<{ timestamp: string; status: string; message: string }>;
}

export default async function AdminIncidentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const admin = createAdminClient();
  const { data: incidents } = await admin
    .from('status_incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <SettingsShell
      title="Status Incidents"
      subtitle="Manage incidents shown on the public status page."
    >
      <IncidentsManager initialIncidents={(incidents as Incident[]) ?? []} />
    </SettingsShell>
  );
}
