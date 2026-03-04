'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsApi } from '@/lib/apis/googlemaps';
import { MapPin } from 'lucide-react';

interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  type: 'subject' | 'sale' | 'rental' | 'listing';
}

interface CompsMapProps {
  subject: { lat: number; lng: number } | null;
  points: MapPoint[];
}

const PIN_COLORS: Record<string, string> = {
  subject: '#c9a84c',
  sale: '#22c55e',
  rental: '#3b82f6',
  listing: '#a855f7',
};

export default function CompsMap({ subject, points }: CompsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGoogleMapsApi()
      .then(() => setLoaded(true))
      .catch(() => setError('Google Maps API key not configured'));
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || !subject) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: subject.lat, lng: subject.lng },
      zoom: 13,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8892b0' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a2b' }] },
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
      disableDefaultUI: true,
      zoomControl: true,
    });

    // Subject marker
    new google.maps.Marker({
      position: { lat: subject.lat, lng: subject.lng },
      map,
      title: 'Subject Property',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: PIN_COLORS.subject,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });

    // Comp markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: subject.lat, lng: subject.lng });

    points.forEach((pt) => {
      if (!pt.lat || !pt.lng) return;
      new google.maps.Marker({
        position: { lat: pt.lat, lng: pt.lng },
        map,
        title: pt.label,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: PIN_COLORS[pt.type] || '#fff',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 1,
        },
      });
      bounds.extend({ lat: pt.lat, lng: pt.lng });
    });

    if (points.length > 0) {
      map.fitBounds(bounds, 50);
    }
  }, [loaded, subject, points]);

  if (error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#111111] p-8 text-center">
        <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">{error}</p>
        <p className="text-xs text-slate-600 mt-1">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable maps</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#111111] p-8 text-center">
        <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Search an address to see comps on the map</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <div ref={mapRef} className="w-full h-[400px]" />
      <div className="flex items-center gap-4 px-4 py-2 bg-[#0a0a0a] text-xs">
        {Object.entries(PIN_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {type === 'subject' ? 'Subject' : type === 'sale' ? 'Sales' : type === 'rental' ? 'Rentals' : 'Active'}
          </span>
        ))}
      </div>
    </div>
  );
}
