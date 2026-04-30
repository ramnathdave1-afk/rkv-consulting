'use client';

import { useCallback, useEffect, useState } from 'react';

export interface LocationLite {
  id: string;
  name: string;
  slug: string;
  is_default?: boolean;
  is_active?: boolean;
}

const STORAGE_KEY = 'rkv.activeLocationId';

let cachedLocations: LocationLite[] | null = null;
let inFlight: Promise<LocationLite[]> | null = null;

async function fetchLocations(): Promise<LocationLite[]> {
  if (cachedLocations) return cachedLocations;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch('/api/locations');
      const json = await res.json();
      const items: LocationLite[] = (json.items as LocationLite[]) || [];
      cachedLocations = items;
      return items;
    } catch {
      return [];
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function clearLocationsCache() {
  cachedLocations = null;
}

/**
 * Hook for components that need access to locations + the user's currently
 * active location. The active location is persisted in localStorage and
 * shared across tabs in the same browser.
 *
 * activeLocationId === null means "All Locations".
 */
export function useLocations() {
  const [locations, setLocations] = useState<LocationLite[]>(cachedLocations || []);
  const [loading, setLoading] = useState(!cachedLocations);
  const [activeLocationId, setActiveLocationIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === '__all__' || !v ? null : v;
  });

  useEffect(() => {
    let mounted = true;
    fetchLocations().then((items) => {
      if (!mounted) return;
      setLocations(items);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  // Cross-tab sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const v = e.newValue;
      setActiveLocationIdState(v === '__all__' || !v ? null : v);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setActiveLocationId = useCallback((id: string | null) => {
    setActiveLocationIdState(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, id ?? '__all__');
      // Notify same-tab listeners
      window.dispatchEvent(new CustomEvent('rkv:active-location-change', { detail: { id } }));
    }
  }, []);

  // Same-tab listener so multiple components stay in sync without a context provider
  useEffect(() => {
    function onChange(e: Event) {
      const ce = e as CustomEvent<{ id: string | null }>;
      setActiveLocationIdState(ce.detail?.id ?? null);
    }
    window.addEventListener('rkv:active-location-change', onChange as EventListener);
    return () => window.removeEventListener('rkv:active-location-change', onChange as EventListener);
  }, []);

  const activeLocation = locations.find((l) => l.id === activeLocationId) || null;

  return { locations, activeLocationId, activeLocation, setActiveLocationId, loading };
}
