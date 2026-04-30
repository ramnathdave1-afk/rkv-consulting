'use client';

import React from 'react';
import { useLocations } from '@/lib/hooks/useLocations';
import { MapPin } from 'lucide-react';

interface Props {
  /** Override the global location selection (e.g. on a single page). When
   * omitted, the component reads/writes the global selection. */
  value?: string | null;
  onChange?: (id: string | null) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Dropdown showing "All Locations" + every active location for the current org.
 * Uses the global useLocations() hook by default so all filters across the app
 * stay in sync.
 */
export function LocationFilter({ value, onChange, className, size = 'md' }: Props) {
  const { locations, activeLocationId, setActiveLocationId } = useLocations();

  const current = value !== undefined ? value : activeLocationId;
  const handleChange = (id: string | null) => {
    if (onChange) onChange(id);
    else setActiveLocationId(id);
  };

  const visible = locations.filter((l) => l.is_active !== false);

  return (
    <div className={`relative ${className || ''}`}>
      <span
        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <MapPin size={14} />
      </span>
      <select
        value={current ?? '__all__'}
        onChange={(e) => handleChange(e.target.value === '__all__' ? null : e.target.value)}
        className={`appearance-none pl-8 pr-8 ${size === 'sm' ? 'py-1.5 text-[12px]' : 'py-2 text-[13px]'} rounded-lg w-full`}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          minWidth: 180,
        }}
      >
        <option value="__all__">All Locations</option>
        {visible.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
    </div>
  );
}
