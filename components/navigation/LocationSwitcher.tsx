'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, Check, Globe } from 'lucide-react';
import { useLocations } from '@/lib/hooks/useLocations';

/**
 * Top-nav location switcher. Sits next to the user avatar / theme toggle.
 * Shows the currently active location, opens a popover listing all locations,
 * and persists the selection via localStorage so every page picks it up.
 */
export function LocationSwitcher() {
  const { locations, activeLocation, activeLocationId, setActiveLocationId, loading } = useLocations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Hide when the user has zero locations (e.g. brand-new account)
  if (!loading && locations.length === 0) return null;

  const label = activeLocationId === null ? 'All Locations' : (activeLocation?.name || 'Location');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="hidden sm:flex items-center gap-2 px-3 h-[38px] rounded-xl transition-all hover:-translate-y-px"
        style={{
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          background: 'var(--bg-hover)',
        }}
        title="Switch location"
      >
        {activeLocationId === null ? <Globe size={14} /> : <MapPin size={14} />}
        <span className="text-[13px] font-medium max-w-[140px] truncate">{label}</span>
        <ChevronDown size={12} className="opacity-60" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            <button
              onClick={() => { setActiveLocationId(null); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-left"
            >
              <Globe size={14} className="text-text-tertiary" />
              <span className="flex-1 text-[13px] text-text-primary">All Locations</span>
              {activeLocationId === null && <Check size={14} className="text-accent" />}
            </button>

            {locations.length > 0 && (
              <div className="my-1 h-px bg-border" />
            )}

            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => { setActiveLocationId(loc.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-left"
              >
                <MapPin size={14} className="text-text-tertiary" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-text-primary truncate">{loc.name}</div>
                  {loc.is_default && (
                    <div className="text-[10px] uppercase tracking-wider text-text-tertiary">Default</div>
                  )}
                </div>
                {activeLocationId === loc.id && <Check size={14} className="text-accent" />}
              </button>
            ))}
          </div>
          <div className="border-t border-border p-2">
            <a
              href="/settings/locations"
              className="block w-full text-center text-[12px] text-text-secondary hover:text-accent py-1.5"
            >
              Manage locations →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
