'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { MapPin, Plus } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  properties_count: number;
  units_count: number;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const { data } = await supabase
        .from('locations')
        .select('id, name, city, state, properties_count, units_count')
        .eq('org_id', profile.org_id)
        .order('name');

      setLocations((data as Location[]) || []);
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-48" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Locations</h1>
          <p className="text-sm text-text-secondary">Manage multiple office locations for your portfolio.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90">
          <Plus size={16} />
          Add Location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <MapPin size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No locations yet</h3>
          <p className="text-sm text-text-secondary">Add locations to organize properties by office or region. Useful for franchise operators.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <div key={loc.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <MapPin size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{loc.name}</p>
                  <p className="text-xs text-text-muted">{[loc.city, loc.state].filter(Boolean).join(', ') || 'No address'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span>{loc.properties_count} properties</span>
                <span>{loc.units_count} units</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
