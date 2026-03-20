'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { CalendarDays, Plus, Clock, MapPin } from 'lucide-react';

interface ShowingRow {
  id: string;
  prospect_name: string | null;
  prospect_phone: string | null;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  source: string;
  follow_up_status: string;
  properties: { name: string } | null;
  units: { unit_number: string } | null;
}

const statusColors: Record<string, string> = {
  requested: 'bg-blue-500/10 text-blue-500',
  scheduled: 'bg-yellow-500/10 text-yellow-500',
  confirmed: 'bg-green-500/10 text-green-500',
  completed: 'bg-gray-500/10 text-gray-400',
  no_show: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-400/10 text-gray-400',
};

export default function ShowingsPage() {
  const [showings, setShowings] = useState<ShowingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const { data } = await supabase
        .from('showings')
        .select('id, prospect_name, prospect_phone, status, scheduled_at, duration_minutes, source, follow_up_status, properties(name), units(unit_number)')
        .eq('org_id', profile.org_id)
        .order('scheduled_at', { ascending: true });

      setShowings((data as ShowingRow[]) || []);
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const upcoming = showings.filter((s) => ['requested', 'scheduled', 'confirmed'].includes(s.status));
  const past = showings.filter((s) => ['completed', 'no_show', 'cancelled'].includes(s.status));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Showings</h1>
          <p className="text-sm text-text-secondary">{upcoming.length} upcoming, {past.length} past</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus size={16} />
          Schedule Showing
        </button>
      </div>

      {showings.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <CalendarDays size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No showings yet</h3>
          <p className="text-sm text-text-secondary">Showings will appear here when prospects schedule tours via SMS or when you create them manually.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map((s) => (
                  <ShowingCard key={s.id} showing={s} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Past</h2>
              <div className="space-y-2">
                {past.map((s) => (
                  <ShowingCard key={s.id} showing={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShowingCard({ showing }: { showing: ShowingRow }) {
  const date = new Date(showing.scheduled_at);

  return (
    <div className="glass-card p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[48px]">
          <p className="text-lg font-bold text-text-primary">{date.getDate()}</p>
          <p className="text-[10px] text-text-muted uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{showing.prospect_name || showing.prospect_phone || 'Unknown prospect'}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <MapPin size={10} />
              {showing.properties?.name || '—'}{showing.units ? ` / ${showing.units.unit_number}` : ''}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <Clock size={10} />
              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ({showing.duration_minutes}min)
            </span>
          </div>
        </div>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[showing.status] || ''}`}>
        {showing.status.replace('_', ' ')}
      </span>
    </div>
  );
}
