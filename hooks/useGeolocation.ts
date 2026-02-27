'use client';

import { useState, useCallback, useRef } from 'react';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  zip: string;
  formattedAddress: string;
}

interface UseGeolocationReturn {
  location: GeoLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRequested = useRef(false);

  const requestLocation = useCallback(() => {
    if (hasRequested.current && location) return;
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);
    hasRequested.current = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch('/api/geocode/reverse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });

          if (!res.ok) {
            throw new Error('Failed to reverse geocode location');
          }

          const data = await res.json();
          setLocation({
            latitude,
            longitude,
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            formattedAddress: data.formattedAddress || '',
          });
        } catch {
          setError('Could not determine your city from coordinates');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location unavailable');
            break;
          case err.TIMEOUT:
            setError('Location request timed out');
            break;
          default:
            setError('Failed to get location');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  }, [location]);

  return { location, loading, error, requestLocation };
}
